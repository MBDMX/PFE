'use client';
import Link from 'next/link';
import { AlertTriangle, Package, Flame, CheckCircle2 } from 'lucide-react';
import { WorkOrder, PRIORITY_CONFIG } from './types';

interface Props {
    workOrders: WorkOrder[];
    lowStock: number;
}

export default function AlertsWidget({ workOrders, lowStock }: Props) {
    // OT critiques non terminés
    const criticalOTs = workOrders
        .filter(o => o.priority === 'critical' && o.status !== 'done' && o.status !== 'closed')
        .slice(0, 5);

    const totalAlerts = criticalOTs.length + (lowStock > 0 ? 1 : 0);

    return (
        <div className="azure-card p-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-sm font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                        <AlertTriangle size={14} className={totalAlerts > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-600'} />
                        Alertes actives
                    </h2>
                    <p className="text-xs text-slate-600">{totalAlerts === 0 ? 'Aucune alerte' : `${totalAlerts} point${totalAlerts > 1 ? 's' : ''} d'attention`}</p>
                </div>
            </div>

            {totalAlerts === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-8 text-slate-700">
                    <CheckCircle2 size={32} />
                    <p className="text-xs font-bold uppercase tracking-widest">Tout est sous contrôle</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {/* Stock bas */}
                    {lowStock > 0 && (
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-orange-500/5 border border-orange-500/20">
                            <div className="p-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 shrink-0">
                                <Package size={14} className="text-orange-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-orange-300">Stock bas détecté</p>
                                <p className="text-[0.65rem] text-slate-600 mt-0.5">
                                    {lowStock} pièce{lowStock > 1 ? 's' : ''} sous le seuil critique (≤ 5 unités)
                                </p>
                            </div>
                            <Link href="/stock" className="text-[0.6rem] font-bold text-orange-400 hover:text-orange-300 uppercase tracking-widest whitespace-nowrap shrink-0">
                                Voir →
                            </Link>
                        </div>
                    )}

                    {/* OT critiques */}
                    {criticalOTs.map(o => {
                        const st = o.status === 'in_progress' ? '🔧 En cours' : '⏳ Ouvert';
                        return (
                            <div key={o.id} className="flex items-start gap-3 p-3 rounded-xl bg-rose-500/5 border border-rose-500/20">
                                <div className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 shrink-0">
                                    <Flame size={14} className="text-rose-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-rose-300 line-clamp-1">{o.title}</p>
                                    <p className="text-[0.6rem] text-slate-600 mt-0.5">{st} · {o.technical_location || 'Lieu non défini'}</p>
                                </div>
                                <Link href={`/work-orders/${o.id}`} className="text-[0.6rem] font-bold text-rose-400 hover:text-rose-300 uppercase tracking-widest whitespace-nowrap shrink-0">
                                    OT →
                                </Link>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
