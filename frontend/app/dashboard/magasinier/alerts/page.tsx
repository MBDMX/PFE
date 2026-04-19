'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft, AlertTriangle, ShoppingCart,
    Package, TrendingDown, Search
} from 'lucide-react';
import { gmaoApi } from '../../../../services/api';
import { useToast } from '../../../../components/ui/toast';

interface StockItem {
    id: number;
    name: string;
    reference: string;
    quantity: number;
    unit: string;
    location: string;
    unit_price?: number;
}

const LEVELS = [
    { label: 'Rupture', max: 0, color: 'text-rose-400', bg: 'bg-rose-400/10', border: 'border-rose-500/30', dot: 'bg-rose-400' },
    { label: 'Critique', max: 2, color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-500/30', dot: 'bg-orange-400 animate-pulse' },
    { label: 'Bas', max: 5, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-500/20', dot: 'bg-amber-400' },
] as const;

function getLevel(qty: number) {
    if (qty === 0) return LEVELS[0];
    if (qty <= 2) return LEVELS[1];
    return LEVELS[2];
}

export default function AlertsPage() {
    const router = useRouter();
    const [items, setItems] = useState<StockItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [ordering, setOrdering] = useState<number | null>(null);
    const { success, error: toastError } = useToast();

    useEffect(() => {
        gmaoApi.getStock()
            .then((data: StockItem[]) => setItems(data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    async function handleOrder(item: StockItem) {
        setOrdering(item.id);
        try {
            const res = await gmaoApi.orderStock(item.id, 10);
            success('Commande transmise', `${item.name} — ${res.sap_po || 'SAP confirmé'}`);
            // Refresh stock
            const updated: StockItem[] = await gmaoApi.getStock();
            setItems(updated);
        } catch {
            toastError('Échec commande', 'Vérifiez la connexion SAP');
        } finally {
            setOrdering(null);
        }
    }

    const critical = items
        .filter(i => i.quantity <= 5)
        .filter(i =>
            i.name.toLowerCase().includes(search.toLowerCase()) ||
            i.reference.toLowerCase().includes(search.toLowerCase())
        )
        .sort((a, b) => a.quantity - b.quantity); // les plus critiques en premier

    const ruptures = critical.filter(i => i.quantity === 0).length;
    const critiques = critical.filter(i => i.quantity > 0 && i.quantity <= 2).length;
    const bas = critical.filter(i => i.quantity > 2).length;

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">

            {/* ── Header ── */}
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => router.back()}
                    className="size-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all border border-white/5"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-3xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent tracking-tight">
                        Alertes Stock
                    </h1>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">
                        Pièces sous le seuil critique (≤ 5 unités)
                    </p>
                </div>
                {critical.length > 0 && (
                    <div className="ml-auto flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 px-4 py-2 rounded-2xl">
                        <AlertTriangle size={16} className="text-orange-400 animate-pulse" />
                        <span className="text-[0.65rem] font-bold text-orange-400 uppercase tracking-widest">
                            {critical.length} article{critical.length > 1 ? 's' : ''} en alerte
                        </span>
                    </div>
                )}
            </div>

            {/* ── Summary KPIs ── */}
            <div className="grid grid-cols-3 gap-4 mb-8">
                {[
                    { label: 'Ruptures (0 unité)', value: ruptures, color: 'text-rose-400', bg: 'bg-rose-400/10', border: 'border-rose-500/20' },
                    { label: 'Critiques (1–2)', value: critiques, color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-500/20' },
                    { label: 'Stock bas (3–5)', value: bas, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-500/20' },
                ].map(k => (
                    <div key={k.label} className={`azure-card p-5 ${k.border} ${k.bg}`}>
                        <div className={`text-4xl font-black ${k.color} mb-1`}>{k.value}</div>
                        <div className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest">{k.label}</div>
                    </div>
                ))}
            </div>

            {/* ── Search ── */}
            <div className="relative mb-6 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-orange-400 transition-colors" size={16} />
                <input
                    type="text"
                    placeholder="Rechercher une pièce..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-3 pl-11 pr-4 text-sm font-medium focus:outline-none focus:border-orange-500/40 transition-all"
                />
            </div>

            {/* ── Table ── */}
            <div className="azure-card p-0 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-white/5 border-b border-white/5">
                        <tr>
                            <th className="px-6 py-4 text-[0.6rem] font-black text-slate-500 uppercase tracking-widest">Niveau</th>
                            <th className="px-6 py-4 text-[0.6rem] font-black text-slate-500 uppercase tracking-widest">Article</th>
                            <th className="px-6 py-4 text-[0.6rem] font-black text-slate-500 uppercase tracking-widest">Emplacement</th>
                            <th className="px-6 py-4 text-[0.6rem] font-black text-slate-500 uppercase tracking-widest text-center">Qté restante</th>
                            <th className="px-6 py-4 text-[0.6rem] font-black text-slate-500 uppercase tracking-widest text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-16 text-center text-slate-500 animate-pulse text-xs font-black uppercase tracking-widest">
                                    Chargement des alertes...
                                </td>
                            </tr>
                        ) : critical.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-16 text-center">
                                    <Package size={40} className="mx-auto text-slate-700 mb-4" />
                                    <p className="text-slate-500 font-bold text-sm">Aucune alerte de stock détectée</p>
                                    <p className="text-slate-600 text-xs mt-1">Tous les articles sont au-dessus du seuil critique</p>
                                </td>
                            </tr>
                        ) : critical.map(item => {
                            const level = getLevel(item.quantity);
                            const isOrdering = ordering === item.id;
                            return (
                                <tr key={item.id} className={`group hover:bg-white/[0.03] transition-colors ${item.quantity === 0 ? 'bg-rose-500/5' : ''}`}>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className={`size-2 rounded-full ${level.dot}`} />
                                            <span className={`text-[0.6rem] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${level.bg} ${level.color} ${level.border}`}>
                                                {level.label}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-sm text-white">{item.name}</div>
                                        <div className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{item.reference}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-xs font-bold text-slate-400 uppercase">{item.location}</div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className={`text-2xl font-black ${level.color}`}>
                                            {item.quantity}
                                            <span className="text-xs font-bold text-slate-600 ml-1">{item.unit}</span>
                                        </div>
                                        {/* Mini bar */}
                                        <div className="w-16 h-1 bg-white/5 rounded-full mx-auto mt-1 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${item.quantity === 0 ? 'bg-rose-500' : item.quantity <= 2 ? 'bg-orange-400' : 'bg-amber-400'}`}
                                                style={{ width: `${Math.round((item.quantity / 5) * 100)}%` }}
                                            />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleOrder(item)}
                                            disabled={isOrdering}
                                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600/10 hover:bg-emerald-600 border border-emerald-500/20 hover:border-emerald-500 text-emerald-400 hover:text-white text-[0.65rem] font-black uppercase tracking-widest transition-all ml-auto disabled:opacity-50"
                                        >
                                            <ShoppingCart size={12} className={isOrdering ? 'animate-bounce' : ''} />
                                            {isOrdering ? 'Commande...' : 'Commander ×10'}
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Légende */}
            <div className="flex items-center gap-6 mt-6 px-2">
                {LEVELS.map(l => (
                    <div key={l.label} className="flex items-center gap-2">
                        <div className={`size-2 rounded-full ${l.dot.replace('animate-pulse', '')}`} />
                        <span className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest">{l.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}