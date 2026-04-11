'use client';

import { useState, useEffect } from 'react';
import { db } from '../../lib/db';
import { gmaoApi } from '../../services/api';
import { RefreshCw, Wifi, WifiOff, CheckCircle, AlertCircle } from 'lucide-react';

export default function SyncStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check initial state
    setIsOnline(navigator.onLine);

    // Initial count
    updatePendingCount();

    // Listeners
    const handleOnline = () => { setIsOnline(true); handleSync(); };
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic check for pending items (e.g. if multi-tab)
    const interval = setInterval(updatePendingCount, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const updatePendingCount = async () => {
    const count = await db.syncQueue.where('status').equals('pending').count();
    const errorCount = await db.syncQueue.where('status').equals('error').count();
    setPendingCount(count + errorCount);
  };

  const handleSync = async () => {
    if (!navigator.onLine || isSyncing) return;
    
    setIsSyncing(true);
    try {
      await gmaoApi.syncData();
      await updatePendingCount();
      setLastSync(new Date().toLocaleTimeString());
    } finally {
      setIsSyncing(false);
    }
  };

  if (pendingCount === 0 && isOnline) return null;

  return (
    <div className={`fixed bottom-4 right-4 z-50 p-3 rounded-xl shadow-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 transition-colors duration-500 ${
      !isOnline ? 'bg-orange-500/10 border-orange-500/50 text-orange-600' : 'bg-blue-600 text-white'
    }`}>
      {isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
      
      <div className="flex flex-col">
        <span className="text-sm font-bold leading-tight">
          {isOnline ? (pendingCount > 0 ? `${pendingCount} synchronisation(s) en attente` : 'En ligne') : 'Mode Hors-ligne'}
        </span>
        {lastSync && <span className="text-[10px] opacity-80">Dernière synchro : {lastSync}</span>}
      </div>

      {isOnline && pendingCount > 0 && (
        <button 
          onClick={handleSync}
          disabled={isSyncing}
          className={`p-2 rounded-full hover:bg-white/20 transition-all ${isSyncing ? 'animate-spin' : ''}`}
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
