from rapidfuzz import fuzz, process
from typing import List, Dict, Any

# Dictionnaire technique pour la recherche sémantique (Fonction -> Objet)
# Cela permet à l'IA de comprendre "ce que l'objet fait"
# Dictionnaire technique étendu pour la recherche sémantique
TECHNICAL_KNOWLEDGE = {
    "serrer": ["clé", "tournevis", "boulon", "écrou", "pince", "collier", "raccord"],
    "visser": ["vis", "tournevis", "boulon", "cheville", "foret", "perceuse"],
    "vis": ["visser", "fixer", "boulon", "écrou"],
    "couper": ["pince", "scie", "disque", "lame", "cutter", "meuleuse"],
    "mesurer": ["mètre", "pied à coulisse", "multimètre", "laser", "jauge", "sonde"],
    "lubrifier": ["huile", "graisse", "dégrippant", "wd40", "pompe"],
    "nettoyer": ["chiffon", "solvant", "alcool", "brosse", "décapant"],
    "fixer": ["colle", "adhésif", "vis", "clou", "rivet", "support", "équerre"],
    "tourner": ["moteur", "roulement", "poulie", "engrenage", "courroie", "axe"],
    "chauffer": ["résistance", "brûleur", "four", "thermostat", "sonde"],
    "refroidir": ["ventilateur", "radiateur", "fluide", "compresseur", "climatiseur"],
    "étanchéité": ["joint", "téflon", "silicone", "mastic", "presse-étoupe"],
    "électrique": ["câble", "fusible", "disjoncteur", "relais", "contacteur", "bornier"],
    "air": ["pneumatique", "vérin", "tuyau", "compresseur", "distributeur"],
    "compresser": ["compresseur", "piston", "soupape", "manomètre", "air comprimé"],
    "pomper": ["pompe", "immergée", "surpresseur", "crépine", "clapet"],
    "pression": ["manomètre", "pressostat", "surpresseur", "compresseur", "soupape"],
    "pousser": ["vérin", "piston", "bras", "actionneur"]
}

def perform_smart_search(query: str, items: List[Any]) -> List[Dict[str, Any]]:
    """
    Moteur de recherche intelligent utilisant le fuzzy matching et l'analyse sémantique.
    """
    query = query.lower().strip()
    # Nettoyage des mots inutiles (stop words) pour ne garder que le sens
    stop_words = ["le", "la", "les", "un", "une", "des", "du", "de", "pour", "avec", "truc", "chose", "objet"]
    clean_query_parts = [p for p in query.split() if p not in stop_words and len(p) > 1]
    clean_query = " ".join(clean_query_parts) if clean_query_parts else query

    results = []

    # 1. Extraction sémantique (quels objets correspondent à l'action demandée ?)
    semantic_tags = []
    for action, tags in TECHNICAL_KNOWLEDGE.items():
        if action in query:
            semantic_tags.extend(tags)

    for item in items:
        name = (item.name or "").lower()
        ref = (item.reference or "").lower()
        syn = (item.synonyms or "").lower()
        
        # --- Calcul du Score (0-100) ---
        
        # A. Score Sémantique (Crucial pour "truc pour visser")
        score_semantic = 0
        if semantic_tags:
            for tag in semantic_tags:
                if tag in name or tag in syn:
                    score_semantic = 95 # Score très haut car c'est ce que l'utilisateur veut faire
                    break
        
        # B. Score de Nom (Fuzzy matching sur la requête nettoyée)
        score_name = fuzz.token_set_ratio(clean_query, name)
        
        # C. Score de Référence (Exact ou partiel)
        score_ref = 100 if query in ref else (80 if clean_query in ref and len(clean_query) > 2 else 0)
        
        # D. Score de Synonymes
        score_syn = fuzz.partial_ratio(clean_query, syn)
        
        # E. Bonus de mot-clé exact (si un mot important de la requête est dans le nom)
        score_keyword_bonus = 0
        for word in clean_query_parts:
            if word in name:
                score_keyword_bonus = 90
                break

        # Score final : on prend le meilleur indicateur
        final_score = max(score_semantic, score_name, score_ref, score_syn, score_keyword_bonus)
        
        # Seuil de pertinence
        if final_score > 40:
            # Déterminer la raison
            reason = "Correspondance de nom"
            if score_ref >= 90: reason = "Référence détectée"
            elif score_semantic >= 90: reason = "Expertise IA : Adapté à votre besoin"
            elif score_keyword_bonus >= 90: reason = "Mot-clé technique trouvé"
            elif score_syn > 75: reason = "Synonyme reconnu"
            
            results.append({
                "item": item,
                "score": final_score,
                "reason": reason
            })

    # Tri par score décroissant, puis par nom pour l'ordre alphabétique en cas d'égalité
    results.sort(key=lambda x: (-x["score"], x["item"].name))
    
    return results[:12] # Top 12 pour donner un peu plus de choix au technicien
