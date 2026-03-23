'use client';
import { useEffect, useState, useCallback, createContext, useContext, useRef } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// ────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  toast: (opts: Omit<Toast, 'id'>) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

// ────────────────────────────────────────────
// CONTEXT
// ────────────────────────────────────────────
const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

// ────────────────────────────────────────────
// CONFIG
// ────────────────────────────────────────────
const TOAST_CONFIG: Record<ToastType, {
  icon: React.ReactNode;
  bar: string;
  glow: string;
  iconColor: string;
}> = {
  success: {
    icon: <CheckCircle2 size={16} />,
    bar: 'bg-emerald-500',
    glow: 'shadow-emerald-500/10',
    iconColor: 'text-emerald-400',
  },
  error: {
    icon: <XCircle size={16} />,
    bar: 'bg-rose-500',
    glow: 'shadow-rose-500/10',
    iconColor: 'text-rose-400',
  },
  warning: {
    icon: <AlertTriangle size={16} />,
    bar: 'bg-amber-400',
    glow: 'shadow-amber-400/10',
    iconColor: 'text-amber-400',
  },
  info: {
    icon: <Info size={16} />,
    bar: 'bg-blue-500',
    glow: 'shadow-blue-500/10',
    iconColor: 'text-blue-400',
  },
};

// ────────────────────────────────────────────
// SINGLE TOAST ITEM
// ────────────────────────────────────────────
function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const config = TOAST_CONFIG[toast.type];
  const duration = toast.duration ?? 4000;

  const dismiss = useCallback(() => {
    setLeaving(true);
    setTimeout(() => onRemove(toast.id), 350);
  }, [toast.id, onRemove]);

  useEffect(() => {
    // Enter
    const enterTimer = setTimeout(() => setVisible(true), 10);
    // Auto-dismiss
    const leaveTimer = setTimeout(dismiss, duration);
    return () => {
      clearTimeout(enterTimer);
      clearTimeout(leaveTimer);
    };
  }, [dismiss, duration]);

  return (
    <div
      style={{
        transition: 'all 350ms cubic-bezier(0.16, 1, 0.3, 1)',
        transform: visible && !leaving ? 'translateX(0) scale(1)' : 'translateX(100%) scale(0.95)',
        opacity: visible && !leaving ? 1 : 0,
      }}
      className={`
        relative flex items-start gap-3 w-80 max-w-[calc(100vw-2rem)]
        bg-slate-900/95 backdrop-blur-md
        border border-white/10
        rounded-2xl p-4
        shadow-2xl ${config.glow}
        overflow-hidden
        group cursor-pointer
      `}
      onClick={dismiss}
    >
      {/* Colored left bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${config.bar} rounded-l-2xl`} />

      {/* Progress bar (shrinks over duration) */}
      <div
        className={`absolute bottom-0 left-0 h-0.5 ${config.bar} opacity-30`}
        style={{
          animation: `shrink ${duration}ms linear forwards`,
        }}
      />

      {/* Icon */}
      <div className={`shrink-0 mt-0.5 ${config.iconColor}`}>
        {config.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white leading-tight">{toast.title}</p>
        {toast.message && (
          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{toast.message}</p>
        )}
      </div>

      {/* Close button */}
      <button
        onClick={(e) => { e.stopPropagation(); dismiss(); }}
        className="shrink-0 text-slate-600 hover:text-slate-300 transition-colors mt-0.5"
      >
        <X size={14} />
      </button>

      {/* Keyframe injected inline */}
      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  );
}

// ────────────────────────────────────────────
// PROVIDER + PORTAL
// ────────────────────────────────────────────
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((opts: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts(prev => [...prev, { ...opts, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const api: ToastContextValue = {
    toast: addToast,
    success: (title, message) => addToast({ type: 'success', title, message }),
    error:   (title, message) => addToast({ type: 'error',   title, message }),
    warning: (title, message) => addToast({ type: 'warning', title, message }),
    info:    (title, message) => addToast({ type: 'info',    title, message }),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}

      {/* Toast portal — fixed bottom-right */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 items-end pointer-events-none"
      >
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onRemove={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
