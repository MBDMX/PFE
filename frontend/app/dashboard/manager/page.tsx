'use client';
import { useState, useEffect } from 'react';
import {
    ClipboardList, Wrench, Flame, Package,
    Bell, TrendingUp, User, CheckCircle, CalendarClock
} from 'lucide-react';
import api, { gmaoApi } from '../../../services/api';
import KPICard from './_components/KPICard';
import OTStatusChart from './_components/OTStatusChart';
import RecentOTTable from './_components/RecentOTTable';
import AlertsWidget from './_components/AlertsWidget';
import { ManagerStats, WorkOrder } from './_components/types';

function getUser() {
    if (typeof window === 'undefined') return { name: '', sub: '' };
    try {
        const t = localStorage.getItem('token');
        if (!t) return { name: '', sub: '' };
        return JSON.parse(window.atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    } catch { return { name: '', sub: '' }; }
}

export default function ManagerDashboard() {
    const [stats, setStats] = useState<ManagerStats | null>(null);
    const [wos, setWos] = useState<WorkOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const user = typeof window !== 'undefined' ? getUser() : { name: '', sub: '' };

    useEffect(() => {
        Promise.all([
            api.get('/manager-stats').then(r => setStats(r.data)),
            gmaoApi.getWorkOrders().then(data => setWos(data)),
        ]).finally(() => setLoading(false));
    }, []);

    const displayName = user.name || user.sub || 'Responsable';

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8 pb-10">

            {/* ── Header ── */}
            <header className="page-header px-2">
                <div>
                    <h1 className="text-3xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent tracking-tight">
                        Bonjour, {displayName}
                    </h1>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">
                        GMAO Responsable — Vue d&apos;ensemble
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                        <div className="flex items-center gap-2 bg-slate-900 border border-white/5 px-3 py-1.5 rounded-xl">
                            <User size={12} className="text-violet-400" />
                            <span className="text-[0.65rem] font-bold text-slate-300 uppercase tracking-widest">
                                {displayName}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-violet-600/10 border border-violet-500/20 px-4 py-2 rounded-2xl">
                        <TrendingUp size={16} className="text-violet-400" />
                        <span className="text-[0.65rem] font-bold text-violet-400 uppercase tracking-widest">Responsable</span>
                    </div>
                    <div className="size-11 rounded-2xl bg-slate-900 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer relative">
                        <Bell size={20} />
                        {stats && stats.criticalOT > 0 && (
                            <span className="absolute top-2 right-2 size-2 bg-rose-500 rounded-full border-2 border-slate-950 animate-ping" />
                        )}
                    </div>
                </div>
            </header>

            {/* ── KPIs ── */}
            {loading ? (
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    {[1, 2, 3, 4, 5].map(i => <div key={i} className="azure-card h-28 animate-pulse" />)}
                </div>
            ) : stats ? (
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    <KPICard
                        label="OT Terminés"
                        value={stats.doneOT}
                        sub={`${stats.totalOT} ordres au total`}
                        icon={CheckCircle}
                        color="emerald"
                    />
                    <KPICard
                        label="En cours"
                        value={stats.inProgressOT}
                        sub={`${stats.openOT} en attente`}
                        icon={Wrench}
                        color="amber"
                    />
                    <KPICard
                        label="OT Critiques"
                        value={stats.criticalOT}
                        sub="Priorité maximale"
                        icon={Flame}
                        color="rose"
                        alert={stats.criticalOT > 0}
                    />
                    <KPICard
                        label="Stock bas"
                        value={stats.lowStock}
                        sub="Pièces ≤ 5 unités"
                        icon={Package}
                        color="orange"
                        alert={stats.lowStock > 0}
                    />
                    <KPICard
                        label="Maint. Due"
                        value={stats.dueMaintenance}
                        sub="Machines à réviser"
                        icon={CalendarClock}
                        color="violet"
                        alert={stats.dueMaintenance > 0}
                    />
                </div>
            ) : null}

            {/* ── Chart + Alertes ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {stats && <OTStatusChart stats={stats} />}
                <AlertsWidget workOrders={wos} lowStock={stats?.lowStock ?? 0} />
            </div>

            {/* ── Table OT récents ── */}
            <RecentOTTable workOrders={wos} />

        </div>
    );
}
