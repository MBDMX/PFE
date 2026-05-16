'use client';
import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../lib/db';
import { AlertTriangle, FileText, Paperclip, ArrowLeft, Clock, Activity, CheckCircle, X as XIcon } from 'lucide-react';
import { gmaoApi } from '../../../services/api';
import { useToast } from '../../../components/ui/toast';
import TimerWidget from './_components/TimerWidget';
import WorkOrderHeader from './_components/WorkOrderHeader';
import WorkOrderInfoCards from './_components/WorkOrderInfoCards';
import InterventionChecklist from './_components/InterventionChecklist';
import PartRequests from './_components/PartRequests';
import WorkOrderTimeline from './_components/WorkOrderTimeline';

export default function WorkOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);
    const { success: toastSuccess, error: toastError } = useToast();
    const [updating, setUpdating] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    const order = useLiveQuery(async () => {
        const results = await db.workOrders.toArray();
        const found = results.find((w: any) => String(w.id) === String(id));
        const isSapOtWithNoSteps = found?.sap_order_id && (!found.steps || found.steps.length === 0);
        if (!found || found.parts === undefined || found.steps === undefined || isSapOtWithNoSteps) {
            try { const fresh = await gmaoApi.getWorkOrder(id); if (fresh) return fresh; } catch { }
        }
        return found;
    }, [id]);

    const stockItems = useLiveQuery(() => db.stock.toArray()) || [];

    const currentUser = gmaoApi.getCurrentUser();
    const isManager = currentUser?.role === 'manager' || currentUser?.role === 'admin';
    const canManage = isManager || Number(currentUser?.id) === Number(order?.created_by);

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

    const getPriorityStyle = (priority: string) => {
        switch ((priority || 'medium').toLowerCase()) {
            case 'low': return { label: 'Priorité Faible', color: 'text-slate-400', border: 'border-slate-500/30' };
            case 'high': return { label: 'Priorité Élevée', color: 'text-orange-400', border: 'border-orange-500/30' };
            case 'critical': return { label: 'Priorité Critique', color: 'text-rose-400', border: 'border-rose-500/40 bg-rose-500/5' };
            default: return { label: 'Priorité Moyenne', color: 'text-blue-400', border: 'border-blue-500/30' };
        }
    };

    async function markAsDone() {
        if (updating || !order) return;
        setUpdating(true);
        await db.workOrders.update(Number(id), { status: 'done', actual_end_date: new Date().toISOString().split('T')[0] });
        try {
            const res = await gmaoApi.updateWorkOrder(order.id, { status: 'done' });
            const freshWO = await gmaoApi.getWorkOrder(id);
            if (freshWO) await db.workOrders.put(freshWO);
            const updates = (res as any)._stock_updates ?? [];
            updates.length > 0
                ? toastSuccess('OT terminé — Stock mis à jour', updates.map((u: any) => `${u.part} (−${u.deducted})`).join(', '))
                : toastSuccess('✅ OT marqué comme terminé — Score de santé recalculé');
        } catch {
            await db.workOrders.update(Number(id), { status: order.status, actual_end_date: order.actual_end_date });
            toastError('Échec de la mise à jour — Réessayez');
        } finally { setUpdating(false); }
    }

    async function handleDelete() {
        if (!confirm(isManager ? 'Supprimer définitivement cet OT ?' : 'Demander la suppression de votre OT ?')) return;
        setUpdating(true);
        try {
            const res = await gmaoApi.deleteWorkOrder(order.id);
            if (res.offline || res.status === 'pending_deletion') {
                toastSuccess('Demande de suppression envoyée au responsable.');
                await db.workOrders.put(await gmaoApi.getWorkOrder(id));
            } else {
                toastSuccess('Ordre de travail supprimé.');
                await db.workOrders.delete(order.id);
                router.push('/work-orders');
            }
        } catch { toastError('Échec de la suppression'); }
        finally { setUpdating(false); }
    }

    async function handleApproveDeletion() {
        setUpdating(true);
        try { await gmaoApi.approveWorkOrderDeletion(order.id); toastSuccess('OT supprimé définitivement.'); router.push('/work-orders'); }
        catch { toastError("Échec de l'approbation"); } finally { setUpdating(false); }
    }

    async function handleRejectDeletion() {
        setUpdating(true);
        try { await gmaoApi.rejectWorkOrderDeletion(order.id); toastSuccess('Suppression rejetée, OT restauré.'); await db.workOrders.put(await gmaoApi.getWorkOrder(id)); }
        catch { toastError('Échec du rejet'); } finally { setUpdating(false); }
    }

    async function handleDownloadPDF() {
        if (isDownloading || !order) return;
        setIsDownloading(true);
        try { await gmaoApi.downloadWorkOrderReport(order.id); toastSuccess('Rapport PDF généré !'); }
        catch { toastError('Erreur lors de la génération du PDF'); } finally { setIsDownloading(false); }
    }

    if (order === undefined) return <div className="flex h-[80vh] items-center justify-center"><div className="animate-spin size-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full" /></div>;
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

    const status = getStatusStyle(order.status);
    const priority = getPriorityStyle(order.priority);

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
            <WorkOrderHeader order={order} status={status} priority={priority} updating={updating} isDownloading={isDownloading} canManage={canManage} isManager={isManager} onMarkDone={markAsDone} onDelete={handleDelete} onApproveDeletion={handleApproveDeletion} onRejectDeletion={handleRejectDeletion} onDownloadPDF={handleDownloadPDF} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <WorkOrderInfoCards order={order} />
                    <div className="azure-card p-6">
                        <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-4">
                            <FileText size={18} className="text-slate-400" />
                            <h2 className="text-lg font-black text-white uppercase tracking-widest">Description & Tâches</h2>
                        </div>
                        <div className="text-slate-300 font-medium leading-relaxed text-sm">{order.description}</div>
                        <InterventionChecklist order={order} workOrderId={id} />
                        <PartRequests order={order} stockItems={stockItems} />
                    </div>
                </div>

                <div className="space-y-6">
                    <TimerWidget workOrderId={id} initialTime={order.time_spent || 0} />
                    <WorkOrderTimeline order={order} />
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
