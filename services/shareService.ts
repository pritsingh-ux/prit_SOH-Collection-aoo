import type { Store, StockData } from '../types';

interface SharePayload {
    store: Store;
    data: [string, number][]; // Array of tuples for compactness
    timestamp: number;
}

// Modern, build-safe Base64 encoding for UTF-8 strings
const utf8_to_b64 = (str: string): string => {
    try {
        const bytes = new TextEncoder().encode(str);
        const binString = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join("");
        return btoa(binString);
    } catch (e) {
        // Fallback for very old environments if needed, though rare
        return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
            function toSolidBytes(match, p1) {
                return String.fromCharCode(parseInt(p1, 16));
        }));
    }
};

const b64_to_utf8 = (str: string): string => {
    try {
        const binString = atob(str);
        const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0)!);
        return new TextDecoder().decode(bytes);
    } catch (e) {
        // Fallback
        return decodeURIComponent(atob(str).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
    }
};

// Generate a Base64 string from the audit data
export const generateShareCode = (store: Store, stockData: StockData): string => {
    try {
        const payload: SharePayload = {
            store,
            data: Array.from(stockData.entries()).filter(([_, count]) => count > 0),
            timestamp: Date.now()
        };
        const json = JSON.stringify(payload);
        return utf8_to_b64(json);
    } catch (e) {
        console.error("Failed to generate code", e);
        return "";
    }
};

// Parse the Base64 string back into data
export const parseShareCode = (code: string): { store: Store, stockData: StockData } | null => {
    try {
        // Clean the code (remove any accidental whitespace or prefixes)
        const cleanCode = code.trim().replace(/.*CODE:/, ''); 
        
        const json = b64_to_utf8(cleanCode);
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