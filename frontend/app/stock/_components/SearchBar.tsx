import { Search, Loader2, Zap } from 'lucide-react';

interface Props {
  searchTerm: string;
  isSearching: boolean;
  hasSearched: boolean;
  onChange: (value: string) => void;
}

const SUGGESTIONS = ['courroie moteur', 'roulement', 'filtre huile', 'capteur', 'contacteur'];

export default function SearchBar({ searchTerm, isSearching, hasSearched, onChange }: Props) {
  return (
    <div className="azure-card p-8 mb-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 size-40 bg-blue-500/10 blur-[80px] rounded-full -mr-10 -mt-10" />
      <div className="absolute bottom-0 left-0 size-32 bg-indigo-500/10 blur-[60px] rounded-full -ml-10 -mb-10" />

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="size-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Zap size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">Recherche Intelligente</h2>
            <p className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest">
              Décrivez la pièce → Top 5 résultats
            </p>
          </div>
        </div>

        <div className="relative mt-6 group">
          <Search
            className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors"
            size={22}
          />
          {isSearching && (
            <Loader2
              className="absolute right-5 top-1/2 -translate-y-1/2 text-blue-400 animate-spin"
              size={20}
            />
          )}
          <input
            type="text"
            placeholder="Décrivez la pièce recherchée... ex: courroie ventilateur, roulement moteur..."
            className="w-full bg-slate-950/60 border-2 border-white/10 rounded-2xl py-4 pl-14 pr-14 text-base font-bold focus:outline-none focus:border-blue-500/50 focus:bg-slate-950 transition-all placeholder:text-slate-600 placeholder:font-medium"
            value={searchTerm}
            onChange={(e) => onChange(e.target.value)}
            autoFocus
          />
        </div>

        {!hasSearched && !searchTerm && (
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="text-[0.65rem] font-bold text-slate-600 uppercase tracking-widest mr-2 pt-1">
              Suggestions :
            </span>
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => onChange(s)}
                className="px-3 py-1 rounded-lg bg-white/5 border border-white/5 text-xs font-bold text-slate-400 hover:text-blue-400 hover:border-blue-500/30 transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}