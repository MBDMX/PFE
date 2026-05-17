'use client';
import './globals.css';
import '@fontsource-variable/outfit';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard, Wrench, ClipboardList,
  Package, LogOut, ShieldCheck, Settings, ChevronRight, Users, Warehouse,
  RefreshCw, Clock, Square, AlertTriangle, Loader2, Bell, Activity, CheckCircle,
  Trash2, AlertCircle, Wifi, WifiOff
} from 'lucide-react';
import { useEffect, useState, useRef, Suspense } from 'react';
import { gmaoApi } from '../services/api';
import { ToastProvider, useToast } from '../components/ui/toast';
import { db } from '../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import axios from 'axios';
import GuideBubble from '../components/GuideBubble';
import GlobalTimerBar from '../components/GlobalTimerBar';

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

// GlobalTimerBar component is imported from components/GlobalTimerBar

// ────────────────────────────────────────────
// Client Content Wrapper (Uses Contexts)
// ────────────────────────────────────────────
const ACTION_NAMES: Record<string, string> = {
  CREATE_WORK_ORDER: 'Création OT',
  UPDATE_WORK_ORDER: 'Mise à jour OT',
  DELETE_WORK_ORDER: 'Suppression OT',
  ADD_PART: 'Ajout de pièce',
  CREATE_PARTS_REQUEST: 'Demande de pièces',
  CREATE_STOCK_MOVEMENT: 'Mouvement Stock',
  TIMER_START: 'Démarrage Chrono',
  TIMER_STOP: 'Arrêt Chrono',
  APPROVE_DELETION: 'Approbation Suppr.',
  REJECT_DELETION: 'Rejet Suppression',
  SYNC_SAP_MACHINES: 'Sync SAP Machines',
  SYNC_SAP_OTS: 'Sync SAP OT'
};

