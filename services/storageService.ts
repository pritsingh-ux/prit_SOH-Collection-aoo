
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

// --- Crash Recovery / Session State ---

export interface SessionState {
  step: string;
  bdeInfo: BdeInfo | null;
  sessionAudits: StoreAudit[];
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
        
        // Rehydrate Map
        const stockMap = new Map<string, number>(data.currentStockData);

        // Rehydrate Audits (Maps inside objects)
        const hydratedAudits = data.sessionAudits.map(audit => ({
            ...audit,
            stockData: new Map(audit.stockData as any) // Handling the serialized map in audits if necessary, though usually we serialize before saving
        }));
        
        // Fix for audits: The StockData in audits is also a Map, which JSON.stringify converts to {} or needs manual handling.
        // In App.tsx we keep it as Map. When saving, we need to ensure audit.stockData is serializable.
        // NOTE: For simplicity in this architecture, we will assume sessionAudits in localStorage 
        // are stored with stockData as Array entries (serialization logic handles this below).
        
        return {
            step: data.step,
            bdeInfo: data.bdeInfo,
            sessionAudits: hydratedAudits.map(a => ({
                ...a,
                stockData: Array.isArray(a.stockData) ? new Map(a.stockData) : new Map(Object.entries(a.stockData || {}))
            })),
            currentStore: data.currentStore,
            currentStockData: stockMap,
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
        sessionAudits: serializableAudits as any, // Type assertion for storage
        currentStore,
        currentStockData: Array.from(currentStockData.entries()),
        customSkus
    });
};
