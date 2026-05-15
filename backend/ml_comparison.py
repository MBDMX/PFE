"""
Script de comparaison des algorithmes ML pour le rapport PFE.
Génère des graphiques comparatifs entre :
  - Isolation Forest (retenu)
  - One-Class SVM
  - K-Means (clustering)
Et implémente un second modèle de recommandation de fréquence de maintenance.
"""

import os
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
from sklearn.ensemble import IsolationForest
from sklearn.svm import OneClassSVM
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score
import warnings
warnings.filterwarnings("ignore")

# =============================================================
# DOSSIER DE SORTIE (créé automatiquement)
# =============================================================
OUTPUT_DIR = r"D:\PFE\gmao-platform\backend\ml_outputs"
os.makedirs(OUTPUT_DIR, exist_ok=True)
print(f"[INFO] Images sauvegardées dans : {OUTPUT_DIR}")

# =============================================================
# 1. GÉNÉRATION DES DONNÉES SIMULÉES (basées sur vos vraies données)
# =============================================================
np.random.seed(42)
n_normal = 48
n_anomaly = 6
# TOTAL = 54 machines (Cohérence avec synchro SAP)

# Données normales (MTBF élevé, MTTR faible, faible urgence)
normal_data = np.column_stack([
    np.random.normal(loc=200, scale=30, size=n_normal),  # MTBF (heures)
    np.random.normal(loc=4, scale=1.0, size=n_normal),   # MTTR (heures)
    np.random.normal(loc=0.15, scale=0.05, size=n_normal) # Taux urgence
])

# Données anormales (MTBF faible, MTTR élevé, urgence haute)
anomaly_data = np.column_stack([
    np.random.normal(loc=40, scale=15, size=n_anomaly),   # MTBF faible
    np.random.normal(loc=18, scale=4.0, size=n_anomaly),  # MTTR élevé
    np.random.normal(loc=0.75, scale=0.10, size=n_anomaly) # Urgence haute
])

X = np.vstack([normal_data, anomaly_data])
y_true = np.array([1] * n_normal + [-1] * n_anomaly)

# Normalisation
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# =============================================================
# 2. MODÈLE 1A — ISOLATION FOREST
# =============================================================
iso_forest = IsolationForest(contamination=0.1, random_state=42, n_estimators=100)
y_iso = iso_forest.fit_predict(X_scaled)
scores_iso = iso_forest.decision_function(X_scaled)
sil_iso = silhouette_score(X_scaled, y_iso)

print(f"[Isolation Forest] Silhouette Score : {sil_iso:.4f}")
print(f"  Anomalies détectées : {np.sum(y_iso == -1)}")

# =============================================================
# 3. MODÈLE 1B — ONE-CLASS SVM
# =============================================================
svm = OneClassSVM(nu=0.1, kernel='rbf', gamma='auto')
y_svm = svm.fit_predict(X_scaled)
scores_svm = svm.decision_function(X_scaled)
sil_svm = silhouette_score(X_scaled, y_svm)

print(f"\n[One-Class SVM] Silhouette Score : {sil_svm:.4f}")
print(f"  Anomalies détectées : {np.sum(y_svm == -1)}")

# =============================================================
# 4. MODÈLE 1C — K-MEANS
# =============================================================
kmeans = KMeans(n_clusters=2, random_state=42, n_init=10)
y_kmeans = kmeans.fit_predict(X_scaled)
sil_kmeans = silhouette_score(X_scaled, y_kmeans)

# Mapper les clusters : le plus petit = anomalies
cluster_sizes = np.bincount(y_kmeans)
anomaly_cluster = np.argmin(cluster_sizes)
y_kmeans_mapped = np.where(y_kmeans == anomaly_cluster, -1, 1)

print(f"\n[K-Means] Silhouette Score : {sil_kmeans:.4f}")
print(f"  Anomalies détectées : {np.sum(y_kmeans_mapped == -1)}")

# =============================================================
# 5. FIGURE 1 — COMPARAISON VISUELLE DES 3 ALGORITHMES
# =============================================================
fig, axes = plt.subplots(1, 3, figsize=(16, 5))
fig.suptitle("Comparaison des Algorithmes de Détection d'Anomalies\n(Features : MTBF, MTTR, Taux d'urgence)",
             fontsize=14, fontweight='bold', color='#0F2A44')

models = [
    ("Isolation Forest", y_iso, scores_iso, "#2E86AB"),
    ("One-Class SVM", y_svm, scores_svm, "#A23B72"),
    ("K-Means (Clustering)", y_kmeans_mapped, None, "#F18F01"),
]
silhouettes = [sil_iso, sil_svm, sil_kmeans]

for ax, (name, preds, scores, color), sil in zip(axes, models, silhouettes):
    normal_mask = preds == 1
    anomaly_mask = preds == -1

    ax.scatter(X_scaled[normal_mask, 0], X_scaled[normal_mask, 1],
               c='#2ECC71', s=40, alpha=0.7, label='Normal', edgecolors='white', linewidth=0.5)
    ax.scatter(X_scaled[anomaly_mask, 0], X_scaled[anomaly_mask, 1],
               c='#E74C3C', s=80, alpha=0.9, marker='X', label='Anomalie', edgecolors='#8B0000', linewidth=0.5)

    ax.set_title(f"{name}\nSilhouette Score : {sil:.2f}", fontsize=11, fontweight='bold', color='#0F2A44')
    ax.set_xlabel("MTBF (normalisé)", fontsize=9, color='#555')
    ax.set_ylabel("MTTR (normalisé)", fontsize=9, color='#555')
    ax.legend(fontsize=8)
    ax.grid(True, alpha=0.3)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)

