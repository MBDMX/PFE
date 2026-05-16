import { History, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Props {
    orders: any[];
}

/** Format a raw date string (ISO or SAP DD.MM.YYYY) to French locale. */
function formatDate(d: string): string {
    if (!d) return '—';
    if (d.startsWith('0001') || d.includes('1899') || d.includes('Date(-')) return '—';
    let dateObj = new Date(d);
    if (isNaN(dateObj.getTime()) && d.includes('.')) {
        const parts = d.split('.');
        if (parts.length === 3) dateObj = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    }
    return !isNaN(dateObj.getTime())
        ? dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
        : '—';
}

export default function InterventionHistory({ orders }: Props) {
    const router = useRouter();
    return (
        <section className="azure-card p-0 overflow-hidden">
            <div className="p-5 border-b border-white/5 flex items-center gap-3">
                <History size={18} className="text-slate-400" />
                <h2 className="text-sm font-black text-white uppercase tracking-widest">Historique Complet des Interventions</h2>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-900/50">
                            <th className="p-4 text-[0.55rem] font-black text-slate-500 uppercase">Type / ID</th>
                            <th className="p-4 text-[0.55rem] font-black text-slate-500 uppercase">Titre</th>
                            <th className="p-4 text-[0.55rem] font-black text-slate-500 uppercase">Date</th>
                            <th className="p-4 text-[0.55rem] font-black text-slate-500 uppercase text-center">Temps</th>
                            <th className="p-4 text-[0.55rem] font-black text-slate-500 uppercase">Statut</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.length > 0 ? orders.map((o: any) => (
                            <tr
                                key={o.id}
                                className="border-t border-white/5 hover:bg-white/5 transition-colors cursor-pointer group"
                                onClick={() => router.push(`/work-orders/${o.id}`)}
                            >
                                <td className="p-4">
                                    <div className="flex flex-col">
                                        <span className={`text-[0.6rem] font-black uppercase ${o.type === 'breakdown' || o.type === 'corrective' ? 'text-rose-400' : 'text-blue-400'}`}>{o.type}</span>
                                        <span className="text-[0.55rem] text-slate-500 font-bold">#{o.sap_order_id || o.id}</span>
                                    </div>
                                </td>
                                <td className="p-4 font-bold text-white text-xs group-hover:text-blue-400 transition-colors">{o.title}</td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold">
                                        <Calendar size={14} className="text-blue-500/50" />
                                        {formatDate(o.planned_start_date)}
                                    </div>
                                </td>
                                <td className="p-4 text-center text-slate-500 text-xs font-black">
                                    {o.time_spent != null ? Number(o.time_spent).toFixed(2) : '—'}h
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-0.5 rounded-md text-[0.55rem] font-black uppercase ${o.status === 'done' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                        {o.status}
                                    </span>
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan={5} className="p-10 text-center text-slate-500 text-xs font-bold italic uppercase tracking-widest">Aucune intervention enregistrée</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
