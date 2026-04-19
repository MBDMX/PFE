'use client';
import { useState, useEffect, useRef } from 'react';
import { Bell, CheckCircle, Clock, XCircle, X } from 'lucide-react';
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
            gmaoApi.getPartsRequests().then(data => {
                // For Magasinier/Admin: Show only pending. For Tech: Show recent (limit 10).
                let filtered = data;
                if (role === 'magasinier' || role === 'admin') {
                    filtered = data.filter((r: any) => r.status === 'pending');
                }
                // Sort by ID descending (newest first)
                filtered.sort((a: any, b: any) => b.id - a.id);
                setNotifications(filtered.slice(0, 10));
                setLoading(false);
            }).catch(() => setLoading(false));
        }
    }, [isOpen, role]);

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'pending': return { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20' };
            case 'approved': return { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20' };
            case 'rejected': return { icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-500/10 border-rose-500/20' };
            default: return { icon: Bell, color: 'text-slate-400', bg: 'bg-slate-800 border-white/5' };
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
                        <h3 className="text-sm font-black text-white uppercase tracking-widest">Centre de Notifications</h3>
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
                                const style = getStatusStyle(notif.status);
                                const Icon = style.icon;
                                const itemsStr = notif.items?.map((i: any) => `${i.quantity_requested}x ${i.part_name}`).join(', ');

                                return (
                                    <div key={notif.id} className={`p-3 rounded-xl border flex gap-3 items-start transition-all ${style.bg}`}>
                                        <div className={`mt-0.5 ${style.color}`}>
                                            <Icon size={16} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <div className="text-xs font-black text-white leading-tight">
                                                    OT {notif.work_order_sap_id || `#${notif.work_order_id}`}
                                                </div>
                                                <span className="text-[0.6rem] font-bold text-slate-500">
                                                    {new Date(notif.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                                                </span>
                                            </div>
                                            <div className="text-[0.65rem] font-medium text-slate-300 mt-1 leading-relaxed">
                                                {role === 'magasinier' || role === 'admin'
                                                    ? `Demande de ${notif.requester_name}: ${itemsStr}`
                                                    : `Votre demande pour ${itemsStr} est ${notif.status === 'pending' ? 'en attente.' : notif.status === 'approved' ? 'approuvée ✅' : 'refusée ❌'}`
                                                }
                                            </div>
                                            {notif.status === 'rejected' && notif.rejection_reason && (
                                                <div className="text-[0.6rem] font-bold text-rose-400 mt-1 bg-rose-500/10 p-1.5 rounded text-wrap break-words">
                                                    Raison : {notif.rejection_reason}
                                                </div>
                                            )}

                                            <div className="mt-2 flex justify-end">
                                                {role === 'magasinier' ? (
                                                    <Link href="/dashboard/magasinier" onClick={() => setIsOpen(false)} className="text-[0.6rem] font-black uppercase text-amber-500 hover:text-amber-400 tracking-wider">
                                                        Ouvrir le tableau
                                                    </Link>
                                                ) : (
                                                    <Link href={`/work-orders/${notif.work_order_id}`} onClick={() => setIsOpen(false)} className="text-[0.6rem] font-black uppercase text-blue-500 hover:text-blue-400 tracking-wider">
                                                        Voir l'OT
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
