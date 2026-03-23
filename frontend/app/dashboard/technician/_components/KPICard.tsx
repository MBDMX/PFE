import { ElementType } from 'react';

interface Props {
  label: string;
  value: string | number;
  sub: string;
  color: 'emerald' | 'rose' | 'blue';
  icon: ElementType;
}

const COLOR_MAP = {
  emerald: 'text-emerald-400 border-emerald-500/20 shadow-emerald-500/5',
  rose: 'text-rose-400    border-rose-500/20    shadow-rose-500/5',
  blue: 'text-blue-400    border-blue-500/20    shadow-blue-500/5',
};

export default function KPICard({ label, value, sub, color, icon: Icon }: Props) {
  return (
    <div className={`azure-card p-5 flex flex-col shadow-lg border ${COLOR_MAP[color]}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[0.6rem] font-black uppercase tracking-widest text-slate-500">{label}</span>
        <Icon size={14} className="opacity-40" />
      </div>
      <div className="text-3xl font-black text-white mb-1">{value}</div>
      <div className="text-[0.6rem] font-bold uppercase tracking-widest text-slate-600">{sub}</div>
    </div>
  );
}