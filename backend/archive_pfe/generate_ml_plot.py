import numpy as np
import matplotlib.pyplot as plt
from sklearn.ensemble import IsolationForest
import pandas as pd

# 1. Génération de données réalistes pour ton projet
np.random.seed(42)

# Machines Normales (Haut MTBF, Bas MTTR)
normal_machines = np.random.normal(loc=[120, 4], scale=[20, 1], size=(80, 2))

# Anomalies (Bas MTBF, Haut MTTR) - Machines qui tombent souvent en panne
anomalies = np.random.normal(loc=[30, 15], scale=[10, 3], size=(20, 2))

# Fusion des données
X = np.vstack([normal_machines, anomalies])
df = pd.DataFrame(X, columns=['MTBF (Jours)', 'MTTR (Heures)'])

# 2. Application de ton algorithme (Isolation Forest)
model = IsolationForest(contamination=0.15, random_state=42)
preds = model.fit_predict(X) # 1 = normal, -1 = anomalie

# 3. Création du graphique "Premium" pour ton rapport
plt.figure(figsize=(10, 6))
plt.style.use('seaborn-v0_8-whitegrid') # Style propre

# Points normaux en Vert
plt.scatter(df.iloc[preds == 1, 0], df.iloc[preds == 1, 1], 
            c='#2ecc71', label='Fonctionnement Normal', s=50, edgecolors='white', alpha=0.8)

# Anomalies en Rouge
plt.scatter(df.iloc[preds == -1, 0], df.iloc[preds == -1, 1], 
            c='#e74c3c', label='Anomalie Détectée (Risque)', s=80, marker='x', linewidths=2)

# Personnalisation des axes
plt.title("Analyse Prédictive : Détection d'Anomalies via Isolation Forest", fontsize=14, fontweight='bold')
plt.xlabel("MTBF (Temps moyen entre pannes - Jours)", fontsize=11)
plt.ylabel("MTTR (Temps moyen de réparation - Heures)", fontsize=11)
plt.legend(frameon=True, shadow=True)

# Annotation pour expliquer le concept (Bonus pour le jury)
plt.annotate('Zone de haute fiabilité', xy=(130, 3), xytext=(150, 10),
             arrowprops=dict(facecolor='black', shrink=0.05, width=1, headwidth=5))

# Sauvegarde de l'image
plt.tight_layout()
plt.savefig('ml_analysis_report.png', dpi=300)
print("✅ Image générée avec succès : ml_analysis_report.png")