function ClientAppWrapper({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || 'overview';
  const [user, setUser] = useState<JWTUser | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState({ pending: 0, errors: 0, total: 0 });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncActions, setSyncActions] = useState<any[]>([]);
  const [notifCount, setNotifCount] = useState(0);
  const { success, warning, error: toastError, error } = useToast();

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
            console.log("🚀 Connection restored! Manual sync required.");
            // We disable auto-sync to let the user see the count as requested
            // gmaoApi.syncData().then(() => { ... }).catch(() => {});
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
        setSyncActions(all);
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
      toastError('Conflit détecté', 'Certaines actions (ex: stock insuffisant) n\'ont pas pu être synchronisées. Vérifiez les détails dans le menu de connectivité en bas à gauche.');
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

  // 3. Security: Force redirect to correct dashboard if path mismatch
  useEffect(() => {
    const u = getUserFromToken(); // Get fresh user for redirect check
    if (isLogin || !u?.role) return;

    const currentPath = path;
    const correctRoute = ROLE_ROUTES[u.role];

    // If user is inside /dashboard but on the wrong role subpath
    if (currentPath.startsWith('/dashboard') && !currentPath.startsWith(correctRoute)) {
      console.warn(`🔒 Security: Redirecting ${u.role} from ${currentPath} to ${correctRoute}`);
      router.replace(correctRoute);
    }
  }, [path]);

  function getDashHref() {
    return user?.role ? (ROLE_ROUTES[user.role] ?? '/dashboard/technician') : '/dashboard/technician';
  }

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
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

          {/* ── Admin-specific nav ── */}
          {user?.role === 'admin' && (
            <>
              {[
                { tab: 'overview', label: 'Home', Icon: LayoutDashboard, id: 'nav-dashboard' },
                { tab: 'users', label: 'Utilisateurs', Icon: Users },
                { tab: 'settings', label: 'Paramètres', Icon: Settings },
              ].map(({ tab, label, Icon, id, badge }: { tab: string; label: string; Icon: any; id?: string; badge?: number }) => {
                const href = `/dashboard/admin?tab=${tab}`;
                const isActive = path.startsWith('/dashboard/admin') && currentTab === tab;
                return (
                  <Link key={tab} href={href} id={id} className={`sidebar-link ${isActive ? 'active' : ''} relative`}>
                    <Icon size={20} />
                    <span>{label}</span>
                    {badge && badge > 0 ? (
                      <span className="ml-auto flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-[0.6rem] font-black text-white shadow-lg shadow-red-500/40 animate-pulse">
                        {badge > 99 ? '99+' : badge}
                      </span>
                    ) : isActive ? (
                      <ChevronRight size={14} className="ml-auto text-blue-400" />
                    ) : null}
                  </Link>
                );
              })}
            </>
          )}

          {/* ── Non-admin nav ── */}
          {user?.role !== 'admin' && (
            <>
              {user?.role === 'magasinier' && (
                <Link href="/dashboard/magasinier" id="nav-dashboard" className={`sidebar-link ${path.startsWith('/dashboard/magasinier') ? 'active' : ''}`}>
                  <Warehouse size={20} />
                  <span>Dashboard</span>
                  {path.startsWith('/dashboard/magasinier') && <ChevronRight size={14} className="ml-auto text-blue-400" />}
                </Link>
              )}

              {user?.role !== 'magasinier' && (
                <>
                  <Link href={getDashHref()} id="nav-dashboard" className={`sidebar-link ${path.startsWith('/dashboard') && !path.startsWith('/dashboard/magasinier') ? 'active' : ''}`}>
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

              {user?.role === 'manager' && (
                <Link href="/dashboard/manager/equipe" className={`sidebar-link ${path.startsWith('/dashboard/manager/equipe') ? 'active' : ''}`}>
                  <Users size={20} />
                  <span>Supervision Équipe</span>
                  {path.startsWith('/dashboard/manager/equipe') && <ChevronRight size={14} className="ml-auto text-blue-400" />}
                </Link>
              )}

              {user?.role === 'magasinier' && (
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
            </>
          )}
        </nav>

        {/* ── Connectivity & System Health ── */}
        <div className="mt-auto px-2 pb-6 space-y-3 border-t border-white/5 pt-6">
          <div id="sidebar-sync-btn" className={`
            relative overflow-hidden rounded-3xl border transition-all duration-500 p-4
            ${!isOnline
              ? 'bg-rose-500/5 border-rose-500/20'
              : pendingSyncCount > 0
                ? 'bg-amber-500/5 border-amber-500/20'
                : 'bg-emerald-500/5 border-emerald-500/20'
            }
          `}>
            {/* Background Glow */}
            <div className={`
              absolute -right-4 -top-4 size-24 blur-3xl opacity-20 transition-colors duration-1000
              ${!isOnline ? 'bg-rose-500' : pendingSyncCount > 0 ? 'bg-amber-500' : 'bg-emerald-500'}
            `} />

            <div className="relative z-10 space-y-4">
              {/* Status Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`
                    size-2.5 rounded-full shadow-lg transition-all duration-500
                    ${!isOnline
                      ? 'bg-rose-500 shadow-rose-500/50 animate-pulse'
                      : pendingSyncCount > 0
                        ? 'bg-amber-500 shadow-amber-500/50 animate-bounce'
                        : 'bg-emerald-500 shadow-emerald-500/50'
                    }
                  `} />
                  <span className={`
                    text-[0.65rem] font-black uppercase tracking-widest
                    ${!isOnline ? 'text-rose-400' : pendingSyncCount > 0 ? 'text-amber-400' : 'text-emerald-400'}
                  `}>
                    {!isOnline ? 'Mode Hors-Ligne' : pendingSyncCount > 0 ? 'Actions en attente' : 'Système à jour'}
                  </span>
                </div>
                {isSyncing && <Loader2 size={12} className="animate-spin text-blue-400" />}
              </div>

              {/* Status Message */}
              <div className="space-y-1">
                <p className="text-xs font-bold text-white leading-tight">
                  {!isOnline
                    ? (pendingSyncCount > 0 ? `${pendingSyncCount} action(s) sauvegardée(s)` : 'Connexion perdue')
                    : pendingSyncCount > 0
                      ? `${pendingSyncCount} action(s) à synchroniser`
                      : 'Données synchronisées'}
                </p>
                <p className="text-[0.6rem] font-medium text-slate-500 leading-relaxed uppercase tracking-tighter">
                  {!isOnline
                    ? (pendingSyncCount > 0 ? 'Synchronisation dès le retour du réseau' : 'Vos modifications sont sauvegardées localement')
                    : pendingSyncCount > 0
                      ? 'Cliquez pour forcer la mise à jour SAP'
                      : 'Tout est en règle avec le serveur central'}
                </p>
              </div>

              {/* Pending Actions List */}
              {syncActions.length > 0 && (
                <div className="space-y-2 mt-4 pt-4 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-[0.55rem] font-black text-slate-600 uppercase tracking-widest">Activités en file d'attente</span>
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-hide">
                    {syncActions.map((action) => (
                      <div key={action.id} className={`p-2 rounded-lg border transition-all ${action.status === 'error'
                        ? 'bg-rose-500/10 border-rose-500/20'
                        : 'bg-white/5 border-white/5'
                        }`}>
                        <div className="flex items-center justify-between group/act">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`size-1.5 rounded-full shrink-0 ${action.status === 'error' ? 'bg-rose-500' : 'bg-amber-500 animate-pulse'}`} />
                            <span className="font-bold text-slate-300 uppercase truncate text-[0.6rem]">
                              {ACTION_NAMES[action.type] || action.type.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[0.5rem] font-medium text-slate-600">
                              {new Date(action.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (confirm('Supprimer cette action de la file d\'attente ?')) {
                                  await db.syncQueue.delete(action.id!);
                                }
                              }}
                              className={`p-1 hover:text-rose-500 transition-all ${action.status === 'error' ? 'text-rose-500' : 'opacity-0 group-hover/act:opacity-100 text-slate-600'
                                }`}
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                        </div>
                        {action.status === 'error' && action.errorMessage && (
                          <div className="mt-1 text-[0.55rem] text-rose-400 font-bold leading-tight border-t border-rose-500/10 pt-1 flex items-start gap-1">
                            <AlertCircle size={8} className="shrink-0 mt-0.5" />
                            <span>{action.errorMessage}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Button (Only if pending or offline) */}
              {(pendingSyncCount > 0 || !isOnline) && (
                <button
                  onClick={handleManualSync}
                  disabled={isSyncing || !isOnline}
                  className={`
                    w-full py-2.5 rounded-xl flex items-center justify-center gap-2 text-[0.6rem] font-black uppercase tracking-widest transition-all
                    ${isOnline
                      ? 'bg-amber-500 text-white hover:bg-amber-400 shadow-lg shadow-amber-500/20 active:scale-95 mt-2'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50 mt-2'
                    }
                  `}
                >
                  {isSyncing ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <RefreshCw size={12} />
                  )}
                  {isSyncing ? 'En cours...' : !isOnline ? 'Attente Réseau' : 'Synchroniser'}
                </button>
              )}
            </div>
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
          <Suspense fallback={
            <div className="flex justify-center items-center min-h-screen bg-slate-950">
              <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
          }>
            <ClientAppWrapper>
              {children}
            </ClientAppWrapper>
          </Suspense>
        </ToastProvider>
      </body>
    </html>
  );
}