'use client';
import { useRouter } from 'next/navigation';
import { Clock, CheckCircle, XCircle, AlertTriangle, Package } from 'lucide-react';
import { MagStats } from './types';

interface Props {
    stats: MagStats;
}

export default function KpiCards({ stats }: Props) {
    const router = useRouter();

    const cards = [
        {
            key:   'pending_requests'      as const,
            label: 'En attente',
            icon:  Clock,
            color: 'text-amber-400',
            bg:    'bg-amber-400/10',
            clickable: false,
        },
        {
            key:   'approved_requests'     as const,
            label: 'Validées',
            icon:  CheckCircle,
            color: 'text-emerald-400',
            bg:    'bg-emerald-400/10',
            clickable: false,
        },
        {
            key:   'rejected_requests'     as const,
            label: 'Refusées',
            icon:  XCircle,
            color: 'text-rose-400',
            bg:    'bg-rose-400/10',
            clickable: false,
        },
        {
            key:   'critical_stock_alerts' as const,
            label: 'Alertes stock',
            icon:  AlertTriangle,
            color: 'text-orange-400',
            bg:    'bg-orange-400/10',
            clickable: true,
            href:  '/dashboard/magasinier/alerts',
        },
        {
            key:   'total_items_out'       as const,
            label: 'Sorties totales',
            icon:  Package,
            color: 'text-blue-400',
            bg:    'bg-blue-400/10',
            clickable: false,
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {cards.map((card) => {
                const isAlert = card.key === 'critical_stock_alerts';
                const hasAlert = isAlert && stats[card.key] > 0;

                return (
                    <div
                        key={card.key}
                        onClick={() => card.clickable && router.push(card.href!)}
                        className={`azure-card p-5 group transition-all
                            ${card.clickable
                                ? 'cursor-pointer hover:border-orange-500/40 hover:bg-orange-500/5'
                                : 'hover:border-white/20'
                            }
                            ${hasAlert ? 'border-orange-500/30 bg-orange-500/5' : ''}
                        `}
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <div className={`size-10 rounded-xl ${card.bg} flex items-center justify-center group-hover:scale-110 transition-transform relative`}>
                                <card.icon size={20} className={`${card.color} ${hasAlert ? 'animate-pulse' : ''}`} />
                                {hasAlert && (
                                    <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-orange-400 border-2 border-slate-950 animate-ping" />
                                )}
                            </div>
                            <div className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest flex-1">
                                {card.label}
                            </div>
                            {card.clickable && (
                                <span className="text-[0.55rem] text-slate-600 group-hover:text-orange-400 transition-colors font-bold uppercase tracking-widest">
                                    →
                                </span>
                            )}
                        </div>
                        <div className={`text-3xl font-black ${hasAlert ? 'text-orange-400' : 'text-white'}`}>
                            {stats[card.key]}
                        </div>
                        {card.clickable && (
                            <div className="text-[0.55rem] text-slate-600 group-hover:text-orange-400 transition-colors font-bold uppercase tracking-widest mt-1">
                                Voir le détail →
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}