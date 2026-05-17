'use client'; // Indique à Next.js que ce fichier s'exécute côté navigateur (composant dynamique interactif)

import { useSearchParams } from "next/navigation"; // Importation pour lire les paramètres dans la barre d'adresse (URL)
import { Suspense } from "react"; // Composant React pour afficher un chargement temporaire pendant que l'URL est lue
import { OverviewManagement } from "./_components/OverviewManagement"; // Importation du sous-composant de vue générale (Statistiques et graphiques)
import { UsersManagement } from "./_components/UsersManagement"; // Importation du sous-composant de gestion des utilisateurs (comptes)
import { SyncManagement } from "./_components/SyncManagement"; // Importation du sous-composant pour forcer la synchronisation avec SAP
import { Loader2, ShieldCheck, RefreshCw, Check } from "lucide-react"; // Belles icônes vectorielles

// On lit le ?tab= depuis l'URL pour que la sidebar du layout global pilote la navigation
function AdminContent() {
  const searchParams = useSearchParams(); // Outil Next.js pour lire les paramètres de l'URL (ex: ?tab=users)
  const tab = searchParams.get("tab") || "overview"; // Si aucun onglet spécifié, on affiche par défaut la vue "overview"

  return (
    // Animation de fondu fluide à l'affichage du panneau d'administration
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 p-8 max-w-7xl mx-auto">
      {tab === "overview"  && <OverviewManagement setTab={() => {}} />} {/* Affiche les stats globales si l'onglet est "overview" */}
      {tab === "users"     && <UsersManagement />} {/* Affiche le tableau de gestion des utilisateurs si l'onglet est "users" */}
      {tab === "sync"      && <SyncManagement />} {/* Affiche le panneau de synchronisation SAP si l'onglet est "sync" */}
      {tab === "settings"  && <SettingsPanel />} {/* Affiche les paramètres généraux de l'usine si l'onglet est "settings" */}
    </div>
  );
}

// ⚙️ PANNEAU DE CONFIGURATION DES PARAMÈTRES GÉNÉRAUX DE L'USINE (GMAO)
function SettingsPanel() {
  return (
    <div className="animate-in fade-in duration-500 space-y-8">
      
      {/* En-tête du panneau des paramètres */}
      <header className="mb-8">
        <h1 className="text-3xl font-black text-white tracking-tight">Paramètres Système</h1>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1">Configuration de l'Instance GMAO PRO</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* SECTION 1 : INFORMATIONS DE L'ENTREPRISE / USINE */}
        <div className="azure-card p-6 border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-3 mb-6">
            <div className="size-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                <ShieldCheck size={18} />
            </div>
            <h3 className="text-xs font-black text-white uppercase tracking-widest">🏭 Informations Entreprise</h3>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase mb-1.5 block">Nom de l'entreprise</label>
                    <input className="azure-input text-xs" defaultValue="MAGHREB INDUSTRIES" /> {/* Champ de saisie pré-rempli */}
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase mb-1.5 block">Plant ID / Site</label>
                    <input className="azure-input text-xs" defaultValue="PLANT-CASABLANCA-01" /> {/* Identifiant unique du site industriel */}
                </div>
            </div>
            <div>
                <label className="text-[10px] font-black text-slate-500 uppercase mb-1.5 block">Adresse du site</label>
                <input className="azure-input text-xs" defaultValue="Route de l'Aéroport, Zone Industrielle, Casablanca" />
            </div>
            
            {/* Zone interactive de téléversement du logo de l'entreprise */}
            <div className="p-4 rounded-xl border border-dashed border-white/10 flex items-center gap-4 group cursor-pointer hover:bg-white/5 transition-all">
                <div className="size-12 rounded-lg bg-slate-800 flex items-center justify-center border border-white/5 group-hover:border-blue-500/30 transition-all">
                    <img src="/logo-placeholder.png" alt="Logo" className="size-8 opacity-20 group-hover:opacity-100" />
                </div>
                <div>
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block">Logo de l'application</span>
                    <span className="text-[9px] font-bold text-slate-600 uppercase">PNG/SVG · Max 500KB</span>
                </div>
            </div>
          </div>
        </div>

        {/* SECTION 2 : LOCALISATION & DEVISE */}
        <div className="azure-card p-6 border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-3 mb-6">
            <div className="size-8 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400">
                <RefreshCw size={18} />
            </div>
            <h3 className="text-xs font-black text-white uppercase tracking-widest">🌍 Localisation & Région</h3>
          </div>
          
          <div className="space-y-4">
            <div>
                <label className="text-[10px] font-black text-slate-500 uppercase mb-1.5 block">Fuseau Horaire</label>
                <select className="azure-input text-xs">
                    <option>(GMT+01:00) Casablanca / Paris</option>
                    <option>(GMT+00:00) London / Lisbon</option>
                </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase mb-1.5 block">Langue Système</label>
                    <select className="azure-input text-xs">
                        <option>Français (France)</option>
                        <option>English (US)</option>
                        <option>العربية (Maghreb)</option>
                    </select>
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase mb-1.5 block">Devise par défaut</label>
                    <select className="azure-input text-xs">
                        <option>MAD (Dirham)</option>
                        <option>EUR (€)</option>
                        <option>USD ($)</option>
                    </select>
                </div>
            </div>
          </div>
        </div>

        {/* SECTION 3 : GESTION DES ABONNEMENTS ET FLUX DE NOTIFICATIONS PAR RÔLE */}
        <div className="azure-card p-6 border-white/5 bg-white/[0.02] lg:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <div className="size-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                <Loader2 size={18} />
            </div>
            <h3 className="text-xs font-black text-white uppercase tracking-widest">🔔 Notifications & Alertes Critiques</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
                { role: "ADMINISTRATEUR", items: ["Audit Logs", "System Errors", "User Management"] },
                { role: "MANAGER", items: ["OT Overdue", "Machine Downtime", "Stock Low"] },
                { role: "MAGASINIER", items: ["Parts Requests", "Stock Movement", "SAP Sync Errors"] },
            ].map(col => (
                <div key={col.role} className="p-4 rounded-2xl bg-white/[0.01] border border-white/5">
                    {/* Affiche le rôle concerné */}
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 block border-b border-white/5 pb-2">{col.role}</span>
                    <div className="space-y-3">
                        {col.items.map(item => (
                            <div key={item} className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-300">{item}</span>
                                {/* Case à cocher verte indiquant que les alertes sont activées par défaut */}
                                <div className="size-4 rounded-md bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                                    <Check size={10} className="text-emerald-400" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bouton de sauvegarde final */}
      <div className="flex justify-end pt-4">
        <button className="azure-btn bg-blue-600 px-8 py-3 text-xs shadow-xl shadow-blue-600/20">
            Enregistrer les modifications
        </button>
      </div>
    </div>
  );
}

// 📦 COMPOSANT CONTENEUR DASHBOARD (ADMINDASHBOARD) :
// Utilise un Suspense pour éviter les erreurs de compilation lors de la lecture des paramètres de l'URL côté serveur
export default function AdminDashboard() {
  return (
    <Suspense fallback={
      // Affiche un cercle de chargement animé (spinner) pendant que les paramètres d'URL sont récupérés
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    }>
      <AdminContent />
    </Suspense>
  );
}
