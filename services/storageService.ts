import type { Store, BdeInfo, StoreAudit, Sku, StockData } from '../types';

const STORAGE_KEY = 'soh_collection_stores';
const SESSION_KEY = 'soh_current_session';

type BdeStoreMap = Record<string, Store[]>;

// --- Store Management ---

export const getStoresForBde = (bdeName: string): Store[] => {
  try {
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (!storedData) return [];
    const map: BdeStoreMap = JSON.parse(storedData);
    return map[bdeName] || [];
  } catch (e) {
    console.error("Failed to load stores", e);
    return [];
  }
};

export const addStoreForBde = (bdeName: string, store: Store): void => {
  try {
    const storedData = localStorage.getItem(STORAGE_KEY);
    let map: BdeStoreMap = {};
    if (storedData) {
      map = JSON.parse(storedData);
    }
    
    if (!map[bdeName]) {
      map[bdeName] = [];
    }

    // Check for duplicates based on BSRN
    const exists = map[bdeName].some(s => s.bsrn === store.bsrn);
    if (!exists) {
      map[bdeName].push(store);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    }
  } catch (e) {
    console.error("Failed to save store", e);
  }
};

export const removeStoreForBde = (bdeName: string, storeId: string): void => {
  try {
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (!storedData) return;
    const map: BdeStoreMap = JSON.parse(storedData);
    
    if (map[bdeName]) {
      map[bdeName] = map[bdeName].filter(s => s.id !== storeId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    }
  } catch (e) {
    console.error("Failed to remove store", e);
  }
};

// --- Crash Recovery / Session State ---

export interface SessionState {
  step: string;
  bdeInfo: BdeInfo | null;
  sessionAudits: any[]; // Changed from StoreAudit[] to any[] to fix Vercel Build error regarding Map/Array serialization type mismatch
  currentStore: Store | null;
  currentStockData: [string, number][]; // Map serialized to array
  customSkus: Sku[];
  timestamp: number;
}

export const saveSessionState = (state: Omit<SessionState, 'timestamp'>) => {
    try {
        const payload: SessionState = {
            ...state,
            timestamp: Date.now()
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
    } catch (e) {
        console.error("Auto-save failed", e);
    }
};

export const loadSessionState = (): { 
    step: any; 
    bdeInfo: BdeInfo | null; 
    sessionAudits: StoreAudit[]; 
    currentStore: Store | null; 
    currentStockData: StockData;
    customSkus: Sku[];
} | null => {
    try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        
        const data: SessionState = JSON.parse(raw);
        
        // 1. Rehydrate Current Stock Data
        // It is stored as an array of tuples [[id, count], ...]. New Map(array) works perfectly.
        let currentStockMap = new Map<string, number>();
        if (Array.isArray(data.currentStockData)) {
             currentStockMap = new Map(data.currentStockData);
        }

        // 2. Rehydrate Session Audits
        // The audit.stockData inside sessionAudits was serialized to an array in serializeState
        const hydratedAudits = data.sessionAudits.map((audit: any) => {
            let auditStockMap = new Map<string, number>();
            
            if (Array.isArray(audit.stockData)) {
                // Standard case: it's an array of tuples
                auditStockMap = new Map(audit.stockData as any);
            } else if (typeof audit.stockData === 'object' && audit.stockData !== null) {
                // Fallback case: if it was somehow saved as a plain object
                auditStockMap = new Map(Object.entries(audit.stockData));
            }

            return {
                ...audit,
                stockData: auditStockMap
            } as StoreAudit;
        });
        
        return {
            step: data.step,
            bdeInfo: data.bdeInfo,
            sessionAudits: hydratedAudits,
            currentStore: data.currentStore,
            currentStockData: currentStockMap,
            customSkus: data.customSkus || []
        };
    } catch (e) {
        console.error("Failed to load session", e);
        return null;
    }
};

export const clearSessionState = () => {
    localStorage.removeItem(SESSION_KEY);
};

// Helper to serialize deep structures
export const serializeState = (
    step: string,
    bdeInfo: BdeInfo | null,
    sessionAudits: StoreAudit[],
    currentStore: Store | null,
    currentStockData: StockData,
    customSkus: Sku[]
) => {
    // Convert Audit Maps to Arrays for storage
    const serializableAudits = sessionAudits.map(audit => ({
        ...audit,
        stockData: Array.from(audit.stockData.entries())
    }));

    saveSessionState({
        step,
        bdeInfo,
        sessionAudits: serializableAudits, 
        currentStore,
        currentStockData: Array.from(currentStockData.entries()),
        customSkus
    });
};