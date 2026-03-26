// ── Shared types & config for Manager Dashboard ──────────────────

export interface ManagerStats {
    totalOT: number;
    openOT: number;
    inProgressOT: number;
    doneOT: number;
    overdueOT: number;
    criticalOT: number;
    lowStock: number;
    avgMachineHealth: number;
    resolutionRate: number;
    dueMaintenance: number;
}

export interface WorkOrder {
    id: number;
    sap_order_id?: string;
    title: string;
    type: string;
    priority: string;
    status: string;
    technical_location?: string;
    planned_end_date?: string;
    technician_id?: number;
}

// ── Status ──────────────────────────────────────────────────────
export const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
    open: { label: 'Ouvert', classes: 'bg-sky-500/10 text-sky-300 border-sky-500/30' },
    in_progress: { label: 'En cours', classes: 'bg-amber-500/10 text-amber-300 border-amber-500/30' },
    done: { label: 'Terminé', classes: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
    closed: { label: 'Clôturé', classes: 'bg-slate-500/10 text-slate-400 border-slate-500/30' },
    pending: { label: 'En attente', classes: 'bg-violet-500/10 text-violet-300 border-violet-500/30' },
};

// ── Priority ─────────────────────────────────────────────────────
export const PRIORITY_CONFIG: Record<string, { label: string; classes: string; dot: string }> = {
    critical: { label: 'Critique', classes: 'bg-rose-500/10 text-rose-300 border-rose-500/30', dot: 'bg-rose-400' },
    high: { label: 'Élevé', classes: 'bg-orange-500/10 text-orange-300 border-orange-500/30', dot: 'bg-orange-400' },
    medium: { label: 'Moyen', classes: 'bg-amber-500/10 text-amber-300 border-amber-500/30', dot: 'bg-amber-400' },
    low: { label: 'Faible', classes: 'bg-slate-500/10 text-slate-400 border-slate-500/30', dot: 'bg-slate-500' },
};

export function isOverdue(endDate?: string | null, status?: string): boolean {
    if (!endDate || status === 'done' || status === 'closed') return false;
    return new Date(endDate) < new Date();
}
