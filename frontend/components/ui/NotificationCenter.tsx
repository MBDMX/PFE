'use client';
import { useState, useEffect, useRef } from 'react';
import { Bell, CheckCircle, Clock, XCircle, X, Wrench, AlertTriangle, Activity } from 'lucide-react';
import { gmaoApi } from '../../services/api';
import Link from 'next/link';

export default function NotificationCenter({ count, role }: { count: number, role: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            Promise.all([
                gmaoApi.getPartsRequests(),
                gmaoApi.getWorkOrders()
            ]).then(([partsData, woData]) => {
                const combined: any[] = [];

                // 1. Process Parts Requests
                let filteredParts = partsData;
                if (role === 'magasinier' || role === 'admin') {
                    filteredParts = partsData.filter((r: any) => r.status === 'pending');
                }
                filteredParts.forEach((p: any) => {
                    combined.push({
                        id: `part-${p.id}`,
                        type: 'part_request',
                        data: p,
                        date: new Date(p.created_at)
                    });
                });

                // 2. Process Work Orders (Critical or Recent)
                let filteredWOs = woData;
                if (role === 'manager' || role === 'admin') {
                    // Managers see critical open OTs
                    filteredWOs = woData.filter((o: any) => o.priority === 'critical' && o.status !== 'done' && o.status !== 'closed');
                } else if (role === 'technician') {
                    // Techs see their active OTs
                    filteredWOs = woData.filter((o: any) => o.status === 'in_progress' || o.status === 'open');
                } else {
                    // Magasiniers see critical OTs to anticipate parts
                    filteredWOs = woData.filter((o: any) => o.priority === 'critical');
                }

                filteredWOs.forEach((o: any) => {
                    combined.push({
                        id: `wo-${o.id}`,
                        type: 'work_order',
                        data: o,
                        date: o.planned_start_date ? new Date(o.planned_start_date) : new Date()
                    });
                });

                // Sort by date descending
                combined.sort((a, b) => b.date.getTime() - a.date.getTime());
                setNotifications(combined.slice(0, 15));
                setLoading(false);
            }).catch(() => setLoading(false));
        }
    }, [isOpen, role]);

    const getPartStatusStyle = (status: string) => {
        switch (status) {
            case 'pending': return { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20' };
            case 'approved': return { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20' };
            case 'rejected': return { icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-500/10 border-rose-500/20' };
            default: return { icon: Bell, color: 'text-slate-400', bg: 'bg-slate-800 border-white/5' };
        }
    };

    const getWOPriorityStyle = (priority: string) => {
        switch (priority.toLowerCase()) {
            case 'critical': return { icon: AlertTriangle, color: 'text-rose-500', bg: 'bg-rose-500/10 border-rose-500/20' };
            case 'high': return { icon: Activity, color: 'text-orange-500', bg: 'bg-orange-500/10 border-orange-500/20' };
            default: return { icon: Wrench, color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20' };
        }
    };

    return (
        <div className="relative" ref={popoverRef}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="size-11 rounded-2xl bg-slate-900 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer relative"
            >
                <Bell size={20} />
                {count > 0 ? (
                    <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] px-1.5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white shadow-lg shadow-rose-500/40 animate-pulse">
                        {count > 99 ? '99+' : count}
                    </span>
                ) : null}
            </div>

            {isOpen && (
                <div className="absolute top-full right-0 mt-3 w-80 sm:w-96 bg-slate-950 border border-white/10 rounded-2xl shadow-2xl shadow-black/80 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-slate-900/50 rounded-t-2xl">
                        <h3 className="text-sm font-black text-white uppercase tracking-widest leading-none">Centre de Notifications</h3>
                        <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                            <X size={16} />
                        </button>
                    </div>

                    <div className="max-h-[60vh] overflow-y-auto p-4 space-y-3">
                        {loading ? (
                            <div className="text-center py-8 text-[0.65rem] font-bold uppercase tracking-widest text-slate-500 animate-pulse">
                                Chargement des notifications...
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="text-center py-8 text-[0.65rem] font-bold uppercase tracking-widest text-slate-600">
                                Aucune notification récente
                            </div>
                        ) : (
                            notifications.map((notif: any) => {
                                if (notif.type === 'part_request') {
                                    const p = notif.data;
                                    const style = getPartStatusStyle(p.status);
                                    const Icon = style.icon;
                                    const itemsStr = p.items?.map((i: any) => `${i.quantity_requested}x ${i.part_name}`).join(', ');

                                    return (
                                        <div key={notif.id} className={`p-3 rounded-xl border flex gap-3 items-start transition-all ${style.bg}`}>
                                            <div className={`mt-0.5 ${style.color}`}>
                                                <Icon size={16} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <div className="text-[0.65rem] font-black text-white leading-tight uppercase tracking-tight">
                                                        Demande Pièces {p.work_order_sap_id || `#${p.work_order_id}`}
                                                    </div>
                                                    <span className="text-[0.55rem] font-bold text-slate-500 uppercase">
                                                        {notif.date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                                                    </span>
                                                </div>
                                                <div className="text-[0.6rem] font-medium text-slate-300 mt-1 leading-relaxed">
                                                    {role === 'magasinier' || role === 'admin'
                                                        ? `${p.requester_name}: ${itemsStr}`
                                                        : `Statut: ${p.status === 'pending' ? 'Attente' : p.status === 'approved' ? 'Prêt' : 'Refusé'}. (${itemsStr})`
                                                    }
                                                </div>
                                                <div className="mt-2 flex justify-end">
                                                    <Link href={role === 'magasinier' ? "/dashboard/magasinier" : `/work-orders/${p.work_order_id}`} onClick={() => setIsOpen(false)} className="text-[0.55rem] font-black uppercase text-amber-500 hover:text-amber-400 tracking-widest">
                                                        Détails →
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                } else {
                                    const o = notif.data;
                                    const style = getWOPriorityStyle(o.priority);
                                    const Icon = style.icon;

                                    return (
                                        <div key={notif.id} className={`p-3 rounded-xl border flex gap-3 items-start transition-all ${style.bg}`}>
                                            <div className={`mt-0.5 ${style.color}`}>
                                                <Icon size={16} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <div className="text-[0.65rem] font-black text-white leading-tight uppercase tracking-tight">
                                                        Intervention {o.sap_order_id || `#${o.id}`}
                                                    </div>
                                                    <span className="text-[0.55rem] font-bold text-slate-500 uppercase">
                                                        {notif.date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                                                    </span>
                                                </div>
                                                <div className="text-[0.6rem] font-bold text-slate-200 mt-1 leading-tight line-clamp-1">
                                                    {o.title}
                                                </div>
                                                <div className="text-[0.55rem] font-medium text-slate-500 mt-1 uppercase tracking-widest">
                                                    Priorité: {o.priority} · Statut: {o.status}
                                                </div>
                                                <div className="mt-2 flex justify-end">
                                                    <Link href={`/work-orders/${o.id}`} onClick={() => setIsOpen(false)} className="text-[0.55rem] font-black uppercase text-blue-400 hover:text-blue-300 tracking-widest">
                                                        Ouvrir →
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
