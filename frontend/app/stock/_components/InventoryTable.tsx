import { 
  Package, MapPin, ShoppingCart, ArrowUpDown, ArrowRightLeft
} from 'lucide-react'; // Icônes visuelles élégantes
import { StockItem } from './types';
import { PartImage } from './PartImage'; // Affiche l'image de la pièce détachée récupérée via l'API Google Images

interface Props {
  items: StockItem[]; // Liste des pièces à afficher
  isLoading: boolean; // Statut de chargement (vrai/faux)
  canOrder: boolean; // Droit de passer une commande (vrai pour le magasinier/manager)
  onOrder: (item: StockItem) => void; // Fonction appelée pour commander une pièce
  onTransfer?: (item: StockItem) => void; // Fonction de transfert inter-dépôts SAP
  sortConfig?: { key: string; direction: 'asc' | 'desc' } | null; // Colonne triée et sens du tri
  onSort?: (key: string) => void; // Déclencheur du tri
}

// 📦 COMPOSANT D'ATTENTE (SKELETON LOADER) :
// Affiche des rectangles gris animés pendant que les stocks se chargent depuis SAP ou IndexedDB
function TableSkeleton({ canOrder }: { canOrder: boolean }) {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <tr key={i} className="animate-pulse border-b border-white/5">
          <td className="p-4">
            <div className="flex items-center gap-4"><div className="size-12 rounded-xl bg-slate-800/50" /><div className="h-4 w-32 bg-slate-800/50 rounded" /></div>
          </td>
          <td className="p-4"><div className="h-4 w-12 bg-slate-800/50 rounded" /></td>
          <td className="p-4"><div className="h-4 w-24 bg-slate-800/50 rounded" /></td>
          <td className="p-4"><div className="h-4 w-20 bg-slate-800/50 rounded" /></td>
          {canOrder && <td className="p-4"><div className="h-8 w-24 bg-slate-800/50 rounded ml-auto" /></td>}
        </tr>
      ))}
    </>
  );
}

export default function InventoryTable({ items, isLoading, canOrder, onOrder, onTransfer, sortConfig, onSort }: Props) {

  // Petit composant d'en-tête cliquable pour trier les colonnes (Name, Quantity, Price...)
  const SortHeader = ({ label, sortKey }: { label: string; sortKey: string }) => (
    <th onClick={() => onSort?.(sortKey)} className="p-4 cursor-pointer hover:text-blue-400 transition-colors group">
      <div className="flex items-center gap-2">
        {label}
        {/* Flèche directionnelle indiquant si le tri est ascendant ou descendant */}
        <ArrowUpDown size={12} className={`transition-opacity ${sortConfig?.key === sortKey ? 'opacity-100 text-blue-400' : 'opacity-20 group-hover:opacity-50'}`} />
      </div>
    </th>
  );

  return (
    <div className="animate-in fade-in duration-500">
      
      {/* En-tête de section avec le nombre de pièces trouvées */}
      <div className="flex items-center gap-3 px-2 mb-6">
        <Package size={18} className="text-slate-500" />
        <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">Inventaire</h3>
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{items.length} pièces</span>
      </div>

      <div className="azure-card p-0 overflow-hidden shadow-2xl">
        <div className="azure-table-wrap">
          <table className="azure-table w-full text-left">
            
            {/* 1. EN-TÊTE DU TABLEAU */}
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/5 text-[10px] font-black uppercase tracking-widest text-slate-500">
                <SortHeader label="Article" sortKey="name" />
                <SortHeader label="Stock" sortKey="quantity" />
                <SortHeader label="Position" sortKey="location" />
                <SortHeader label="Prix" sortKey="unit_price" />
                {canOrder && <th className="p-4 text-right">Actions</th>}
              </tr>
            </thead>
            
            {/* 2. CORPS DU TABLEAU (RÉSULTATS DE STOCKS) */}
            <tbody>
              {isLoading ? (
                <TableSkeleton canOrder={canOrder} /> // Affiche le squelette de chargement
              ) : items.length === 0 ? (
                <tr><td colSpan={5} className="py-20 text-center opacity-20 font-bold uppercase tracking-[0.3em] text-xs">Aucun article</td></tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="group border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors">
                    
                    {/* Colonne 1 : Image Google Images + Libellé + Référence de la pièce */}
                    <td className="p-4">
                      <div className="flex items-center gap-4">
                        <PartImage item={item} />
                        <div>
                          <div className="font-bold text-white group-hover:text-blue-400 transition-colors uppercase tracking-tight text-sm">{item.name}</div>
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{item.reference}</div>
                        </div>
                      </div>
                    </td>
                    
                    {/* Colonne 2 : Niveau de stock avec puce de couleur (Rose = critique, Émeraude = correct) */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`size-2 rounded-full ${item.quantity <= 5 ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]' : 'bg-emerald-500 shadow-[0_0_8px_#10b981]'}`} />
                        <span className="text-sm font-black text-white">{item.quantity}</span>
                        <span className="text-[10px] font-bold text-slate-600 uppercase">{item.unit}</span>
                      </div>
                    </td>
                    
                    {/* Colonne 3 : Localisation dans le magasin physique */}
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-slate-400">
                        <MapPin size={12} className="text-slate-600" />
                        <span className="font-bold text-[10px] uppercase">{item.location}</span>
                      </div>
                    </td>
                    
                    {/* Colonne 4 : Prix unitaire moyen de la pièce */}
                    <td className="p-4 font-black text-slate-300 text-sm">
                      {item.unit_price ? `${item.unit_price.toFixed(2)} TND` : '—'}
                    </td>
                    
                    {/* Colonne 5 (Actions) : Bouton pour passer commande de réapprovisionnement SAP */}
                    {canOrder && (
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => onOrder(item)} 
                            className="px-4 py-2 rounded-lg bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest hover:bg-emerald-400 hover:scale-105 active:scale-95 transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                          >
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