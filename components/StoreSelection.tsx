
import React, { useState, useEffect } from 'react';
import type { Store } from '../types';
import { Button } from './common/Button';
import { Input } from './common/Input';
import { getStoresForBde, addStoreForBde } from '../services/storageService';

interface StoreSelectionProps {
  bdeName: string;
  onSelectStore: (store: Store) => void;
  onBack: () => void;
  auditedStoreIds: string[];
}

export const StoreSelection: React.FC<StoreSelectionProps> = ({ bdeName, onSelectStore, onBack, auditedStoreIds }) => {
  const [availableStores, setAvailableStores] = useState<Store[]>([]);
  const [isAddingStore, setIsAddingStore] = useState(false);

  // New Store Form State
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreBsrn, setNewStoreBsrn] = useState('');

  useEffect(() => {
    const stores = getStoresForBde(bdeName);
    setAvailableStores(stores);
    if (stores.length === 0) {
        setIsAddingStore(true);
    }
  }, [bdeName]);

  const handleAddStore = () => {
    const newStore: Store = {
      id: Date.now().toString(),
      name: newStoreName,
      bsrn: newStoreBsrn,
      location: "" 
    };

    addStoreForBde(bdeName, newStore);
    
    // Refresh list
    setAvailableStores(getStoresForBde(bdeName));
    setIsAddingStore(false);
    
    // Clear form
    setNewStoreName('');
    setNewStoreBsrn('');
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden animate-fade-in">
        <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50">
            <button onClick={onBack} className="text-slate-400 hover:text-slate-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
            </button>
            <h2 className="font-bold text-slate-800">Select Store to Audit</h2>
        </div>

        <div className="p-6">
            {!isAddingStore ? (
                <div className="space-y-4">
                    <div className="grid gap-3">
                        {availableStores.map(store => {
                            const isAudited = auditedStoreIds.includes(store.id);
                            return (
                                <button
                                    key={store.id}
                                    onClick={() => onSelectStore(store)}
                                    disabled={isAudited}
                                    className={`flex items-center justify-between p-4 rounded-xl border transition-all group text-left relative overflow-hidden ${
                                        isAudited 
                                            ? 'bg-emerald-50 border-emerald-200 opacity-90 cursor-not-allowed' 
                                            : 'border-slate-200 hover:border-indigo-500 hover:bg-indigo-50'
                                    }`}
                                >
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className={`font-bold ${isAudited ? 'text-emerald-800' : 'text-slate-900 group-hover:text-indigo-700'}`}>
                                                {store.name}
                                            </p>
                                            {isAudited && (
                                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wide">
                                                    Completed
                                                </span>
                                            )}
                                        </div>
                                        <p className={`text-sm ${isAudited ? 'text-emerald-600' : 'text-slate-500'}`}>Store Id: {store.bsrn}</p>
                                    </div>
                                    <div className={isAudited ? 'text-emerald-500' : 'text-slate-300 group-hover:text-indigo-500'}>
                                        {isAudited ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                    
                    <div className="pt-4 border-t border-slate-100">
                        <button 
                            onClick={() => setIsAddingStore(true)}
                            className="w-full py-3 border-2 border-dashed border-indigo-300 text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                            Add New Store
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-4 animate-fade-in">
                     <div className="bg-blue-50 p-4 rounded-lg mb-4">
                        <p className="text-sm text-blue-800">Enter store details once. It will be saved for future visits.</p>
                     </div>
                     <Input
                        id="storeName"
                        label="Store Name"
                        value={newStoreName}
                        onChange={(e) => setNewStoreName(e.target.value)}
                        placeholder="Enter Retailer Name"
                      />
                      <Input
                        id="bsrn"
                        label="Store Id (Unique ID)"
                        value={newStoreBsrn}
                        onChange={(e) => setNewStoreBsrn(e.target.value)}
                        placeholder="e.g. ST-10023"
                      />
                      <div className="flex gap-3 pt-4">
                        <Button 
                          onClick={handleAddStore}
                          disabled={!newStoreName || !newStoreBsrn}
                          className="flex-1"
                        >
                          Save & Continue
                        </Button>
                        {availableStores.length > 0 && (
                            <button 
                                onClick={() => setIsAddingStore(false)}
                                className="px-6 py-3 text-slate-600 font-medium hover:bg-slate-100 rounded-lg"
                            >
                                Cancel
                            </button>
                        )}
                      </div>
                </div>
            )}
        </div>
    </div>
  );
};
