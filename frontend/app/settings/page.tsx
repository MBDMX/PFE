'use client';
import { Settings as SettingsIcon, Shield, Bell, Key, Database } from 'lucide-react';

export default function SettingsPage() {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 min-h-[80vh] flex flex-col items-center justify-center p-8">
            <div className="size-24 rounded-3xl bg-slate-900 border-2 border-dashed border-white/10 flex items-center justify-center text-slate-500 mb-8">
                <SettingsIcon size={40} className="animate-spin-slow" />
            </div>

            <h1 className="text-3xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent tracking-tight mb-4 text-center">
                Paramètres Système
            </h1>

            <p className="text-slate-400 font-medium text-center max-w-md mb-12">
                L'interface d'administration avancée et la personnalisation de votre espace GMAO sont actuellement en cours de développement.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                {[
                    { icon: Shield, title: "Sécurité & Rôles", desc: "Gestion des accès et permissions (Bientôt)" },
                    { icon: Bell, title: "Notifications", desc: "Configuration des alertes (Bientôt)" },
                    { icon: Key, title: "Synchronisation SAP", desc: "Clés API et authentification (Bientôt)" },
                    { icon: Database, title: "Base de données", desc: "Export et sauvegardes (Bientôt)" },
                ].map((item, i) => (
                    <div key={i} className="azure-card p-6 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all cursor-not-allowed">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="p-2 rounded-lg bg-white/5 text-slate-400">
                                <item.icon size={18} />
                            </div>
                            <h3 className="font-bold text-white tracking-tight">{item.title}</h3>
                        </div>
                        <p className="text-xs text-slate-500 font-medium">{item.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
