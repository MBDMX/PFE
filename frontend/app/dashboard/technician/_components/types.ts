export interface WorkOrder {
  id: number;
  sap_id: string;
  title: string;
  machine_name: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'done' | 'closed';
  due_date: string;
  created_at?: string;
  closed_at?: string;
}

export const STATUS_CONFIG: Record<WorkOrder['status'], { label: string; classes: string; dot: string }> = {
  open: { label: 'Ouvert', classes: 'text-slate-400   bg-slate-400/10   border-slate-500/20', dot: 'bg-slate-500' },
  in_progress: { label: 'En cours', classes: 'text-blue-400    bg-blue-400/10    border-blue-500/20', dot: 'bg-blue-400' },
  done: { label: 'Terminé', classes: 'text-emerald-400 bg-emerald-400/10 border-emerald-500/20', dot: 'bg-emerald-400' },
  closed: { label: 'Clôturé', classes: 'text-slate-500   bg-slate-500/10   border-slate-600/20', dot: 'bg-slate-600' },
};

export const PRIORITY_CONFIG: Record<WorkOrder['priority'], { label: string; classes: string; dot: string }> = {
  low: { label: 'Faible', classes: 'text-slate-400 bg-slate-400/10 border-slate-500/20', dot: 'bg-slate-500' },
  medium: { label: 'Moyen', classes: 'text-blue-400  bg-blue-400/10  border-blue-500/20', dot: 'bg-blue-400' },
  high: { label: 'Élevé', classes: 'text-amber-400 bg-amber-400/10 border-amber-500/20', dot: 'bg-amber-400' },
  critical: { label: 'Critique', classes: 'text-rose-400  bg-rose-400/10  border-rose-500/20', dot: 'bg-rose-500 animate-pulse' },
};

export function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

export function isOverdue(dateStr: string, status: WorkOrder['status']): boolean {
  if (!dateStr || status === 'done' || status === 'closed') return false;
  return new Date(dateStr) < new Date();
}

export function normalizeStatus(raw: string | undefined): WorkOrder['status'] {
  const v = raw?.toLowerCase().trim().replace(/ /g, '_') ?? '';
  return (v in STATUS_CONFIG) ? (v as WorkOrder['status']) : 'open';
}

export function normalizePriority(raw: string | undefined): WorkOrder['priority'] {
  const v = raw?.toLowerCase().trim() ?? '';
  return (v in PRIORITY_CONFIG) ? (v as WorkOrder['priority']) : 'medium';
}