import { X, ShoppingCart, CheckCircle2, Clock, Wifi, WifiOff, Plus, Minus, Send } from 'lucide-react';
import { StockItem } from './types';

interface OrderResult {
    status: 'success' | 'pending';
    message: string;
    sap_doc?: number;
}

interface Props {
    item: StockItem;
    qty: number;
    ordering: boolean;
    result: OrderResult | null;
    onQtyChange: (qty: number) => void;
    onOrder: () => void;
    onClose: () => void;
}

export default function OrderPanel({ item, qty, ordering, result, onQtyChange, onOrder, onClose }: Props) {
    const stockLevel = item.quantity <= 5 ? 'rose' : item.quantity <= 15 ? 'amber' : 'emerald';
    const levelCls = { rose: 'bg-rose-500/10 border-rose-500/30 text-rose-400', amber: 'bg-amber-500/10 border-amber-500/30 text-amber-400', emerald: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' }[stockLevel];
    const dotCls = { rose: 'bg-rose-400 animate-pulse', amber: 'bg-amber-400', emerald: 'bg-emerald-400' }[stockLevel];

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative w-full max-w-lg mb-0 animate-in slide-in-from-bottom-6 duration-300" onClick={e => e.stopPropagation()}>
                <div className="azure-card rounded-b-none rounded-t-3xl border-b-0 p-6 space-y-5 shadow-2xl shadow-blue-500/10">

                    {/* Header */}
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center"><ShoppingCart size={18} className="text-blue-400" /></div>
                            <div>
                                <div className="text-[0.6rem] font-black text-slate-500 uppercase tracking-widest">Commander via SAP</div>
                                <div className="text-sm font-black text-white leading-tight">{item.name}</div>
                                <div className="text-[0.65rem] font-bold text-slate-500 font-mono">{item.reference}</div>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-500 hover:text-white transition-all"><X size={16} /></button>
                    </div>

                    {/* Stock Level Badge */}
                    <div className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-bold ${levelCls}`}>
                        <div className={`size-2 rounded-full ${dotCls}`} />
                        Stock actuel : <span className="font-black">{item.quantity} {item.unit || 'u.'}</span>
                        {item.quantity <= 5 && <span className="ml-auto">⚠️ Critique</span>}
                    </div>

                    {/* Quantity stepper & submit */}
                    {!result && (
                        <>
                            <div className="space-y-2">
                                <label className="text-[0.6rem] font-black text-slate-500 uppercase tracking-widest">Quantité à commander</label>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => onQtyChange(Math.max(1, qty - 1))} className="size-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-all active:scale-95"><Minus size={16} /></button>
                                    <input type="number" min={1} value={qty} onChange={e => onQtyChange(Math.max(1, parseInt(e.target.value) || 1))} className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-center text-xl font-black text-white focus:outline-none focus:border-blue-500 transition-all" />
                                    <button onClick={() => onQtyChange(qty + 1)} className="size-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-all active:scale-95"><Plus size={16} /></button>
                                </div>
                                {(item as any).unit_price && (
                                    <div className="text-right text-xs font-bold text-slate-500">
                                        Total estimé : <span className="text-emerald-400 font-black">{((item as any).unit_price * qty).toFixed(3)} TND</span>
                                    </div>
                                )}
                            </div>
                            <button onClick={onOrder} disabled={ordering} className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-3 shadow-lg shadow-blue-600/20 active:scale-[0.98]">
                                {ordering ? <><div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Envoi en cours...</> : <><Send size={16} /> Envoyer la commande SAP</>}
                            </button>
                        </>
                    )}

                    {/* Result Banner */}
                    {result && (
                        <div className={`p-4 rounded-2xl border flex flex-col gap-3 animate-in fade-in duration-300 ${result.status === 'success' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
                            <div className="flex items-center gap-3">
                                {result.status === 'success' ? <CheckCircle2 size={20} className="text-emerald-400 shrink-0" /> : <Clock size={20} className="text-amber-400 shrink-0" />}
                                <div>
                                    <div className={`text-sm font-black ${result.status === 'success' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                        {result.status === 'success' ? 'Commande transmise à SAP !' : 'Enregistrée en attente'}
                                    </div>
                                    <div className="text-xs font-bold text-slate-400 mt-0.5">{result.message}</div>
                                    {result.sap_doc && <div className="text-[0.6rem] font-black text-blue-400 mt-1 uppercase tracking-widest">Réf. SAP : #{result.sap_doc}</div>}
                                </div>
                                <div className="ml-auto">{result.status === 'success' ? <Wifi size={16} className="text-emerald-400" /> : <WifiOff size={16} className="text-amber-400" />}</div>
                            </div>
                            <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-widest transition-all">Fermer</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
