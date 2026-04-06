'use client';

import { useState, useEffect } from 'react';
import { 
    X, CheckCircle, Clock, AlertTriangle, 
    Zap, User
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

export default function ComparisonOverlay({ technicians, tech1, onClose }: ComparisonOverlayProps) {
    const [stats1, setStats1] = useState<TechStats | null>(null);
    const [stats2, setStats2] = useState<TechStats | null>(null);
    const [tech2, setTech2] = useState<Technician | null>(null);
    const [loading2, setLoading2] = useState(false);

    // Initial load for Tech 1
    useEffect(() => {
        gmaoApi.getTechnicianStats(tech1.id).then(setStats1);
    }, [tech1.id]);

    // Load Tech 2 stats
    useEffect(() => {
        if (tech2) {
            setLoading2(true);
            gmaoApi.getTechnicianStats(tech2.id).then(setStats2).finally(() => setLoading2(false));
        } else {
            setStats2(null);
        }
    }, [tech2]);

    const otherTechs = technicians.filter(t => t.id !== tech1.id);

    const MetricRow = ({ label, val1, val2, suffix = '', reverse = false }: { 
        label: string, val1: number, val2: number, suffix?: string, reverse?: boolean 
    }) => {
        const diff = val1 - val2;
        const isBetter = reverse ? diff < 0 : diff > 0;

        return (
            <div className="flex items-center justify-between py-6 border-b border-white/5 px-4">
                <div className="w-20 text-center font-black text-2xl text-white">{val1}{suffix}</div>
                <div className="flex-1 text-center">
                    <span className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
                    {val2 !== null && (
                        <div className={`text-[0.55rem] font-black uppercase mt-1 ${isBetter ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {diff === 0 ? 'Égalité' : isBetter ? 'Meilleur' : 'Moins efficace'}
                        </div>
                    )}
                </div>
                <div className="w-20 text-center font-black text-2xl text-white">{val2 ?? '--'}{suffix}</div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-3xl animate-in fade-in duration-500 overflow-y-auto">
            <div className="max-w-4xl mx-auto p-8 lg:p-20">
                
                {/* Simplified Header */}
                <div className="flex items-center justify-between mb-12">
                    <h2 className="text-2xl font-black text-white flex items-center gap-3">
                        <Zap className="text-amber-400 fill-amber-400" size={24} />
                        Comparaison
                    </h2>
                    <button onClick={onClose} className="size-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center">
                        <X size={20} />
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* Panel 1: Tech 1 (Fixed) */}
                    <div className="azure-card p-6 bg-violet-600/5">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="size-12 rounded-2xl bg-violet-600 flex items-center justify-center font-black text-white">
                                {tech1.name?.charAt(0)}
                            </div>
                            <div>
                                <div className="text-lg font-black text-white">{tech1.name}</div>
                                <div className="text-[0.6rem] font-bold text-slate-500 uppercase">Technicien A</div>
                            </div>
                        </div>
                        {stats1 && (
                            <div className="space-y-2">
                                <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex justify-between">
                                    <span className="text-[0.6rem] font-bold text-slate-500 uppercase">Réussite</span>
                                    <span className="text-xs font-black text-emerald-400">{stats1.completionRate}%</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Panel 2: Selection or Tech 2 */}
                    {!tech2 ? (
                        <div className="azure-card p-6 border-dashed border-2 border-white/10 bg-white/5">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Sélectionner un binôme</h3>
                            <div className="grid grid-cols-2 gap-2">
                                {otherTechs.map(t => (
                                    <button 
                                        key={t.id} 
                                        onClick={() => setTech2(t)}
                                        className="p-3 rounded-xl bg-white/5 border border-white/5 text-xs font-bold hover:bg-violet-600/20 hover:border-violet-500/50 transition-all text-left"
                                    >
                                        {t.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="azure-card p-6 bg-blue-600/5">
                             <div className="flex items-center gap-4 mb-8">
                                <div className="size-12 rounded-2xl bg-blue-600 flex items-center justify-center font-black text-white">
                                    {tech2.name?.charAt(0)}
                                </div>
                                <div className="flex-1">
                                    <div className="text-lg font-black text-white">{tech2.name}</div>
                                    <div className="text-[0.6rem] font-bold text-slate-500 uppercase">Technicien B</div>
                                </div>
                                <button onClick={() => setTech2(null)} className="size-8 rounded-lg bg-white/5 flex items-center justify-center">
                                    <X size={14} />
                                </button>
                            </div>
                            {stats2 && (
                                <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex justify-between">
                                    <span className="text-[0.6rem] font-bold text-slate-500 uppercase">Réussite</span>
                                    <span className="text-xs font-black text-blue-400">{stats2.completionRate}%</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Simplified Metrics Table */}
                {stats1 && stats2 && (
                    <div className="mt-8 azure-card bg-white/5 p-0 border-white/10">
                        <MetricRow label="Taux de Réussite" val1={stats1.completionRate} val2={stats2.completionRate} suffix="%" />
                        <MetricRow label="Temps Moyen (h)" val1={stats1.avgRepairTime} val2={stats2.avgRepairTime} suffix="h" reverse />
                        <MetricRow label="OT en Retard" val1={stats1.overdueOT} val2={stats2.overdueOT} reverse />
                    </div>
                )}
                
                <div className="mt-8 text-center">
                    <p className="text-[0.6rem] font-bold text-slate-600 uppercase tracking-[0.3em]">
                        Performance Index — Mode Simplifié
                    </p>
                </div>
            </div>
        </div>
    );
}
