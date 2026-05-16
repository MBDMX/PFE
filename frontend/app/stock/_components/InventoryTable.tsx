import { 
  Package, MapPin, ShoppingCart, ArrowUpDown, ArrowRightLeft,
  CheckCircle2, AlertCircle, Settings2, Wrench, 
  Zap, Droplets, Cpu, Box 
} from 'lucide-react';
import { StockItem } from './types';
import { gmaoApi } from '../../../services/api';
import { useToast } from '../../../components/ui/toast';

interface Props {
  items: StockItem[];
  isLoading: boolean;
  canOrder: boolean;
  onOrder: (item: StockItem) => void;
  onTransfer: (item: StockItem) => void;
  sortConfig?: { key: string; direction: 'asc' | 'desc' } | null;
  onSort?: (key: string) => void;
}

/** Renders the part image with 3-level fallback logic */
function PartImage({ item }: { item: StockItem }) {
  const { success } = useToast();
  let src = item.image || item.cached_image || '';

  if (src && !src.startsWith('data:') && !src.startsWith('http')) {
    src = `data:image/jpeg;base64,${src}`;
  }

  const handleVerify = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await gmaoApi.patch(`/stock/${item.id}/verify`, {});
      success('Image Validée', 'Cette image est désormais marquée comme Source de Vérité ✅');
    } catch {}
  };

  if (src) {
    return (
      <div className="relative group/img">
        <div className={`size-12 rounded-xl overflow-hidden border ${item.image_verified ? 'border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 'border-white/10'} bg-slate-800 shrink-0 flex items-center justify-center shadow-inner group-hover:border-blue-500/50 transition-all duration-500`}>
          <img
            src={src}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            loading="lazy"
          />
          {item.image_verified && (
            <div className="absolute top-0 right-0 p-0.5 bg-emerald-500 rounded-bl-lg">
              <CheckCircle2 size={10} className="text-white" />
            </div>
          )}
        </div>
        
        {!item.image_verified && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity bg-slate-900/60 rounded-xl backdrop-blur-[2px]">
            <button 
              onClick={handleVerify}
              title="Valider cette image"
              className="p-1.5 hover:bg-emerald-500 rounded-lg transition-colors text-white"
            >
              <CheckCircle2 size={14} />
            </button>
            <button 
              title="Signaler une erreur"
              className="p-1.5 hover:bg-rose-500 rounded-lg transition-colors text-white"
            >
              <AlertCircle size={14} />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="size-12 rounded-xl border border-blue-500/20 bg-blue-500/5 shrink-0 flex items-center justify-center shadow-inner group-hover:bg-blue-500/10 transition-colors">
      {getCategoryIcon(item.name || item.category || '')}
    </div>
  );
}

function getCategoryIcon(context: string) {
  const n = (context || '').toLowerCase();
  if (n.includes('pneuma') || n.includes('verin') || n.includes('air')) return <Box className="text-blue-400/60" size={20} />;
  if (n.includes('hydraul') || n.includes('pompe') || n.includes('huile')) return <Droplets className="text-cyan-400/60" size={20} />;
  if (n.includes('electr') || n.includes('moteur') || n.includes('cable') || n.includes('capteur')) return <Zap className="text-yellow-400/60" size={20} />;
  if (n.includes('mecani') || n.includes('roulement') || n.includes('vis') || n.includes('boulon')) return <Wrench className="text-slate-400/60" size={20} />;
  if (n.includes('control') || n.includes('carte') || n.includes('cpu')) return <Cpu className="text-purple-400/60" size={20} />;
  return <Package className="text-slate-600/40" size={20} />;
}

function TableSkeleton({ canOrder }: { canOrder: boolean }) {
  return (
    <>
      {[1, 2, 3, 4, 5].map((i) => (
        <tr key={i} className="animate-pulse border-b border-white/5">
          <td>
            <div className="flex items-center gap-4 py-2">
              <div className="size-12 rounded-xl bg-slate-800/50 border border-white/5" />
              <div className="space-y-2">
                <div className="h-4 w-32 bg-slate-800/50 rounded" />
                <div className="h-3 w-20 bg-slate-800/30 rounded" />
              </div>
            </div>
          </td>
          <td><div className="h-4 w-12 bg-slate-800/50 rounded" /></td>
          <td><div className="h-4 w-24 bg-slate-800/50 rounded" /></td>
          <td><div className="h-4 w-20 bg-slate-800/50 rounded" /></td>
          {canOrder && <td><div className="h-8 w-24 bg-slate-800/50 rounded ml-auto" /></td>}
        </tr>
      ))}
    </>
  );
}

export default function InventoryTable({ items, isLoading, canOrder, onOrder, onTransfer, sortConfig, onSort }: Props) {

  const SortHeader = ({ label, sortKey }: { label: string; sortKey: string }) => (
    <th onClick={() => onSort?.(sortKey)} className="cursor-pointer hover:text-blue-400 transition-colors group">
      <div className="flex items-center gap-2">
        {label}
        <ArrowUpDown size={12} className={`transition-opacity ${sortConfig?.key === sortKey ? 'opacity-100 text-blue-400' : 'opacity-20 group-hover:opacity-50'}`} />
      </div>
    </th>
  );

  return (
    <div className={isLoading ? 'animate-pulse' : ''}>
      <div className="flex items-center gap-3 px-2 mb-6">
        <Package size={18} className="text-slate-500" />
        <h3 className="text-lg font-black text-white uppercase tracking-widest">Inventaire Complet</h3>
        <span className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest">{items.length} pièces en base</span>
      </div>

      <div className="azure-card p-0 overflow-hidden shadow-2xl">
        <div className="azure-table-wrap">
          <table className="azure-table">
            <thead>
              <tr>
                <SortHeader label="Article" sortKey="name" />
                <SortHeader label="Quantité" sortKey="quantity" />
                <SortHeader label="Emplacement" sortKey="location" />
                <SortHeader label="Prix Unité" sortKey="unit_price" />
                {canOrder && <th className="text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <TableSkeleton canOrder={canOrder} />
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-20">
                      <Package size={48} />
                      <p className="font-bold uppercase tracking-widest text-xs">Aucun article trouvé</p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="group border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors">
                    <td>
                      <div className="flex items-center gap-4 py-2">
                        <PartImage item={item} />
                        <div>
                          <div className="font-bold text-white group-hover:text-blue-400 transition-colors uppercase tracking-tight text-sm">{item.name}</div>
                          <div className="text-[0.7rem] font-bold text-slate-500 uppercase tracking-widest mt-1">{item.reference}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className={`size-2.5 rounded-full ${item.quantity <= 5 ? 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.6)] animate-pulse' : item.quantity <= 15 ? 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.4)]' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]'}`} />
                        <span className={`text-sm font-black ${item.quantity <= 5 ? 'text-rose-400' : 'text-white'}`}>{item.quantity}</span>
                        <span className="text-[0.65rem] font-bold text-slate-600 uppercase">{item.unit}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2 text-slate-400">
                        <MapPin size={14} className="text-slate-600" />
                        <span className="font-bold text-xs uppercase tracking-tight">{item.location}</span>
                      </div>
                    </td>
                    <td>
                      <div className="font-black text-slate-300 tracking-widest text-sm">{item.unit_price ? `${item.unit_price.toFixed(3)} TND` : '—'}</div>
                    </td>
                    {canOrder && (
                      <td className="text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <button
                            onClick={() => onTransfer?.(item)}
                            className="px-3 py-2 rounded-lg bg-white/5 text-slate-400 border border-white/10 font-bold text-[0.6rem] uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all"
                            title="Transférer vers Maintenance"
                          >
                            <ArrowRightLeft size={12} className="inline mr-1" />
                            Transférer
                          </button>
                          <button
                            onClick={() => onOrder(item)}
                            className="px-4 py-2 rounded-lg bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 font-bold text-xs uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all"
                          >
                            <ShoppingCart size={12} className="inline mr-1" />
                            Commander
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}