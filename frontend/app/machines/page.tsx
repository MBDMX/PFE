'use client';
import { useState, useEffect } from 'react';
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
  X
} from 'lucide-react';
import api from '@/services/api';

type Status = 'operational' | 'maintenance' | 'breakdown';
type Machine = { 
  id: number; 
  name: string; 
  reference: string; 
  location: string; 
  status: Status; 
  health_score: number 
};

export default function MachinesPage() {
    const [machines, setMachines] = useState<Machine[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        reference: '',
        location: '',
        status: 'operational' as Status,
        health_score: 100
    });

    const fetchMachines = async () => {
        setLoading(true);
        try {
            const res = await api.get('/machines');
            setMachines(res.data);
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
        switch(status) {
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

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="page-header px-2">
                <div>
                  <h1 className="text-3xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent tracking-tight">Parc Machines</h1>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Inventaire et État de Santé des Équipements</p>
                </div>
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
                                <th>État Santé</th>
                                <th>Statut</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array(5).fill(0).map((_, idx) => (
                                    <tr key={idx} className="animate-pulse">
                                        <td colSpan={5} className="py-8"><div className="h-4 bg-white/5 rounded-full w-3/4 mx-auto"></div></td>
                                    </tr>
                                ))
                            ) : filteredMachines.length > 0 ? filteredMachines.map((m) => {
                                const status = getStatusInfo(m.status);
                                return (
                                    <tr key={m.id} className="group transition-colors">
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
                                            <div className="flex flex-col gap-2 w-32">
                                                <div className="flex items-center justify-between">
                                                    <span className={`text-[0.65rem] font-black uppercase tracking-widest ${m.health_score > 50 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                        {m.health_score}%
                                                    </span>
                                                    {m.health_score > 80 ? <TrendingUp size={10} className="text-emerald-500"/> : <TrendingDown size={10} className="text-rose-500"/>}
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
                                                <button className="size-9 rounded-lg bg-white/5 hover:bg-blue-600/20 text-slate-400 hover:text-blue-400 flex items-center justify-center transition-all">
                                                    <Edit2 size={16} />
                                                </button>
                                                <button className="size-9 rounded-lg bg-white/5 hover:bg-rose-600/20 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-all">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            }) : (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center text-slate-500 italic font-medium">
                                        Aucune machine trouvée
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal - Professional Azure Style */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="azure-card w-full max-w-lg shadow-[0_30px_100px_rgba(0,0,0,0.6)] translate-y-0 scale-100 animate-in zoom-in-95 duration-300">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-black text-white tracking-widest uppercase">Machine <span className="text-blue-500 underline decoration-4 underline-offset-8">Draft</span></h2>
                            <button onClick={() => setIsModalOpen(false)} className="size-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                                <X size={20} className="text-slate-400" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[0.65rem] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Nom de l'équipement</label>
                                <input className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all font-bold" placeholder="ex: Compresseur d'air 150L" />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[0.65rem] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Référence</label>
                                    <input className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all font-bold" placeholder="ex: COMP-001" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[0.65rem] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">État (%)</label>
                                    <input type="number" className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all font-bold" defaultValue="100" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[0.65rem] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Localisation</label>
                                <input className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all font-bold" placeholder="ex: Atelier Nord - Zone A" />
                            </div>

                            <div className="pt-6 flex gap-3">
                                <button className="flex-1 py-4 rounded-xl bg-white/5 text-slate-400 font-black uppercase text-xs tracking-widest hover:bg-white/10 transition-all" onClick={() => setIsModalOpen(false)}>Annuler</button>
                                <button className="flex-[2] py-4 rounded-xl bg-blue-600 text-white font-black uppercase text-xs tracking-widest shadow-lg shadow-blue-600/30 hover:scale-[1.02] active:scale-95 transition-all">Enregistrer l'équipement</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
