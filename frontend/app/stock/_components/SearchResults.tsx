import { BarChart3, Package, Tag, MapPin, Box, ShoppingCart } from 'lucide-react';
import { StockItem, getPieceIcon, getScoreColor } from './types';
import HighlightText from './HighlightText';

interface Props {
  results: Array<StockItem & { score: number }>;
  searchTerm: string;
  canOrder: boolean;
  onOrder: (item: StockItem) => void;
}

export default function SearchResults({ results, searchTerm, canOrder, onOrder }: Props) {
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center gap-3 px-2 mb-6">
        <BarChart3 size={18} className="text-blue-400" />
        <h3 className="text-lg font-black text-white uppercase tracking-widest">
          Top {results.length} Résultats
        </h3>
        <span className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest">
          classés par pertinence IA
        </span>
      </div>

      {results.length > 0 ? results.map((item, idx) => {
        const icon = getPieceIcon(item.name);
        return (
          <div
            key={item.id}
            className="azure-card p-0 overflow-hidden group hover:border-blue-500/30 transition-all"
          >
            <div className="flex items-stretch">
              {/* Rang */}
              <div className="w-16 bg-slate-900/50 flex items-center justify-center border-r border-white/5 shrink-0">
                <span className="text-2xl font-black text-slate-600 group-hover:text-blue-400 transition-colors">
                  #{idx + 1}
                </span>
              </div>

              {/* Image ou icône */}
              {item.image ? (
                <div className="w-24 bg-slate-900 flex items-center justify-center border-r border-white/5 shrink-0 relative overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-80 group-hover:opacity-100"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-slate-950/20" />
                </div>
              ) : (
                <div className={`w-24 bg-gradient-to-br ${icon.gradient} flex items-center justify-center border-r ${icon.border} shrink-0`}>
                  <span className="text-3xl group-hover:scale-125 transition-transform duration-300">{icon.icon}</span>
                </div>
              )}

              {/* Infos */}
              <div className="flex-1 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-black text-white text-base group-hover:text-blue-400 transition-colors uppercase tracking-tight">
                      <HighlightText text={item.name} highlight={searchTerm} />
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest">
                        <Tag size={10} className="inline mr-1" />{item.reference}
                      </span>
                      <span className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest">
                        <MapPin size={10} className="inline mr-1" />{item.location}
                      </span>
                      <span className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest">
                        <Box size={10} className="inline mr-1" />{item.quantity} {item.unit}
                      </span>
                      <span className="text-[0.65rem] font-bold text-blue-400 uppercase tracking-widest">
                        {item.unit_price ? `${item.unit_price.toFixed(3)} TND` : '-'}
                      </span>
                    </div>
                    {item.synonyms && item.synonyms.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {item.synonyms.split(',').slice(0, 3).map((syn, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-md bg-white/5 text-[0.6rem] font-bold text-slate-500 border border-white/5">
                            {syn.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <div className={`px-3 py-2 rounded-xl border font-black text-sm ${getScoreColor(item.score)}`}>
                      {item.score}%
                    </div>
                    {canOrder && (
                      <button
                        onClick={() => onOrder(item)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-emerald-600/20 transition-all hover:scale-105 active:scale-95"
                      >
                        <ShoppingCart size={14} />
                        Commander
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      }) : (
        <div className="azure-card p-12 text-center">
          <Package size={40} className="mx-auto text-slate-700 mb-4" />
          <div className="font-bold text-slate-500">Aucune pièce correspondante trouvée</div>
          <p className="text-sm text-slate-600 mt-2">Essayez avec d'autres termes ou synonymes</p>
        </div>
      )}
    </div>
  );
}