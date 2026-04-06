'use client';
import { useState, useEffect, useRef } from 'react';
import { Clock, CheckCircle, XCircle, Package, Printer, Search, Filter, AlertTriangle } from 'lucide-react';
import { gmaoApi } from '../../../../services/api';
import { useToast } from '../../../../components/ui/toast';

interface RequestItem {
    id: number;
    part_code: string;
    part_name: string;
    quantity_requested: number;
    quantity_approved: number | null;
}

interface PartsRequest {
    id: number;
    work_order_id: number;
    requested_by: number;
    status: string;
    rejection_reason: string | null;
    approved_by: number | null;
    created_at: string | null;
    approved_at: string | null;
    items: RequestItem[];
    requester_name: string;
    work_order_title: string;
    work_order_sap_id: string;
}

export default function RequestManager() {
    const [requests, setRequests] = useState<PartsRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('all');
    const [selectedReq, setSelectedReq] = useState<PartsRequest | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [processing, setProcessing] = useState(false);
    const { success, error: toastError } = useToast();
    const printRef = useRef<HTMLDivElement>(null);

    useEffect(() => { loadRequests(); }, []);

    async function loadRequests() {
        try {
            const data = await gmaoApi.getPartsRequests();
            setRequests(data);
        } catch (err) {
            console.error('Failed to load parts requests', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleApprove(req: PartsRequest) {
        setProcessing(true);
        try {
            const res = await gmaoApi.approvePartsRequest(req.id);
            if (res.offline) {
                success('Action Offline', 'Validation mise en attente.');
            } else {
                success('Succès', `Réquisition #${req.id} validée.`);
            }
            setSelectedReq(null);
            await loadRequests();
        } catch (err) {
            toastError("Échec", "Erreur lors de l'approbation.");
        } finally {
            setProcessing(false);
        }
    }

    async function handleReject(req: PartsRequest) {
        if (!rejectReason.trim()) return;
        setProcessing(true);
        try {
            const res = await gmaoApi.rejectPartsRequest(req.id, rejectReason);
            if (res.offline) {
                success('Action Offline', 'Refus mis en attente.');
            } else {
                success('Refusé', `La demande #${req.id} a été rejetée.`);
            }
            setSelectedReq(null);
            setRejectReason('');
            await loadRequests();
        } catch (err) {
            toastError("Échec", "Erreur lors du refus.");
        } finally {
            setProcessing(false);
        }
    }

    function handlePrint() {
        if (!printRef.current) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        printWindow.document.write(`
            <!DOCTYPE html><html><head><title>Bon de Sortie #${selectedReq?.id}</title>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1a1a1a; }
                .header { display: flex; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 16px; margin-bottom: 24px; }
                .logo { font-weight: 900; font-size: 20px; color: #2563eb; }
                table { width: 100%; border-collapse: collapse; margin-top: 16px; }
                th { background: #f3f4f6; text-align: left; padding: 10px 12px; border: 1px solid #e5e7eb; font-size: 11px; text-transform: uppercase; }
                td { padding: 10px 12px; border: 1px solid #e5e7eb; font-size: 13px; }
                .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 20px; font-size: 13px; }
                .footer { margin-top: 60px; display: flex; justify-content: space-between; }
                .sig { border-top: 1px solid #ccc; width: 180px; text-align: center; padding-top: 8px; font-size: 11px; }
            </style></head><body>
            ${printRef.current.innerHTML}
            </body></html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
    }

    const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/40 p-3 rounded-2xl border border-white/5">
                <div className="flex gap-1">
                    {['all', 'pending', 'approved', 'rejected'].map(t => (
                        <button key={t} onClick={() => setFilter(t)}
                            className={`px-4 py-2 rounded-xl text-[0.65rem] font-black uppercase tracking-widest transition-all ${
                                filter === t ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-slate-500 hover:text-white'
                            }`}>
                            {t === 'all' ? 'Toutes' : t === 'pending' ? 'Attente' : t === 'approved' ? 'Validées' : 'Refusées'}
                        </button>
                    ))}
                </div>
                <div className="relative group w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-amber-400 transition-colors" size={14} />
                    <input type="text" placeholder="Rechercher (OT, Tech...)" 
                        className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-amber-500/50 transition-all font-bold placeholder:text-slate-700" />
                </div>
            </div>

            <div className="azure-card overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-white/5 border-b border-white/5">
                        <tr>
                            <th className="px-6 py-4 text-[0.65rem] font-black text-slate-500 uppercase tracking-widest">ID</th>
                            <th className="px-6 py-4 text-[0.65rem] font-black text-slate-500 uppercase tracking-widest">OT SAP</th>
                            <th className="px-6 py-4 text-[0.65rem] font-black text-slate-500 uppercase tracking-widest">Technicien</th>
                            <th className="px-6 py-4 text-[0.65rem] font-black text-slate-500 uppercase tracking-widest">Items</th>
                            <th className="px-6 py-4 text-[0.65rem] font-black text-slate-500 uppercase tracking-widest">Date</th>
                            <th className="px-6 py-4 text-[0.65rem] font-black text-slate-500 uppercase tracking-widest text-right">Statut</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {loading ? (
                             <tr><td colSpan={6} className="px-6 py-20 text-center text-slate-500 animate-pulse text-xs font-black uppercase tracking-widest">Chargement des données magasin...</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={6} className="px-6 py-20 text-center text-slate-500 italic text-sm">Aucune demande enregistrée.</td></tr>
                        ) : filtered.map(req => (
                            <tr key={req.id} onClick={() => setSelectedReq(req)} 
                                className={`hover:bg-white/5 cursor-pointer transition-colors group ${req.status === 'pending' ? 'bg-amber-500/5' : ''}`}>
                                <td className="px-6 py-4 font-mono text-amber-500 font-bold text-xs shrink-0">#{req.id}</td>
                                <td className="px-6 py-4 font-bold text-white text-sm shrink-0">{req.work_order_sap_id}</td>
                                <td className="px-6 py-4 text-slate-300 font-bold text-sm shrink-0">{req.requester_name}</td>
                                <td className="px-6 py-4">
                                     <span className="bg-slate-800 text-slate-400 text-[0.65rem] font-black px-2 py-1 rounded-lg uppercase tracking-tight">
                                        {req.items.length} PIÈCE{req.items.length > 1 ? 'S' : ''}
                                     </span>
                                </td>
                                <td className="px-6 py-4 text-slate-500 text-xs shrink-0">{req.created_at}</td>
                                <td className="px-6 py-4 text-right">
                                    <span className={`text-[0.6rem] font-black px-2 py-1 rounded-md uppercase tracking-tight ${
                                        req.status === 'pending' ? 'bg-amber-500/10 text-amber-500' :
                                        req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' :
                                        'bg-rose-500/10 text-rose-500'
                                    }`}>
                                        {req.status === 'pending' ? 'Attente' : req.status === 'approved' ? 'Validé' : 'Refusé'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* DETAIL MODAL (SIDEBAR STYLE) */}
            {selectedReq && (
                <div className="fixed inset-0 z-50 overflow-hidden" onClick={() => setSelectedReq(null)}>
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" />
                    <div className="absolute inset-y-0 right-0 max-w-lg w-full bg-slate-950 shadow-2xl flex flex-col border-l border-white/5 animate-in slide-in-from-right duration-300" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-white/5 bg-slate-900/40">
                             <div className="flex items-center justify-between">
                                 <h2 className="text-xl font-black text-white uppercase tracking-tight">Demande #{selectedReq.id}</h2>
                                 <button onClick={() => setSelectedReq(null)} className="text-slate-500 hover:text-white transition-colors">X</button>
                             </div>
                             <div className="mt-2 text-xs font-bold text-amber-500 uppercase tracking-[0.2em]">{selectedReq.work_order_sap_id}</div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                             <div>
                                 <h3 className="text-[0.65rem] font-black text-slate-500 uppercase tracking-widest mb-4">Informations</h3>
                                 <div className="grid grid-cols-2 gap-4">
                                     <div className="azure-card p-3 bg-slate-900/20">
                                         <div className="text-[0.6rem] text-slate-500 uppercase mb-1">Technicien</div>
                                         <div className="text-xs font-bold text-white uppercase">{selectedReq.requester_name}</div>
                                     </div>
                                     <div className="azure-card p-3 bg-slate-900/20">
                                         <div className="text-[0.6rem] text-slate-500 uppercase mb-1">Reçu le</div>
                                         <div className="text-xs font-bold text-white">{selectedReq.created_at}</div>
                                     </div>
                                 </div>
                             </div>

                             <div>
                                 <h3 className="text-[0.65rem] font-black text-slate-500 uppercase tracking-widest mb-4">Pièces Requises</h3>
                                 <div className="space-y-2">
                                     {selectedReq.items.map(item => (
                                         <div key={item.id} className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between group hover:border-amber-500/30 transition-all">
                                             <div className="flex items-center gap-3">
                                                 <div className="size-8 rounded-lg bg-slate-800 flex items-center justify-center text-amber-500 border border-white/5 font-mono text-[0.6rem] font-bold">
                                                     {item.part_code}
                                                 </div>
                                                 <div className="text-xs font-bold text-slate-200">{item.part_name}</div>
                                             </div>
                                             <div className="text-lg font-black text-white shrink-0">x{item.quantity_requested}</div>
                                         </div>
                                     ))}
                                 </div>
                             </div>

                             {selectedReq.status === 'rejected' && (
                                 <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
                                     <div className="text-[0.6rem] font-black text-rose-500 uppercase mb-1">Motif du refus</div>
                                     <div className="text-sm text-rose-200 italic font-medium">"{selectedReq.rejection_reason}"</div>
                                 </div>
                             )}
                        </div>

                        <div className="p-6 border-t border-white/5 bg-slate-900/20">
                            {selectedReq.status === 'pending' && (
                                <div className="space-y-4">
                                    <div className="flex gap-3">
                                        <button onClick={() => handleApprove(selectedReq)} disabled={processing}
                                            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-[0.65rem] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50">
                                            {processing ? '...' : <CheckCircle size={14} />}
                                            {processing ? 'Processing' : 'Approuver Sortie'}
                                        </button>
                                        <button onClick={() => handleReject(selectedReq)} disabled={processing || !rejectReason.trim()}
                                            className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white text-[0.65rem] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2 disabled:opacity-50">
                                            <XCircle size={14} /> Refuser
                                        </button>
                                    </div>
                                    <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                                        placeholder="Saisissez un motif de refus obligatoire..."
                                        className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500 transition-all font-medium h-20 placeholder:text-slate-800" />
                                </div>
                            )}

                            {selectedReq.status === 'approved' && (
                                <button onClick={handlePrint}
                                    className="w-full py-4 bg-amber-600 hover:bg-amber-500 text-white text-[0.7rem] font-black uppercase tracking-[0.2em] rounded-xl transition-all shadow-lg shadow-amber-600/20 flex items-center justify-center gap-3 active:scale-95">
                                    <Printer size={18} /> Générer Bon de Sortie
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* PRINT TEMPLATE (HIDDEN) */}
            <div className="hidden">
                 <div ref={printRef} className="p-10 text-slate-900 bg-white min-h-screen">
                    <div className="flex justify-between items-start border-b-4 border-slate-900 pb-6 mb-8">
                        <div>
                            <div className="text-3xl font-black italic tracking-tighter">GMAO PRO</div>
                            <div className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest">Système Intégré Warehouse & RPA</div>
                        </div>
                        <div className="text-right">
                             <div className="text-xl font-black">BON DE SORTIE STOCK</div>
                             <div className="text-sm font-bold text-slate-500">RÉF : PR-{selectedReq?.id}</div>
                             <div className="text-[0.6rem] font-bold text-slate-500 italic mt-1">Validé le {selectedReq?.approved_at}</div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-12 gap-y-3 mb-10 text-xs shadow-inner bg-slate-50 p-6 rounded-lg">
                        <div><span className="uppercase text-slate-400 font-bold tracking-widest text-[0.5rem] block">Ordre de Travail SAP</span> <span className="font-black text-sm">{selectedReq?.work_order_sap_id}</span></div>
                        <div><span className="uppercase text-slate-400 font-bold tracking-widest text-[0.5rem] block">Technicien</span> <span className="font-black text-sm">{selectedReq?.requester_name}</span></div>
                        <div className="col-span-2 mt-2"><span className="uppercase text-slate-400 font-bold tracking-widest text-[0.5rem] block">Description Travaux</span> <span className="font-bold">{selectedReq?.work_order_title}</span></div>
                    </div>
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-slate-900 text-white">
                                <th className="border p-3 text-left text-[0.6rem] uppercase tracking-widest">Réf Article</th>
                                <th className="border p-3 text-left text-[0.6rem] uppercase tracking-widest">Désignation</th>
                                <th className="border p-3 text-center text-[0.6rem] uppercase tracking-widest">Qté</th>
                                <th className="border p-3 text-center text-[0.6rem] uppercase tracking-widest">Unité</th>
                            </tr>
                        </thead>
                        <tbody>
                            {selectedReq?.items.map(it => (
                                <tr key={it.id} className="border-b">
                                    <td className="p-3 font-mono font-bold">{it.part_code}</td>
                                    <td className="p-3 font-medium">{it.part_name}</td>
                                    <td className="p-3 text-center font-black text-lg">{it.quantity_approved || it.quantity_requested}</td>
                                    <td className="p-3 text-center text-slate-400 text-[0.6rem] uppercase font-bold">Unité</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="mt-20 flex justify-between gap-20">
                         <div className="flex-1 border-t-2 border-slate-900 pt-3 text-center">
                            <div className="text-[0.6rem] font-black uppercase tracking-[0.2em] mb-12">VISA MAGASINIER</div>
                            <div className="text-[0.5rem] italic text-slate-400">(Nom, Prénom & Cachet)</div>
                         </div>
                         <div className="flex-1 border-t-2 border-slate-900 pt-3 text-center">
                            <div className="text-[0.6rem] font-black uppercase tracking-[0.2em] mb-12">VISA TECHNICIEN</div>
                            <div className="text-[0.5rem] italic text-slate-400">(Nom, Prénom & Signature)</div>
                         </div>
                    </div>
                 </div>
            </div>
        </div>
    );
}
