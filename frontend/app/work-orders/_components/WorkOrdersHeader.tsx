import { Plus, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Props {
    isSyncing: boolean;
    showSyncBtn: boolean;
    onSync: () => void;
}

export default function WorkOrdersHeader({ isSyncing, showSyncBtn, onSync }: Props) {
    const router = useRouter();
    return (
        <header className="page-header px-2">
            <div>
                <h1 className="text-3xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent tracking-tight">Ordre de travail</h1>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Gestion des Ordres de Travail et Maintenance</p>
            </div>
            <div className="flex gap-3">
                {showSyncBtn && (
                    <button onClick={onSync} disabled={isSyncing} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-blue-500/30 text-white font-black uppercase text-xs tracking-widest transition-all group disabled:opacity-50">
                        <RefreshCw size={16} className={isSyncing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} />
                        {isSyncing ? 'En cours...' : 'Synchroniser SAP'}
                    </button>
                )}
                <button id="create-wo-btn" onClick={() => router.push('/work-orders/new')} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-blue-600/20 transition-all hover:scale-105 active:scale-95">
                    <Plus size={20} strokeWidth={3} />
                    <span>Nouvel OT</span>
                </button>
            </div>
        </header>
    );
}
