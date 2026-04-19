# Plan d integration PDA - Dashboard Magasinier
> GMAO Azure Edition - Module Scanner / Mapping de pieces

---

## Objectif

Integrer un module PDA permettant au magasinier de :
- Scanner ou saisir manuellement une reference de piece
- Consulter la fiche stock en temps reel
- Effectuer des operations de mouvement (Entree / Sortie)
- Mettre a jour l emplacement physique d une piece (mapping)
- Consulter le log de la session de scan

---

## Architecture

```
frontend/app/dashboard/magasinier/
|-- page.tsx                       <- Modifier : ajouter onglet "PDA Scanner"
`-- _components/
    `-- PdaScanner.tsx             <- Creer : composant principal du module PDA
```

### Flux utilisateur
```
[Onglet PDA]
     |
     v
[Saisie manuelle REF  OU  Scan camera QR/Code-barres]
     |
     v
[Fiche piece trouvee : nom, stock, emplacement, prix]
     |
     |---> [ENTREE]   -> Saisir quantite -> Confirmer -> POST /stock/movements (IN)
     |---> [SORTIE]   -> Saisir quantite -> Confirmer -> POST /stock/movements (OUT)
     `---> [MAPPING]  -> Saisir emplacement -> Confirmer -> PATCH /stock/{id}/location
```

---

## Phases de developpement

### Phase 1 - Saisie manuelle + Recherche piece
Fichier : _components/PdaScanner.tsx

- [ ] Champ de saisie de reference avec bouton "Rechercher"
- [ ] Appel gmaoApi.getStock() filtre par reference
- [ ] Affichage fiche piece : nom, reference, quantite, emplacement
- [ ] Gestion des cas : piece non trouvee, stock vide, erreur reseau

### Phase 2 - Actions sur la piece (Entree / Sortie)

- [ ] Modal de confirmation pour Entree et Sortie
- [ ] Champ quantite avec validation (min: 1, max: stock pour les sorties)
- [ ] Appel gmaoApi.createStockMovement({ part_id, type, quantity })
- [ ] Feedback visuel : toast succes/erreur + mise a jour fiche

Endpoints :
| Operation | Methode | Endpoint            | Body                              |
|-----------|---------|---------------------|-----------------------------------|
| Entree    | POST    | /stock/movements    | { part_id, type: "IN", quantity } |
| Sortie    | POST    | /stock/movements    | { part_id, type: "OUT", quantity }|

### Phase 3 - Log de session

- [ ] Affichage chronologique des operations de la session
- [ ] Chaque entree = icone type, nom piece, quantite, heure
- [ ] Bouton "Vider le log" et "Exporter CSV"

### Phase 4 - Scan camera QR / Code-barres

- [ ] Installer : npm install html5-qrcode
- [ ] Bouton "Activer camera" -> ouvre le flux video
- [ ] Detection automatique -> pre-remplit le champ reference
- [ ] Fallback : saisie manuelle si camera non disponible

NOTE : Necessite HTTPS en production pour acceder a la camera.

### Phase 5 - Mapping emplacement

- [ ] Ajouter endpoint backend PATCH /stock/{id}/location
- [ ] Champ de saisie nouvel emplacement avec format valide (ex: A-12)
- [ ] Mise a jour immediate de la fiche piece apres confirmation

Endpoint a creer dans backend/app/api/gmao.py :
```python
@router.patch("/stock/{part_id}/location")
def update_part_location(part_id: int, body: LocationUpdate, db: Session = Depends(get_db)):
    part = db.query(Part).filter(Part.id == part_id).first()
    part.location = body.location
    db.commit()
    return {"success": True, "location": part.location}
```

---

## Fichiers a creer / modifier

| Fichier                          | Action   | Description                              |
|----------------------------------|----------|------------------------------------------|
| _components/PdaScanner.tsx       | Creer    | Composant complet PDA                    |
| page.tsx                         | Modifier | Ajouter onglet "scanner" (icone ScanLine)|
| services/api.ts                  | Modifier | Ajouter updatePartLocation()             |
| backend/app/api/gmao.py          | Modifier | Ajouter PATCH /stock/{id}/location       |

---

## Estimation

| Phase                         | Duree  |
|-------------------------------|--------|
| Phase 1 - Saisie + Recherche  | ~1h    |
| Phase 2 - Entree / Sortie     | ~1h    |
| Phase 3 - Log de session      | ~30min |
| Phase 4 - Scan camera         | ~1h    |
| Phase 5 - Mapping + backend   | ~1h    |
| TOTAL                         | ~4h30  |

---

## Questions avant developpement

1. Etiquettes physiques : Les pieces ont-elles deja des QR codes ou codes-barres en magasin ?
2. Appareil cible : Mobile/tablette (camera) ou PC fixe (saisie clavier) ?
3. Format emplacement : Quel format ? (ex: A-12, Rayon 2 / Case 4, etc.)
4. Backend location : L endpoint PATCH /stock/{id}/location existe-t-il deja ?
5. Export CSV : Le log doit-il etre exportable ou juste affiche a l ecran ?
