// @ts-nocheck
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, Timestamp, deleteDoc, doc, updateDoc, writeBatch, setDoc } from 'firebase/firestore';
import type { DbSubmission, StoreAudit, BdeInfo, DistributorMapping, AuditLog } from '../types';

// Configuration provided by user
const firebaseConfig = {
  apiKey: "AIzaSyAkHqvJXJXnK9cFTYu9HyhVwDsudAB035k",
  authDomain: "prit-brillare-soh-app.firebaseapp.com",
  projectId: "prit-brillare-soh-app",
  storageBucket: "prit-brillare-soh-app.firebasestorage.app",
  messagingSenderId: "935547328654",
  appId: "1:935547328654:web:83f291924c5692d30651df",
  measurementId: "G-Q96M4PBHTZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- HELPER FUNCTIONS ---

export const addAuditLog = async (log: Omit<AuditLog, 'docId' | 'timestamp'>) => {
    try {
        await addDoc(collection(db, 'auditLogs'), {
            ...log,
            timestamp: Timestamp.now()
        });
    } catch (e) {
        console.error("Error adding audit log:", e);
    }
};

export const getAuditLogs = async (): Promise<AuditLog[]> => {
    try {
        const q = query(collection(db, 'auditLogs'));
        const querySnapshot = await getDocs(q);
        const results: AuditLog[] = [];
        querySnapshot.forEach((doc) => {
            results.push({ ...doc.data(), docId: doc.id } as AuditLog);
        });
        return results;
    } catch (e) {
        console.error("Error fetching audit logs:", e);
        return [];
    }
};

export const getMappings = async (): Promise<DistributorMapping[]> => {
    try {
        const q = query(collection(db, 'mappings'));
        const querySnapshot = await getDocs(q);
        const results: DistributorMapping[] = [];
        querySnapshot.forEach((doc) => {
            results.push({ ...doc.data(), docId: doc.id } as DistributorMapping);
        });
        return results;
    } catch (e) {
        console.error("Error fetching mappings:", e);
        return [];
    }
};

export const saveMapping = async (mapping: Omit<DistributorMapping, 'docId' | 'updatedAt'>, adminName: string) => {
    try {
        const docRef = await addDoc(collection(db, 'mappings'), {
            ...mapping,
            updatedAt: Timestamp.now()
        });
        await addAuditLog({
            action: 'CREATE',
            entity: 'MAPPING',
            details: `Created mapping for store ${mapping.storeName} (${mapping.storeId})`,
            adminName
        });
        return docRef.id;
    } catch (e) {
        console.error("Error saving mapping:", e);
        return null;
    }
};

export const updateMapping = async (docId: string, mapping: Partial<DistributorMapping>, adminName: string) => {
    try {
        const mappingRef = doc(db, 'mappings', docId);
        await updateDoc(mappingRef, {
            ...mapping,
            updatedAt: Timestamp.now()
        });
        await addAuditLog({
            action: 'UPDATE',
            entity: 'MAPPING',
            details: `Updated mapping for docId ${docId}`,
            adminName
        });
        return true;
    } catch (e) {
        console.error("Error updating mapping:", e);
        return false;
    }
};

export const deleteMapping = async (docId: string, storeName: string, adminName: string) => {
    try {
        await deleteDoc(doc(db, 'mappings', docId));
        await addAuditLog({
            action: 'DELETE',
            entity: 'MAPPING',
            details: `Deleted mapping for store ${storeName}`,
            adminName
        });
        return true;
    } catch (e) {
        console.error("Error deleting mapping:", e);
        return false;
    }
};

export const bulkUploadMappings = async (mappings: Omit<DistributorMapping, 'docId' | 'updatedAt'>[], adminName: string) => {
    try {
        const batch = writeBatch(db);
        const mappingsCol = collection(db, 'mappings');
        const timestamp = Timestamp.now();

        mappings.forEach(m => {
            const newDocRef = doc(mappingsCol);
            batch.set(newDocRef, {
                ...m,
                updatedAt: timestamp
            });
        });

        await batch.commit();
        await addAuditLog({
            action: 'BULK_UPLOAD',
            entity: 'MAPPING',
            details: `Bulk uploaded ${mappings.length} mappings`,
            adminName
        });
        return true;
    } catch (e) {
        console.error("Error bulk uploading mappings:", e);
        return false;
    }
};

export const saveAuditsToCloud = async (bdeInfo: BdeInfo, sessionAudits: StoreAudit[]) => {
    try {
        const batchTimestamp = Timestamp.now();
        const dateString = new Date().toISOString().split('T')[0];

        // We save each store audit as a separate document for easier querying later
        const promises = sessionAudits.map(audit => {
            // Convert Map to Object for Firestore
            const stockObj: Record<string, StockEntry> = {};
            audit.stockData.forEach((val, key) => {
                stockObj[key] = val;
            });
            
            const totalQty = Array.from(audit.stockData.values()).reduce((a, entry: any) => {
                const entryTotal = (entry.batches || []).reduce((sum: number, batch: any) => sum + (Number(batch.qty) || 0), 0);
                return a + entryTotal;
            }, 0);

            const submission: DbSubmission = {
                bdeName: bdeInfo.bdeName,
                region: bdeInfo.region,
                role: bdeInfo.role,
                storeName: audit.store.name,
                storeId: audit.store.bsrn,
                auditId: audit.id,
                stockData: stockObj,
                totalQty: totalQty,
                timestamp: batchTimestamp,
                dateString: dateString
            };

            return addDoc(collection(db, 'audits'), submission);
        });

        await Promise.all(promises);
        console.log("Synced to cloud successfully");
        return true;
    } catch (e: any) {
        console.error("Error adding document: ", e);
        
        // Specific error handling for permissions
        if (e.code === 'permission-denied' || e.message?.includes('Missing or insufficient permissions')) {
            alert("⚠️ Database Permission Denied.\n\nPlease go to Firebase Console > Firestore Database > Rules and change 'allow read, write: if false;' to 'allow read, write: if true;'");
        } else {
            alert(`Cloud Sync Failed: ${e.message || "Unknown Error"}. Please check internet or Admin Database setup.`);
        }
        return false;
    }
};

export const getAllSubmissions = async (): Promise<DbSubmission[]> => {
    try {
        // REMOVED orderBy('timestamp', 'desc') to prevent missing index errors
        const q = query(collection(db, 'audits'));
        const querySnapshot = await getDocs(q);
        
        const results: DbSubmission[] = [];
        querySnapshot.forEach((doc) => {
            results.push({ ...doc.data(), docId: doc.id } as DbSubmission);
        });
        return results;
    } catch (e: any) {
        console.error("Error fetching documents: ", e);
        if (e.code === 'permission-denied') {
             throw new Error("Permission Denied: Check Firestore Rules");
        }
        throw e;
    }
};

export const deleteSubmissionFromCloud = async (docId: string): Promise<boolean> => {
    try {
        await deleteDoc(doc(db, 'audits', docId));
        return true;
    } catch (e) {
        console.error("Error deleting document: ", e);
        alert("Failed to delete submission.");
        return false;
    }
};

export const bulkDeleteMappings = async (docIds: string[], adminName: string): Promise<boolean> => {
    try {
        const batch = writeBatch(db);
        docIds.forEach(id => {
            batch.delete(doc(db, 'mappings', id));
        });
        await batch.commit();
        await addAuditLog({
            action: 'DELETE',
            entity: 'MAPPING',
            details: `Bulk deleted ${docIds.length} mappings`,
            adminName
        });
        return true;
    } catch (e) {
        console.error("Error bulk deleting mappings:", e);
        alert("Failed to delete multiple mappings.");
        return false;
    }
};

export const bulkDeleteSubmissions = async (docIds: string[]): Promise<boolean> => {
    try {
        const batch = writeBatch(db);
        docIds.forEach(id => {
            batch.delete(doc(db, 'audits', id));
        });
        await batch.commit();
        return true;
    } catch (e) {
        console.error("Error bulk deleting documents: ", e);
        alert("Failed to delete multiple submissions.");
        return false;
    }
};

// --- APP CONFIG ---
export const getAppConfig = async (): Promise<AppConfig | null> => {
    try {
        const q = query(collection(db, 'config'));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) return null;
        return { ...querySnapshot.docs[0].data(), docId: querySnapshot.docs[0].id } as AppConfig;
    } catch (e) {
        console.error("Error fetching app config:", e);
        return null;
    }
};

