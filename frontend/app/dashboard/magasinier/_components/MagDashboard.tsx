'use client';
import { useState, useEffect } from 'react';
import { gmaoApi } from '../../../../services/api';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../../lib/db';

// Components
import KpiCards from './KpiCards';
import PendingRequests from './PendingRequests';
import TopPieces from './TopPieces';
import RpaCard from './RpaCard';

export default function MagDashboard() {
    // ✅ REACTIVE: Auto-update on DB changes
    const d_requests = useLiveQuery(() => db.partsRequests?.toArray() || []) || [];
    const stockItems = useLiveQuery(() => db.stock.toArray()) || [];
    
    const [fetchedStats, setFetchedStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadAll = async () => {
            try {
                const data = await gmaoApi.getMagasinierStats();
                setFetchedStats(data);
            } catch (err) {
                console.error('Stats load failed', err);
            } finally {
                setLoading(false);
            }
        };
        loadAll();
    }, []);

    // Reactive computation for basic stats
    const stats = fetchedStats ? {
        ...fetchedStats,
        critical_stock_alerts: stockItems.filter(i => (i.quantity || 0) < 5).length,
        pending_requests: d_requests.filter(r => r.status === 'pending').length,
    } : null;

    if (loading) return (
        <div className="h-64 flex items-center justify-center text-slate-500 animate-pulse uppercase font-black text-xs tracking-widest text-center">
            Initialisation du Dashboard Magasin...
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* KPIs — "Alertes stock" est cliquable → /dashboard/magasinier/alerts */}
            {stats && <KpiCards stats={stats} />}

            {/* Demandes en attente + Top pièces */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PendingRequests requests={d_requests} />
                <TopPieces movements={[]} />
            </div>

            {/* RPA Sync */}
            <RpaCard />
        </div>
    );
}