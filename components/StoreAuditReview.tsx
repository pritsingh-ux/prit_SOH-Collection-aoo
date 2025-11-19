
import React from 'react';
import type { Store, StockData, Sku } from '../types';
import { Button } from './common/Button';

interface StoreAuditReviewProps {
    store: Store;
    stockData: StockData;
    allSkus: Sku[];
    onConfirm: () => void;
    onEdit: () => void;
}

export const StoreAuditReview: React.FC<StoreAuditReviewProps> = ({ store, stockData, allSkus, onConfirm, onEdit }) => {
    const totalCount = Array.from(stockData.values()).reduce((a: number, b: number) => a + b, 0);
    const filledSkus = Array.from(stockData.entries()).filter(([, count]) => count > 0);
    // Explicitly type the Map to ensure TS knows values are Sku
    const skuMap = new Map<string, Sku>(allSkus.map(s => [s.id, s]));

    return (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden animate-fade-in">
            <div className="bg-emerald-600 p-6 text-white text-center">
                <div className="mb-4 flex justify-center">
                    <div className="bg-emerald-500 rounded-full p-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                </div>
                <h2 className="text-2xl font-bold">Audit Complete</h2>
                <p className="text-emerald-100">{store.name}</p>
            </div>

            <div className="p-6 space-y-6">
                 <div className="text-center">
                     <p className="text-sm text-slate-500 uppercase tracking-wide font-bold">Total Quantity</p>
                     <p className="text-4xl font-bold text-slate-800">{totalCount}</p>
                 </div>

                 <div className="border-t border-b border-slate-100 py-4">
                    <p className="text-sm font-bold text-slate-500 mb-2">Preview ({filledSkus.length} Items)</p>
                    <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                        {filledSkus.length === 0 && <p className="text-slate-400 italic text-sm">No items counted.</p>}
                        {filledSkus.map(([id, count]) => {
                            const sku = skuMap.get(id);
                            return (
                                <div key={id} className="flex justify-between text-sm">
                                    <span className="text-slate-700 truncate flex-1 mr-2">{sku?.name || id}</span>
                                    <span className="font-bold text-slate-900">{count}</span>
                                </div>
                            );
                        })}
                    </div>
                 </div>

                 <div className="space-y-3">
                     <Button onClick={onConfirm} className="bg-emerald-600 hover:bg-emerald-700">
                        Confirm & Add to Session
                     </Button>
                     <Button onClick={onEdit} variant="secondary">
                        Edit Entries
                     </Button>
                 </div>
            </div>
        </div>
    );
};
