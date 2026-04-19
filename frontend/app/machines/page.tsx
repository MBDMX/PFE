'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Plus,
    Search,
    Filter,
    MoreHorizontal,
    Wrench,
    Activity,
    AlertCircle,
    MapPin,
    ChevronRight,
    TrendingUp,
    TrendingDown,
    Trash2,
    Edit2,
    X,
    History,
    ClipboardList,
    CheckCircle,
    Clock,
    Calendar,
    ArrowUpRight,
    CalendarClock,
    Zap,
    RefreshCw,
} from 'lucide-react';
import api, { gmaoApi } from '@/services/api';

type Status = 'operational' | 'maintenance' | 'breakdown';
type Machine = {
    id: number;
    name: string;
    reference: string;
    location: string;
    status: Status;
    health_score: number;
    last_maintenance_date?: string;
    next_maintenance_date?: string;
    maintenance_frequency_days?: number;
};

export default function MachinesPage() {
    const router = useRouter();
    const [machines, setMachines] = useState<Machine[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');



    // Machine Detail Side Panel State
    const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
    const [machineOrders, setMachineOrders] = useState<any[]>([]);
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [triggeringMaintenance, setTriggeringMaintenance] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    async function handleSyncSAP() {
        setIsSyncing(true);
        try {
            const res = await gmaoApi.syncMachinesFromSap();
            await fetchMachines();
            const event = new CustomEvent('api:success', { detail: res.message || 'Synchronisation SAP terminée' });
            window.dispatchEvent(event);
        } catch (err: any) {
            console.error('SAP Sync failed', err);
            const event = new CustomEvent('api:error', { detail: 'Échec de la synchronisation SAP' });
            window.dispatchEvent(event);
        } finally {
            setIsSyncing(false);
        }
    };

    async function handleSelectMachine(m: Machine) {
        setSelectedMachine(m);
        setLoadingOrders(true);
        try {
            const orders = await gmaoApi.getMachineWorkOrders(m.id);
            setMachineOrders(orders);
        } catch (err) {
            console.error("Failed to fetch machine history", err);
        } finally {
            setLoadingOrders(false);
        }
    };

    async function handleTriggerMaintenance(m: Machine) {
        setTriggeringMaintenance(true);
        try {
            const res = await gmaoApi.triggerMaintenance(m.id);
            // Refresh both machine list + OT list for this machine
            await fetchMachines();
            const updatedMachine = machines.find(mac => mac.id === m.id) || m;
            const orders = await gmaoApi.getMachineWorkOrders(m.id);
            setMachineOrders(orders);
            // Update selection with new dates
            const freshRes = await import('@/services/api').then(mod => mod.default.get('/machines'));
            const freshMachine = freshRes.data.find((mac: Machine) => mac.id === m.id);
            if (freshMachine) setSelectedMachine(freshMachine);
            const event = new CustomEvent('api:success', { detail: `OT préventif créé (${res.sap_order_id})` });
            window.dispatchEvent(event);
        } catch (err) {
            console.error('Trigger maintenance failed', err);
        } finally {
            setTriggeringMaintenance(false);
        }
    };



    const fetchMachines = async () => {
        setLoading(true);
        try {
            const data = await gmaoApi.getMachines();
            setMachines(data);
        } catch (err) {
            console.error("Erreur chargement machines:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMachines();
    }, []);

    const filteredMachines = machines.filter(m => {
        const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.reference.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStatusInfo = (status: Status) => {
        switch (status) {
            case 'operational': return { label: 'Opérationnel', color: 'text-emerald-400', bg: 'bg-emerald-400/10', icon: Activity };
            case 'maintenance': return { label: 'Maintenance', color: 'text-amber-400', bg: 'bg-amber-400/10', icon: Wrench };
            case 'breakdown': return { label: 'En Panne', color: 'text-rose-400', bg: 'bg-rose-400/10', icon: AlertCircle };
        }
    };

    const getHealthColor = (score: number) => {
        if (score >= 80) return 'from-emerald-500 to-teal-400';
        if (score >= 50) return 'from-amber-500 to-orange-400';
        return 'from-rose-600 to-pink-500';
    };

    const getMaintenanceBadge = (nextDate?: string) => {
        if (!nextDate) return { label: 'Non planifiée', color: 'text-slate-500', bg: 'bg-slate-500/10' };
        const date = new Date(nextDate);
        const today = new Date();
        const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 3600 * 24));

        if (diffDays < 0) return { label: 'En retard', color: 'text-rose-400', bg: 'bg-rose-500/10' };
        if (diffDays <= 7) return { label: 'Imminente', color: 'text-amber-400', bg: 'bg-amber-500/10' };
        return { label: `Prévue le ${date.toLocaleDateString('fr-FR')}`, color: 'text-blue-400', bg: 'bg-blue-500/10' };
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="page-header px-2 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent tracking-tight">Parc Machines</h1>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Inventaire et État de Santé des Équipements (Source SAP)</p>
                </div>
                <button
                    onClick={handleSyncSAP}
                    disabled={isSyncing}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-blue-500/30 text-white font-black uppercase text-xs tracking-widest transition-all group disabled:opacity-50"
                >
                    <RefreshCw size={16} className={`${isSyncing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                    {isSyncing ? 'Synchronisation...' : 'Synchroniser SAP'}
                </button>
            </header>

            {/* Controls Bar */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Rechercher par nom ou référence..."
                        className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-sm font-medium focus:outline-none focus:border-blue-500/50 focus:bg-slate-900 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 min-w-[200px]">
                    <div className="relative flex-1">
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <select
                            className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-3 pl-12 pr-10 text-sm font-medium focus:outline-none appearance-none cursor-pointer"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">Tous les Statuts</option>
                            <option value="operational">Opérationnel</option>
                            <option value="maintenance">Maintenance</option>
                            <option value="breakdown">En Panne</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Machines Table */}
            <div className="azure-card p-0 overflow-hidden">
                <div className="azure-table-wrap">
                    <table className="azure-table">
                        <thead>
                            <tr>
                                <th>Équipement</th>
                                <th>Localisation</th>
                                <th>Maintenance</th>
                                <th>État Santé</th>
                                <th>Statut</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array(5).fill(0).map((_, idx) => (
                                    <tr key={idx} className="animate-pulse">
                                        <td colSpan={6} className="py-8"><div className="h-4 bg-white/5 rounded-full w-3/4 mx-auto"></div></td>
                                    </tr>
                                ))
                            ) : filteredMachines.length > 0 ? filteredMachines.map((m) => {
                                const status = getStatusInfo(m.status);
                                return (
                                    <tr key={m.id}
                                        onClick={() => handleSelectMachine(m)}
                                        className={`group transition-all cursor-pointer ${selectedMachine?.id === m.id ? 'bg-blue-600/10 border-blue-500/20' : 'hover:bg-white/5'}`}
                                    >
                                        <td>
                                            <div className="flex items-center gap-4">
                                                <div className="size-12 rounded-xl bg-slate-800 flex items-center justify-center border border-white/5 shadow-inner">
                                                    <Wrench size={20} className="text-blue-400" />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-white group-hover:text-blue-400 transition-colors uppercase tracking-tight">{m.name}</div>
                                                    <div className="text-[0.7rem] font-bold text-slate-500 uppercase tracking-widest mt-1">{m.reference}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2 text-slate-400">
                                                <MapPin size={14} className="text-slate-600" />
                                                <span className="font-medium">{m.location}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex flex-col gap-1 items-start">
                                                {(() => {
                                                    const badge = getMaintenanceBadge(m.next_maintenance_date);
                                                    return (
                                                        <div className={`px-2 py-0.5 rounded-md text-[0.6rem] font-black uppercase tracking-widest ${badge.bg} ${badge.color}`}>
                                                            {badge.label}
                                                        </div>
                                                    );
                                                })()}
                                                {m.last_maintenance_date && (
                                                    <div className="text-[0.55rem] text-slate-500 uppercase font-bold tracking-widest pl-1 mt-0.5">
                                                        Dernière: {new Date(m.last_maintenance_date).toLocaleDateString('fr-FR')}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex flex-col gap-2 w-32">
                                                <div className="flex items-center justify-between">
                                                    <span className={`text-[0.65rem] font-black uppercase tracking-widest ${m.health_score > 50 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                        {m.health_score}%
                                                    </span>
                                                    {m.health_score > 80 ? <TrendingUp size={10} className="text-emerald-500" /> : <TrendingDown size={10} className="text-rose-500" />}
                                                </div>
                                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full bg-gradient-to-r ${getHealthColor(m.health_score)} rounded-full transition-all duration-1000`}
                                                        style={{ width: `${m.health_score}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className={`azure-badge ${status.bg} ${status.color}`}>
                                                <status.icon size={12} />
                                                <span className="uppercase tracking-widest font-black leading-none">{status.label}</span>
                                            </div>
                                        </td>
                                        <td className="text-right">
                                            <div className="flex items-center justify-end gap-2 pr-2">
                                                <div className="size-9 rounded-lg bg-white/5 text-slate-600 flex items-center justify-center">
                                                    <ChevronRight size={16} />
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            }) : (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center text-slate-500 italic font-medium">
                                        Aucune machine trouvée
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Side Panel: Machine History ── */}
            {selectedMachine && (
                <div
                    className="fixed inset-y-0 right-0 z-[150] w-[450px] bg-slate-950/80 backdrop-blur-xl border-l border-white/5 shadow-[-20px_0_50px_rgba(0,0,0,0.5)] animate-in slide-in-from-right duration-500 flex flex-col"
                >
                    <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-900/40">
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                                <History size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-white tracking-tight leading-none uppercase">{selectedMachine.name}</h3>
                                <p className="text-[0.65rem] font-bold text-slate-500 tracking-[0.2em] mt-1">{selectedMachine.reference}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setSelectedMachine(null)}
                            className="size-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
                        {/* Machine KPIs */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="azure-card p-4 flex flex-col items-center justify-center text-center gap-1 bg-blue-500/5">
                                <div className="text-2xl font-black text-white">{machineOrders.length}</div>
                                <div className="text-[0.55rem] font-bold text-slate-500 uppercase tracking-widest">Interventions</div>
                            </div>
                            <div className="azure-card p-4 flex flex-col items-center justify-center text-center gap-1 bg-emerald-500/5">
                                <div className="text-2xl font-black text-white">{machineOrders.filter(o => o.status === 'done').length}</div>
                                <div className="text-[0.55rem] font-bold text-slate-500 uppercase tracking-widest">Réussies</div>
                            </div>
                        </div>

                        {/* Timeline */}
                        <div>
                            <div className="flex items-center gap-2 mb-6 uppercase tracking-[0.2em] text-[0.65rem] font-black text-slate-500">
                                <Activity size={14} className="text-blue-400" />
                                Historique des Interventions
                            </div>

                            {loadingOrders ? (
                                <div className="space-y-4">
                                    {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse" />)}
                                </div>
                            ) : machineOrders.length > 0 ? (
                                <div className="space-y-4 relative pl-4 border-l border-white/5 ml-1">
                                    {machineOrders.map((o) => (
                                        <div key={o.id} className="relative group/item">
                                            <div className="absolute -left-[21px] top-6 size-2.5 rounded-full bg-slate-900 border border-blue-500/50 group-hover/item:bg-blue-500 transition-colors" />
                                            <div
                                                onClick={() => router.push(`/work-orders/${o.id}`)}
                                                className="bg-white/5 border border-white/5 hover:border-blue-500/30 hover:bg-white/10 p-4 rounded-xl transition-all cursor-pointer group"
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-[0.6rem] font-black text-blue-400 uppercase tracking-widest">#{o.sap_order_id || o.id}</span>
                                                    <span className="text-[0.55rem] font-bold text-slate-500 flex items-center gap-1">
                                                        <Calendar size={10} /> {o.planned_start_date}
                                                    </span>
                                                </div>
                                                <h4 className="text-sm font-bold text-white mb-2 leading-snug group-hover:text-blue-400 transition-colors">{o.title}</h4>
                                                <div className="flex items-center justify-between">
                                                    <div className={`px-2 py-0.5 rounded-md text-[0.55rem] font-black uppercase tracking-widest ${o.status === 'done' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                                                        }`}>
                                                        {o.status === 'done' ? 'Terminé' : 'En cours'}
                                                    </div>
                                                    <ArrowUpRight size={14} className="text-slate-600 opacity-0 group-hover:opacity-100 transition-all" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 px-6 azure-card bg-slate-900/20 border-dashed border-2">
                                    <ClipboardList size={32} className="mx-auto text-slate-700 mb-4" />
                                    <p className="text-xs font-bold text-slate-500 italic uppercase tracking-widest">Aucune intervention enregistrée pour cette machine.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-6 bg-slate-900/60 border-t border-white/5 space-y-3">
                        {/* Maintenance Preventive Section */}
                        <div className="azure-card p-4 bg-violet-500/5 border-violet-500/20">
                            <div className="flex items-center gap-2 mb-3">
                                <CalendarClock size={16} className="text-violet-400" />
                                <span className="text-[0.65rem] font-black text-violet-400 uppercase tracking-widest">Plan Préventif</span>
                            </div>
                            <div className="flex justify-between items-center text-xs mb-3">
                                <div>
                                    <div className="text-[0.6rem] font-bold text-slate-500 uppercase mb-0.5">Fréquence</div>
                                    <div className="font-black text-white">Tous les {selectedMachine.maintenance_frequency_days || 90}j</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[0.6rem] font-bold text-slate-500 uppercase mb-0.5">Prochaine</div>
                                    <div className={`font-black ${selectedMachine.next_maintenance_date && new Date(selectedMachine.next_maintenance_date) < new Date() ? 'text-rose-400' : 'text-white'}`}>
                                        {selectedMachine.next_maintenance_date
                                            ? new Date(selectedMachine.next_maintenance_date).toLocaleDateString('fr-FR')
                                            : 'Non planifiée'
                                        }
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => handleTriggerMaintenance(selectedMachine)}
                                disabled={triggeringMaintenance}
                                className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-black uppercase text-xs tracking-[0.15em] transition-all flex items-center justify-center gap-2"
                            >
                                <Zap size={14} />
                                {triggeringMaintenance ? 'Création...' : 'Déclencher OT Préventif'}
                            </button>
                        </div>
                        <button
                            onClick={() => router.push(`/work-orders/new?machine=${selectedMachine.reference}`)}
                            className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-xs tracking-[0.2em] shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 group"
                        >
                            <Plus size={16} /> Créer une Intervention
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
