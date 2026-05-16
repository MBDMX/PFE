'use client';
import { useState, useEffect } from 'react';
import { ShoppingBag, CheckCircle2, Clock, Package } from 'lucide-react';
import { gmaoApi } from '../../../services/api';

interface Movement {
    id: number;
    part_name: string;
    quantity: number;
    date: string;
    type: string;
    sap_doc?: string;
}

export default function RecentOrdersWidget() {
    const [movements, setMovements] = useState<Movement[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchMovements = async () => {
        try {
            const data = await gmaoApi.get('stock/movements?limit=5');
            // On ne garde que les commandes (type ORDER)
            const orders = (Array.isArray(data) ? data : []).filter((m: any) => m.type === 'ORDER');
            setMovements(orders);
        } catch (err) {
            // Silently ignore — widget just won't show if endpoint fails
            setMovements([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMovements();
        const interval = setInterval(fetchMovements, 10000);
        return () => clearInterval(interval);
    }, []);

    if (loading && movements.length === 0) return <div className="azure-card h-40 animate-pulse" />;
    if (movements.length === 0) return null;

    return (
        <div className="azure-card p-5 space-y-4">
            <div className="flex items-center gap-2 mb-2">
                <div className="size-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                    <ShoppingBag size={16} />
                </div>
                <div>
                    <div className="text-[0.6rem] font-black text-slate-500 uppercase tracking-widest">Traçabilité SAP</div>
                    <div className="text-xs font-black text-white">Dernières Commandes</div>
                </div>
            </div>

            <div className="space-y-3">
                {movements.map((m) => (
                    <div key={m.id} className="group flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/5 transition-all">
                        <div className="flex items-center gap-3">
                            <div className="size-8 rounded-lg bg-slate-800 flex items-center justify-center border border-white/5">
                                <Package size={14} className="text-slate-500" />
                            </div>
                            <div>
                                <div className="text-[0.7rem] font-bold text-white group-hover:text-blue-400 transition-colors uppercase tracking-tight">
                                    {m.part_name}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[0.6rem] font-black text-slate-500 uppercase">Qté: {m.quantity}</span>
                                    <span className="text-slate-700">•</span>
                                    <span className="text-[0.55rem] font-bold text-slate-600 italic">
                                        {new Date(m.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="text-right">
                            {m.sap_doc ? (
                                <div className="flex flex-col items-end gap-1">
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                                        <CheckCircle2 size={10} />
                                        <span className="text-[0.55rem] font-black uppercase tracking-widest">SAP #{m.sap_doc}</span>
                                    </div>
                                    <span className="text-[0.5rem] font-bold text-slate-500 uppercase tracking-tighter">Transféré</span>
                                </div>
                            ) : (
                                <div className="flex flex-col items-end gap-1">
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400">
                                        <Clock size={10} />
                                        <span className="text-[0.55rem] font-black uppercase tracking-widest">En Queue</span>
                                    </div>
                                    <span className="text-[0.5rem] font-bold text-slate-500 uppercase tracking-tighter">Offline</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
