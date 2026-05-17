import api from './base';
import { db } from '../../lib/db';
import { handleGet, handlePost, handlePatch } from './offline-helpers';

export const stockService = {
    getStock: () => handleGet('/stock', db.stock),
    getStockMovements: () => handleGet('/stock/movements', db.stockMovements),
    
    syncStockFromSap: async () => {
        const res = await api.post('/stock/sync-from-sap', {});
        await handleGet('/stock', db.stock);
        return res.data;
    },
    
    syncImages: async (force: boolean = false) => {
        const res = await api.post(`/stock/sync-images?force=${force}`, {});
        await handleGet('/stock', db.stock);
        return res.data;
    },

    orderStock: async (itemId: number, quantity: number, supplierInfo: string = "") => {
        return handlePost(`/stock/${itemId}/order-sap`, { quantity, supplier_info: supplierInfo }, 'UPDATE_WORK_ORDER');
    },

    transferStock: async (partReference: string, quantity: number) => {
        return handlePost('/stock/transfer-sap', { item_code: partReference, quantity, from_wh: '01', to_wh: '02' }, 'UPDATE_WORK_ORDER');
    },

    updatePartLocation: async (partId: number, location: string) => {
        const res = await api.patch(`/stock/${partId}/location`, { location });
        return res.data;
    },

    searchStockAI: async (query: string) => {
        const res = await api.post('/stock/search-ai', { query });
        return res.data;
    },
};
