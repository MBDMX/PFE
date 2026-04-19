import axios from 'axios';
import { db, type OfflineAction } from '../lib/db';

const apiBaseUrl = typeof window !== 'undefined'
    ? `http://${window.location.hostname}:5000/api`
    : 'http://localhost:5000/api';

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL || apiBaseUrl });

api.interceptors.request.use(cfg => {
    const token = localStorage.getItem('token');
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
    return cfg;
});

// Global Error Interceptor
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (typeof window !== 'undefined' && error.response) {
            const status = error.response.status;
            let message = error.response.data?.detail || "Une erreur est survenue côté serveur.";
            if (Array.isArray(message)) message = message.map((err: any) => err.msg).join(', ');

            // Handle 401 Unauthorized globally
            if (status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                if (!window.location.pathname.includes('/login')) {
                    window.location.href = '/login';
                }
            }

            if (status >= 400) {
                const event = new CustomEvent('api:error', { detail: message });
                window.dispatchEvent(event);
            }
        }
        return Promise.reject(error);
    }
);

// ────────────────────────────────────────────
// Offline Wrapper Helpers
// ────────────────────────────────────────────

async function handleGet(endpoint: string, table?: any) {
    const isOnline = typeof window !== 'undefined' && navigator.onLine;
    const url = endpoint.includes('?') ? `${endpoint}&t=${Date.now()}` : `${endpoint}?t=${Date.now()}`;

    // 1. ONLINE: Network-First
    if (isOnline) {
        try {
            const res = await api.get(url);
            if (table && Array.isArray(res.data)) {
                // SYNC DATA: Update existing, add new, remove deleted
                await db.transaction('rw', table, async () => {
                    const freshData = res.data;
                    const freshIds = freshData.map((x: any) => x.id).filter(Boolean);
                    
                    // Prune deleted items
                    const allKeys = await table.toCollection().primaryKeys();
                    const keysToDelete = allKeys.filter((k: any) => !freshIds.includes(k));
                    if (keysToDelete.length > 0) await table.bulkDelete(keysToDelete);
                    
                    // Update/Add
                    await table.bulkPut(freshData);
                });
            }
            return res.data;
        } catch (err) {
            console.warn(`GET ${endpoint} failed, falling back to cache...`, err);
            // Fall through to cache
        }
    }

    // 2. OFFLINE (or failed Online): Cache-First
    if (table) {
        const localData = await table.toArray();
        if (localData.length > 0) return localData;
    }

    return isOnline ? [] : []; // Fallback
}

async function handlePost(endpoint: string, data: any, actionType: OfflineAction['type']) {
    const isOnline = typeof window !== 'undefined' && navigator.onLine;

    // ONLINE: try to send directly — only queue on failure
    if (isOnline) {
        try {
            const res = await api.post(endpoint, data);
            const postResult = res.data;

            // ✅ Async cache refresh — do NOT let this failure affect the POST result
            if (endpoint.includes('/work-orders/') && endpoint.endsWith('/parts')) {
                const woId = parseInt(endpoint.split('/work-orders/')[1]);
                if (!isNaN(woId)) {
                    // Fire and forget — silently refresh cache in background
                    (async () => {
                        try {
                            const timestamp = Date.now();
                            const [updatedWO, updatedStock] = await Promise.all([
                                api.get(`/work-orders/${woId}?t=${timestamp}`),
                                api.get(`/stock?t=${timestamp}`)
                            ]);
                            await db.workOrders.put(updatedWO.data);
                            // Prune + Put stock
                            await db.transaction('rw', db.stock, async () => {
                                const freshData = updatedStock.data;
                                const freshIds = freshData.map((x: any) => x.id).filter(Boolean);
                                const allKeys = await db.stock.toCollection().primaryKeys();
                                const toDelete = allKeys.filter((k: any) => !freshIds.includes(k));
                                if (toDelete.length > 0) await db.stock.bulkDelete(toDelete);
                                await db.stock.bulkPut(freshData);
                            });
                            console.log('✅ OT & Stock cache refreshed after part addition.');
                        } catch (cacheErr) {
                            console.warn('⚠️ Cache refresh failed after ADD_PART (non-blocking):', cacheErr);
                        }
                    })();
                }
            }

            // ✅ For OT creation: store the full result (with parts) in Dexie
            if (endpoint === '/work-orders' && actionType === 'CREATE_WORK_ORDER' && postResult?.id) {
                try {
                    const timestamp = Date.now();
                    const freshWO = await api.get(`/work-orders/${postResult.id}?t=${timestamp}`);
                    await db.workOrders.put(freshWO.data);
                } catch (e) {
                    // Non-blocking: PUT the raw result as fallback
                    try { await db.workOrders.put(postResult); } catch {}
                }
            }

            return postResult;
        } catch (err) {
            console.warn(`POST failed, queuing ${actionType}...`, err);
            // Fall through to queue
        }
    }

    // OFFLINE or failed: add to sync queue
    if (typeof window !== 'undefined') {
        await db.syncQueue.add({
            type: actionType,
            endpoint,
            method: 'POST',
            payload: data,
            timestamp: Date.now(),
            status: 'pending'
        });
    }
    return { ...data, id: Date.now(), offline: true, message: 'Action enregistrée' };
}

