import React, { useState, useMemo, useRef } from 'react';
import type { Sku, StockData, StockEntry, StockBatch } from '../types';
import { SKU_CATEGORIES } from '../constants';
import { Button } from './common/Button';
import { Input } from './common/Input';
import { ModernDatePicker } from './common/ModernDatePicker';
import { Plus, Trash2, Calendar as CalendarIcon, AlertCircle, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { format, isPast, isToday, addDays, parseISO } from 'date-fns';

interface StockEntryListProps {
  initialStockData: StockData;
  availableSkus: Sku[];
  onSubmit: (data: StockData) => void;
  onBack: () => void;
  onAddSku: (sku: Sku) => void;
  retailerName: string;
}

export const StockEntryList: React.FC<StockEntryListProps> = ({ initialStockData, availableSkus, onSubmit, onBack, onAddSku, retailerName }) => {
  const [stockData, setStockData] = useState<StockData>(() => new Map(initialStockData));
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [expandedSkus, setExpandedSkus] = useState<Set<string>>(new Set());
  
  // Bulk Expiry State
  const [bulkExpiryDate, setBulkExpiryDate] = useState<Date | null>(null);
  
  // Add Item Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCode, setNewItemCode] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleExpand = (skuId: string) => {
    setExpandedSkus(prev => {
      const next = new Set(prev);
      if (next.has(skuId)) next.delete(skuId);
      else next.add(skuId);
      return next;
    });
  };

  const updateBatch = (skuId: string, batchIndex: number, updates: Partial<StockBatch>) => {
    setStockData(prev => {
      const newMap = new Map(prev);
      const entry = newMap.get(skuId) || { batches: [] };
      const newBatches = [...entry.batches];
      
      if (batchIndex >= newBatches.length) {
        // Should not happen with current UI but for safety
        return prev;
      }

      newBatches[batchIndex] = { ...newBatches[batchIndex], ...updates };
      newMap.set(skuId, { batches: newBatches });
      return newMap;
    });
  };

  const addBatch = (skuId: string) => {
    setStockData(prev => {
      const newMap = new Map(prev);
      const entry = newMap.get(skuId) || { batches: [] };
      const lastBatch = entry.batches[entry.batches.length - 1];
      
      const newBatch: StockBatch = {
        qty: 0,
        expiryDate: lastBatch?.expiryDate || ''
      };
      
      newMap.set(skuId, { batches: [...entry.batches, newBatch] });
      return newMap;
    });
    if (!expandedSkus.has(skuId)) {
      toggleExpand(skuId);
    }
  };

  const removeBatch = (skuId: string, batchIndex: number) => {
    setStockData(prev => {
      const newMap = new Map(prev);
      const entry = newMap.get(skuId);
      if (!entry) return prev;
      
      const newBatches = entry.batches.filter((_, i) => i !== batchIndex);
      if (newBatches.length === 0) {
        newMap.delete(skuId);
      } else {
        newMap.set(skuId, { batches: newBatches });
      }
      return newMap;
    });
  };

  const handleQtyChange = (skuId: string, batchIndex: number, val: string) => {
    const qty = parseInt(val) || 0;
    updateBatch(skuId, batchIndex, { qty });
  };

  const applyBulkExpiry = () => {
    if (!bulkExpiryDate) return;
    const dateStr = format(bulkExpiryDate, 'yyyy-MM-dd');
    setStockData(prev => {
      const newMap = new Map(prev);
      newMap.forEach((entry, skuId) => {
        const newBatches = entry.batches.map(b => ({ ...b, expiryDate: dateStr }));
        newMap.set(skuId, { batches: newBatches });
      });
      return newMap;
    });
    alert(`Applied expiry date ${format(bulkExpiryDate, 'dd MMM yyyy')} to all active entries.`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const newStockData = new Map(stockData);
      
      let count = 0;
      lines.forEach(line => {
        const [skuId, qtyStr, expiry] = line.split(',').map(s => s.trim());
        const qty = parseInt(qtyStr);
        if (skuId && !isNaN(qty)) {
          const entry = newStockData.get(skuId) || { batches: [] };
          entry.batches.push({ qty, expiryDate: expiry || '' });
          newStockData.set(skuId, entry);
          count++;
        }
      });
      
      setStockData(newStockData);
      alert(`Imported ${count} batches from CSV.`);
    };
    reader.readAsText(file);
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
  
  const totalItems = Array.from(stockData.values()).reduce((sum, entry) => 
    sum + (entry.batches?.reduce((bSum, b) => bSum + (Number(b.qty) || 0), 0) || 0), 0
  );
  
  const itemsFilled = Array.from(stockData.values()).filter(entry => 
    entry.batches?.some(b => (Number(b.qty) || 0) > 0)
  ).length;
  
  const getExpiryStatus = (expiryDateStr?: string) => {
    if (!expiryDateStr) return null;
    const expiryDate = parseISO(expiryDateStr);
    const today = new Date();
    
    if (isPast(expiryDate) && !isToday(expiryDate)) return 'expired';
    
    const diffDays = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 30) return 'critical';
    if (diffDays <= 60) return 'warning';
    if (diffDays <= 90) return 'info';
    return 'safe';
  };

  const getStatusStyles = (status: string | null) => {
    switch (status) {
      case 'expired': return 'bg-red-600 text-white border-red-700';
      case 'critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'warning': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'info': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'safe': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-100 text-slate-500 border-slate-200';
    }
  };

  return (
    <div className="animate-fade-in pb-48 relative bg-slate-50 min-h-screen">
        {/* Add Custom Item Modal */}
        {isAddModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-white rounded-[2rem] shadow-2xl max-w-sm w-full p-8 animate-scale-in">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-indigo-100 rounded-2xl text-indigo-600">
                            <Plus size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">Add Custom Item</h3>
                    </div>
                    <div className="space-y-5">
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
                        <div className="flex gap-3 pt-4">
                            <Button onClick={handleAddNewItem} disabled={!newItemName || !newItemCode} className="flex-1">Add Item</Button>
                            <button 
                                onClick={() => setIsAddModalOpen(false)}
                                className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Sticky Header */}
        <div className="sticky top-0 bg-slate-50/80 backdrop-blur-md z-20 pb-4">
             <div className="bg-white shadow-sm p-5 rounded-b-[2.5rem] mb-4 border-b border-slate-100">
               <div className="flex items-center gap-4 mb-5">
                 <button 
                    onClick={onBack}
                    className="p-3 -ml-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-2xl transition-all"
                 >
                    <Trash2 size={20} className="rotate-45" />
                 </button>
                 <div className="flex-1">
                    <h2 className="text-2xl font-bold text-slate-800 leading-tight truncate">{retailerName}</h2>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Live Inventory Entry</p>
                    </div>
                 </div>
                 <div className="bg-indigo-50 px-4 py-2 rounded-2xl text-center border border-indigo-100">
                    <span className="block text-xl font-bold text-indigo-600 leading-none">{itemsFilled}</span>
                    <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">SKUs</span>
                 </div>
               </div>
               
               <div className="flex flex-col gap-4">
                    <div className="flex gap-3">
                        <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <CalendarIcon size={16} className="text-slate-300" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search SKUs or Codes..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900 transition-all outline-none"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setIsAddModalOpen(true)}
                                className="bg-white text-slate-600 p-3 rounded-2xl font-bold text-xs hover:bg-slate-50 border border-slate-200 shadow-sm transition-all flex items-center gap-2"
                                title="Add Custom Item"
                            >
                                <Plus size={18} />
                                <span className="hidden sm:inline">Custom</span>
                            </button>
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="bg-white text-slate-600 p-3 rounded-2xl font-bold text-xs hover:bg-slate-50 border border-slate-200 shadow-sm transition-all flex items-center gap-2"
                                title="Import CSV"
                            >
                                <Copy size={18} />
                                <span className="hidden sm:inline">CSV</span>
                            </button>
                        </div>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileUpload} 
                            accept=".csv,.txt" 
                            className="hidden" 
                        />
                    </div>

                    {/* Bulk Expiry Tool - Concise Version */}
                    <div className="flex items-center gap-2 px-1">
                        <div className="flex-1 flex items-center gap-2 bg-slate-100/50 border border-slate-200 rounded-xl px-3 py-1">
                            <CalendarIcon size={14} className="text-slate-400" />
                            <ModernDatePicker 
                                selected={bulkExpiryDate}
                                onChange={setBulkExpiryDate}
                                placeholder="Bulk Expiry"
                                className="!bg-transparent !border-none !py-1 !text-xs font-bold"
                            />
                        </div>
                        <button 
                            onClick={applyBulkExpiry}
                            disabled={!bulkExpiryDate}
                            className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-100 disabled:opacity-30 transition-all border border-indigo-100"
                        >
                            Apply All
                        </button>
                    </div>
               </div>
             </div>

             <div className="flex overflow-x-auto pb-2 px-4 gap-3 no-scrollbar" style={{ scrollbarWidth: 'none' }}>
               {['All', ...SKU_CATEGORIES.filter(c => c !== 'All'), 'Other'].map(cat => (
                 <button
                   key={cat}
                   onClick={() => setActiveCategory(cat)}
                   className={`px-6 py-2.5 rounded-2xl text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all ${
                     activeCategory === cat 
                       ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' 
                       : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'
                   }`}
                 >
                   {cat}
                 </button>
               ))}
             </div>
        </div>
      
        {/* Product List */}
        <div className="mt-2 px-4 space-y-4">
            {filteredSkus.length > 0 ? (
                filteredSkus.map(sku => {
                    const entry = stockData.get(sku.id) || { batches: [] };
                    const isExpanded = expandedSkus.has(sku.id);
                    const totalSkuQty = entry.batches.reduce((sum, b) => sum + b.qty, 0);
                    
                    return (
                        <div key={sku.id} className={`bg-white rounded-[2rem] border transition-all ${totalSkuQty > 0 ? 'border-indigo-200 shadow-md ring-1 ring-indigo-50' : 'border-slate-100 shadow-sm'}`}>
                            {/* SKU Header */}
                            <div className="p-5">
                                <div className="flex items-start justify-between gap-4 mb-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex-shrink-0">{sku.id}</span>
                                            <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter flex-shrink-0 ${sku.type === 'Professional' ? 'bg-slate-800 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                                                {sku.type}
                                            </span>
                                        </div>
                                        <h4 className="text-sm font-bold text-slate-800 leading-tight line-clamp-2">{sku.name}</h4>
                                    </div>
                                    
                                    <div className="flex items-center gap-4 flex-shrink-0">
                                        {totalSkuQty > 0 && (
                                            <div className="flex flex-col items-center">
                                                <span className="text-xl font-bold text-indigo-600 leading-none">{totalSkuQty}</span>
                                                <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total Units</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => addBatch(sku.id)}
                                                className="p-2.5 bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all border border-slate-100"
                                                title="Add Batch"
                                            >
                                                <Plus size={18} />
                                            </button>
                                            {entry.batches.length > 0 && (
                                                <button 
                                                    onClick={() => toggleExpand(sku.id)}
                                                    className="p-2.5 bg-slate-50 text-slate-400 hover:bg-slate-100 rounded-xl transition-all border border-slate-100"
                                                >
                                                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Batches List */}
                            {(isExpanded || entry.batches.length > 0) && (
                                <div className={`px-5 pb-5 space-y-3 ${!isExpanded && 'hidden'}`}>
                                    <div className="h-px bg-slate-100 mb-4"></div>
                                    {entry.batches.map((batch, idx) => {
                                        const status = getExpiryStatus(batch.expiryDate);
                                        return (
                                            <div key={idx} className="flex flex-wrap sm:flex-nowrap items-end gap-3 animate-slide-up">
                                                <div className="flex-1 min-w-[120px]">
                                                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Expiry Date</label>
                                                    <ModernDatePicker 
                                                        selected={batch.expiryDate ? parseISO(batch.expiryDate) : null}
                                                        onChange={(date) => updateBatch(sku.id, idx, { expiryDate: date ? format(date, 'yyyy-MM-dd') : '' })}
                                                        error={status === 'expired' || status === 'critical'}
                                                    />
                                                </div>
                                                <div className="w-24">
                                                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Quantity</label>
                                                    <input 
                                                        type="number"
                                                        min="0"
                                                        value={batch.qty || ''}
                                                        onChange={(e) => handleQtyChange(sku.id, idx, e.target.value)}
                                                        placeholder="0"
                                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none text-center"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-2 pb-1">
                                                    {status && (
                                                        <div className={`px-3 py-1.5 rounded-xl text-[8px] font-bold uppercase tracking-widest border ${getStatusStyles(status)}`}>
                                                            {status}
                                                        </div>
                                                    )}
                                                    <button 
                                                        onClick={() => removeBatch(sku.id, idx)}
                                                        className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {entry.batches.length === 0 && (
                                        <div className="text-center py-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No batches added yet</p>
                                            <button 
                                                onClick={() => addBatch(sku.id)}
                                                className="mt-2 text-xs font-bold text-indigo-600 hover:underline"
                                            >
                                                + Add First Batch
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })
            ) : (
                <div className="py-20 text-center">
                    <div className="w-20 h-20 bg-slate-100 rounded-[2rem] flex items-center justify-center mx-auto mb-4 text-slate-300">
                        <AlertCircle size={40} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">No SKUs Found</h3>
                    <p className="text-sm text-slate-400 font-medium">Try adjusting your search or category filter.</p>
                </div>
            )}
        </div>

        {/* Bottom Action Bar - Frozen Panel */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-20px_50px_-20px_rgba(0,0,0,0.2)] z-50">
           <div className="max-w-4xl mx-auto">
             {/* Branding & Status Bar (Matches Screenshot) */}
             <div className="flex items-center justify-between px-5 py-2.5 border-b border-slate-100 bg-white">
                <div className="flex items-center gap-2">
                    <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                    </div>
                    <h1 className="text-[11px] font-bold text-slate-800 tracking-tight uppercase">Brillare- Retail SOH</h1>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Live Entry</span>
                    </div>
                    <div className="bg-indigo-50 px-2.5 py-1 rounded-xl text-center border border-indigo-100">
                        <span className="text-[10px] font-bold text-indigo-600 leading-none">{itemsFilled} SKUs</span>
                    </div>
                </div>
             </div>

             {/* Main Action Bar */}
             <div className="p-4 sm:p-6 flex gap-4 items-center bg-slate-50/30 backdrop-blur-md">
                <div className="flex-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Total Units</p>
                    <div className="flex items-baseline gap-1">
                        <p className="text-2xl font-bold text-slate-900 leading-none">{totalItems}</p>
                        <span className="text-[9px] font-bold text-indigo-500 uppercase">Qty</span>
                    </div>
                </div>
                <div className="flex-[2]">
                    <Button 
                        className="w-full py-4 text-sm sm:text-base shadow-2xl shadow-indigo-200/50 font-bold uppercase tracking-widest"
                        onClick={() => {
                            // Validation: All batches with qty > 0 must have expiry date
                            let isValid = true;
                            stockData.forEach((entry) => {
                                entry.batches.forEach(b => {
                                    if (b.qty > 0 && !b.expiryDate) isValid = false;
                                });
                            });

                            if (!isValid) {
                                alert("Please provide an expiry date for all items with quantity.");
                                return;
                            }

                            // Validation: Expiry date cannot be in the past
                            const todayStr = format(new Date(), 'yyyy-MM-dd');
                            let hasPastExpiry = false;
                            stockData.forEach((entry) => {
                                entry.batches?.forEach(b => {
                                    if ((Number(b.qty) || 0) > 0 && b.expiryDate && b.expiryDate < todayStr) hasPastExpiry = true;
                                });
                            });
                            
                            if (hasPastExpiry) {
                                alert("Some items have expiry dates in the past. Please correct them.");
                                return;
                            }

                            onSubmit(stockData);
                        }}
                    >
                        Submit Audit ({itemsFilled} SKUs)
                    </Button>
                </div>
             </div>
           </div>
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
            @keyframes scale-in {
                from { transform: scale(0.95); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
            }
            @keyframes slide-up {
                from { transform: translateY(10px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            .animate-scale-in { animation: scale-in 0.3s ease-out forwards; }
            .animate-slide-up { animation: slide-up 0.3s ease-out forwards; }
            .no-scrollbar::-webkit-scrollbar { display: none; }
        `}} />
    </div>
  );
};
