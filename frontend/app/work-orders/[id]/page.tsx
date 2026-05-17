'use client'; // Indique à Next.js que ce fichier s'exécute côté navigateur (composant dynamique interactif)

import { useState, use } from 'react'; // useState : gère l'état local. use : permet d'extraire de manière moderne les paramètres de l'URL
import { useRouter } from 'next/navigation'; // Outil pour rediriger l'utilisateur vers d'autres pages
import { useLiveQuery } from 'dexie-react-hooks'; // Hook Dexie pour écouter la base IndexedDB locale en temps réel
import { db } from '../../../lib/db'; // Importation de la base de données locale IndexedDB (Dexie)
import { AlertTriangle, FileText, Paperclip, ArrowLeft, Clock, Activity, CheckCircle, X as XIcon } from 'lucide-react'; // Belles icônes vectorielles
import { gmaoApi } from '../../../services/api'; // Services pour parler au serveur backend FastAPI
import { useToast } from '../../../components/ui/toast'; // Système de jolies notifications pop-up

// Importation des composants visuels qui composent cette fiche détaillée
import TimerWidget from './_components/TimerWidget'; // Le chronomètre d'intervention pour mesurer le temps passé
import WorkOrderHeader from './_components/WorkOrderHeader'; // L'en-tête (boutons modifier, télécharger PDF, clore)
import WorkOrderInfoCards from './_components/WorkOrderInfoCards'; // Les cartes avec les détails de la machine et l'intervenant
import InterventionChecklist from './_components/InterventionChecklist'; // La checklist des tâches à réaliser (ex: nettoyer, graisser)
import PartRequests from './_components/PartRequests'; // Le panneau de demande de pièces détachées pour cette intervention
import WorkOrderTimeline from './_components/WorkOrderTimeline'; // L'historique d'activité de ce bon de travail