export const updateAppConfig = async (config: Partial<AppConfig>) => {
    try {
        const q = query(collection(db, 'config'));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            await addDoc(collection(db, 'config'), {
                expiryEnabled: true,
                ...config,
                updatedAt: Timestamp.now()
            });
        } else {
            const configRef = doc(db, 'config', querySnapshot.docs[0].id);
            await updateDoc(configRef, {
                ...config,
                updatedAt: Timestamp.now()
            });
        }
        return true;
    } catch (e) {
        console.error("Error updating app config:", e);
        return false;
    }
};

// --- MASTER DATA ---

const getMaster = async <T>(colName: string): Promise<T[]> => {
    try {
        const q = query(collection(db, colName));
        const querySnapshot = await getDocs(q);
        const results: T[] = [];
        querySnapshot.forEach((doc) => {
            results.push({ ...doc.data(), id: doc.id } as T);
        });
        return results;
    } catch (e) {
        console.error(`Error fetching ${colName}:`, e);
        return [];
    }
};

const saveMaster = async <T>(colName: string, data: any) => {
    try {
        const docRef = await addDoc(collection(db, colName), data);
        return docRef.id;
    } catch (e) {
        console.error(`Error saving ${colName}:`, e);
        return null;
    }
};

const saveMasterWithId = async <T>(colName: string, id: string, data: any) => {
    try {
        await setDoc(doc(db, colName, id), data);
        return id;
    } catch (e) {
        console.error(`Error saving ${colName} with id ${id}:`, e);
        return null;
    }
};

