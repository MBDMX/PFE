import { TrendingUp, CheckCircle, ChevronRight } from 'lucide-react';
import { WorkOrder, PRIORITY_CONFIG, STATUS_CONFIG, normalizeStatus } from './types';

interface Props {
  workOrders: WorkOrder[];
}

export default function Top5Widget({ workOrders }: Props) {
  const top5 = [...workOrders]
    .filter(o => o.status === 'open' || o.status === 'in_progress')
    .sort((a, b) => {
      const pOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return (pOrder[a.priority] ?? 9) - (pOrder[b.priority] ?? 9);
    })
    .slice(0, 5);

  return (
    <div className="azure-card p-6">
      <div className="flex items-center gap-2 mb-5 pb-3 border-b border-white/5">
        <TrendingUp size={16} className="text-emerald-400" />
        <h2 className="text-xs font-black text-white uppercase tracking-widest">Top 5 — À traiter</h2>
      </div>

      <div className="space-y-3">
        {top5.length > 0 ? top5.map((o, idx) => {
          const prio = PRIORITY_CONFIG[o.priority] ?? PRIORITY_CONFIG.medium;
          const status = STATUS_CONFIG[normalizeStatus(o.status)];
          return (
            <div
              key={o.id}
              className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-blue-500/20 transition-all group"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="text-[0.65rem] font-black text-slate-600 w-4 shrink-0">#{idx + 1}</span>
                <span className={`size-2 rounded-full shrink-0 ${prio.dot}`} />
                <div className="flex flex-col min-w-0">
                  <span className="text-[0.65rem] font-bold text-white truncate uppercase tracking-tight">
                    {o.title}
                  </span>
                  <span className="text-[0.55rem] font-bold text-slate-500 uppercase tracking-widest">
                    {o.sap_id || `SAP-WO-${o.id + 1000}`}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-3">
                <span className={`px-2 py-1 rounded-lg border text-[0.55rem] font-black uppercase tracking-widest ${status.classes}`}>
                  {status.label}
                </span>
                <a
                  href={`/work-orders/${o.id}`}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[0.6rem] font-bold text-slate-400 uppercase tracking-widest hover:text-white hover:bg-blue-600 hover:border-blue-600 transition-all"
                >
                  Voir <ChevronRight size={11} />
                </a>
              </div>
            </div>
          );
        }) : (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <CheckCircle size={28} className="text-emerald-500/40" />
            <p className="text-[0.65rem] font-bold text-slate-600 uppercase tracking-widest">
              Aucun OT ouvert en vue
            </p>
          </div>
        )}
      </div>
    </div>
  );
}