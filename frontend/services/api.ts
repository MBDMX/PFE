import axios from 'axios';

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
        // Broadcast custom event so a global Toast listener can catch it
        if (typeof window !== 'undefined' && error.response) {
            const status = error.response.status;
            let message = error.response.data?.detail || "Une erreur est survenue côté serveur.";

            // Format FastAPI validation errors
            if (Array.isArray(message)) {
                message = message.map(err => err.msg).join(', ');
            }

            if (status >= 400) {
                const event = new CustomEvent('api:error', { detail: message });
                window.dispatchEvent(event);
            }
        }
        return Promise.reject(error);
    }
);

export const gmaoApi = {
    getMachines: async () => {
        const res = await api.get('/machines');
        return res.data;
    },
    getStock: async () => {
        const res = await api.get('/stock');
        return res.data;
    },
    getWorkOrders: async () => {
        const res = await api.get('/work-orders');
        return res.data;
    },
    getStats: async () => {
        const res = await api.get('/stats');
        return res.data;
    },
    getWorkOrder: async (id: string | number) => {
        const res = await api.get(`/work-orders/${id}`);
        return res.data;
    },
    createWorkOrder: async (data: any) => {
        const res = await api.post('/work-orders', data);
        return res.data;
    },
    orderStock: async (itemId: number, quantity: number) => {
        const res = await api.post('/stock/order', { itemId, quantity });
        return res.data;
    },
    updateWorkOrder: async (id: number | string, data: any) => {
        const res = await api.patch(`/work-orders/${id}`, data);
        return res.data;
    },
    getMachineWorkOrders: async (machineId: number) => {
        const res = await api.get(`/machines/${machineId}/work-orders`);
        return res.data;
    },
    addWorkOrderPart: async (woId: number | string, data: { part_code: string, quantity: number }) => {
        const res = await api.post(`/work-orders/${woId}/parts`, data);
        return res.data;
    },
    getMachineMaintenanceStatus: async (machineId: number) => {
        const res = await api.get(`/machines/${machineId}/maintenance-status`);
        return res.data;
    },
    triggerMaintenance: async (machineId: number) => {
        const res = await api.post(`/machines/${machineId}/trigger-maintenance`);
        return res.data;
    },
    getReliabilityKpis: async () => {
        const res = await api.get('/kpi-reliability');
        return res.data;
    },
};

export default api;
