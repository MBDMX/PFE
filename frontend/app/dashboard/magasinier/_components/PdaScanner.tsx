'use client';
import { useState, useRef, useEffect } from 'react';
import {
    ScanLine, Search, ArrowUpCircle, ArrowDownCircle,
    MapPin, CheckCircle2, XCircle, Package, History,
    Download, Trash2, Camera, CameraOff, Loader2
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { gmaoApi } from '../../../../services/api';
import { useToast } from '../../../../components/ui/toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StockItem {
    id: number;
    name: string;
    reference: string;
    quantity: number;
    unit: string;
    location: string;
    unit_price?: number;
}

type LogEntry = {
    id: string;
    time: string;
    type: 'IN' | 'OUT' | 'LOCATION';
    partName: string;
    quantity?: number;
    location?: string;
    success: boolean;
};

type ActionMode = 'IN' | 'OUT' | 'LOCATION' | null;

// ─── CSV Export ───────────────────────────────────────────────────────────────

function exportCSV(log: LogEntry[]) {
    const header = 'Heure,Type,Pièce,Quantité,Emplacement,Statut';
    const rows = log.map(e =>
        `${e.time},${e.type},${e.partName},${e.quantity ?? ''},${e.location ?? ''},${e.success ? 'OK' : 'ÉCHEC'}`
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pda-session-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PdaScanner() {
    const [query, setQuery] = useState('');
    const [found, setFound] = useState<StockItem | null>(null);
    const [notFound, setNotFound] = useState(false);
    const [searching, setSearching] = useState(false);
    const [action, setAction] = useState<ActionMode>(null);
    const [qty, setQty] = useState(1);
    const [locationInput, setLocationInput] = useState('');
    const [busy, setBusy] = useState(false);
    const [log, setLog] = useState<LogEntry[]>([]);
    const [cameraActive, setCameraActive] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const { success, error: toastError } = useToast();

    // Auto-focus on mount
    useEffect(() => { inputRef.current?.focus(); }, []);

    // ── Camera Scanner Logic ───────────────────────────────────────────────
    useEffect(() => {
        if (cameraActive) {
            const scanner = new Html5Qrcode('reader');
            scannerRef.current = scanner;

            const config = { fps: 10, qrbox: { width: 250, height: 250 } };

            scanner.start(
                { facingMode: 'environment' },
                config,
                (decodedText) => {
                    setQuery(decodedText);
                    setCameraActive(false); // Stop after success
                    // Trigger search automatically
                    setTimeout(() => {
                        handleSearchWithQuery(decodedText);
                    }, 100);
                },
                undefined
            ).catch(err => {
                console.error('Scanner error:', err);
                toastError('Caméra', 'Impossible d\'accéder à la caméra');
                setCameraActive(false);
            });

            return () => {
                if (scannerRef.current?.isScanning) {
                    scannerRef.current.stop().then(() => scannerRef.current?.clear());
                }
            };
        }
    }, [cameraActive]);

    async function handleSearchWithQuery(searchQuery: string) {
        if (!searchQuery.trim()) return;
        setSearching(true);
        setFound(null);
        setNotFound(false);
        setAction(null);
        try {
            const stock: StockItem[] = await gmaoApi.getStock();
            const match = stock.find(
                s => s.reference.toLowerCase() === searchQuery.trim().toLowerCase() ||
                     s.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
            );
            if (match) {
                setFound(match);
                setLocationInput(match.location);
            } else {
                setNotFound(true);
            }
        } catch {
            toastError('Erreur', 'Impossible de contacter le serveur');
        } finally {
            setSearching(false);
        }
    }

    // ── Search ────────────────────────────────────────────────────────────────

    async function handleSearch() {
        await handleSearchWithQuery(query);
    }

    // ── Actions ───────────────────────────────────────────────────────────────

    async function handleMovement(type: 'IN' | 'OUT') {
        if (!found) return;
        setBusy(true);
        try {
            await gmaoApi.createStockMovement({ part_id: found.id, type, quantity: qty });
            const newQty = type === 'OUT' ? found.quantity - qty : found.quantity + qty;
            setFound({ ...found, quantity: newQty });
            success(
                type === 'OUT' ? '✓ Sortie enregistrée' : '✓ Entrée enregistrée',
                `${qty} × ${found.name}`
            );
            addLog({ type, partName: found.name, quantity: qty, success: true });
            setAction(null);
            setQty(1);
        } catch (err: any) {
            const msg = err?.response?.data?.detail || 'Erreur serveur';
            toastError('Échec', msg);
            addLog({ type, partName: found.name, quantity: qty, success: false });
        } finally {
            setBusy(false);
        }
    }

    async function handleLocationUpdate() {
        if (!found || !locationInput.trim()) return;
        setBusy(true);
        try {
            await gmaoApi.updatePartLocation(found.id, locationInput.trim());
            setFound({ ...found, location: locationInput.trim() });
            success('✓ Emplacement mis à jour', `${found.name} → ${locationInput.trim()}`);
            addLog({ type: 'LOCATION', partName: found.name, location: locationInput.trim(), success: true });
            setAction(null);
        } catch {
            toastError('Échec', 'Erreur de mise à jour');
            addLog({ type: 'LOCATION', partName: found.name, location: locationInput.trim(), success: false });
        } finally {
            setBusy(false);
        }
    }

    function addLog(entry: Omit<LogEntry, 'id' | 'time'>) {
        const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLog(prev => [{ ...entry, id: crypto.randomUUID(), time: now }, ...prev]);
    }

    function resetScan() {
        setQuery('');
        setFound(null);
        setNotFound(false);
        setAction(null);
        setQty(1);
        inputRef.current?.focus();
    }

    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

            {/* ── Left panel — Scanner ──────────────────────────────────── */}
            <div className="lg:col-span-3 space-y-5">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                            <ScanLine size={20} className="text-violet-400" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-white uppercase tracking-widest">PDA Scanner</h2>
                            <p className="text-[0.6rem] text-slate-500 font-bold uppercase tracking-widest">
                                Scan pièces · Entrée / Sortie · Mapping rayon
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 bg-emerald-500/5 border border-emerald-500/15 px-3 py-1.5 rounded-xl">
                        <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[0.6rem] font-black text-emerald-500 uppercase tracking-widest">Actif</span>
                    </div>
                </div>

                {/* Search bar */}
                <div className="azure-card p-4">
                    <div className="flex gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                placeholder="Référence ou nom de pièce..."
                                className="w-full bg-slate-950/60 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm font-bold text-white focus:outline-none focus:border-violet-500/50 transition-all placeholder:text-slate-700"
                            />
                        </div>
                        <button
                            onClick={handleSearch}
                            disabled={searching}
                            className="px-5 py-3 bg-violet-600 hover:bg-violet-500 active:scale-95 rounded-xl text-white text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                            {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                            Chercher
                        </button>
                        <button
                            onClick={() => setCameraActive(!cameraActive)}
                            title="Scanner QR code"
                            className={`px-4 py-3 rounded-xl border text-xs font-black uppercase transition-all flex items-center gap-2 ${
                                cameraActive
                                    ? 'bg-violet-500/20 border-violet-500/40 text-violet-400'
                                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                            }`}
                        >
                            {cameraActive ? <CameraOff size={16} /> : <Camera size={16} />}
                        </button>
                    </div>

                    {/* Camera note & Scanner */}
                    {cameraActive && (
                        <div className="mt-4 space-y-3">
                            <div id="reader" className="overflow-hidden rounded-2xl border-2 border-violet-500/30 bg-black"></div>
                            <div className="p-3 rounded-xl bg-violet-500/5 border border-violet-500/20 text-[0.65rem] text-violet-400 font-bold text-center animate-in fade-in duration-300">
                                📷 Pointez la caméra vers le QR code — la saisie se remplira automatiquement.
                                <br /><span className="text-slate-500">(Nécessite HTTPS en production)</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Not found */}
                {notFound && (
                    <div className="azure-card p-5 border-rose-500/20 bg-rose-500/5 flex items-center gap-4 animate-in fade-in duration-300">
                        <XCircle size={24} className="text-rose-400 shrink-0" />
                        <div>
                            <div className="text-sm font-black text-rose-400">Pièce introuvable</div>
                            <div className="text-[0.65rem] text-slate-500 font-bold mt-0.5">
                                Aucun article avec la référence ou le nom « {query} »
                            </div>
                        </div>
                        <button onClick={resetScan} className="ml-auto text-slate-600 hover:text-white transition-colors">
                            <XCircle size={16} />
                        </button>
                    </div>
                )}

                {/* Found card */}
                {found && (
                    <div className="azure-card p-5 border-violet-500/20 bg-violet-500/5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="size-12 rounded-2xl bg-slate-800 flex items-center justify-center border border-white/5">
                                    <Package size={22} className="text-violet-400" />
                                </div>
                                <div>
                                    <div className="text-base font-black text-white">{found.name}</div>
                                    <div className="text-[0.65rem] font-black text-violet-400 uppercase tracking-widest font-mono mt-0.5">
                                        {found.reference}
                                    </div>
                                </div>
                            </div>
                            <button onClick={resetScan} className="text-slate-600 hover:text-white transition-colors mt-1">
                                <XCircle size={16} />
                            </button>
                        </div>

                        <div className="grid grid-cols-3 gap-3 mb-5">
                            <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 text-center">
                                <div className={`text-2xl font-black ${found.quantity <= 2 ? 'text-rose-400' : found.quantity <= 5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                    {found.quantity}
                                </div>
                                <div className="text-[0.55rem] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{found.unit}</div>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 text-center">
                                <div className="text-sm font-black text-white flex items-center justify-center gap-1">
                                    <MapPin size={12} className="text-blue-400" />
                                    {found.location}
                                </div>
                                <div className="text-[0.55rem] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Rayon</div>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 text-center">
                                <div className="text-sm font-black text-white">{found.unit_price?.toFixed(2) ?? '—'} €</div>
                                <div className="text-[0.55rem] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Prix unit.</div>
                            </div>
                        </div>

                        {/* Action buttons */}
                        {!action && (
                            <div className="grid grid-cols-3 gap-3">
                                <button
                                    onClick={() => setAction('IN')}
                                    className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 transition-all active:scale-95 group"
                                >
                                    <ArrowDownCircle size={24} className="group-hover:scale-110 transition-transform" />
                                    <span className="text-[0.6rem] font-black uppercase tracking-widest">Entrée</span>
                                </button>
                                <button
                                    onClick={() => setAction('OUT')}
                                    className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/40 text-rose-400 transition-all active:scale-95 group"
                                >
                                    <ArrowUpCircle size={24} className="group-hover:scale-110 transition-transform" />
                                    <span className="text-[0.6rem] font-black uppercase tracking-widest">Sortie</span>
                                </button>
                                <button
                                    onClick={() => setAction('LOCATION')}
                                    className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/40 text-blue-400 transition-all active:scale-95 group"
                                >
                                    <MapPin size={24} className="group-hover:scale-110 transition-transform" />
                                    <span className="text-[0.6rem] font-black uppercase tracking-widest">Mapping</span>
                                </button>
                            </div>
                        )}

                        {/* Qty form for IN/OUT */}
                        {(action === 'IN' || action === 'OUT') && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-4">
                                <div className={`text-center text-xs font-black uppercase tracking-widest py-2 rounded-xl ${
                                    action === 'IN' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                                }`}>
                                    {action === 'IN' ? '↓ Entrée de stock' : '↑ Sortie de stock'}
                                    {action === 'OUT' && <span className="text-slate-500 ml-2">(max: {found.quantity})</span>}
                                </div>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => setQty(q => Math.max(1, q - 1))}
                                        className="size-12 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xl font-black transition-all active:scale-95">
                                        −
                                    </button>
                                    <input
                                        type="number"
                                        min={1}
                                        max={action === 'OUT' ? found.quantity : 9999}
                                        value={qty}
                                        onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                                        className="flex-1 text-center bg-slate-950 border border-white/10 rounded-xl py-3 text-2xl font-black text-white focus:outline-none focus:border-violet-500/50"
                                    />
                                    <button onClick={() => setQty(q => action === 'OUT' ? Math.min(q + 1, found.quantity) : q + 1)}
                                        className="size-12 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xl font-black transition-all active:scale-95">
                                        +
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => { setAction(null); setQty(1); }}
                                        className="py-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-xs font-black uppercase tracking-widest transition-all hover:bg-white/10">
                                        Annuler
                                    </button>
                                    <button
                                        onClick={() => handleMovement(action)}
                                        disabled={busy}
                                        className={`py-3 rounded-xl text-white text-xs font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 ${
                                            action === 'IN' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
                                        }`}
                                    >
                                        {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                        Confirmer
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Location mapping form */}
                        {action === 'LOCATION' && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-4">
                                <div className="text-center text-xs font-black uppercase tracking-widest py-2 rounded-xl bg-blue-500/10 text-blue-400">
                                    📍 Modifier le rayon
                                </div>
                                <input
                                    type="text"
                                    value={locationInput}
                                    onChange={e => setLocationInput(e.target.value)}
                                    placeholder="Ex: Rayon A-12, Rayon B-05..."
                                    className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 px-4 text-sm font-bold text-white focus:outline-none focus:border-blue-500/50 transition-all"
                                />
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => setAction(null)}
                                        className="py-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all">
                                        Annuler
                                    </button>
                                    <button
                                        onClick={handleLocationUpdate}
                                        disabled={busy || !locationInput.trim()}
                                        className="py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {busy ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
                                        Mapper
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Empty state */}
                {!found && !notFound && !searching && (
                    <div className="azure-card p-10 flex flex-col items-center justify-center text-center gap-4">
                        <div className="size-16 rounded-3xl bg-slate-900 border border-white/5 flex items-center justify-center">
                            <ScanLine size={28} className="text-slate-700" />
                        </div>
                        <div>
                            <p className="text-sm font-black text-slate-500 uppercase tracking-widest">Prêt à scanner</p>
                            <p className="text-[0.65rem] text-slate-700 font-bold mt-1">
                                Saisissez une référence ou scannez un QR code
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Right panel — Log session ─────────────────────────────── */}
            <div className="lg:col-span-2 space-y-4">
                <div className="azure-card p-5 h-full flex flex-col">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
                        <div className="flex items-center gap-2">
                            <History size={14} className="text-slate-400" />
                            <span className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest">
                                Log session
                            </span>
                            {log.length > 0 && (
                                <span className="text-[0.55rem] font-black text-violet-400 bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded-md">
                                    {log.length}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {log.length > 0 && (
                                <>
                                    <button
                                        onClick={() => exportCSV(log)}
                                        title="Exporter CSV"
                                        className="size-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-500 hover:text-emerald-400 transition-all border border-white/5"
                                    >
                                        <Download size={12} />
                                    </button>
                                    <button
                                        onClick={() => setLog([])}
                                        title="Vider le log"
                                        className="size-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-500 hover:text-rose-400 transition-all border border-white/5"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 space-y-2 overflow-y-auto max-h-[520px] pr-1">
                        {log.length === 0 ? (
                            <div className="h-32 flex flex-col items-center justify-center text-slate-700 gap-2">
                                <History size={20} className="opacity-30" />
                                <span className="text-[0.6rem] font-bold uppercase tracking-widest italic">
                                    Aucune opération pour l'instant
                                </span>
                            </div>
                        ) : (
                            log.map(entry => (
                                <div key={entry.id}
                                    className={`p-3 rounded-xl border text-[0.65rem] font-bold flex items-start gap-3 animate-in fade-in duration-300 ${
                                        entry.success
                                            ? 'bg-white/5 border-white/5'
                                            : 'bg-rose-500/5 border-rose-500/20'
                                    }`}
                                >
                                    <div className={`size-6 rounded-lg flex items-center justify-center shrink-0 ${
                                        entry.type === 'IN' ? 'bg-emerald-500/15 text-emerald-400' :
                                        entry.type === 'OUT' ? 'bg-rose-500/15 text-rose-400' :
                                        'bg-blue-500/15 text-blue-400'
                                    }`}>
                                        {entry.type === 'IN' ? <ArrowDownCircle size={12} /> :
                                         entry.type === 'OUT' ? <ArrowUpCircle size={12} /> :
                                         <MapPin size={12} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-white font-black truncate">{entry.partName}</div>
                                        <div className="text-slate-500 mt-0.5">
                                            {entry.type === 'LOCATION'
                                                ? `→ ${entry.location}`
                                                : `${entry.type} × ${entry.quantity}`}
                                        </div>
                                    </div>
                                    <div className="text-slate-600 shrink-0 font-mono text-[0.55rem]">
                                        {entry.time}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
