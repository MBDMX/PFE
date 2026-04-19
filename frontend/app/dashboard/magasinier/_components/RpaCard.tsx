'use client';
import { useState, useEffect } from 'react';
import { Package, RefreshCw, Cpu, Database, CheckCircle2 } from 'lucide-react';

const SYNC_SECONDS = 7200; // 2 hours

export default function RpaCard() {
    const [timeLeft, setTimeLeft] = useState(SYNC_SECONDS);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSync, setLastSync] = useState(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(prev => (prev > 0 ? prev - 1 : SYNC_SECONDS));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h}h ${m}m ${s}s`;
    };

    const handleSync = () => {
        setIsSyncing(true);
        setTimeout(() => {
            setIsSyncing(false);
            setLastSync(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
            setTimeLeft(SYNC_SECONDS);
        }, 3000);
    };

    return (
        <div className="azure-card p-6 border-dashed border-white/10 bg-slate-900/10 flex flex-col justify-between min-h-[220px]">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-slate-800 flex items-center justify-center border border-white/10 shadow-inner">
                        <Cpu size={20} className={isSyncing ? "text-blue-400 animate-spin" : "text-slate-500"} />
                    </div>
                    <div>
                        <h3 className="font-black text-white uppercase tracking-widest text-[0.7rem]">Synchronisation SAP</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <Database size={10} className="text-slate-600" />
                            <span className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-tighter">Instance: PRD_SAP_R3</span>
                        </div>
                    </div>
                </div>
                <div className="px-2 py-1 rounded bg-emerald-500/5 border border-emerald-500/10 flex items-center gap-1.5">
                    <div className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,1)]" />
                    <span className="text-[0.6rem] font-black text-emerald-500 uppercase tracking-widest">Connecté</span>
                </div>
            </div>

            <div className="bg-slate-950/40 rounded-2xl p-4 border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                    <span className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest">Temps avant refresh</span>
                    <span className="text-xs font-black text-white font-mono tracking-wider">{formatTime(timeLeft)}</span>
                </div>
                <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-blue-500 transition-all duration-1000"
                        style={{ width: `${(timeLeft / SYNC_SECONDS) * 100}%` }}
                    />
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                        <CheckCircle2 size={10} className="text-slate-600" />
                        <span className="text-[0.6rem] font-medium text-slate-600 italic">Dernière sync: {lastSync}</span>
                    </div>
                    <button 
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="flex items-center gap-1.5 px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[0.6rem] font-black text-slate-300 uppercase tracking-widest transition-all disabled:opacity-50"
                    >
                        <RefreshCw size={10} className={isSyncing ? "animate-spin" : ""} />
                        {isSyncing ? "Sync..." : "Forcer"}
                    </button>
                </div>
            </div>
            
            <p className="text-[0.6rem] text-slate-500 font-medium leading-relaxed opacity-60">
                L'agent RPA vérifie les stocks SAP toutes les 2h pour assurer l'intégrité des données locales et la génération des besoins.
            </p>
        </div>
    );
}