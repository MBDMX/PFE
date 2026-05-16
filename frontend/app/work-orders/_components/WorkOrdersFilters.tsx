import { Search } from 'lucide-react';

interface Props {
    searchTerm: string;
    statusFilter: string;
    onSearch: (v: string) => void;
    onFilter: (v: string) => void;
}

export default function WorkOrdersFilters({ searchTerm, statusFilter, onSearch, onFilter }: Props) {
    return (
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={18} />
                <input
                    type="text"
                    placeholder="Rechercher une intervention..."
                    className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-sm font-medium focus:outline-none focus:border-blue-500/50 focus:bg-slate-900 transition-all font-outfit"
                    value={searchTerm}
                    onChange={e => onSearch(e.target.value)}
                />
            </div>
            <select
                className="min-w-[200px] bg-slate-900/50 border border-white/5 rounded-2xl py-3 px-6 text-sm font-bold text-slate-400 focus:outline-none appearance-none cursor-pointer uppercase tracking-widest"
                value={statusFilter}
                onChange={e => onFilter(e.target.value)}
            >
                <option value="all">Tous les Statuts</option>
                <option value="open">Ouvert</option>
                <option value="in_progress">En Cours</option>
                <option value="pending_deletion">Attente Suppr.</option>
                <option value="done">Terminé</option>
                <option value="closed">Clôturé</option>
            </select>
        </div>
    );
}
