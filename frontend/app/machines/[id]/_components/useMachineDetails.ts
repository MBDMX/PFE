import { useState, useEffect } from 'react';
import api, { gmaoApi } from '@/services/api';

export function useMachineDetails(id: string | string[]) {
    const machineId = Number(id);
    const [machine, setMachine] = useState<any>(null);
    const [orders, setOrders] = useState<any[]>([]);
    const [mlData, setMlData] = useState<any>(null);
    const [modelStats, setModelStats] = useState<any>(null);
    const [financials, setFinancials] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [triggering, setTriggering] = useState(false);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [mList, oRes, mlRes, statsRes, finRes] = await Promise.all([
                gmaoApi.getMachines(),
                gmaoApi.getMachineWorkOrders(machineId),
                api.get('/predictive/machine-health'),
                api.get('/predictive/model-stats').catch(() => ({ data: null })),
                gmaoApi.getMachineFinancials(machineId).catch(() => ({ data: null }))
            ]);
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

    async function handleTriggerMaintenance() {
        if (!machine) return;
        setTriggering(true);
        try {
            const res = await gmaoApi.triggerMaintenance(machine.id);
            await fetchAll();
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

    /** Calcule la date d'intervention recommandée par le modèle ML.
     *  Logique : Aujourd'hui + (MTBF - jours écoulés depuis dernière panne) - marge sécurité (20%).
     *  Résultat négatif → intervention IMMÉDIATE. */
    const getMlRecommendedDate = (): { date: Date | null; isOverdue: boolean; daysUntil: number } => {
        if (!mlData?.mtbf_days) return { date: null, isOverdue: false, daysUntil: 0 };

        const lastBreakdown = orders
            .filter((o: any) => o.type === 'breakdown' || o.type === 'corrective')
            .sort((a: any, b: any) => new Date(b.planned_start_date || 0).getTime() - new Date(a.planned_start_date || 0).getTime())[0];

        const now = new Date();
        const mtbf = mlData.mtbf_days;
        const safetyMargin = Math.max(1, Math.round(mtbf * 0.2));

        let daysUntilNextFailure: number;
        if (lastBreakdown?.planned_start_date) {
            const lastDate = new Date(lastBreakdown.planned_start_date);
            const daysSinceLast = (now.getTime() - lastDate.getTime()) / (24 * 3600 * 1000);
            daysUntilNextFailure = mtbf - daysSinceLast;
        } else {
            daysUntilNextFailure = mtbf;
        }

        const daysUntilIntervention = daysUntilNextFailure - safetyMargin;
        const recommendedDate = new Date(now.getTime() + daysUntilIntervention * 24 * 3600 * 1000);
        const isOverdue = daysUntilIntervention <= 0;

        return { date: recommendedDate, isOverdue, daysUntil: Math.round(daysUntilIntervention) };
    };

    useEffect(() => {
        if (id) fetchAll();
    }, [id]);

    return {
        machine, orders, mlData, modelStats, financials,
        loading, triggering,
        fetchAll, handleTriggerMaintenance, getMlRecommendedDate
    };
}
