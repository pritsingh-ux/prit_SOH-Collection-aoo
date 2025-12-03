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

export type StockData = Map<string, number>;

export interface StoreAudit {
  id: string;
  store: Store;
  stockData: StockData;
  timestamp: number;
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
    stockData: Record<string, number>; // Firestore doesn't save Maps natively
    totalQty: number;
    timestamp: any; // Firestore Timestamp
    dateString: string; // YYYY-MM-DD for easier indexing
}