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
import ReliabilityWidget from './_components/ReliabilityWidget';
import NotificationCenter from '../../../components/ui/NotificationCenter';
import { ManagerStats, WorkOrder } from './_components/types';

function getUser() {
    if (typeof window === 'undefined') return { name: '', sub: '' };
    try {
        const t = localStorage.getItem('token');
        if (!t) return { name: '', sub: '' };
        return JSON.parse(window.atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    } catch { return { name: '', sub: '' }; }
}

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../lib/db';

export default function ManagerDashboard() {
    const user = typeof window !== 'undefined' ? getUser() : { name: '', sub: '' };

    // ✅ REACTIVE: Real-time queries on local cache
    const wos = useLiveQuery(() => db.workOrders.toArray()) || [];
    const stockItems = useLiveQuery(() => db.stock.toArray()) || [];

    // We still use the API stats but supplement with local reactive counts
    const [fetchedStats, setFetchedStats] = useState<ManagerStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [notifCount, setNotifCount] = useState(0);

    useEffect(() => {
        const fetchCount = () => {
            const token = localStorage.getItem('token');
            if (token) {
                fetch(`http://${window.location.hostname}:5000/api/parts-requests/pending-count`, {
                    headers: { Authorization: `Bearer ${token}` }
                }).then(r => r.json()).then(d => { if (d.count !== undefined) setNotifCount(d.count); }).catch(() => { });
            }
        };
        fetchCount();
        const interval = setInterval(fetchCount, 5000); // 5 sec poll
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        gmaoApi.getManagerStats().then(data => {
            setFetchedStats(data);
            setLoading(false);
        });
        gmaoApi.getWorkOrders().catch(() => { });
    }, []);

    // Reactive Stats override
    const stats: ManagerStats | null = fetchedStats ? {
        ...fetchedStats,
        totalOT: wos.length,
        doneOT: wos.filter(o => o.status === 'done' || o.status === 'closed').length,
        openOT: wos.filter(o => o.status === 'open' || o.status === 'pending_approval').length,
        inProgressOT: wos.filter(o => o.status === 'in_progress').length,
        lowStock: stockItems.filter(i => (i.quantity || 0) <= 5).length,
    } : null;

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
                    <NotificationCenter count={notifCount} role="manager" />
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

            {/* ── Reliability KPIs (MTBF / MTTR) + Table OT récents ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <ReliabilityWidget />
                </div>
                <div className="lg:col-span-2">
                    <RecentOTTable workOrders={wos} />
                </div>
            </div>

        </div>
    );
}