async function handlePatch(endpoint: string, data: any, actionType: OfflineAction['type']) {
    const isOnline = typeof window !== 'undefined' && navigator.onLine;

    // ONLINE: try to send directly — only queue on failure
    if (isOnline) {
        try {
            const res = await api.patch(endpoint, data);
            // ✅ Update Dexie cache: PUT the FULL server response (includes parts, steps)
            if (endpoint.includes('/work-orders/')) {
                const woId = parseInt(endpoint.split('/work-orders/')[1]);
                if (!isNaN(woId) && res.data?.id) {
                    await db.workOrders.put(res.data);
                }
            }
            return res.data;
        } catch (err) {
            console.warn(`PATCH failed, queuing ${actionType}...`, err);
            // Fall through to queue
        }
    }

    // OFFLINE or failed: add to sync queue
    if (typeof window !== 'undefined') {
        await db.syncQueue.add({
            type: actionType,
            endpoint,
            method: 'PATCH',
            payload: data,
            timestamp: Date.now(),
            status: 'pending'
        });
    }
    return { ...data, offline: true };
}

async function handleDelete(endpoint: string, actionType: OfflineAction['type']) {
    const isOnline = typeof window !== 'undefined' && navigator.onLine;

    // ONLINE: try to send directly — only queue on failure
    if (isOnline) {
        try {
            const res = await api.delete(endpoint);
            return res.data;
        } catch (err) {
            console.warn(`DELETE failed, queuing ${actionType}...`, err);
            // Fall through to queue
        }
    }

    // OFFLINE or failed: add to sync queue
    if (typeof window !== 'undefined') {
        await db.syncQueue.add({
            type: actionType,
            endpoint,
            method: 'DELETE',
            payload: {},
            timestamp: Date.now(),
            status: 'pending'
        });
    }
    return { offline: true };
}

// ────────────────────────────────────────────
// Synchronization Logic
// ────────────────────────────────────────────

async function processSyncQueue() {
    if (typeof window === 'undefined' || !navigator.onLine) return;
    
    const queue = await db.syncQueue
        .filter(a => a.status === 'pending' || a.status === 'error')
        .toArray();
    if (queue.length === 0) return;

    for (const action of queue) {
        try {
            await db.syncQueue.update(action.id!, { status: 'syncing' });
            
            let res;
            if (action.method === 'POST') res = await api.post(action.endpoint, action.payload);
            else if (action.method === 'PATCH') res = await api.patch(action.endpoint, action.payload);
            else if (action.method === 'DELETE') res = await api.delete(action.endpoint);
            
            await db.syncQueue.delete(action.id!);
            console.log(`Sync Success: ${action.type} -> ${action.endpoint}`);
        } catch (err: any) {
            if (err.response?.status === 404) {
                console.warn(`🗑️ Skipping deleted resource: ${action.endpoint}`);
                await db.syncQueue.delete(action.id!);
            } else {
                console.error(`Sync Failure for ${action.id}:`, err);
                await db.syncQueue.update(action.id!, { 
                    status: 'error', 
                    errorMessage: err.response?.data?.detail || err.message 
                });
            }
        }
    }
}