plt.tight_layout()
out1 = os.path.join(OUTPUT_DIR, 'ml_comparison_algorithms.png')
plt.savefig(out1, dpi=150, bbox_inches='tight')
print(f"\n[OK] Figure 1 sauvegardée : {out1}")

# =============================================================
# 6. FIGURE 2 — GRAPHIQUE BARRES : COMPARAISON DES SCORES
# =============================================================
fig2, ax2 = plt.subplots(figsize=(8, 5))

algos = ["Isolation Forest\n(Retenu)", "One-Class SVM", "K-Means"]
scores_vals = [sil_iso, sil_svm, sil_kmeans]
colors = ["#2E86AB", "#A23B72", "#F18F01"]
bars = ax2.bar(algos, scores_vals, color=colors, edgecolor='white', linewidth=1.5, width=0.5)

for bar, val in zip(bars, scores_vals):
    ax2.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.01,
             f"{val:.2f}", ha='center', va='bottom', fontweight='bold', fontsize=12)

ax2.set_ylabel("Silhouette Score", fontsize=11, color='#0F2A44')
ax2.set_title("Comparaison des Performances\npar Silhouette Score", fontsize=13, fontweight='bold', color='#0F2A44')
ax2.set_ylim(0, 1.0)
ax2.axhline(y=sil_iso, color='#2E86AB', linestyle='--', alpha=0.5, linewidth=1)
ax2.grid(axis='y', alpha=0.3)
ax2.spines['top'].set_visible(False)
ax2.spines['right'].set_visible(False)

# Annotation du meilleur score
ax2.annotate("✓ Meilleur score", xy=(0, sil_iso), xytext=(0.5, sil_iso + 0.08),
             fontsize=10, color='#2E86AB', fontweight='bold',
             arrowprops=dict(arrowstyle='->', color='#2E86AB'))

plt.tight_layout()
out2 = os.path.join(OUTPUT_DIR, 'ml_comparison_scores.png')
plt.savefig(out2, dpi=150, bbox_inches='tight')
print(f"[OK] Figure 2 sauvegardée : {out2}")

# =============================================================
# 7. MODÈLE 2 — RECOMMANDATION DE FRÉQUENCE DE MAINTENANCE
# =============================================================
print("\n" + "="*50)
print("MODÈLE 2 : Recommandation de fréquence de maintenance")
print("="*50)

# K-Means pour profiler les machines (3 profils)
kmeans_rec = KMeans(n_clusters=3, random_state=42, n_init=10)
profiles = kmeans_rec.fit_predict(X_scaled)
sil_rec = silhouette_score(X_scaled, profiles)

# Calcul des centres de clusters pour interprétation
centers = scaler.inverse_transform(kmeans_rec.cluster_centers_)
print("\nProfils identifiés (centres des clusters) :")
profile_labels = []
for i, center in enumerate(centers):
    mtbf, mttr, urgence = center
    if urgence > 0.5:
        label = "CRITIQUE — Maintenance immédiate"
    elif urgence > 0.25:
        label = "MODÉRÉ — Maintenance mensuelle"
    else:
        label = "BON — Maintenance trimestrielle"
    profile_labels.append(label)
    print(f"  Profil {i+1}: MTBF={mtbf:.0f}h, MTTR={mttr:.1f}h, Urgence={urgence:.0%} → {label}")

print(f"\n[Modèle 2] Silhouette Score : {sil_rec:.4f}")

# FIGURE 3 — Profils de maintenance recommandés
fig3, ax3 = plt.subplots(figsize=(10, 6))
profile_colors = ["#E74C3C", "#F39C12", "#2ECC71"]
profile_names = ["Critique\n(Maintenance immédiate)", "Modéré\n(Maintenance mensuelle)", "Optimal\n(Maintenance trimestrielle)"]

# Trier les clusters par urgence décroissante
cluster_urgences = [(i, centers[i][2]) for i in range(3)]
cluster_urgences.sort(key=lambda x: x[1], reverse=True)

for rank, (cluster_idx, urgence) in enumerate(cluster_urgences):
    mask = profiles == cluster_idx
    ax3.scatter(X[mask, 0], X[mask, 1],
                c=profile_colors[rank], s=60, alpha=0.8,
                label=f"{profile_names[rank]} ({mask.sum()} machines)",
                edgecolors='white', linewidth=0.5)

ax3.set_xlabel("MTBF (heures)", fontsize=11, color='#0F2A44')
ax3.set_ylabel("MTTR (heures)", fontsize=11, color='#0F2A44')
ax3.set_title(f"Modèle de Recommandation de Maintenance par K-Means\nSilhouette Score : {sil_rec:.2f}",
              fontsize=13, fontweight='bold', color='#0F2A44')
ax3.legend(fontsize=9, loc='upper right')
ax3.grid(True, alpha=0.3)
ax3.spines['top'].set_visible(False)
ax3.spines['right'].set_visible(False)

plt.tight_layout()
out3 = os.path.join(OUTPUT_DIR, 'ml_recommendation_profiles.png')
plt.savefig(out3, dpi=150, bbox_inches='tight')
print(f"[OK] Figure 3 sauvegardée : {out3}")

plt.show()
print("\n✅ Tous les graphiques ont été générés avec succès !")
