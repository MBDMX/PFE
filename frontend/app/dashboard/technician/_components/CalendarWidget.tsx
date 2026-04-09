'use client';
import { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { WorkOrder } from './types';

interface Props {
  workOrders: WorkOrder[];
}

export default function CalendarWidget({ workOrders }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const monthNames = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();

  // getDay() gives 0 for Sunday. Convert to 0-6 for Mon-Sun
  let startingDay = firstDayOfMonth.getDay() - 1;
  if (startingDay === -1) startingDay = 6;

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));


  const today = new Date();
  const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;
  const pad = (n: number) => n.toString().padStart(2, '0');
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(`${year}-${pad(month + 1)}-${pad(today.getDate())}`);

  // Helper to format local date consistently
  const getDayStr = (d: number) => {
    return `${year}-${pad(month + 1)}-${pad(d)}`;
  };

  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  const getOrdersForDayStr = (dStr: string) => {
    return workOrders.filter(o => {
      const targetDate = o.due_date || (o as any).planned_start_date || o.created_at;
      return targetDate?.startsWith(dStr);
    });
  };

  const getOrdersForDay = (day: number) => getOrdersForDayStr(getDayStr(day));

  const resetToToday = () => {
    setCurrentDate(new Date());
    setSelectedDateStr(todayStr);
  };

  const gridCells = [];

  for (let i = 0; i < startingDay; i++) {
    gridCells.push(<div key={`empty-${i}`} className="w-full h-10 sm:h-12 rounded-xl border border-transparent bg-slate-900/10"></div>);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = getDayStr(d);
    const isToday = dStr === todayStr;
    const isSelected = dStr === selectedDateStr;
    const dayOrders = getOrdersForDay(d);

    const hasCrit = dayOrders.some(o => o.priority === 'critical' && o.status !== 'done' && o.status !== 'closed');
    const hasActiveOT = dayOrders.some(o => o.status !== 'done' && o.status !== 'closed' && o.priority !== 'critical');
    const hasDone = dayOrders.some(o => o.status === 'done' || o.status === 'closed');

    gridCells.push(
      <button
        key={`day-${d}`}
        onClick={() => setSelectedDateStr(dStr)}
        className={`w-full h-10 sm:h-12 rounded-xl border relative flex flex-col items-center justify-center p-1 transition-all group hover:scale-105 hover:bg-slate-800 focus:outline-none ${isSelected
          ? 'bg-blue-600/30 border-blue-400 ring-2 ring-blue-400/50 shadow-[0_0_15px_rgba(59,130,246,0.5)] z-10'
          : isToday
            ? 'bg-blue-600/10 border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.2)]'
            : 'bg-slate-950/40 border-white/5'
          }`}
        title={dayOrders.length > 0 ? `${dayOrders.length} OT(s)` : 'Aucun OT'}
      >
        <span className={`text-[0.65rem] font-black z-10 transition-colors ${isSelected ? 'text-white' : isToday ? 'text-blue-300' : (dayOrders.length > 0 ? 'text-slate-300' : 'text-slate-600')
          }`}>
          {d}
        </span>

        <div className="flex gap-1 absolute bottom-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
          {hasCrit && <span className="size-1.5 rounded-full bg-rose-500 shadow-[0_0_5px_rgba(244,63,94,0.7)]"></span>}
          {hasActiveOT && <span className="size-1.5 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.6)]"></span>}
          {hasDone && <span className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]"></span>}
        </div>
      </button>
    );
  }

  const selectedOrders = selectedDateStr ? getOrdersForDayStr(selectedDateStr) : [];

  return (
    <div className="azure-card p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-inner">
            <CalendarIcon size={18} className="text-blue-400" />
          </div>
          <div>
            <h2 className="text-xs font-black text-white uppercase tracking-widest leading-tight">Mon Agenda</h2>
            <div className="text-[0.65rem] font-bold text-blue-400 mt-0.5">
              {monthNames[month]} {year}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isCurrentMonth && (
            <button
              onClick={resetToToday}
              className="text-[0.6rem] font-black text-slate-400 uppercase tracking-widest hover:text-white mr-2 transition-colors"
            >
              Aujourd'hui
            </button>
          )}
          <button
            onClick={prevMonth}
            className="size-7 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all active:scale-95"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={nextMonth}
            className="size-7 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all active:scale-95"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-2">
        {DAYS.map(d => (
          <div key={d} className="text-center">
            <span className="text-[0.6rem] font-black uppercase tracking-widest text-slate-500">
              {d}
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2 flex-grow content-start">
        {gridCells}
      </div>

      {/* Expanded Agenda View for Selected Day */}
      {selectedDateStr && (
        <div className="mt-5 pt-4 border-t border-white/5 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[0.65rem] font-black text-blue-400 uppercase tracking-widest">
              Détails du {selectedDateStr}
            </h3>
            <span className="text-[0.6rem] font-bold text-slate-500 bg-white/5 px-2 py-0.5 rounded-md">
              {selectedOrders.length} intervention(s)
            </span>
          </div>

          <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
            {selectedOrders.length === 0 ? (
              <div className="py-4 text-center text-xs font-bold text-slate-600 border border-dashed border-white/5 rounded-xl bg-slate-900/20">
                Aucun OT planifié ce jour.
              </div>
            ) : (
              selectedOrders.map(o => (
                <div key={o.id} className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-start gap-3 hover:bg-white/10 transition-colors">
                  <div className={`mt-0.5 size-2 rounded-full shrink-0 ${o.priority === 'critical' ? 'bg-rose-500 shadow-[0_0_5px_rgba(244,63,94,0.5)]' :
                    (o.status === 'done' || o.status === 'closed') ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]' :
                      'bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.5)]'
                    }`} />
                  <div className="flex-1">
                    <div className="text-xs font-black text-white leading-tight mb-1">{o.title}</div>
                    <div className="flex items-center gap-3">
                      <span className="text-[0.6rem] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        <Clock size={10} />
                        {o.machine_name}
                      </span>
                      <span className="text-[0.55rem] font-black text-slate-500 uppercase tracking-widest px-1.5 bg-slate-800 rounded">
                        {o.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div className="flex items-center flex-wrap gap-4 mt-4 pt-4 border-t border-white/5">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-rose-500 shadow-[0_0_5px_rgba(244,63,94,0.5)]" />
          <span className="text-[0.6rem] font-black text-slate-400 uppercase tracking-widest">Urgent</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.5)]" />
          <span className="text-[0.6rem] font-black text-slate-400 uppercase tracking-widest">En attente</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
          <span className="text-[0.6rem] font-black text-slate-400 uppercase tracking-widest">Terminé</span>
        </div>
      </div>
    </div>
  );
}