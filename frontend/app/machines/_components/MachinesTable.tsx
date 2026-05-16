import { useRouter } from 'next/navigation';
import { Wrench, MapPin, TrendingUp, TrendingDown, Activity, AlertCircle, ArrowUpDown, ChevronRight, Eye } from 'lucide-react';

type Status = 'operational' | 'maintenance' | 'breakdown';

interface Props {
    machines: any[];
    loading: boolean;
    sortConfig: { key: string; direction: 'asc' | 'desc' } | null;
    onSort: (key: string) => void;
    onSelect: (machine: any) => void;   // ← opens side panel (original behaviour)
}

const getStatusInfo = (status: Status) => {
    switch (status) {
        case 'operational': return { label: 'Opérationnel', color: 'text-emerald-400', bg: 'bg-emerald-400/10', icon: Activity };
        case 'maintenance':  return { label: 'Maintenance',  color: 'text-amber-400',   bg: 'bg-amber-400/10',   icon: Wrench };
        case 'breakdown':    return { label: 'En Panne',     color: 'text-rose-400',    bg: 'bg-rose-400/10',    icon: AlertCircle };
        default:             return { label: status || 'Inconnu', color: 'text-slate-400', bg: 'bg-slate-400/10', icon: Activity };
    }
};

const getHealthColor = (s: number) =>
    s >= 80 ? 'from-emerald-500 to-teal-400' : s >= 50 ? 'from-amber-500 to-orange-400' : 'from-rose-600 to-pink-500';

const getMaintenanceBadge = (nextDate?: string) => {
    if (!nextDate) return { label: 'Non planifiée', color: 'text-slate-500', bg: 'bg-slate-500/10' };
    const diff = Math.ceil((new Date(nextDate).getTime() - Date.now()) / (1000 * 3600 * 24));
    if (diff < 0)  return { label: 'En retard',  color: 'text-rose-400',  bg: 'bg-rose-500/10' };
    if (diff <= 7) return { label: 'Imminente',  color: 'text-amber-400', bg: 'bg-amber-500/10' };
    return { label: `Prévue le ${new Date(nextDate).toLocaleDateString('fr-FR')}`, color: 'text-blue-400', bg: 'bg-blue-500/10' };
};

const COLS = [
    { key: 'name',                  label: 'Équipement' },
    { key: 'location',              label: 'Localisation' },
    { key: 'next_maintenance_date', label: 'Maintenance' },
    { key: 'ml_score',              label: 'État Santé' },
    { key: 'status',                label: 'Statut' },
];

export default function MachinesTable({ machines, loading, sortConfig, onSort, onSelect }: Props) {
    const router = useRouter();

    return (
        <div className="azure-card p-0 overflow-hidden">
            <div className="azure-table-wrap">
                <table className="azure-table">
                    <thead>
                        <tr>
                            {COLS.map(col => (
                                <th key={col.key} onClick={() => onSort(col.key)} className="cursor-pointer hover:text-blue-400 transition-colors">
                                    <div className="flex items-center gap-2">{col.label} <ArrowUpDown size={12} className="opacity-50" /></div>
                                </th>
                            ))}
                            <th className="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            Array(5).fill(0).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan={6} className="py-8"><div className="h-4 bg-white/5 rounded-full w-3/4 mx-auto" /></td>
                                </tr>
                            ))
                        ) : machines.length > 0 ? machines.map((m, idx) => {
                            const status  = getStatusInfo(m.status);
                            const mlScore = m.ml_score ?? m.health_score;
                            const badge   = getMaintenanceBadge(m.next_maintenance_date);
                            return (
                                /* Row click → side panel (original behaviour) */
                                <tr
                                    key={m.id}
                                    onClick={() => onSelect(m)}
                                    className="group transition-all cursor-pointer hover:bg-white/5 border-b border-white/5 last:border-0"
                                >
                                    {/* Équipement */}
                                    <td>
                                        <div className="flex items-center gap-4">
                                            <div className="size-12 rounded-xl bg-slate-800 flex items-center justify-center border border-white/5">
                                                <Wrench size={20} className="text-blue-400" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-white group-hover:text-blue-400 transition-colors uppercase tracking-tight">{m.name}</div>
                                                <div className="text-[0.7rem] font-bold text-slate-500 uppercase tracking-widest mt-1">{m.reference}</div>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Localisation */}
                                    <td>
                                        <div className="flex items-center gap-2 text-slate-400">
                                            <MapPin size={14} className="text-slate-600" />
                                            <span className="font-medium">{m.location}</span>
                                        </div>
                                    </td>

                                    {/* Maintenance */}
                                    <td>
                                        <div className={`px-2 py-0.5 rounded-md text-[0.6rem] font-black uppercase tracking-widest ${badge.bg} ${badge.color}`}>
                                            {badge.label}
                                        </div>
                                        {m.last_maintenance_date && (
                                            <div className="text-[0.55rem] text-slate-500 uppercase font-bold tracking-widest pl-1 mt-0.5">
                                                Dernière : {new Date(m.last_maintenance_date).toLocaleDateString('fr-FR')}
                                            </div>
                                        )}
                                    </td>

                                    {/* Score santé */}
                                    <td>
                                        <div className="flex flex-col gap-2 w-32">
                                            <div className="flex items-center justify-between">
                                                <div id={idx === 0 ? 'ml-health-score' : undefined} className="flex items-center gap-1.5">
                                                    <span className={`text-[0.65rem] font-black uppercase tracking-widest ${mlScore > 50 ? 'text-emerald-400' : 'text-rose-400'}`}>{mlScore}%</span>
                                                    <span className="text-[0.5rem] bg-blue-500/20 text-blue-400 px-1 rounded font-black border border-blue-500/20">ML</span>
                                                </div>
                                                {mlScore > 80 ? <TrendingUp size={10} className="text-emerald-500" /> : <TrendingDown size={10} className="text-rose-500" />}
                                            </div>
                                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                                <div className={`h-full bg-gradient-to-r ${getHealthColor(mlScore)} rounded-full transition-all duration-1000`} style={{ width: `${mlScore}%` }} />
                                            </div>
                                        </div>
                                    </td>

                                    {/* Statut */}
                                    <td>
                                        <div className={`azure-badge ${status.bg} ${status.color}`}>
                                            <status.icon size={12} />
                                            <span className="uppercase tracking-widest font-black leading-none">{status.label}</span>
                                        </div>
                                    </td>

                                    {/* Actions — stop propagation so row click still opens panel */}
                                    <td className="text-right" onClick={e => e.stopPropagation()}>
                                        <div className="flex items-center justify-end gap-2 pr-2">
                                            <button
                                                title="Voir le détail"
                                                onClick={() => router.push(`/machines/${m.id}`)}
                                                className="size-9 rounded-lg bg-white/5 hover:bg-blue-600/20 text-slate-600 hover:text-blue-400 flex items-center justify-center transition-all"
                                            >
                                                <Eye size={16} />
                                            </button>
                                            <div className="size-9 rounded-lg bg-white/5 text-slate-600 flex items-center justify-center">
                                                <ChevronRight size={16} />
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            );
                        }) : (
                            <tr>
                                <td colSpan={6} className="py-20 text-center text-slate-500 italic font-medium">Aucune machine trouvée</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
