
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
  store: Store;
}

export type StockData = Map<string, number>;
