import { Wrench, User, MapPin, Calendar } from 'lucide-react';

interface Props {
    order: any;
}

export default function WorkOrderInfoCards({ order }: Props) {
    return (
        <>
            <div className="grid grid-cols-2 gap-4">
                <div className="azure-card p-5 group flex items-start gap-4">
                    <div className="size-12 rounded-xl bg-slate-800 flex items-center justify-center border border-white/5 group-hover:bg-blue-900/40 transition-colors">
                        <Wrench size={24} className="text-blue-400" />
                    </div>
                    <div>
                        <div className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest mb-1">Équipement (SAP)</div>
                        <div className="font-bold text-white leading-tight">{order.equipment_id}</div>
                        <div className="text-xs text-blue-400 mt-1 font-bold">Ref: {order.serial_number || 'N/A'}</div>
                    </div>
                </div>
                <div className="azure-card p-5 group flex items-start gap-4">
                    <div className="size-12 rounded-xl bg-slate-800 flex items-center justify-center border border-white/5 group-hover:bg-indigo-900/40 transition-colors">
                        <User size={24} className="text-indigo-400" />
                    </div>
                    <div>
                        <div className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest mb-1">Responsable / Équipe</div>
                        <div className="font-bold text-white leading-tight">{order.responsible_person || 'Jean Dupont'}</div>
                        <div className="text-xs text-indigo-400 mt-1 font-bold">{order.team || 'Maintenance Centrale'} · Tech ID: {order.technician_id || '--'}</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="azure-card p-4 flex items-center gap-4 bg-slate-900/40">
                    <div className="size-9 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20">
                        <MapPin size={18} />
                    </div>
                    <div>
                        <div className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest">Localisation Technique</div>
                        <div className="text-sm font-bold text-white">{order.technical_location}</div>
                    </div>
                </div>
                <div className="azure-card p-4 flex items-center gap-4 bg-slate-900/40">
                    <div className="size-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                        <Calendar size={18} />
                    </div>
                    <div>
                        <div className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest">Planification Initiale</div>
                        <div className="text-sm font-bold text-white">{order.planned_start_date}</div>
                    </div>
                </div>
            </div>
        </>
    );
}
