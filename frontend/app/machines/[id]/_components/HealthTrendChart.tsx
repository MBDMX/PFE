'use client';
import { useEffect, useState } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import api from '@/services/api';

interface HistoryPoint { date: string; score: number; label: string; }

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const score = payload[0].value;
        const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#f43f5e';
        return (
            <div className="bg-slate-900 border border-white/10 rounded-xl p-3 shadow-2xl">
                <p className="text-[0.6rem] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
                <p className="text-lg font-black" style={{ color }}>{score}%</p>
                <p className="text-[0.55rem] text-slate-500 font-bold uppercase">
                    {score >= 75 ? '● Sain' : score >= 50 ? '● Surveillance' : '● Critique'}
                </p>
            </div>
        );
    }
    return null;
};

export default function HealthTrendChart({ machineId }: { machineId: number }) {
    const [history, setHistory] = useState<HistoryPoint[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get(`/predictive/health-history/${machineId}`)
            .then(res => {
                if (res.data?.status === 'success') {
                    setHistory(res.data.history);
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [machineId]);

    if (loading) return (
        <div className="h-48 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    if (!history.length) return (
        <div className="h-48 flex items-center justify-center text-slate-500 text-xs font-bold uppercase tracking-widest">
            Pas d'historique disponible
        </div>
    );

    const latest = history[history.length - 1]?.score ?? 100;
    const previous = history[history.length - 2]?.score ?? 100;
    const trend = latest - previous;

    const gradientId = `health-gradient-${machineId}`;
    const strokeColor = latest >= 75 ? '#10b981' : latest >= 50 ? '#f59e0b' : '#f43f5e';

    return (
        <div className="space-y-4">
            {/* Trend header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {trend > 0
                        ? <TrendingUp size={16} className="text-emerald-400" />
                        : trend < 0
                            ? <TrendingDown size={16} className="text-rose-400" />
                            : <Minus size={16} className="text-slate-400" />
                    }
                    <span className={`text-xs font-black uppercase tracking-widest ${trend > 0 ? 'text-emerald-400' : trend < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                        {trend > 0 ? `+${trend}%` : trend === 0 ? 'Stable' : `${trend}%`} vs hier
                    </span>
                </div>
                <span className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest">7 derniers jours</span>
            </div>

            {/* Chart */}
            <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={history} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={strokeColor} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={strokeColor} stopOpacity={0.02} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis
                        dataKey="label"
                        tick={{ fill: '#64748b', fontSize: 9, fontWeight: 700 }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        domain={[0, 100]}
                        tick={{ fill: '#64748b', fontSize: 9, fontWeight: 700 }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={75} stroke="#10b98130" strokeDasharray="4 4" />
                    <ReferenceLine y={50} stroke="#f43f5e30" strokeDasharray="4 4" />
                    <Area
                        type="monotone"
                        dataKey="score"
                        stroke={strokeColor}
                        strokeWidth={2.5}
                        fill={`url(#${gradientId})`}
                        dot={{ fill: strokeColor, r: 3, strokeWidth: 0 }}
                        activeDot={{ r: 5, fill: strokeColor, strokeWidth: 0 }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
