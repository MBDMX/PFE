'use client';
import { LucideIcon } from 'lucide-react';

type Color = 'blue' | 'emerald' | 'rose' | 'amber' | 'orange' | 'violet' | 'slate';

const COLOR_MAP: Record<Color, { card: string; badge: string; icon: string; text: string }> = {
    blue:    { card: 'border-blue-500/20   bg-blue-500/5',   badge: 'bg-blue-500/15   border-blue-500/30',   icon: 'text-blue-400',   text: 'text-blue-300' },
    emerald: { card: 'border-emerald-500/20 bg-emerald-500/5', badge: 'bg-emerald-500/15 border-emerald-500/30', icon: 'text-emerald-400', text: 'text-emerald-300' },
    rose:    { card: 'border-rose-500/20   bg-rose-500/5',   badge: 'bg-rose-500/15   border-rose-500/30',   icon: 'text-rose-400',   text: 'text-rose-300' },
    amber:   { card: 'border-amber-500/20  bg-amber-500/5',  badge: 'bg-amber-500/15  border-amber-500/30',  icon: 'text-amber-400',  text: 'text-amber-300' },
    orange:  { card: 'border-orange-500/20 bg-orange-500/5', badge: 'bg-orange-500/15 border-orange-500/30', icon: 'text-orange-400', text: 'text-orange-300' },
    violet:  { card: 'border-violet-500/20 bg-violet-500/5', badge: 'bg-violet-500/15 border-violet-500/30', icon: 'text-violet-400', text: 'text-violet-300' },
    slate:   { card: 'border-slate-500/20  bg-slate-500/5',  badge: 'bg-slate-500/15  border-slate-500/30',  icon: 'text-slate-400',  text: 'text-slate-300' },
};

interface Props {
    label: string;
    value: string | number;
    sub?: string;
    icon: LucideIcon;
    color?: Color;
    alert?: boolean; // pulse red if true
}

export default function KPICard({ label, value, sub, icon: Icon, color = 'blue', alert }: Props) {
    const c = COLOR_MAP[color];
    return (
        <div className={`relative rounded-2xl border p-5 ${c.card} transition-all hover:scale-[1.02]`}>
            {alert && (
                <span className="absolute top-3 right-3 size-2 rounded-full bg-rose-400 animate-ping" />
            )}
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                    <p className="text-[0.7rem] font-bold text-slate-500 uppercase tracking-widest mb-2">{label}</p>
                    <p className={`text-4xl font-black leading-none ${c.text}`}>{value}</p>
                    {sub && <p className="text-[0.65rem] text-slate-600 mt-2 font-medium">{sub}</p>}
                </div>
                <div className={`p-3 rounded-xl border ${c.badge} shrink-0`}>
                    <Icon size={20} className={c.icon} />
                </div>
            </div>
        </div>
    );
}
