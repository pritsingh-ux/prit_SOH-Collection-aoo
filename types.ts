
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
