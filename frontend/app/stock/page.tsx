'use client';
import { useState, useEffect } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { gmaoApi } from '../../services/api';
import { useToast } from '../../components/ui/toast';
import { StockItem } from './_components/types';
import SearchBar from './_components/SearchBar';
import SearchResults from './_components/SearchResults';
import InventoryTable from './_components/InventoryTable';
import StockStats from './_components/StockStats';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';

export default function StockPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<Array<StockItem & { score: number }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [userRole, setUserRole] = useState('');
  const { success, error: toastError } = useToast();

  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'name', direction: 'asc' });

  // REACTIVE STOCK FROM DB
  const rawStock = useLiveQuery(() => db.stock.toArray()) as StockItem[] | undefined;
  const allItems = rawStock || [];
  const isLoading = rawStock === undefined;

  // ── Fetch role from JWT ──
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const payload = JSON.parse(
            window.atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
          );
          setUserRole(payload.role ?? '');
        } catch { }
      }
    }
    
    const syncData = async () => {
      try {
        await gmaoApi.syncData();
      } catch (e) {}
    };
    syncData();
  }, []);

  // ── Debounced smart search ──
  useEffect(() => {
    const term = searchTerm.trim();
    if (!term) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const aiResults = await gmaoApi.searchStockAI(term);
        const formattedResults = aiResults.map((r: any) => ({
          ...r,
          score: r.search_score || r.score,
          reason: r.search_reason || r.reason
        }));
        setResults(formattedResults);
        setHasSearched(true);
      } catch (err) {
        console.error("Search failed", err);
      } finally {
        setIsSearching(false);
      }
    }, 400);
    
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedItems = [...allItems].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    
    let aValue = (a as any)[key];
    let bValue = (b as any)[key];

    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const canOrder = userRole === 'admin' || userRole === 'manager' || userRole === 'magasinier';

  const handleOrder = async (item: StockItem) => {
    const supplierInfo = window.prompt(`Contact fournisseur pour ${item.name} (Optionnel) :`, "");
    
    try {
      const res = await gmaoApi.orderStock(item.id, 1, supplierInfo || "");
      if (res.offline) {
        success('Mode Hors-Ligne', `${item.name} ajouté à la file de synchronisation.`);
      } else {
        success('Commande transmise', `Demande d'achat SAP créée pour ${item.name}`);
        await gmaoApi.getStock();
      }
    } catch {
      toastError('Échec de la commande', 'Vérifiez la connexion SAP ou vos droits');
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Header */}
      <header className="page-header px-2">
        <div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent tracking-tight">
            Stock Pièces
          </h1>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">
            Recherche Intelligente — Pièces de Rechange
          </p>
        </div>
        <div className="flex items-center gap-3">
          {(userRole === 'admin' || userRole === 'magasinier' || userRole === 'manager') && (
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
                    const res = await gmaoApi.syncStockFromSap();
                    await gmaoApi.syncImages(true); 
                    success('Synchronisation SAP ✅', 'Images (Base64) en cours de téléchargement... ⚙️');

                    let polls = 0;
                    const poll = setInterval(async () => {
                      try {
                        const freshStock = await gmaoApi.getStock();
                        if (freshStock && freshStock.length > 0) {
                          await db.stock.bulkPut(freshStock);
                        }
                      } catch (err) {
                        console.warn("Polling error:", err);
                      }
                      polls++;
                      if (polls >= 45) {
                        clearInterval(poll);
                        success('Images synchronisées ✅', 'Toutes les images sont à jour.');
                      }
                    }, 5000);
                  } catch (err: any) {
                    toastError('Erreur', 'Impossible de contacter le serveur backend');
                  }
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

      {/* Statistiques Logistiques */}
      {!hasSearched && (
        <div className="px-2">
          <StockStats items={allItems} />
        </div>
      )}

      {/* Barre de recherche */}
      <SearchBar
        searchTerm={searchTerm}
        isSearching={isSearching}
        hasSearched={hasSearched}
        onChange={setSearchTerm}
      />

      {/* Résultats ou inventaire complet */}
      {hasSearched ? (
        <SearchResults
          results={results}
          searchTerm={searchTerm}
          canOrder={canOrder}
          onOrder={handleOrder}
        />
      ) : (
        <InventoryTable
          items={sortedItems}
          isLoading={isLoading}
          canOrder={canOrder}
          onOrder={handleOrder}
          sortConfig={sortConfig}
          onSort={handleSort}
        />
      )}
    </div>
  );
}