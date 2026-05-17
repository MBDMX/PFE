'use client'; // Indique à Next.js que ce fichier s'exécute côté navigateur (composant dynamique interactif)

import { useState, useEffect } from 'react'; // Gestion des états React et cycle de vie
import {
    ClipboardList, Wrench, Flame, Package,
    Bell, TrendingUp, User, CheckCircle, CalendarClock
} from 'lucide-react'; // Icônes visuelles élégantes
import api, { gmaoApi } from '../../../services/api';
// Importation des composants graphiques de pilotage du manager
import KPICard from './_components/KPICard'; // Petite carte de métrique clé (KPI)
import OTStatusChart from './_components/OTStatusChart'; // Graphique circulaire des statuts des interventions
import RecentOTTable from './_components/RecentOTTable'; // Tableau des bons de travail récents
import AlertsWidget from './_components/AlertsWidget'; // Widget d'alertes en temps réel
import ReliabilityWidget from './_components/ReliabilityWidget'; // Taux de fiabilité globale
import MLHealthWidget from './_components/MLHealthWidget'; // Diagnostic IA des pannes
import SapStatusWidget from './_components/SapStatusWidget'; // Statut de connexion OData du Service Layer SAP
import NotificationCenter from '../../../components/ui/NotificationCenter';
import { ManagerStats, WorkOrder } from './_components/types';

