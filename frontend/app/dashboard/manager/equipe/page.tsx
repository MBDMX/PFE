'use client';

import { useState, useEffect } from 'react';
import { 
    Users, User, CheckCircle, Clock, AlertTriangle, 
    TrendingUp, ClipboardList, ChevronRight, Search,
    Filter, ArrowRight, Activity, X, Layers, Zap,
    ChevronDown, UserCheck
} from 'lucide-react';
import { gmaoApi } from '../../../../services/api';
import KPICard from '../_components/KPICard';
import ComparisonOverlay from './_components/ComparisonOverlay';

interface Technician {
    id: number;
    username: string;
    name: string;
    email: string;
}

interface TechStats {
    totalAssigned: number;
    doneOT: number;
    openOT: number;
    inProgressOT: number;
    overdueOT: number;
    completionRate: number;
    avgRepairTime: number;
}

export default function TeamSupervisionPage() {
    const [technicians, setTechnicians] = useState<Technician[]>([]);
    const [selectedTechId, setSelectedTechId] = useState<number | null>(null);
    const [stats, setStats] = useState<TechStats | null>(null);
    const [workOrders, setWorkOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingDetails, setLoadingDetails] = useState(false);
    
    // Comparison State
    const [isComparing, setIsComparing] = useState(false);

    useEffect(() => {
        loadTechnicians();
    }, []);

    useEffect(() => {
        if (selectedTechId) {
            loadTechDetails(selectedTechId);
        } else {
            setStats(null);
            setWorkOrders([]);
        }
    }, [selectedTechId]);

    async function loadTechnicians() {
        try {
            const data = await gmaoApi.getManagerTechnicians();
            setTechnicians(data);
        } catch (error) {
            console.error("Failed to load technicians", error);
        } finally {
            setLoading(false);
        }
    }

    async function loadTechDetails(id: number) {
        setLoadingDetails(true);
        try {
            const [s, w] = await Promise.all([
                gmaoApi.getTechnicianStats(id),
                gmaoApi.getTechnicianWorkOrders(id)
            ]);
            setStats(s);
            setWorkOrders(w);
        } catch (error) {
            console.error("Failed to load tech details", error);
        } finally {
            setLoadingDetails(false);
        }
    }

    const selectedTech = technicians.find(t => t.id === selectedTechId);

    // Dropdown State
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8 pb-10">
            {/* ── Header ── */}
            <header className="page-header px-2 flex justify-between items-center sm:flex-row flex-col gap-4">
                <div>
                    <h1 className="text-3xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent tracking-tight">
                        Supervision Équipe
                    </h1>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">
                        Performance & Suivi (Vue d&apos;ensemble)
                    </p>
                </div>
                
                {/* ── Custom Dropdown Selector ── */}
                <div className="relative w-full sm:w-80 z-[100]">
                    <button 
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className={`w-full flex items-center justify-between px-6 py-4 rounded-3xl border transition-all duration-500 group ${
                            selectedTechId 
                                ? 'bg-violet-600/30 border-violet-500/50 text-white shadow-2xl shadow-violet-500/20' 
                                : 'bg-slate-900 border-white/5 text-slate-400 hover:border-white/20'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`size-10 rounded-2xl flex items-center justify-center font-black text-xs transition-colors ${
                                selectedTechId ? 'bg-violet-500 text-white' : 'bg-slate-800 text-slate-600'
                            }`}>
                                {selectedTech ? selectedTech.name?.charAt(0) : <Users size={18} />}
                            </div>
                            <div className="text-left">
                                <span className="text-[0.65rem] block font-black text-slate-500 uppercase tracking-[0.2em] leading-none mb-1">
                                    Technicien
                                </span>
                                <span className="text-xs font-black uppercase tracking-widest truncate max-w-[150px]">
                                    {selectedTech ? selectedTech.name : 'Choisir dans la liste'}
                                </span>
                            </div>
                        </div>
                        <ChevronDown size={20} className={`transition-transform duration-500 ${isDropdownOpen ? 'rotate-180' : ''} text-slate-500`} />
                    </button>

                    {isDropdownOpen && (
                        <div className="absolute top-[calc(100%+12px)] left-0 right-0 bg-slate-900/95 backdrop-blur-3xl border border-white/10 rounded-[2rem] overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 duration-300">
                            <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-2">
                                {technicians.map((tech) => (
                                    <button
                                        key={tech.id}
                                        onClick={() => {
                                            setSelectedTechId(tech.id);
                                            setIsDropdownOpen(false);
                                        }}
                                        className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-all rounded-2xl hover:bg-white/5 group/item ${
                                            selectedTechId === tech.id ? 'bg-violet-500/20 text-violet-400 border border-violet-500/20' : 'text-slate-400 border border-transparent'
                                        }`}
                                    >
                                        <div className={`size-10 rounded-xl flex items-center justify-center font-black text-xs transition-all ${
                                            selectedTechId === tech.id ? 'bg-violet-500 text-white' : 'bg-slate-800 text-slate-600 group-hover/item:bg-slate-700'
                                        }`}>
                                            {tech.name?.charAt(0)}
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-[0.7rem] font-black uppercase tracking-widest">{tech.name || tech.username}</div>
                                            <div className="text-[0.6rem] font-bold opacity-40 uppercase tracking-[0.2em] mt-1">Matricule: {tech.id}</div>
                                        </div>
                                        {selectedTechId === tech.id && (
                                            <div className="size-6 rounded-full bg-violet-500/20 flex items-center justify-center">
                                                <UserCheck size={12} className="text-violet-400" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {selectedTech && stats ? (
                <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
                    {/* ── KPI Row ── */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <KPICard 
                            label="Taux de Réussite" 
                            value={`${stats.completionRate}%`} 
                            sub={`${stats.doneOT} / ${stats.totalAssigned} terminés`} 
                            icon={CheckCircle} 
                            color="emerald" 
                        />
                        <KPICard 
                            label="OT en Retard" 
                            value={stats.overdueOT} 
                            sub="Action requise immédiate" 
                            icon={AlertTriangle} 
                            color="rose" 
                            alert={stats.overdueOT > 0}
                        />
                        <KPICard 
                            label="Tps Moyen Réparation" 
                            value={`${stats.avgRepairTime}h`} 
                            sub="Basé sur les OT clos" 
                            icon={Clock} 
                            color="blue" 
                        />
                        <KPICard 
                            label="Charge Actuelle" 
                            value={stats.openOT + stats.inProgressOT} 
                            sub={`${stats.inProgressOT} en cours d'exécution`} 
                            icon={Activity} 
                            color="violet" 
                        />
                    </div>

                    {/* ── Main Content Grid ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Column: OT Table */}
                        <div className="lg:col-span-2 space-y-4">
                            <div className="flex items-center justify-between px-2">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <ClipboardList size={20} className="text-violet-400" />
                                    Missions Assignées
                                </h3>
                                <div className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest">
                                    {workOrders.length} ordres
                                </div>
                            </div>
                            
                            <div className="azure-card overflow-hidden">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-white/5 bg-white/5">
                                            <th className="px-6 py-4 text-[0.65rem] font-black text-slate-500 uppercase tracking-widest">SAP ID</th>
                                            <th className="px-6 py-4 text-[0.65rem] font-black text-slate-500 uppercase tracking-widest">Objet</th>
                                            <th className="px-6 py-4 text-[0.65rem] font-black text-slate-500 uppercase tracking-widest text-right">Statut</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {workOrders.slice(0, 5).map((wo) => (
                                            <tr key={wo.id} className="hover:bg-white/5 transition-colors">
                                                <td className="px-6 py-4 text-xs font-black text-blue-400 font-mono tracking-tighter">{wo.sap_order_id}</td>
                                                <td className="px-6 py-4 text-sm font-bold text-slate-200">{wo.title}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className={`text-[0.6rem] font-black px-2 py-1 rounded-md uppercase tracking-tight ${
                                                        wo.status === 'done' ? 'bg-emerald-500/10 text-emerald-500' :
                                                        wo.status === 'in_progress' ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-500/10 text-slate-400'
                                                    }`}>
                                                        {wo.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Right Column: Mini Profile & Compare */}
                        <div className="space-y-6">
                            <div className="azure-card p-6 bg-gradient-to-br from-slate-900 to-indigo-950/30">
                                <div className="flex flex-col items-center text-center">
                                    <div className="size-20 rounded-3xl bg-violet-600 flex items-center justify-center text-3xl font-black text-white mb-4">
                                        {selectedTech.name?.charAt(0) || selectedTech.username.charAt(0)}
                                    </div>
                                    <h3 className="text-xl font-black text-white">{selectedTech.name}</h3>
                                    <p className="text-xs font-bold text-slate-500 uppercase mt-1 tracking-widest">{selectedTech.email}</p>
                                </div>
                                <div className="mt-8 space-y-3">
                                    <button 
                                        onClick={() => setIsComparing(true)}
                                        className="w-full py-4 bg-violet-600 hover:bg-violet-500 text-white text-xs font-black uppercase tracking-[0.2em] rounded-xl shadow-lg shadow-violet-600/20 transition-all flex items-center justify-center gap-2 group"
                                    >
                                        <Layers size={16} />
                                        Comparer Performance
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center min-h-[300px] azure-card p-12 bg-white/5 border-dashed border-2 m-2">
                    <User size={48} className="text-slate-800 mb-4" />
                    <h3 className="text-xl font-black text-white uppercase tracking-tight">Aucun Technicien Sélectionné</h3>
                    <p className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-[0.2em] mt-3 text-center">
                        Choisissez un membre de l&apos;équipe pour démarrer la supervision.
                    </p>
                </div>
            )}

            {/* ── Comparison Mode Overlay ── */}
            {isComparing && (
                <ComparisonOverlay 
                    technicians={technicians}
                    tech1={selectedTech!}
                    onClose={() => setIsComparing(false)}
                />
            )}
        </div>
    );
}
