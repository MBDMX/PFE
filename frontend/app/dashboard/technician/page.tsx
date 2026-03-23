'use client';
import { useState, useEffect } from 'react';
import {
    CheckCircle, AlertTriangle, Wrench,
    Loader2, Bell, Timer, User
} from 'lucide-react';
import { gmaoApi } from '../../../services/api';
import { useToast } from '../../../components/ui/toast';
import { WorkOrder, isOverdue } from './_components/types';
import KPICard from './_components/KPICard';
import CalendarWidget from './_components/CalendarWidget';
import Top5Widget from './_components/Top5Widget';

export default function TechnicianDashboard() {
    const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userName, setUserName] = useState('');
    const [userId, setUserId] = useState('');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const payload = JSON.parse(
                        window.atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
                    );
                    setUserName(payload.name || payload.username || '');
                    setUserId(payload.sub || payload.id || payload.user_id || '');
                } catch { }
            }
        }
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const data = await gmaoApi.getWorkOrders();
            setWorkOrders(data);
        } catch (e) {
            console.error('Failed to fetch work orders', e);
        } finally {
            setIsLoading(false);
        }
    };

    // ── KPIs ──
    const total = workOrders.length;
    const finished = workOrders.filter(o => o.status === 'done' || o.status === 'closed').length;
    const resolutionRate = total > 0 ? Math.round((finished / total) * 100) : 0;
    const overdueCount = workOrders.filter(o => isOverdue(o.due_date, o.status)).length;

    const closedWithDates = workOrders.filter(
        o => (o.status === 'done' || o.status === 'closed') && o.closed_at && o.created_at
    );
    const avgHours = closedWithDates.length > 0
        ? (closedWithDates.reduce((sum, o) => {
            return sum + (new Date(o.closed_at!).getTime() - new Date(o.created_at!).getTime()) / 3600000;
        }, 0) / closedWithDates.length).toFixed(1)
        : '—';

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8 pb-10">

            {/* ── Header ── */}
            <header className="page-header px-2">
                <div>
                    <h1 className="text-3xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent tracking-tight">
                        {userName ? `Bonjour, ${userName}` : 'Tableau de bord'}
                    </h1>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">
                        GMAO Technicien — Accès direct
                    </p>

                    {/* Greeting — nom + ID */}
                    {(userName || userId) && (
                        <div className="flex items-center gap-2 mt-3">
                            <div className="flex items-center gap-2 bg-slate-900 border border-white/5 px-3 py-1.5 rounded-xl">
                                <User size={12} className="text-blue-400" />
                                <span className="text-[0.65rem] font-bold text-slate-300 uppercase tracking-widest">
                                    {userName}
                                </span>
                                {userId && (
                                    <>
                                        <span className="text-slate-600">·</span>
                                        <span className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest font-mono">
                                            ID {userId}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-blue-600/10 border border-blue-500/20 px-4 py-2 rounded-2xl">
                        <Wrench size={16} className="text-blue-400" />
                        <span className="text-[0.65rem] font-bold text-blue-400 uppercase tracking-widest">Technicien</span>
                    </div>
                    <div className="size-11 rounded-2xl bg-slate-900 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer relative">
                        <Bell size={20} />
                        {overdueCount > 0 && (
                            <span className="absolute top-2 right-2 size-2 bg-rose-500 rounded-full border-2 border-slate-950" />
                        )}
                    </div>
                </div>
            </header>

            {/* ── KPIs ── */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="azure-card p-5 h-28 animate-pulse bg-slate-900/60" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <KPICard label="Taux de résolution" value={`${resolutionRate}%`} sub="Cible : > 85% ce mois" color="emerald" icon={CheckCircle} />
                    <KPICard label="OT en retard" value={overdueCount} sub="Objectif : 0 — alerte si > 0" color="rose" icon={AlertTriangle} />
                    <KPICard label="Délai moyen" value={avgHours === '—' ? '—' : `${avgHours}h`} sub="Cible : < 4h pour critiques" color="blue" icon={Timer} />
                </div>
            )}

            {/* ── Calendrier + Top 5 ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CalendarWidget workOrders={workOrders} />
                <Top5Widget workOrders={workOrders} />
            </div>

        </div>
    );
}