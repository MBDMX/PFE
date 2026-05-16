import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { gmaoApi } from '../../../../services/api';
import { useToast } from '../../../../components/ui/toast';

interface Props {
    order: any;
    stockItems: any[];
}

export default function PartRequests({ order, stockItems }: Props) {
    const [showAddPart, setShowAddPart] = useState(false);
    const [newPart, setNewPart] = useState({ code: '', qty: 1 });
    const { success, error } = useToast();

    const handleAddPart = async () => {
        if (!newPart.code || newPart.qty < 1) return;
        try {
            await gmaoApi.addWorkOrderPart(order.id, { part_code: newPart.code, quantity: newPart.qty });
            setShowAddPart(false);
            setNewPart({ code: '', qty: 1 });
            success('Demande envoyée au magasinier ⏳');
        } catch (err: any) {
            error(err?.response?.data?.detail || "Erreur lors de l'ajout de la pièce");
        }
    };

    return (
        <>
            {/* Parts Requests List */}
            {order.parts_requests && order.parts_requests.length > 0 && (
                <div className="mt-8 pt-8 border-t border-white/5">
                    <h3 className="text-[0.7rem] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Demandes de Pièces</h3>
                    <div className="space-y-3">
                        {order.parts_requests.map((req: any) => (
                            <div key={req.id} className="p-4 rounded-2xl bg-white/5 border border-white/10">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[0.6rem] font-black text-slate-500 uppercase">Demande #{req.id}</span>
                                    <div className={`px-2 py-1 rounded text-[0.6rem] font-black uppercase tracking-widest ${req.status === 'pending' ? 'bg-amber-500/20 text-amber-500' : req.status === 'approved' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'}`}>
                                        {req.status === 'pending' ? 'En attente' : req.status === 'approved' ? 'Approuvée' : 'Refusée'}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    {req.items.map((item: any) => (
                                        <div key={item.id} className="flex justify-between items-center text-xs">
                                            <span className="text-slate-300 font-bold">{item.part_name}</span>
                                            <span className="text-slate-500 font-black">x{item.quantity_requested}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Consumed Parts */}
            {order.parts && order.parts.length > 0 && (
                <div className="mt-8 pt-8 border-t border-white/5">
                    <h3 className="text-[0.7rem] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Pièces de rechange consommées</h3>
                    <div className="space-y-2">
                        {order.parts.map((p: any) => (
                            <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="size-8 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-400 border border-blue-500/20 font-black text-[0.6rem] shrink-0">{p.part_code}</div>
                                    <div>
                                        <div className="text-sm font-bold text-white">{p.part_name}</div>
                                        <div className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                                            {p.unit_price_at_consumption ? `${p.unit_price_at_consumption.toFixed(3)} TND / Unité` : '0.000 TND / Unité'}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-black text-emerald-400">{((p.unit_price_at_consumption || 0) * p.quantity).toFixed(3)} TND</div>
                                    <div className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Qté : {p.quantity}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 p-4 rounded-xl bg-slate-900/60 border border-white/5 flex justify-between items-center">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Coût Matériel Total</span>
                        <span className="text-xl font-black text-emerald-400">
                            {order.parts.reduce((sum: number, p: any) => sum + (p.quantity * (p.unit_price_at_consumption || 0)), 0).toFixed(3)} TND
                        </span>
                    </div>
                </div>
            )}

            {/* Add Part Form */}
            <div className="mt-6 pt-6 border-t border-white/5">
                {!showAddPart ? (
                    <button onClick={() => setShowAddPart(true)} className="w-full py-3 rounded-xl border border-dashed border-white/10 text-slate-500 hover:text-blue-400 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2">
                        <Plus size={14} /> Demander une pièce (approbation requise)
                    </button>
                ) : (
                    <div className="azure-card p-4 bg-slate-950/30 space-y-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[0.6rem] font-black text-amber-400 uppercase tracking-widest">Demande de Pièce ⏳ Approbation Magasinier</span>
                            <button onClick={() => setShowAddPart(false)}><X size={14} className="text-slate-500" /></button>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-2">
                                <select value={newPart.code} onChange={e => setNewPart({ ...newPart, code: e.target.value })} className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-xs font-bold text-white focus:outline-none focus:border-blue-500">
                                    <option value="">Sélectionner une pièce...</option>
                                    {stockItems.map(item => (
                                        <option key={item.id} value={item.reference}>{item.name} ({item.quantity} dispo)</option>
                                    ))}
                                </select>
                            </div>
                            <input type="number" min="1" value={newPart.qty} onChange={e => setNewPart({ ...newPart, qty: Number(e.target.value) })} className="bg-slate-900 border border-white/10 rounded-lg p-2 text-xs font-bold text-white focus:outline-none focus:border-blue-500" placeholder="Qté" />
                        </div>
                        <button onClick={handleAddPart} className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-black text-[0.65rem] uppercase tracking-widest transition-all">
                            Envoyer la demande au magasinier
                        </button>
                    </div>
                )}
            </div>

            {/* Work Log */}
            <div className="mt-8 pt-8 border-t border-white/5">
                <h3 className="text-[0.7rem] font-bold text-slate-500 uppercase tracking-widest mb-3">Notes & Travaux (Work Log)</h3>
                <div className="p-4 rounded-xl bg-slate-900/50 text-xs italic text-slate-400 leading-relaxed border border-white/5">
                    {order.work_log || 'Aucune note technique enregistrée pour le moment.'}
                </div>
            </div>
        </>
    );
}
