import os
import json
import ssl
from datetime import datetime
import requests
import urllib3
from requests.adapters import HTTPAdapter
from dotenv import load_dotenv

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
load_dotenv()


class TLSAdapter(HTTPAdapter):
    """Forces TLS 1.2+ and skips certificate verification (SAP self-signed certs)."""
    def init_poolmanager(self, *args, **kwargs):
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        ctx.minimum_version = ssl.TLSVersion.TLSv1_2
        kwargs['ssl_context'] = ctx
        return super().init_poolmanager(*args, **kwargs)


class SAPClient:
    """
    Unified SAP client handling:
      - Service Layer  (port 50000): standard SAP B1 OData API
      - CompuTec AppEngine (port 54001): ProcessForce / Plant Maintenance OData
    """
    _instance = None

    # --- Service Layer ---
    _sl_session = None

    # --- CompuTec AppEngine ---
    _pf_session = None
    _pf_token = None        # JWT Bearer token
    _pf_refresh_token = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            # Service Layer session
            cls._sl_session = requests.Session()
            # On simplifie pour éviter les blocages TLSAdapter sur certains environnements
            cls._sl_session.verify = False
            cls._sl_session.headers.update({
                "Content-Type": "application/json",
                "Accept": "application/json"
            })
            # ProcessForce / AppEngine session
            cls._pf_session = requests.Session()
            cls._pf_session.mount('https://', TLSAdapter())
            cls._pf_session.verify = False
            
            # Load URLs from environment
            cls.sl_url = os.getenv("SAP_SL_URL")
            cls.pf_url = os.getenv("SAP_PF_URL")
        return cls._instance

    # =========================================================
    # SERVICE LAYER  (port 50000)
    # env: SAP_SL_URL, SAP_COMPANY_DB, SAP_USERNAME, SAP_PASSWORD
    # =========================================================
    def login_sl(self) -> bool:
        load_dotenv(override=True)
        self.sl_url = os.getenv("SAP_SL_URL")
        if not self.sl_url:
            print("[SL] Error: SAP_SL_URL is not set.")
            return False
            
        base_url = self.sl_url.rstrip('/')
        url = f"{base_url}/Login"
        
        payload = {
            "CompanyDB": os.getenv("SAP_COMPANY_DB"),
            "UserName":  os.getenv("SAP_USERNAME"),
            "Password":  os.getenv("SAP_PASSWORD"),
        }
        
        print(f"[SL] Tentative de connexion sur : {url}")
        try:
            resp = self._sl_session.post(url, json=payload, timeout=10, verify=False)
            if resp.status_code == 200:
                print(f"[SL] ✅ Login OK pour {payload['CompanyDB']}")
                return True
            
            print(f"[SL] ❌ Login Échoué ({resp.status_code}): {resp.text}")
            return False
        except Exception as e:
            print(f"[SL] 🚨 Erreur de connexion au serveur : {e}")
            return False

    def _sl_get(self, endpoint: str):
        """GET against Service Layer with auto re-login on 401."""
        url = f"{self.sl_url}{endpoint}"
        try:
            resp = self._sl_session.get(url, timeout=15)
            if resp.status_code == 401 and self.login_sl():
                resp = self._sl_session.get(url, timeout=15)
            if resp.status_code == 200:
                body = resp.json()
                return body.get('value', body)
            print(f"[SL] GET {endpoint} => {resp.status_code}: {resp.text[:200]}")
            return []
        except Exception as e:
            print(f"[SL] GET {endpoint} error: {e}")
            return []

    def get_items(self, top: int = 100):
        """Récupère les articles avec leurs prix et stocks."""
        # On demande explicitement les champs nécessaires pour le dashboard
        query = "/Items?$select=ItemCode,ItemName,QuantityOnStock,ItemPrices,InventoryUOM&$top=" + str(top)
        return self._sl_get(query)

    def get_business_partners(self, top: int = 50):
        return self._sl_get(f"/BusinessPartners?$top={top}")

    def get_users(self):
        return self._sl_get("/Users?$select=UserCode,UserName,eMail,Department")

    def create_purchase_request(self, item_code: str, quantity: float, remarks: str = "", user_name: str = "GMAO User", supplier_info: str = "") -> dict:
        """Crée une Demande d'Achat (Purchase Request) dans SAP B1 - Standard V1 avec Fix Date."""
        url = f"{self.sl_url}/PurchaseRequests"
        
        from datetime import timedelta
        now = datetime.now()
        today = now.strftime("%Y-%m-%d")
        
        payload = {
            "DocDate": today,
            "DocDueDate": today,
            "TaxDate": today,
            "RequriedDate": today, # Typo doc
            "ReqDate": today,      # Standard en-tête
            "RequiredDate": today, # En-tête alternatif
            "U_ReqDate": today,    # UDF possible (vu dans ta doc ProcessForce)
            "U_RequiredDate": today, # UDF possible
            "ReqType": 171,
            "RequesterCode": "1",
            "Remarks": f"Demandé par : {user_name}\nMotif : {remarks or 'GMAO'}",
            "PurchaseRequestLines": [
                {
                    "ItemCode": item_code.strip(),
                    "Quantity": quantity,
                    "ReqDate": today,
                    "RequiredDate": today
                }
            ],
            "DocumentLines": [
                {
                    "ItemCode": item_code.strip(),
                    "Quantity": quantity,
                    "ReqDate": today,
                    "RequiredDate": today
                }
            ]
        }
        print(f"[DEBUG SAP PR UDF TEST] Payload: {json.dumps(payload, indent=2)}")
        
        # On tente sans le header OData spécifique d'abord
        h = {}
        try:
            # DEBUG: On regarde cet article spécifique
            specific_item = self._sl_session.get(f"{self.sl_url}/Items('EX0201PRE0101')", timeout=10)
            print(f"[DEBUG SAP ITEM] {specific_item.text}")

            resp = self._sl_session.post(url, json=payload, headers=h, timeout=15)
            if resp.status_code == 401 and self.login_sl():
                resp = self._sl_session.post(url, json=payload, headers=h, timeout=15)
            
            if resp.status_code in (200, 201):
                return resp.json()
            
            # Detailed logging for PFE troubleshooting
            print(f"[SL] PR Error {resp.status_code}: {resp.text[:500]}")
            return {}
        except Exception as e:
            print(f"[SL] PR Exception: {e}")
            return {}

    def create_stock_transfer(self, item_code: str, quantity: float, from_wh: str, to_wh: str, remarks: str = "") -> dict:
        """Crée un transfert de stock (Stock Transfer) dans SAP B1."""
        url = f"{self.sl_url}/StockTransfers"
        payload = {
            "FromWarehouse": from_wh,
            "Comments": remarks or f"Transfert GMAO - {item_code}",
            "StockTransferLines": [
                {
                    "ItemCode": item_code,
                    "Quantity": quantity,
                    "FromWarehouseCode": from_wh,
                    "WarehouseCode": to_wh,
                }
            ]
        }
        try:
            h = {"OData-MaxVersion": "4.0", "OData-Version": "4.0"}
            resp = self._sl_session.post(url, json=payload, headers=h, timeout=15)
            if resp.status_code == 401 and self.login_sl():
                resp = self._sl_session.post(url, json=payload, headers=h, timeout=15)
            
            if resp.status_code in (200, 201):
                return resp.json()
            
            print(f"[SL] Transfer Error {resp.status_code}: {resp.text[:500]}")
            return {}
        except Exception as e:
            print(f"[SL] Transfer Exception: {e}")
            return {}

    # =========================================================
    # COMPUTEC APPENGINE  (port 54001)
    # env: SAP_PF_URL, SAP_PF_COMPANY_ID, SAP_PF_API_KEY,
    #      SAP_USERNAME, SAP_PASSWORD
    #
    # KEY FACTS (discovered via browser DevTools):
    #   - CompanyId must be the NUMERIC string "7546" (not DB name)
    #   - Found in browser network: ?CompanyId=7546&ApiKey=b29257ba-...
    #   - Login endpoint: POST /api/Login
    #   - OData requires: Authorization: Bearer <jwt>
    #                     CompanyId: 7546  (in request header)
    # =========================================================
    def login_pf(self) -> bool:
        """Login to CompuTec AppEngine and obtain JWT token."""
        if not self.pf_url:
            print("[PF] Error: SAP_PF_URL is not set.")
            return False
            
        url = f"{self.pf_url}/api/Login"
        company_id = os.getenv("SAP_PF_COMPANY_ID")
        print(f"DEBUG: Using CompanyId from ENV: '{company_id}'")
        payload = {
            "CompanyId": company_id,
            "UserName":  os.getenv("SAP_USERNAME"),
            "Password":  os.getenv("SAP_PASSWORD"),
            "Language":  "ln_Null",
        }
        try:
            resp = self._pf_session.post(
                url, json=payload, timeout=60,
                headers={"Content-Type": "application/json"}
            )
            if resp.status_code == 200:
                body = resp.json()
                self._pf_token         = body.get("Token")
                self._pf_refresh_token = body.get("RefreshToken")
                print(f"[PF] Login OK (CompanyId={payload['CompanyId']})")
                return True
            print(f"[PF] Login failed {resp.status_code}: {resp.text[:300]}")
            return False
        except Exception as e:
            print(f"[PF] Connection error: {e}")
            return False

    def _pf_headers(self) -> dict:
        """Returns the headers required for every AppEngine OData request."""
        return {
            "Authorization": f"Bearer {self._pf_token}",
            "CompanyId":     os.getenv("SAP_PF_COMPANY_ID"),
            "Accept":        "application/json",
            "Content-Type":  "application/json",
        }

    def _pf_get(self, endpoint: str):
        """GET against ProcessForce OData with auto re-login on 401/500."""
        if not self._pf_token:
            if not self.login_pf():
                return []
        url = f"{self.pf_url}{endpoint}"
        try:
            resp = self._pf_session.get(url, headers=self._pf_headers(), timeout=60)
            # Token expired or missing CompanyId header
            if resp.status_code in (401, 500) and self.login_pf():
                resp = self._pf_session.get(url, headers=self._pf_headers(), timeout=60)
            if resp.status_code == 200:
                body = resp.json()
                return body.get("value", body)
            print(f"[PF] GET {endpoint} => {resp.status_code}: {resp.text[:200]}")
            return []
        except Exception as e:
            print(f"[PF] GET {endpoint} error: {e}")
            return []

    def _pf_patch(self, endpoint: str, data: dict) -> bool:
        """PATCH against ProcessForce OData."""
        if not self._pf_token:
            if not self.login_pf(): return False
        url = f"{self.pf_url}{endpoint}"
        try:
            resp = self._pf_session.patch(url, json=data, headers=self._pf_headers(), timeout=60)
            if resp.status_code in (401, 500) and self.login_pf():
                resp = self._pf_session.patch(url, json=data, headers=self._pf_headers(), timeout=60)
            if resp.status_code in (200, 204):
                return True
            print(f"[PF] PATCH {endpoint} => {resp.status_code}: {resp.text[:200]}")
            return False
        except Exception as e:
            print(f"[PF] PATCH {endpoint} error: {e}")
            return False

    def _pf_post(self, endpoint: str, data: dict) -> dict:
        """POST against ProcessForce OData."""
        if not self._pf_token:
            if not self.login_pf(): return {}
        url = f"{self.pf_url}{endpoint}"
        try:
            resp = self._pf_session.post(url, json=data, headers=self._pf_headers(), timeout=60)
            if resp.status_code in (401, 500) and self.login_pf():
                resp = self._pf_session.post(url, json=data, headers=self._pf_headers(), timeout=60)
            if resp.status_code in (200, 201):
                return resp.json()
            print(f"[PF] POST {endpoint} => {resp.status_code}: {resp.text[:200]}")
            return {}
        except Exception as e:
            print(f"[PF] POST {endpoint} error: {e}")
            return {}

    def _pf_delete(self, endpoint: str) -> bool:
        """DELETE against ProcessForce OData."""
        if not self._pf_token:
            if not self.login_pf(): return False
        url = f"{self.pf_url}{endpoint}"
        try:
            resp = self._pf_session.delete(url, headers=self._pf_headers(), timeout=60)
            if resp.status_code in (401, 500) and self.login_pf():
                resp = self._pf_session.delete(url, headers=self._pf_headers(), timeout=60)
            if resp.status_code in (200, 204):
                return True
            print(f"[PF] DELETE {endpoint} => {resp.status_code}: {resp.text[:200]}")
            return False
        except Exception as e:
            print(f"[PF] DELETE {endpoint} error: {e}")
            return False



    def get_maintainable_items(self, top: int = 100) -> list:
        """Fetch all Maintainable Items (machines) from ProcessForce."""
        return self._pf_get(f"/odata/ProcessForce/MaintainableItem?$top={top}")

    def get_maintenance_orders(self, top: int = 100) -> list:
        """Fetch Maintenance Orders (work orders) from ProcessForce."""
        return self._pf_get(f"/odata/ProcessForce/MaintenanceOrder?$top={top}")

    def create_maintenance_order(self, wo_data: dict) -> dict:
        """App -> SAP: Pousse un nouvel OT créé depuis la GMAO vers SAP ProcessForce."""
        # 1. Récupérer les infos de la machine pour avoir le nom (U_MIName often required)
        machine_code = wo_data.get("equipment_id", "")
        machine_name = ""
        if machine_code:
            m_url = f"/odata/ProcessForce/MaintainableItem?$filter=Code eq '{machine_code}'"
            res = self._pf_get(m_url)
            if res and isinstance(res, list):
                machine_name = res[0].get("Name", "")

        payload = {
            "U_Remarks": wo_data.get("title", "Créé via GMAO App"),
            "U_MICode": machine_code,
        }
        
        # On retire les dates pour le moment pour garantir le succès du POST minimal
        # if wo_data.get("planned_start_date"):
        #      p_date = str(wo_data["planned_start_date"])[:10]
        #      payload["U_SchStartDate"] = f"{p_date}T08:00:00"
        #      payload["U_SchEndDate"] = f"{p_date}T17:00:00"
            
        print(f"[SAP SYNC] Envoi du nouvel OT vers SAP: {payload}")
        return self._pf_post("/odata/ProcessForce/MaintenanceOrder", payload)

    def update_maintenance_order_status(self, doc_entry: str, status: str) -> bool:
        """App -> SAP: Met à jour le statut d'un OT existant dans SAP."""
        # Convertir le statut GMAO en statut SAP
        sap_status = "WorkRequest"
        if status == "in_progress": sap_status = "Started"
        elif status == "done": sap_status = "Finished"
        
        payload = {"U_MOStatus": sap_status} 
        print(f"[SAP SYNC] Mise à jour OT SAP {doc_entry} -> Statut {sap_status}")
        return self._pf_patch(f"/odata/ProcessForce/MaintenanceOrder({doc_entry})", payload)

    def delete_maintenance_order(self, doc_entry: str) -> bool:
        """App -> SAP: Annule un OT existant dans SAP (au lieu de le supprimer physiquement)."""
        print(f"[SAP SYNC] Annulation complète OT SAP {doc_entry}")
        # On passe le statut à 'Cancelled' ET le champ système Canceled à 'Yes'
        payload = {
            "U_MOStatus": "Cancelled",
            "Canceled": "Yes"
        }
        return self._pf_patch(f"/odata/ProcessForce/MaintenanceOrder({doc_entry})", payload)

    def add_part_to_maintenance_order(self, doc_entry: str, item_code: str, quantity: float, warehouse: str = "01") -> bool:
        """
        App -> SAP: Ajoute une pièce de rechange consommée à un OT SAP existant.
        Cela permet de tracer 'où' la pièce a été prise (WarehouseCode).
        """
        if not doc_entry or not item_code:
            return False
            
        print(f"[SAP SYNC] Ajout pièce {item_code} (Qté: {quantity}) à l'OT SAP #{doc_entry} (Magasin: {warehouse})")
        
        # Dans ProcessForce, les pièces sont des lignes liées à l'OT
        # On utilise généralement l'endpoint MaintenanceOrderLine ou l'expand sur MaintenanceOrder
        # Ici on tente l'ajout via l'endpoint dédié des lignes
        payload = {
            "DocEntry": int(doc_entry),
            "ItemCode": item_code,
            "Quantity": quantity,
            "WarehouseCode": warehouse,
            "U_MOId": int(doc_entry) # Lien explicite vers l'OT
        }
        
        # Note: Dans certaines versions de PF, on doit passer par MaintenanceOrder(id)/MaintenanceOrderLines
        # On utilise POST /MaintenanceOrderLine pour créer la ligne de consommation
        res = self._pf_post("/odata/ProcessForce/MaintenanceOrderLine", payload)
        return bool(res and res.get("DocEntry"))

    # =========================================================
    # STATUS
    # =========================================================
    def get_connection_status(self) -> dict:
        try:
            sl_ok = self.login_sl()
        except:
            sl_ok = False
            
        try:
            pf_ok = self.login_pf()
        except:
            pf_ok = False
            
        return {
            "service_layer": {
                "status":     "connected" if sl_ok else "disconnected",
                "url":        self.sl_url,
                "company_db": os.getenv("SAP_COMPANY_DB"),
            },
            "process_force": {
                "status":     "connected" if pf_ok else "disconnected",
                "url":        self.pf_url,
                "company_id": os.getenv("SAP_PF_COMPANY_ID"),
                "engine":     "CompuTec AppEngine",
            },
        }


# Singleton instance
sap_client = SAPClient()
