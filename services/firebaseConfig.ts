import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, Timestamp, deleteDoc, doc } from 'firebase/firestore';
import type { DbSubmission, StoreAudit, BdeInfo } from '../types';

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

export const saveAuditsToCloud = async (bdeInfo: BdeInfo, sessionAudits: StoreAudit[]) => {
    try {
        const batchTimestamp = Timestamp.now();
        const dateString = new Date().toISOString().split('T')[0];

        // We save each store audit as a separate document for easier querying later
        const promises = sessionAudits.map(audit => {
            // Convert Map to Object for Firestore
            const stockObj: Record<string, number> = {};
            audit.stockData.forEach((val, key) => {
                stockObj[key] = val;
            });
            
            const totalQty = Array.from(audit.stockData.values()).reduce((a, b) => a + b, 0);

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