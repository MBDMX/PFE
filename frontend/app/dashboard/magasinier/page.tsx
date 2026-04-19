'use client';

import { useState, useEffect } from 'react';
import { Warehouse, LayoutDashboard, ClipboardList, History, Bell } from 'lucide-react';
import MagDashboard from './_components/MagDashboard';
import RequestManager from './_components/RequestManager';
import Traceability from './_components/Traceability';
import { gmaoApi } from '../../../services/api';
import NotificationCenter from '../../../components/ui/NotificationCenter';

type TabType = 'dashboard' | 'requests' | 'history';

export default function MagasinierPage() {
    const [activeTab, setActiveTab] = useState<TabType>('dashboard');
    const [pendingCount, setPendingCount] = useState(0);

    useEffect(() => {
        const fetchCount = () => {
            const token = localStorage.getItem('token');
            if (token) {
                fetch(`http://${window.location.hostname}:5000/api/parts-requests/pending-count`, {
                    headers: { Authorization: `Bearer ${token}` }
                }).then(r => r.json()).then(d => { if (d.count !== undefined) setPendingCount(d.count); }).catch(() => { });
            }
        };
        fetchCount();
        const interval = setInterval(fetchCount, 5000); // 5 sec poll while on page
        return () => clearInterval(interval);
    }, []);

    const tabs = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'requests', label: 'Demandes Pièces', icon: ClipboardList },
        { id: 'history', label: 'Traçabilité Stock', icon: History },
    ];

    return (
        <div className="flex flex-col gap-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* ── Header ── */}
            <header className="page-header px-2">
                <div>
                    <h1 className="text-3xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent tracking-tight">
                        Magasin Central
                    </h1>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">
                        GMAO Warehouse Management System
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-amber-600/10 border border-amber-500/20 px-4 py-2 rounded-2xl">
                        <Warehouse size={16} className="text-amber-400" />
                        <span className="text-[0.65rem] font-bold text-amber-400 uppercase tracking-widest">Magasinier</span>
                    </div>
                    <NotificationCenter count={pendingCount} role="magasinier" />
                </div>
            </header>

            {/* ── Tab Selector ── */}
            <div className="flex items-center gap-1 p-1 bg-slate-950/50 backdrop-blur-md rounded-2xl border border-white/5 w-fit ml-2">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as TabType)}
                        className={`relative flex items-center gap-2 px-6 py-2.5 rounded-xl text-[0.65rem] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === tab.id
                            ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30 shadow-lg shadow-amber-500/5'
                            : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'
                            }`}
                    >
                        <tab.icon size={14} />
                        {tab.label}
                        {tab.id === 'requests' && pendingCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] text-white">
                                {pendingCount}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* ── Tab Content ── */}
            <div className="px-1 min-h-[60vh]">
                {activeTab === 'dashboard' && <MagDashboard />}
                {activeTab === 'requests' && <RequestManager />}
                {activeTab === 'history' && <Traceability />}
            </div>

            {/* ── Footer / Status ── */}
            <footer className="mt-8 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 px-4 text-[0.6rem] font-bold text-slate-600 uppercase tracking-widest">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Terminal Magasin Connecté</span>
                    </div>
                    <span>•</span>
                    <span>Dernière Sync SAP : Il y a 12 min</span>
                </div>
                <div className="text-slate-700 italic">GMAO Azure Edition — Licence Entreprise</div>
            </footer>
        </div>
    );
}
