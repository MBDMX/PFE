'use client';
import { useEffect, useState } from 'react';
import { 
  Wrench, 
  ClipboardList, 
  Package, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  Activity,
  ArrowUpRight,
  MoreVertical,
  Calendar,
  Clock
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid 
} from 'recharts';
import api from '@/services/api';

// Realistic Mock Chart Data (Simulated maintenance activity)
const chartData = [
    { label: 'Jan', value: 12 }, { label: 'Fév', value: 34 }, { label: 'Mar', value: 28 },
    { label: 'Avr', value: 56 }, { label: 'Mai', value: 45 }, { label: 'Jun', value: 78 },
    { label: 'Jul', value: 65 }, { label: 'Aoû', value: 89 }, { label: 'Sep', value: 72 },
];

export default function AdminDashboard() {
    const [stats, setStats] = useState<any>(null);
    const [recentOrders, setRecentOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                // Fetch Stats
                const statsRes = await api.get('/stats');
                setStats(statsRes.data);
                
                // Fetch Recent Work Orders
                const woRes = await api.get('/work-orders');
                setRecentOrders(woRes.data.slice(0, 5)); // Just the last 5
            } catch (err) {
                console.error("Erreur chargement dashboard:", err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const statCards = [
        { label: 'Total Machines', value: stats?.totalMachines || 0, icon: Wrench, color: '#3b82f6' },
        { label: 'Ordres de travail', value: stats?.openOrders || 0, icon: ClipboardList, color: '#f59e0b' },
        { label: 'Stock Critique', value: stats?.lowStock || 0, icon: AlertTriangle, color: '#ef4444' },
        { label: 'Techniciens', value: stats?.totalTechnicians || 0, icon: Users, color: '#10b981' },
    ];

    if (loading) return (
        <div className="flex h-[80vh] items-center justify-center">
            <div className="animate-spin size-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full" />
        </div>
    );

    return (
        <div className="animate-in fade-in duration-700">
            <header className="page-header px-2">
                <div>
                  <h1 className="text-3xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent tracking-tight">Vue Globale</h1>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Plateforme de Gestion Azure Excellence</p>
                </div>
                <div className="flex items-center gap-4 bg-white/5 backdrop-blur-xl border border-white/5 px-6 py-3 rounded-2xl shadow-xl">
                  <Activity size={20} className="text-blue-500 animate-pulse" />
                  <span className="text-sm font-bold text-blue-400">Système Opérationnel</span>
                </div>
            </header>

            {/* Stats Overview */}
            <div className="stats-grid mb-10">
                {statCards.map((s, idx) => (
                    <div key={idx} className="azure-card flex flex-col justify-between group">
                        <div className="flex items-start justify-between mb-4">
                            <div className="stat-icon-wrap" style={{ background: `${s.color}15` }}>
                                <s.icon size={24} style={{ color: s.color }} strokeWidth={2.5} />
                            </div>
                            <div className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-lg">
                                <TrendingUp size={12} />
                                +12%
                            </div>
                        </div>
                        <div>
                            <div className="stat-value text-white group-hover:scale-105 transition-transform origin-left">{s.value}</div>
                            <div className="stat-label text-slate-500 font-bold tracking-widest text-[0.7rem] uppercase mt-2">{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Main Maintenance Activity Chart */}
                <div className="xl:col-span-2 azure-card overflow-hidden">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h2 className="text-xl font-black text-white px-2">Activité de Maintenance</h2>
                        <span className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-[0.2em] px-2 mt-1 block">Rapport de performance mensuel</span>
                      </div>
                      <div className="flex gap-2 p-1 bg-slate-900/50 rounded-xl border border-white/5 invisible sm:visible">
                        <button className="px-3 py-1 text-[0.65rem] font-bold rounded-lg bg-blue-600 shadow-lg shadow-blue-500/30">Semaine</button>
                        <button className="px-3 py-1 text-[0.65rem] font-bold rounded-lg text-slate-500 hover:text-white transition-colors">Mois</button>
                      </div>
                    </div>
                    
                    <div className="h-[300px] w-full mt-4 pr-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis 
                                    dataKey="label" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
                                />
                                <Tooltip 
                                    contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
                                    itemStyle={{ color: '#60a5fa', fontWeight: 'bold' }}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="value" 
                                    stroke="#3b82f6" 
                                    strokeWidth={4}
                                    fillOpacity={1} 
                                    fill="url(#colorVal)" 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Recent Activities List */}
                <div className="azure-card flex flex-col h-full">
                    <div className="flex items-center justify-between mb-8 px-1">
                      <h2 className="text-xl font-black text-white">Ordres de Travail</h2>
                      <button className="size-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                        <ArrowUpRight size={16} className="text-blue-400" />
                      </button>
                    </div>

                    <div className="space-y-4 flex-1">
                        {recentOrders.length > 0 ? recentOrders.map((wo, i) => (
                          <div key={i} className="group p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-blue-500/30 hover:bg-white/[0.08] transition-all cursor-pointer">
                            <div className="flex items-start justify-between mb-3">
                              <h3 className="font-bold text-sm text-white group-hover:text-blue-400 transition-colors">{wo.title}</h3>
                              <MoreVertical size={14} className="text-slate-600" />
                            </div>
                            <div className="flex items-center gap-3">
                              <div className={`azure-badge ${wo.status === 'done' ? 'badge-done' : wo.status === 'in_progress' ? 'badge-progress' : 'badge-pending'}`}>
                                {wo.status === 'done' ? <CheckCircle size={10}/> : wo.status === 'in_progress' ? <Activity size={10}/> : <Clock size={10}/>}
                                <span className="uppercase tracking-[0.05em]">{wo.status}</span>
                              </div>
                              <div className="flex items-center gap-2 text-[0.7rem] font-bold text-slate-500 uppercase tracking-widest">
                                <Calendar size={12} strokeWidth={2.5}/>
                                {wo.due_date}
                              </div>
                            </div>
                          </div>
                        )) : (
                          <div className="h-40 flex flex-col items-center justify-center text-slate-600 italic text-sm">
                            <ClipboardList size={32} className="mb-2 opacity-20" />
                            Aucune activité récente
                          </div>
                        )}
                    </div>
                    
                    <button className="w-full mt-6 py-3 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest hover:bg-blue-600/20 transition-all">
                      Voir tous les ordres
                    </button>
                </div>
            </div>
            
            {/* Global View Bottom Section (Quick Overview) */}
            <div className="mt-8 azure-card border-none bg-gradient-to-r from-blue-600/20 to-indigo-600/20 overflow-hidden relative">
              <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 p-2">
                <div className="size-16 rounded-3xl bg-blue-500 flex items-center justify-center text-white shadow-2xl shadow-blue-500/50">
                  <Activity size={32} strokeWidth={2.5} />
                </div>
                <div className="text-center md:text-left">
                  <h4 className="text-lg font-black text-white">Analyse de Performance Optimale</h4>
                  <p className="text-sm text-slate-400 font-medium">Le système a maintenu une disponibilité de <span className="text-blue-400 font-bold whitespace-nowrap">98.4%</span> au cours des 30 derniers jours.</p>
                </div>
                <button className="md:ml-auto px-8 py-3 bg-white text-blue-900 font-black rounded-2xl text-xs uppercase tracking-widest hover:scale-105 transition-transform shadow-xl shadow-white/10">
                  Générer Rapport
                </button>
              </div>
              <div className="absolute top-0 right-0 size-60 bg-blue-500/20 blur-[100px] rounded-full -mr-20 -mt-20"></div>
            </div>
        </div>
    );
}
