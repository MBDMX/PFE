import axios from 'axios';
import { db } from '../lib/db';

const apiBaseUrl = typeof window !== 'undefined'
    ? `http://${window.location.hostname}:4000/api`
    : 'http://localhost:4000/api';

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

    // If we have a table, try to serve from cache first ONLY if truly offline
    if (typeof window !== 'undefined' && !isOnline && table) {
        return await table.toArray();
    }

    try {
        const res = await api.get(endpoint);
        // Background update of IndexedDB if table is provided
        if (table && Array.isArray(res.data) && typeof window !== 'undefined') {
            try {
                await table.clear();
                await table.bulkAdd(res.data);
            } catch (dbErr) {
                console.warn(`Dexie Bulk Sync Error on ${endpoint}:`, dbErr);
                // If bulk fails, try put individually to recover
                for (const item of res.data) {
                    await table.put(item).catch(() => {});
                }
            }
        }
        return res.data;
    } catch (err: any) {
        // If 401, DON'T fallback to local data, let the interceptor handle it
        if (err.response?.status === 401) throw err;

        // If offline or network error, fallback to cache
        if (table) return await table.toArray();
        throw err;
    }
}

async function handlePost(endpoint: string, data: any, actionType: any) {
    if (typeof window !== 'undefined' && !navigator.onLine) {
        await db.syncQueue.add({
            type: actionType,
            endpoint,
            method: 'POST',
            payload: data,
            timestamp: Date.now(),
            status: 'pending'
        });
        
        // Return a optimistic response
        return { message: "Action enregistrée en local (Hors ligne)", offline: true, ...data };
    }
    const res = await api.post(endpoint, data);
    return res.data;
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

    updateWorkOrder: async (id: number | string, data: any) => {
        if (typeof window !== 'undefined' && !navigator.onLine) {
            await db.syncQueue.add({
                type: 'UPDATE_WORK_ORDER',
                id: Number(id),
                endpoint: `/work-orders/${id}`,
                method: 'PATCH',
                payload: data,
                timestamp: Date.now(),
                status: 'pending'
            });
            return { offline: true };
        }
        const res = await api.patch(`/work-orders/${id}`, data);
        return res.data;
    },

    deleteWorkOrder: async (id: number | string) => {
        if (typeof window !== 'undefined' && !navigator.onLine) {
            await db.syncQueue.add({
                type: 'DELETE_WORK_ORDER',
                endpoint: `/work-orders/${id}`,
                method: 'DELETE',
                payload: {},
                timestamp: Date.now(),
                status: 'pending'
            });
            return { offline: true };
        }
        const res = await api.delete(`/work-orders/${id}`);
        return res.data;
    },

    approveWorkOrderDeletion: (id: number | string) => api.post(`/work-orders/${id}/approve-deletion`),
    rejectWorkOrderDeletion: (id: number | string) => api.post(`/work-orders/${id}/reject-deletion`),

    getMachineWorkOrders: async (machineId: number) => {
        // Simple filter on local workOrders if offline
        if (!navigator.onLine) {
             return (await db.workOrders.toArray()).filter(wo => wo.equipment_id === machineId);
        }
        const res = await api.get(`/machines/${machineId}/work-orders`);
        return res.data;
    },

    addWorkOrderPart: (woId: number | string, data: any) => 
        handlePost(`/work-orders/${woId}/parts`, data, 'ADD_PART'),

    getMachineMaintenanceStatus: (machineId: number) => 
        handleGet(`/machines/${machineId}/maintenance-status`),

    triggerMaintenance: (machineId: number) => 
        handlePost(`/machines/${machineId}/trigger-maintenance`, {}, 'CREATE_WORK_ORDER'),

    getReliabilityKpis: () => handleGet('/kpi-reliability'),
    getTechnicians: () => handleGet('/technicians', db.technicians),

    toggleStep: async (stepId: number, isDone: boolean) => {
        if (typeof window !== 'undefined' && !navigator.onLine) {
            await db.syncQueue.add({
                type: 'UPDATE_WORK_ORDER',
                endpoint: `/work-orders/steps/${stepId}/toggle`,
                method: 'PATCH',
                payload: { is_done: isDone },
                timestamp: Date.now(),
                status: 'pending'
            });
            return { offline: true };
        }
        const res = await api.patch(`/work-orders/steps/${stepId}/toggle`, { is_done: isDone });
        return res.data;
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
    approvePartsRequest: async (reqId: number) => {
        if (typeof window !== 'undefined' && !navigator.onLine) {
            await db.syncQueue.add({
                type: 'APPROVE_PARTS_REQUEST', 
                endpoint: `/parts-requests/${reqId}/approve`,
                method: 'PATCH',
                payload: {},
                timestamp: Date.now(),
                status: 'pending'
            });
            return { offline: true };
        }
        const res = await api.patch(`/parts-requests/${reqId}/approve`, {});
        return res.data;
    },
    rejectPartsRequest: async (reqId: number, reason: string) => {
        if (typeof window !== 'undefined' && !navigator.onLine) {
            await db.syncQueue.add({
                type: 'REJECT_PARTS_REQUEST', 
                endpoint: `/parts-requests/${reqId}/reject`,
                method: 'PATCH',
                payload: { reason },
                timestamp: Date.now(),
                status: 'pending'
            });
            return { offline: true };
        }
        const res = await api.patch(`/parts-requests/${reqId}/reject`, { reason });
        return res.data;
    },
    
    // TIME TRACKING
    getTimerActive: () => handleGet('/technician/timer/active'),
    startTimer: (woId: number | string) => handlePost(`/work-orders/${woId}/timer/start`, {}, 'TIMER_START'),
    stopTimer: (woId: number | string) => handlePost(`/work-orders/${woId}/timer/stop`, {}, 'TIMER_STOP'),

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
    }
};

export default api;
