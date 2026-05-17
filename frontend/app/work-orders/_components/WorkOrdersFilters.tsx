import { Search } from 'lucide-react'; // Importation de l'icône de recherche (loupe)

// Définition de l'interface des propriétés (Props) reçues par ce composant
interface Props {
    searchTerm: string; // Le texte de recherche actuel
    statusFilter: string; // Le filtre de statut actuellement sélectionné
    onSearch: (v: string) => void; // Fonction pour modifier le texte de recherche dans la page principale
    onFilter: (v: string) => void; // Fonction pour modifier le filtre de statut dans la page principale
}

export default function WorkOrdersFilters({ searchTerm, statusFilter, onSearch, onFilter }: Props) {
    return (
        // Conteneur flexible s'affichant en colonne sur mobile (flex-col) et en ligne sur tablette/ordinateur (sm:flex-row)
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
            
            {/* 🔍 1. ZONE DE SAISIE DE LA RECHERCHE TEXTUELLE */}
            <div className="relative flex-1 group">
                {/* Icône Loupe placée de manière absolue à gauche de l'input */}
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={18} />
                <input
                    type="text"
                    placeholder="Rechercher une intervention..."
                    className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-sm font-medium focus:outline-none focus:border-blue-500/50 focus:bg-slate-900 transition-all font-outfit text-white"
                    value={searchTerm} // Liaison avec le texte saisi
                    onChange={e => onSearch(e.target.value)} // Transmet immédiatement chaque lettre écrite à la page parente
                />
            </div>
            
            {/* 📶 2. MENU DÉROULANT POUR LE FILTRE PAR STATUT */}
            <select
                className="min-w-[200px] bg-slate-900/50 border border-white/5 rounded-2xl py-3 px-6 text-sm font-bold text-slate-400 focus:outline-none appearance-none cursor-pointer uppercase tracking-widest"
                value={statusFilter} // Liaison avec le filtre de statut sélectionné
                onChange={e => onFilter(e.target.value)} // Transmet le choix sélectionné à la page parente
            >
                <option value="all" className="bg-slate-950 text-slate-300">Tous les Statuts</option>
                <option value="open" className="bg-slate-950 text-slate-300">Ouvert</option>
                <option value="in_progress" className="bg-slate-950 text-slate-300">En Cours</option>
                <option value="pending_deletion" className="bg-slate-950 text-slate-300">Attente Suppr.</option>
                <option value="done" className="bg-slate-950 text-slate-300">Terminé</option>
                <option value="closed" className="bg-slate-950 text-slate-300">Clôturé</option>
            </select>
        </div>
    );
}
