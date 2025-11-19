
import React, { useState, useEffect } from 'react';
import type { BdeInfo, Store } from '../types';
import { BDE_DETAILS } from '../constants';
import { Button } from './common/Button';
import { Input } from './common/Input';
import { getStoresForBde, addStoreForBde } from '../services/storageService';

interface BdeInfoFormProps {
  onSubmit: (info: BdeInfo) => void;
}

export const BdeInfoForm: React.FC<BdeInfoFormProps> = ({ onSubmit }) => {
  const [bdeName, setBdeName] = useState('');
  const [region, setRegion] = useState('');
  
  // Store Selection State
  const [availableStores, setAvailableStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [isAddingStore, setIsAddingStore] = useState(false);

  // New Store Form State
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreBsrn, setNewStoreBsrn] = useState('');

  useEffect(() => {
    if (bdeName) {
      // Auto-fill region based on BDE selection
      const bdeDetail = BDE_DETAILS.find(b => b.name === bdeName);
      if (bdeDetail) {
        setRegion(bdeDetail.region);
      }

      const stores = getStoresForBde(bdeName);
      setAvailableStores(stores);
      setSelectedStoreId(''); // Reset selection when BDE changes
      setIsAddingStore(stores.length === 0); // Default to add mode if no stores
    } else {
      setRegion('');
      setAvailableStores([]);
    }
  }, [bdeName]);

  const handleAddStore = () => {
    if (!bdeName) return;
    
    const newStore: Store = {
      id: Date.now().toString(),
      name: newStoreName,
      bsrn: newStoreBsrn,
      location: "" // Location removed from input, setting empty default
    };

    addStoreForBde(bdeName, newStore);
    
    // Refresh list and select the new one
    setAvailableStores(getStoresForBde(bdeName));
    setSelectedStoreId(newStore.id);
    setIsAddingStore(false);
    
    // Clear form
    setNewStoreName('');
    setNewStoreBsrn('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedStore = availableStores.find(s => s.id === selectedStoreId);
    
    if (bdeName && region && selectedStore) {
      onSubmit({ bdeName, region, store: selectedStore });
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white rounded-xl shadow-xl overflow-hidden animate-fade-in">
      <div className="bg-indigo-600 px-6 py-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Identity Verification
        </h2>
        <p className="text-indigo-100 text-sm mt-1">Select your profile and store to begin.</p>
      </div>
      
      <div className="p-6 space-y-6">
        {/* BDE Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Select BDE Name</label>
          <select 
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-slate-900"
            value={bdeName}
            onChange={(e) => setBdeName(e.target.value)}
          >
            <option value="">-- Select Your Name --</option>
            {BDE_DETAILS.map(bde => (
              <option key={bde.name} value={bde.name}>{bde.name}</option>
            ))}
          </select>
        </div>

        {bdeName && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-indigo-50 px-4 py-2 rounded-md border border-indigo-100">
              <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider">Assigned Region</span>
              <p className="text-lg font-semibold text-indigo-900">{region}</p>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <div className="flex justify-between items-end mb-2">
                <label className="block text-sm font-medium text-slate-700">Store Selection</label>
                {!isAddingStore && availableStores.length > 0 && (
                  <button 
                    type="button"
                    onClick={() => setIsAddingStore(true)}
                    className="text-sm text-indigo-600 font-semibold hover:text-indigo-800"
                  >
                    + Add New Store
                  </button>
                )}
              </div>

              {isAddingStore ? (
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                  <h4 className="font-semibold text-slate-800">Add New Store</h4>
                  <Input
                    id="storeName"
                    label="Store Name"
                    value={newStoreName}
                    onChange={(e) => setNewStoreName(e.target.value)}
                    placeholder="Enter Retailer Name"
                  />
                  <Input
                    id="bsrn"
                    label="BSRN (Unique ID)"
                    value={newStoreBsrn}
                    onChange={(e) => setNewStoreBsrn(e.target.value)}
                    placeholder="e.g. ST-10023"
                  />
                  <div className="flex gap-3 pt-2">
                    <Button 
                      type="button" 
                      onClick={handleAddStore}
                      disabled={!newStoreName || !newStoreBsrn}
                      className="flex-1"
                    >
                      Save Store
                    </Button>
                    {availableStores.length > 0 && (
                      <button 
                        type="button"
                        onClick={() => setIsAddingStore(false)}
                        className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <select 
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-slate-900"
                  value={selectedStoreId}
                  onChange={(e) => setSelectedStoreId(e.target.value)}
                >
                  <option value="">-- Select Assigned Store --</option>
                  {availableStores.map(store => (
                    <option key={store.id} value={store.id}>
                      {store.name} ({store.bsrn})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        )}

        <div className="pt-4">
          <Button 
            onClick={handleSubmit} 
            disabled={!bdeName || !region || !selectedStoreId || isAddingStore}
            className="w-full"
          >
            Start Stock Audit
          </Button>
        </div>
      </div>
    </div>
  );
};
