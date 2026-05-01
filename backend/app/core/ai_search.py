from rapidfuzz import fuzz, process
from typing import List, Dict, Any

# Dictionnaire technique pour la recherche sémantique (Fonction -> Objet)
# Cela permet à l'IA de comprendre "ce que l'objet fait"
TECHNICAL_KNOWLEDGE = {
    "serrer": ["clé", "tournevis", "boulon", "écrou", "pince"],
    "visser": ["vis", "tournevis", "boulon"],
    "couper": ["pince", "scie", "disque", "lame", "cutter"],
    "mesurer": ["mètre", "pied à coulisse", "multimètre", "laser"],
    "lubrifier": ["huile", "graisse", "dégrippant", "wd40"],
    "nettoyer": ["chiffon", "solvant", "alcool", "brosse"],
    "fixer": ["colle", "adhésif", "vis", "clou", "rivet"],
    "tourner": ["moteur", "roulement", "poulie", "engrenage"],
    "chauffer": ["résistance", "brûleur", "four"],
    "refroidir": ["ventilateur", "radiateur", "fluide", "compresseur"]
}

def perform_smart_search(query: str, items: List[Any]) -> List[Dict[str, Any]]:
    """
    Moteur de recherche intelligent utilisant le fuzzy matching et l'analyse sémantique.
    """
    query = query.lower().strip()
    results = []

    # 1. Extraction sémantique (basée sur le dictionnaire technique)
    semantic_matches = []
    for action, tags in TECHNICAL_KNOWLEDGE.items():
        if action in query:
            semantic_matches.extend(tags)

    for item in items:
        # Données de l'item
        name = (item.name or "").lower()
        ref = (item.reference or "").lower()
        syn = (item.synonyms or "").lower()
        
        # --- Calcul du Score ---
        # A. Score de nom (Fuzzy)
        score_name = fuzz.token_set_ratio(query, name)
        
        # B. Score de référence (Exact ou partiel)
        score_ref = 100 if query in ref else 0
        
        # C. Score de synonymes
        score_syn = fuzz.partial_ratio(query, syn)
        
        # D. Score sémantique (Si l'utilisateur décrit l'action)
        score_semantic = 0
        if semantic_matches:
            # Si le nom de l'item correspond à un mot-clé sémantique
            for tag in semantic_matches:
                if tag in name or tag in syn:
                    score_semantic = 85
                    break
        
        # E. Score de mot-clé exact (Bonus)
        score_exact = 100 if query in name else 0
        
        # Pondération finale
        # On privilégie le nom exact, puis la sémantique, puis le flou
        final_score = max(score_name, score_ref, score_syn, score_semantic, score_exact)
        
        if final_score > 35:  # Seuil de pertinence
            # Ajout d'informations sur la raison du match pour le frontend
            reason = "Correspondance de nom"
            if score_ref == 100: reason = "Référence exacte"
            elif score_semantic == 85: reason = "Suggestion intelligente (Fonction)"
            elif score_syn > 70: reason = "Synonyme détecté"
            
            results.append({
                "item": item,
                "score": final_score,
                "reason": reason
            })

    # Tri par score décroissant
    results.sort(key=lambda x: x["score"], reverse=True)
    
    # Retourne les 10 meilleurs résultats
    return results[:10]
