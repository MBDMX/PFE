import api from './base';
import { handleGet, handlePost } from './offline-helpers';

export const systemService = {
    resetSystem: () => handlePost('/system/reset', {}, 'RESET_SYSTEM'),
    getSystemLogs: () => handleGet('/system/logs'),
    getSystemStatus: () => handleGet('/system/status'),
    getStats: () => handleGet('/stats'),
};
