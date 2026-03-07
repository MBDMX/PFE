export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type WOStatus = 'pending' | 'in_progress' | 'done' | 'cancelled';
export interface WorkOrder {
    id: number;
    title: string;
    machineId: number;
    assignedTo: number;
    priority: Priority;
    status: WOStatus;
    dueDate: string;
}
