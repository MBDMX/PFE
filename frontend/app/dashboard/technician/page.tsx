'use client'; // Indique à Next.js que ce fichier s'exécute côté navigateur (composant dynamique interactif)

import { useState, useEffect } from 'react'; // Gestion des états React et cycle de vie
import {
    CheckCircle, AlertTriangle, Wrench,
    Loader2, Bell, Timer, User
} from 'lucide-react'; // Icônes vectorielles Lucide
import { gmaoApi } from '../../../services/api';
import { useToast } from '../../../components/ui/toast';
import { WorkOrder, isOverdue } from './_components/types';
// Importation des widgets spécifiques du technicien
import KPICard from './_components/KPICard'; // Petite carte de métriques clés
import CalendarWidget from './_components/CalendarWidget'; // Calendrier des interventions planifiées
import Top5Widget from './_components/Top5Widget'; // Top 5 des ordres les plus urgents
import NotificationCenter from '../../../components/ui/NotificationCenter';

import { useLiveQuery } from 'dexie-react-hooks'; // Se déclenche automatiquement si la base local change
import { db } from '../../../lib/db'; // Base locale IndexedDB du navigateur

export default function TechnicianDashboard() {
    const [userName, setUserName] = useState(''); // Nom du technicien connecté
    const [userId, setUserId] = useState(''); // Identifiant du technicien

    // 📡 1. LECTURE DE LA BASE LOCAL INDEXEDDB (Dexie)
    // Rend le tableau de bord ultra-rapide (PWA offline ready)
    const workOrders = useLiveQuery(() => db.workOrders.toArray()) || [];
    const isLoading = useLiveQuery(() => db.workOrders.count()) === undefined;
    const [notifCount, setNotifCount] = useState(0); // Nombre de notifications de pièces validées
    const [techKpis, setTechKpis] = useState<any>(null); // Indicateurs de performance du technicien (KPIs backend)

    useEffect(() => {
        const fetchCount = () => {
            const token = localStorage.getItem('token');
            if (token) {
                // Requête HTTP GET vers FastAPI pour compter les notifications non lues
                gmaoApi.get('/parts-requests/pending-count')
                    .then(d => { if (d.count !== undefined) setNotifCount(d.count); })
                    .catch(() => { });
            }
        };
        
        // 🔔 2. ÉCOUTeur D'ÉVÉNEMENTS WEBSOCKET EN DIRECT (Temps Réel)
        // Permet d'incrémenter le badge rouge de notification instantanément sans rafraîchir la page
        const handleNewNotif = () => setNotifCount(prev => prev + 1);
        window.addEventListener('gmao:notification', handleNewNotif);
        
        fetchCount();
        return () => window.removeEventListener('gmao:notification', handleNewNotif);
    }, []);

    // 🔐 3. DÉCODAGE DU JETON JWT ET CHARGEMENT DES COMPTEURS MÈTIERS
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    // Récupération des infos cryptées dans la charge utile (payload) du jeton JWT
                    const payload = JSON.parse(
                        window.atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
                    );
                    setUserName(payload.name || payload.username || '');
                    setUserId(String(payload.id || payload.sub || ''));
                } catch { }
            }
        }
        // Lancement en arrière-plan du rafraîchissement des ordres de travail
        gmaoApi.getWorkOrders().catch(() => { });

        // Appel de l'API FastAPI pour charger les KPI de réactivité du technicien
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const payload = JSON.parse(window.atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
                    const tid = payload.id || payload.sub;
                    if (tid) {
                        gmaoApi.get(`/technician-stats/${tid}`)
                            .then(setTechKpis)
                            .catch(err => console.error("Error fetching tech KPIs:", err));
                    }
                } catch {}
            }
        }
    }, []);

    // 📊 4. STATISTIQUES RÉACTIVES EN LOCAL
    const total = workOrders.length;
    const finished = workOrders.filter(o => o.status === 'done' || o.status === 'closed').length;
    const resolutionRate = total > 0 ? Math.round((finished / total) * 100) : 0;
    const overdueCount = workOrders.filter(o => isOverdue(o.due_date, o.status)).length; // Compte le nombre d'OT en retard

    // Calcul du temps moyen mis par le technicien pour clore une tâche
    const closedWithDates = workOrders.filter(
        o => (o.status === 'done' || o.status === 'closed') && o.closed_at && o.created_at
    );
    const avgHours = closedWithDates.length > 0
        ? (closedWithDates.reduce((sum, o) => {
            return sum + (new Date(o.closed_at!).getTime() - new Date(o.created_at!).getTime()) / 3600000;
        }, 0) / closedWithDates.length).toFixed(1)
        : '—';

    // Formate proprement la durée en minutes ou en heures pour l'affichage
    const formatDuration = (hours: number) => {
        if (!hours || hours <= 0) return '—';
        if (hours < 1) {
            const mins = Math.round(hours * 60);
            return `${mins}mn`;
        }
        return `${hours.toFixed(1)}h`;
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8 pb-10">

            {/* ── A. EN-TÊTE DU TECHNICIEN CONNECTÉ ── */}
            <header className="page-header px-2">
                <div>
                    <h1 className="text-3xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent tracking-tight">
                        {userName ? `Bonjour, ${userName}` : 'Tableau de bord'}
                    </h1>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">
                        GMAO Technicien — Accès direct
                    </p>

                    {/* Badge affichant le nom et l'ID unique de l'utilisateur pour le jury */}
                    {(userName || userId) && (
                        <div className="flex items-center gap-2 mt-3">
                            <div className="flex items-center gap-2 bg-slate-900 border border-white/5 px-3 py-1.5 rounded-xl">
                                <User size={12} className="text-blue-400" />
                                <span className="text-[0.65rem] font-bold text-slate-300 uppercase tracking-widest">
                                    {userName}
                                </span>
                                {userId && (
                                    <>
                                        <span className="text-slate-600">·</span>
                                        <span className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest font-mono">
                                            ID {userId}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-blue-600/10 border border-blue-500/20 px-4 py-2 rounded-2xl">
                        <Wrench size={16} className="text-blue-400" />
                        <span className="text-[0.65rem] font-bold text-blue-400 uppercase tracking-widest">Technicien</span>
                    </div>
                    <NotificationCenter count={notifCount} role="technician" />
                </div>
            </header>

            {/* ── B. GRILLE DE CARTES KPI DE FIABILITÉ ET RÉACTIVITÉ ── */}
            {isLoading || !techKpis || Array.isArray(techKpis) ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="azure-card p-5 h-28 animate-pulse bg-slate-900/60" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* KPI 1 : Réactivité (temps moyen de prise en charge d'un bon de travail) */}
                    <KPICard 
                        label="Réactivité" 
                        value={formatDuration(techKpis?.avg_intervention_delay_hours)} 
                        sub="Cible : < 4h (Prise en charge)" 
                        color="emerald" 
                        icon={CheckCircle} 
                    />
                    {/* KPI 2 : Nombre d'OT complétés par ce technicien */}
                    <KPICard 
                        label="OT Complétés" 
                        value={techKpis?.closed_work_orders ?? 0} 
                        sub={`${techKpis?.completion_rate ?? 0}% du total assigné`} 
                        color="rose" 
                        icon={AlertTriangle} 
                    />
                    {/* KPI 3 : Temps moyen passé par intervention de réparation */}
                    <KPICard 
                        label="Délai moyen" 
                        value={formatDuration(techKpis?.avg_time_spent_hours)} 
                        sub="Cible : < 4h (Temps de réparation)" 
                        color="blue" 
                        icon={Timer} 
                    />
                </div>
            )}

            {/* ── C. WIDGETS DU CALENDRIER ET LE TOP 5 DES URGENCES DU TECHNICIEN ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CalendarWidget workOrders={workOrders} /> {/* Vue mensuelle interactive des pannes à traiter */}
                <Top5Widget workOrders={workOrders} /> {/* Les 5 plus urgentes avec statut 'open' ou 'in_progress' */}
            </div>

        </div>
    );
}