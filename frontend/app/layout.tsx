'use client';
import './globals.css';
import '@fontsource-variable/outfit';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Wrench, ClipboardList,
  Package, LogOut, ShieldCheck, Settings, ChevronRight, Users, Warehouse,
  RefreshCw, Clock, Square, AlertTriangle, Loader2, Bell, Activity, CheckCircle
} from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { gmaoApi } from '../services/api';
import { ToastProvider, useToast } from '../components/ui/toast';
import { db } from '../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import axios from 'axios';
import GuideBubble from '../components/GuideBubble';

// ────────────────────────────────────────────
// Types & Helpers
// ────────────────────────────────────────────
interface JWTUser {
  sub?: string;
  role?: string;
  name?: string;
}

function getUserFromToken(): JWTUser | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    return JSON.parse(
      window.atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
    );
  } catch {
    return null;
  }
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur',
  technician: 'Technicien',
  manager: 'Responsable',
  magasinier: 'Magasinier',
};

const ROLE_ROUTES: Record<string, string> = {
  admin: '/dashboard/admin',
  technician: '/dashboard/technician',
  manager: '/dashboard/manager',
  magasinier: '/dashboard/magasinier',
};

// ────────────────────────────────────────────
// Components
// ────────────────────────────────────────────
function GlobalTimerBar() {
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

// ────────────────────────────────────────────
// Client Content Wrapper (Uses Contexts)
// ────────────────────────────────────────────
function ClientAppWrapper({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<JWTUser | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState({ pending: 0, errors: 0, total: 0 });
  const [isSyncing, setIsSyncing] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const { success, error: toastError, error } = useToast();

  const isLogin = path === '/login' || path === '/';

  // 0. Monitor Network Status (Ultra-Reliable check)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkRealStatus = () => {
      const img = new Image();
      // Timeout très court (1.5s) pour détecter la perte de WiFi instantanément
      const timer = setTimeout(() => { img.src = ""; setIsOnline(false); }, 1500);
      
      img.src = "https://www.google.com/favicon.ico?t=" + Date.now();
      
      img.onload = () => {
        clearTimeout(timer);
        setIsOnline(prev => {
          if (!prev) {
            console.log("🚀 Connection restored! Triggering sync...");
            gmaoApi.syncData().then(() => {
              success("Synchronisation réussie", "Vos actions hors-ligne ont été envoyées.");
            }).catch(() => {});
          }
          return true;
        });
      };
      
      img.onerror = () => {
        clearTimeout(timer);
        setIsOnline(false);
      };
    };

    // Vérification initiale
    checkRealStatus();

    // On vérifie toutes les 3 secondes pour une réactivité maximale pendant la démo
    const interval = setInterval(checkRealStatus, 3000);

    // On garde quand même les événements natifs pour la vitesse
    window.addEventListener('online', checkRealStatus);
    window.addEventListener('offline', () => setIsOnline(false));

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', checkRealStatus);
      window.removeEventListener('offline', checkRealStatus);
    };
  }, []);

  // 1. Service Worker Registration & Initial Sync
  useEffect(() => {
    if ('serviceWorker' in navigator && window.location.protocol === 'http:') {
      window.addEventListener('load', () => {
        // Only try to register if we are NOT in local dev or if we explicitly need it
        navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
          .then(reg => {
             // console.log('SW Registered', reg.scope);
          })
          .catch(err => {
            if (err.name !== 'AbortError') console.error('SW Failed', err);
          });
      });
    }

    if (navigator.onLine) {
      // 🧹 Purge stale/phantom items from previous sessions
      db.syncQueue.toArray().then(all => {
        const stale = all.filter(a => a.status === 'error' || a.status === 'syncing');
        if (stale.length > 0) {
          db.syncQueue.bulkDelete(stale.map(a => a.id!));
          console.log(`🧹 Purged ${stale.length} stale sync queue item(s).`);
        }
      });

      // Initial Master Data Sync
      gmaoApi.syncData().catch(() => { });

      // Fetch initial notification count
      const token = localStorage.getItem('token');
      if (token) {
        gmaoApi.get('/parts-requests/pending-count')
          .then(d => { if (d.count !== undefined) setNotifCount(d.count); })
          .catch(() => { });
      }
    }
  }, []);

  // 2. Failsafe Sync Queue Monitor (Polling + Event based)
  const prevCountRef = useRef(0);
  useEffect(() => {
    const updateCount = async () => {
      try {
        const all = await db.syncQueue.toArray();
        const pending = all.filter(a => a.status === 'pending' || a.status === 'syncing').length;
        const errors = all.filter(a => a.status === 'error').length;
        const total = pending + errors;

        if (total > prevCountRef.current && !isOnline) {
          warning("Action Hors-Ligne", "Enregistré localement.");
        }
        prevCountRef.current = total;
        
        setPendingSyncCount(total);
        setSyncStatus({ pending, errors, total });
      } catch (err) {
        console.error("Dexie Poll Error:", err);
      }
    };

    updateCount();
    const interval = setInterval(updateCount, 1000);
    
    // Écouter le signal global pour une mise à jour INSTANTANÉE
    window.addEventListener('sync-queue-updated', updateCount);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('sync-queue-updated', updateCount);
    };
  }, [isOnline]);

  async function handleManualSync() {
    if (isSyncing || pendingSyncCount === 0) return;
    setIsSyncing(true);

    try {
      // Use the centralized sync logic we just implemented in api.ts
      await gmaoApi.syncData();
      success('Synchronisation Terminée', 'Les actions en attente ont été traitées.');
    } catch (err) {
      toastError('Erreur de Sync', 'Certaines actions n\'ont pas pu être synchronisées.');
    } finally {
      setIsSyncing(false);
    }
  }

  // 3. WebSocket Real-time Sync — Exponential Backoff
  useEffect(() => {
    if (!isOnline) return;

    let ws: WebSocket | null = null;
    let reconnectTimer: any = null;
    let retryDelay = 5000;    // starts at 5s
    const maxDelay = 60000;   // caps at 60s
    let attempt = 0;

    const connectWS = () => {
      ws = new WebSocket('ws://127.0.0.1:5000/ws');

      ws.onopen = () => {
        retryDelay = 5000; // reset on success
        attempt = 0;
        console.log('📡 WS Connected.');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const token = localStorage.getItem('token');
          let role = '';
          let userId = 0;
          if (token) {
            try {
              const p = JSON.parse(window.atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
              role = p.role || '';
              userId = parseInt(p.id || p.sub || '0');
            } catch { }
          }

          if (data.event === 'LOW_STOCK_ALERT') {
            if (role === 'magasinier' || role === 'manager' || role === 'admin') {
              error('⚠️ Alerte Stock Critique', `Il reste ${data.quantity} dispo de ${data.part_name} (${data.part_code}).`);
            }
          }

          if (data.event === 'NEW_PARTS_REQUEST') {
            if (role === 'magasinier' || role === 'admin') {
              setNotifCount(c => c + 1);
              error('🔔 Nouvelle demande pièces', `OT #${data.wo_id} — ${data.quantity}x ${data.part_name}. Veuillez valider !`);
            }
          }

          if (data.event === 'PARTS_APPROVED') {
            if (data.requester_id === userId || role === 'manager' || role === 'admin') {
              setNotifCount(c => c + 1);
              window.dispatchEvent(new CustomEvent('gmao:notification'));
              success('✅ Pièces approuvées !', `OT #${data.wo_id} — Les pièces sont prêtes à être récupérées au magasin.`);
            }
          }

          if (data.event === 'PARTS_REJECTED') {
            if (data.requester_id === userId) {
              setNotifCount(c => c + 1);
              window.dispatchEvent(new CustomEvent('gmao:notification'));
              toastError('❌ Demande refusée', data.reason ? `Raison : ${data.reason}` : `OT #${data.wo_id} — Votre demande a été refusée.`);
            }
          }

          if (data.event === 'NEW_WORK_ORDER') {
            if (data.technician_id === userId) {
              setNotifCount(c => c + 1);
              window.dispatchEvent(new CustomEvent('gmao:notification'));
              success('🔔 Nouvel OT !', `L'OT #${data.id} "${data.title}" vous a été assigné.`);
            }
          }

          if (data.event === 'WORK_ORDER_UPDATED' && data.newly_assigned) {
            if (data.technician_id === userId) {
              setNotifCount(c => c + 1);
              window.dispatchEvent(new CustomEvent('gmao:notification'));
              success('🔄 OT Assigné', `L'OT #${data.id} vient de vous être assigné.`);
            }
          }

          setTimeout(() => { gmaoApi.syncData().catch(() => { }); }, 1000);
        } catch { }
      };

      ws.onclose = () => {
        if (attempt === 0) {
          console.warn(`📡 WS Disconnected. Next retry in ${retryDelay / 1000}s...`);
        }
        attempt++;
        reconnectTimer = setTimeout(() => {
          retryDelay = Math.min(retryDelay * 2, maxDelay);
          connectWS();
        }, retryDelay);
      };

      ws.onerror = () => {
        ws?.close(); // triggers onclose which handles retry
      };
    };

    connectWS();

    return () => {
      ws?.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [isOnline]);

  // Automatic Sync on Online Event
  useEffect(() => {
    if (isOnline && pendingSyncCount > 0) {
      console.log('Network back online. Triggering auto-sync...');
      handleManualSync();
    }
  }, [isOnline]);

  // Re-decode JWT on navigation
  useEffect(() => {
    setUser(getUserFromToken());
  }, [path]);

  function getDashHref() {
    return user?.role ? (ROLE_ROUTES[user.role] ?? '/dashboard/technician') : '/dashboard/technician';
  }

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    router.push('/login');
  }

  const displayName = user?.name || user?.sub || 'Utilisateur';
  const displayRole = user?.role ? (ROLE_LABELS[user.role] ?? user.role) : 'Rôle';
  const avatarLetter = displayName[0]?.toUpperCase() ?? 'U';

  if (isLogin) return <>{children}</>;

  return (
    <div className="app-container">
      <aside className="sidebar">
        {/* ── Logo ── */}
        <div className="sidebar-logo flex items-center gap-3 mb-10 px-2">
          <div className="size-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <ShieldCheck size={24} className="text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tight leading-none text-white">GMAO PRO</span>
            <span className="text-[0.65rem] font-bold text-blue-400/80 uppercase tracking-widest mt-1">
              Excellence Azure
            </span>
          </div>
        </div>

        {/* ── Nav ── */}
        <nav className="sidebar-nav space-y-1">
          <div className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest mb-4 px-3">
            Navigation
          </div>

          {(user?.role === 'magasinier' || user?.role === 'admin') && (
            <Link href="/dashboard/magasinier" className={`sidebar-link ${path.startsWith('/dashboard/magasinier') ? 'active' : ''}`}>
              <Warehouse size={20} />
              <span>Dashboard</span>
              {path.startsWith('/dashboard/magasinier') && <ChevronRight size={14} className="ml-auto text-blue-400" />}
            </Link>
          )}

          {user?.role !== 'magasinier' && (
            <>
              <Link id="nav-dashboard" href={getDashHref()} className={`sidebar-link ${path.startsWith('/dashboard') && !path.startsWith('/dashboard/magasinier') ? 'active' : ''}`}>
                <LayoutDashboard size={20} />
                <span>Dashboard</span>
                {path.startsWith('/dashboard') && !path.startsWith('/dashboard/magasinier') && <ChevronRight size={14} className="ml-auto text-blue-400" />}
              </Link>

              <Link id="nav-machines" href="/machines" className={`sidebar-link ${path === '/machines' ? 'active' : ''}`}>
                <Wrench size={20} />
                <span>Parc Machines</span>
                {path === '/machines' && <ChevronRight size={14} className="ml-auto text-blue-400" />}
              </Link>

              <Link id="nav-work-orders" href="/work-orders" className={`sidebar-link ${path.startsWith('/work-orders') ? 'active' : ''}`}>
                <ClipboardList size={20} />
                <span>Ordre de travail</span>
                {path.startsWith('/work-orders') && <ChevronRight size={14} className="ml-auto text-blue-400" />}
              </Link>
            </>
          )}

          <Link id="nav-stock" href="/stock" className={`sidebar-link ${path === '/stock' ? 'active' : ''}`}>
            <Package size={20} />
            <span>Stock Pièces</span>
            {path === '/stock' && <ChevronRight size={14} className="ml-auto text-blue-400" />}
          </Link>

          {(user?.role === 'manager' || user?.role === 'admin') && (
            <>
              <Link href="/dashboard/manager/equipe" className={`sidebar-link ${path.startsWith('/dashboard/manager/equipe') ? 'active' : ''}`}>
                <Users size={20} />
                <span>Supervision Équipe</span>
                {path.startsWith('/dashboard/manager/equipe') && <ChevronRight size={14} className="ml-auto text-blue-400" />}
              </Link>
            </>
          )}
          {(user?.role === 'magasinier' || user?.role === 'admin') && (
            <Link href="/dashboard/magasinier" className={`sidebar-link ${path.startsWith('/dashboard/magasinier') ? 'active' : ''} relative`}>
              <Warehouse size={20} />
              <span>Bon de Sortie</span>
              {notifCount > 0 && (
                <span className="ml-auto flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-amber-500 text-[0.6rem] font-black text-white shadow-lg shadow-amber-500/40 animate-pulse">
                  {notifCount > 99 ? '99+' : notifCount}
                </span>
              )}
              {notifCount === 0 && path.startsWith('/dashboard/magasinier') && <ChevronRight size={14} className="ml-auto text-blue-400" />}
            </Link>
          )}
        </nav>

        {/* ── Network & Sync Indicator ── */}
        <div className="mt-auto px-2 pb-6 space-y-3 border-t border-white/5 pt-6">
          
          {/* 1. Network Status Pill */}
          <div className={`px-4 py-2.5 rounded-2xl border flex items-center gap-3 transition-all duration-500 ${isOnline ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/30'}`}>
            <div className={`size-2 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-rose-500 animate-pulse'}`} />
            <span className={`text-[0.65rem] font-black uppercase tracking-widest ${isOnline ? 'text-emerald-500' : 'text-rose-500'}`}>
              {isOnline ? '📡 EN LIGNE' : '⚠️ DÉCONNECTÉ'}
            </span>
          </div>

          {/* 2. Unified Sync Status Block */}
          <div className="space-y-2">
            {pendingSyncCount > 0 ? (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 animate-in fade-in zoom-in duration-500">
                <div className="flex items-center gap-3 mb-3">
                  <div className="size-3 bg-amber-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.6)]" />
                  <span className="text-[0.7rem] font-black text-amber-500 uppercase tracking-widest">
                    {pendingSyncCount} Action(s) en attente
                  </span>
                </div>
                
                <button
                  onClick={handleManualSync}
                  disabled={isSyncing || !isOnline}
                  className={`w-full py-2.5 rounded-xl flex items-center justify-center gap-2 text-[0.65rem] font-black uppercase tracking-widest transition-all ${
                    isOnline 
                      ? 'bg-amber-500 text-white hover:bg-amber-400 shadow-lg shadow-amber-500/20 active:scale-95' 
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                  }`}
                >
                  {isSyncing ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <RefreshCw size={14} />
                  )}
                  {isSyncing ? 'Synchronisation...' : 'Forcer la Synchro'}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 px-4 py-3 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl transition-all duration-500">
                <div className="size-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
                <span className="text-[0.65rem] font-black text-emerald-500/80 uppercase tracking-widest">
                  Données Synchronisées
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Bottom ── */}
        <div className="mt-auto pt-6 border-t border-white/5 space-y-1">
          <div className="px-4 py-3 mb-3 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-3">
            <div className="size-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-inner shrink-0">
              {avatarLetter}
            </div>
            <div className="flex flex-col overflow-hidden min-w-0">
              <span className="text-sm font-bold text-white truncate leading-tight">{displayName}</span>
              <span className="text-[0.6rem] font-bold text-blue-400 uppercase tracking-widest mt-0.5">{displayRole}</span>
            </div>
          </div>

          <Link href="/settings" className="sidebar-link hover:text-white">
            <Settings size={20} />
            <span>Paramètres</span>
          </Link>

          <button onClick={handleLogout} className="sidebar-link w-full text-left hover:text-red-400 hover:bg-red-400/5 group">
            <LogOut size={20} className="group-hover:text-red-400" />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>
      <GuideBubble />

      {/* GLOBAL PERSISTENT TIMER */}
      {user?.role === 'technician' && <GlobalTimerBar />}
    </div>
  );
}

// ────────────────────────────────────────────
// Main Layout
// ────────────────────────────────────────────
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <title>GMAO PRO | Excellence Azure</title>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563eb" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <style>{`body { font-family: 'Outfit Variable', 'Outfit', sans-serif; }`}</style>
      </head>
      <body suppressHydrationWarning className="bg-slate-950 text-slate-100 min-h-screen">
        <ToastProvider>
          <ClientAppWrapper>
            {children}
          </ClientAppWrapper>
        </ToastProvider>
      </body>
    </html>
  );
}