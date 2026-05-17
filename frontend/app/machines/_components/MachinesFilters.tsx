import { Search, Filter } from 'lucide-react'; // Importation des icônes de Recherche (Loupe) et de Filtrage (Entonnoir)

// Définition de l'interface des propriétés (Props) reçues par ce composant
interface Props {
    searchTerm: string; // Le texte de recherche actuel saisi au clavier
    statusFilter: string; // Le statut sélectionné (all, operational, breakdown...)
    onSearch: (v: string) => void; // Fonction déclenchée quand la recherche change
    onFilter: (v: string) => void; // Fonction déclenchée quand le filtre de statut change
}

export default function MachinesFilters({ searchTerm, statusFilter, onSearch, onFilter }: Props) {
    return (
        // Conteneur alignant la barre de recherche et le menu déroulant (en ligne sur PC, empilé sur mobile)
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
            
            {/* 🔍 1. CHAMP DE SAISIE DE RECHERCHE TEXTUELLE */}
            <div className="relative flex-1 group">
                {/* Icône Loupe positionnée à l'intérieur du champ de saisie */}
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={18} />
                <input
                    id="search-bar"
                    type="text"
                    placeholder="Rechercher par nom ou référence..."
                    className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-sm font-medium focus:outline-none focus:border-blue-500/50 focus:bg-slate-900 transition-all text-white placeholder:text-slate-600"
                    value={searchTerm} // Liaison avec l'état searchTerm du hook
                    onChange={e => onSearch(e.target.value)} // Met à jour le terme saisi
                />
            </div>
            
            {/* 🔌 2. MENU DÉROULANT DE FILTRE D'ÉTAT (Opérationnel, Maintenance, En Panne) */}
            <div className="relative min-w-[200px]">
                {/* Icône d'entonnoir */}
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <select
                    className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-3 pl-12 pr-10 text-sm font-medium focus:outline-none appearance-none cursor-pointer text-white"
                    value={statusFilter} // Liaison avec l'état statusFilter
                    onChange={e => onFilter(e.target.value)} // Déclenche le filtre de statut
                >
                    <option value="all" className="bg-slate-900 text-white">Tous les Statuts</option>
                    <option value="operational" className="bg-slate-900 text-white">Opérationnel</option>
                    <option value="maintenance" className="bg-slate-900 text-white">Maintenance</option>
                    <option value="breakdown" className="bg-slate-900 text-white">En Panne</option>
                </select>
            </div>
        </div>
    );
}
