'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Clock, CheckCircle } from 'lucide-react';
import { gmaoApi } from '../services/api';
import { useToast } from './ui/toast';
import { db } from '../lib/db';

export default function GlobalTimerBar() {
  const [activeSession, setActiveSession] = useState<any>(null);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<any>(null);
  const pathname = usePathname();
  const { success, error } = useToast();

  useEffect(() => {
    fetchSession();
  }, [pathname]);

  const fetchSession = async () => {
    // Skip entirely if backend unreachable — prevents ERR_CONNECTION_REFUSED spam
    if (typeof window === 'undefined' || !navigator.onLine) return;
    try {
      const session = await gmaoApi.getTimerActive();
      setActiveSession(session);
      if (session) {
        startTimer(session.start_time, session.total_previous_seconds || 0);
      } else {
        stopTimer();
      }
    } catch {
      // Backend offline — silently ignore, no console spam
      stopTimer();
    }
  };

  const startTimer = (startTimeStr: string, previousSeconds: number = 0) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const start = new Date(startTimeStr).getTime();
    intervalRef.current = setInterval(() => {
      const currentSessionSeconds = Math.floor((new Date().getTime() - start) / 1000);
      setElapsed(previousSeconds + currentSessionSeconds);
    }, 1000);
  };

  const stopTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setElapsed(0);
  };

  useEffect(() => {
    fetchSession();
    return () => stopTimer();
  }, [pathname]);

  const handleStop = async (finish: boolean = false) => {
    if (!activeSession) return;
    try {
      const stopData = finish ? { status: 'done' } : { status: 'in_progress' };
      await gmaoApi.stopTimer(String(activeSession.work_order_id), stopData);
      
      if (finish) {
        success("Intervention terminée !");
      } else {
        success("Intervention en pause.");
      }
      
      stopTimer();
      setActiveSession(null);
      // Mettre à jour Dexie au lieu de reload()
      gmaoApi.getWorkOrder(String(activeSession.work_order_id)).then(wo => db.workOrders.put(wo));
    } catch (err) {
      error("Erreur lors de l'action");
    }
  };

  if (!activeSession) return null;

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] bg-blue-600/90 backdrop-blur-md border-t border-blue-400/30 px-6 py-3 flex items-center justify-between shadow-[0_-10px_40px_rgba(37,99,235,0.4)] animate-in slide-in-from-bottom-full duration-500 rounded-t-2xl mx-4 sm:mx-8 mb-4">
      <div className="flex items-center gap-4">
        <div className="size-10 rounded-full bg-white/20 flex items-center justify-center text-white animate-pulse">
          <Clock size={20} />
        </div>
        <div>
          <div className="text-[0.6rem] font-black text-blue-100 uppercase tracking-[0.2em] mb-0.5 opacity-80">Intervention en cours</div>
          <div className="text-sm font-black text-white flex items-center gap-2">
            OT #{activeSession.work_order_id}
            <span className="size-1.5 rounded-full bg-blue-300" />
            {activeSession.title || 'Mission Technique'}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-6">
        <div className="text-xl sm:text-3xl font-black text-white tabular-nums tracking-tighter mr-2">
          {formatTime(elapsed)}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleStop(false)}
            className="bg-white/20 hover:bg-white/30 text-white px-3 sm:px-5 py-2 rounded-xl font-black text-[0.65rem] sm:text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2"
            title="Mettre en pause"
          >
            <Clock size={14} /> <span className="hidden sm:inline">Pause</span>
          </button>
          <button
            onClick={() => handleStop(true)}
            className="bg-white text-blue-600 px-4 sm:px-6 py-2 rounded-xl font-black text-[0.65rem] sm:text-xs uppercase tracking-widest hover:bg-blue-50 transition-all shadow-lg active:scale-95 flex items-center gap-2 whitespace-nowrap"
          >
            <CheckCircle size={14} fill="currentColor" className="text-blue-600" /> <span className="hidden sm:inline">Terminer la tâche</span><span className="sm:hidden">Fin</span>
          </button>
        </div>
      </div>
    </div>
  );
}
