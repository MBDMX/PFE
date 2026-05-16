import { RefreshCw } from 'lucide-react';

interface Props {
    isSyncing: boolean;
    onSync: () => void;
}

export default function MachinesHeader({ isSyncing, onSync }: Props) {
    return (
        <header className="page-header px-2 flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent tracking-tight">Parc Machines</h1>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Inventaire et État de Santé des Équipements (Source SAP)</p>
            </div>
            <button
                id="sync-sap-btn"
                onClick={onSync}
                disabled={isSyncing}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-blue-500/30 text-white font-black uppercase text-xs tracking-widest transition-all group disabled:opacity-50"
            >
                <RefreshCw size={16} className={isSyncing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} />
                {isSyncing ? 'Synchronisation...' : 'Synchroniser SAP'}
            </button>
        </header>
    );
}
