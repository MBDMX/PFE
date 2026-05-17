'use client'; // Indique à Next.js que ce fichier s'exécute côté navigateur (composant dynamique interactif)

import { useEffect, useState } from 'react'; // Gestion des états React et cycle de vie
import { Loader2, Settings as SettingsIcon } from 'lucide-react'; // Icônes de chargement et de rouage
import { getCurrentUser } from './_components/types';

// 🚀 IMPORTATION PARESSEUSE DYNAMIQUE (Lazy Loading next/dynamic) :
// Permet de ne charger le code des paramètres spécifiques qu'au moment où l'utilisateur en a besoin,
// évitant de charger des composants Admin/Manager lourds pour un simple technicien connecté.
import dynamic from 'next/dynamic';

const AdminSettings      = dynamic(() => import('./_components/AdminSettings'),      { 
    ssr: false, // Désactive le rendu côté serveur (Server Side Rendering) car on lit du localStorage
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
    const [role, setRole] = useState<string | null>(null); // Stocke le rôle décodé de l'utilisateur
    const [loading, setLoading] = useState(true); // Statut de chargement initial

    // 📡 RÉCUPÉRATION DU RÔLE AU MONTAGE DU COMPOSANT
    useEffect(() => {
        const user = getCurrentUser(); // Récupère l'utilisateur depuis le jeton JWT
        if (user) {
            setRole(user.role); // Renseigne le rôle
        }
        setLoading(false);
    }, []);

    // 1. ÉCRAN DE CHARGEMENT INITIAL (Spinner tournant bleu)
    if (loading) {
        return (
            <div className="flex h-[70vh] items-center justify-center">
                <Loader2 size={32} className="animate-spin text-blue-500" />
            </div>
        );
    }

    // 2. CAS D'ACCÈS NON AUTORISÉ (Si l'utilisateur n'est pas connecté ou n'a pas de session)
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

    // 3. AFFICHAGE DU COMPOSANT DÉDIÉ SELON LE RÔLE DÉTECTÉ (Admin, Manager, Magasinier ou Technicien)
    return (
        <div className="max-w-6xl mx-auto px-4 py-8 animate-in fade-in duration-500">
            {role === 'admin' && <AdminSettings />}
            {role === 'manager' && <ManagerSettings />}
            {role === 'magasinier' && <MagasinierSettings />}
            {role === 'technician' && <TechnicianSettings />}
            
            {/* Cas de secours (fallback) pour les rôles inconnus ou mal formés */}
            {!['admin', 'manager', 'magasinier', 'technician'].includes(role) && <TechnicianSettings />}
        </div>
    );
}
