'use client';
import { useState, useEffect, useRef } from 'react';
import { Clock, AlertTriangle, CheckCircle, Play, Pause } from 'lucide-react';
import { gmaoApi } from '../../../../services/api';
import { useToast } from '../../../../components/ui/toast';
import { db } from '../../../../lib/db';

interface Props {
    workOrderId: string;
    initialTime?: number;
}

export default function TimerWidget({ workOrderId, initialTime = 0 }: Props) {
    const [activeSession, setActiveSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [elapsed, setElapsed] = useState(0);
    const intervalRef = useRef<any>(null);
    const { success, error } = useToast();

    const startLocalTimer = (startTimeStr: string) => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        const start = new Date(startTimeStr).getTime();
        intervalRef.current = setInterval(() => {
            setElapsed(Math.floor((new Date().getTime() - start) / 1000));
        }, 1000);
    };

    const stopLocalTimer = () => {
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
        setElapsed(0);
    };

    const fetchActiveSession = async () => {
        if (typeof window === 'undefined' || !navigator.onLine) { setLoading(false); return; }
        try {
            const session = await gmaoApi.getTimerActive();
            setActiveSession(session);
            if (session && String(session.work_order_id) === String(workOrderId)) {
                startLocalTimer(session.start_time);
                gmaoApi.getWorkOrder(workOrderId).then(wo => db.workOrders.put(wo));
            }
        } catch { /* Backend unreachable */ } finally { setLoading(false); }
    };

    useEffect(() => { fetchActiveSession(); return () => stopLocalTimer(); }, [workOrderId]);

    const handleStart = async () => {
        const now = new Date().toISOString();
        setActiveSession({ work_order_id: Number(workOrderId), start_time: now });
        startLocalTimer(now);
        try {
            await gmaoApi.startTimer(workOrderId);
            success('Intervention démarrée !');
            db.workOrders.update(Number(workOrderId), { status: 'in_progress' });
        } catch (err: any) {
            stopLocalTimer(); setActiveSession(null);
            error(err.response?.data?.detail || 'Erreur serveur');
        }
    };

    const handleStop = async (finish: boolean = false) => {
        stopLocalTimer(); setActiveSession(null);
        try {
            await gmaoApi.stopTimer(workOrderId, { status: finish ? 'done' : 'in_progress' });
            if (finish) await gmaoApi.updateWorkOrder(workOrderId, { status: 'done' });
            const freshWO = await gmaoApi.getWorkOrder(workOrderId);
            await db.workOrders.put(freshWO);
            success(finish ? 'Intervention terminée !' : 'Intervention en pause.');
        } catch { error("Erreur lors de l'arrêt"); }
    };

    const formatTime = (totalSeconds: number) => {
        const total = Math.floor((initialTime * 3600) + totalSeconds);
        const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    if (loading) return <div className="h-40 animate-pulse bg-white/5 rounded-2xl border border-white/5" />;

    const isThisOTActive = activeSession && String(activeSession.work_order_id) === String(workOrderId);
    const isOtherOTActive = activeSession && String(activeSession.work_order_id) !== String(workOrderId);

    return (
        <div className={`azure-card p-6 transition-all duration-500 ${isThisOTActive ? 'border-blue-500/50 bg-blue-500/5 shadow-[0_0_30px_rgba(59,130,246,0.15)]' : ''}`}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Clock size={18} className={isThisOTActive ? 'text-blue-400 animate-pulse' : 'text-slate-400'} />
                    <h2 className="text-lg font-black text-white uppercase tracking-widest">Temps Réel</h2>
                </div>
                {isThisOTActive && (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-[0.6rem] font-black uppercase tracking-widest border border-blue-500/20">
                        <span className="size-1.5 rounded-full bg-blue-400 animate-ping" /> En cours
                    </div>
                )}
            </div>
            <div className="flex flex-col items-center justify-center pt-4">
                <div className={`text-5xl font-black mb-8 tracking-tighter tabular-nums ${isThisOTActive ? 'text-white' : 'text-slate-700'}`}>
                    {formatTime(isThisOTActive ? elapsed : 0)}
                </div>
                {isOtherOTActive ? (
                    <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-500 text-[0.65rem] font-bold text-center flex flex-col items-center gap-2">
                        <AlertTriangle size={20} /> STOP requis : Session active sur l'OT #{activeSession.work_order_id}
                    </div>
                ) : !isThisOTActive ? (
                    <button onClick={handleStart} className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-3 shadow-lg shadow-emerald-600/20 active:scale-95 group">
                        <div className="size-8 rounded-lg bg-emerald-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Play size={16} fill="currentColor" />
                        </div>
                        Démarrer l'intervention
                    </button>
                ) : (
                    <div className="flex flex-col sm:flex-row gap-3 w-full">
                        <button onClick={() => handleStop(false)} className="flex-1 py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-3 active:scale-95">
                            <Pause size={16} fill="currentColor" /> Pause
                        </button>
                        <button onClick={() => handleStop(true)} className="flex-1 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-3 shadow-lg shadow-blue-600/20 active:scale-95">
                            <CheckCircle size={16} fill="currentColor" /> Terminer l'intervention
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
