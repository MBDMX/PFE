'use client';
import { useState, useEffect } from 'react';
import { gmaoApi } from '../../../../services/api';
import { MagStats, PartsRequest, StockMovement } from './types';

// Components
import KpiCards from './KpiCards';
import PendingRequests from './PendingRequests';
import TopPieces from './TopPieces';
import RpaCard from './RpaCard';

export default function MagDashboard() {
    const [stats, setStats] = useState<MagStats | null>(null);
    const [requests, setRequests] = useState<PartsRequest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadAll = async () => {
            try {
                const [s, req] = await Promise.all([
                    gmaoApi.getMagasinierStats(),
                    gmaoApi.getPartsRequests(),
                ]);
                setStats(s);
                setRequests(req);
            } catch (err) {
                console.error('Dashboard load failed', err);
            } finally {
                setLoading(false);
            }
        };
        loadAll();
    }, []);

    if (loading) return (
        <div className="h-64 flex items-center justify-center text-slate-500 animate-pulse uppercase font-black text-xs tracking-widest">
            Initialisation du Dashboard Magasin...
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* KPIs — "Alertes stock" est cliquable → /dashboard/magasinier/alerts */}
            {stats && <KpiCards stats={stats} />}

            {/* Demandes en attente + Top pièces */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PendingRequests requests={requests} />
                <TopPieces movements={[]} />
            </div>

            {/* RPA Sync */}
            <RpaCard />
        </div>
    );
}