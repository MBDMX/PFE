'use client';
import { useState, useEffect } from 'react';
import { BarChart3, Info } from 'lucide-react';
import { gmaoApi } from '../../../../services/api';

export default function WeeklyChart() {
    const [weeklyData, setWeeklyData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchWeekly = async () => {
            try {
                const movements = await gmaoApi.getStockMovements();
                const outMovements = movements.filter((m: any) => m.type === 'OUT');
                
                // Group by last 7 days
                const days = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
                const stats = Array(7).fill(0);
                
                const now = new Date();
                outMovements.forEach((m: any) => {
                    const mDate = new Date(m.date);
                    const diff = Math.floor((now.getTime() - mDate.getTime()) / (1000 * 60 * 60 * 24));
                    if (diff >= 0 && diff < 7) {
                        stats[6 - diff] += m.quantity;
                    }
                });

                const max = Math.max(...stats, 1);
                const data = stats.map((val, idx) => ({
                    day: days[(new Date().getDay() - (6 - idx) + 7) % 7],
                    count: val,
                    height: (val / max) * 100
                }));

                setWeeklyData(data);
            } catch (err) {
                console.error("Failed to fetch weekly stats", err);
            } finally {
                setLoading(false);
            }
        };
        fetchWeekly();
    }, []);

    if (loading) return <div className="h-64 azure-card animate-pulse bg-slate-900/20" />;

    return (
        <div className="azure-card p-6 flex flex-col">
            <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
                <div className="flex items-center gap-2">
                    <BarChart3 size={18} className="text-blue-400" />
                    <h2 className="text-sm font-black text-white uppercase tracking-widest">Activité Hebdomadaire</h2>
                </div>
                <div className="group relative">
                    <Info size={14} className="text-slate-600 cursor-help" />
                    <div className="absolute right-0 top-6 w-48 p-2 bg-slate-900 border border-white/10 rounded-lg text-[0.6rem] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                        Nombre total d'unités sorties par jour sur les 7 derniers jours.
                    </div>
                </div>
            </div>

            <div className="flex-1 flex items-end justify-between gap-2 px-2 pb-2">
                {weeklyData.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                        <div className="relative w-full flex flex-col items-center">
                             {/* Tooltip on hover */}
                             <div className="absolute -top-8 bg-blue-600 text-white text-[0.6rem] font-black px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                {d.count} uts
                             </div>
                             
                             {/* Bar */}
                             <div 
                                className="w-6 md:w-8 bg-slate-800/50 rounded-t-lg group-hover:bg-blue-500/20 transition-all relative overflow-hidden flex flex-col justify-end"
                                style={{ height: '140px' }}
                             >
                                <div 
                                    className="w-full bg-gradient-to-t from-blue-600/80 to-blue-400 rounded-t-md transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                                    style={{ height: `${d.height}%` }}
                                />
                             </div>
                        </div>
                        <span className={`text-[0.65rem] font-black uppercase tracking-widest ${i === 6 ? 'text-blue-400' : 'text-slate-600'}`}>
                            {d.day}
                        </span>
                    </div>
                ))}
            </div>
            
            <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                <div className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest">Total Semaine</div>
                <div className="text-sm font-black text-white">{weeklyData.reduce((s, i) => s + i.count, 0)} <span className="text-[0.6rem] opacity-40">uts</span></div>
            </div>
        </div>
    );
}
