import { Clock, Activity, CheckCircle } from 'lucide-react';

interface Props {
    orders: any[];
}

export default function WorkOrdersStats({ orders }: Props) {
    const stats = [
        { label: 'En Attente', status: 'open', color: 'amber', icon: Clock },
        { label: 'En Cours', status: 'in_progress', color: 'blue', icon: Activity },
        { label: 'Terminés', status: 'done', color: 'emerald', icon: CheckCircle },
    ];

    return (
        <div className="flex flex-wrap gap-4 mb-8">
            {stats.map(({ label, status, color, icon: Icon }) => (
                <div key={status} className={`azure-card flex-1 py-4 px-6 flex items-center gap-4 bg-${color}-500/5 border-${color}-500/20`}>
                    <div className={`size-10 rounded-xl bg-${color}-500/10 flex items-center justify-center text-${color}-500`}>
                        <Icon size={20} />
                    </div>
                    <div>
                        <div className="text-xl font-black">{orders.filter(o => o.status === status).length}</div>
                        <div className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest">{label}</div>
                    </div>
                </div>
            ))}
        </div>
    );
}
