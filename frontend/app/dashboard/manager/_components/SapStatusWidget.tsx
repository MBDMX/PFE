'use client';
import { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw, Server, Database, Zap } from 'lucide-react';
import api from '../../../../services/api';

interface LayerStatus {
    status: 'connected' | 'disconnected' | 'checking';
    url?: string;
    company_db?: string;
    company_id?: string;
    engine?: string;
}

interface SapStatus {
    service_layer: LayerStatus;
    process_force: LayerStatus;
}

export default function SapStatusWidget() {
    const [status, setStatus] = useState<SapStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastCheck, setLastCheck] = useState<string>('');

    const fetchStatus = async () => {
        setLoading(true);
        try {
            const res = await api.get('/sap/status', { timeout: 20000 });
            setStatus(res.data);
            setLastCheck(new Date().toLocaleTimeString('fr-FR'));
        } catch {
            setStatus({
                service_layer: { status: 'disconnected', url: 'Inaccessible' },
                process_force: { status: 'disconnected', url: 'Inaccessible' },
            });
            setLastCheck(new Date().toLocaleTimeString('fr-FR'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 60000); // Re-check toutes les 60s
        return () => clearInterval(interval);
    }, []);

    const StatusDot = ({ ok }: { ok: boolean }) => (
        <span className={`inline-block size-2 rounded-full ${ok
            ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse'
            : 'bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'
        }`} />
    );

    const sl = status?.service_layer;
    const pf = status?.process_force;
    const slOk = sl?.status === 'connected';
    const pfOk = pf?.status === 'connected';

    return (
        <div className="azure-card p-5 flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={`size-8 rounded-lg flex items-center justify-center ${slOk && pfOk ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                        <Server size={16} />
                    </div>
                    <div>
                        <div className="text-[0.6rem] font-black text-slate-500 uppercase tracking-widest">Connexion SAP</div>
                        <div className="text-xs font-black text-white">SAP Business One</div>
                    </div>
                </div>
                <button
                    onClick={fetchStatus}
                    disabled={loading}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                    title="Tester maintenant"
                >
                    <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Layers Status */}
            <div className="space-y-2">
                {/* Service Layer */}
                <div className={`flex items-center justify-between p-3 rounded-xl border ${slOk ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
                    <div className="flex items-center gap-2.5">
                        <StatusDot ok={slOk} />
                        <div>
                            <div className="text-[0.6rem] font-black text-slate-500 uppercase tracking-widest">Service Layer · Port 50000</div>
                            <div className="text-xs font-bold text-white">Stock · Achats · Fournisseurs</div>
                        </div>
                    </div>
                    <div className={`text-[0.55rem] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${slOk ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'}`}>
                        {loading ? '...' : slOk ? 'OK' : 'KO'}
                    </div>
                </div>

                {/* ProcessForce */}
                <div className={`flex items-center justify-between p-3 rounded-xl border ${pfOk ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
                    <div className="flex items-center gap-2.5">
                        <StatusDot ok={pfOk} />
                        <div>
                            <div className="text-[0.6rem] font-black text-slate-500 uppercase tracking-widest">ProcessForce · Port 54001</div>
                            <div className="text-xs font-bold text-white">Machines · OTs · Maintenance</div>
                        </div>
                    </div>
                    <div className={`text-[0.55rem] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${pfOk ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'}`}>
                        {loading ? '...' : pfOk ? 'OK' : 'KO'}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-1 border-t border-white/5">
                <div className="flex items-center gap-1.5 text-slate-600">
                    <Zap size={10} />
                    <span className="text-[0.55rem] font-bold uppercase tracking-widest">
                        {slOk && pfOk ? 'Synchronisation active' : slOk || pfOk ? 'Partielle' : 'Mode Offline — Queue activée'}
                    </span>
                </div>
                {lastCheck && (
                    <span className="text-[0.5rem] font-bold text-slate-700 uppercase tracking-widest">
                        Vérifié à {lastCheck}
                    </span>
                )}
            </div>
        </div>
    );
}
