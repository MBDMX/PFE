'use client';
import { useEffect, useState } from 'react';
import { Activity, Clock, Zap, BarChart2, AlertTriangle } from 'lucide-react';
import { gmaoApi } from '../../../../services/api';

interface MachineBreakdown {
    equipment_id: string;
    failure_count: number;
    mtbf_days: number | null;
}

interface ReliabilityData {
    mttr_hours: number;
    mtbf_days: number | null;
    reliability_pct: number | null;
    total_corrective_ots: number;
    closed_corrective_ots: number;
    machine_breakdown: MachineBreakdown[];
}

export default function ReliabilityWidget() {
    const [data, setData] = useState<ReliabilityData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        gmaoApi.getReliabilityKpis()
            .then(setData)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="azure-card p-6 h-full animate-pulse space-y-4">
                <div className="h-4 bg-white/5 rounded-full w-1/2" />
                <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white/5 rounded-xl" />)}
                </div>
            </div>
        );
    }

    if (!data) return null;

    const reliabilityColor =
        !data.reliability_pct ? 'text-slate-400' :
            data.reliability_pct >= 90 ? 'text-emerald-400' :
                data.reliability_pct >= 70 ? 'text-amber-400' :
                    'text-rose-400';

    return (
        <div className="azure-card p-6 h-full flex flex-col gap-5">
            {/* Header */}
            <div>
                <h2 className="text-sm font-black text-slate-300 uppercase tracking-widest mb-1">
                    Fiabilité Équipements
                </h2>
                <p className="text-xs text-slate-600">
                    MTBF / MTTR · {data.total_corrective_ots} OT correctifs analysés
                </p>
            </div>

            {/* KPI Trio */}
            <div className="grid grid-cols-3 gap-3">
                {/* MTBF */}
                <div className="azure-card p-4 bg-blue-500/5 flex flex-col gap-1 items-center text-center">
                    <Activity size={18} className="text-blue-400 mb-1" />
                    <div className="text-xl font-black text-white">
                        {data.mtbf_days != null ? `${data.mtbf_days}j` : 'N/A'}
                    </div>
                    <div className="text-[0.55rem] font-black uppercase tracking-wider text-slate-500">MTBF</div>
                    <div className="text-[0.5rem] font-bold text-slate-600 uppercase">Tps entre pannes</div>
                </div>

                {/* MTTR */}
                <div className="azure-card p-4 bg-amber-500/5 flex flex-col gap-1 items-center text-center">
                    <Clock size={18} className="text-amber-400 mb-1" />
                    <div className="text-xl font-black text-white">
                        {data.mttr_hours > 0 ? `${data.mttr_hours}h` : 'N/A'}
                    </div>
                    <div className="text-[0.55rem] font-black uppercase tracking-wider text-slate-500">MTTR</div>
                    <div className="text-[0.5rem] font-bold text-slate-600 uppercase">Tps de réparation</div>
                </div>

                {/* Reliability % */}
                <div className="azure-card p-4 bg-emerald-500/5 flex flex-col gap-1 items-center text-center">
                    <Zap size={18} className="text-emerald-400 mb-1" />
                    <div className={`text-xl font-black ${reliabilityColor}`}>
                        {data.reliability_pct != null ? `${data.reliability_pct}%` : 'N/A'}
                    </div>
                    <div className="text-[0.55rem] font-black uppercase tracking-wider text-slate-500">Fiabilité</div>
                    <div className="text-[0.5rem] font-bold text-slate-600 uppercase">MTBF/(MTBF+MTTR)</div>
                </div>
            </div>

            {/* Machine Breakdown */}
            {data.machine_breakdown.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 text-[0.6rem] font-black uppercase tracking-widest text-slate-500 mb-3">
                        <BarChart2 size={12} />
                        Pannes par Équipement
                    </div>
                    <div className="space-y-2">
                        {data.machine_breakdown.slice(0, 5).map((m) => {
                            const barPct = Math.min((m.failure_count / (data.machine_breakdown[0]?.failure_count || 1)) * 100, 100);
                            return (
                                <div key={m.equipment_id} className="flex items-center gap-3">
                                    <div className="text-[0.6rem] font-black text-slate-400 uppercase w-20 truncate shrink-0">
                                        {m.equipment_id}
                                    </div>
                                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-rose-600 to-orange-400 rounded-full transition-all duration-700"
                                            style={{ width: `${barPct}%` }}
                                        />
                                    </div>
                                    <div className="text-[0.6rem] font-black text-white w-8 text-right shrink-0">
                                        {m.failure_count}x
                                    </div>
                                    <div className="text-[0.55rem] font-bold text-slate-500 w-14 text-right shrink-0">
                                        {m.mtbf_days != null ? `${m.mtbf_days}j` : '-'}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {data.machine_breakdown.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
                    <AlertTriangle size={28} className="text-slate-700" />
                    <p className="text-xs font-bold text-slate-500 italic uppercase tracking-widest">
                        Pas assez de données correctives
                    </p>
                    <p className="text-[0.6rem] text-slate-600">Ajoutez des OT correctifs pour voir les KPIs</p>
                </div>
            )}
        </div>
    );
}
