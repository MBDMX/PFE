'use client';
import React, { useEffect, useState } from 'react';
import { Brain, Activity, AlertTriangle, ChevronRight, Zap } from 'lucide-react';
import api from '../../../../services/api';

interface MLMachineHealth {
    id: number;
    name: string;
    score: number;
    risk: 'High' | 'Medium' | 'Low';
}

interface MLSummary {
    total_monitored: number;
    at_high_risk: number;
    average_fleet_health: number;
}

export default function MLHealthWidget() {
    const [data, setData] = useState<MLMachineHealth[]>([]);
    const [summary, setSummary] = useState<MLSummary | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/predictive/machine-health')
            .then(res => {
                if (res.data?.status === 'success') {
                    setData(res.data.data.slice(0, 5)); // Top 5
                    setSummary(res.data.summary);
                }
            })
            .catch(err => console.error("ML Widget error:", err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="azure-card h-[350px] animate-pulse bg-white/5" />;

    return (
        <div className="azure-card p-6 flex flex-col h-full bg-slate-900/40 relative overflow-hidden group">
            {/* Background Icon Decor - Subtile décoration en arrière-plan */}
            <Brain className="absolute -right-6 -top-6 size-24 text-blue-500/5 -rotate-12 group-hover:scale-110 transition-transform duration-700 pointer-events-none opacity-20" />
            
            <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-400 border border-blue-500/20 shadow-lg shadow-blue-500/10">
                        <Brain size={20} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-widest leading-none">Analyse Prédictive</h3>
                        <p className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest mt-1">Machine Learning Engine</p>
                    </div>
                </div>
                {summary && summary.at_high_risk > 0 && (
                    <div className="flex items-center gap-2 bg-rose-500/20 text-rose-400 px-3 py-1 rounded-lg border border-rose-500/20 animate-pulse">
                        <AlertTriangle size={12} />
                        <span className="text-[0.65rem] font-black uppercase tracking-widest">{summary.at_high_risk} Risques</span>
                    </div>
                )}
            </div>

            {/* Fleet Health Summary */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
                    <div className="text-[0.55rem] font-black text-slate-500 uppercase tracking-widest mb-1">Santé Flotte</div>
                    <div className="flex items-end gap-2">
                        <div className="text-xl font-black text-white">{summary?.average_fleet_health}%</div>
                        <Activity size={14} className={summary && summary.average_fleet_health > 70 ? 'text-emerald-400' : 'text-amber-400'} />
                    </div>
                </div>
                <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
                    <div className="text-[0.55rem] font-black text-slate-500 uppercase tracking-widest mb-1">Monitored</div>
                    <div className="text-xl font-black text-blue-400">{summary?.total_monitored} Machines</div>
                </div>
            </div>

            {/* Top Critical Machines */}
            <div className="flex-1 space-y-3 relative z-10 overflow-y-auto pr-1 scrollbar-hide">
                <div className="text-[0.6rem] font-black text-slate-600 uppercase tracking-[0.2em] mb-4">Équipements les plus instables</div>
                
                {data.sort((a,b) => a.score - b.score).map((m) => (
                    <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-blue-500/20 transition-all cursor-pointer group/item">
                        <div className="flex items-center gap-3">
                            <div className={`size-2 rounded-full shadow-[0_0_8px] ${m.risk === 'High' ? 'bg-rose-500 shadow-rose-500/40' : (m.risk === 'Medium' ? 'bg-amber-500 shadow-amber-500/40' : 'bg-emerald-500 shadow-emerald-500/40')}`} />
                            <div>
                                <div className="text-xs font-bold text-white uppercase tracking-tight group-hover/item:text-blue-400 transition-colors">{m.name}</div>
                                <div className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest">Risque {m.risk}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <div className={`text-xs font-black ${m.score > 70 ? 'text-emerald-400' : (m.score > 40 ? 'text-amber-400' : 'text-rose-400')}`}>
                                    {m.score}%
                                </div>
                                <div className="h-1 w-12 bg-white/10 rounded-full mt-1 overflow-hidden">
                                    <div className={`h-full rounded-full ${m.score > 70 ? 'bg-emerald-500' : (m.score > 40 ? 'bg-amber-500' : 'bg-rose-500')}`} style={{ width: `${m.score}%` }} />
                                </div>
                            </div>
                            <ChevronRight size={14} className="text-slate-600 group-hover/item:translate-x-1 transition-transform" />
                        </div>
                    </div>
                ))}

                {data.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 opacity-40">
                        <Zap size={24} className="text-slate-500 mb-2" />
                        <p className="text-[0.6rem] font-bold uppercase tracking-widest">Pas d'anomalies détectées</p>
                    </div>
                )}
            </div>

            <button className="mt-6 w-full py-3 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 text-blue-400 font-black uppercase text-[0.65rem] tracking-[0.2em] transition-all flex items-center justify-center gap-2 group/btn">
                <span>Détails Analytiques</span>
                <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
            </button>
        </div>
    );
}
