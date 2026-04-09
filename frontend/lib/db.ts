import Dexie, { type EntityTable } from 'dexie';

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

export interface OfflineAction {
  id?: number;
  type: 'CREATE_WORK_ORDER' | 'UPDATE_WORK_ORDER' | 'DELETE_WORK_ORDER' | 'APPROVE_DELETION' | 'REJECT_DELETION' | 'ADD_PART' | 'CREATE_PARTS_REQUEST' | 'APPROVE_PARTS_REQUEST' | 'REJECT_PARTS_REQUEST' | 'TIMER_START' | 'TIMER_STOP';
  endpoint: string;
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  payload: any;
  timestamp: number;
  status: 'pending' | 'syncing' | 'error';
  errorMessage?: string;
}

export interface SyncMetadata {
  key: string;      // 'last_sync_machines', etc.
  value: string;    // ISO timestamp
}

// ────────────────────────────────────────────
// The Database
// ────────────────────────────────────────────

class GMAODatabase extends Dexie {
  // Sync Queue (Outbox)
  syncQueue!: EntityTable<OfflineAction, 'id'>;

  // Master Data Cache
  machines!: EntityTable<any, 'id'>;
  stock!: EntityTable<any, 'id'>;
  workOrders!: EntityTable<any, 'id'>;
  partsRequests!: EntityTable<any, 'id'>;
  technicians!: EntityTable<any, 'id'>;
  stockMovements!: EntityTable<any, 'id'>;
  workSessions!: EntityTable<any, 'id'>;
  stats!: EntityTable<any, 'key'>; // We'll store stats as a single row with key='manager' or similar
  
  // Metadata (Last Sync times)
  metadata!: EntityTable<SyncMetadata, 'key'>;

  constructor() {
    super('GMAO_Offline_DB');
    this.version(2).stores({
      syncQueue: '++id, type, status, timestamp',
      machines: 'id, reference, name',
      stock: 'id, reference, name',
      workOrders: 'id, sap_order_id, title, status',
      partsRequests: 'id, work_order_id, status',
      technicians: 'id, username, role, team',
      stockMovements: 'id, part_code, type, date',
      workSessions: '++id, work_order_id, technician_id, end_time',
      stats: 'key',
      metadata: 'key'
    });
  }
}

const db = new GMAODatabase();

export { db };
