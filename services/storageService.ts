
import type { Store } from '../types';

const STORAGE_KEY = 'soh_collection_stores';

type BdeStoreMap = Record<string, Store[]>;

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
