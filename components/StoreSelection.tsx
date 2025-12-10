import React, { useState, useEffect, useRef } from 'react';
import type { Store } from '../types';
import { Button } from './common/Button';
import { Input } from './common/Input';
import { getStoresForBde, addStoreForBde, removeStoreForBde } from '../services/storageService';
import { MASTER_STORES } from '../constants';

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

  // Autocomplete State
  const [filteredSuggestions, setFilteredSuggestions] = useState<{id: string, name: string}[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Delete Modal State
  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, store: Store | null}>({
      isOpen: false,
      store: null
  });

  useEffect(() => {
    loadStores();
  }, [bdeName]);

  const loadStores = () => {
      const stores = getStoresForBde(bdeName);
      setAvailableStores(stores);
      if (stores.length === 0) {
          setIsAddingStore(true);
      }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setNewStoreName(val);
      
      // Filter Suggestions
      if (val.length > 0) {
          const matches = MASTER_STORES.filter(s => 
              s.name.toLowerCase().includes(val.toLowerCase()) || 
              s.id.toLowerCase().includes(val.toLowerCase())
          ).slice(0, 8); // Limit to 8 suggestions
          setFilteredSuggestions(matches);
          setShowSuggestions(true);
      } else {
          setShowSuggestions(false);
      }
  };

  const selectSuggestion = (store: {id: string, name: string}) => {
      setNewStoreName(store.name);
      setNewStoreBsrn(store.id);
      setShowSuggestions(false);
  };

  const handleAddStore = () => {
    const newStore: Store = {
      id: Date.now().toString(),
      name: newStoreName,
      bsrn: newStoreBsrn,
      location: "" 
    };

    addStoreForBde(bdeName, newStore);
    
    // Refresh list
    loadStores();
    setIsAddingStore(false);
    
    // Clear form
    setNewStoreName('');
    setNewStoreBsrn('');
  };

  const handleDeleteClick = (e: React.MouseEvent, store: Store) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteModal({ isOpen: true, store });
  };

  const confirmDelete = () => {
      if (deleteModal.store) {
        removeStoreForBde(bdeName, deleteModal.store.id);
        loadStores();
        setDeleteModal({ isOpen: false, store: null });
      }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden animate-fade-in relative min-h-[400px]">
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
                                <div
                                    key={store.id}
                                    className={`flex items-stretch rounded-xl border transition-all group relative overflow-hidden ${
                                        isAudited 
                                            ? 'bg-emerald-50 border-emerald-200 opacity-90' 
                                            : 'border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 bg-white'
                                    }`}
                                >
                                    <button
                                        onClick={() => !isAudited && onSelectStore(store)}
                                        disabled={isAudited}
                                        className={`flex-1 flex items-center justify-between p-4 text-left outline-none ${isAudited ? 'cursor-not-allowed' : 'cursor-pointer'}`}
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
                                    
                                    {!isAudited && (
                                        <button
                                            type="button"
                                            onClick={(e) => handleDeleteClick(e, store)}
                                            className="w-14 bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors border-l border-slate-100 hover:border-red-100 flex items-center justify-center z-10 cursor-pointer"
                                            title="Delete Store"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
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
                <div className="space-y-4 animate-fade-in relative">
                     <div className="bg-blue-50 p-4 rounded-lg mb-4">
                        <p className="text-sm text-blue-800">Search for a store to auto-fill ID, or enter details manually.</p>
                     </div>
                     
                     {/* Store Search / Name Input */}
                     <div className="relative">
                        <Input
                            id="storeName"
                            label="Store Name"
                            value={newStoreName}
                            onChange={handleNameChange}
                            placeholder="Search or Enter Store Name..."
                            autoComplete="off"
                        />
                        {/* Suggestions Dropdown */}
                        {showSuggestions && filteredSuggestions.length > 0 && (
                            <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                                {filteredSuggestions.map(s => (
                                    <button
                                        key={s.id}
                                        onClick={() => selectSuggestion(s)}
                                        className="w-full text-left px-4 py-3 hover:bg-indigo-50 border-b border-slate-50 last:border-0 transition-colors flex justify-between items-center group"
                                    >
                                        <span className="font-bold text-slate-700 group-hover:text-indigo-700">{s.name}</span>
                                        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded group-hover:bg-indigo-100 group-hover:text-indigo-600">{s.id}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                     </div>

                      <div className="relative">
                        <Input
                            id="bsrn"
                            label="Store Id"
                            value={newStoreBsrn}
                            onChange={(e) => setNewStoreBsrn(e.target.value)}
                            placeholder="Auto-filled or Enter Manually"
                        />
                        {newStoreBsrn && (
                             <div className="absolute right-3 top-8 text-emerald-500 pointer-events-none">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                             </div>
                        )}
                      </div>

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
        
        {/* Delete Confirmation Modal */}
        {deleteModal.isOpen && deleteModal.store && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 animate-fade-in">
                <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6">
                    <div className="flex justify-center mb-4 text-red-100">
                         <div className="p-3 bg-red-100 rounded-full">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                         </div>
                    </div>
                    <h3 className="text-lg font-bold text-center text-slate-900 mb-2">Delete Store?</h3>
                    <p className="text-sm text-center text-slate-500 mb-6">
                        Remove <span className="font-bold text-slate-800">{deleteModal.store.name}</span> from your saved list?
                    </p>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => setDeleteModal({isOpen: false, store: null})}
                            className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={confirmDelete}
                            className="flex-1 px-4 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};