import os
import json
import ssl
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
            cls._sl_session.mount('https://', TLSAdapter())
            cls._sl_session.verify = False
            # ProcessForce / AppEngine session
            cls._pf_session = requests.Session()
            cls._pf_session.verify = False
        return cls._instance

    # =========================================================
    # SERVICE LAYER  (port 50000)
    # env: SAP_SL_URL, SAP_COMPANY_DB, SAP_USERNAME, SAP_PASSWORD
    # =========================================================
    def login_sl(self) -> bool:
        url = f"{os.getenv('SAP_SL_URL')}/Login"
        payload = {
            "CompanyDB": os.getenv("SAP_COMPANY_DB"),
            "UserName":  os.getenv("SAP_USERNAME"),
            "Password":  os.getenv("SAP_PASSWORD"),
        }
        try:
            resp = self._sl_session.post(url, json=payload, timeout=15)
            if resp.status_code == 200:
                print(f"[SL] Login OK (CompanyDB={payload['CompanyDB']})")
                return True
            print(f"[SL] Login failed {resp.status_code}: {resp.text[:200]}")
            return False
        except Exception as e:
            print(f"[SL] Connection error: {e}")
            return False

    def _sl_get(self, endpoint: str):
        """GET against Service Layer with auto re-login on 401."""
        url = f"{os.getenv('SAP_SL_URL')}{endpoint}"
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

    def get_items(self, top: int = 50):
        return self._sl_get(f"/Items?$top={top}")

    def get_business_partners(self, top: int = 50):
        return self._sl_get(f"/BusinessPartners?$top={top}")

    def get_users(self):
        return self._sl_get("/Users?$select=UserCode,UserName,eMail,Department")

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
        url = f"{os.getenv('SAP_PF_URL')}/api/Login"
        payload = {
            "CompanyId": os.getenv("SAP_PF_COMPANY_ID"),   # Must be string "7546"
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
        }

    def _pf_get(self, endpoint: str):
        """GET against ProcessForce OData with auto re-login on 401/500."""
        if not self._pf_token:
            if not self.login_pf():
                return []
        url = f"{os.getenv('SAP_PF_URL')}{endpoint}"
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

    def get_maintainable_items(self, top: int = 100) -> list:
        """Fetch all Maintainable Items (machines) from ProcessForce."""
        return self._pf_get(f"/odata/ProcessForce/MaintainableItem?$top={top}")

    def get_maintenance_orders(self, top: int = 100) -> list:
        """Fetch Maintenance Orders (work orders) from ProcessForce."""
        return self._pf_get(f"/odata/ProcessForce/MaintenanceOrder?$top={top}")

    # =========================================================
    # STATUS
    # =========================================================
    def get_connection_status(self) -> dict:
        sl_ok = self.login_sl()
        pf_ok = self.login_pf()
        return {
            "service_layer": {
                "status":     "connected" if sl_ok else "disconnected",
                "url":        os.getenv("SAP_SL_URL"),
                "company_db": os.getenv("SAP_COMPANY_DB"),
            },
            "process_force": {
                "status":     "connected" if pf_ok else "disconnected",
                "url":        os.getenv("SAP_PF_URL"),
                "company_id": os.getenv("SAP_PF_COMPANY_ID"),
                "engine":     "CompuTec AppEngine",
            },
        }


# Singleton instance
sap_client = SAPClient()
