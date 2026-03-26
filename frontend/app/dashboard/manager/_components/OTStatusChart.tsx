'use client';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ManagerStats } from './types';

interface Props { stats: ManagerStats }

const SLICES = [
    { key: 'openOT',       label: 'Ouvert',     color: '#38bdf8' },
    { key: 'inProgressOT', label: 'En cours',   color: '#fbbf24' },
    { key: 'doneOT',       label: 'Terminé',    color: '#34d399' },
    { key: 'overdueOT',    label: 'En retard',  color: '#f87171' },
] as const;

export default function OTStatusChart({ stats }: Props) {
    const data = SLICES.map(s => ({ name: s.label, value: stats[s.key], color: s.color })).filter(d => d.value > 0);

    return (
        <div className="azure-card p-6 h-full">
            <h2 className="text-sm font-black text-slate-300 uppercase tracking-widest mb-1">Répartition OT</h2>
            <p className="text-xs text-slate-600 mb-4">Par statut · {stats.totalOT} ordres au total</p>
            <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                    <Pie
                        data={data}
                        dataKey="value"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={3}
                        strokeWidth={0}
                    >
                        {data.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: '0.8rem', color: '#cbd5e1' }}
                        itemStyle={{ color: '#94a3b8' }}
                    />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '0.72rem', color: '#64748b' }} />
                </PieChart>
            </ResponsiveContainer>
            {/* Centre label */}
            <div className="text-center -mt-2">
                <p className="text-2xl font-black text-white">{stats.resolutionRate}%</p>
                <p className="text-[0.6rem] text-slate-600 uppercase tracking-widest font-bold">taux résolution</p>
            </div>
        </div>
    );
}
