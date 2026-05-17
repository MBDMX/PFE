'use client'; // Exécution côté navigateur pour l'interactivité

import { useState, useEffect } from 'react'; // Gestion des états React et cycle de vie
import { Package } from 'lucide-react'; // Icône visuelle de colis pour la gestion des stocks
import { gmaoApi } from '../../services/api'; // Fonctions pour interagir avec le backend FastAPI
import { useToast } from '../../components/ui/toast'; // Système de toasts/notifications
import { StockItem } from './_components/types'; // Typage TypeScript de nos pièces détachées
// Importation des composants spécialisés
import SearchBar from './_components/SearchBar';
import SearchResults from './_components/SearchResults';
import InventoryTable from './_components/InventoryTable';
import StockStats from './_components/StockStats';
import StockHeader from './_components/StockHeader';
import OrderPanel from './_components/OrderPanel';
import TransferStockPanel from './_components/TransferStockPanel';
import { useLiveQuery } from 'dexie-react-hooks'; // Met à jour l'écran dès que Dexie local change
import { db } from '../../lib/db'; // Base locale IndexedDB du navigateur

export default function StockPage() {
    // ÉTATS REACT LOCAUX : Gèrent la recherche, le tri, le chargement et les fenêtres (panels)
    const [searchTerm, setSearchTerm] = useState(''); // Contenu du champ de recherche
    const [results, setResults] = useState<Array<StockItem & { score: number }>>([]); // Résultats de la recherche sémantique IA
    const [isSearching, setIsSearching] = useState(false); // Vrai pendant la recherche sémantique IA
    const [hasSearched, setHasSearched] = useState(false); // Vrai si une recherche a été effectuée
    const [userRole, setUserRole] = useState(''); // Rôle de l'utilisateur (magasinier, technicien, manager)
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'name', direction: 'asc' }); // Tri par défaut
    const { success, error: toastError } = useToast(); // Notifications rapides

    // ÉTATS DES PANNEAUX LATÉRAUX (Achat / Transfert inter-dépôts SAP)
    const [orderItem, setOrderItem] = useState<StockItem | null>(null); // Article en cours d'achat
    const [transferItem, setTransferItem] = useState<StockItem | null>(null); // Article en cours de transfert
    const [orderQty, setOrderQty] = useState(1); // Quantité d'achat choisie
    const [ordering, setOrdering] = useState(false); // Vrai si la requête d'achat SAP tourne
    const [orderResult, setOrderResult] = useState<{ status: 'success' | 'pending'; message: string; sap_doc?: number } | null>(null); // Résultat SAP

    // 📡 1. LECTURE DU CACHE DEXIE (Si hors-ligne, les pièces s'affichent instantanément !)
    const rawStock = useLiveQuery(() => db.stock.toArray()) as StockItem[] | undefined;
    const allItems = rawStock || [];
    const isLoading = rawStock === undefined; // Si indéfini, Dexie est en train de lire le disque

    // 🔐 2. DÉCODAGE DU RÔLE DEPUIS LE JWT (Détermine les droits d'achat SAP)
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                // Décodage de la partie payload du jeton JWT (Base64)
                const payload = JSON.parse(window.atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
                setUserRole(payload.role ?? '');
            } catch { }
        }
        // Lancement d'une synchronisation globale des données au démarrage de la page
        console.log("📦 Stock Page: Triggering global sync...");
        gmaoApi.syncData().then(() => {
            console.log("✅ Stock Page: Sync finished.");
        }).catch((err) => {
            console.error("❌ Stock Page: Sync failed:", err);
        });
    }, []);

    useEffect(() => {
        if (rawStock) {
            console.log(`📊 Stock Items in local DB: ${rawStock.length}`);
        }
    }, [rawStock]);

    // 🧠 3. RECHERCHE SÉMANTIQUE IA AVEC SYSTÈME ANTI-REBOND (Debounce de 400ms)
    // Évite d'appeler l'API à chaque lettre tapée si l'utilisateur écrit vite
    useEffect(() => {
        const term = searchTerm.trim();
        if (!term) { setResults([]); setHasSearched(false); return; }
        setIsSearching(true);
        const timer = setTimeout(async () => {
            try {
                // Interroge notre route FastAPI /search qui fait du NLP sémantique
                const aiResults = await gmaoApi.searchStockAI(term);
                setResults(aiResults.map((r: any) => ({ ...r, score: r.search_score || r.score, reason: r.search_reason || r.reason })));
                setHasSearched(true);
            } catch (err) { console.error('Search failed', err); }
            finally { setIsSearching(false); }
        }, 400); // 400ms d'attente
        return () => clearTimeout(timer); // Annule le timer si l'utilisateur retape une lettre avant les 400ms
    }, [searchTerm]);

    // Gère le clic de tri des colonnes
    const handleSort = (key: string) => setSortConfig(prev => ({ key, direction: prev?.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));

    // Tri des éléments en mémoire
    const sortedItems = [...allItems].sort((a, b) => {
        if (!sortConfig) return 0;
        const { key, direction } = sortConfig;
        const aV = (a as any)[key], bV = (b as any)[key];
        return aV < bV ? (direction === 'asc' ? -1 : 1) : aV > bV ? (direction === 'asc' ? 1 : -1) : 0;
    });

    // Autorisations d'achat
    const canOrder = userRole === 'admin' || userRole === 'manager' || userRole === 'magasinier';

    // Ouvre la fenêtre d'achat d'un article
    const openOrderPanel = (item: StockItem) => { setOrderItem(item); setOrderQty(Math.max(1, item.quantity <= 5 ? 10 : 5)); setOrderResult(null); };
    const closeOrderPanel = () => { setOrderItem(null); setOrderResult(null); setOrdering(false); };

    // 🛒 4. CRÉATION D'UNE DEMANDE D'ACHAT DANS SAP BUSINESS ONE
    const handleOrder = async () => {
        if (!orderItem) return;
        setOrdering(true);
        try {
            // Appelle FastAPI pour générer la Purchase Request (Demande d'achat)
            const res = await gmaoApi.orderStock(orderItem.id, orderQty, '');
            // Si la synchro directe échoue, c'est mis en file d'attente locale ( Dexie syncQueue )
            setOrderResult({ status: res.synced === false ? 'pending' : 'success', message: res.message || 'Commande enregistrée', sap_doc: res.sap_doc });
        } catch {
            setOrderResult({ status: 'pending', message: '📋 Enregistré localement — SAP indisponible' });
        } finally { setOrdering(false); }
    };

    return (
        // Conteneur animé en fondu vers le haut
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* A. En-tête de la page avec boutons rafraîchir / synchro */}
            <StockHeader userRole={userRole} />

            {/* B. Cartes d'indicateurs globaux de stock (n'apparaissent que si on ne recherche pas) */}
            {!hasSearched && <div className="px-2"><StockStats items={allItems} /></div>}

            {/* C. Barre de saisie de recherche (sémantique NLP IA intégrée) */}
            <SearchBar searchTerm={searchTerm} isSearching={isSearching} hasSearched={hasSearched} onChange={setSearchTerm} />

            {/* D. Affichage conditionnel des résultats */}
            {hasSearched ? (
                // Cas 1 : Résultats de la recherche sémantique IA
                <SearchResults results={results} searchTerm={searchTerm} canOrder={canOrder} onOrder={openOrderPanel} />
            ) : allItems.length === 0 && !isLoading ? (
                // Cas 2 : Base locale vide
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="size-20 rounded-full bg-blue-600/10 flex items-center justify-center text-blue-400 mb-6 border border-blue-500/20 animate-pulse">
                        <Package size={40} />
                    </div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter">Stock Local Vide</h3>
                    <p className="text-slate-500 text-sm mt-2 max-w-sm mx-auto font-medium">
                        Aucun article n'est synchronisé. Cliquez sur le bouton "Full Refresh SAP" en haut à droite pour importer les articles et leurs images SerpAPI.
                    </p>
                </div>
            ) : (
                // Cas 3 : Tableau d'inventaire classique
                <InventoryTable items={sortedItems} isLoading={isLoading} canOrder={canOrder} onOrder={openOrderPanel} onTransfer={setTransferItem} sortConfig={sortConfig} onSort={handleSort} />
            )}

            {/* 🚪 PANNEAU LATÉRAL : Achat de pièces SAP */}
            {orderItem && (
                <OrderPanel item={orderItem} qty={orderQty} ordering={ordering} result={orderResult} onQtyChange={setOrderQty} onOrder={handleOrder} onClose={closeOrderPanel} />
            )}

            {/* 🚪 PANNEAU LATÉRAL : Transfert inter-dépôts SAP */}
            {transferItem && (
                <TransferStockPanel item={transferItem} onClose={() => setTransferItem(null)} />
            )}
        </div>
    );
}