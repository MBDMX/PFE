import Dexie, { type EntityTable } from 'dexie';

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

export interface OfflineAction {
  id?: number;
  type: 'CREATE_WORK_ORDER' | 'UPDATE_WORK_ORDER' | 'DELETE_WORK_ORDER' | 'APPROVE_DELETION' | 'REJECT_DELETION' | 'ADD_PART' | 'CREATE_PARTS_REQUEST' | 'APPROVE_PARTS_REQUEST' | 'REJECT_PARTS_REQUEST' | 'TIMER_START' | 'TIMER_STOP' | 'SYNC_SAP_MACHINES' | 'SYNC_SAP_OTS' | 'RESET_SYSTEM';
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
  stats!: EntityTable<any, 'key'>;
  metadata!: EntityTable<SyncMetadata, 'key'>;

  constructor() {
    super('GMAO_Offline_DB');

    // v1 & v2: keep for existing clients
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

    // v3 was a broken migration (tried to change workSessions PK) — skip cleanly
    this.version(3).stores({
      syncQueue: '++id, type, status, timestamp',
      machines: 'id, reference, name',
      stock: 'id, reference, name',
      workOrders: 'id, sap_order_id, title, status',
      partsRequests: 'id, work_order_id, status',
      technicians: 'id, username, role, team',
      stockMovements: 'id, part_code, type, date',
      workSessions: '++id, work_order_id, technician_id, end_time', // ⚠️ MUST keep ++id
      stats: 'key',
      metadata: 'key'
    });

    // v4: Clean migration — clear all master data caches to remove duplicates
    this.version(4).stores({
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
    }).upgrade(tx => {
      tx.table('machines').clear();
      tx.table('stock').clear();
      tx.table('technicians').clear();
      tx.table('workOrders').clear();
      tx.table('partsRequests').clear();
      tx.table('stockMovements').clear();
      tx.table('workSessions').clear();
      tx.table('metadata').clear();
      console.log('✅ DB v4: Master data cleared — duplicates removed.');
    });
  }
}

const db = new GMAODatabase();

// 🛡️ Auto-recover if DB is corrupted (e.g. failed migration)
db.open().catch(err => {
  console.error('DB open failed, deleting and recreating:', err.message);
  Dexie.delete('GMAO_Offline_DB').then(() => {
    console.log('🔄 DB deleted. Reloading...');
    window.location.reload();
  });
});

export { db };