// Auto-sync when coming back online
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        processSyncQueue();
        syncMasterData();
    });
}

async function syncMasterData() {
    if (typeof window === 'undefined' || !navigator.onLine) return;
    
    // Skip sync if user is not authenticated
    const token = localStorage.getItem('token');
    if (!token) {
        console.log('⏭️ Skipping master data sync — not authenticated.');
        return;
    }

    console.log('🔄 Syncing master data...');
    
    // Fetch each resource independently to prevent one failure from blocking all
    const [machinesRes, stockRes, techRes, woRes] = await Promise.allSettled([
        api.get('/machines'),
        api.get('/stock'),
        api.get('/technicians'),
        api.get('/work-orders')
    ]);

    try {
        const syncTable = async (table: any, res: any) => {
            if (res.status === 'fulfilled' && Array.isArray(res.value.data)) {
                await db.transaction('rw', table, async () => {
                    const freshData = res.value.data;
                    const freshIds = freshData.map((x: any) => x.id).filter(Boolean);
                    const allKeys = await table.toCollection().primaryKeys();
                    const toDelete = allKeys.filter((k: any) => !freshIds.includes(k));
                    if (toDelete.length > 0) await table.bulkDelete(toDelete);
                    await table.bulkPut(freshData);
                });
            }
        };

        await syncTable(db.machines, machinesRes);
        await syncTable(db.stock, stockRes);
        await syncTable(db.technicians, techRes);
        await syncTable(db.workOrders, woRes);

        const failures = [machinesRes, stockRes, techRes, woRes].filter(r => r.status === 'rejected').length;
        if (failures > 0) {
            console.warn(`⚠️ Master data sync partial — ${failures}/4 resource(s) failed.`);
        } else {
            console.log('✅ Master data synced successfully.');
        }
    } catch (err) {
        console.error('❌ Master data sync failed:', err);
    }
}

// ────────────────────────────────────────────
// GMAO API EXPORTS
// ────────────────────────────────────────────

