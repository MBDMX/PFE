import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
import json

def calculate_health_score(measurements):
    """
    Simule un calcul de score de santé via ML (Isolation Forest).
    measurements: list de dict [{'temp': 70, 'vibe': 1.2}, ...]
    """
    if not measurements:
        return 100
    
    df = pd.DataFrame(measurements)
    
    # Entraînement d'un modèle de détection d'anomalies
    # Dans un vrai cas, on l'entraînerait sur des mois de données
    model = IsolationForest(contamination=0.1, random_state=42)
    
    # On ajoute des données de référence (normales) pour "calibrer" le score
    reference_data = pd.DataFrame({
        'temp': np.random.normal(65, 5, 50),
        'vibe': np.random.normal(1.0, 0.2, 50)
    })
    
    combined_data = pd.concat([reference_data, df])
    model.fit(combined_data)
    
    # Prédiction pour la mesure actuelle (la dernière)
    current = df.iloc[[-1]]
    score_raw = model.decision_function(current)[0]
    
    # Normalisation du score entre 0 et 100
    health_score = int(max(0, min(100, (score_raw + 0.5) * 100)))
    
    return health_score

# Exemple d'usage pour ta démo
if __name__ == "__main__":
    # Simulation de données pour une machine
    data = [
        {'temp': 62, 'vibe': 0.9},
        {'temp': 65, 'vibe': 1.1},
        {'temp': 85, 'vibe': 2.5} # Cette mesure est une anomalie
    ]
    
    score = calculate_health_score(data)
    print(json.dumps({"machine_name": "Cuve Cristalisateur", "health_score": score, "status": "Warning" if score < 70 else "Healthy"}))
