'use client';
import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { WorkOrder, STATUS_CONFIG, normalizeStatus } from './types';

interface Props {
  order: WorkOrder;
  onUpdate: (id: number, status: WorkOrder['status']) => Promise<void>;
}

export default function StatusDropdown({ order, onUpdate }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const normalizedStatus = normalizeStatus(order.status);
  const current = STATUS_CONFIG[normalizedStatus];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    if (isOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const handleSelect = async (status: WorkOrder['status']) => {
    if (status === normalizedStatus) return;
    setIsOpen(false);
    setIsUpdating(true);
    await onUpdate(order.id, status);
    setIsUpdating(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => !isUpdating && setIsOpen(!isOpen)}
        disabled={isUpdating}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[0.6rem] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 min-w-[100px] justify-between ${current.classes} ${isUpdating ? 'opacity-70 cursor-wait' : ''}`}
      >
        <span className="flex items-center gap-2">
          {isUpdating
            ? <Loader2 size={10} className="animate-spin" />
            : <span className={`size-1.5 rounded-full ${current.dot}`} />
          }
          {current.label}
        </span>
        <ChevronDown size={12} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-40 bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {(['open', 'in_progress', 'done', 'closed'] as const).map((s) => (
            <button
              key={s}
              onClick={() => handleSelect(s)}
              disabled={s === normalizedStatus}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-[0.65rem] font-bold uppercase tracking-widest transition-colors ${s === normalizedStatus
                  ? 'bg-white/5 text-slate-500 cursor-default'
                  : 'text-slate-300 hover:bg-blue-600/20 hover:text-blue-400'
                }`}
            >
              <div className="flex items-center gap-2">
                <span className={`size-1.5 rounded-full ${STATUS_CONFIG[s].dot}`} />
                {STATUS_CONFIG[s].label}
              </div>
              {s === normalizedStatus && <span className="text-[0.5rem] italic opacity-50">(actuel)</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}