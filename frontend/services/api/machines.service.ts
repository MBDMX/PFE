import api from './base';
import { db } from '../../lib/db';
import { handleGet, handlePost } from './offline-helpers';

export const machinesService = {
    getMachines: () => handleGet('/machines', db.machines),
    getMachineWorkOrders: (machineId: number) => handleGet(`/machines/${machineId}/work-orders`, db.workOrders),
    getMachineMaintenanceStatus: (machineId: number) => handleGet(`/machines/${machineId}/maintenance-status`),
    triggerMaintenance: (machineId: number) => handlePost(`/machines/${machineId}/trigger-maintenance`, {}, 'CREATE_WORK_ORDER'),
    getMachineFinancials: (machineId: number) => handleGet(`/machines/${machineId}/financials`),
    getMachineHealth: () => handleGet('/predictive/machine-health'),
    syncMachinesFromSap: () => api.post('/machines/sync-from-sap', {}),
};
