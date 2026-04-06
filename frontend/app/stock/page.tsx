'use client';
import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { gmaoApi } from '../../services/api';
import { useToast } from '../../components/ui/toast';
import { StockItem } from './_components/types';
import { smartSearch } from './_components/smartSearch';
import SearchBar from './_components/SearchBar';
import SearchResults from './_components/SearchResults';
import InventoryTable from './_components/InventoryTable';

export default function StockPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<Array<StockItem & { score: number }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [allItems, setAllItems] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState('');
  const { success, error: toastError } = useToast();

  // ── Fetch stock + role from JWT ──
  useEffect(() => {
    const fetchStock = async () => {
      try {
        const data = await gmaoApi.getStock();
        setAllItems(data);
      } catch (e) {
        console.error('Failed to fetch stock', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStock();

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
  }, []);

  // ── Debounced smart search ──
  useEffect(() => {
    if (!searchTerm.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(() => {
      setResults(smartSearch(searchTerm, allItems));
      setHasSearched(true);
      setIsSearching(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm, allItems]);

  const canOrder = userRole === 'admin' || userRole === 'manager' || userRole === 'magasinier';

  const handleOrder = async (item: StockItem) => {
    try {
      const res = await gmaoApi.orderStock(item.id, 1);
      if (res.offline) {
        success('Mode Hors-Ligne', `${item.name} ajouté à la file de synchronisation.`);
      } else {
        success('Commande transmise', `${item.name} — SAP confirmé`);
        const data = await gmaoApi.getStock();
        setAllItems(data);
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
        <div className="flex items-center gap-3 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 border border-blue-500/20 px-5 py-2.5 rounded-2xl">
          <Sparkles size={18} className="text-blue-400" />
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