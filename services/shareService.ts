import type { Store, StockData } from '../types';

interface SharePayload {
    store: Store;
    data: [string, number][]; // Array of tuples for compactness
    timestamp: number;
}

// Generate a Base64 string from the audit data
export const generateShareCode = (store: Store, stockData: StockData): string => {
    try {
        const payload: SharePayload = {
            store,
            data: Array.from(stockData.entries()).filter(([_, count]) => count > 0),
            timestamp: Date.now()
        };
        const json = JSON.stringify(payload);
        // UTF-8 safe Base64 encoding
        return btoa(unescape(encodeURIComponent(json)));
    } catch (e) {
        console.error("Failed to generate code", e);
        return "";
    }
};

// Parse the Base64 string back into data
export const parseShareCode = (code: string): { store: Store, stockData: StockData } | null => {
    try {
        // Clean the code (remove any accidental whitespace or prefixes if user copied messy text)
        const cleanCode = code.trim().replace(/.*CODE:/, ''); 
        
        const json = decodeURIComponent(escape(atob(cleanCode)));
        const payload: SharePayload = JSON.parse(json);
        
        if (!payload.store || !payload.data) throw new Error("Invalid payload structure");

        return {
            store: payload.store,
            stockData: new Map(payload.data)
        };
    } catch (e) {
        console.error("Invalid code", e);
        return null;
    }
};