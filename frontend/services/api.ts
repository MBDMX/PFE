import axios from 'axios';
import { db, type OfflineAction } from '../lib/db';

const apiBaseUrl = 'http://127.0.0.1:5000/api';

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

    // 1. ONLINE: Network-First (with short timeout)
    if (isOnline) {
        try {
            // Timeout court pour ne pas bloquer l'UI si le réseau est instable
            const res = await api.get(url, { timeout: 1500 });
            if (table && Array.isArray(res.data)) {
                // SYNC DATA: Update existing, add new, remove deleted
                await db.transaction('rw', table, async () => {
                    const freshData = res.data;
                    const allKeys = await table.toCollection().primaryKeys();
                    const freshIds = freshData.map((x: any) => x.id).filter(Boolean);
                    
                    const localCount = await table.count();
                    if (freshData.length === 0 && localCount > 5) {
                        // Protection contre les réponses vides accidentelles
                    } else {
                        const keysToDelete = allKeys.filter((k: any) => !freshIds.includes(k));
                        if (keysToDelete.length > 0) await table.bulkDelete(keysToDelete);
                    }
                    await table.bulkPut(freshData);
                });
            }
            return res.data;
        } catch (err) {
            // console.warn(`GET ${endpoint} failed, falling back to cache...`);
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
            // Timeout de 2s : si Internet est trop lent, on bascule en offline
            const res = await api.post(endpoint, data, { timeout: 2000 });
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
        console.log(`📡 Queuing ${actionType} for offline sync...`);
        await db.syncQueue.add({
            type: actionType,
            endpoint,
            method: 'POST',
            payload: data,
            timestamp: Date.now(),
            status: 'pending'
        });
        // SIGNAL GLOBAL pour forcer la Sidebar à se mettre à jour
        window.dispatchEvent(new Event('sync-queue-updated'));
    }
    return { ...data, id: Date.now(), offline: true, message: 'Action enregistrée hors-ligne', success: true };
}

