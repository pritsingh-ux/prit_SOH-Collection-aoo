import React, { useState, useMemo, useRef } from 'react';
import type { Sku, StockData, StockEntry, StockBatch } from '../types';
import { SKU_CATEGORIES, ALL_SKUS } from '../constants';
import { Button } from './common/Button';
import { Input } from './common/Input';
import { ModernDatePicker } from './common/ModernDatePicker';
import { Plus, Minus, Trash2, Calendar as CalendarIcon, AlertCircle, ChevronDown, ChevronUp, Copy, Check, Search } from 'lucide-react';
import { format, isPast, isToday, addDays, parseISO } from 'date-fns';
import { getMasterProducts } from '../services/firebaseConfig';

interface StockEntryListProps {
  initialStockData: StockData;
  availableSkus: Sku[];
  onSubmit: (data: StockData) => void;
  onBack: () => void;
  onAddSku: (sku: Sku) => void;
  retailerName: string;
  expiryEnabled?: boolean;
}

export const StockEntryList: React.FC<StockEntryListProps> = ({ initialStockData, availableSkus, onSubmit, onBack, onAddSku, retailerName, expiryEnabled = true }) => {
  const [stockData, setStockData] = useState<StockData>(() => new Map(initialStockData));
  const [masterProducts, setMasterProducts] = useState<Sku[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [errorSkus, setErrorSkus] = useState<string[]>([]);

  React.useEffect(() => {
    const loadProducts = async () => {
        setLoadingProducts(true);
        try {
            const data = await getMasterProducts();
            // If we have a healthy amount of products in DB, use them.
            // Otherwise, fallback to the hardcoded list provided via props.
            if (data && data.length > 10) {
                setMasterProducts(data);
            } else {
                setMasterProducts(availableSkus);
            }
        } catch (e) {
            console.error("Failed to load master products, falling back:", e);
            setMasterProducts(availableSkus);
        } finally {
            setLoadingProducts(false);
        }
    };
    loadProducts();
  }, [availableSkus]);
  const [expandedSkus, setExpandedSkus] = useState<Set<string>>(new Set());
  
  // Bulk Expiry State
  const [bulkExpiryDate, setBulkExpiryDate] = useState<Date | null>(null);
  
  // Add Item Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCode, setNewItemCode] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const listTopRef = useRef<HTMLDivElement>(null);
  const listBottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    listBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToSku = (skuId: string) => {
    const element = document.getElementById(`sku-${skuId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
      let newBatches = [...entry.batches];
      
      if (batchIndex >= newBatches.length) {
        if (batchIndex === 0) {
            // Add a default batch if none exists
            newBatches = [{ qty: 0, expiryDate: '' }];
        } else {
            return prev;
        }
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
    let skus = masterProducts;
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
  }, [masterProducts, activeCategory, searchTerm]);
  
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
    <div className="animate-fade-in pb-48 relative bg-slate-50 min-h-screen" ref={listTopRef}>
        {/* Floating Scroll Buttons */}
        <div className="fixed bottom-32 right-4 flex flex-col gap-3 z-50">
            <button 
                onClick={scrollToTop}
                className="p-3 bg-white/90 backdrop-blur-md text-slate-600 rounded-2xl shadow-xl border border-slate-200 hover:bg-white transition-all active:scale-95"
                title="Scroll to Top"
            >
                <ChevronUp size={20} />
            </button>
            <button 
                onClick={scrollToBottom}
                className="p-3 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
                title="Scroll to Bottom"
            >
                <ChevronDown size={20} />
            </button>
        </div>

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
        <div className="sticky top-0 bg-slate-50/80 backdrop-blur-md z-20 pb-2">
             <div className="bg-white shadow-sm p-3 sm:p-4 rounded-b-[1.5rem] mb-2 border-b border-slate-100">
               <div className="flex items-center gap-2 mb-3">
                 <button 
                    onClick={onBack}
                    className="p-1.5 -ml-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-all"
                 >
                    <Trash2 size={16} className="rotate-45" />
                 </button>
                 <div className="flex-1 min-w-0">
                    <h2 className="text-base font-bold text-slate-800 leading-tight truncate">{retailerName}</h2>
                    <div className="flex items-center gap-1 mt-0.5">
                        <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
                        <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">Live Entry</p>
                    </div>
                 </div>
                 <div className="flex gap-1.5">
                   <div className="bg-indigo-50 px-2 py-1 rounded-lg text-center border border-indigo-100 min-w-[45px]">
                       <span className="block text-xs font-bold text-indigo-600 leading-none">{itemsFilled}</span>
                       <span className="text-[6px] font-bold text-indigo-400 uppercase tracking-tighter">SKUs</span>
                   </div>
                   <div className="bg-emerald-50 px-2 py-1 rounded-lg text-center border border-emerald-100 min-w-[45px]">
                       <span className="block text-xs font-bold text-emerald-600 leading-none">{totalItems}</span>
                       <span className="text-[6px] font-bold text-indigo-400 uppercase tracking-tighter">Units</span>
                   </div>
                 </div>
               </div>
               
               <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                                <CalendarIcon size={12} className="text-slate-300" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-8 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900 transition-all outline-none"
                            />
                        </div>
                        <div className="flex gap-1">
                            <button 
                                onClick={() => setIsAddModalOpen(true)}
                                className="bg-white text-slate-600 px-2 py-1.5 rounded-lg font-bold text-[9px] hover:bg-slate-50 border border-slate-200 shadow-sm transition-all flex items-center gap-1"
                                title="Add Custom Item"
                            >
                                <Plus size={12} />
                                <span>Custom</span>
                            </button>
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="bg-white text-slate-600 px-2 py-1.5 rounded-lg font-bold text-[9px] hover:bg-slate-50 border border-slate-200 shadow-sm transition-all flex items-center gap-1"
                                title="Import CSV"
                            >
                                <Copy size={12} />
                                <span>CSV</span>
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
                    {expiryEnabled && (
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
                    )}
               </div>
             </div>

             <div className="flex overflow-x-auto pb-2 px-4 gap-3 no-scrollbar" style={{ scrollbarWidth: 'none' }}>
               {['All', ...SKU_CATEGORIES.filter(c => c !== 'All'), 'Other'].map(cat => (
                 <button
                   key={cat}
                   onClick={() => setActiveCategory(cat)}
                   className={`px-4 py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest whitespace-nowrap transition-all ${
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
        <div className="mt-1 px-3 space-y-3">
            {filteredSkus.length > 0 ? (
                filteredSkus.map(sku => {
                    const entry = stockData.get(sku.id) || { batches: [] };
                    const isExpanded = expandedSkus.has(sku.id);
                    const totalSkuQty = entry.batches.reduce((sum, b) => sum + b.qty, 0);
                    const hasError = errorSkus.includes(sku.id);
                    
                    return (
                        <div 
                            key={sku.id} 
                            id={`sku-${sku.id}`}
                            className={`bg-white transition-all ${expiryEnabled ? 'rounded-[1.5rem] border' : 'rounded-xl border-b border-slate-100'} ${
                                hasError ? 'border-red-500 ring-2 ring-red-100' : 
                                totalSkuQty > 0 ? 'border-indigo-200 shadow-md ring-1 ring-indigo-50' : 
                                'border-slate-100 shadow-sm'
                            }`}
                        >
                            {/* SKU Header */}
                            <div className={expiryEnabled ? "p-2 sm:p-3" : "p-2"}>
                                <div className={`flex ${expiryEnabled ? 'items-start' : 'items-center'} justify-between gap-2`}>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mb-0.5">
                                            <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest flex-shrink-0">{sku.id}</span>
                                            <span className={`text-[6px] font-bold px-1 py-0.5 rounded-full uppercase tracking-tighter flex-shrink-0 ${sku.type === 'Professional' ? 'bg-slate-800 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                                                {sku.type}
                                            </span>
                                        </div>
                                        {hasError && (
                                            <div className="mb-1">
                                                <span className="inline-flex items-center gap-1 text-[6px] font-bold text-red-500 uppercase bg-red-50 px-1.5 py-0.5 rounded-full border border-red-100">
                                                    <AlertCircle size={8} />
                                                    Expiry Missing
                                                </span>
                                            </div>
                                        )}
                                        <h4 className={`${expiryEnabled ? 'text-xs' : 'text-[11px]'} font-bold text-slate-800 leading-tight line-clamp-2`}>{sku.name}</h4>
                                    </div>
                                    
                                    {!expiryEnabled ? (
                                        <div className="w-32 flex-shrink-0 ml-2">
                                            {(entry.batches.length > 0 ? [entry.batches[0]] : [{qty: 0, expiryDate: ''}]).map((batch, idx) => (
                                                <div key={idx} className="flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden h-8">
                                                    <button 
                                                        onClick={() => handleQtyChange(sku.id, idx, String(Math.max(0, (batch.qty || 0) - 1)))}
                                                        className="px-2 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors h-full"
                                                    >
                                                        <Minus size={12} />
                                                    </button>
                                                    <input 
                                                        type="number"
                                                        min="0"
                                                        value={batch.qty || ''}
                                                        onChange={(e) => handleQtyChange(sku.id, idx, e.target.value)}
                                                        placeholder="0"
                                                        className="w-full bg-transparent text-xs font-bold focus:outline-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    />
                                                    <button 
                                                        onClick={() => handleQtyChange(sku.id, idx, String((batch.qty || 0) + 1))}
                                                        className="px-2 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors h-full"
                                                    >
                                                        <Plus size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                            {totalSkuQty > 0 && (
                                                <div className="flex flex-col items-center min-w-[35px]">
                                                    <span className="text-lg font-bold text-indigo-600 leading-none">{totalSkuQty}</span>
                                                    <span className="text-[6px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 whitespace-nowrap">Units</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-1.5">
                                                <button 
                                                    onClick={() => addBatch(sku.id)}
                                                    className="p-2 bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-all border border-slate-100"
                                                    title="Add Batch"
                                                >
                                                    <Plus size={14} />
                                                </button>
                                                {entry.batches.length > 0 && (
                                                    <button 
                                                        onClick={() => toggleExpand(sku.id)}
                                                        className="p-2 bg-slate-50 text-slate-400 hover:bg-slate-100 rounded-lg transition-all border border-slate-100"
                                                    >
                                                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Batches List (Only for Expiry Mode) */}
                            {expiryEnabled && (isExpanded || entry.batches.length > 0) && (
                                <div className={`px-3 pb-3 space-y-2 ${!isExpanded && 'hidden'}`}>
                                    <div className="h-px bg-slate-100 mb-2"></div>
                                    {entry.batches.map((batch, idx) => {
                                        const status = getExpiryStatus(batch.expiryDate);
                                        return (
                                            <div key={idx} className="flex flex-wrap sm:flex-nowrap items-end gap-2 animate-slide-up">
                                                <div className="flex-1 min-w-[100px]">
                                                    <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Expiry</label>
                                                    <ModernDatePicker 
                                                        selected={batch.expiryDate ? parseISO(batch.expiryDate) : null}
                                                        onChange={(date) => updateBatch(sku.id, idx, { expiryDate: date ? format(date, 'yyyy-MM-dd') : '' })}
                                                        error={status === 'expired' || status === 'critical'}
                                                    />
                                                </div>
                                                <div className="w-28">
                                                    <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Qty</label>
                                                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
                                                        <button 
                                                            onClick={() => handleQtyChange(sku.id, idx, String(Math.max(0, (batch.qty || 0) - 1)))}
                                                            className="px-2 py-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                                                        >
                                                            <Minus size={14} />
                                                        </button>
                                                        <input 
                                                            type="number"
                                                            min="0"
                                                            value={batch.qty || ''}
                                                            onChange={(e) => handleQtyChange(sku.id, idx, e.target.value)}
                                                            placeholder="0"
                                                            className="w-full bg-transparent py-1.5 text-sm font-bold focus:outline-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                        />
                                                        <button 
                                                            onClick={() => handleQtyChange(sku.id, idx, String((batch.qty || 0) + 1))}
                                                            className="px-2 py-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                                                        >
                                                            <Plus size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5 pb-0.5">
                                                    {status && (
                                                        <div className={`px-2 py-1 rounded-lg text-[7px] font-bold uppercase tracking-widest border ${getStatusStyles(status)}`}>
                                                            {status}
                                                        </div>
                                                    )}
                                                    <button 
                                                        onClick={() => removeBatch(sku.id, idx)}
                                                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                    >
                                                        <Trash2 size={14} />
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
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-10px_30px_-10px_rgba(0,0,0,0.1)] z-50">
           <div className="max-w-4xl mx-auto">
             {/* Branding & Status Bar (Matches Screenshot) */}
             <div className="flex items-center justify-between px-4 py-1.5 border-b border-slate-100 bg-white">
                <div className="flex items-center gap-1.5">
                    <div className="bg-indigo-600 p-1 rounded-md text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                    </div>
                    <h1 className="text-[9px] font-bold text-slate-800 tracking-tight uppercase">Brillare SOH</h1>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">Live</span>
                    </div>
                    <div className="bg-indigo-50 px-2 py-0.5 rounded-lg text-center border border-indigo-100">
                        <span className="text-[9px] font-bold text-indigo-600 leading-none">{itemsFilled} SKUs</span>
                    </div>
                </div>
             </div>

             {/* Main Action Bar */}
             <div className="px-4 py-3 flex gap-3 items-center bg-slate-50/30 backdrop-blur-md">
                <div className="flex-1">
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Total Units</p>
                    <div className="flex items-baseline gap-1">
                        <p className="text-xl font-bold text-slate-900 leading-none">{totalItems}</p>
                        <span className="text-[8px] font-bold text-indigo-500 uppercase">Qty</span>
                    </div>
                </div>
                <div className="flex-[2.5]">
                    <Button 
                        className="w-full py-3 text-sm shadow-xl shadow-indigo-200/40 font-bold uppercase tracking-widest"
                         onClick={() => {
                            // Validation: All batches with qty > 0 must have expiry date
                            if (expiryEnabled) {
                                const missingExpirySkus: string[] = [];
                                stockData.forEach((entry, skuId) => {
                                    entry.batches.forEach(b => {
                                        if (b.qty > 0 && !b.expiryDate) {
                                            if (!missingExpirySkus.includes(skuId)) {
                                                missingExpirySkus.push(skuId);
                                            }
                                        }
                                    });
                                });

                                if (missingExpirySkus.length > 0) {
                                    setErrorSkus(missingExpirySkus);
                                    alert(`Please provide an expiry date for ${missingExpirySkus.length} items with quantity.`);
                                    scrollToSku(missingExpirySkus[0]);
                                    return;
                                }
                                
                                setErrorSkus([]);

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
        {/* Bottom anchor for scroll */}
        <div ref={listBottomRef} className="h-1" />
    </div>
  );
};
