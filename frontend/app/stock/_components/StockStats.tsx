import { BarChart3, AlertTriangle, Coins, CheckCircle2 } from 'lucide-react';
import { StockItem } from './types';

interface Props {
  items: StockItem[];
}

export default function StockStats({ items }: Props) {
  const totalValue = items.reduce((acc, item) => acc + (item.quantity * (item.unit_price || 0)), 0);
  const criticalItems = items.filter(item => item.quantity <= 5).length;
  const inStockRate = items.length > 0 ? (items.filter(item => item.quantity > 0).length / items.length) * 100 : 0;

  const StatCard = ({ icon: Icon, label, value, subtext, color, pulse = false }: any) => (
    <div className="relative group overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-[0.03] group-hover:opacity-[0.06] transition-opacity`} />
      <div className="relative p-5 rounded-3xl border border-white/[0.03] bg-white/[0.01] backdrop-blur-xl shadow-2xl space-y-3">
        <div className="flex justify-between items-start">
          <div className={`p-3 rounded-2xl bg-gradient-to-br ${color} opacity-20 border border-white/10`}>
            <Icon size={20} className="text-white" />
          </div>
          {pulse && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-rose-500/10 border border-rose-500/20">
              <span className="size-1.5 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-[0.6rem] font-black text-rose-400 uppercase tracking-tighter">Alerte</span>
            </div>
          )}
        </div>
        <div>
          <p className="text-[0.65rem] font-black text-slate-500 uppercase tracking-[0.2em]">{label}</p>
          <div className="flex items-baseline gap-2 mt-1">
            <h4 className="text-2xl font-black text-white tracking-tight">{value}</h4>
            <span className="text-[0.7rem] font-bold text-slate-400">{subtext}</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <StatCard 
        icon={Coins}
        label="Valeur Totale SAP"
        value={totalValue.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
        subtext="TND"
        color="from-emerald-500 to-teal-600"
      />
      <StatCard 
        icon={AlertTriangle}
        label="Pièces Critiques"
        value={criticalItems}
        subtext="à commander"
        color="from-rose-500 to-red-600"
        pulse={criticalItems > 0}
      />
      <StatCard 
        icon={BarChart3}
        label="Articles Référencés"
        value={items.length}
        subtext="actifs"
        color="from-blue-500 to-indigo-600"
      />
      <StatCard 
        icon={CheckCircle2}
        label="Disponibilité"
        value={Math.round(inStockRate)}
        subtext="%"
        color="from-cyan-500 to-blue-600"
      />
    </div>
  );
}