async function handlePatch(endpoint: string, data: any, actionType: OfflineAction['type']) {
    // On essaie toujours, le timeout de 2s s'occupe du reste
    try {
        const res = await api.patch(endpoint, data, { timeout: 2000 });
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
    // On essaie toujours l'envoi direct, le timeout de 2s gère le reste
    try {
        const res = await api.delete(endpoint, { timeout: 2000 });
        return res.data;
    } catch (err) {
        console.warn(`DELETE failed, queuing ${actionType}...`, err);
        // Fall through to queue
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

async function processSyncQueue(force: boolean = false) {
    if (typeof window === 'undefined') return;
    
    const queue = await db.syncQueue
        .filter(a => a.status === 'pending' || (force && a.status === 'error'))
        .toArray();
    if (queue.length === 0) return;

    // Clés internes à ne jamais envoyer au backend
    for (const action of queue) {
        try {
            // Clean internal-only keys that might confuse the backend
            // Note: 'parts' and 'steps' are NOT internal, they are used by the backend!
            const INTERNAL_KEYS = ['offline', '_stock_updates', 'created_at', 'updated_at', 
                                   'sap_order_id', 'technician', 'machine'];
            
            const cleanPayload = { ...action.payload };
            INTERNAL_KEYS.forEach(key => delete (cleanPayload as any)[key]);

            console.log(`📡 Syncing action ${action.type} to ${action.endpoint}...`, cleanPayload);

            let res;
            try {
                if (action.method === 'POST') res = await api.post(action.endpoint, cleanPayload);
                else if (action.method === 'PATCH') res = await api.patch(action.endpoint, cleanPayload);
                else if (action.method === 'DELETE') res = await api.delete(action.endpoint);
                
                // Success: remove from queue
                await db.syncQueue.delete(action.id!);
                console.log(`✅ Action ${action.id} synced successfully.`);
            } catch (err: any) {
                const status = err.response?.status;
                const detail = err.response?.data?.detail;
                console.error(`❌ Sync failed for action ${action.id} (Status: ${status}):`, detail || err.message);
                
                // If 400/422, it's a validation error: mark it as error so user can see it
                await db.syncQueue.update(action.id!, { 
                    status: 'error', 
                    errorMessage: Array.isArray(detail) ? detail.map((d:any) => d.msg).join(', ') : (detail || err.message)
                });
                
                // We DON'T throw here anymore, to allow other items in the queue to sync
            }
            console.log(`📡 Processed ${action.type} -> ${action.endpoint}`);
        } catch (err: any) {
            console.error(`Unexpected error in sync loop for ${action.id}:`, err);
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
    if (typeof window === 'undefined') return;
    
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

/**
 * Persists images in IndexedDB as base64 for "instant" offline loading.
 */
async function cacheStockImages(items: any[]) {
    if (!Array.isArray(items)) return;
    
    console.log('🖼️ Starting background image caching...');
    
    for (const item of items) {
        if (!item.image || item.image.startsWith('http')) continue;

        // Check if already cached to avoid redundant work
        const local = await db.stock.get(item.id);
        if (local && local.cached_image) continue;

        try {
            const imageUrl = item.image.startsWith('http') 
                ? item.image 
                : `${process.env.NEXT_PUBLIC_API_URL || apiBaseUrl.replace('/api', '')}${item.image}`;
            
            // Fetch image as blob
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            
            // Convert to Base64
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = async () => {
                const base64data = reader.result;
                await db.stock.update(item.id, { cached_image: base64data });
            };
        } catch (err) {
            // Silently fail for individual images
        }
    }
    console.log('✅ Background image caching complete.');
}

// ────────────────────────────────────────────
// GMAO API EXPORTS
// ────────────────────────────────────────────

export const gmaoApi = {
    get: (url: string) => handleGet(url),
    getMachines: () => handleGet('/machines', db.machines),
    getStock: () => handleGet('/stock', db.stock),
    syncStockFromSap: async () => {
        // Appel direct — pas de queue offline pour les syncs SAP
        const res = await api.post('/stock/sync-from-sap', {});
        // Rafraîchir immédiatement le cache Dexie avec les nouvelles images
        await handleGet('/stock', db.stock);
        return res.data;
    },
    syncImages: async (force: boolean = false) => {
        // Force l'assignation d'images sur toutes les pièces existantes
        const res = await api.post(`/stock/sync-images?force=${force}`, {});
        await handleGet('/stock', db.stock);
        return res.data;
    },
    getWorkOrders: () => handleGet('/work-orders', db.workOrders),
    getWorkOrder: (id: number | string) => handleGet(`/work-orders/${id}`, db.workOrders),
    getStats: () => handleGet('/stats'),
    
    createWorkOrder: (data: any) => handlePost('/work-orders', data, 'CREATE_WORK_ORDER'),
    
    orderStock: async (itemId: number, quantity: number, supplierInfo: string = "") => {
        return handlePost(`/stock/${itemId}/order-sap`, { quantity, supplier_info: supplierInfo }, 'UPDATE_WORK_ORDER');
    },

    transferStock: async (partReference: string, quantity: number) => {
        return handlePost('/stock/transfer-sap', { item_code: partReference, quantity, from_wh: '01', to_wh: '02' }, 'UPDATE_WORK_ORDER');
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

    getMachineFinancials: (machineId: number) => 
        handleGet(`/machines/${machineId}/financials`),

    getReliabilityKpis: () => handleGet('/kpi-reliability'),
    getTechnicians: () => handleGet('/technicians', db.technicians),
    _isSyncingInternal: false,
    syncData: async function() {
        if (this._isSyncingInternal) return;
        this._isSyncingInternal = true;
        try {
            await processSyncQueue(true);
            await syncMasterData();
        } finally {
            this._isSyncingInternal = false;
        }
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
    createStockMovement: (data: { part_id: number; type: 'IN' | 'OUT'; quantity: number }) =>
        handlePost('/stock/movements/manual', data, 'CREATE_STOCK_MOVEMENT'),
    updatePartLocation: async (partId: number, location: string) => {
        const res = await api.patch(`/stock/${partId}/location`, { location });
        return res.data;
    },

    createPartsRequest: (data: any) => handlePost('/parts-requests', data, 'CREATE_PARTS_REQUEST'),
    getPartsRequests: (statusFilter?: string) => {
        const endpoint = statusFilter ? `/parts-requests?status_filter=${statusFilter}` : '/parts-requests';
        return handleGet(endpoint, db.partsRequests);
    },
    approvePartsRequest: (reqId: number) => handlePatch(`/parts-requests/${reqId}/approve`, {}, 'APPROVE_PARTS_REQUEST'),
    rejectPartsRequest: (reqId: number, reason: string) => handlePatch(`/parts-requests/${reqId}/reject`, { reason }, 'REJECT_PARTS_REQUEST'),
    
    searchStockAI: async (query: string) => {
        const res = await api.post('/stock/search-ai', { query });
        return res.data;
    },
    
    // BIOMETRIC AUTH
    enrollFace: (descriptor: number[]) => api.post('/face/enroll', { descriptor }),
    enrollFaceMulti: (descriptors: number[][]) => api.post('/face/enroll-multi', { descriptors }),
    faceLogin: (descriptor: number[]) => api.post('/face/login', { descriptor }),

    // TIME TRACKING
    getTimerActive: () => handleGet('/technician/timer/active'),
    startTimer: (woId: number | string) => handlePost(`/work-orders/${woId}/timer/start`, {}, 'TIMER_START'),
    stopTimer: (woId: number | string, data: any = {}) => handlePost(`/work-orders/${woId}/timer/stop`, data, 'TIMER_STOP'),

    // SYSTEM ADMINISTRATION
    resetSystem: () => handlePost('/system/reset', {}, 'RESET_SYSTEM'),
    register: (data: any) => handlePost('/auth/register', data, 'CREATE_USER'),

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

    // ADMIN SYSTEM & LOGS
    getSystemLogs: () => handleGet('/system/logs'),
    getSystemStatus: () => handleGet('/system/status'),
    getMachineHealth: () => handleGet('/predictive/machine-health'),
};

export default api;
