import api from './base';
import { db } from '../../lib/db';
import { handleGet, handlePost, handlePatch, handleDelete } from './offline-helpers';

export const workOrdersService = {
    getWorkOrders: () => handleGet('/work-orders', db.workOrders),
    getWorkOrder: (id: number | string) => handleGet(`/work-orders/${id}`, db.workOrders),
    createWorkOrder: (data: any) => handlePost('/work-orders', data, 'CREATE_WORK_ORDER'),
    updateWorkOrder: (id: number | string, data: any) => handlePatch(`/work-orders/${id}`, data, 'UPDATE_WORK_ORDER'),
    deleteWorkOrder: (id: number | string) => handleDelete(`/work-orders/${id}`, 'DELETE_WORK_ORDER'),
    
    syncWorkOrdersFromSap: async () => {
        const res = await api.post('/work-orders/sync-from-sap', {});
        await handleGet('/work-orders', db.workOrders);
        return res.data;
    },

    approveWorkOrderDeletion: (id: number | string) => handlePost(`/work-orders/${id}/approve-deletion`, {}, 'APPROVE_DELETION'),
    rejectWorkOrderDeletion: (id: number | string) => handlePost(`/work-orders/${id}/reject-deletion`, {}, 'REJECT_DELETION'),
    
    addWorkOrderPart: (woId: number | string, data: any) => handlePost(`/work-orders/${woId}/parts`, data, 'ADD_PART'),
    toggleStep: (stepId: number, isDone: boolean) => handlePatch(`/work-orders/steps/${stepId}/toggle`, { is_done: isDone }, 'UPDATE_WORK_ORDER'),
    
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

    // Timer logic
    getTimerActive: () => handleGet('/technician/timer/active'),
    startTimer: (woId: number | string) => handlePost(`/work-orders/${woId}/timer/start`, {}, 'TIMER_START'),
    stopTimer: (woId: number | string, data: any = {}) => handlePost(`/work-orders/${woId}/timer/stop`, data, 'TIMER_STOP'),
    
    // Parts Requests
    createPartsRequest: (data: any) => handlePost('/parts-requests', data, 'CREATE_PARTS_REQUEST'),
    getPartsRequests: (statusFilter?: string) => {
        const endpoint = statusFilter ? `/parts-requests?status_filter=${statusFilter}` : '/parts-requests';
        return handleGet(endpoint, db.partsRequests);
    },
    approvePartsRequest: (reqId: number) => handlePatch(`/parts-requests/${reqId}/approve`, {}, 'APPROVE_PARTS_REQUEST'),
    rejectPartsRequest: (reqId: number, reason: string) => handlePatch(`/parts-requests/${reqId}/reject`, { reason }, 'REJECT_PARTS_REQUEST'),
};
