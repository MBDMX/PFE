import { X, Send, ArrowRightLeft, Package, Warehouse } from 'lucide-react';
import { useState } from 'react';
import { gmaoApi } from '../../../services/api';
import { useToast } from '../../../components/ui/toast';
import { StockItem } from './types';

interface Props {
    item: StockItem;
    onClose: () => void;
}

export default function TransferStockPanel({ item, onClose }: Props) {
    const [qty, setQty] = useState(1);
    const [loading, setLoading] = useState(false);
    const { success, error } = useToast();

    const handleTransfer = async () => {
        if (qty > item.quantity) {
            error('Quantité insuffisante', 'Vous ne pouvez pas transférer plus que le stock disponible.');
            return;
        }
        setLoading(true);
        try {
            const res = await gmaoApi.transferStock(item.reference, qty);
            success('Transfert SAP réussi', `La pièce ${item.reference} a été transférée.`);
            onClose();
        } catch (err) {
            error('Échec du transfert', 'Une erreur est survenue lors de la communication avec SAP.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
            
            <div className="relative w-full max-w-md azure-card p-8 animate-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                            <ArrowRightLeft size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-white uppercase tracking-tight">Transfert Stock SAP</h2>
                            <p className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest">{item.reference}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="size-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-6">
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-4">
                        <div className="size-12 rounded-xl bg-slate-800 flex items-center justify-center text-blue-400">
                            <Package size={24} />
                        </div>
                        <div className="flex-1">
                            <div className="text-sm font-bold text-white">{item.name}</div>
                            <div className="text-xs font-bold text-emerald-400">Stock disponible: {item.quantity} {item.unit}</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[0.65rem] font-black text-slate-500 uppercase tracking-widest ml-1">DE (Source)</label>
                            <div className="flex items-center gap-2 p-3 bg-slate-900 border border-white/5 rounded-xl text-xs font-bold text-slate-300">
                                <Warehouse size={14} className="text-slate-500" /> Magasin Principal
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[0.65rem] font-black text-slate-500 uppercase tracking-widest ml-1">VERS (Dest.)</label>
                            <div className="flex items-center gap-2 p-3 bg-slate-900 border border-white/5 rounded-xl text-xs font-bold text-slate-300">
                                <Warehouse size={14} className="text-slate-500" /> Zone Production
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[0.65rem] font-black text-slate-500 uppercase tracking-widest ml-1">Quantité à transférer</label>
                        <input 
                            type="number" 
                            min={1} 
                            max={item.quantity}
                            value={qty}
                            onChange={(e) => setQty(parseInt(e.target.value) || 0)}
                            className="w-full bg-slate-950 border border-white/10 rounded-2xl py-4 px-6 text-white font-black text-2xl focus:outline-none focus:border-violet-500/50 transition-all text-center"
                        />
                    </div>

                    <button 
                        onClick={handleTransfer}
                        disabled={loading || qty <= 0 || qty > item.quantity}
                        className="w-full py-5 rounded-2xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-black uppercase text-xs tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-lg shadow-violet-600/20"
                    >
                        {loading ? <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Send size={16} /> Initier le Transfert SAP</>}
                    </button>
                </div>
            </div>
        </div>
    );
}
