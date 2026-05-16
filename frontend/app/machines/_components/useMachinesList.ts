'use client';
import { useState, useEffect } from 'react';
import api, { gmaoApi } from '@/services/api';

type Machine = {
    id: number; name: string; reference: string; location: string;
    status: 'operational' | 'maintenance' | 'breakdown'; health_score: number;
    last_maintenance_date?: string; next_maintenance_date?: string; maintenance_frequency_days?: number;
};

export function useMachinesList() {
    const [machines, setMachines] = useState<Machine[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
    const [machineOrders, setMachineOrders] = useState<any[]>([]);
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [triggeringMaintenance, setTriggeringMaintenance] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'name', direction: 'asc' });
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const fetchMachines = async () => {
        setLoading(true);
        try {
            const [data, mlRes] = await Promise.all([
                gmaoApi.getMachines(),
                api.get('/predictive/machine-health').catch(() => ({ data: { data: [] } }))
            ]);
            const mlScores = mlRes.data?.data || [];
            setMachines(data.map((m: Machine) => {
                const mlData = mlScores.find((s: any) => s.id === m.id);
                return { ...m, ml_score: mlData?.score, ml_risk: mlData?.risk, ml_reasons: mlData?.reasons || [] };
            }));
        } catch (err) {
            console.error('Erreur chargement machines:', err);
        } finally {
            setLoading(false);
        }
    };

    async function handleSyncSAP() {
        setIsSyncing(true);
        try {
            const res = await gmaoApi.syncMachinesFromSap();
            await fetchMachines();
            window.dispatchEvent(new CustomEvent('api:success', { detail: res.message || 'Synchronisation SAP terminée' }));
        } catch {
            window.dispatchEvent(new CustomEvent('api:error', { detail: 'Échec de la synchronisation SAP' }));
        } finally { setIsSyncing(false); }
    }

    async function handleSelectMachine(m: Machine) {
        setSelectedMachine(m);
        setLoadingOrders(true);
        try {
            setMachineOrders(await gmaoApi.getMachineWorkOrders(m.id));
        } catch (err) {
            console.error('Failed to fetch machine history', err);
        } finally { setLoadingOrders(false); }
    }

    async function handleTriggerMaintenance(m: Machine) {
        setTriggeringMaintenance(true);
        try {
            const res = await gmaoApi.triggerMaintenance(m.id);
            await fetchMachines();
            setMachineOrders(await gmaoApi.getMachineWorkOrders(m.id));
            const freshRes = await api.get('/machines');
            const freshMachine = freshRes.data.find((mac: Machine) => mac.id === m.id);
            if (freshMachine) setSelectedMachine(freshMachine);
            window.dispatchEvent(new CustomEvent('api:success', { detail: `OT préventif créé (${res.sap_order_id})` }));
        } catch (err) {
            console.error('Trigger maintenance failed', err);
        } finally { setTriggeringMaintenance(false); }
    }

    const handleSort = (key: string) => {
        setSortConfig(prev => ({ key, direction: prev?.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
    };

    const filteredMachines = machines.filter(m => {
        const matchSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) || m.reference.toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = statusFilter === 'all' || m.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const sortedMachines = [...filteredMachines].sort((a, b) => {
        if (!sortConfig) return 0;
        const { key, direction } = sortConfig;
        let aVal = (a as any)[key], bVal = (b as any)[key];
        if (key === 'ml_score') { aVal = (a as any).ml_score ?? a.health_score; bVal = (b as any).ml_score ?? b.health_score; }
        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        return 0;
    });

    useEffect(() => { fetchMachines(); }, []);

    return {
        sortedMachines, loading, selectedMachine, machineOrders, loadingOrders,
        triggeringMaintenance, isSyncing, sortConfig, searchTerm, statusFilter,
        setSearchTerm, setStatusFilter, setSelectedMachine,
        handleSyncSAP, handleSelectMachine, handleTriggerMaintenance, handleSort,
    };
}
