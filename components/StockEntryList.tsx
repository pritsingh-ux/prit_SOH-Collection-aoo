import React, { useState, useMemo } from 'react';
import type { Sku, StockData } from '../types';
import { SKU_CATEGORIES } from '../constants';
import { Button } from './common/Button';
import { Input } from './common/Input';

interface StockEntryListProps {
  initialStockData: StockData;
  availableSkus: Sku[];
  onSubmit: (data: StockData) => void;
  onBack: () => void;
  onAddSku: (sku: Sku) => void;
  retailerName: string;
}

const SkuItem: React.FC<{ sku: Sku; count: number; onCountChange: (newCount: number) => void }> = ({ sku, count, onCountChange }) => {
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
        if (!isNaN(value) && value >= 0) {
            onCountChange(value);
        }
    };
    
    const increment = () => onCountChange(count + 1);
    const decrement = () => onCountChange(Math.max(0, count - 1));

    return (
        <div className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-200 ${count > 0 ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-slate-100'}`}>
            <div className="flex-1 mr-3 overflow-hidden">
                <div className="flex items-center gap-2 mb-1">
                   <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${sku.type === 'Professional' ? 'bg-slate-800 text-white' : sku.type === 'Custom' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}`}>
                     {sku.type}
                   </span>
                   <span className="text-xs text-slate-400 font-mono">{sku.id}</span>
                </div>
                <p className="font-medium text-slate-800 text-sm leading-tight line-clamp-2">{sku.name}</p>
            </div>
            
            <div className="flex items-center bg-white rounded-lg border border-slate-200 shadow-sm h-10">
                <button 
                  onClick={decrement} 
                  className="w-10 h-full text-slate-500 hover:text-indigo-600 hover:bg-slate-50 active:bg-slate-100 rounded-l-lg flex items-center justify-center transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
                <input
                    type="number"
                    value={count === 0 ? '' : count}
                    onChange={handleInputChange}
                    placeholder="0"
                    className="w-12 text-center font-bold text-lg text-slate-900 bg-white border-x border-slate-200 focus:outline-none focus:bg-indigo-50 h-full"
                />
                <button 
                  onClick={increment} 
                  className="w-10 h-full text-slate-500 hover:text-indigo-600 hover:bg-slate-50 active:bg-slate-100 rounded-r-lg flex items-center justify-center transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                </button>
            </div>
        </div>
    );
};


export const StockEntryList: React.FC<StockEntryListProps> = ({ initialStockData, availableSkus, onSubmit, onBack, onAddSku, retailerName }) => {
  const [stockData, setStockData] = useState<StockData>(() => new Map(initialStockData));
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  
  // Add Item Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCode, setNewItemCode] = useState('');

  const handleCountChange = (skuId: string, newCount: number) => {
    setStockData(prev => {
      const newMap = new Map(prev);
      newMap.set(skuId, newCount);
      return newMap;
    });
  };
  
  const handleAddNewItem = () => {
    if(newItemName && newItemCode) {
        const newSku: Sku = {
            id: newItemCode.toUpperCase(),
            name: newItemName,
            type: 'Custom', 
            category: 'Other'
        };
        onAddSku(newSku);
        
        setNewItemName('');
        setNewItemCode('');
        setIsAddModalOpen(false);
        
        setActiveCategory('Other'); 
        setSearchTerm(newItemCode.toUpperCase());
    }
  };

  const filteredSkus = useMemo(() => {
    let skus = availableSkus;

    if (activeCategory !== 'All') {
      skus = skus.filter(sku => sku.category === activeCategory);
    }

    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      skus = skus.filter(sku =>
        sku.name.toLowerCase().includes(lowerTerm) ||
        sku.id.toLowerCase().includes(lowerTerm)
      );
    }

    return skus;
  }, [searchTerm, activeCategory, availableSkus]);
  
  const totalItems = Array.from(stockData.values()).reduce((sum: number, count: number) => sum + count, 0);
  const itemsFilled = Array.from(stockData.values()).filter((count: number) => count > 0).length;
  
  const dynamicCategories = [...SKU_CATEGORIES, 'Other'];

  return (
    <div className="animate-fade-in pb-20 relative">
        {isAddModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 animate-fade-in">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Add Custom Item</h3>
                    <div className="space-y-4">
                        <Input 
                            id="newItemCode" 
                            label="Item Code" 
                            placeholder="e.g. NEW001" 
                            value={newItemCode}
                            onChange={e => setNewItemCode(e.target.value)}
                        />
                         <Input 
                            id="newItemName" 
                            label="Item Name" 
                            placeholder="e.g. Special Shampoo" 
                            value={newItemName}
                            onChange={e => setNewItemName(e.target.value)}
                        />
                        <div className="flex gap-3 pt-2">
                            <Button onClick={handleAddNewItem} disabled={!newItemName || !newItemCode}>Add Item</Button>
                            <button 
                                onClick={() => setIsAddModalOpen(false)}
                                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        <div className="sticky top-0 bg-slate-50 z-20 pb-2">
             <div className="bg-white shadow-sm p-4 rounded-b-xl mb-3 border-b border-slate-100">
               <div className="flex items-center gap-3 mb-3">
                 <button 
                    onClick={onBack}
                    className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
                    aria-label="Cancel"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                 </button>
                 <div className="flex-1">
                   <div className="flex items-center gap-1">
                       <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Audit In Progress</p>
                       <span className="text-emerald-600">•</span>
                       <span className="flex items-center gap-0.5 text-[10px] text-emerald-600 font-medium">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                         </svg>
                         Auto-saved
                       </span>
                   </div>
                   <h2 className="text-xl font-bold text-slate-800 leading-tight truncate">{retailerName}</h2>
                 </div>
                 <div className="text-right min-w-fit pl-2">
                    <span className="block text-2xl font-bold text-indigo-600 leading-none">{itemsFilled}</span>
                    <span className="text-xs text-slate-500">SKUs</span>
                 </div>
               </div>
               
               <div className="flex gap-2">
                   <div className="relative flex-1">
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                       <svg className="h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                         <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                       </svg>
                     </div>
                     <input
                        type="text"
                        placeholder="Search items..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900 transition-all"
                     />
                   </div>
                   <button 
                     onClick={() => setIsAddModalOpen(true)}
                     className="bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg font-medium text-sm hover:bg-indigo-100 whitespace-nowrap"
                   >
                     + New
                   </button>
               </div>
             </div>

             <div className="flex overflow-x-auto pb-1 px-2 gap-2 no-scrollbar" style={{ scrollbarWidth: 'none' }}>
               {dynamicCategories.map(cat => (
                 <button
                   key={cat}
                   onClick={() => setActiveCategory(cat)}
                   className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all shadow-sm ${
                     activeCategory === cat 
                       ? 'bg-indigo-600 text-white ring-2 ring-indigo-200' 
                       : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                   }`}
                 >
                   {cat}
                 </button>
               ))}
             </div>
        </div>
      
        <div className="mt-2 px-2 space-y-2">
            {filteredSkus.length > 0 ? (
              filteredSkus.map(sku => (
                  <SkuItem
                      key={sku.id}
                      sku={sku}
                      count={stockData.get(sku.id) || 0}
                      onCountChange={(newCount) => handleCountChange(sku.id, newCount)}
                  />
              ))
            ) : (
              <div className="text-center py-12 opacity-50">
                <p className="text-lg font-semibold">No items found</p>
                <p className="text-sm">Try changing the filter or search term</p>
              </div>
            )}
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-30">
           <div className="max-w-4xl mx-auto flex gap-4 items-center">
             <div className="flex-1">
                <p className="text-xs text-slate-500">Total Qty</p>
                <p className="text-xl font-bold text-indigo-900">{totalItems}</p>
             </div>
             <div className="flex-1">
                <Button onClick={() => onSubmit(stockData)}>
                    Finish Store
                </Button>
             </div>
           </div>
        </div>
    </div>
  );
};