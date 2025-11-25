import React, { useState } from 'react';
import type { Store, StockData, Sku, UserRole } from '../types';
import { Button } from './common/Button';
import { generateShareCode } from '../services/shareService';

interface StoreAuditReviewProps {
    store: Store;
    stockData: StockData;
    allSkus: Sku[];
    onConfirm: () => void;
    onEdit: () => void;
    userRole: UserRole; // To toggle features
}

export const StoreAuditReview: React.FC<StoreAuditReviewProps> = ({ store, stockData, allSkus, onConfirm, onEdit, userRole }) => {
    const totalCount = Array.from(stockData.values()).reduce((a: number, b: number) => a + b, 0);
    const filledSkus = Array.from(stockData.entries()).filter(([, count]) => count > 0);
    const skuMap = new Map<string, Sku>(allSkus.map(s => [s.id, s]));
    
    const [isCopied, setIsCopied] = useState(false);

    const handleShare = () => {
        const code = generateShareCode(store, stockData);
        // WhatsApp URL Scheme
        // We append a helpful message + the code
        const message = `*SOH Audit Report*\n*Store:* ${store.name}\n*ID:* ${store.bsrn}\n*Qty:* ${totalCount}\n\nCopy the code below and import in App:\n\n${code}`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
        
        // Also call confirm to save locally for history
        onConfirm();
    };

    const handleCopy = () => {
        const code = generateShareCode(store, stockData);
        navigator.clipboard.writeText(code).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        });
    };

    return (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden animate-fade-in">
            <div className={`${userRole === 'BDE' ? 'bg-emerald-600' : 'bg-indigo-600'} p-6 text-white text-center`}>
                <div className="mb-4 flex justify-center">
                    <div className="bg-white/20 rounded-full p-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                </div>
                <h2 className="text-2xl font-bold">Audit Complete</h2>
                <p className="text-white/90">{store.name}</p>
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
                     {userRole === 'BDE' ? (
                         <Button onClick={onConfirm} className="bg-emerald-600 hover:bg-emerald-700">
                            Confirm & Add to Session
                         </Button>
                     ) : (
                         <div className="space-y-3">
                             <Button onClick={handleShare} className="bg-green-600 hover:bg-green-700 shadow-green-200 shadow-lg animate-pulse">
                                <div className="flex items-center justify-center gap-2">
                                    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                                    Share via WhatsApp
                                </div>
                             </Button>
                             <button 
                                onClick={handleCopy}
                                className="w-full py-3 text-indigo-600 font-bold hover:bg-indigo-50 rounded-lg transition-colors"
                            >
                                {isCopied ? 'Copied to Clipboard!' : 'Copy Code (For manual sharing)'}
                            </button>
                         </div>
                     )}
                     
                     <Button onClick={onEdit} variant="secondary">
                        Edit Entries
                     </Button>
                 </div>
            </div>
        </div>
    );
};