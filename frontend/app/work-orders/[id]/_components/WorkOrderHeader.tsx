import { ArrowLeft, FileText, Loader2, CheckCircle, Trash2, Check, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Props {
    order: any;
    status: { label: string; color: string; bg: string; icon: any };
    priority: { label: string; color: string; border: string };
    updating: boolean;
    isDownloading: boolean;
    canManage: boolean;
    isManager: boolean;
    onMarkDone: () => void;
    onDelete: () => void;
    onApproveDeletion: () => void;
    onRejectDeletion: () => void;
    onDownloadPDF: () => void;
}

export default function WorkOrderHeader({ order, status, priority, updating, isDownloading, canManage, isManager, onMarkDone, onDelete, onApproveDeletion, onRejectDeletion, onDownloadPDF }: Props) {
    const router = useRouter();
    return (
        <div className="flex items-center gap-4 mb-8">
            <button onClick={() => router.push('/work-orders')} className="size-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all border border-white/5">
                <ArrowLeft size={20} />
            </button>
            <div>
                <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                    OT #{order.sap_order_id || order.id}
                    <span className={`px-2 py-0.5 rounded-md border text-[0.6rem] font-black uppercase tracking-widest ${priority.border} ${priority.color}`}>{priority.label}</span>
                </h1>
                <p className="text-sm font-bold text-slate-500">{order.title}</p>
            </div>

            <div className="ml-auto flex items-center gap-3">
                <div className={`azure-badge ${status.bg} ${status.color} border px-4 py-2`}>
                    <status.icon size={16} />
                    <span className="uppercase tracking-widest font-black text-sm">{status.label}</span>
                </div>

                <button onClick={onDownloadPDF} disabled={isDownloading} className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm border border-white/5 transition-all flex items-center gap-2 group">
                    {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} className="group-hover:text-blue-400" />}
                    <span>Rapport PDF</span>
                </button>

                {canManage && order.status !== 'pending_deletion' && (
                    <button onClick={onDelete} disabled={updating} className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 hover:text-rose-400 font-bold text-sm border border-rose-500/20 transition-all flex items-center gap-2">
                        <Trash2 size={16} />
                        <span className="hidden sm:inline">Supprimer</span>
                    </button>
                )}

                {order.status === 'pending_deletion' && isManager && (
                    <div className="flex items-center gap-2">
                        <button onClick={onApproveDeletion} disabled={updating} className="px-6 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm transition-all flex items-center gap-2">
                            <CheckCircle size={16} /> Approuver Suppression
                        </button>
                        <button onClick={onRejectDeletion} disabled={updating} className="px-6 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm border border-white/10 flex items-center gap-2">
                            <X size={16} /> Rejeter
                        </button>
                    </div>
                )}

                {order.status !== 'done' && order.status !== 'closed' && order.status !== 'pending_deletion' && (
                    <button onClick={onMarkDone} disabled={updating} className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm transition-all flex items-center gap-2">
                        {updating ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                        {updating ? 'Mise à jour…' : 'Marquer Terminé'}
                    </button>
                )}
            </div>
        </div>
    );
}