// Composant principal de la page de détails de l'OT
export default function WorkOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter(); // Permet d'effectuer des redirections de pages
    const { id } = use(params); // Extrait l'identifiant (ID) de l'OT depuis l'URL de la page (ex: /work-orders/45)
    const { success: toastSuccess, error: toastError } = useToast(); // Outil de notifications pop-up
    
    // VARIABLES D'ÉTAT :
    const [updating, setUpdating] = useState(false); // Si vrai, affiche un chargement pendant qu'on enregistre une modif
    const [isDownloading, setIsDownloading] = useState(false); // Si vrai, affiche que le PDF est en cours de téléchargement

    // 📡 1. LECTURE AUTOMATIQUE DE CET OT DANS LE CACHE INDEXEDDB (DEXIE)
    const order = useLiveQuery(async () => {
        const results = await db.workOrders.toArray(); // Récupère tous les OTs locaux
        const found = results.find((w: any) => String(w.id) === String(id)); // Cherche l'OT correspondant à notre ID
        const isSapOtWithNoSteps = found?.sap_order_id && (!found.steps || found.steps.length === 0);
        
        // Si l'OT n'est pas dans le cache, ou qu'il lui manque des informations, on le télécharge depuis le serveur FastAPI
        if (!found || found.parts === undefined || found.steps === undefined || isSapOtWithNoSteps) {
            try { 
                const fresh = await gmaoApi.getWorkOrder(id); // Récupère l'OT frais depuis le backend
                if (fresh) return fresh; 
            } catch { }
        }
        return found; // Renvoie l'OT trouvé
    }, [id]);

    // Lecture de la liste de toutes les pièces en stock pour les propositions de pièces de rechange
    const stockItems = useLiveQuery(() => db.stock.toArray()) || [];

    // GESTION DU RÔLE DE L'UTILISATEUR CONNECTÉ :
    const currentUser = gmaoApi.getCurrentUser(); // Récupère l'utilisateur connecté
    const isManager = currentUser?.role === 'manager' || currentUser?.role === 'admin'; // Vrai si c'est un responsable
    const canManage = isManager || Number(currentUser?.id) === Number(order?.created_by); // Droit de modifier l'OT si responsable ou créateur

    // 🎨 STYLE VISUEL : Associe de belles couleurs et icônes à chaque statut d'intervention
    const getStatusStyle = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'open': return { label: 'Ouvert', color: 'text-amber-400', bg: 'bg-amber-400/10', icon: Clock };
            case 'in_progress': return { label: 'En cours', color: 'text-blue-400', bg: 'bg-blue-400/10', icon: Activity };
            case 'pending_deletion': return { label: 'Suppression en attente', color: 'text-rose-500', bg: 'bg-rose-500/10', icon: AlertTriangle };
            case 'done': return { label: 'Terminé', color: 'text-emerald-400', bg: 'bg-emerald-400/10', icon: CheckCircle };
            case 'closed': return { label: 'Clôturé', color: 'text-slate-500', bg: 'bg-slate-500/10', icon: XIcon };
            default: return { label: 'Inconnu', color: 'text-slate-400', bg: 'bg-slate-400/10', icon: Clock };
        }
    };

    // 🎨 STYLE VISUEL : Associe des couleurs aux étiquettes de priorités
    const getPriorityStyle = (priority: string) => {
        switch ((priority || 'medium').toLowerCase()) {
            case 'low': return { label: 'Priorité Faible', color: 'text-slate-400', border: 'border-slate-500/30' };
            case 'high': return { label: 'Priorité Élevée', color: 'text-orange-400', border: 'border-orange-500/30' };
            case 'critical': return { label: 'Priorité Critique', color: 'text-rose-400', border: 'border-rose-500/40 bg-rose-500/5' };
            default: return { label: 'Priorité Moyenne', color: 'text-blue-400', border: 'border-blue-500/30' };
        }
    };

    // 🏁 2. ACTION : MARQUER L'INTERVENTION COMME TERMINÉE
    async function markAsDone() {
        if (updating || !order) return; // Sécurité : si déjà en train d'enregistrer, on ne fait rien
        setUpdating(true); // Active l'état de chargement
        // Mise à jour immédiate dans la base locale (IndexedDB) pour que l'écran réagisse sans délai
        await db.workOrders.update(Number(id), { status: 'done', actual_end_date: new Date().toISOString().split('T')[0] });
        try {
            const res = await gmaoApi.updateWorkOrder(order.id, { status: 'done' }); // Envoie l'information au serveur FastAPI
            const freshWO = await gmaoApi.getWorkOrder(id); // Recharge l'OT rafraîchi (avec calculs de santé machine)
            if (freshWO) await db.workOrders.put(freshWO); // Sauvegarde le bon propre dans IndexedDB
            const updates = (res as any)._stock_updates ?? []; // Pièces qui ont été déduites du stock SAP
            updates.length > 0
                ? toastSuccess('OT terminé — Stock mis à jour', updates.map((u: any) => `${u.part} (−${u.deducted})`).join(', '))
                : toastSuccess('✅ OT marqué comme terminé — Score de santé recalculé');
        } catch {
            // En cas de panne de réseau ou d'échec serveur, on remet l'ancien état pour éviter les fausses informations
            await db.workOrders.update(Number(id), { status: order.status, actual_end_date: order.actual_end_date });
            toastError('Échec de la mise à jour — Réessayez');
        } finally { setUpdating(false); } // Désactive l'état de chargement
    }

    // 🗑️ 3. ACTION : SUPPRESSION D'UN OT
    async function handleDelete() {
        if (!confirm(isManager ? 'Supprimer définitivement cet OT ?' : 'Demander la suppression de votre OT ?')) return;
        setUpdating(true); // Active le chargement
        try {
            const res = await gmaoApi.deleteWorkOrder(order.id); // Envoie l'action de suppression au serveur FastAPI
            if (res.offline || res.status === 'pending_deletion') {
                // Si hors-ligne ou que l'utilisateur est un simple technicien, l'OT passe en "Attente de suppression"
                toastSuccess('Demande de suppression envoyée au responsable.');
                await db.workOrders.put(await gmaoApi.getWorkOrder(id)); // Actualise l'état local
            } else {
                toastSuccess('Ordre de travail supprimé.');
                await db.workOrders.delete(order.id); // Supprime l'OT de la base IndexedDB locale
                router.push('/work-orders'); // Redirige vers la liste globale
            }
        } catch { toastError('Échec de la suppression'); }
        finally { setUpdating(false); } // Désactive le chargement
    }

    // 👍 4. ACTION : VALIDATION DE LA SUPPRESSION (Réservé aux Managers)
    async function handleApproveDeletion() {
        setUpdating(true);
        try { 
            await gmaoApi.approveWorkOrderDeletion(order.id); // Confirme la suppression définitive dans SAP & FastAPI
            toastSuccess('OT supprimé définitivement.'); 
            router.push('/work-orders'); // Retourne à la liste
        } catch { toastError("Échec de l'approbation"); } 
        finally { setUpdating(false); }
    }

    // 👎 5. ACTION : REFUS DE LA SUPPRESSION (Réservé aux Managers)
    async function handleRejectDeletion() {
        setUpdating(true);
        try { 
            await gmaoApi.rejectWorkOrderDeletion(order.id); // Refuse la demande, l'OT redevient actif
            toastSuccess('Suppression rejetée, OT restauré.'); 
            await db.workOrders.put(await gmaoApi.getWorkOrder(id)); // Actualise la base IndexedDB locale
        } catch { toastError('Échec du rejet'); } 
        finally { setUpdating(false); }
    }

    // 📄 6. ACTION : TÉLÉCHARGEMENT DU RAPPORT D'INTERVENTION PDF
    async function handleDownloadPDF() {
        if (isDownloading || !order) return; // Sécurité : évite les clics multiples
        setIsDownloading(true); // Active l'état de téléchargement (affiche un sablier)
        try { 
            await gmaoApi.downloadWorkOrderReport(order.id); // Déclenche la génération et le téléchargement automatique du PDF
            toastSuccess('Rapport PDF généré !'); 
        } catch { toastError('Erreur lors de la génération du PDF'); } 
        finally { setIsDownloading(false); } // Désactive l'état
    }

    // Écran d'attente animé pendant le chargement initial de l'OT
    if (order === undefined) return <div className="flex h-[80vh] items-center justify-center"><div className="animate-spin size-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full" /></div>;
    
    // Écran d'erreur si l'ID recherché n'existe pas en base de données
    if (!order) return (
        <div className="flex flex-col h-[60vh] items-center justify-center text-center px-4">
            <div className="size-20 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 mb-6 border border-rose-500/20"><AlertTriangle size={36} /></div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">Ordre de travail introuvable</h2>
            <p className="text-slate-500 font-bold mt-2 mb-8">L'ID #{id} n'existe pas ou a été supprimé du système SAP.</p>
            <button onClick={() => router.push('/work-orders')} className="bg-white/5 hover:bg-white/10 text-white px-8 py-3 rounded-xl font-bold border border-white/5 transition-all flex items-center gap-2 uppercase tracking-widest text-xs">
                <ArrowLeft size={16} /> Retour à la liste
            </button>
        </div>
    );

    // Extraction des styles correspondants au statut et à la priorité de cet OT
    const status = getStatusStyle(order.status);
    const priority = getPriorityStyle(order.priority);

    // 🎨 RENDU DE LA PAGE EN HTML/JSX :
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
            
            {/* L'en-tête principal avec le titre, le statut, la priorité et les boutons d'action (PDF, Clore, Supprimer) */}
            <WorkOrderHeader order={order} status={status} priority={priority} updating={updating} isDownloading={isDownloading} canManage={canManage} isManager={isManager} onMarkDone={markAsDone} onDelete={handleDelete} onApproveDeletion={handleApproveDeletion} onRejectDeletion={handleRejectDeletion} onDownloadPDF={handleDownloadPDF} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Colonne de gauche (2/3 de l'écran) : Les détails et la checklist */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Les petites cartes d'information (Machine en panne, Emplacement, Type de panne, Responsable) */}
                    <WorkOrderInfoCards order={order} />
                    
                    {/* La section de description textuelle, checklist des tâches à cocher et demande de pièces de rechange */}
                    <div className="azure-card p-6">
                        <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-4">
                            <FileText size={18} className="text-slate-400" />
                            <h2 className="text-lg font-black text-white uppercase tracking-widest">Description & Tâches</h2>
                        </div>
                        <div className="text-slate-300 font-medium leading-relaxed text-sm">{order.description}</div>
                        
                        {/* La checklist des interventions (ex: inspection, graissage) */}
                        <InterventionChecklist order={order} workOrderId={id} />
                        
                        {/* Le panneau pour ajouter/consommer des pièces détachées */}
                        <PartRequests order={order} stockItems={stockItems} />
                    </div>
                </div>

                {/* Colonne de droite (1/3 de l'écran) : Le chrono et la timeline */}
                <div className="space-y-6">
                    {/* Le chronomètre d'intervention pour mesurer le temps exact passé par le technicien */}
                    <TimerWidget workOrderId={id} initialTime={order.time_spent || 0} />
                    
                    {/* L'historique chronologique des événements (création, début, fin, pièces demandées) */}
                    <WorkOrderTimeline order={order} />
                    
                    {/* Un encadré pour pouvoir lier des documents d'intervention (ex: photos de la panne) */}
                    <div className="azure-card p-6 border-dashed border-2 bg-slate-900/20 flex flex-col items-center justify-center text-center gap-3">
                        <div className="size-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400"><Paperclip size={20} /></div>
                        <div><div className="font-bold text-sm text-white">Documents & Photos</div><div className="text-xs text-slate-500 mt-1">Aucun fichier joint pour le moment</div></div>
                        <button className="mt-2 text-xs font-bold text-blue-400 hover:text-blue-300 bg-blue-500/10 px-4 py-2 rounded-lg">Ajouter un fichier</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
