import { useRouter } from 'next/navigation'; // Navigation programmée Next.js
import { X, History, Activity, Calendar, ArrowUpRight, Brain, CalendarClock, Zap, Plus, ClipboardList } from 'lucide-react'; // Icônes visuelles de Lucide

interface Props {
    machine: any; // Données de la machine sélectionnée
    machineOrders: any[]; // Ses interventions associées
    loadingOrders: boolean; // Vrai si le chargement des OTs associés est en cours
    triggeringMaintenance: boolean; // Vrai si le technicien déclenche une maintenance préventive
    onClose: () => void; // Fonction de fermeture du panneau latéral
    onTriggerMaintenance: (m: any) => void; // Fonction pour planifier une maintenance immédiate
}

export default function MachineSidePanel({ machine, machineOrders, loadingOrders, triggeringMaintenance, onClose, onTriggerMaintenance }: Props) {
    const router = useRouter(); // Router Next.js pour naviguer vers d'autres pages

    return (
        // Conteneur fixe, glissant depuis la droite, floutant l'arrière-plan (backdrop-blur) pour un rendu premium
        <div className="fixed inset-y-0 right-0 z-[150] w-[450px] bg-slate-950/80 backdrop-blur-xl border-l border-white/5 shadow-[-20px_0_50px_rgba(0,0,0,0.5)] animate-in slide-in-from-right duration-500 flex flex-col">
            
            {/* 1. EN-TÊTE : NOM ET RÉFÉRENCE DE LA MACHINE + BOUTON FERMER */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-900/40">
                <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-400 border border-blue-500/20"><History size={20} /></div>
                    <div>
                        <h3 className="text-lg font-black text-white tracking-tight leading-none uppercase">{machine.name}</h3>
                        <p className="text-[0.65rem] font-bold text-slate-500 tracking-[0.2em] mt-1">{machine.reference}</p>
                    </div>
                </div>
                {/* Bouton de fermeture "X" */}
                <button onClick={onClose} className="size-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all"><X size={18} /></button>
            </div>

            {/* Corps défilable (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
                
                {/* 2. STATISTIQUES RAPIDES DE LA MACHINE */}
                <div className="grid grid-cols-2 gap-3">
                    {/* Nombre total d'interventions sur cette machine */}
                    <div className="azure-card p-4 flex flex-col items-center text-center gap-1 bg-blue-500/5">
                        <div className="text-2xl font-black text-white">{machineOrders.length}</div>
                        <div className="text-[0.55rem] font-bold text-slate-500 uppercase tracking-widest">Interventions</div>
                    </div>
                    {/* Nombre d'interventions réussies/clôturées */}
                    <div className="azure-card p-4 flex flex-col items-center text-center gap-1 bg-emerald-500/5">
                        <div className="text-2xl font-black text-white">{machineOrders.filter(o => o.status === 'done').length}</div>
                        <div className="text-[0.55rem] font-bold text-slate-500 uppercase tracking-widest">Réussies</div>
                    </div>
                </div>

                {/* 3. 🧠 MODULE TECHNIQUE DE DIAGNOSTIC IA (Machine Learning) */}
                <div className="azure-card p-5 bg-blue-600/5 border-blue-500/20 relative overflow-hidden">
                    <Brain className="absolute -right-2 -top-2 size-16 text-blue-500/5 -rotate-12" />
                    <div className="flex items-center gap-2 mb-4 relative z-10"><Brain size={16} className="text-blue-400" /><span className="text-[0.7rem] font-black text-white uppercase tracking-widest">Analyse de l'IA</span></div>
                    
                    {/* Explications et anomalies détectées par le modèle prédictif */}
                    <div className="space-y-2 relative z-10">
                        {(machine as any).ml_reasons?.length > 0 ? (machine as any).ml_reasons.map((reason: string, i: number) => (
                            <div key={i} className="flex items-start gap-2 text-[0.65rem] font-bold text-slate-400">
                                <div className="mt-1 size-1.5 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.5)]" /><span>{reason}</span>
                            </div>
                        )) : <p className="text-[0.65rem] text-slate-500 italic">Aucune donnée d'analyse disponible.</p>}
                    </div>
                    
                    {/* Indicateur de fiabilité (Fiabilité / Santé ML) */}
                    <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between relative z-10">
                        <span className="text-[0.6rem] font-black text-slate-500 uppercase">Indice de Fiabilité</span>
                        <span className={`text-xs font-black ${(machine as any).ml_score > 70 ? 'text-emerald-400' : 'text-rose-400'}`}>{(machine as any).ml_score || machine.health_score}%</span>
                    </div>
                </div>

                {/* 4. HISTORIQUE / TIMELINE DES DERNIERS ORDRES DE TRAVAIL */}
                <div>
                    <div className="flex items-center gap-2 mb-6 uppercase tracking-[0.2em] text-[0.65rem] font-black text-slate-500"><Activity size={14} className="text-blue-400" /> Historique des Interventions</div>
                    
                    {/* CAS A : LES ORDRES DE TRAVAIL CHARGENT */}
                    {loadingOrders ? (
                        <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse" />)}</div>
                    ) : machineOrders.length > 0 ? (
                        
                        // CAS B : IL Y A DES ORDRES DE TRAVAIL CONSIGNÉS
                        <div className="space-y-4 relative pl-4 border-l border-white/5 ml-1">
                            {machineOrders.map(o => (
                                <div key={o.id} className="relative group/item">
                                    <div className="absolute -left-[21px] top-6 size-2.5 rounded-full bg-slate-900 border border-blue-500/50 group-hover/item:bg-blue-500 transition-colors" />
                                    {/* Clic sur un OT redirige le technicien vers sa fiche complète */}
                                    <div onClick={() => router.push(`/work-orders/${o.id}`)} className="bg-white/5 border border-white/5 hover:border-blue-500/30 hover:bg-white/10 p-4 rounded-xl transition-all cursor-pointer group">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[0.6rem] font-black text-blue-400 uppercase tracking-widest">#{o.sap_order_id || o.id}</span>
                                            <span className="text-[0.55rem] font-bold text-slate-500 flex items-center gap-1"><Calendar size={10} /> {o.planned_start_date}</span>
                                        </div>
                                        <h4 className="text-sm font-bold text-white mb-2 leading-snug group-hover:text-blue-400 transition-colors">{o.title}</h4>
                                        <div className="flex items-center justify-between">
                                            <div className={`px-2 py-0.5 rounded-md text-[0.55rem] font-black uppercase tracking-widest ${o.status === 'done' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>{o.status === 'done' ? 'Terminé' : 'En cours'}</div>
                                            <ArrowUpRight size={14} className="text-slate-600 opacity-0 group-hover:opacity-100 transition-all" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        // CAS C : AUCUN ORDRE DE TRAVAIL TROUVÉ
                        <div className="text-center py-12 px-6 azure-card bg-slate-900/20 border-dashed border-2">
                            <ClipboardList size={32} className="mx-auto text-slate-700 mb-4" />
                            <p className="text-xs font-bold text-slate-500 italic uppercase tracking-widest">Aucune intervention enregistrée pour cette machine.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* 5. ACTIONS CENTRALISÉES EN BAS (Déclenchement préventif SAP & Création d'OT) */}
            <div className="p-6 bg-slate-900/60 border-t border-white/5 space-y-3">
                
                {/* Encadré Plan Préventif (géré par SAP) */}
                <div className="azure-card p-4 bg-violet-500/5 border-violet-500/20">
                    <div className="flex items-center gap-2 mb-3"><CalendarClock size={16} className="text-violet-400" /><span className="text-[0.65rem] font-black text-violet-400 uppercase tracking-widest">Plan Préventif</span></div>
                    <div className="flex justify-between items-center text-xs mb-3">
                        <div>
                            <div className="text-[0.6rem] font-bold text-slate-500 uppercase mb-0.5">Fréquence</div>
                            <div className="font-black text-white">Tous les {machine.maintenance_frequency_days || 90}j</div>
                        </div>
                        <div className="text-right">
                            <div className="text-[0.6rem] font-bold text-slate-500 uppercase mb-0.5">Prochaine</div>
                            <div className={`font-black ${machine.next_maintenance_date && new Date(machine.next_maintenance_date) < new Date() ? 'text-rose-400' : 'text-white'}`}>
                                {machine.next_maintenance_date ? new Date(machine.next_maintenance_date).toLocaleDateString('fr-FR') : 'Non planifiée'}
                            </div>
                        </div>
                    </div>
                    {/* Déclenchement manuel d'un plan de maintenance préventive dans SAP */}
                    <button onClick={() => onTriggerMaintenance(machine)} disabled={triggeringMaintenance} className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-black uppercase text-xs tracking-[0.15em] transition-all flex items-center justify-center gap-2">
                        <Zap size={14} /> {triggeringMaintenance ? 'Création...' : 'Déclencher OT Préventif'}
                    </button>
                </div>
                
                {/* Bouton bleu principal pour créer une nouvelle intervention curative sur cette machine */}
                <button onClick={() => router.push(`/work-orders/new?machine=${machine.reference}`)} className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-xs tracking-[0.2em] shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2">
                    <Plus size={16} /> Créer une Intervention
                </button>
            </div>
        </div>
    );
}
