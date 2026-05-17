import { Plus, RefreshCw } from 'lucide-react'; // Importation des icônes Plus (création) et Refresh (flèches de synchro)
import { useRouter } from 'next/navigation'; // Importation du système de navigation Next.js pour changer de page

// Définition de l'interface des propriétés (Props) reçues par ce composant
interface Props {
    isSyncing: boolean; // Si vrai, indique que la synchronisation SAP est en cours
    showSyncBtn: boolean; // Si vrai, affiche le bouton de synchro à l'écran (si manager ou technicien autorisé)
    onSync: () => void; // Fonction déclenchée lors du clic sur le bouton de synchro SAP
}

export default function WorkOrdersHeader({ isSyncing, showSyncBtn, onSync }: Props) {
    const router = useRouter(); // router : Outil pour rediriger l'utilisateur vers une autre page (ex: création d'un OT)
    return (
        // Conteneur d'en-tête flexbox (titre à gauche, boutons à droite)
        <header className="page-header px-2">
            
            {/* 1. SECTION TITRE & SOUS-TITRE */}
            <div>
                <h1 className="text-3xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent tracking-tight">Ordre de travail</h1>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Gestion des Ordres de Travail et Maintenance</p>
            </div>
            
            {/* 2. SECTION BOUTONS D'ACTION */}
            <div className="flex gap-3">
                {/* Affiche le bouton "Synchroniser SAP" uniquement si l'utilisateur a les droits requis */}
                {showSyncBtn && (
                    <button onClick={onSync} disabled={isSyncing} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-blue-500/30 text-white font-black uppercase text-xs tracking-widest transition-all group disabled:opacity-50">
                        {/* Fait tourner l'icône de rafraîchissement si la synchro est en cours (animate-spin) */}
                        <RefreshCw size={16} className={isSyncing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} />
                        {isSyncing ? 'En cours...' : 'Synchroniser SAP'}
                    </button>
                )}
                
                {/* Bouton de création d'un nouvel OT (Nouvel Ordre de Travail) */}
                <button id="create-wo-btn" onClick={() => router.push('/work-orders/new')} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-blue-600/20 transition-all hover:scale-105 active:scale-95">
                    <Plus size={20} strokeWidth={3} />
                    <span>Nouvel OT</span>
                </button>
            </div>
        </header>
    );
}
