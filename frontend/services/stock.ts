import api from './api';
import { StockItem } from '@/types/stock';

export const getStock = () => api.get<StockItem[]>('/stock').then(r => r.data);
export const createStockItem = (s: Omit<StockItem, 'id'>) => api.post<StockItem>('/stock', s).then(r => r.data);
export const updateStockItem = (id: number, s: Partial<StockItem>) => api.put<StockItem>(`/stock/${id}`, s).then(r => r.data);
export const deleteStockItem = (id: number) => api.delete(`/stock/${id}`);
