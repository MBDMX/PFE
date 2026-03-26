'use client';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { WorkOrder, STATUS_CONFIG, PRIORITY_CONFIG, isOverdue } from './types';

interface Props { workOrders: WorkOrder[] }

export default function RecentOTTable({ workOrders }: Props) {
    // Last 10 by descending ID
    const recent = [...workOrders].sort((a, b) => b.id - a.id).slice(0, 10);

    if (recent.length === 0) {
        return (
            <div className="azure-card p-6 flex items-center justify-center h-40">
                <p className="text-slate-600 text-sm">Aucun ordre de travail trouvé</p>
            </div>
        );
    }

    return (
        <div className="azure-card p-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-sm font-black text-slate-300 uppercase tracking-widest">OT Récents</h2>
                    <p className="text-xs text-slate-600">10 derniers ordres de travail</p>
                </div>
                <Link href="/work-orders" className="text-[0.65rem] font-bold text-blue-400 hover:text-blue-300 uppercase tracking-widest transition-colors">
                    Voir tout →
                </Link>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-white/5">
                            {['SAP ID', 'Titre', 'Priorité', 'Statut', ''].map(h => (
                                <th key={h} className="text-left text-[0.6rem] font-bold text-slate-600 uppercase tracking-widest pb-3 pr-4">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {recent.map(o => {
                            const st = STATUS_CONFIG[o.status] ?? STATUS_CONFIG['open'];
                            const pr = PRIORITY_CONFIG[o.priority] ?? PRIORITY_CONFIG['medium'];
                            const late = isOverdue(o.planned_end_date, o.status);
                            return (
                                <tr key={o.id} className="group hover:bg-white/[0.02] transition-colors">
                                    <td className="py-3 pr-4 font-mono text-[0.65rem] text-slate-500">
                                        {o.sap_order_id ?? `#${o.id}`}
                                    </td>
                                    <td className="py-3 pr-4">
                                        <span className="font-semibold text-slate-200 text-xs leading-tight line-clamp-1">
                                            {o.title}
                                        </span>
                                        {late && (
                                            <span className="block text-[0.55rem] text-rose-400 font-bold uppercase tracking-widest mt-0.5">⚠ En retard</span>
                                        )}
                                    </td>
                                    <td className="py-3 pr-4">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`size-1.5 rounded-full ${pr.dot} shrink-0`} />
                                            <span className={`text-[0.6rem] font-bold uppercase px-1.5 py-0.5 rounded border ${pr.classes}`}>
                                                {pr.label}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-3 pr-4">
                                        <span className={`text-[0.6rem] font-bold uppercase px-1.5 py-0.5 rounded border ${st.classes}`}>
                                            {st.label}
                                        </span>
                                    </td>
                                    <td className="py-3">
                                        <Link
                                            href={`/work-orders/${o.id}`}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-blue-400"
                                        >
                                            <ExternalLink size={14} />
                                        </Link>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