export const gmaoApi = {
    getMachines: () => handleGet('/machines', db.machines),
    getStock: () => handleGet('/stock', db.stock),
    getWorkOrders: () => handleGet('/work-orders', db.workOrders),
    getStats: () => handleGet('/stats'),
    
    getWorkOrder: async (id: string | number) => {
        try {
            const res = await api.get(`/work-orders/${id}`);
            return res.data;
        } catch (err) {
            // Fallback to local search if specific WO fetch fails
            const local = await db.workOrders.get({ id: Number(id) });
            if (local) return local;
            throw err;
        }
    },

    createWorkOrder: (data: any) => handlePost('/work-orders', data, 'CREATE_WORK_ORDER'),
    
    orderStock: async (itemId: number, quantity: number) => {
        return handlePost('/stock/order', { itemId, quantity }, 'UPDATE_WORK_ORDER');
    },

    updateWorkOrder: (id: number | string, data: any) => handlePatch(`/work-orders/${id}`, data, 'UPDATE_WORK_ORDER'),
    deleteWorkOrder: (id: number | string) => handleDelete(`/work-orders/${id}`, 'DELETE_WORK_ORDER'),

    approveWorkOrderDeletion: (id: number | string) => handlePost(`/work-orders/${id}/approve-deletion`, {}, 'APPROVE_DELETION'),
    rejectWorkOrderDeletion: (id: number | string) => handlePost(`/work-orders/${id}/reject-deletion`, {}, 'REJECT_DELETION'),

    getMachineWorkOrders: async (machineId: number) => {
        return handleGet(`/machines/${machineId}/work-orders`, db.workOrders);
    },

    addWorkOrderPart: (woId: number | string, data: any) => 
        handlePost(`/work-orders/${woId}/parts`, data, 'ADD_PART'),

    getMachineMaintenanceStatus: (machineId: number) => 
        handleGet(`/machines/${machineId}/maintenance-status`),

    triggerMaintenance: (machineId: number) => 
        handlePost(`/machines/${machineId}/trigger-maintenance`, {}, 'CREATE_WORK_ORDER'),

    getReliabilityKpis: () => handleGet('/kpi-reliability'),
    getTechnicians: () => handleGet('/technicians', db.technicians),
    syncData: async () => {
        await processSyncQueue();
        await syncMasterData();
    },

    toggleStep: (stepId: number, isDone: boolean) => 
        handlePatch(`/work-orders/steps/${stepId}/toggle`, { is_done: isDone }, 'UPDATE_WORK_ORDER'),

    downloadWorkOrderReport: async (woId: number | string) => {
        const response = await api.get(`/work-orders/${woId}/pdf`, { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Rapport_OT_${woId}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    },

    // MANAGER
    getManagerStats: async () => {
        if (typeof window !== 'undefined' && !navigator.onLine) {
            const cached = await db.table('stats').get('manager_stats');
            return cached ? cached.data : null;
        }
        try {
            const res = await api.get('/manager-stats');
            if (typeof window !== 'undefined') {
                await db.table('stats').put({ key: 'manager_stats', data: res.data });
            }
            return res.data;
        } catch (err) {
            const cached = await db.table('stats').get('manager_stats');
            return cached ? cached.data : null;
        }
    },
    getManagerTechnicians: () => handleGet('/manager/technicians'),
    getTechnicianStats: (techId: number) => handleGet(`/manager/technicians/${techId}/stats`),
    getTechnicianWorkOrders: (techId: number) => handleGet(`/manager/technicians/${techId}/work-orders`),
    
    // MAGASINIER
    getMagasinierStats: async () => {
        if (typeof window !== 'undefined' && !navigator.onLine) {
            const cached = await db.stats.get({ key: 'magasinier_stats' });
            return cached ? cached.data : null;
        }
        try {
            const res = await api.get('/magasinier/stats');
            if (typeof window !== 'undefined') {
                await db.stats.put({ key: 'magasinier_stats', data: res.data });
            }
            return res.data;
        } catch (err) {
            const cached = await db.stats.get({ key: 'magasinier_stats' });
            return cached ? cached.data : null;
        }
    },
    getStockMovements: () => handleGet('/stock/movements', db.stockMovements),
    createPartsRequest: (data: any) => handlePost('/parts-requests', data, 'CREATE_PARTS_REQUEST'),
    getPartsRequests: (statusFilter?: string) => {
        const endpoint = statusFilter ? `/parts-requests?status_filter=${statusFilter}` : '/parts-requests';
        return handleGet(endpoint, db.partsRequests);
    },
    approvePartsRequest: (reqId: number) => handlePatch(`/parts-requests/${reqId}/approve`, {}, 'APPROVE_PARTS_REQUEST'),
    rejectPartsRequest: (reqId: number, reason: string) => handlePatch(`/parts-requests/${reqId}/reject`, { reason }, 'REJECT_PARTS_REQUEST'),
    
    // TIME TRACKING
    getTimerActive: () => handleGet('/technician/timer/active'),
    startTimer: (woId: number | string) => handlePost(`/work-orders/${woId}/timer/start`, {}, 'TIMER_START'),
    stopTimer: (woId: number | string) => handlePost(`/work-orders/${woId}/timer/stop`, {}, 'TIMER_STOP'),

    // SYSTEM ADMINISTRATION
    resetSystem: () => handlePost('/system/reset', {}, 'RESET_SYSTEM'),

    // AUTH HELPERS
    getCurrentUser: () => {
        if (typeof window === 'undefined') return null;
        const user = localStorage.getItem('user');
        if (user) return JSON.parse(user);
        
        // Fallback: decode JWT token
        const token = localStorage.getItem('token');
        if (!token) return null;
        try {
            const payload = JSON.parse(window.atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
            return { id: payload.id, role: payload.role, name: payload.name };
        } catch {
            return null;
        }
    },
    syncMachinesFromSap: () => handlePost('/machines/sync-from-sap', {}, 'SYNC_SAP_MACHINES'),
    syncWorkOrdersFromSap: () => handlePost('/work-orders/sync-from-sap', {}, 'SYNC_SAP_OTS'),
};

export default api;
