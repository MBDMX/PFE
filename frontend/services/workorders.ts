import api from './api';
import { WorkOrder } from '@/types/workorder';

export const getWorkOrders = () => api.get<WorkOrder[]>('/work-orders').then(r => r.data);
export const createWorkOrder = (w: Omit<WorkOrder, 'id'>) => api.post<WorkOrder>('/work-orders', w).then(r => r.data);
export const updateWorkOrder = (id: number, w: Partial<WorkOrder>) => api.put<WorkOrder>(`/work-orders/${id}`, w).then(r => r.data);
export const deleteWorkOrder = (id: number) => api.delete(`/work-orders/${id}`);
