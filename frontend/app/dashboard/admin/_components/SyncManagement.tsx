import React, { useState } from 'react';
import { RefreshCw, Server, Database, CheckCircle, AlertTriangle } from 'lucide-react'; // Icônes d'infrastructure réseau
import { gmaoApi } from '../../../../services/api';

export function SyncManagement() {
  const [syncing, setSyncing] = useState(false); // Vrai si la synchronisation globale SAP est en cours
  const [progress, setProgress] = useState(0); // Barre de progression virtuelle (%)

  // 🔌 CLIC : DÉCLENCHE LA SYNCHRONISATION MULTI-MODULES SAP
  const handleSync = async () => {
    setSyncing(true);
    setProgress(10);
    try {
      // Lance 3 appels parallèles asynchrones vers le serveur FastAPI pour tout mettre à jour depuis SAP Business One :
      await Promise.all([
        gmaoApi.syncStockFromSap(), // 1. Stocks et inventaires
        gmaoApi.syncMachinesFromSap(), // 2. Équipements physiques
        gmaoApi.syncWorkOrdersFromSap() // 3. Bons d'interventions curatifs/préventifs
      ]);
      setProgress(100);
      // Remise à zéro propre après 1.5 seconde
      setTimeout(() => { setSyncing(false); setProgress(0); }, 1500);
    } catch (err: any) {
      alert("Erreur: " + err.message);
      setSyncing(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-500 max-w-4xl">
      
      {/* Titre du connecteur Azure SAP RPA */}
      <header className="mb-8">
        <h1 className="text-3xl font-black text-white tracking-tight">Synchronisation SAP</h1>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1">Passerelle Azure RPA — Instance PRD</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Panneau de contrôle du connecteur */}
        <div className="azure-card p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center">
                <Server size={24} className={syncing ? "text-blue-400 animate-spin" : "text-slate-600"} />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest">Connecteur SAP</h3>
                <div className="flex items-center gap-2 mt-1">
                  {/* Puce d'état de connexion en direct */}
                  <div className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                  <span className="text-[10px] font-bold text-emerald-500 uppercase">En Ligne</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <div className="p-4 rounded-xl bg-white/5 border border-white/5">
              <div className="flex justify-between text-[10px] font-black uppercase text-slate-500 mb-2">
                <span>Dernière Sync</span>
                <span className="text-white">Aujourd'hui, 08:45</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: '85%' }} />
              </div>
            </div>
          </div>

          {/* Barre de progression visuelle animée */}
          {syncing && (
            <div className="mb-6">
              <div className="h-1.5 w-full bg-blue-500/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-[10px] font-black text-blue-400 uppercase mt-2">Traitement des paquets SAP... {progress}%</p>
            </div>
          )}

          {/* Bouton de déclenchement manuel */}
          <button 
            onClick={handleSync} 
            disabled={syncing}
            className="w-full azure-btn py-3 bg-blue-600/10 border-blue-500/30 text-blue-400 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Sync en cours..." : "Lancer Synchronisation"}
          </button>
        </div>

        {/* Détails des modules d'affaires supportés */}
        <div className="azure-card p-6">
          <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6">Modules Supportés</h3>
          <div className="space-y-3">
            {["Ordres de Travail", "Stock & Pièces", "Données Équipements", "Hiérarchie Fonctionnelle"].map(m => (
              <div key={m} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <CheckCircle size={16} className="text-emerald-500" />
                <span className="text-xs font-bold text-slate-400">{m}</span>
              </div>
            ))}
          </div>
        </div>
        
      </div>
    </div>
  );
}
