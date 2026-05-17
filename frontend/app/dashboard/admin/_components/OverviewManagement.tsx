import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, Wrench, Users, Package, RefreshCw, 
  Activity, Bell, Loader2, TrendingUp 
} from 'lucide-react'; // Icônes vectorielles esthétiques
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts'; // Librairie de graphiques interactifs Recharts
import { gmaoApi } from '../../../../services/api';
import { StatCard } from './StatCard'; // Carte de statistique individuelle
import { SectionHeader } from './SectionHeader'; // En-tête de section

// 📊 DONNÉES DE SIMULATION POUR LE GRAPHIQUE DES BONS DE TRAVAIL (OT)
const CHART_DATA = [
  { label: "Jan", ot: 12 }, { label: "Fév", ot: 34 },
  { label: "Mar", ot: 28 }, { label: "Avr", ot: 56 },
  { label: "Mai", ot: 45 }, { label: "Jun", ot: 78 },
  { label: "Jul", ot: 65 }, { label: "Aoû", ot: 89 },
];

export function OverviewManagement({ setTab }: { setTab: (t: string) => void }) {
  const [data, setData] = useState<any>(null); // Stocke les statistiques chargées depuis FastAPI
  const [loading, setLoading] = useState(true); // Gère l'indicateur de chargement initial

  // 📡 APPEL API : RÉCUPÉRATION DES STATISTIQUES GLOBAL
  useEffect(() => {
    async function load() {
      try {
        const stats = await gmaoApi.getStats();
        setData(stats);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  // Cercle de chargement animé si les données ne sont pas encore prêtes
  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-blue-500" /></div>;

  // 📇 CARTES KPI DU DASHBOARD :
  const stats = [
    { label: "OT Totaux", value: data?.totalOT || 0, icon: ClipboardList, color: "text-blue-400", bg: "bg-blue-400/10", delta: "+12%" },
    { label: "Parc Machines", value: data?.totalMachines || 0, icon: Wrench, color: "text-violet-400", bg: "bg-violet-400/10", delta: "Stable" },
    { label: "Utilisateurs", value: data?.totalTechnicians || 0, icon: Users, color: "text-emerald-400", bg: "bg-emerald-400/10", delta: "Actifs" },
    { label: "Stock Bas", value: data?.lowStock || 0, icon: Package, color: "text-amber-400", bg: "bg-amber-400/10", delta: "Alerte", alert: (data?.lowStock > 0) },
  ];

  return (
    <div className="animate-in fade-in duration-500">
      
      {/* En-tête avec statut du système */}
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Tableau de Bord Admin</h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1">Vision Globale du Système</p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/5 rounded-2xl">
            <Activity size={18} className="text-blue-400 animate-pulse" />
            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Système OK</span>
          </div>
        </div>
      </header>

      {/* Grid de 4 colonnes affichant nos cartes KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Graphiques interactifs Recharts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* GRAPHIQUE 1 : AIRE D'ACTIVITÉ DE MAINTENANCE (ÉVOLUTION DU VOLUME D'OT SUR 8 MOIS) */}
        <div className="lg:col-span-2 azure-card overflow-hidden">
          <SectionHeader title="Activité Maintenance" sub="Volume des Ordres de Travail (8 mois)" />
          <div className="h-[300px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={CHART_DATA}>
                <defs>
                  {/* Dégradé de couleur bleu sous la courbe */}
                  <linearGradient id="colorOT" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10, fontWeight: 700 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10, fontWeight: 700 }} />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} />
                <Area type="monotone" dataKey="ot" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorOT)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRAPHIQUE 2 : DONUT CHART DES PARTS DE CLÔTURE (TERMINÉ VS EN COURS) */}
        <div className="azure-card">
          <SectionHeader title="Performance" sub="Ratios de clôture" />
          <div className="h-[200px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={[
                    { name: "Terminés", value: data?.doneOT || 1, color: "#10b981" },
                    { name: "En cours", value: (data?.totalOT || 1) - (data?.doneOT || 0), color: "#3b82f6" }
                  ]} 
                  dataKey="value" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} strokeWidth={0}
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#3b82f6" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Taux de résolution calculé en direct */}
          <div className="text-center mt-4">
            <div className="text-4xl font-black text-white">{data?.resolutionRate || 0}%</div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Taux de résolution</div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
