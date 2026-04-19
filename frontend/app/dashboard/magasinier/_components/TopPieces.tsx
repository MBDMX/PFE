'use client';
import { useState, useEffect } from 'react';
import { TrendingUp, Package, Box } from 'lucide-react';
import { gmaoApi } from '../../../../services/api';

export default function TopPieces() {
    const [topPieces, setTopPieces] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTopPieces = async () => {
            try {
                const movements = await gmaoApi.getStockMovements();
                const outMovements = movements.filter((m: any) => m.type === 'OUT');
                
                const stats = outMovements.reduce((acc: any, m: any) => {
                    const key = m.part_code;
                    if (!acc[key]) acc[key] = { name: m.part_name, reference: m.part_code, count: 0 };
                    acc[key].count += m.quantity;
                    return acc;
                }, {});

                const sorted = Object.values(stats)
                    .sort((a: any, b: any) => b.count - a.count)
                    .slice(0, 5);

                const total = sorted.reduce((sum: number, item: any) => sum + item.count, 0);
                const enriched = sorted.map((item: any) => ({
                    ...item,
                    percentage: total > 0 ? Math.round((item.count / total) * 100) : 0
                }));

                setTopPieces(enriched);
            } catch (err) {
                console.error("Failed to fetch top pieces", err);
            } finally {
                setLoading(false);
            }
        };
        fetchTopPieces();
    }, []);

    if (loading) return <div className="h-64 azure-card animate-pulse bg-slate-900/20" />;

    return (
        <div className="azure-card p-6">
            <div className="flex items-center gap-2 mb-8 border-b border-white/5 pb-4">
                <TrendingUp size={18} className="text-emerald-400" />
                <h2 className="text-sm font-black text-white uppercase tracking-widest">Top Consommables (Mois)</h2>
            </div>

            <div className="space-y-6">
                {topPieces.length === 0 ? (
                    <div className="h-40 flex flex-col items-center justify-center text-slate-600 text-xs italic">
                        <Package size={20} className="mb-2 opacity-10" />
                        Aucune donnée de sortie ce mois
                    </div>
                ) : (
                    topPieces.map((piece, idx) => (
                        <div key={piece.reference} className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="text-xs font-black text-slate-600 font-mono">0{idx + 1}</div>
                                    <div className="space-y-0.5">
                                        <div className="text-[0.7rem] font-black text-white uppercase tracking-tight line-clamp-1">{piece.name}</div>
                                        <div className="text-[0.6rem] font-bold text-blue-500 font-mono">{piece.reference}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs font-black text-white">{piece.count} <span className="text-[0.6rem] text-slate-500 uppercase">uts</span></div>
                                    <div className="text-[0.6rem] font-black text-emerald-400">{piece.percentage}%</div>
                                </div>
                            </div>
                            <div className="h-1.5 w-full bg-slate-900/80 rounded-full overflow-hidden border border-white/5">
                                <div 
                                    className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                                    style={{ width: `${piece.percentage}%` }}
                                />
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
