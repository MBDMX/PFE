import api from './api/base';
import { db } from '../lib/db';
import { handleGet } from './api/offline-helpers';
import { stockService } from './api/stock.service';
import { workOrdersService } from './api/work-orders.service';
import { machinesService } from './api/machines.service';
import { managerService } from './api/manager.service';
import { authService } from './api/auth.service';
import { systemService } from './api/system.service';

export { api };

// ────────────────────────────────────────────
// Synchronization Logic
// ────────────────────────────────────────────

async function processSyncQueue(force: boolean = false) {
    if (typeof window === 'undefined') return;
    const queue = await db.syncQueue.filter(a => a.status === 'pending' || (force && a.status === 'error')).toArray();
    if (queue.length === 0) return;

    for (const action of queue) {
        try {
            const INTERNAL_KEYS = ['offline', '_stock_updates', 'created_at', 'updated_at', 'sap_order_id', 'technician', 'machine'];
            const cleanPayload = { ...action.payload };
            INTERNAL_KEYS.forEach(key => delete (cleanPayload as any)[key]);

            if (action.method === 'POST') await api.post(action.endpoint, cleanPayload);
            else if (action.method === 'PATCH') await api.patch(action.endpoint, cleanPayload);
            else if (action.method === 'DELETE') await api.delete(action.endpoint);
            
            await db.syncQueue.delete(action.id!);
        } catch (err: any) {
            const detail = err.response?.data?.detail;
            await db.syncQueue.update(action.id!, { 
                status: 'error', 
                errorMessage: Array.isArray(detail) ? detail.map((d:any) => d.msg).join(', ') : (detail || err.message)
            });
        }
    }
}

async function syncMasterData() {
    if (typeof window === 'undefined' || !localStorage.getItem('token')) return;
    console.log('🔄 Syncing master data to local cache...');
    await Promise.allSettled([
        handleGet('/machines', db.machines),
        handleGet('/stock', db.stock),
        handleGet('/technicians', db.technicians),
        handleGet('/work-orders', db.workOrders)
    ]);
    console.log('✅ Master data sync complete.');
}

// ────────────────────────────────────────────
// GMAO API CENTRAL HUB (Combined Services)
// ────────────────────────────────────────────

export const gmaoApi = {
    ...stockService,
    ...workOrdersService,
    ...machinesService,
    ...managerService,
    ...authService,
    ...systemService,

    get: (url: string) => handleGet(url),
    syncData: async function() {
        console.log("🚀 Forced Data Sync Started...");
        await processSyncQueue(true);
        await syncMasterData();
    }
};

export default api;
