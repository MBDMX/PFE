'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft, Wrench, Activity, MapPin,
    TrendingUp, TrendingDown, History, Calendar,
    CheckCircle, Clock, Zap, Brain, ShieldAlert,
    ChevronRight, ExternalLink, BarChart2, Info, FileText, Printer
} from 'lucide-react';
import api, { gmaoApi } from '@/services/api';
import HealthTrendChart from './_components/HealthTrendChart';

export default function MachineDetailsPage() {
    const { id } = useParams();
    const router = useRouter();
    const [machine, setMachine] = useState<any>(null);
    const [orders, setOrders] = useState<any[]>([]);
    const [mlData, setMlData] = useState<any>(null);
    const [modelStats, setModelStats] = useState<any>(null);
    const [financials, setFinancials] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [triggering, setTriggering] = useState(false);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [mList, oRes, mlRes, statsRes, finRes] = await Promise.all([
                gmaoApi.getMachines(),
                gmaoApi.getMachineWorkOrders(Number(id)),
                api.get('/predictive/machine-health'),
                api.get('/predictive/model-stats').catch(() => ({ data: null })),
                gmaoApi.getMachineFinancials(Number(id)).catch(() => ({ data: null }))
            ]);

            setMachine(mList.find((m: any) => m.id === Number(id)));
            setOrders(oRes);
            setMlData(mlRes.data?.data?.find((m: any) => m.id === Number(id)));
            setModelStats(statsRes.data?.model);
            setFinancials(finRes);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    async function handleTriggerMaintenance() {
        if (!machine) return;
        setTriggering(true);
        try {
            const res = await gmaoApi.triggerMaintenance(machine.id);
            // Refresh local data
            await fetchAll();
            const event = new CustomEvent('api:success', { 
                detail: `OT préventif créé avec succès (${res.sap_order_id})` 
            });
            window.dispatchEvent(event);
        } catch (err) {
            console.error('Trigger maintenance failed', err);
            const event = new CustomEvent('api:error', { detail: 'Échec du déclenchement SAP' });
            window.dispatchEvent(event);
        } finally {
            setTriggering(false);
        }
    }

    useEffect(() => {
        if (id) fetchAll();
    }, [id]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-screen gap-4">
            <div className="size-12 rounded-2xl bg-blue-600/10 flex items-center justify-center animate-pulse">
                <Brain size={24} className="text-blue-400" />
            </div>
            <p className="text-slate-500 font-black uppercase tracking-widest text-xs">Analyse de l'équipement en cours...</p>
        </div>
    );

    if (!machine) return <div className="p-10 text-white font-black">Machine introuvable (ID: {id})</div>;

    const score = mlData?.score ?? machine.health_score ?? 100;
    const healthColor = score >= 75 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-rose-400';
    const healthBg = score >= 75 ? 'from-emerald-500/10' : score >= 50 ? 'from-amber-500/10' : 'from-rose-500/10';
    const riskLabel = score >= 75 ? 'LOW RISK' : score >= 50 ? 'MEDIUM RISK' : 'HIGH RISK';
    const riskClass = score >= 75 ? 'bg-emerald-500/20 border-emerald-500/20 text-emerald-400' : score >= 50 ? 'bg-amber-500/20 border-amber-500/20 text-amber-400' : 'bg-rose-500/20 border-rose-500/20 text-rose-400 animate-pulse';

    // ─── ML Date Helper ───
    // Calcule la date d'intervention recommandée par le ML.
    // Logique : Aujourd'hui + (MTBF - jours écoulés depuis dernière panne) - marge sécurité
    // Si le résultat est dans le passé → intervention IMMÉDIATE
    const getMlRecommendedDate = (): { date: Date | null; isOverdue: boolean; daysUntil: number } => {
        if (!mlData?.mtbf_days) return { date: null, isOverdue: false, daysUntil: 0 };

        const lastBreakdown = orders
            .filter((o: any) => o.type === 'breakdown' || o.type === 'corrective')
            .sort((a: any, b: any) => new Date(b.planned_start_date || 0).getTime() - new Date(a.planned_start_date || 0).getTime())[0];

        const now = new Date();
        const mtbf = mlData.mtbf_days;
        const safetyMargin = Math.max(1, Math.round(mtbf * 0.2));

        let daysUntilNextFailure: number;
        if (lastBreakdown?.planned_start_date) {
            const lastDate = new Date(lastBreakdown.planned_start_date);
            const daysSinceLast = (now.getTime() - lastDate.getTime()) / (24 * 3600 * 1000);
            daysUntilNextFailure = mtbf - daysSinceLast; // peut être négatif si en retard
        } else {
            daysUntilNextFailure = mtbf; // Pas de panne connue → MTBF complet
        }

        const daysUntilIntervention = daysUntilNextFailure - safetyMargin;
        const recommendedDate = new Date(now.getTime() + daysUntilIntervention * 24 * 3600 * 1000);
        const isOverdue = daysUntilIntervention <= 0;

        return { date: recommendedDate, isOverdue, daysUntil: Math.round(daysUntilIntervention) };
    };
    const mlDateInfo = getMlRecommendedDate();

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-7xl mx-auto">

            {/* ── Navigation ── */}
            <div className="flex items-center justify-between mb-8">
                <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group">
                    <div className="size-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-blue-600/20 transition-all">
                        <ArrowLeft size={18} />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest">Parc Machines</span>
                </button>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => window.print()}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-blue-600/20 border border-white/10 hover:border-blue-500/30 text-white transition-all group no-print"
                    >
                        <Printer size={16} className="text-blue-400" />
                        <span className="text-[0.65rem] font-black uppercase tracking-widest">Générer Rapport PDF</span>
                    </button>
                    <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-[0.65rem] font-black text-slate-500 uppercase tracking-widest">
                        Réf SAP : {machine.reference}
                    </div>
                </div>
            </div>

            {/* ── Hero Header ── */}
            <div className={`mb-10 p-8 rounded-3xl bg-gradient-to-br ${healthBg} to-transparent border border-white/5 relative overflow-hidden`}>
                <Brain className="absolute -right-8 -top-8 size-48 text-white/3 pointer-events-none" />
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="flex items-center gap-5">
                        <div className="size-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-blue-400 shadow-xl">
                            <Wrench size={30} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-white uppercase tracking-tight">{machine.name}</h1>
                            <div className="flex items-center gap-4 mt-2">
                                <span className="flex items-center gap-1.5 text-slate-500 text-xs font-bold uppercase"><MapPin size={12} />{machine.location}</span>
                                <span className="flex items-center gap-1.5 text-xs font-black uppercase text-slate-400"><Activity size={12} />{machine.status}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-8">
                        <div className="text-center">
                            <div className="text-[0.6rem] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Score Santé IA</div>
                            <div className={`text-6xl font-black ${healthColor}`}>{score}%</div>
                        </div>
                        <div className="flex flex-col gap-2 min-w-[120px]">
                            <div className={`px-4 py-1.5 rounded-full text-[0.65rem] font-black uppercase tracking-widest border text-center ${riskClass}`}>
                                {riskLabel}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main KPIs Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-white/5">
                    {/* MTBF */}
                    <div className="azure-card p-4 bg-blue-500/5 border-blue-500/10">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-[0.6rem] font-black text-slate-500 uppercase tracking-widest">MTBF</div>
                            <span className="text-[0.5rem] font-black px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase">
                                {mlData?.mtbf_days != null ? 'Calculé' : 'N/A'}
                            </span>
                        </div>
                        <div className={`text-xl font-black ${mlData?.mtbf_days != null ? 'text-white' : 'text-slate-600'}`}>
                            {mlData?.mtbf_days != null ? `${mlData.mtbf_days}j` : '—'}
                        </div>
                        <div className="text-[0.55rem] font-bold text-blue-400 uppercase mt-1">Tps moyen entre pannes</div>
                    </div>
                    {/* MTTR */}
                    <div className="azure-card p-4 bg-emerald-500/5 border-emerald-500/10">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-[0.6rem] font-black text-slate-500 uppercase tracking-widest">MTTR</div>
                            <span className="text-[0.5rem] font-black px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                                {mlData?.mttr_hours != null && mlData.mttr_hours > 0 ? 'Réel' : 'Estimé'}
                            </span>
                        </div>
                        <div className={`text-xl font-black ${mlData?.mttr_hours != null && mlData.mttr_hours > 0 ? 'text-white' : 'text-amber-400'}`}>
                            {mlData?.mttr_hours != null && mlData.mttr_hours > 0 ? `${mlData.mttr_hours}h` : '~2.5h'}
                        </div>
                        <div className="text-[0.55rem] font-bold text-emerald-400 uppercase mt-1">Tps moyen de réparation</div>
                    </div>
                    {/* Disponibilité */}
                    <div className="azure-card p-4 bg-amber-500/5 border-amber-500/10">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-[0.6rem] font-black text-slate-500 uppercase tracking-widest">Disponibilité</div>
                            <span className="text-[0.5rem] font-black px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase">Score IA</span>
                        </div>
                        <div className="text-xl font-black text-white">
                            {score >= 90 ? '99.2%' : score >= 70 ? '96.5%' : score >= 50 ? '91.0%' : '84.3%'}
                        </div>
                        <div className="text-[0.55rem] font-bold text-amber-400 uppercase mt-1">Taux de marche estimé</div>
                    </div>
                    {/* Pannes/Mois */}
                    <div className="azure-card p-4 bg-rose-500/5 border-rose-500/10">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-[0.6rem] font-black text-slate-500 uppercase tracking-widest">Pannes/Mois</div>
                            <span className="text-[0.5rem] font-black px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase">30j</span>
                        </div>
                        <div className={`text-xl font-black ${mlData?.failure_rate_30d > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {mlData?.failure_rate_30d ?? 0}
                        </div>
                        <div className="text-[0.55rem] font-bold text-rose-400 uppercase mt-1">Pannes sur 30 derniers jours</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* ── Left Column (2/3) ── */}
                <div className="lg:col-span-2 space-y-8">

                    {/* IA Explanation Table */}
                    <section className="azure-card p-0 overflow-hidden">
                        <div className="p-5 border-b border-white/5 flex items-center justify-between bg-blue-600/5">
                            <div className="flex items-center gap-3">
                                <Brain size={18} className="text-blue-400" />
                                <h2 className="text-sm font-black text-white uppercase tracking-widest">Justification du Score (Explainable AI)</h2>
                            </div>
                            {modelStats?.silhouette_score && (
                                <div className="flex items-center gap-2 text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest border border-white/5 px-3 py-1 rounded-lg bg-white/5">
                                    <Info size={10} className="text-blue-400" />
                                    Silhouette: <span className="text-blue-400 font-black ml-1">{modelStats.silhouette_score}</span>
                                </div>
                            )}
                        </div>
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-900/50">
                                    <th className="p-4 text-[0.55rem] font-black text-slate-500 uppercase tracking-widest">Cas Détecté</th>
                                    <th className="p-4 text-[0.55rem] font-black text-slate-500 uppercase tracking-widest">Mesure</th>
                                    <th className="p-4 text-[0.55rem] font-black text-slate-500 uppercase tracking-widest text-center">Coefficient</th>
                                    <th className="p-4 text-[0.55rem] font-black text-slate-500 uppercase tracking-widest text-right text-rose-500">Impact Score</th>
                                </tr>
                            </thead>
                            <tbody>
                                {mlData?.explanations?.length > 0 ? mlData.explanations.map((exp: any, i: number) => (
                                    <tr key={i} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                                        <td className="p-4 font-bold text-white text-xs uppercase tracking-tight">{exp.case}</td>
                                        <td className="p-4 text-slate-400 text-xs">{exp.metric}</td>
                                        <td className="p-4 text-center">
                                            <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 text-[0.7rem] font-black border border-blue-500/10">{exp.coeff}</span>
                                        </td>
                                        <td className={`p-4 text-right font-black text-sm ${exp.impact === '0%' ? 'text-emerald-400' : 'text-rose-400'}`}>{exp.impact}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center">
                                            <div className="flex flex-col items-center gap-2 text-emerald-400">
                                                <ShieldAlert size={20} className="opacity-50" />
                                                <span className="text-[0.65rem] font-black uppercase tracking-widest">Aucune anomalie — Équipement conforme</span>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </section>

                    {/* Health Trend Chart */}
                    <section className="azure-card p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <BarChart2 size={18} className="text-slate-400" />
                            <h2 className="text-sm font-black text-white uppercase tracking-widest">Évolution Score de Santé — 7 Jours</h2>
                        </div>
                        <HealthTrendChart machineId={Number(id)} />
                    </section>

                    {/* Full History */}
                    <section className="azure-card p-0 overflow-hidden">
                        <div className="p-5 border-b border-white/5 flex items-center gap-3">
                            <History size={18} className="text-slate-400" />
                            <h2 className="text-sm font-black text-white uppercase tracking-widest">Historique Complet des Interventions</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-900/50">
                                        <th className="p-4 text-[0.55rem] font-black text-slate-500 uppercase">Type / ID</th>
                                        <th className="p-4 text-[0.55rem] font-black text-slate-500 uppercase">Titre</th>
                                        <th className="p-4 text-[0.55rem] font-black text-slate-500 uppercase">Date</th>
                                        <th className="p-4 text-[0.55rem] font-black text-slate-500 uppercase text-center">Temps</th>
                                        <th className="p-4 text-[0.55rem] font-black text-slate-500 uppercase">Statut</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.length > 0 ? orders.map((o: any) => (
                                        <tr key={o.id} className="border-t border-white/5 hover:bg-white/5 transition-colors cursor-pointer group" onClick={() => router.push(`/work-orders/${o.id}`)}>
                                            <td className="p-4">
                                                <div className="flex flex-col">
                                                    <span className={`text-[0.6rem] font-black uppercase ${o.type === 'breakdown' || o.type === 'corrective' ? 'text-rose-400' : 'text-blue-400'}`}>{o.type}</span>
                                                    <span className="text-[0.55rem] text-slate-500 font-bold">#{o.sap_order_id || o.id}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 font-bold text-white text-xs group-hover:text-blue-400 transition-colors">{o.title}</td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2 text-slate-400 text-xs font-bold">
                                                    <Calendar size={14} className="text-blue-500/50" />
                                                    {o.planned_start_date ? (() => {
                                                        const d = o.planned_start_date;
                                                        if (d.startsWith('0001') || d.includes('1899') || d.includes('Date(-')) return '—';
                                                        
                                                        // Tenter de parser
                                                        let dateObj = new Date(d);
                                                        
                                                        // Si ça échoue, c'est peut-être le format SAP (DD.MM.YYYY)
                                                        if (isNaN(dateObj.getTime()) && d.includes('.')) {
                                                            const parts = d.split('.');
                                                            if (parts.length === 3) dateObj = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                                                        }
                                                        
                                                        return !isNaN(dateObj.getTime()) 
                                                            ? dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) 
                                                            : '—';
                                                    })() : '—'}
                                                </div>
                                            </td>
                                            <td className="p-4 text-center text-slate-500 text-xs font-black">{o.time_spent != null ? Number(o.time_spent).toFixed(2) : '—'}h</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-0.5 rounded-md text-[0.55rem] font-black uppercase ${o.status === 'done' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                                    {o.status}
                                                </span>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={5} className="p-10 text-center text-slate-500 text-xs font-bold italic uppercase tracking-widest">Aucune intervention enregistrée</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>

                {/* ── Right Column (1/3) ── */}
                <div className="space-y-6">

                    {/* KPIs */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="azure-card p-5 bg-blue-500/5 text-center col-span-2 border-blue-500/10">
                            <div className="text-[0.6rem] font-black text-blue-400 uppercase tracking-widest mb-2 flex items-center justify-center gap-2">
                                <Zap size={12} /> Panne la plus fréquente (SAP)
                            </div>
                            <div className="text-xl font-black text-white truncate px-2">
                                {mlData?.most_frequent_failure || "N/A"}
                            </div>
                            <div className="text-[0.55rem] font-bold text-slate-500 uppercase mt-1">
                                Occurrences : <span className="text-blue-400">{mlData?.failure_frequency || 0} fois</span>
                            </div>
                        </div>
                        <div className="azure-card p-5 bg-slate-500/5 text-center">
                            <div className="text-3xl font-black text-white">{orders.length}</div>
                            <div className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest mt-1">Interventions</div>
                        </div>
                        <div className="azure-card p-5 bg-emerald-500/5 text-center">
                            <div className="text-3xl font-black text-emerald-400">{orders.filter((o: any) => o.status === 'done').length}</div>
                            <div className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest mt-1">Clôturées</div>
                        </div>
                        <div className="azure-card p-5 bg-rose-500/5 text-center">
                            <div className="text-3xl font-black text-rose-400">
                                {orders.filter((o: any) => o.type === 'breakdown' || o.type === 'corrective').length}
                            </div>
                            <div className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest mt-1">Pannes</div>
                        </div>
                        <div className="azure-card p-5 bg-amber-500/5 text-center">
                            <div className="text-3xl font-black text-amber-400">
                                {orders.filter((o: any) => o.status !== 'done').length}
                            </div>
                            <div className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest mt-1">En cours</div>
                        </div>
                    </div>

                    {/* Model Stats Block */}
                    {modelStats && (
                        <section className="azure-card p-5 bg-blue-600/5 border-blue-500/20">
                            <div className="flex items-center gap-3 mb-5">
                                <Brain size={16} className="text-blue-400" />
                                <h3 className="text-xs font-black text-white uppercase tracking-widest">Métriques du Modèle</h3>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center py-2 border-b border-white/5">
                                    <span className="text-[0.6rem] font-bold text-slate-500 uppercase">Algorithme</span>
                                    <span className="text-[0.65rem] font-black text-blue-400">Isolation Forest</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-white/5">
                                    <span className="text-[0.6rem] font-bold text-slate-500 uppercase">Silhouette Score</span>
                                    <span className={`text-xs font-black ${modelStats.silhouette_score > 0.5 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                        {modelStats.silhouette_score ?? 'N/A'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-white/5">
                                    <span className="text-[0.6rem] font-bold text-slate-500 uppercase">Échantillons</span>
                                    <span className="text-xs font-black text-white">{modelStats.training_samples}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-white/5">
                                    <span className="text-[0.6rem] font-bold text-slate-500 uppercase">N° Estimateurs</span>
                                    <span className="text-xs font-black text-white">{modelStats.n_estimators}</span>
                                </div>
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-[0.6rem] font-bold text-slate-500 uppercase">Dernier entraîn.</span>
                                    <span className="text-[0.6rem] font-black text-white">
                                        {modelStats.last_trained_at
                                            ? new Date(modelStats.last_trained_at).toLocaleTimeString('fr-FR')
                                            : '—'}
                                    </span>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Preventive Plan */}
                    <section className="azure-card p-5 bg-violet-600/5 border-violet-500/20">
                        <div className="flex items-center gap-3 mb-5">
                            <Calendar size={16} className="text-violet-400" />
                            <h3 className="text-xs font-black text-white uppercase tracking-widest">Plan de Maintenance</h3>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center p-3 rounded-xl bg-white/5">
                                <span className="text-[0.6rem] font-bold text-slate-500 uppercase">Fréquence</span>
                                <span className="text-xs font-black text-white">/ {machine.maintenance_frequency_days || 90}j</span>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-xl bg-white/5">
                                <span className="text-[0.6rem] font-bold text-slate-500 uppercase">Dernière</span>
                                <span className="text-xs font-black text-white">{machine.last_maintenance_date || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-xl bg-violet-600/10 border border-violet-500/20">
                                <span className="text-[0.6rem] font-black text-violet-400 uppercase">Prochaine (SAP)</span>
                                <span className="text-xs font-black text-white">{machine.next_maintenance_date || 'Non planifiée'}</span>
                            </div>
                            {/* ML Predicted Date */}
                            {mlData?.mtbf_days != null && (
                                <>
                                    <div className={`flex justify-between items-center p-3 rounded-xl border ${
                                        mlDateInfo.isOverdue
                                            ? 'bg-rose-600/10 border-rose-500/30'
                                            : mlDateInfo.daysUntil <= 3
                                                ? 'bg-amber-600/10 border-amber-500/30'
                                                : 'bg-blue-600/10 border-blue-500/20'
                                    }`}>
                                        <span className={`text-[0.6rem] font-black uppercase flex items-center gap-1.5 ${
                                            mlDateInfo.isOverdue ? 'text-rose-400' : mlDateInfo.daysUntil <= 3 ? 'text-amber-400' : 'text-blue-400'
                                        }`}>
                                            <Brain size={10} /> Suggestion ML
                                        </span>
                                        <span className={`text-xs font-black ${
                                            mlDateInfo.isOverdue ? 'text-rose-300 animate-pulse' : mlDateInfo.daysUntil <= 3 ? 'text-amber-300' : 'text-blue-300'
                                        }`}>
                                            {mlDateInfo.isOverdue
                                                ? '⚠️ IMMÉDIATE'
                                                : mlDateInfo.date?.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </span>
                                    </div>
                                    {(score < 50 || mlDateInfo.isOverdue) && (
                                        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 animate-pulse">
                                            <ShieldAlert size={14} className="text-rose-400 shrink-0" />
                                            <span className="text-[0.6rem] font-black text-rose-400 uppercase">
                                                {mlDateInfo.isOverdue
                                                    ? `En retard de ${Math.abs(mlDateInfo.daysUntil)}j — Intervenir maintenant`
                                                    : 'Intervention immédiate recommandée'
                                                }
                                            </span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </section>

                        {/* Coûts de Maintenance */}
                        {financials && (
                            <div className="mt-6 p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 shadow-2xl shadow-emerald-500/5">
                                <div className="flex items-center gap-2 mb-3">
                                    <BarChart2 size={16} className="text-emerald-400" />
                                    <h3 className="text-[0.65rem] font-black text-white uppercase tracking-widest">Analyse Financière SAP</h3>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-black text-white">{financials.total_maintenance_cost}</span>
                                    <span className="text-[0.6rem] font-bold text-emerald-400 uppercase tracking-widest">{financials.currency}</span>
                                </div>
                                <div className="text-[0.55rem] font-bold text-slate-500 uppercase mt-1">
                                    Estimation : {financials.total_parts_used} pièces consommées
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="mt-4 space-y-2">
                            {/* Button 1: SAP PREVENTIVE */}
                            <button 
                                onClick={handleTriggerMaintenance}
                                disabled={triggering}
                                className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-black uppercase text-[0.65rem] tracking-widest transition-all flex items-center justify-center gap-2"
                            >
                                <Zap size={14} className={triggering ? 'animate-spin' : ''} /> 
                                {triggering ? 'Synchronisation SAP...' : 'Déclencher Prévention SAP'}
                            </button>

                            {/* Button 2: ML Suggestion */}
                            {mlData?.mtbf_days != null && (
                                <button
                                    onClick={async () => {
                                        const targetDate = mlDateInfo.isOverdue || !mlDateInfo.date ? new Date() : mlDateInfo.date;
                                        const dateStr = targetDate.toISOString().split('T')[0];
                                        try {
                                            await gmaoApi.createWorkOrder({
                                                title: `[ML] Maintenance Prédictive — ${machine.name}`,
                                                type: 'preventive',
                                                priority: (score < 50 || mlDateInfo.isOverdue) ? 'high' : 'medium',
                                                equipment_id: String(machine.id),
                                                planned_start_date: dateStr,
                                                description: `Intervention suggérée par l'algorithme ML. MTBF: ${mlData.mtbf_days}j | Score: ${score}%`
                                            });
                                            window.dispatchEvent(new CustomEvent('api:success', { detail: 'OT Prédictif créé' }));
                                            await fetchAll();
                                        } catch (err) {
                                            window.dispatchEvent(new CustomEvent('api:error', { detail: 'Erreur création OT' }));
                                        }
                                    }}
                                    className={`w-full py-3 rounded-xl border font-black uppercase text-[0.65rem] tracking-widest transition-all flex items-center justify-center gap-2 ${
                                        mlDateInfo.isOverdue
                                            ? 'bg-rose-600/20 hover:bg-rose-600/40 border-rose-500/30 text-rose-300'
                                            : 'bg-blue-600/20 hover:bg-blue-600/40 border-blue-500/30 text-blue-300'
                                    }`}
                                >
                                    <Brain size={14} />
                                    {mlDateInfo.isOverdue ? 'Urgence : Appliquer Correction ML' : 'Suivre Suggestion IA'}
                                </button>
                            )}

                            {/* Button 3: Transfert de Stock */}
                            <button
                                onClick={async () => {
                                    const item_code = window.prompt("Référence de la pièce à transférer :", "");
                                    if (!item_code) return;
                                    const qtyStr = window.prompt("Quantité :", "1");
                                    if (!qtyStr) return;
                                    const quantity = parseFloat(qtyStr);
                                    if (isNaN(quantity)) return;
                                    
                                    try {
                                        await gmaoApi.transferStock({
                                            item_code,
                                            quantity,
                                            from_wh: "01",
                                            to_wh: "02"
                                        });
                                        window.dispatchEvent(new CustomEvent('api:success', { detail: 'Transfert SAP réussi !' }));
                                    } catch (err) {
                                        window.dispatchEvent(new CustomEvent('api:error', { detail: 'Échec du transfert SAP' }));
                                    }
                                }}
                                className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-black uppercase text-[0.65rem] tracking-widest transition-all flex items-center justify-center gap-2"
                            >
                                <History size={14} />
                                Transfert de Pièces (Inter-Dépôts)
                            </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
