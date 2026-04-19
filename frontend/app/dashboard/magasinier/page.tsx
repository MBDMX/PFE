'use client';

import { useState } from 'react';
import { Warehouse, LayoutDashboard, ClipboardList, History, Bell, ScanLine } from 'lucide-react';
import MagDashboard from './_components/MagDashboard';
import RequestManager from './_components/RequestManager';
import Traceability from './_components/Traceability';
import PdaScanner from './_components/PdaScanner';

type TabType = 'dashboard' | 'requests' | 'history' | 'scanner';

export default function MagasinierPage() {
    const [activeTab, setActiveTab] = useState<TabType>('dashboard');

    const tabs = [
        { id: 'dashboard', label: 'Dashboard',        icon: LayoutDashboard },
        { id: 'requests',  label: 'Demandes Pièces',   icon: ClipboardList    },
        { id: 'history',   label: 'Traçabilité Stock', icon: History          },
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

                    <div className="size-11 rounded-2xl bg-slate-900 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer relative group">
                        <Bell size={20} />
                        <span className="absolute top-2.5 right-2.5 size-2 bg-amber-500 rounded-full border-2 border-slate-950 group-hover:scale-125 transition-transform" />
                    </div>
                </div>
            </header>


            {/* ── Toolbar Row ── */}
            <div className="relative flex items-center justify-between px-2 -mb-2">
                {/* ── Tab Selector ── */}
                <div className="flex items-center gap-1 p-1 bg-slate-950/50 backdrop-blur-md rounded-2xl border border-white/5 w-fit">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as TabType)}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[0.65rem] font-black uppercase tracking-widest transition-all duration-300 ${
                                activeTab === tab.id
                                    ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30 shadow-lg shadow-amber-500/5'
                                    : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'
                            }`}
                        >
                            <tab.icon size={14} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* ── PDA Scanner Shortcut (Right-leaning, Large & Text) ── */}
                <div className="absolute left-[72%] -translate-x-1/2 z-20">
                    <button 
                        onClick={() => setActiveTab('scanner')}
                        className={`flex items-center gap-4 px-8 py-3 rounded-2xl transition-all duration-500 border-2 ${
                            activeTab === 'scanner' 
                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-500 shadow-[0_0_40px_rgba(245,158,11,0.3)] scale-110' 
                            : 'bg-slate-900/80 border-white/10 text-slate-400 hover:text-white hover:border-white/20 hover:scale-105'
                        }`}
                        title="Scanner PDA"
                    >
                        <ScanLine size={36} strokeWidth={2.5} />
                        <span className="text-base font-black uppercase tracking-widest">Scanner PDA</span>
                    </button>
                </div>

                {/* Spacer for layout balance */}
                <div className="w-10" />
            </div>

            {/* ── Tab Content ── */}
            <div className="px-1 min-h-[60vh]">
                {activeTab === 'dashboard' && <MagDashboard />}
                {activeTab === 'requests'  && <RequestManager />}
                {activeTab === 'history'   && <Traceability />}
                {activeTab === 'scanner'   && <PdaScanner />}
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
