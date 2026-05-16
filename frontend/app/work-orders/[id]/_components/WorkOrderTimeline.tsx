import { Clock, Calendar } from 'lucide-react';

interface Props {
    order: any;
}

interface TimelineEvent {
    label: string;
    value: string | null;
    activeColor: string;
    fallback?: string;
}

export default function WorkOrderTimeline({ order }: Props) {
    const events: TimelineEvent[] = [
        { label: 'Création', value: order.created_at, activeColor: 'bg-slate-800 border-slate-600' },
        { label: 'Planification SAP', value: order.planned_start_date, activeColor: 'bg-blue-500 border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.5)]' },
        { label: 'Début Réel', value: order.actual_start_date, activeColor: 'bg-indigo-500 border-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.5)]', fallback: 'En attente' },
        { label: 'Fin Réelle', value: order.actual_end_date, activeColor: 'bg-emerald-500 border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]', fallback: 'Non terminé' },
    ];

    return (
        <div className="azure-card p-6">
            <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
                <Clock size={18} className="text-slate-400" />
                <h2 className="text-lg font-black text-white uppercase tracking-widest">Chronologie</h2>
            </div>
            <div className="relative pl-6 space-y-6 border-l-2 border-slate-800">
                {events.map((ev, i) => {
                    const hasValue = !!ev.value;
                    const isOptional = i >= 2;
                    return (
                        <div key={ev.label} className={`relative ${isOptional && !hasValue ? 'opacity-40' : ''}`}>
                            <div className={`absolute -left-[31px] ${hasValue ? ev.activeColor : 'bg-slate-800 border-slate-600'} border-2 size-4 rounded-full mt-1`} />
                            <div className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest">{ev.label}</div>
                            <div className="font-bold text-sm text-white">{ev.value || ev.fallback}</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
