'use client';
import './globals.css';
import '@fontsource-variable/outfit';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Wrench, ClipboardList,
  Package, LogOut, ShieldCheck, Settings, ChevronRight, Users, Warehouse,
  RefreshCw, Clock, Square, AlertTriangle, Loader2, Bell
} from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { gmaoApi } from '../services/api';
import { ToastProvider, useToast } from '../components/ui/toast';
import { db } from '../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import axios from 'axios';

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
        startTimer(session.start_time);
      } else {
        stopTimer();
      }
    } catch {
      // Backend offline — silently ignore, no console spam
      stopTimer();
    }
  };

  const startTimer = (startTimeStr: string) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const start = new Date(startTimeStr).getTime();
    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((new Date().getTime() - start) / 1000));
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

  const handleStop = async () => {
    if (!activeSession) return;
    try {
      await gmaoApi.stopTimer(String(activeSession.work_order_id));
      stopTimer();
      setActiveSession(null);
      success("Session terminée !");
      window.location.reload();
    } catch (err) {
      error("Erreur lors de l'arrêt");
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

      <div className="flex items-center gap-6 sm:gap-12">
        <div className="text-xl sm:text-3xl font-black text-white tabular-nums tracking-tighter">
          {formatTime(elapsed)}
        </div>
        <button
          onClick={handleStop}
          className="bg-white text-blue-600 px-4 sm:px-6 py-2 rounded-xl font-black text-[0.65rem] sm:text-xs uppercase tracking-widest hover:bg-blue-50 transition-all shadow-lg active:scale-95 flex items-center gap-2 whitespace-nowrap"
        >
          <Square size={14} fill="currentColor" /> <span className="hidden sm:inline">Arrêter le compteur</span><span className="sm:hidden">Stop</span>
        </button>
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

  // 0. Monitor Network Status
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsOnline(navigator.onLine);
    const h1 = () => setIsOnline(true);
    const h2 = () => setIsOnline(false);
    window.addEventListener('online', h1);
    window.addEventListener('offline', h2);
    return () => {
      window.removeEventListener('online', h1);
      window.removeEventListener('offline', h2);
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
        fetch(`http://${window.location.hostname}:5000/api/parts-requests/pending-count`, {
          headers: { Authorization: `Bearer ${token}` }
        }).then(r => r.json()).then(d => { if (d.count !== undefined) setNotifCount(d.count); }).catch(() => { });
      }
    }
  }, []);

  // 2. Reactive Sync Queue Monitor
  useEffect(() => {
    const updateCount = async () => {
      const all = await db.syncQueue.toArray();
      const pending = all.filter(a => a.status === 'pending' || a.status === 'syncing').length;
      const errors = all.filter(a => a.status === 'error').length;

      setPendingSyncCount(pending + errors);
      setSyncStatus({ pending, errors, total: pending + errors });
    };

    updateCount();
    const timer = setInterval(updateCount, 8000); // 8s — reduced from 2s for performance
    return () => clearInterval(timer);
  }, []);

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
      ws = new WebSocket('ws://localhost:5000/ws');

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
              userId = parseInt(p.sub || '0');
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
              setNotifCount(c => Math.max(0, c - 1));
              success('✅ Pièces approuvées !', `OT #${data.wo_id} — Les pièces sont prêtes à être récupérées au magasin.`);
            }
          }

          if (data.event === 'PARTS_REJECTED') {
            if (data.requester_id === userId) {
              setNotifCount(c => Math.max(0, c - 1));
              toastError('❌ Demande refusée', data.reason ? `Raison : ${data.reason}` : `OT #${data.wo_id} — Votre demande a été refusée.`);
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
              <Link href={getDashHref()} className={`sidebar-link ${path.startsWith('/dashboard') && !path.startsWith('/dashboard/magasinier') ? 'active' : ''}`}>
                <LayoutDashboard size={20} />
                <span>Dashboard</span>
                {path.startsWith('/dashboard') && !path.startsWith('/dashboard/magasinier') && <ChevronRight size={14} className="ml-auto text-blue-400" />}
              </Link>

              <Link href="/machines" className={`sidebar-link ${path === '/machines' ? 'active' : ''}`}>
                <Wrench size={20} />
                <span>Parc Machines</span>
                {path === '/machines' && <ChevronRight size={14} className="ml-auto text-blue-400" />}
              </Link>

              <Link href="/work-orders" className={`sidebar-link ${path.startsWith('/work-orders') ? 'active' : ''}`}>
                <ClipboardList size={20} />
                <span>Ordre de travail</span>
                {path.startsWith('/work-orders') && <ChevronRight size={14} className="ml-auto text-blue-400" />}
              </Link>
            </>
          )}

          <Link href="/stock" className={`sidebar-link ${path === '/stock' ? 'active' : ''}`}>
            <Package size={20} />
            <span>Stock Pièces</span>
            {path === '/stock' && <ChevronRight size={14} className="ml-auto text-blue-400" />}
          </Link>

          {(user?.role === 'manager' || user?.role === 'admin') && (
            <Link href="/dashboard/manager/equipe" className={`sidebar-link ${path.startsWith('/dashboard/manager/equipe') ? 'active' : ''}`}>
              <Users size={20} />
              <span>Supervision Équipe</span>
              {path.startsWith('/dashboard/manager/equipe') && <ChevronRight size={14} className="ml-auto text-blue-400" />}
            </Link>
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
        <div className="mt-6 px-2 space-y-2 border-t border-white/5 pt-6">
          {/* Network Status Pill */}
          <div className={`px-4 py-2.5 rounded-2xl border flex items-center gap-3 transition-all duration-500 ${isOnline ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/30'}`}>
            <div className={`size-2 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-rose-500 animate-pulse'}`} />
            <span className={`text-[0.65rem] font-black uppercase tracking-widest ${isOnline ? 'text-emerald-500' : 'text-rose-500'}`}>
              {isOnline ? 'Mode En Ligne' : 'Mode Hors Ligne'}
            </span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5">
            {isSyncing ? (
              <Loader2 size={12} className="animate-spin text-blue-400" />
            ) : syncStatus.errors > 0 ? (
              <AlertTriangle size={12} className="text-amber-500" />
            ) : (
              <div className="size-2 rounded-full bg-blue-500/40" />
            )}
            <span className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400">
              {isSyncing ? 'Synchronisation...' :
                syncStatus.errors > 0 ? `${syncStatus.errors} Erreurs` :
                  'Synchronisé'}
            </span>
            {syncStatus.total > 0 && !isSyncing && (
              <button
                onClick={handleManualSync}
                className="p-1.5 hover:bg-white/10 rounded-lg text-blue-400 transition-colors"
                title="Forcer la synchronisation"
              >
                <RefreshCw size={12} className={isSyncing ? "animate-spin" : ""} />
              </button>
            )}
          </div>

          {/* Sync Status Pill */}
          <div className={`px-4 py-2.5 rounded-2xl border flex items-center gap-3 transition-colors ${pendingSyncCount > 0 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-white/5 border-white/5 opacity-50'}`}>
            <div className={`size-2 rounded-full ${pendingSyncCount > 0 ? 'bg-amber-500 animate-bounce' : 'bg-slate-500'}`} />
            <span className={`text-[0.65rem] font-black uppercase tracking-widest ${pendingSyncCount > 0 ? 'text-amber-500' : 'text-slate-500'}`}>
              {pendingSyncCount > 0 ? `${pendingSyncCount} Action(s) en attente` : 'Données synchronisées'}
            </span>
          </div>

          {pendingSyncCount > 0 && isOnline && (
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:cursor-not-allowed text-white text-[0.65rem] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-2"
            >
              {isSyncing ? (
                <div className="size-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : <RefreshCw size={14} />}
              {isSyncing ? 'Synchronisation...' : 'Forcer la Synchro'}
            </button>
          )}
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