export type MachineStatus = 'operational' | 'maintenance' | 'breakdown';
export interface Machine {
    id: number;
    name: string;
    reference: string;
    location: string;
    status: MachineStatus;
    healthScore: number;
}
