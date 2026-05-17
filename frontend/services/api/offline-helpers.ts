import api from './base';
import { db, type OfflineAction } from '../../lib/db';

export async function handleGet(endpoint: string, table?: any) {
    const isOnline = typeof window !== 'undefined' && navigator.onLine;
    const url = endpoint.includes('?') ? `${endpoint}&t=${Date.now()}` : `${endpoint}?t=${Date.now()}`;

    if (isOnline) {
        try {
            // Augmentation du timeout à 5s pour laisser le temps au backend (SAP/B1) de répondre
            const res = await api.get(url, { timeout: 5000 });
            if (table && Array.isArray(res.data)) {
                await db.transaction('rw', table, async () => {
                    const freshData = res.data;
                    const allKeys = await table.toCollection().primaryKeys();
                    const freshIds = freshData.map((x: any) => x.id).filter(Boolean);
                    
                    const localCount = await table.count();
                    if (!(freshData.length === 0 && localCount > 5)) {
                        const keysToDelete = allKeys.filter((k: any) => !freshIds.includes(k));
                        if (keysToDelete.length > 0) await table.bulkDelete(keysToDelete);
                    }
                    await table.bulkPut(freshData);
                });
            }
            return res.data;
        } catch (err) {
            console.warn(`GET ${endpoint} failed or timed out:`, err);
        }
    }

    if (table) {
        const localData = await table.toArray();
        if (localData.length > 0) return localData;
    }
    return [];
}

export async function handlePost(endpoint: string, data: any, actionType: OfflineAction['type']) {
    const isOnline = typeof window !== 'undefined' && navigator.onLine;

    if (isOnline) {
        try {
            const res = await api.post(endpoint, data, { timeout: 2000 });
            return res.data;
        } catch (err) {
            console.warn(`POST failed, queuing ${actionType}...`, err);
        }
    }

    if (typeof window !== 'undefined') {
        await db.syncQueue.add({
            type: actionType,
            endpoint,
            method: 'POST',
            payload: data,
            timestamp: Date.now(),
            status: 'pending'
        });
        window.dispatchEvent(new Event('sync-queue-updated'));
    }
    return { ...data, id: Date.now(), offline: true, message: 'Action enregistrée hors-ligne' };
}

export async function handlePatch(endpoint: string, data: any, actionType: OfflineAction['type']) {
    try {
        const res = await api.patch(endpoint, data, { timeout: 2000 });
        return res.data;
    } catch (err) {
        console.warn(`PATCH failed, queuing ${actionType}...`, err);
    }

    if (typeof window !== 'undefined') {
        await db.syncQueue.add({
            type: actionType,
            endpoint,
            method: 'PATCH',
            payload: data,
            timestamp: Date.now(),
            status: 'pending'
        });
    }
    return { ...data, offline: true };
}

export async function handleDelete(endpoint: string, actionType: OfflineAction['type']) {
    try {
        const res = await api.delete(endpoint, { timeout: 2000 });
        return res.data;
    } catch (err) {
        console.warn(`DELETE failed, queuing ${actionType}...`, err);
    }

    if (typeof window !== 'undefined') {
        await db.syncQueue.add({
            type: actionType,
            endpoint,
            method: 'DELETE',
            payload: {},
            timestamp: Date.now(),
            status: 'pending'
        });
    }
    return { offline: true };
}
