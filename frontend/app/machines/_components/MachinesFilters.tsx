import { Search, Filter } from 'lucide-react';

interface Props {
    searchTerm: string;
    statusFilter: string;
    onSearch: (v: string) => void;
    onFilter: (v: string) => void;
}

export default function MachinesFilters({ searchTerm, statusFilter, onSearch, onFilter }: Props) {
    return (
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={18} />
                <input
                    id="search-bar"
                    type="text"
                    placeholder="Rechercher par nom ou référence..."
                    className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-sm font-medium focus:outline-none focus:border-blue-500/50 focus:bg-slate-900 transition-all"
                    value={searchTerm}
                    onChange={e => onSearch(e.target.value)}
                />
            </div>
            <div className="relative min-w-[200px]">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <select
                    className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-3 pl-12 pr-10 text-sm font-medium focus:outline-none appearance-none cursor-pointer"
                    value={statusFilter}
                    onChange={e => onFilter(e.target.value)}
                >
                    <option value="all">Tous les Statuts</option>
                    <option value="operational">Opérationnel</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="breakdown">En Panne</option>
                </select>
            </div>
        </div>
    );
}
