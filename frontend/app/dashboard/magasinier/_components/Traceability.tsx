'use client';
import { useState, useEffect, useMemo } from 'react';
import {
    History, ArrowUpRight, ArrowDownLeft, User,
    Search, Calendar
} from 'lucide-react';
import { gmaoApi } from '../../../../services/api';

interface StockMovement {
    id: number;
    part_code: string;
    part_name: string;
    quantity: number;
    type: string;
    date: string;
    user_id: number;
    user_name: string;
    work_order_id: number | null;
    request_id: number | null;
}

// ─── Date helpers ──────────────────────────────────────────────────────────────

type RangeMode = 'day' | 'week' | 'month' | 'custom';

function startOf(mode: RangeMode, customFrom?: string): Date {
    const now = new Date();
    if (mode === 'day') {
        const d = new Date(now); d.setHours(0, 0, 0, 0); return d;
    }
    if (mode === 'week') {
        const d = new Date(now);
        d.setDate(now.getDate() - ((now.getDay() + 6) % 7));
        d.setHours(0, 0, 0, 0); return d;
    }
    if (mode === 'month') {
        return new Date(now.getFullYear(), now.getMonth(), 1);
    }
    // custom
    return customFrom ? new Date(customFrom) : new Date(now.getFullYear(), now.getMonth(), 1);
}

function toDateStr(d: Date) {
    return d.toISOString().split('T')[0];
}


export default function Traceability() {
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [loading, setLoading]     = useState(true);
    const [search, setSearch]       = useState('');
    const [mode, setMode]           = useState<RangeMode>('week');
    const [customFrom, setCustomFrom] = useState(toDateStr(new Date(Date.now() - 7 * 86400000)));
    const [customTo,   setCustomTo]   = useState(toDateStr(new Date()));

    useEffect(() => {
        gmaoApi.getStockMovements()
            .then(setMovements)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    // Filter by date range and search
    const filtered = useMemo(() => {
        const from = startOf(mode, customFrom);
        const to   = mode === 'custom' ? new Date(customTo + 'T23:59:59') : new Date();

        return movements.filter(m => {
            if (!m.date) return false;
            const d = new Date(m.date);
            const matchDate   = d >= from && d <= to;
            const matchSearch = !search.trim() ||
                m.part_code.toLowerCase().includes(search.toLowerCase()) ||
                m.part_name.toLowerCase().includes(search.toLowerCase());
            return matchDate && matchSearch;
        });
    }, [movements, mode, customFrom, customTo, search]);



    const MODES: { key: RangeMode; label: string }[] = [
        { key: 'day',    label: "Aujourd'hui" },
        { key: 'week',   label: 'Cette semaine' },
        { key: 'month',  label: 'Ce mois' },
        { key: 'custom', label: 'Personnalité' },
    ];

    return (
        <div className="space-y-6">

            {/* ── Date filter bar ─────────────────────────────────────────── */}
            <div className="azure-card p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center gap-2 shrink-0">
                    <Calendar size={16} className="text-blue-400" />
                    <span className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest">Période</span>
                </div>

                <div className="flex gap-1.5 flex-wrap">
                    {MODES.map(m => (
                        <button
                            key={m.key}
                            onClick={() => setMode(m.key)}
                            className={`px-4 py-1.5 rounded-xl text-[0.65rem] font-black uppercase tracking-widest transition-all ${
                                mode === m.key
                                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                    : 'text-slate-500 hover:text-white hover:bg-white/5 border border-transparent'
                            }`}
                        >
                            {m.label}
                        </button>
                    ))}
                </div>

                {mode === 'custom' && (
                    <div className="flex items-center gap-2 animate-in fade-in duration-300">
                        <input
                            type="date"
                            value={customFrom}
                            onChange={e => setCustomFrom(e.target.value)}
                            className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-blue-500/50"
                        />
                        <span className="text-slate-600 text-xs font-bold">→</span>
                        <input
                            type="date"
                            value={customTo}
                            onChange={e => setCustomTo(e.target.value)}
                            className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-blue-500/50"
                        />
                    </div>
                )}

                {/* Search */}
                <div className="relative group sm:ml-auto w-full sm:w-56">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={13} />
                    <input
                        type="text"
                        placeholder="Référence ou désignation..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-1.5 pl-8 pr-3 text-xs text-white focus:outline-none focus:border-blue-500/50 transition-all font-bold placeholder:text-slate-700"
                    />
                </div>
            </div>


            {/* ── Table ───────────────────────────────────────────────────── */}
            <div className="azure-card overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-white/5 border-b border-white/5">
                        <tr>
                            <th className="px-6 py-4 text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest text-center">Type</th>
                            <th className="px-6 py-4 text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest">Article</th>
                            <th className="px-6 py-4 text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest text-center">Qté</th>
                            <th className="px-6 py-4 text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest">Magasinier</th>
                            <th className="px-6 py-4 text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest">Date & Heure</th>
                            <th className="px-6 py-4 text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest text-right">Origine</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {loading ? (
                            <tr><td colSpan={6} className="px-6 py-10 text-center text-slate-500 italic text-sm font-black uppercase tracking-widest">Chargement...</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={6} className="px-6 py-10 text-center text-slate-500 italic text-sm font-black uppercase tracking-widest">Aucun mouvement sur cette période.</td></tr>
                        ) : filtered.map(m => (
                            <tr key={m.id} className="hover:bg-white/5 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className={`size-8 rounded-lg flex items-center justify-center mx-auto ${
                                        m.type === 'OUT' ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'
                                    }`}>
                                        {m.type === 'OUT' ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-xs font-black text-white">{m.part_name}</div>
                                    <div className="text-[0.6rem] font-bold text-blue-400 font-mono mt-0.5">{m.part_code}</div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className="text-sm font-black text-white">{m.quantity}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <div className="size-6 rounded-full bg-slate-800 flex items-center justify-center border border-white/5">
                                            <User size={10} className="text-slate-400" />
                                        </div>
                                        <span className="text-xs font-bold text-slate-300">{m.user_name}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 text-slate-500">
                                        <History size={12} />
                                        <span className="text-[0.7rem] font-medium">{m.date}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right font-mono font-bold text-[0.65rem] text-slate-600">
                                    {m.request_id ? `PR #${m.request_id}` : m.work_order_id ? `OT #${m.work_order_id}` : 'MANUEL'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}