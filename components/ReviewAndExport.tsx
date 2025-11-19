
import React from 'react';
import type { BdeInfo, StockData, Sku } from '../types';
import { Button } from './common/Button';

interface ReviewAndExportProps {
  bdeInfo: BdeInfo;
  stockData: StockData;
  allSkus: Sku[];
  onExport: () => void;
  onEdit: () => void;
  onStartOver: () => void;
}

export const ReviewAndExport: React.FC<ReviewAndExportProps> = ({ bdeInfo, stockData, allSkus, onExport, onEdit, onStartOver }) => {
  const skuMap = new Map(allSkus.map(sku => [sku.id, sku]));
  const entries = Array.from(stockData.entries())
    .filter(([, count]) => count > 0)
    .map(([skuId, count]) => ({
      sku: skuMap.get(skuId),
      count,
    }));

  const totalItems = entries.reduce((sum, entry) => sum + entry.count, 0);

  const handleEmail = () => {
    const subject = encodeURIComponent(`Stock In Hand Report - ${bdeInfo.store.name} (${bdeInfo.store.bsrn})`);
    const body = encodeURIComponent(`Dear Team,\n\nPlease find the attached Stock In Hand (SOH) report for:\n\nStore: ${bdeInfo.store.name}\nBSRN: ${bdeInfo.store.bsrn}\nRegion: ${bdeInfo.region}\n\n[PLEASE ATTACH THE DOWNLOADED EXCEL FILE HERE]\n\nRegards,\n${bdeInfo.bdeName}`);
    window.location.href = `mailto:prit.singh@brillarescience.com?subject=${subject}&body=${body}`;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg animate-fade-in overflow-hidden">
      <div className="p-6 bg-indigo-600 text-white">
         <h2 className="text-2xl font-bold">Audit Summary</h2>
         <p className="opacity-80">Please review the details before exporting.</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">BDE Details</h4>
            <div className="flex justify-between">
               <span className="text-slate-600">Name:</span>
               <span className="font-semibold text-slate-900">{bdeInfo.bdeName}</span>
            </div>
            <div className="flex justify-between mt-1">
               <span className="text-slate-600">Region:</span>
               <span className="font-semibold text-slate-900">{bdeInfo.region}</span>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Store Details</h4>
             <div className="flex justify-between">
               <span className="text-slate-600">Name:</span>
               <span className="font-semibold text-slate-900">{bdeInfo.store.name}</span>
            </div>
            <div className="flex justify-between mt-1">
               <span className="text-slate-600">BSRN:</span>
               <span className="font-semibold text-slate-900">{bdeInfo.store.bsrn}</span>
            </div>
             {/* Location is strictly optional/removed in input but type exists */}
             {bdeInfo.store.location && (
                <div className="flex justify-between mt-1">
                   <span className="text-slate-600">Location:</span>
                   <span className="font-semibold text-slate-900">{bdeInfo.store.location}</span>
                </div>
             )}
          </div>
        </div>

        {/* Stock Table */}
        <div>
          <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center justify-between">
            <span>Stock Entries</span>
            <span className="text-sm bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full">{totalItems} Units</span>
          </h3>
          
          {entries.length > 0 ? (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="max-h-96 overflow-y-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-100 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Product</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase">Count</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {entries.map(({ sku, count }) => (
                      <tr key={sku?.id}>
                        <td className="px-4 py-3">
                            <p className="text-sm font-semibold text-slate-900">{sku?.name}</p>
                            <p className="text-xs text-slate-500 font-mono">{sku?.id}</p>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-indigo-600">{count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                <p className="text-slate-400">No stock data collected.</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <Button onClick={onExport} disabled={entries.length === 0} className="shadow-lg shadow-indigo-200">
              1. Download Excel Report
          </Button>
          <Button 
            onClick={handleEmail} 
            disabled={entries.length === 0} 
            variant="secondary" 
            className="border border-slate-300"
          >
             2. Send via Email 
             <span className="text-xs font-normal block text-slate-500">(Attaches to default mail app)</span>
          </Button>
          
          <div className="grid grid-cols-2 gap-3 mt-2">
              <Button onClick={onEdit} variant="secondary">
                  Edit List
              </Button>
              <Button onClick={onStartOver} variant="danger">
                  New Audit
              </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
