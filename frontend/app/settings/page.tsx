'use client';
import { useState } from 'react';
import { Settings as SettingsIcon, Shield, Bell, Key, Database, RefreshCcw, AlertTriangle, Loader2 } from 'lucide-react';
import { gmaoApi } from '../../services/api';
import { useToast } from '../../components/ui/toast';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
    const { success, error } = useToast();
    const router = useRouter();
    const [isResetting, setIsResetting] = useState(false);

    const handleResetSystem = async () => {
        if (!confirm("ATTENTION: Êtes-vous ABSOLUMENT certain de vouloir remettre à zéro la base de données ?\n\nToutes les données (Ordres de travail, opérations de stock, demandes de pièces) seront supprimées et remplacées par les données de base.")) {
            return;
        }

        setIsResetting(true);
        try {
            await gmaoApi.resetSystem();
            success("Base de données réinitialisée !");
            
            // Clear local storage and redirect to login to force a clean re-auth and refetch
            localStorage.clear();
            
            setTimeout(() => {
                window.location.href = '/login';
            }, 1000);

        } catch (err) {
            console.error(err);
            error("Une erreur est survenue lors de la réinitialisation.");
            setIsResetting(false);
        }
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 min-h-[80vh] flex flex-col items-center justify-center p-8">
            <div className="size-24 rounded-3xl bg-slate-900 border-2 border-dashed border-white/10 flex items-center justify-center text-slate-500 mb-8 relative">
                {isResetting ? (
                    <Loader2 size={40} className="animate-spin text-rose-500" />
                ) : (
                    <SettingsIcon size={40} className="animate-spin-slow" />
                )}
                {isResetting && (
                    <span className="absolute -bottom-10 text-rose-500 font-bold animate-pulse uppercase tracking-widest text-xs whitespace-nowrap">
                        Réinitialisation...
                    </span>
                )}
            </div>

            <h1 className="text-3xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent tracking-tight mb-4 text-center">
                Paramètres Système
            </h1>

            <p className="text-slate-400 font-medium text-center max-w-md mb-12">
                Gestion avancée et maintenance du cœur du système GMAO.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                {[
                    { icon: Shield, title: "Sécurité & Rôles", desc: "Configuration des accès (Bientôt)" },
                    { icon: Bell, title: "Notifications", desc: "Règles d'alertes auto (Bientôt)" },
                    { icon: Key, title: "Intégration SAP", desc: "Clés API et connecteurs (Bientôt)" },
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

                {/* Reset Database Real Widget */}
                <div className="azure-card p-6 border-rose-500/30 bg-gradient-to-br from-slate-900 to-rose-950/20 group hover:border-rose-500/50 transition-all flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-4 mb-2">
                            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 group-hover:scale-110 transition-transform">
                                <Database size={18} />
                            </div>
                            <h3 className="font-bold text-white tracking-tight">Base de données</h3>
                        </div>
                        <p className="text-xs text-slate-400 font-medium mb-4">
                            Option de niveau Super-Admin pour remettre l'application à l'état de démonstration. Attention, action irréversible.
                        </p>
                    </div>
                    
                    <button 
                        onClick={handleResetSystem}
                        disabled={isResetting}
                        className="w-full py-3 px-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all bg-rose-600/10 text-rose-500 border border-rose-500/30 hover:bg-rose-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isResetting ? <Loader2 size={16} className="animate-spin" /> : <AlertTriangle size={16} />}
                        Réinitialiser à Zéro
                    </button>
                </div>
            </div>
        </div>
    );
}
