'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft, Wrench, Activity, AlertCircle, MapPin, 
    TrendingUp, TrendingDown, History, Calendar, 
    CheckCircle, Clock, Zap, Brain, ShieldAlert,
    ChevronRight, ExternalLink
} from 'lucide-react';
import api, { gmaoApi } from '@/services/api';

export default function MachineDetailsPage() {
    const { id } = useParams();
    const router = useRouter();
    const [machine, setMachine] = useState<any>(null);
    const [orders, setOrders] = useState<any[]>([]);
    const [mlData, setMlData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch Machine, Orders and ML data in parallel
                const [mRes, oRes, mlRes] = await Promise.all([
                    gmaoApi.getMachines().then(list => list.find((m: any) => m.id === Number(id))),
                    gmaoApi.getMachineWorkOrders(Number(id)),
                    api.get('/predictive/machine-health')
                ]);

                setMachine(mRes);
                setOrders(oRes);
                
                const machineMl = mlRes.data?.data?.find((m: any) => m.id === Number(id));
                setMlData(machineMl);
            } catch (err) {
                console.error("Error fetching machine details:", err);
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchData();
    }, [id]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-screen space-y-4">
            <div className="animate-spin text-blue-500"><Zap size={40} /></div>
            <p className="text-slate-500 font-black uppercase tracking-widest text-xs">Chargement de l'unité...</p>
        </div>
    );

    if (!machine) return <div className="p-10 text-white font-black">Machine introuvable (ID: {id})</div>;

    const healthColor = mlData?.score > 75 ? 'text-emerald-400' : (mlData?.score > 50 ? 'text-amber-400' : 'text-rose-400');
    const healthBg = mlData?.score > 75 ? 'bg-emerald-500/10' : (mlData?.score > 50 ? 'bg-amber-500/10' : 'bg-rose-500/10');

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            {/* ── Top Navigation ── */}
            <div className="flex items-center justify-between mb-8 px-2">
                <button 
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group"
                >
                    <div className="size-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-blue-600/20 transition-all">
                        <ArrowLeft size={18} />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest">Retour au parc</span>
                </button>
                <div className="flex items-center gap-3">
                    <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-[0.65rem] font-black text-slate-500 uppercase tracking-widest">
                        Source SAP: {machine.reference}
                    </div>
                </div>
            </div>

            {/* ── Header Section ── */}
            <header className="mb-10 px-2 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-4 mb-2">
                        <div className="size-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-lg shadow-blue-500/10">
                            <Wrench size={32} />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-white tracking-tight uppercase">{machine.name}</h1>
                            <div className="flex items-center gap-3 mt-1">
                                <div className="flex items-center gap-1.5 text-slate-500">
                                    <MapPin size={14} />
                                    <span className="text-xs font-bold uppercase tracking-wider">{machine.location}</span>
                                </div>
                                <div className="size-1 bg-slate-700 rounded-full" />
                                <div className={`flex items-center gap-1.5 ${machine.status === 'operational' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    <Activity size={14} />
                                    <span className="text-xs font-black uppercase tracking-widest">{machine.status}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={`p-6 rounded-3xl border border-white/5 flex items-center gap-8 ${healthBg} backdrop-blur-xl relative overflow-hidden group`}>
                    <Brain className="absolute -right-4 -top-4 size-24 text-white/5 -rotate-12 group-hover:scale-110 transition-transform" />
                    <div className="relative z-10 text-center">
                        <div className="text-[0.6rem] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Score Santé IA</div>
                        <div className={`text-5xl font-black ${healthColor}`}>{mlData?.score || machine.health_score}%</div>
                    </div>
                    <div className="h-12 w-px bg-white/10" />
                    <div className="relative z-10">
                        <div className="text-[0.6rem] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Risque Prédit</div>
                        <div className={`px-4 py-1 rounded-full text-[0.65rem] font-black uppercase tracking-widest border ${mlData?.risk === 'High' ? 'bg-rose-500/20 border-rose-500/20 text-rose-400 animate-pulse' : 'bg-emerald-500/20 border-emerald-500/20 text-emerald-400'}`}>
                            {mlData?.risk || 'LOW'} RISK
                        </div>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 px-2">
                
                {/* ── Left Column: Analytics & Plan ── */}
                <div className="lg:col-span-2 space-y-8">
                    
                    {/* IA Analysis Table */}
                    <section className="azure-card p-0 overflow-hidden">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-blue-600/5">
                            <div className="flex items-center gap-3">
                                <Brain size={20} className="text-blue-400" />
                                <h2 className="text-sm font-black text-white uppercase tracking-widest">Justification du Score (Explainable AI)</h2>
                            </div>
                            <div className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest">Pénalités dynamiques</div>
                        </div>
                        <div className="p-0">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-900/50">
                                        <th className="p-4 text-[0.6rem] font-black text-slate-500 uppercase tracking-widest">Cas Détecté</th>
                                        <th className="p-4 text-[0.6rem] font-black text-slate-500 uppercase tracking-widest text-center">Occurrences</th>
                                        <th className="p-4 text-[0.6rem] font-black text-slate-500 uppercase tracking-widest text-center">Coefficient</th>
                                        <th className="p-4 text-[0.6rem] font-black text-slate-500 uppercase tracking-widest text-right text-rose-400">Impact Score</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {mlData?.explanations?.length > 0 ? mlData.explanations.map((exp: any, i: number) => (
                                        <tr key={i} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                                            <td className="p-4 font-bold text-slate-200 text-xs uppercase tracking-tight">{exp.case}</td>
                                            <td className="p-4 text-center">
                                                <span className="px-2 py-0.5 rounded-md bg-white/5 text-[0.7rem] font-black text-blue-400 border border-white/5">{exp.count}</span>
                                            </td>
                                            <td className="p-4 text-center font-black text-slate-400 text-xs italic">{exp.coeff}</td>
                                            <td className="p-4 text-right font-black text-rose-500 text-sm tracking-tighter">{exp.impact}</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={4} className="p-8 text-center text-emerald-400 font-bold uppercase tracking-widest text-[0.65rem]">
                                                <div className="flex flex-col items-center gap-2">
                                                    <ShieldAlert className="opacity-50" />
                                                    Aucune pénalité détectée - Équipement conforme
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Full History Table */}
                    <section className="azure-card p-0 overflow-hidden">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <History size={20} className="text-slate-400" />
                                <h2 className="text-sm font-black text-white uppercase tracking-widest">Historique Complet des Interventions</h2>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-900/50">
                                        <th className="p-4 text-[0.55rem] font-black text-slate-500 uppercase">Type / ID</th>
                                        <th className="p-4 text-[0.55rem] font-black text-slate-500 uppercase">Titre</th>
                                        <th className="p-4 text-[0.55rem] font-black text-slate-500 uppercase">Date</th>
                                        <th className="p-4 text-[0.55rem] font-black text-slate-500 uppercase">Temps Passé</th>
                                        <th className="p-4 text-[0.55rem] font-black text-slate-500 uppercase">Statut</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.map((o: any) => (
                                        <tr key={o.id} className="border-t border-white/5 hover:bg-white/5 transition-colors cursor-pointer" onClick={() => router.push(`/work-orders/${o.id}`)}>
                                            <td className="p-4">
                                                <div className="flex flex-col">
                                                    <span className={`text-[0.6rem] font-black uppercase ${o.type === 'breakdown' ? 'text-rose-400' : 'text-blue-400'}`}>{o.type}</span>
                                                    <span className="text-[0.55rem] text-slate-500 font-bold tracking-widest">#{o.sap_order_id || o.id}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 font-bold text-white text-xs">{o.title}</td>
                                            <td className="p-4 text-slate-400 text-xs font-medium">{o.planned_start_date}</td>
                                            <td className="p-4 text-slate-500 text-xs font-black italic">{o.time_spent || 0}h</td>
                                            <td className="p-4">
                                                <div className={`px-2 py-0.5 rounded-md inline-block text-[0.55rem] font-black uppercase ${o.status === 'done' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                                    {o.status}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>

                {/* ── Right Column: KPIs & Preventive ── */}
                <div className="space-y-8">
                    
                    {/* Machine KPIs */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="azure-card p-6 bg-blue-500/5 text-center">
                            <div className="text-3xl font-black text-white">{orders.length}</div>
                            <div className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest mt-1">Total Interventions</div>
                        </div>
                        <div className="azure-card p-6 bg-emerald-500/5 text-center">
                            <div className="text-3xl font-black text-white">{orders.filter(o => o.status === 'done').length}</div>
                            <div className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest mt-1">Clôturées (Done)</div>
                        </div>
                    </div>

                    {/* Preventive Maintenance Plan */}
                    <section className="azure-card p-6 bg-violet-600/5 border-violet-500/20">
                        <div className="flex items-center gap-3 mb-6">
                            <Calendar size={20} className="text-violet-400" />
                            <h2 className="text-sm font-black text-white uppercase tracking-widest">Plan de Maintenance</h2>
                        </div>
                        
                        <div className="space-y-6">
                            <div className="flex justify-between items-center p-3 rounded-2xl bg-white/5 border border-white/5">
                                <div className="flex items-center gap-3">
                                    <Clock size={16} className="text-slate-500" />
                                    <span className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest">Fréquence</span>
                                </div>
                                <span className="font-black text-white text-xs uppercase tracking-tight">Tous les {machine.maintenance_frequency_days || 90}j</span>
                            </div>

                            <div className="flex justify-between items-center p-3 rounded-2xl bg-white/5 border border-white/5">
                                <div className="flex items-center gap-3">
                                    <Clock size={16} className="text-slate-500" />
                                    <span className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest">Dernière Maintenance</span>
                                </div>
                                <span className="font-black text-white text-xs">{machine.last_maintenance_date || 'N/A'}</span>
                            </div>

                            <div className="flex justify-between items-center p-4 rounded-2xl bg-violet-600/10 border border-violet-500/20 shadow-inner">
                                <div className="flex items-center gap-3">
                                    <Calendar size={18} className="text-violet-400" />
                                    <span className="text-[0.65rem] font-black text-violet-400 uppercase tracking-widest">Prochaine Date</span>
                                </div>
                                <span className="font-black text-white text-sm">{machine.next_maintenance_date || 'Non planifiée'}</span>
                            </div>

                            <button className="w-full py-4 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-black uppercase text-xs tracking-widest transition-all shadow-lg shadow-violet-600/20 flex items-center justify-center gap-2">
                                <Zap size={16} /> Déclencher Prévention
                            </button>
                        </div>
                    </section>

                    {/* Reliability Indicators */}
                    <section className="azure-card p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <TrendingUp size={20} className="text-emerald-400" />
                            <h2 className="text-sm font-black text-white uppercase tracking-widest">Indicateurs Fiabilité</h2>
                        </div>
                        <div className="space-y-4">
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between text-[0.6rem] font-bold uppercase tracking-widest text-slate-500">
                                    <span>Ratio Disponibilité</span>
                                    <span className="text-white">94%</span>
                                </div>
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 w-[94%]" />
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between text-[0.6rem] font-bold uppercase tracking-widest text-slate-500">
                                    <span>Taux de Panne</span>
                                    <span className="text-rose-400">Low (Stable)</span>
                                </div>
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 w-[15%]" />
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
