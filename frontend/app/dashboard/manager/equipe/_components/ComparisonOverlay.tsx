'use client';

import { useState, useEffect } from 'react';
import { 
    X, Zap, Trophy, Clock, CheckCircle2, 
    AlertTriangle, TrendingUp, BarChart2, User
} from 'lucide-react';
import { gmaoApi } from '../../../../../services/api';

interface Technician {
    id: number;
    username: string;
    name: string;
    email: string;
}

interface TechStats {
    totalAssigned: number;
    doneOT: number;
    openOT: number;
    inProgressOT: number;
    overdueOT: number;
    completionRate: number;
    avgRepairTime: number;
}

interface ComparisonOverlayProps {
    technicians: Technician[];
    tech1: Technician;
    onClose: () => void;
}

function StatBar({ label, val1, val2, max, suffix = '', reverse = false, color1 = 'bg-violet-500', color2 = 'bg-blue-500' }: {
    label: string; val1: number; val2: number; max: number;
    suffix?: string; reverse?: boolean; color1?: string; color2?: string;
}) {
    const pct1 = max > 0 ? Math.round((val1 / max) * 100) : 0;
    const pct2 = max > 0 ? Math.round((val2 / max) * 100) : 0;
    const diff = val1 - val2;
    const winner = diff === 0 ? null : (reverse ? diff < 0 : diff > 0) ? 'A' : 'B';

    return (
        <div className="py-4 border-b border-white/5 last:border-0">
            <div className="flex items-center justify-between mb-3">
                <span className="text-[0.65rem] font-black text-slate-500 uppercase tracking-widest">{label}</span>
                {winner && (
                    <span className={`text-[0.6rem] font-black px-2 py-0.5 rounded-full ${winner === 'A' ? 'bg-violet-500/20 text-violet-400' : 'bg-blue-500/20 text-blue-400'}`}>
                        {winner === 'A' ? 'Tech A gagne' : 'Tech B gagne'}
                    </span>
                )}
                {!winner && <span className="text-[0.6rem] font-black text-slate-600 px-2 py-0.5 rounded-full bg-white/5">Égalité</span>}
            </div>
            <div className="space-y-1.5">
                <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-white w-8 text-right">{val1}{suffix}</span>
                    <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full ${color1} rounded-full transition-all duration-1000`} style={{ width: `${pct1}%` }} />
                    </div>
                    <span className="text-[0.6rem] font-bold text-slate-600 w-10">A</span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-white w-8 text-right">{val2}{suffix}</span>
                    <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full ${color2} rounded-full transition-all duration-1000`} style={{ width: `${pct2}%` }} />
                    </div>
                    <span className="text-[0.6rem] font-bold text-slate-600 w-10">B</span>
                </div>
            </div>
        </div>
    );
}

