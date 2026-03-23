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
    }
};

export default api;
