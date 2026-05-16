'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { gmaoApi } from '@/services/api';
import { useToast } from '@/components/ui/toast';
import WorkOrdersHeader from './_components/WorkOrdersHeader';
import WorkOrdersStats from './_components/WorkOrdersStats';
import WorkOrdersFilters from './_components/WorkOrdersFilters';
import WorkOrdersTable from './_components/WorkOrdersTable';

type WOStatus = 'open' | 'in_progress' | 'done' | 'closed' | 'pending_deletion';
type WorkOrder = { id: number; sap_order_id: string; title: string; equipment_id: string; technician_id: number | null; priority: string; status: WOStatus; planned_start_date: string; created_by?: number; };

export default function WorkOrdersPage() {
    const router = useRouter();
    const { success, error: toastError } = useToast();
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [isUpdating, setIsUpdating] = useState<number | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [sortField, setSortField] = useState('id');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const currentUser = gmaoApi.getCurrentUser();
    const isManager = currentUser?.role === 'manager' || currentUser?.role === 'admin';
    const showSyncBtn = mounted && (isManager || currentUser?.role === 'technician');

    const orders = useLiveQuery(() => db.workOrders.toArray(), [], [] as WorkOrder[]) as WorkOrder[];

    useEffect(() => {
        setMounted(true);
        setLoading(true);
        gmaoApi.getWorkOrders().finally(() => setLoading(false));
    }, []);

    async function handleSyncSAP() {
        setIsSyncing(true);
        try {
            await gmaoApi.syncWorkOrdersFromSap();
            success('Synchronisation SAP réussie', 'Les ordres de travail ont été mis à jour.');
            await gmaoApi.getWorkOrders();
        } catch { toastError('Erreur de synchronisation', 'Impossible de joindre le serveur SAP.'); }
        finally { setIsSyncing(false); }
    }

    async function handleDelete(order: WorkOrder) {
        if (!confirm(isManager ? 'Supprimer définitivement cet OT ?' : 'Demander la suppression de votre OT ?')) return;
        setIsUpdating(order.id);
        try { await gmaoApi.deleteWorkOrder(order.id); }
        catch (err) { console.error('Delete failed', err); }
        finally { setIsUpdating(null); }
    }

    const formatDate = (dateStr: string | null) => {
        if (!dateStr || dateStr.startsWith('0001-01-01')) return 'Non planifié';
        try {
            const d = new Date(dateStr);
            return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
        } catch { return dateStr; }
    };

    const toggleSort = (field: string) => {
        if (sortField === field) setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
        else { setSortField(field); setSortOrder('asc'); }
    };

    const filtered = orders.filter(o => {
        const matchSearch = (o.title + (o.sap_order_id || '') + (o.equipment_id || '')).toLowerCase().includes(searchTerm.toLowerCase());
        return matchSearch && (statusFilter === 'all' || o.status === statusFilter);
    });

    const sorted = [...filtered].sort((a, b) => {
        const aVal = (a as any)[sortField], bVal = (b as any)[sortField];
        if (!aVal) return sortOrder === 'asc' ? -1 : 1;
        if (!bVal) return sortOrder === 'asc' ? 1 : -1;
        return aVal < bVal ? (sortOrder === 'asc' ? -1 : 1) : aVal > bVal ? (sortOrder === 'asc' ? 1 : -1) : 0;
    });

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <WorkOrdersHeader isSyncing={isSyncing} showSyncBtn={showSyncBtn} onSync={handleSyncSAP} />
            <WorkOrdersStats orders={orders} />
            <WorkOrdersFilters searchTerm={searchTerm} statusFilter={statusFilter} onSearch={setSearchTerm} onFilter={setStatusFilter} />
            <WorkOrdersTable
                orders={sorted} loading={loading} isUpdating={isUpdating}
                sortField={sortField} sortOrder={sortOrder}
                isManager={isManager} currentUserId={currentUser?.id}
                onSort={toggleSort} onDelete={handleDelete}
                onNavigate={id => router.push(`/work-orders/${id}`)}
                formatDate={formatDate}
            />
        </div>
    );
}