const updateMaster = async (colName: string, id: string, data: any) => {
    try {
        await updateDoc(doc(db, colName, id), data);
        return true;
    } catch (e) {
        console.error(`Error updating ${colName}:`, e);
        return false;
    }
};

const deleteMaster = async (colName: string, id: string) => {
    try {
        await deleteDoc(doc(db, colName, id));
        return true;
    } catch (e) {
        console.error(`Error deleting ${colName}:`, e);
        return false;
    }
};

export const getMasterBdes = () => getMaster<MasterBde>('masterBdes');
export const saveMasterBde = (data: Omit<MasterBde, 'id'>) => saveMaster('masterBdes', data);
export const updateMasterBde = (id: string, data: Partial<MasterBde>) => updateMaster('masterBdes', id, data);
export const deleteMasterBde = (id: string) => deleteMaster('masterBdes', id);

export const getMasterProducts = () => getMaster<MasterProduct>('masterProducts');
export const saveMasterProduct = (data: MasterProduct) => {
    const { id, ...rest } = data;
    return saveMasterWithId('masterProducts', id, rest);
};
export const updateMasterProduct = (id: string, data: Partial<MasterProduct>) => updateMaster('masterProducts', id, data);
export const deleteMasterProduct = (id: string) => deleteMaster('masterProducts', id);

export const getMasterSuperDistributors = () => getMaster<MasterSuperDistributor>('masterSuperDistributors');
export const saveMasterSuperDistributor = (data: Omit<MasterSuperDistributor, 'id'>) => saveMaster('masterSuperDistributors', data);
export const updateMasterSuperDistributor = (id: string, data: Partial<MasterSuperDistributor>) => updateMaster('masterSuperDistributors', id, data);
export const deleteMasterSuperDistributor = (id: string) => deleteMaster('masterSuperDistributors', id);

export const getMasterDistributors = () => getMaster<MasterDistributor>('masterDistributors');
export const saveMasterDistributor = (data: Omit<MasterDistributor, 'id'>) => saveMaster('masterDistributors', data);
export const updateMasterDistributor = (id: string, data: Partial<MasterDistributor>) => updateMaster('masterDistributors', id, data);
export const deleteMasterDistributor = (id: string) => deleteMaster('masterDistributors', id);

export const getMasterStores = () => getMaster<MasterStore>('masterStores');
export const saveMasterStore = (data: MasterStore) => {
    const { id, ...rest } = data;
    return saveMasterWithId('masterStores', id, rest);
};
export const updateMasterStore = (id: string, data: Partial<MasterStore>) => updateMaster('masterStores', id, data);
export const deleteMasterStore = (id: string) => deleteMaster('masterStores', id);

export const initializeMasterData = async (data: {
    bdes: any[],
    products: any[],
    superDists: any[],
    dists: any[],
    stores: any[]
}) => {
    try {
        const batch = writeBatch(db);
        
        // 1. Super Distributors
        const superDistRefs = new Map();
        data.superDists.forEach(sd => {
            const ref = doc(collection(db, 'masterSuperDistributors'));
            batch.set(ref, sd);
            superDistRefs.set(sd.name, ref.id);
        });

        // 2. Distributors
        const distRefs = new Map();
        data.dists.forEach(d => {
            const ref = doc(collection(db, 'masterDistributors'));
            const superDistId = superDistRefs.get(d.superDistName) || '';
            const { superDistName, ...distData } = d;
            batch.set(ref, { ...distData, superDistributorId: superDistId });
            distRefs.set(d.name, ref.id);
        });

        // 3. BDEs
        data.bdes.forEach(bde => {
            const ref = doc(collection(db, 'masterBdes'));
            batch.set(ref, bde);
        });

        // 4. Products
        data.products.forEach(p => {
            const { id, ...rest } = p;
            const ref = doc(db, 'masterProducts', id);
            batch.set(ref, rest);
        });

        // 5. Stores
        data.stores.forEach(s => {
            const { id, distributorName, ...storeData } = s;
            const distId = distRefs.get(distributorName) || '';
            const ref = doc(db, 'masterStores', id);
            batch.set(ref, { ...storeData, distributorId: distId });
        });

        await batch.commit();
        return true;
    } catch (e) {
        console.error("Initialization failed:", e);
        throw e;
    }
};

export const clearMasterData = async () => {
    try {
        const collections = ['masterBdes', 'masterProducts', 'masterSuperDistributors', 'masterDistributors', 'masterStores'];
        for (const colName of collections) {
            const q = query(collection(db, colName));
            const snapshot = await getDocs(q);
            const batch = writeBatch(db);
            snapshot.forEach(d => batch.delete(d.ref));
            await batch.commit();
        }
        return true;
    } catch (e) {
        console.error("Clear master data failed:", e);
        return false;
    }
};
