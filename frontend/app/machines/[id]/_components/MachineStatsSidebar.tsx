import { Brain, Calendar, BarChart2, Zap, ShieldAlert } from 'lucide-react';

interface MlDateInfo {
    date: Date | null;
    isOverdue: boolean;
    daysUntil: number;
}

interface Props {
    machine: any;
    orders: any[];
    mlData: any;
    modelStats: any;
    financials: any;
    score: number;
    mlDateInfo: MlDateInfo;
}

export default function MachineStatsSidebar({ machine, orders, mlData, modelStats, financials, score, mlDateInfo }: Props) {
    return (
        <div className="space-y-6">
            {/* OT Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
                <div className="azure-card p-5 bg-blue-500/5 text-center col-span-2 border-blue-500/10">
                    <div className="text-[0.6rem] font-black text-blue-400 uppercase tracking-widest mb-2 flex items-center justify-center gap-2">
                        <Zap size={12} /> Panne la plus fréquente (SAP)
                    </div>
                    <div className="text-xl font-black text-white truncate px-2">{mlData?.most_frequent_failure || 'N/A'}</div>
                    <div className="text-[0.55rem] font-bold text-slate-500 uppercase mt-1">
                        Occurrences : <span className="text-blue-400">{mlData?.failure_frequency || 0} fois</span>
                    </div>
                </div>
                <div className="azure-card p-5 bg-slate-500/5 text-center">
                    <div className="text-3xl font-black text-white">{orders.length}</div>
                    <div className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest mt-1">Interventions</div>
                </div>
                <div className="azure-card p-5 bg-emerald-500/5 text-center">
                    <div className="text-3xl font-black text-emerald-400">{orders.filter((o: any) => o.status === 'done').length}</div>
                    <div className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest mt-1">Clôturées</div>
                </div>
                <div className="azure-card p-5 bg-rose-500/5 text-center">
                    <div className="text-3xl font-black text-rose-400">
                        {orders.filter((o: any) => o.type === 'breakdown' || o.type === 'corrective').length}
                    </div>
                    <div className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest mt-1">Pannes</div>
                </div>
                <div className="azure-card p-5 bg-amber-500/5 text-center">
                    <div className="text-3xl font-black text-amber-400">{orders.filter((o: any) => o.status !== 'done').length}</div>
                    <div className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest mt-1">En cours</div>
                </div>
            </div>

            {/* Model Metrics */}
            {modelStats && (
                <section className="azure-card p-5 bg-blue-600/5 border-blue-500/20">
                    <div className="flex items-center gap-3 mb-5">
                        <Brain size={16} className="text-blue-400" />
                        <h3 className="text-xs font-black text-white uppercase tracking-widest">Métriques du Modèle</h3>
                    </div>
                    <div className="space-y-3">
                        {[
                            { label: 'Algorithme', value: 'Isolation Forest', cls: 'text-blue-400' },
                            { label: 'Silhouette Score', value: modelStats.silhouette_score ?? 'N/A', cls: modelStats.silhouette_score > 0.5 ? 'text-emerald-400' : 'text-amber-400' },
                            { label: 'Échantillons', value: modelStats.training_samples, cls: 'text-white' },
                            { label: 'N° Estimateurs', value: modelStats.n_estimators, cls: 'text-white' },
                            { label: 'Dernier entraîn.', value: modelStats.last_trained_at ? new Date(modelStats.last_trained_at).toLocaleTimeString('fr-FR') : '—', cls: 'text-white' },
                        ].map(row => (
                            <div key={row.label} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                                <span className="text-[0.6rem] font-bold text-slate-500 uppercase">{row.label}</span>
                                <span className={`text-[0.65rem] font-black ${row.cls}`}>{row.value}</span>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Maintenance Plan */}
            <section className="azure-card p-5 bg-violet-600/5 border-violet-500/20">
                <div className="flex items-center gap-3 mb-5">
                    <Calendar size={16} className="text-violet-400" />
                    <h3 className="text-xs font-black text-white uppercase tracking-widest">Plan de Maintenance</h3>
                </div>
                <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 rounded-xl bg-white/5">
                        <span className="text-[0.6rem] font-bold text-slate-500 uppercase">Fréquence</span>
                        <span className="text-xs font-black text-white">/ {machine.maintenance_frequency_days || 90}j</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-xl bg-white/5">
                        <span className="text-[0.6rem] font-bold text-slate-500 uppercase">Dernière</span>
                        <span className="text-xs font-black text-white">{machine.last_maintenance_date || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-xl bg-violet-600/10 border border-violet-500/20">
                        <span className="text-[0.6rem] font-black text-violet-400 uppercase">Prochaine (SAP)</span>
                        <span className="text-xs font-black text-white">{machine.next_maintenance_date || 'Non planifiée'}</span>
                    </div>
                    {mlData?.mtbf_days != null && (
                        <>
                            <div className={`flex justify-between items-center p-3 rounded-xl border ${mlDateInfo.isOverdue ? 'bg-rose-600/10 border-rose-500/30' : mlDateInfo.daysUntil <= 3 ? 'bg-amber-600/10 border-amber-500/30' : 'bg-blue-600/10 border-blue-500/20'}`}>
                                <span className={`text-[0.6rem] font-black uppercase flex items-center gap-1.5 ${mlDateInfo.isOverdue ? 'text-rose-400' : mlDateInfo.daysUntil <= 3 ? 'text-amber-400' : 'text-blue-400'}`}>
                                    <Brain size={10} /> Suggestion ML
                                </span>
                                <span className={`text-xs font-black ${mlDateInfo.isOverdue ? 'text-rose-300 animate-pulse' : mlDateInfo.daysUntil <= 3 ? 'text-amber-300' : 'text-blue-300'}`}>
                                    {mlDateInfo.isOverdue ? '⚠️ IMMÉDIATE' : mlDateInfo.date?.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </span>
                            </div>
                            {(score < 50 || mlDateInfo.isOverdue) && (
                                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 animate-pulse">
                                    <ShieldAlert size={14} className="text-rose-400 shrink-0" />
                                    <span className="text-[0.6rem] font-black text-rose-400 uppercase">
                                        {mlDateInfo.isOverdue ? `En retard de ${Math.abs(mlDateInfo.daysUntil)}j — Intervenir maintenant` : 'Intervention immédiate recommandée'}
                                    </span>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </section>

            {/* Financials */}
            {financials && (
                <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                    <div className="flex items-center gap-2 mb-3">
                        <BarChart2 size={16} className="text-emerald-400" />
                        <h3 className="text-[0.65rem] font-black text-white uppercase tracking-widest">Analyse Financière SAP</h3>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-white">{financials.total_maintenance_cost}</span>
                        <span className="text-[0.6rem] font-bold text-emerald-400 uppercase tracking-widest">{financials.currency}</span>
                    </div>
                    <div className="text-[0.55rem] font-bold text-slate-500 uppercase mt-1">
                        Estimation : {financials.total_parts_used} pièces consommées
                    </div>
                </div>
            )}
        </div>
    );
}
