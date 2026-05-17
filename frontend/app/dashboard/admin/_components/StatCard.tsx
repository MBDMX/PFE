import React from 'react';
import { TrendingUp, LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  bg: string;
  delta: string;
  alert?: boolean;
}

export function StatCard({ label, value, icon: Icon, color, bg, delta, alert }: StatCardProps) {
  return (
    <div className="azure-card group flex flex-col justify-between p-6">
      <div className="flex items-start justify-between mb-4">
        <div className={`size-11 rounded-xl flex items-center justify-center ${bg}`}>
          <Icon size={22} className={color} strokeWidth={2.5} />
        </div>
        <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-lg ${alert ? "text-rose-400 bg-rose-400/10" : "text-emerald-400 bg-emerald-400/10"}`}>
          <TrendingUp size={11} />
          {delta}
        </div>
      </div>
      <div>
        <div className="text-3xl font-black text-white leading-none group-hover:scale-105 origin-left transition-transform">
          {value}
        </div>
        <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mt-2">
          {label}
        </div>
      </div>
    </div>
  );
}