// Décoder de manière sécurisée les informations de l'utilisateur stockées dans son jeton JWT
function getUser() {
    if (typeof window === 'undefined') return { name: '', sub: '' };
    try {
        const t = localStorage.getItem('token');
        if (!t) return { name: '', sub: '' };
        // Décodage Base64
        return JSON.parse(window.atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    } catch { return { name: '', sub: '' }; }
}

import { useLiveQuery } from 'dexie-react-hooks'; // Se déclenche automatiquement si la base SQLite locale change
import { db } from '../../../lib/db'; // Base locale IndexedDB du navigateur

export default function ManagerDashboard() {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []); // S'assure que le composant est monté côté client

    const user = typeof window !== 'undefined' ? getUser() : { name: '', sub: '' };
    const displayName = mounted ? (user.name || user.sub || 'Responsable') : 'Responsable';

    // 📡 1. LECTURE EN TEMPS RÉEL DE LA BASE LOCAL INDEXEDDB (Dexie)
    // Même si le serveur tombe ou si internet coupe, ces requêtes répondent en 2 millisecondes !
    const wos = useLiveQuery(() => db.workOrders.toArray()) || [];
    const stockItems = useLiveQuery(() => db.stock.toArray()) || [];

    const [fetchedStats, setFetchedStats] = useState<ManagerStats | null>(null); // Statistiques reçues de l'API
    const [loading, setLoading] = useState(true); // Statut de chargement
    const [notifCount, setNotifCount] = useState(0); // Nombre de notifications

    // Polling réseau toutes les 5 secondes pour rafraîchir le compteur de notifications en arrière-plan
    useEffect(() => {
        const fetchCount = () => {
            const token = localStorage.getItem('token');
            if (token) {
                fetch(`http://${window.location.hostname}:5000/api/parts-requests/pending-count`, {
                    headers: { Authorization: `Bearer ${token}` }
                }).then(r => r.json()).then(d => { if (d.count !== undefined) setNotifCount(d.count); }).catch(() => { });
            }
        };
        fetchCount();
        const interval = setInterval(fetchCount, 5000);
        return () => clearInterval(interval);
    }, []);

    // Chargement initial des statistiques globales GMAO
    useEffect(() => {
        gmaoApi.getManagerStats().then(data => {
            setFetchedStats(data);
            setLoading(false);
        });
        gmaoApi.getWorkOrders().catch(() => { });
    }, []);

    // 🔄 2. SURCHARGE MÉMOIRE RÉACTIVE :
    // On combine les statistiques de l'API avec les comptes réels de notre base locale Dexie
    // Cela garantit un affichage instantané et mis à jour en direct lors des modifications hors-ligne
    const stats: ManagerStats | null = fetchedStats ? {
        ...fetchedStats,
        totalOT: wos.length,
        doneOT: wos.filter(o => o.status === 'done' || o.status === 'closed').length,
        openOT: wos.filter(o => o.status === 'open' || o.status === 'pending_approval').length,
        inProgressOT: wos.filter(o => o.status === 'in_progress').length,
        lowStock: stockItems.filter(i => (i.quantity || 0) <= 5).length,
    } : null;

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8 pb-10">

            {/* ── A. EN-TÊTE DU MANAGER AVEC NOTIFICATIONS ET SALUTATIONS ── */}
            <header className="page-header px-2">
                <div>
                    <h1 className="text-3xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent tracking-tight">
                        Bonjour, {displayName}
                    </h1>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">
                        GMAO Responsable — Vue d&apos;ensemble
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                        <div className="flex items-center gap-2 bg-slate-900 border border-white/5 px-3 py-1.5 rounded-xl">
                            <User size={12} className="text-violet-400" />
                            <span className="text-[0.65rem] font-bold text-slate-300 uppercase tracking-widest">
                                {displayName}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-violet-600/10 border border-violet-500/20 px-4 py-2 rounded-2xl">
                        <TrendingUp size={16} className="text-violet-400" />
                        <span className="text-[0.65rem] font-bold text-violet-400 uppercase tracking-widest">Responsable</span>
                    </div>
                    <NotificationCenter count={notifCount} role="manager" />
                </div>
            </header>

            {/* ── B. GRILLE DE CARTES KPI RÉACTIVES (STATISTIQUES COMPLÈTES) ── */}
            {loading ? (
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    {[1, 2, 3, 4, 5].map(i => <div key={i} className="azure-card h-28 animate-pulse" />)}
                </div>
            ) : stats ? (
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Carte OT Terminés */}
                    <KPICard
                        label="OT Terminés"
                        value={stats.doneOT}
                        sub={`${stats.totalOT} ordres au total`}
                        icon={CheckCircle}
                        color="emerald"
                        onClick={() => window.location.href = '/work-orders'}
                    />
                    {/* Carte OT En cours */}
                    <KPICard
                        label="En cours"
                        value={stats.inProgressOT}
                        sub={`${stats.openOT} en attente`}
                        icon={Wrench}
                        color="amber"
                        onClick={() => window.location.href = '/work-orders'}
                    />
                    {/* Carte OT Critiques */}
                    <KPICard
                        label="OT Critiques"
                        value={stats.criticalOT}
                        sub="Priorité maximale"
                        icon={Flame}
                        color="rose"
                        alert={stats.criticalOT > 0}
                        onClick={() => window.location.href = '/work-orders'}
                    />
                    {/* Carte Stock bas */}
                    <KPICard
                        label="Stock bas"
                        value={stats.lowStock}
                        sub="Pièces ≤ 5 unités"
                        icon={Package}
                        color="orange"
                        alert={stats.lowStock > 0}
                        onClick={() => window.location.href = '/stock'}
                    />
                    {/* Carte Maintenance Due (Machines en alerte) */}
                    <KPICard
                        label="Maint. Due"
                        value={stats.dueMaintenance}
                        sub="Machines à réviser"
                        icon={CalendarClock}
                        color="violet"
                        alert={stats.dueMaintenance > 0}
                        onClick={() => window.location.href = '/machines'}
                    />
                </div>
            ) : null}

            {/* ── C. SECTIONS GRAPHIQUES & WIDGETS D'ALERTES ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {stats && <OTStatusChart stats={stats} />} {/* Camembert des statuts */}
                <AlertsWidget workOrders={wos} lowStock={stats?.lowStock ?? 0} /> {/* Widget des alertes urgentes */}
            </div>

            {/* ── D. WIDGETS PRÉDICTIFS ML, FIABILITÉ ET ETAT DE SAP ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <MLHealthWidget /> {/* Statut général prédictif par IA */}
                <ReliabilityWidget /> {/* Indicateurs MTBF & Taux de panne moyen */}
                <SapStatusWidget /> {/* Santé de la connexion OData avec SAP Business One */}
            </div>

            {/* ── E. TABLEAU DE TOUS LES BONS DE TRAVAIL RÉCENTS ── */}
            <div className="grid grid-cols-1 gap-6">
                <RecentOTTable workOrders={wos} />
            </div>

        </div>
    );
}
