'use client';
import { useState, useEffect } from 'react';
import { History, ArrowUpRight, ArrowDownLeft, User, Search, Calendar } from 'lucide-react';
import { gmaoApi } from '../../../../services/api';

interface StockMovement {
    id: number;
    part_code: string;
    part_name: string;
    quantity: number;
    type: string;
    date: string;
    user_id: number;
    user_name: string;
    work_order_id: number | null;
    request_id: number | null;
}

export default function Traceability() {
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const fetchMovements = async () => {
            try {
                const data = await gmaoApi.getStockMovements();
                setMovements(data);
            } catch (err) {
                console.error("Failed to load movements", err);
            } finally {
                setLoading(false);
            }
        };
        fetchMovements();
    }, []);

    const filtered = movements.filter(m => 
        m.part_code.toLowerCase().includes(search.toLowerCase()) ||
        m.part_name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/40 p-3 rounded-2xl border border-white/5">
                <div className="flex items-center gap-2 px-3 text-slate-400">
                    <History size={16} />
                    <span className="text-[0.65rem] font-black uppercase tracking-widest">Journal des Mouvements</span>
                </div>
                <div className="relative group w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={14} />
                    <input type="text" placeholder="Référence ou Désignation..." 
                        value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-blue-500/50 transition-all font-bold placeholder:text-slate-700" />
                </div>
            </div>

            <div className="azure-card overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-white/5 border-b border-white/5">
                        <tr>
                            <th className="px-6 py-4 text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest text-center">Type</th>
                            <th className="px-6 py-4 text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest">Article</th>
                            <th className="px-6 py-4 text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest text-center">Qté</th>
                            <th className="px-6 py-4 text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest">Magasinier</th>
                            <th className="px-6 py-4 text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest">Date & Heure</th>
                            <th className="px-6 py-4 text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest text-right">Origine</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {loading ? (
                            <tr><td colSpan={6} className="px-6 py-10 text-center text-slate-500 italic text-sm">Chargement de l'historique...</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={6} className="px-6 py-10 text-center text-slate-500 italic text-sm">Aucun mouvement enregistré.</td></tr>
                        ) : filtered.map(m => (
                            <tr key={m.id} className="hover:bg-white/5 transition-colors group">
                                <td className="px-6 py-4">
                                     <div className={`size-8 rounded-lg flex items-center justify-center mx-auto ${m.type === 'OUT' ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                        {m.type === 'OUT' ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                                     </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-xs font-black text-white">{m.part_name}</div>
                                    <div className="text-[0.6rem] font-bold text-blue-400 font-mono mt-0.5">{m.part_code}</div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className="text-sm font-black text-white">{m.quantity}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <div className="size-6 rounded-full bg-slate-800 flex items-center justify-center border border-white/5">
                                            <User size={10} className="text-slate-400" />
                                        </div>
                                        <span className="text-xs font-bold text-slate-300">{m.user_name}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 text-slate-500">
                                        <Calendar size={12} />
                                        <span className="text-[0.7rem] font-medium">{m.date}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right font-mono font-bold text-[0.65rem] text-slate-600">
                                    {m.request_id ? `PR #${m.request_id}` : (m.work_order_id ? `OT #${m.work_order_id}` : 'MANUEL')}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
