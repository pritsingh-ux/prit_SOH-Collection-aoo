export type UserRole = 'BDE' | 'BA';

export interface Sku {
  id: string;
  name: string;
  type: 'Natural' | 'Professional' | 'Custom';
  category: 'Hair' | 'Skin' | 'Body' | 'Gifting' | 'Other';
}

export interface Store {
  id: string; // Generated ID
  name: string;
  bsrn: string; // Unique Store ID
  location?: string; // Optional/Legacy
}

export interface BdeInfo {
  bdeName: string;
  region: string;
  role: UserRole;
}

export interface StockBatch {
  qty: number;
  expiryDate: string;
}

export interface StockEntry {
  batches: StockBatch[];
}

export type StockData = Map<string, StockEntry>;

export interface StoreAudit {
  id: string;
  store: Store;
  stockData: StockData;
  timestamp: number;
}

export interface DistributorMapping {
    docId?: string;
    storeId: string;
    storeName: string;
    distributor: string;
    superDistributor: string;
    region: string;
    updatedAt: any;
}

export interface AuditLog {
    docId?: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'BULK_UPLOAD';
    entity: 'MAPPING' | 'SUBMISSION';
    details: string;
    adminName: string;
    timestamp: any;
}

// Data structure for Firestore
export interface DbSubmission {
    docId?: string; // Firebase Document ID (needed for deletion)
    bdeName: string;
    region: string;
    role: UserRole;
    storeName: string;
    storeId: string;
    auditId: string;
    stockData: Record<string, StockEntry>; // Firestore doesn't save Maps natively
    totalQty: number;
    timestamp: any; // Firestore Timestamp
    dateString: string; // YYYY-MM-DD for easier indexing
}