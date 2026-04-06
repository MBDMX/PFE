'use client';

import { useState, useEffect, useRef } from 'react';
import {
    Warehouse, CheckCircle, XCircle, Clock, Package,
    ChevronRight, AlertTriangle, Printer, Search, Filter
} from 'lucide-react';
import { gmaoApi } from '../../../services/api';
import { useToast } from '../../../components/ui/toast';

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

export default function MagasinierDashboard() {
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
                success('Mode Hors-Ligne', 'Validation mise en attente pour synchronisation.');
            } else {
                success('Demande Validée', `Bon de sortie #${req.id} prêt.`);
            }
            await loadRequests();
            setSelectedReq(null);
        } catch (err: any) {
            toastError('Erreur', err?.response?.data?.detail || 'Erreur lors de la validation');
        } finally {
            setProcessing(false);
        }
    }

    async function handleReject(req: PartsRequest) {
        if (!rejectReason.trim()) { toastError('Attention', 'Motif de refus obligatoire'); return; }
        setProcessing(true);
        try {
            const res = await gmaoApi.rejectPartsRequest(req.id, rejectReason);
            if (res.offline) {
                success('Mode Hors-Ligne', 'Refus mis en attente pour synchronisation.');
            } else {
                success('Demande Refusée', `La demande #${req.id} a été rejetée.`);
            }
            await loadRequests();
            setSelectedReq(null);
            setRejectReason('');
        } catch (err: any) {
            toastError('Erreur', err?.response?.data?.detail || 'Erreur lors du refus');
        } finally {
            setProcessing(false);
        }
    }

    function handlePrint() {
        if (!printRef.current) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        printWindow.document.write(`
            <!DOCTYPE html><html><head><title>Bon de Sortie</title>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1a1a1a; }
                h1 { font-size: 22px; margin-bottom: 4px; }
                h2 { font-size: 14px; color: #666; font-weight: normal; margin-top: 0; }
                .header { display: flex; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 16px; margin-bottom: 24px; }
                .logo { font-weight: 900; font-size: 20px; color: #2563eb; }
                table { width: 100%; border-collapse: collapse; margin-top: 16px; }
                th { background: #f3f4f6; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; text-align: left; padding: 10px 12px; border: 1px solid #e5e7eb; }
                td { padding: 10px 12px; border: 1px solid #e5e7eb; font-size: 13px; }
                .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 20px; font-size: 13px; }
                .meta span { color: #666; } .meta strong { color: #111; }
                .footer { margin-top: 40px; display: flex; justify-content: space-between; }
                .sig { border-top: 1px solid #ccc; width: 200px; text-align: center; padding-top: 8px; font-size: 12px; color: #666; }
                @media print { body { padding: 20px; } }
            </style></head><body>
            ${printRef.current.innerHTML}
            </body></html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
    }

    const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);
    const pendingCount = requests.filter(r => r.status === 'pending').length;
    const approvedCount = requests.filter(r => r.status === 'approved').length;
    const rejectedCount = requests.filter(r => r.status === 'rejected').length;

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8 pb-10">

            {/* ── Header ── */}
            <header className="page-header px-2">
                <div>
                    <h1 className="text-3xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent tracking-tight">
                        Bon de Sortie Magasin
                    </h1>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">
                        Validation des demandes de pièces
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-amber-600/10 border border-amber-500/20 px-4 py-2 rounded-2xl">
                        <Warehouse size={16} className="text-amber-400" />
                        <span className="text-[0.65rem] font-bold text-amber-400 uppercase tracking-widest">Magasinier</span>
                    </div>
                </div>
            </header>

            {/* ── KPIs ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="azure-card p-5 cursor-pointer hover:border-amber-500/30 transition-all" onClick={() => setFilter('pending')}>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="size-10 rounded-xl bg-amber-500/10 flex items-center justify-center"><Clock size={20} className="text-amber-400" /></div>
                        <div className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest">En Attente</div>
                    </div>
                    <div className="text-3xl font-black text-white">{pendingCount}</div>
                    <div className="text-xs text-slate-500 mt-1">Demandes à traiter</div>
                </div>
                <div className="azure-card p-5 cursor-pointer hover:border-emerald-500/30 transition-all" onClick={() => setFilter('approved')}>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="size-10 rounded-xl bg-emerald-500/10 flex items-center justify-center"><CheckCircle size={20} className="text-emerald-400" /></div>
                        <div className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest">Validées</div>
                    </div>
                    <div className="text-3xl font-black text-white">{approvedCount}</div>
                    <div className="text-xs text-slate-500 mt-1">Sorties confirmées</div>
                </div>
                <div className="azure-card p-5 cursor-pointer hover:border-rose-500/30 transition-all" onClick={() => setFilter('rejected')}>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="size-10 rounded-xl bg-rose-500/10 flex items-center justify-center"><XCircle size={20} className="text-rose-400" /></div>
                        <div className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest">Refusées</div>
                    </div>
                    <div className="text-3xl font-black text-white">{rejectedCount}</div>
                    <div className="text-xs text-slate-500 mt-1">Demandes rejetées</div>
                </div>
            </div>

            {/* ── Filter Tabs ── */}
            <div className="flex gap-2 px-2">
                {[
                    { key: 'all', label: 'Toutes', count: requests.length },
                    { key: 'pending', label: 'En attente', count: pendingCount },
                    { key: 'approved', label: 'Validées', count: approvedCount },
                    { key: 'rejected', label: 'Refusées', count: rejectedCount },
                ].map(tab => (
                    <button key={tab.key} onClick={() => setFilter(tab.key)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                            filter === tab.key
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                                : 'bg-slate-900/50 text-slate-500 border border-white/5 hover:text-white'
                        }`}>
                        {tab.label} ({tab.count})
                    </button>
                ))}
            </div>

            {/* ── Requests Table ── */}
            <div className="azure-card overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-white/5 bg-white/5">
                            <th className="px-6 py-4 text-[0.65rem] font-black text-slate-500 uppercase tracking-widest">Demande</th>
                            <th className="px-6 py-4 text-[0.65rem] font-black text-slate-500 uppercase tracking-widest">OT</th>
                            <th className="px-6 py-4 text-[0.65rem] font-black text-slate-500 uppercase tracking-widest">Technicien</th>
                            <th className="px-6 py-4 text-[0.65rem] font-black text-slate-500 uppercase tracking-widest text-center">Pièces</th>
                            <th className="px-6 py-4 text-[0.65rem] font-black text-slate-500 uppercase tracking-widest">Date</th>
                            <th className="px-6 py-4 text-[0.65rem] font-black text-slate-500 uppercase tracking-widest text-right">Statut</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {loading ? (
                            <tr><td colSpan={6} className="px-6 py-10 text-center text-slate-500">Chargement...</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={6} className="px-6 py-10 text-center text-slate-500 italic">Aucune demande trouvée</td></tr>
                        ) : filtered.map(req => (
                            <tr key={req.id} onClick={() => setSelectedReq(req)}
                                className={`hover:bg-white/5 transition-colors cursor-pointer ${req.status === 'pending' ? 'bg-amber-500/5' : ''}`}>
                                <td className="px-6 py-4">
                                    <span className="text-xs font-black text-amber-400 font-mono">#{req.id}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm font-bold text-slate-200">{req.work_order_sap_id}</div>
                                    <div className="text-[0.65rem] text-slate-500 truncate max-w-[180px]">{req.work_order_title}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-sm font-bold text-slate-300">{req.requester_name}</span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className="bg-slate-800 text-slate-300 text-xs font-bold px-2 py-1 rounded-lg">{req.items.length} pièce(s)</span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-xs text-slate-400">{req.created_at}</span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <span className={`text-[0.6rem] font-black px-2 py-1 rounded-md uppercase tracking-tight ${
                                        req.status === 'pending' ? 'bg-amber-500/10 text-amber-500' :
                                        req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' :
                                        'bg-rose-500/10 text-rose-500'
                                    }`}>
                                        {req.status === 'pending' ? 'En Attente' : req.status === 'approved' ? 'Validé' : 'Refusé'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* ── Detail Modal ── */}
            {selectedReq && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setSelectedReq(null); setRejectReason(''); }}>
                    <div className="azure-card max-w-2xl w-full max-h-[85vh] overflow-y-auto p-0" onClick={e => e.stopPropagation()}>

                        {/* Modal Header */}
                        <div className="p-6 border-b border-white/5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-black text-white">Demande #{selectedReq.id}</h3>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {selectedReq.work_order_sap_id} — {selectedReq.work_order_title}
                                    </p>
                                </div>
                                <span className={`text-[0.6rem] font-black px-3 py-1.5 rounded-lg uppercase tracking-tight ${
                                    selectedReq.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30' :
                                    selectedReq.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30' :
                                    'bg-rose-500/10 text-rose-500 border border-rose-500/30'
                                }`}>
                                    {selectedReq.status === 'pending' ? 'En Attente' : selectedReq.status === 'approved' ? 'Validé' : 'Refusé'}
                                </span>
                            </div>
                        </div>

                        {/* Meta Info */}
                        <div className="p-6 grid grid-cols-2 gap-4 border-b border-white/5">
                            <div>
                                <div className="text-[0.6rem] font-bold text-slate-500 uppercase mb-1">Demandé par</div>
                                <div className="text-sm font-bold text-white">{selectedReq.requester_name}</div>
                            </div>
                            <div>
                                <div className="text-[0.6rem] font-bold text-slate-500 uppercase mb-1">Date de demande</div>
                                <div className="text-sm font-bold text-white">{selectedReq.created_at}</div>
                            </div>
                        </div>

                        {/* Parts List */}
                        <div className="p-6 border-b border-white/5">
                            <h4 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Package size={16} className="text-amber-400" />
                                Pièces Demandées
                            </h4>
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="text-left text-[0.6rem] font-bold text-slate-500 uppercase pb-2">Référence</th>
                                        <th className="text-left text-[0.6rem] font-bold text-slate-500 uppercase pb-2">Désignation</th>
                                        <th className="text-center text-[0.6rem] font-bold text-slate-500 uppercase pb-2">Qté</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {selectedReq.items.map(item => (
                                        <tr key={item.id}>
                                            <td className="py-3 text-xs font-mono text-blue-400 font-bold">{item.part_code}</td>
                                            <td className="py-3 text-sm text-slate-200">{item.part_name}</td>
                                            <td className="py-3 text-center text-sm font-bold text-white">{item.quantity_requested}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Rejection Reason (if rejected) */}
                        {selectedReq.status === 'rejected' && selectedReq.rejection_reason && (
                            <div className="p-6 border-b border-white/5 bg-rose-500/5">
                                <div className="text-[0.6rem] font-bold text-rose-400 uppercase mb-1">Motif de refus</div>
                                <div className="text-sm text-slate-200 italic">{selectedReq.rejection_reason}</div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="p-6 space-y-4">
                            {selectedReq.status === 'pending' && (
                                <>
                                    <div className="flex gap-3">
                                        <button onClick={() => handleApprove(selectedReq)} disabled={processing}
                                            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                                            <CheckCircle size={16} />
                                            {processing ? 'Validation...' : 'Valider & Sortir du Stock'}
                                        </button>
                                        <button onClick={() => handleReject(selectedReq)} disabled={processing || !rejectReason.trim()}
                                            className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg shadow-rose-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                                            <XCircle size={16} />
                                            Refuser
                                        </button>
                                    </div>
                                    <input type="text" value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                                        placeholder="Motif de refus (obligatoire pour refuser)..."
                                        className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-600 focus:border-rose-500/50 focus:outline-none transition-colors" />
                                </>
                            )}

                            {selectedReq.status === 'approved' && (
                                <button onClick={handlePrint}
                                    className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg shadow-amber-600/20 transition-all flex items-center justify-center gap-2">
                                    <Printer size={16} />
                                    Imprimer Bon de Sortie
                                </button>
                            )}

                            <button onClick={() => { setSelectedReq(null); setRejectReason(''); }}
                                className="w-full py-2 text-slate-500 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors">
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Hidden Print Template ── */}
            {selectedReq && selectedReq.status === 'approved' && (
                <div className="hidden">
                    <div ref={printRef}>
                        <div className="header">
                            <div>
                                <div className="logo">GMAO PRO</div>
                                <div style={{fontSize:'12px',color:'#666'}}>Excellence Azure — Système de Gestion de Maintenance</div>
                            </div>
                            <div style={{textAlign:'right'}}>
                                <div style={{fontSize:'18px',fontWeight:900}}>BON DE SORTIE</div>
                                <div style={{fontSize:'12px',color:'#666'}}>N° {selectedReq.id} — {selectedReq.approved_at}</div>
                            </div>
                        </div>
                        <div className="meta">
                            <div><span>Ordre de Travail : </span><strong>{selectedReq.work_order_sap_id}</strong></div>
                            <div><span>Date de demande : </span><strong>{selectedReq.created_at}</strong></div>
                            <div><span>Demandé par : </span><strong>{selectedReq.requester_name}</strong></div>
                            <div><span>Validé le : </span><strong>{selectedReq.approved_at}</strong></div>
                            <div><span>Objet OT : </span><strong>{selectedReq.work_order_title}</strong></div>
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th>Référence</th>
                                    <th>Désignation</th>
                                    <th style={{textAlign:'center'}}>Qté Demandée</th>
                                    <th style={{textAlign:'center'}}>Qté Sortie</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedReq.items.map((item) => (
                                    <tr key={item.id}>
                                        <td>{item.part_code}</td>
                                        <td>{item.part_name}</td>
                                        <td style={{textAlign:'center'}}>{item.quantity_requested}</td>
                                        <td style={{textAlign:'center',fontWeight:'bold'}}>{item.quantity_approved || item.quantity_requested}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="footer">
                            <div className="sig">Signature Magasinier</div>
                            <div className="sig">Signature Technicien</div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
