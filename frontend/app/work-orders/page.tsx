'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Search, 
  Filter, 
  ClipboardList, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Activity,
  User,
  Calendar,
  ArrowUpRight,
  Trash2,
  X,
  ChevronRight
} from 'lucide-react';
import { gmaoApi } from '@/services/api';

type Priority = 'low' | 'medium' | 'high' | 'critical';
type WOStatus = 'open' | 'in_progress' | 'done' | 'closed';
type WorkOrder = { 
  id: number; 
  sap_order_id: string;
  title: string; 
  equipment_id: string; 
  technician_id: number | null; 
  priority: Priority; 
  status: WOStatus; 
  planned_start_date: string 
};

export default function WorkOrdersPage() {
    const [orders, setOrders] = useState<WorkOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const router = useRouter();

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const data = await gmaoApi.getWorkOrders();
            setOrders(data);
        } catch (err) {
            console.error("Erreur chargement interventions:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const filteredOrders = orders.filter(o => {
        const matchesSearch = o.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStatusStyle = (status: WOStatus) => {
        switch(status) {
            case 'open':        return { label: 'Ouvert',    color: 'text-amber-400',   bg: 'bg-amber-400/10',   icon: Clock };
            case 'in_progress': return { label: 'En cours',  color: 'text-blue-400',    bg: 'bg-blue-400/10',    icon: Activity };
            case 'done':        return { label: 'Terminé',   color: 'text-emerald-400', bg: 'bg-emerald-400/10', icon: CheckCircle };
            case 'closed':      return { label: 'Clôturé',   color: 'text-slate-500',   bg: 'bg-slate-500/10',   icon: X };
            default:            return { label: 'Inconnu',   color: 'text-slate-400',   bg: 'bg-slate-400/10',   icon: AlertTriangle };
        }
    };

    const getPriorityStyle = (priority: Priority) => {
        switch(priority) {
            case 'low': return 'border-slate-500/30 text-slate-400';
            case 'medium': return 'border-blue-500/30 text-blue-400';
            case 'high': return 'border-orange-500/30 text-orange-400';
            case 'critical': return 'border-rose-500/40 text-rose-400 bg-rose-500/5';
        }
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="page-header px-2">
                <div>
                  <h1 className="text-3xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent tracking-tight">Ordre de travail</h1>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Gestion des Ordres de Travail et Maintenance</p>
                </div>
                <button 
                  onClick={() => router.push('/work-orders/new')}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-blue-600/20 transition-all hover:scale-105 active:scale-95"
                >
                  <Plus size={20} strokeWidth={3} />
                  <span>Nouvel Ordre de Travail</span>
                </button>
            </header>

            {/* Quick Stats Banner */}
            <div className="flex flex-wrap gap-4 mb-8">
                <div className="azure-card flex-1 py-4 px-6 flex items-center gap-4 bg-amber-500/5 border-amber-500/20">
                    <div className="size-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500"><Clock size={20}/></div>
                    <div><div className="text-xl font-black">{orders.filter(o => o.status === 'open').length}</div><div className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest">En Attente</div></div>
                </div>
                <div className="azure-card flex-1 py-4 px-6 flex items-center gap-4 bg-blue-500/5 border-blue-500/20">
                    <div className="size-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500"><Activity size={20}/></div>
                    <div><div className="text-xl font-black">{orders.filter(o => o.status === 'in_progress').length}</div><div className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest">En Cours</div></div>
                </div>
                <div className="azure-card flex-1 py-4 px-6 flex items-center gap-4 bg-emerald-500/5 border-emerald-500/20">
                    <div className="size-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500"><CheckCircle size={20}/></div>
                    <div><div className="text-xl font-black">{orders.filter(o => o.status === 'done').length}</div><div className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest">Terminés</div></div>
                </div>
            </div>

            {/* Controls Bar */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={18} />
                    <input 
                        type="text" 
                        placeholder="Rechercher une intervention..."
                        className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-sm font-medium focus:outline-none focus:border-blue-500/50 focus:bg-slate-900 transition-all font-outfit"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 min-w-[200px]">
                    <select 
                        className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-3 px-6 text-sm font-bold text-slate-400 focus:outline-none appearance-none cursor-pointer uppercase tracking-widest"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="all">Tous les Statuts</option>
                        <option value="open">Ouvert</option>
                        <option value="in_progress">En Cours</option>
                        <option value="done">Terminé</option>
                        <option value="closed">Clôturé</option>
                    </select>
                </div>
            </div>

            {/* Work Orders Table */}
            <div className="azure-card p-0 overflow-hidden shadow-2xl">
                <div className="azure-table-wrap">
                    <table className="azure-table">
                        <thead>
                            <tr>
                                <th>Intervention</th>
                                <th>Priorité</th>
                                <th>Assigné à</th>
                                <th>Statut</th>
                                <th>Échéance</th>
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
                            ) : filteredOrders.length > 0 ? filteredOrders.map((o) => {
                                const status = getStatusStyle(o.status);
                                return (
                                    <tr key={o.id} className="group transition-colors">
                                        <td>
                                            <div className="flex items-center gap-4">
                                                <div className="size-10 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                                                    <ClipboardList size={20} />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-white group-hover:text-blue-400 transition-colors uppercase tracking-tight text-sm">#{o.sap_order_id || o.id} - {o.title}</div>
                                                    <div className="text-[0.7rem] font-bold text-slate-500 uppercase tracking-widest mt-1">Machine: {o.equipment_id}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className={`px-2 py-1 rounded-md border text-[0.65rem] font-black uppercase tracking-widest inline-block ${getPriorityStyle(o.priority)}`}>
                                                {o.priority}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2 text-slate-400">
                                                <User size={14} className="text-slate-600" />
                                                <span className="font-bold text-xs uppercase tracking-tight">Tech ID: {o.technician_id || '--'}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className={`azure-badge ${status.bg} ${status.color}`}>
                                                <status.icon size={12} />
                                                <span className="uppercase tracking-widest font-black leading-none">{status.label}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2 text-slate-500 font-bold text-[0.7rem] uppercase tracking-widest">
                                                <Calendar size={12} />
                                                {o.planned_start_date}
                                            </div>
                                        </td>
                                        <td className="text-right">
                                            <div className="flex items-center justify-end gap-2 pr-2">
                                                <button 
                                                    onClick={() => router.push(`/work-orders/${o.id}`)}
                                                    title="Voir les détails"
                                                    className="size-9 rounded-lg bg-white/5 hover:bg-blue-600/20 text-slate-400 hover:text-blue-400 flex items-center justify-center transition-all"
                                                >
                                                    <ArrowUpRight size={14} />
                                                </button>
                                                <button className="size-9 rounded-lg bg-white/5 hover:bg-rose-600/20 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-all">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            }) : (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center text-slate-500 italic font-medium">
                                        Aucun ordre de travail trouvé
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
        </div>
    );
}
