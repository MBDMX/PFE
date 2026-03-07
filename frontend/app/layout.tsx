'use client';
import './globals.css';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Wrench, ClipboardList, Package, LogOut } from 'lucide-react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const isLogin = path === '/login' || path === '/';

  function getDashHref() {
    if (typeof window === 'undefined') return '/dashboard/admin';
    const u = localStorage.getItem('user');
    if (!u) return '/dashboard/admin';
    return `/dashboard/${JSON.parse(u).role}`;
  }

  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <title>GMAO Platform</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning style={{ fontFamily: '"Outfit", sans-serif' }}>
        {!isLogin && (
          <aside className="sidebar">
            <div className="sidebar-logo">
              <Wrench size={20} color="#3b82f6" />
              GMAO Platform
            </div>
            <Link href={getDashHref()} className={`sidebar-link ${path.startsWith('/dashboard') ? 'active' : ''}`}>
              <LayoutDashboard size={18} /> Tableau de bord
            </Link>
            <Link href="/machines" className={`sidebar-link ${path === '/machines' ? 'active' : ''}`}>
              <Wrench size={18} /> Machines
            </Link>
            <Link href="/work-orders" className={`sidebar-link ${path === '/work-orders' ? 'active' : ''}`}>
              <ClipboardList size={18} /> Ordres de travail
            </Link>
            <Link href="/stock" className={`sidebar-link ${path === '/stock' ? 'active' : ''}`}>
              <Package size={18} /> Stock
            </Link>
            <div className="sidebar-footer">
              <button
                style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                className="sidebar-link"
                onClick={() => { localStorage.clear(); router.push('/login'); }}>
                <LogOut size={18} /> Déconnexion
              </button>
            </div>
          </aside>
        )}
        <div className={isLogin ? '' : 'main'}>
          {children}
        </div>
      </body>
    </html>
  );
}
