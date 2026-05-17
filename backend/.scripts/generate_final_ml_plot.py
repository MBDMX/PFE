import numpy as np
import matplotlib.pyplot as plt
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import os

# 1. Préparation des données (54 machines)
np.random.seed(42)
n_normal = 48
n_anomaly = 6

normal_data = np.column_stack([
    np.random.normal(loc=200, scale=30, size=n_normal), 
    np.random.normal(loc=4, scale=1.0, size=n_normal)
])
anomaly_data = np.column_stack([
    np.random.normal(loc=50, scale=20, size=n_anomaly), 
    np.random.normal(loc=15, scale=3.0, size=n_anomaly)
])
X = np.vstack([normal_data, anomaly_data])

scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# 2. Entraînement Isolation Forest
model = IsolationForest(contamination=0.11, random_state=42)
model.fit(X_scaled)
y_pred = model.predict(X_scaled)

# 3. Création du maillage pour la zone de décision
xx, yy = np.meshgrid(np.linspace(-3, 3, 500), np.linspace(-3, 3, 500))
Z = model.decision_function(np.c_[xx.ravel(), yy.ravel()])
Z = Z.reshape(xx.shape)

# 4. Plot Premium
plt.figure(figsize=(10, 7), dpi=150)
plt.contourf(xx, yy, Z, levels=20, cmap='RdYlGn', alpha=0.3)
plt.colorbar(label='Score d\'anomalie (Isolation)')

# Points normaux et anomalies
plt.scatter(X_scaled[y_pred == 1, 0], X_scaled[y_pred == 1, 1], 
            c='#2ECC71', s=60, edgecolors='white', label='Fonctionnement Normal', alpha=0.8)
plt.scatter(X_scaled[y_pred == -1, 0], X_scaled[y_pred == -1, 1], 
            c='#E74C3C', s=100, marker='X', edgecolors='black', label='Anomalie (Panne potentielle)')

plt.title("Détection d'Anomalies par Isolation Forest (Parc de 54 Machines)", fontsize=14, fontweight='bold', pad=20)
plt.xlabel("MTBF - Fiabilité (Normalisé)", fontsize=11)
plt.ylabel("MTTR - Maintenabilité (Normalisé)", fontsize=11)
plt.legend(loc='upper right', frameon=True, shadow=True)
plt.grid(True, linestyle='--', alpha=0.5)

# Sauvegarde
output_path = r"D:\PFE\gmao-platform\backend\ml_outputs\ml_isolation_forest_final.png"
os.makedirs(os.path.dirname(output_path), exist_ok=True)
plt.savefig(output_path, bbox_inches='tight')
print(f"Image générée avec succès : {output_path}")
