'use client';
import { useState, useEffect } from 'react';
import { Clock, User, ArrowRight, Eye } from 'lucide-react';
import { gmaoApi } from '../../../../services/api';

export default function PendingRequests({ requests: propRequests }: { requests?: any[] }) {
    const [apiRequests, setApiRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(!propRequests);

    const displayRequests = (propRequests || apiRequests).slice(0, 4);

    useEffect(() => {
        if (propRequests) {
            setLoading(false);
            return;
        }
        const fetchRequests = async () => {
            try {
                const data = await gmaoApi.getPartsRequests('pending');
                setApiRequests(data.slice(0, 4));
            } catch (err) {
                console.error("Failed to fetch pending requests", err);
            } finally {
                setLoading(false);
            }
        };
        fetchRequests();
    }, []);

    if (loading) return <div className="h-64 azure-card animate-pulse bg-slate-900/20" />;

    return (
        <div className="azure-card p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
                <div className="flex items-center gap-2">
                    <Clock size={18} className="text-amber-400" />
                    <h2 className="text-sm font-black text-white uppercase tracking-widest">Demandes en Attente</h2>
                </div>
                <div className="size-6 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <span className="text-[0.6rem] font-black text-amber-400">{displayRequests.length}</span>
                </div>
            </div>

            <div className="space-y-4 flex-1">
                {displayRequests.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600 italic text-xs gap-3 py-10">
                        <div className="size-12 rounded-full border border-dashed border-white/10 flex items-center justify-center">
                             <Clock size={18} className="opacity-20" />
                        </div>
                        Aucune demande en attente
                    </div>
                ) : (
                    displayRequests.map((req) => (
                        <div key={req.id} className="group relative">
                            <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity" />
                            <div className="relative p-4 rounded-xl border border-white/5 flex items-start justify-between gap-4">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="text-[0.6rem] font-black text-blue-400 uppercase tracking-[0.1em]">#{req.work_order_sap_id || req.work_order_id}</div>
                                        <div className="w-1 h-1 rounded-full bg-slate-700" />
                                        <div className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-tight line-clamp-1">{req.work_order_title}</div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1.5">
                                            <div className="size-5 rounded-full bg-slate-800 flex items-center justify-center border border-white/5">
                                                <User size={10} className="text-slate-500" />
                                            </div>
                                            <span className="text-[0.65rem] font-bold text-slate-300">{req.requester_name}</span>
                                        </div>
                                        <span className="text-[0.6rem] font-medium text-slate-600 tracking-tighter uppercase">{req.created_at.split(' ')[1]} • {req.items?.length || 0} articles</span>
                                    </div>
                                </div>
                                <button className="size-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-all">
                                    <Eye size={14} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {displayRequests.length > 0 && (
                <button className="mt-6 w-full py-2 flex items-center justify-center gap-2 text-[0.6rem] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors group">
                    Gérer toutes les demandes
                    <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                </button>
            )}
        </div>
    );
}
