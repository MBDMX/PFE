import api from './base';
import { db } from '../../lib/db';
import { handleGet } from './offline-helpers';

export const managerService = {
    getManagerStats: async () => {
        try {
            const res = await api.get('/manager-stats');
            if (typeof window !== 'undefined') await db.stats.put({ key: 'manager_stats', data: res.data });
            return res.data;
        } catch {
            const cached = await db.stats.get('manager_stats');
            return cached ? cached.data : null;
        }
    },
    getMagasinierStats: async () => {
        try {
            const res = await api.get('/magasinier/stats');
            if (typeof window !== 'undefined') await db.stats.put({ key: 'magasinier_stats', data: res.data });
            return res.data;
        } catch {
            const cached = await db.stats.get('magasinier_stats');
            return cached ? cached.data : null;
        }
    },
    getManagerTechnicians: () => handleGet('/manager/technicians'),
    getTechnicianStats: (techId: number) => handleGet(`/manager/technicians/${techId}/stats`),
    getTechnicianWorkOrders: (techId: number) => handleGet(`/manager/technicians/${techId}/work-orders`),
    getReliabilityKpis: () => handleGet('/kpi-reliability'),
    getTechnicians: () => handleGet('/technicians', db.technicians),
};
