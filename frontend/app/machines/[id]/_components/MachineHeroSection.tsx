import { Wrench, Activity, MapPin, Brain } from 'lucide-react';

interface Props {
    machine: any;
    score: number;
    healthColor: string;
    healthBg: string;
    riskLabel: string;
    riskClass: string;
    mlData: any;
}

export default function MachineHeroSection({ machine, score, healthColor, healthBg, riskLabel, riskClass, mlData }: Props) {
    return (
        <div className={`mb-10 p-8 rounded-3xl bg-gradient-to-br ${healthBg} to-transparent border border-white/5 relative overflow-hidden`}>
            <Brain className="absolute -right-8 -top-8 size-48 text-white/3 pointer-events-none" />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="flex items-center gap-5">
                    <div className="size-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-blue-400 shadow-xl">
                        <Wrench size={30} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white uppercase tracking-tight">{machine.name}</h1>
                        <div className="flex items-center gap-4 mt-2">
                            <span className="flex items-center gap-1.5 text-slate-500 text-xs font-bold uppercase"><MapPin size={12} />{machine.location}</span>
                            <span className="flex items-center gap-1.5 text-xs font-black uppercase text-slate-400"><Activity size={12} />{machine.status}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-8">
                    <div className="text-center">
                        <div className="text-[0.6rem] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Score Santé IA</div>
                        <div className={`text-6xl font-black ${healthColor}`}>{score}%</div>
                    </div>
                    <div className={`px-4 py-1.5 rounded-full text-[0.65rem] font-black uppercase tracking-widest border text-center ${riskClass}`}>
                        {riskLabel}
                    </div>
                </div>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-white/5">
                <div className="azure-card p-4 bg-blue-500/5 border-blue-500/10">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-[0.6rem] font-black text-slate-500 uppercase tracking-widest">MTBF</div>
                        <span className="text-[0.5rem] font-black px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase">
                            {mlData?.mtbf_days != null ? 'Calculé' : 'N/A'}
                        </span>
                    </div>
                    <div className={`text-xl font-black ${mlData?.mtbf_days != null ? 'text-white' : 'text-slate-600'}`}>
                        {mlData?.mtbf_days != null ? `${mlData.mtbf_days}j` : '—'}
                    </div>
                    <div className="text-[0.55rem] font-bold text-blue-400 uppercase mt-1">Tps moyen entre pannes</div>
                </div>
                <div className="azure-card p-4 bg-emerald-500/5 border-emerald-500/10">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-[0.6rem] font-black text-slate-500 uppercase tracking-widest">MTTR</div>
                        <span className="text-[0.5rem] font-black px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                            {mlData?.mttr_hours != null && mlData.mttr_hours > 0 ? 'Réel' : 'Estimé'}
                        </span>
                    </div>
                    <div className={`text-xl font-black ${mlData?.mttr_hours != null && mlData.mttr_hours > 0 ? 'text-white' : 'text-amber-400'}`}>
                        {mlData?.mttr_hours != null && mlData.mttr_hours > 0 ? `${mlData.mttr_hours}h` : '~2.5h'}
                    </div>
                    <div className="text-[0.55rem] font-bold text-emerald-400 uppercase mt-1">Tps moyen de réparation</div>
                </div>
                <div className="azure-card p-4 bg-amber-500/5 border-amber-500/10">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-[0.6rem] font-black text-slate-500 uppercase tracking-widest">Disponibilité</div>
                        <span className="text-[0.5rem] font-black px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase">Score IA</span>
                    </div>
                    <div className="text-xl font-black text-white">
                        {score >= 90 ? '99.2%' : score >= 70 ? '96.5%' : score >= 50 ? '91.0%' : '84.3%'}
                    </div>
                    <div className="text-[0.55rem] font-bold text-amber-400 uppercase mt-1">Taux de marche estimé</div>
                </div>
                <div className="azure-card p-4 bg-rose-500/5 border-rose-500/10">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-[0.6rem] font-black text-slate-500 uppercase tracking-widest">Pannes/Mois</div>
                        <span className="text-[0.5rem] font-black px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase">30j</span>
                    </div>
                    <div className={`text-xl font-black ${mlData?.failure_rate_30d > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {mlData?.failure_rate_30d ?? 0}
                    </div>
                    <div className="text-[0.55rem] font-bold text-rose-400 uppercase mt-1">Pannes sur 30 derniers jours</div>
                </div>
            </div>
        </div>
    );
}
