import { useState, useEffect } from 'react'; // React hooks standard d'état et d'effets
import api, { gmaoApi } from '@/services/api'; // Services de communication avec nos API REST backend

// Centralise la logique de récupération et de traitement pour la page de détail d'une machine
export function useMachineDetails(id: string | string[]) {
    const machineId = Number(id); // Conversion de l'identifiant URL en nombre
    
    // États React locaux pour stocker toutes les statistiques de la machine
    const [machine, setMachine] = useState<any>(null); // Infos SAP brutes
    const [orders, setOrders] = useState<any[]>([]); // Liste de tous les OTs passés ou programmés
    const [mlData, setMlData] = useState<any>(null); // Analyse prédictive ML (probabilité de panne, SHAP)
    const [modelStats, setModelStats] = useState<any>(null); // Précision globale de l'algorithme (F1-Score, ROC AUC)
    const [financials, setFinancials] = useState<any>(null); // Données financières SAP (coûts cumulés)
    const [loading, setLoading] = useState(true); // Vrai tant qu'on charge les données
    const [triggering, setTriggering] = useState(false); // Vrai pendant la création d'un OT préventif dans SAP

    // 📡 1. TÉLÉCHARGEMENT DE TOUTES LES DONNÉES EN PARALLÈLE (Optimisation de bande passante)
    const fetchAll = async () => {
        setLoading(true);
        try {
            // Promise.all permet d'exécuter 5 requêtes API simultanément pour que l'affichage soit super rapide !
            const [mList, oRes, mlRes, statsRes, finRes] = await Promise.all([
                gmaoApi.getMachines(), // Liste des machines
                gmaoApi.getMachineWorkOrders(machineId), // Liste des OTs de la machine
                api.get('/predictive/machine-health'), // Score de santé prédictif IA
                api.get('/predictive/model-stats').catch(() => ({ data: null })), // Stats globales du modèle ML
                gmaoApi.getMachineFinancials(machineId).catch(() => ({ data: null })) // Coût financier SAP
            ]);
            
            // Assignation des résultats dans nos états locaux
            setMachine(mList.find((m: any) => m.id === machineId));
            setOrders(oRes);
            setMlData(mlRes.data?.data?.find((m: any) => m.id === machineId));
            setModelStats(statsRes.data?.model);
            setFinancials(finRes);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // ⚡ 2. PLANIFICATION ET DÉCLENCHEMENT D'UN PLAN PRÉVENTIF DIRECT DANS SAP
    async function handleTriggerMaintenance() {
        if (!machine) return;
        setTriggering(true);
        try {
            // Appelle le backend FastAPI qui va à son tour envoyer l'ordre de travail à SAP B1
            const res = await gmaoApi.triggerMaintenance(machine.id);
            await fetchAll(); // Recharge toutes les données à jour
            // Envoi d'une notification de succès personnalisée
            window.dispatchEvent(new CustomEvent('api:success', {
                detail: `OT préventif créé avec succès (${res.sap_order_id})`
            }));
        } catch (err) {
            console.error('Trigger maintenance failed', err);
            window.dispatchEvent(new CustomEvent('api:error', { detail: 'Échec du déclenchement SAP' }));
        } finally {
            setTriggering(false);
        }
    }

    // 📅 3. FORMULE MATHÉMATIQUE DE PRÉDICTION IA (Date idéale d'intervention recommandée)
    // Logique : Aujourd'hui + (MTBF - jours écoulés depuis dernière panne) - marge sécurité (20%).
    // Un résultat de jours négatif signifie que la machine a dépassé la date idéale de révision !
    const getMlRecommendedDate = (): { date: Date | null; isOverdue: boolean; daysUntil: number } => {
        if (!mlData?.mtbf_days) return { date: null, isOverdue: false, daysUntil: 0 };

        // Étape A : Trouver le tout dernier ordre curatif ou de panne sur cette machine
        const lastBreakdown = orders
            .filter((o: any) => o.type === 'breakdown' || o.type === 'corrective')
            .sort((a: any, b: any) => new Date(b.planned_start_date || 0).getTime() - new Date(a.planned_start_date || 0).getTime())[0];

        const now = new Date();
        const mtbf = mlData.mtbf_days; // MTBF prédit en jours par l'IA
        const safetyMargin = Math.max(1, Math.round(mtbf * 0.2)); // Marge de sécurité de 20% pour éviter la panne à tout prix !

        let daysUntilNextFailure: number;
        if (lastBreakdown?.planned_start_date) {
            const lastDate = new Date(lastBreakdown.planned_start_date);
            // Calcule le nombre de jours écoulés depuis cette dernière panne
            const daysSinceLast = (now.getTime() - lastDate.getTime()) / (24 * 3600 * 1000);
            daysUntilNextFailure = mtbf - daysSinceLast;
        } else {
            daysUntilNextFailure = mtbf; // Si aucune panne passée, on se base directement sur le MTBF global
        }

        // Étape B : Calculer la date limite d'intervention en soustrayant notre marge de sécurité
        const daysUntilIntervention = daysUntilNextFailure - safetyMargin;
        const recommendedDate = new Date(now.getTime() + daysUntilIntervention * 24 * 3600 * 1000);
        const isOverdue = daysUntilIntervention <= 0; // Vrai si le délai est expiré

        return { date: recommendedDate, isOverdue, daysUntil: Math.round(daysUntilIntervention) };
    };

    // Démarre la lecture des données à chaque changement de machine
    useEffect(() => {
        if (id) fetchAll();
    }, [id]);

    // Expose toutes nos variables au composant de page.tsx
    return {
        machine, orders, mlData, modelStats, financials,
        loading, triggering,
        fetchAll, handleTriggerMaintenance, getMlRecommendedDate
    };
}
