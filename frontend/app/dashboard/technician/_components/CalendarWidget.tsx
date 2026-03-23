import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { WorkOrder } from './types';

interface Props {
  workOrders: WorkOrder[];
}

export default function CalendarWidget({ workOrders }: Props) {
  const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const today = new Date();
  const todayNum = today.getDate();
  const startOfWeek = todayNum - ((today.getDay() + 6) % 7);

  const getDayStr = (offset: number) => {
    const d = new Date(today);
    d.setDate(startOfWeek + offset);
    return d.toISOString().slice(0, 10);
  };

  const hasCriticalOnDay = (i: number) =>
    workOrders.some(o =>
      o.priority === 'critical' &&
      o.due_date?.slice(0, 10) === getDayStr(i) &&
      o.status !== 'done' && o.status !== 'closed'
    );

  const hasOTOnDay = (i: number) =>
    workOrders.some(o =>
      o.due_date?.slice(0, 10) === getDayStr(i) &&
      o.status !== 'done' && o.status !== 'closed'
    );

  return (
    <div className="azure-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <CalendarIcon size={16} className="text-blue-400" />
          <h2 className="text-xs font-black text-white uppercase tracking-widest">Ma semaine</h2>
        </div>
        <div className="flex gap-1">
          <button className="size-6 rounded bg-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-all">
            <ChevronLeft size={14} />
          </button>
          <button className="size-6 rounded bg-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-all">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {DAYS.map((d, i) => {
          const dayNum = startOfWeek + i;
          const isToday = dayNum === todayNum;
          const hasCrit = hasCriticalOnDay(i);
          const hasOT = hasOTOnDay(i);

          return (
            <div key={d} className="flex flex-col items-center gap-2">
              <span className={`text-[0.6rem] font-bold uppercase ${isToday ? 'text-blue-400' : 'text-slate-500'}`}>
                {d}
              </span>
              <div className={`w-full aspect-square rounded-lg border relative flex items-center justify-center ${isToday ? 'bg-blue-600/10 border-blue-500/30' : 'bg-slate-950/40 border-white/5'
                }`}>
                <span className={`text-xs font-bold ${isToday ? 'text-white' : 'text-slate-600'}`}>{dayNum}</span>
                {hasCrit && (
                  <span className="absolute bottom-1 size-1.5 rounded-full bg-rose-500 shadow-[0_0_5px_rgba(244,63,94,0.7)]" />
                )}
                {!hasCrit && hasOT && (
                  <span className="absolute bottom-1 size-1.5 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.6)]" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/5">
        <div className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-rose-500" />
          <span className="text-[0.6rem] font-bold text-slate-500 uppercase">Critique</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-blue-500" />
          <span className="text-[0.6rem] font-bold text-slate-500 uppercase">OT prévu</span>
        </div>
      </div>
    </div>
  );
}