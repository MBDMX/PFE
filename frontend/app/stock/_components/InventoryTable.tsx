import { Package, MapPin, ShoppingCart } from 'lucide-react';
import { StockItem, getPieceIcon } from './types';

interface Props {
  items: StockItem[];
  isLoading: boolean;
  canOrder: boolean;
  onOrder: (item: StockItem) => void;
}

export default function InventoryTable({ items, isLoading, canOrder, onOrder }: Props) {
  return (
    <div className={isLoading ? 'animate-pulse' : ''}>
      <div className="flex items-center gap-3 px-2 mb-6">
        <Package size={18} className="text-slate-500" />
        <h3 className="text-lg font-black text-white uppercase tracking-widest">Inventaire Complet</h3>
        <span className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest">
          {items.length} pièces SAP en base
        </span>
      </div>

      <div className="azure-card p-0 overflow-hidden shadow-2xl">
        <div className="azure-table-wrap">
          <table className="azure-table">
            <thead>
              <tr>
                <th>Article</th>
                <th>Quantité</th>
                <th>Emplacement</th>
                {canOrder && <th className="text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const icon = getPieceIcon(item.name);
                return (
                  <tr key={item.id} className="group">
                    <td>
                      <div className="flex items-center gap-4">
                        {item.image ? (
                          <div className="size-12 rounded-xl bg-slate-800 flex items-center justify-center border border-white/5 overflow-hidden">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                            />
                          </div>
                        ) : (
                          <div className={`size-12 rounded-xl bg-gradient-to-br ${icon.gradient} flex items-center justify-center border ${icon.border}`}>
                            <span className="text-lg">{icon.icon}</span>
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-white group-hover:text-blue-400 transition-colors uppercase tracking-tight text-sm">
                            {item.name}
                          </div>
                          <div className="text-[0.7rem] font-bold text-slate-500 uppercase tracking-widest mt-1">
                            {item.reference}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className={`size-2.5 rounded-full shadow-[0_0_8px] ${item.quantity <= 5 ? 'bg-rose-500 shadow-rose-500/40' :
                            item.quantity <= 15 ? 'bg-amber-400 shadow-amber-400/40' :
                              'bg-emerald-500 shadow-emerald-500/40'
                          }`}
                          title={
                            item.quantity <= 5 ? 'Stock Critique' :
                              item.quantity <= 15 ? 'Stock Limité' : 'Stock Optimal'
                          }
                        />
                        <span className="text-sm font-black text-white">{item.quantity}</span>
                        <span className="text-[0.65rem] font-bold text-slate-600 uppercase">{item.unit}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2 text-slate-400">
                        <MapPin size={14} className="text-slate-600" />
                        <span className="font-bold text-xs uppercase tracking-tight">{item.location}</span>
                      </div>
                    </td>
                    {canOrder && (
                      <td className="text-right">
                        <button
                          onClick={() => onOrder(item)}
                          className="px-4 py-2 rounded-lg bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 font-bold text-xs uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all"
                        >
                          <ShoppingCart size={12} className="inline mr-1" />
                          Commander
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}