'use client';
import { useState, useEffect } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { gmaoApi } from '../../services/api';
import { useToast } from '../../components/ui/toast';
import { StockItem } from './_components/types';
import { smartSearch } from './_components/smartSearch';
import SearchBar from './_components/SearchBar';
import SearchResults from './_components/SearchResults';
import InventoryTable from './_components/InventoryTable';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';

export default function StockPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<Array<StockItem & { score: number }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [userRole, setUserRole] = useState('');
  const { success, error: toastError } = useToast();

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
    
    // ✅ Synchronise automatiquement les données (et les images) au chargement de la page
    const syncData = async () => {
      try {
        await gmaoApi.syncData();
        const parts = await db.stock.toArray();
        await gmaoApi.cacheStockImages(parts);
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
    const timer = setTimeout(() => {
      // On ne lance la recherche que si on a des items
      if (allItems.length > 0) {
        setResults(smartSearch(term, allItems));
        setHasSearched(true);
      }
      setIsSearching(false);
    }, 400);
    
    return () => clearTimeout(timer);
  }, [searchTerm]); // 🚀 On ne dépend QUE du searchTerm pour éviter la boucle avec allItems

  const canOrder = userRole === 'admin' || userRole === 'manager' || userRole === 'magasinier';

  const handleOrder = async (item: StockItem) => {
    try {
      const res = await gmaoApi.orderStock(item.id, 1);
      if (res.offline) {
        success('Mode Hors-Ligne', `${item.name} ajouté à la file de synchronisation.`);
      } else {
        success('Commande transmise', `${item.name} — SAP confirmé`);
        await gmaoApi.getStock();
      }
    } catch {
      toastError('Échec de la commande', 'Vérifiez la connexion SAP');
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
            <button
              onClick={async () => {
                try {
                  // 1. Synchro SAP + images pour les nouvelles pièces
                  const res = await gmaoApi.syncStockFromSap();
                  // 2. Assigner les images aux pièces existantes en DB
                  await gmaoApi.syncImages();
                  success('Synchronisation SAP ✅', res.message || 'Articles synchronisés avec images');
                } catch (err: any) {
                  toastError('Erreur', 'Impossible de contacter le serveur backend');
                }
              }}
              className="group flex items-center gap-2 px-5 py-2.5 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 rounded-2xl text-[0.65rem] font-black text-blue-400 uppercase tracking-widest transition-all shadow-lg shadow-blue-500/5"
            >
              <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
              Synchroniser SAP
            </button>
          )}
          <div className="bg-gradient-to-r from-blue-600/10 to-indigo-600/10 border border-blue-500/20 px-5 py-2.5 rounded-2xl">
            <Sparkles size={18} className="text-blue-400" />
          </div>
        </div>
      </header>

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
          items={allItems}
          isLoading={isLoading}
          canOrder={canOrder}
          onOrder={handleOrder}
        />
      )}
    </div>
  );
}