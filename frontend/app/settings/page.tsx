'use client';
import { useEffect, useState } from 'react';
import { Loader2, Settings as SettingsIcon } from 'lucide-react';
import { getCurrentUser } from './_components/types';

// Lazy imports to avoid loading all role pages at once
import dynamic from 'next/dynamic';

const AdminSettings      = dynamic(() => import('./_components/AdminSettings'),      { 
    ssr: false,
    loading: () => <div className="flex h-[50vh] items-center justify-center"><Loader2 className="animate-spin text-slate-500" /></div>
});
const ManagerSettings    = dynamic(() => import('./_components/ManagerSettings'),    { 
    ssr: false,
    loading: () => <div className="flex h-[50vh] items-center justify-center"><Loader2 className="animate-spin text-slate-500" /></div>
});
const TechnicianSettings = dynamic(() => import('./_components/TechnicianSettings'), { 
    ssr: false,
    loading: () => <div className="flex h-[50vh] items-center justify-center"><Loader2 className="animate-spin text-slate-500" /></div>
});
const MagasinierSettings = dynamic(() => import('./_components/MagasinierSettings'), { 
    ssr: false,
    loading: () => <div className="flex h-[50vh] items-center justify-center"><Loader2 className="animate-spin text-slate-500" /></div>
});

export default function SettingsPage() {
    const [role, setRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const user = getCurrentUser();
        if (user) {
            setRole(user.role);
        }
        setLoading(false);
    }, []);

    if (loading) {
        return (
            <div className="flex h-[70vh] items-center justify-center">
                <Loader2 size={32} className="animate-spin text-blue-500" />
            </div>
        );
    }

    if (!role) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center">
                <div className="size-20 rounded-3xl bg-slate-900 border-2 border-dashed border-white/10 flex items-center justify-center text-slate-600 mb-6">
                    <SettingsIcon size={32} />
                </div>
                <h1 className="text-2xl font-black text-white tracking-tight mb-2">Accès Non Autorisé</h1>
                <p className="text-slate-500 max-w-xs text-sm font-medium">
                    Veuillez vous reconnecter pour accéder aux paramètres de votre compte.
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-8 animate-in fade-in duration-500">
            {role === 'admin' && <AdminSettings />}
            {role === 'manager' && <ManagerSettings />}
            {role === 'magasinier' && <MagasinierSettings />}
            {role === 'technician' && <TechnicianSettings />}
            
            {/* Fallback for unknown roles */}
            {!['admin', 'manager', 'magasinier', 'technician'].includes(role) && <TechnicianSettings />}
        </div>
    );
}
