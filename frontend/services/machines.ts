import api from './api';
import { Machine } from '@/types/machine';

export const getMachines = () => api.get<Machine[]>('/machines').then(r => r.data);
export const createMachine = (m: Omit<Machine, 'id'>) => api.post<Machine>('/machines', m).then(r => r.data);
export const updateMachine = (id: number, m: Partial<Machine>) => api.put<Machine>(`/machines/${id}`, m).then(r => r.data);
export const deleteMachine = (id: number) => api.delete(`/machines/${id}`);
