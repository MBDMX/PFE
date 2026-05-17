import { RefreshCw, Sparkles } from 'lucide-react';
import { gmaoApi } from '../../../services/api';
import { useToast } from '../../../components/ui/toast';
import { db } from '../../../lib/db';

interface Props {
    userRole: string;
}

export default function StockHeader({ userRole }: Props) {
    const { success, error: toastError } = useToast();
    const isPrivileged = userRole === 'admin' || userRole === 'magasinier' || userRole === 'manager';

    return (
        <header className="page-header px-2">
            <div>
                <h1 className="text-3xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent tracking-tight">Stock Pièces</h1>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Recherche Intelligente — Pièces de Rechange</p>
            </div>
            <div className="flex items-center gap-3">
                {isPrivileged && (
                    <div className="flex gap-2">
                        <button
                            onClick={async () => {
                                await db.stock.clear();
                                const fresh = await gmaoApi.getStock();
                                await db.stock.bulkPut(fresh);
                                success('Cache vidé 🧹', 'Les données locales ont été rafraîchies.');
                            }}
                            className="px-5 py-2.5 bg-slate-800/50 hover:bg-slate-700/50 border border-white/5 rounded-2xl text-[0.65rem] font-black text-slate-400 uppercase tracking-widest transition-all"
                        >
                            Vider Cache
                        </button>
                        <button
                            id="sync-sap-btn-stock"
                            onClick={async () => {
                                try {
                                    await gmaoApi.syncStockFromSap();
                                    await gmaoApi.syncImages(false);
                                    success('Synchronisation SAP ✅', 'Téléchargement et hébergement local des images manquantes... ⚙️');
                                    let polls = 0;
                                    const poll = setInterval(async () => {
                                        try {
                                            const freshStock = await gmaoApi.getStock();
                                            if (freshStock?.length > 0) await db.stock.bulkPut(freshStock);
                                        } catch (err) { console.warn('Polling error:', err); }
                                        if (++polls >= 45) { clearInterval(poll); success('Images synchronisées ✅', 'Toutes les images sont à jour.'); }
                                    }, 5000);
                                } catch { toastError('Erreur', 'Impossible de contacter le serveur backend'); }
                            }}
                            className="group flex items-center gap-2 px-5 py-2.5 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 rounded-2xl text-[0.65rem] font-black text-blue-400 uppercase tracking-widest transition-all shadow-lg shadow-blue-500/5"
                        >
                            <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                            Full Refresh SAP
                        </button>
                    </div>
                )}
                <div className="bg-gradient-to-r from-blue-600/10 to-indigo-600/10 border border-blue-500/20 px-5 py-2.5 rounded-2xl">
                    <Sparkles size={18} className="text-blue-400" />
                </div>
            </div>
        </header>
    );
}
