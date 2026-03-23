'use client';
import './globals.css';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Wrench, ClipboardList,
  Package, LogOut, ShieldCheck, Settings, ChevronRight,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { ToastProvider } from '../components/ui/toast';

// ────────────────────────────────────────────
// JWT helpers
// ────────────────────────────────────────────
interface JWTUser {
  sub?: string;   // username
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

// ────────────────────────────────────────────
// Config
// ────────────────────────────────────────────
const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur',
  technician: 'Technicien',
  manager: 'Responsable',
};

const ROLE_ROUTES: Record<string, string> = {
  admin: '/dashboard/admin',
  technician: '/dashboard/technician',
  manager: '/dashboard/manager',
};

// ────────────────────────────────────────────
// Layout
// ────────────────────────────────────────────
export default function RootLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<JWTUser | null>(null);

  const isLogin = path === '/login' || path === '/';

  // Re-decode JWT on every navigation
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

  // name comes from JWT (set by backend) — fallback to sub (username) if missing
  const displayName = user?.name || user?.sub || 'Utilisateur';
  const displayRole = user?.role ? (ROLE_LABELS[user.role] ?? user.role) : 'Rôle';
  const avatarLetter = displayName[0]?.toUpperCase() ?? 'U';

  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <title>GMAO PRO | Excellence Azure</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <style>{`body { font-family: 'Outfit', sans-serif; }`}</style>
      </head>
      <body suppressHydrationWarning className="bg-slate-950 text-slate-100 min-h-screen">
        <ToastProvider>
          {!isLogin ? (
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

                  <Link href={getDashHref()} className={`sidebar-link ${path.startsWith('/dashboard') ? 'active' : ''}`}>
                    <LayoutDashboard size={20} />
                    <span>Dashboard</span>
                    {path.startsWith('/dashboard') && <ChevronRight size={14} className="ml-auto text-blue-400" />}
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

                  <Link href="/stock" className={`sidebar-link ${path === '/stock' ? 'active' : ''}`}>
                    <Package size={20} />
                    <span>Stock Pièces</span>
                    {path === '/stock' && <ChevronRight size={14} className="ml-auto text-blue-400" />}
                  </Link>
                </nav>

                {/* ── Bottom ── */}
                <div className="mt-auto pt-6 border-t border-white/5 space-y-1">

                  {/* User card */}
                  <div className="px-4 py-3 mb-3 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-3">
                    <div className="size-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-inner shrink-0">
                      {avatarLetter}
                    </div>
                    <div className="flex flex-col overflow-hidden min-w-0">
                      <span className="text-sm font-bold text-white truncate leading-tight">
                        {displayName}
                      </span>
                      <span className="text-[0.6rem] font-bold text-blue-400 uppercase tracking-widest mt-0.5">
                        {displayRole}
                      </span>
                    </div>
                  </div>

                  <Link href="/settings" className="sidebar-link hover:text-white">
                    <Settings size={20} />
                    <span>Paramètres</span>
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="sidebar-link w-full text-left hover:text-red-400 hover:bg-red-400/5 group"
                  >
                    <LogOut size={20} className="group-hover:text-red-400" />
                    <span>Déconnexion</span>
                  </button>
                </div>

              </aside>
              <main className="main-content">
                {children}
              </main>
            </div>
          ) : (
            children
          )}
        </ToastProvider>
      </body>
    </html>
  );
}