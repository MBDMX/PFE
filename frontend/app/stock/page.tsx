'use client';
import { useState, useEffect } from 'react';
import { gmaoApi } from '../../services/api';
import { useToast } from '../../components/ui/toast';
import { StockItem } from './_components/types';
import SearchBar from './_components/SearchBar';
import SearchResults from './_components/SearchResults';
import InventoryTable from './_components/InventoryTable';
import StockStats from './_components/StockStats';
import StockHeader from './_components/StockHeader';
import OrderPanel from './_components/OrderPanel';
import TransferStockPanel from './_components/TransferStockPanel';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';

export default function StockPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<Array<StockItem & { score: number }>>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [userRole, setUserRole] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'name', direction: 'asc' });
    const { success, error: toastError } = useToast();

    // Panels state
    const [orderItem, setOrderItem] = useState<StockItem | null>(null);
    const [transferItem, setTransferItem] = useState<StockItem | null>(null);
    const [orderQty, setOrderQty] = useState(1);
    const [ordering, setOrdering] = useState(false);
    const [orderResult, setOrderResult] = useState<{ status: 'success' | 'pending'; message: string; sap_doc?: number } | null>(null);

    const rawStock = useLiveQuery(() => db.stock.toArray()) as StockItem[] | undefined;
    const allItems = rawStock || [];
    const isLoading = rawStock === undefined;

    // Decode JWT role
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const payload = JSON.parse(window.atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
                setUserRole(payload.role ?? '');
            } catch { }
        }
        gmaoApi.syncData().catch(() => { });
    }, []);

    // Debounced AI search
    useEffect(() => {
        const term = searchTerm.trim();
        if (!term) { setResults([]); setHasSearched(false); return; }
        setIsSearching(true);
        const timer = setTimeout(async () => {
            try {
                const aiResults = await gmaoApi.searchStockAI(term);
                setResults(aiResults.map((r: any) => ({ ...r, score: r.search_score || r.score, reason: r.search_reason || r.reason })));
                setHasSearched(true);
            } catch (err) { console.error('Search failed', err); }
            finally { setIsSearching(false); }
        }, 400);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handleSort = (key: string) => setSortConfig(prev => ({ key, direction: prev?.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));

    const sortedItems = [...allItems].sort((a, b) => {
        if (!sortConfig) return 0;
        const { key, direction } = sortConfig;
        const aV = (a as any)[key], bV = (b as any)[key];
        return aV < bV ? (direction === 'asc' ? -1 : 1) : aV > bV ? (direction === 'asc' ? 1 : -1) : 0;
    });

    const canOrder = userRole === 'admin' || userRole === 'manager' || userRole === 'magasinier';

    const openOrderPanel = (item: StockItem) => { setOrderItem(item); setOrderQty(Math.max(1, item.quantity <= 5 ? 10 : 5)); setOrderResult(null); };
    const closeOrderPanel = () => { setOrderItem(null); setOrderResult(null); setOrdering(false); };

    const handleOrder = async () => {
        if (!orderItem) return;
        setOrdering(true);
        try {
            const res = await gmaoApi.orderStock(orderItem.id, orderQty, '');
            setOrderResult({ status: res.synced === false ? 'pending' : 'success', message: res.message || 'Commande enregistrée', sap_doc: res.sap_doc });
        } catch {
            setOrderResult({ status: 'pending', message: '📋 Enregistré localement — SAP indisponible' });
        } finally { setOrdering(false); }
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <StockHeader userRole={userRole} />

            {!hasSearched && <div className="px-2"><StockStats items={allItems} /></div>}

            <SearchBar searchTerm={searchTerm} isSearching={isSearching} hasSearched={hasSearched} onChange={setSearchTerm} />

            {hasSearched ? (
                <SearchResults results={results} searchTerm={searchTerm} canOrder={canOrder} onOrder={openOrderPanel} />
            ) : (
                <InventoryTable items={sortedItems} isLoading={isLoading} canOrder={canOrder} onOrder={openOrderPanel} onTransfer={setTransferItem} sortConfig={sortConfig} onSort={handleSort} />
            )}

            {orderItem && (
                <OrderPanel item={orderItem} qty={orderQty} ordering={ordering} result={orderResult} onQtyChange={setOrderQty} onOrder={handleOrder} onClose={closeOrderPanel} />
            )}

            {transferItem && (
                <TransferStockPanel item={transferItem} onClose={() => setTransferItem(null)} />
            )}
        </div>
    );
}