function TechCard({ tech, stats, color, label }: { tech: Technician; stats: TechStats | null; color: string; label: string }) {
    return (
        <div className={`azure-card p-6 border ${color === 'violet' ? 'border-violet-500/20 bg-violet-600/5' : 'border-blue-500/20 bg-blue-600/5'}`}>
            <div className="flex items-center gap-4 mb-6">
                <div className={`size-14 rounded-2xl flex items-center justify-center font-black text-white text-xl shadow-lg ${color === 'violet' ? 'bg-gradient-to-br from-violet-600 to-purple-700 shadow-violet-500/30' : 'bg-gradient-to-br from-blue-600 to-indigo-700 shadow-blue-500/30'}`}>
                    {tech.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                    <div className="text-base font-black text-white">{tech.name}</div>
                    <div className={`text-[0.6rem] font-black uppercase tracking-widest ${color === 'violet' ? 'text-violet-400' : 'text-blue-400'}`}>Technicien {label}</div>
                    <div className="text-[0.6rem] text-slate-600 mt-0.5">@{tech.username}</div>
                </div>
            </div>
            {stats ? (
                <div className="grid grid-cols-2 gap-2">
                    {[
                        { label: 'Taux réussite', val: `${stats.completionRate}%`, icon: CheckCircle2, good: stats.completionRate >= 70 },
                        { label: 'Total OT', val: stats.totalAssigned, icon: BarChart2, good: true },
                        { label: 'OT terminés', val: stats.doneOT, icon: TrendingUp, good: true },
                        { label: 'En retard', val: stats.overdueOT, icon: AlertTriangle, good: stats.overdueOT === 0 },
                        { label: 'En cours', val: stats.inProgressOT, icon: Clock, good: true },
                        { label: 'Temps moy.', val: `${stats.avgRepairTime}h`, icon: Clock, good: stats.avgRepairTime < 4 },
                    ].map((kpi, i) => (
                        <div key={i} className="p-3 bg-white/[0.03] rounded-xl border border-white/5 flex flex-col gap-1">
                            <span className="text-[0.55rem] font-bold text-slate-500 uppercase tracking-widest">{kpi.label}</span>
                            <span className={`text-sm font-black ${kpi.good ? (color === 'violet' ? 'text-violet-300' : 'text-blue-300') : 'text-rose-400'}`}>{kpi.val}</span>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="h-32 flex items-center justify-center">
                    <div className="size-8 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
                </div>
            )}
        </div>
    );
}

export default function ComparisonOverlay({ technicians, tech1, onClose }: ComparisonOverlayProps) {
    const [stats1, setStats1] = useState<TechStats | null>(null);
    const [stats2, setStats2] = useState<TechStats | null>(null);
    const [tech2, setTech2] = useState<Technician | null>(null);
    const [loading2, setLoading2] = useState(false);

    useEffect(() => {
        gmaoApi.getTechnicianStats(tech1.id).then(setStats1);
    }, [tech1.id]);

    useEffect(() => {
        if (tech2) {
            setLoading2(true);
            gmaoApi.getTechnicianStats(tech2.id).then(setStats2).finally(() => setLoading2(false));
        } else {
            setStats2(null);
        }
    }, [tech2]);

    const otherTechs = technicians.filter(t => t.id !== tech1.id);

    // Calcul du score global pour déterminer le gagnant
    const winner = stats1 && stats2 ? (() => {
        let scoreA = 0, scoreB = 0;
        if (stats1.completionRate > stats2.completionRate) scoreA++; else if (stats2.completionRate > stats1.completionRate) scoreB++;
        if (stats1.avgRepairTime < stats2.avgRepairTime) scoreA++; else if (stats2.avgRepairTime < stats1.avgRepairTime) scoreB++;
        if (stats1.overdueOT < stats2.overdueOT) scoreA++; else if (stats2.overdueOT < stats1.overdueOT) scoreB++;
        if (stats1.doneOT > stats2.doneOT) scoreA++; else if (stats2.doneOT > stats1.doneOT) scoreB++;
        return scoreA > scoreB ? 'A' : scoreB > scoreA ? 'B' : 'TIE';
    })() : null;

    const maxVal = (a: number, b: number) => Math.max(a, b, 1);

    return (
        <div className="fixed inset-0 z-[200] bg-slate-950/98 backdrop-blur-3xl animate-in fade-in duration-300 overflow-y-auto">
            <div className="max-w-5xl mx-auto p-6 lg:p-12">

                {/* Header */}
                <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-4">
                        <div className="size-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                            <Zap className="text-amber-400 fill-amber-400" size={22} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-tight">Comparaison Techniciens</h2>
                            <p className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest">Analyse Performance · Données Temps Réel</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="size-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all">
                        <X size={18} />
                    </button>
                </div>

                {/* Winner Banner */}
                {winner && winner !== 'TIE' && (
                    <div className={`mb-8 p-4 rounded-2xl border flex items-center gap-4 ${winner === 'A' ? 'bg-violet-500/10 border-violet-500/20' : 'bg-blue-500/10 border-blue-500/20'}`}>
                        <Trophy size={24} className={winner === 'A' ? 'text-violet-400' : 'text-blue-400'} />
                        <div>
                            <div className={`text-sm font-black uppercase ${winner === 'A' ? 'text-violet-300' : 'text-blue-300'}`}>
                                🏆 {winner === 'A' ? tech1.name : tech2?.name} — Technicien le plus performant
                            </div>
                            <div className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Basé sur taux de réussite, délais, et volume d'intervention</div>
                        </div>
                    </div>
                )}
                {winner === 'TIE' && (
                    <div className="mb-8 p-4 rounded-2xl border border-white/10 bg-white/5 flex items-center gap-4">
                        <Trophy size={24} className="text-amber-400" />
                        <div className="text-sm font-black text-amber-300 uppercase">Performances égales — Match nul !</div>
                    </div>
                )}

                {/* Tech Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <TechCard tech={tech1} stats={stats1} color="violet" label="A" />

                    {!tech2 ? (
                        <div className="azure-card p-6 border-2 border-dashed border-white/10 bg-white/[0.02]">
                            <div className="flex items-center gap-3 mb-6">
                                <User size={16} className="text-slate-500" />
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Choisir un technicien à comparer</h3>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {otherTechs.map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => setTech2(t)}
                                        className="p-4 rounded-xl bg-white/5 border border-white/5 text-sm font-bold hover:bg-blue-600/20 hover:border-blue-500/50 transition-all text-left flex items-center gap-3"
                                    >
                                        <div className="size-8 rounded-xl bg-blue-600/20 border border-blue-500/20 flex items-center justify-center text-blue-400 font-black text-sm">
                                            {t.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="text-white">{t.name}</div>
                                            <div className="text-[0.6rem] text-slate-500">@{t.username}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="relative">
                            <TechCard tech={tech2} stats={stats2} color="blue" label="B" />
                            <button onClick={() => setTech2(null)} className="absolute top-4 right-4 size-7 rounded-lg bg-white/10 flex items-center justify-center hover:bg-rose-500/20 transition-all">
                                <X size={12} className="text-slate-400" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Detailed Comparison Bars */}
                {stats1 && stats2 && (
                    <div className="azure-card p-6 border-white/10">
                        <div className="flex items-center gap-3 mb-6">
                            <BarChart2 size={16} className="text-slate-400" />
                            <h3 className="text-xs font-black text-white uppercase tracking-widest">Analyse Comparative Détaillée</h3>
                        </div>
                        <StatBar label="Taux de Réussite" val1={stats1.completionRate} val2={stats2.completionRate} max={100} suffix="%" />
                        <StatBar label="OT Terminés" val1={stats1.doneOT} val2={stats2.doneOT} max={maxVal(stats1.doneOT, stats2.doneOT)} />
                        <StatBar label="OT En Retard" val1={stats1.overdueOT} val2={stats2.overdueOT} max={maxVal(stats1.overdueOT, stats2.overdueOT)} reverse color1="bg-rose-500" color2="bg-rose-400" />
                        <StatBar label="Temps Moyen / Intervention" val1={stats1.avgRepairTime} val2={stats2.avgRepairTime} max={maxVal(stats1.avgRepairTime, stats2.avgRepairTime)} suffix="h" reverse color1="bg-amber-500" color2="bg-amber-400" />
                        <StatBar label="Total Interventions" val1={stats1.totalAssigned} val2={stats2.totalAssigned} max={maxVal(stats1.totalAssigned, stats2.totalAssigned)} />
                    </div>
                )}

                <div className="mt-6 text-center">
                    <p className="text-[0.6rem] font-bold text-slate-700 uppercase tracking-[0.3em]">
                        GMAO PRO · Analyse Performance Techniciens · Données en Temps Réel
                    </p>
                </div>
            </div>
        </div>
    );
}
