import { RefreshCw } from 'lucide-react'; // Importation de l'icône de rafraîchissement (flèches circulaires)

// Définition de l'interface des propriétés (Props) reçues par ce composant
interface Props {
    isSyncing: boolean; // Si vrai, indique que le téléchargement depuis SAP ProcessForce est en cours
    onSync: () => void; // Fonction déclenchée quand l'utilisateur clique pour synchroniser
}

export default function MachinesHeader({ isSyncing, onSync }: Props) {
    return (
        // Conteneur d'en-tête (titres alignés à gauche, bouton d'action aligné à droite)
        <header className="page-header px-2 flex justify-between items-center">
            
            {/* 1. TITRES ET MOTS CLEFS D'IDENTIFICATION */}
            <div>
                <h1 className="text-3xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent tracking-tight">Parc Machines</h1>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Inventaire et État de Santé des Équipements (Source SAP)</p>
            </div>
            
            {/* 2. BOUTON DE SYNCHRONISATION EN TEMPS RÉEL AVEC SAP */}
            <button
                id="sync-sap-btn"
                onClick={onSync} // Déclenche la fonction reçue en paramètre
                disabled={isSyncing} // Bloque le bouton pendant que la synchronisation est en cours
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-blue-500/30 text-white font-black uppercase text-xs tracking-widest transition-all group disabled:opacity-50"
            >
                {/* L'icône RefreshCw tourne sur elle-même (animate-spin) si la synchronisation est active */}
                <RefreshCw size={16} className={isSyncing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} />
                {isSyncing ? 'Synchronisation...' : 'Synchroniser SAP'}
            </button>
        </header>
    );
}
