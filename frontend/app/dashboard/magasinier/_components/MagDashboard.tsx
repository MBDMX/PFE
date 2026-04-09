'use client';
import { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, AlertTriangle, Package, Activity } from 'lucide-react';
import { gmaoApi } from '../../../../services/api';

export default function MagDashboard() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await gmaoApi.getMagasinierStats();
                setStats(data);
            } catch (err) {
                console.error("Failed to load magasinier stats", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) return <div className="h-64 flex items-center justify-center text-slate-500 animate-pulse uppercase font-black text-xs tracking-widest text-center">Initialisation du Dashboard Magasin...</div>;

    const cards = [
        { label: 'En attente', value: stats?.pending_requests || 0, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-400/10' },
        { label: 'Validées', value: stats?.approved_requests || 0, icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
        { label: 'Refusées', value: stats?.rejected_requests || 0, icon: XCircle, color: 'text-rose-400', bg: 'bg-rose-400/10' },
        { label: 'Alertes Stock', value: stats?.critical_stock_alerts || 0, icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-400/10' },
        { label: 'Sorties Totales', value: stats?.total_items_out || 0, icon: Package, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {cards.map((card, idx) => (
                    <div key={idx} className="azure-card p-5 group hover:border-white/20 transition-all">
                        <div className="flex items-center gap-3 mb-3">
                            <div className={`size-10 rounded-xl ${card.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                <card.icon size={20} className={card.color} />
                            </div>
                            <div className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest">{card.label}</div>
                        </div>
                        <div className="text-3xl font-black text-white">{card.value}</div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="azure-card p-6">
                    <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
                        <Activity size={18} className="text-blue-400" />
                        <h2 className="text-sm font-black text-white uppercase tracking-widest">Activité Warehouse</h2>
                    </div>
                    <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-400">Taux de service magasin</span>
                            <span className="text-lg font-black text-emerald-400">98.2%</span>
                        </div>
                        <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-400">Temps moyen de validation</span>
                            <span className="text-lg font-black text-blue-400">14 min</span>
                        </div>
                        <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5 flex items-center justify-between text-rose-400">
                            <span className="text-xs font-bold">Ruptures détectées</span>
                            <span className="text-lg font-black">0</span>
                        </div>
                    </div>
                </div>

                <div className="azure-card p-6 border-dashed border-white/10 flex flex-col items-center justify-center text-center gap-4 bg-slate-900/20">
                    <div className="size-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-500">
                        <Package size={32} />
                    </div>
                    <div>
                        <h3 className="font-bold text-white uppercase tracking-widest text-sm">Inventaire RPA</h3>
                        <p className="text-xs text-slate-500 mt-2 max-w-xs font-medium">Synchronisation automatique avec SAP prévue toutes les 4 heures.</p>
                    </div>
                    <button className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[0.65rem] font-bold text-slate-300 uppercase tracking-[0.2em] transition-all">Forcer Sync</button>
                </div>
            </div>
        </div>
    );
}
