
import React from 'react';
import type { BdeInfo, StoreAudit, Sku } from '../types';
import { Button } from './common/Button';

interface ReviewAndExportProps {
  bdeInfo: BdeInfo;
  sessionAudits: StoreAudit[];
  allSkus: Sku[];
  onExport: () => void;
  onContinueSession: () => void;
}

export const ReviewAndExport: React.FC<ReviewAndExportProps> = ({ bdeInfo, sessionAudits, allSkus, onExport, onContinueSession }) => {
  
  const totalStores = sessionAudits.length;
  const totalUnits = sessionAudits.reduce((sum, audit) => {
      return sum + Array.from(audit.stockData.values()).reduce((a,b) => a + b, 0);
  }, 0);

  const handleEmail = () => {
    const subject = encodeURIComponent(`Compiled Stock Report - ${bdeInfo.region} - ${bdeInfo.bdeName}`);
    const body = encodeURIComponent(`Dear Team,\n\nPlease find the attached compiled Stock In Hand (SOH) report for the following session:\n\nBDE: ${bdeInfo.bdeName}\nRegion: ${bdeInfo.region}\nTotal Stores Audited: ${totalStores}\nTotal Units Counted: ${totalUnits}\n\n[PLEASE ATTACH THE DOWNLOADED EXCEL FILE HERE]\n\nRegards,\n${bdeInfo.bdeName}`);
    window.location.href = `mailto:prit.singh@brillarescience.com?subject=${subject}&body=${body}`;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg animate-fade-in overflow-hidden">
      <div className="p-6 bg-indigo-800 text-white">
         <h2 className="text-2xl font-bold">Session Summary</h2>
         <p className="opacity-80">Ready to compile and export.</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-xs font-bold text-slate-500 uppercase">Stores</p>
                <p className="text-3xl font-bold text-indigo-600">{totalStores}</p>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-xs font-bold text-slate-500 uppercase">Total Units</p>
                <p className="text-3xl font-bold text-indigo-600">{totalUnits}</p>
            </div>
        </div>

        {/* Store List */}
        <div>
            <h3 className="font-bold text-slate-800 mb-3">Included Stores</h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-100 sticky top-0">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Store Name</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase">Qty</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {sessionAudits.map(audit => {
                            const qty = Array.from(audit.stockData.values()).reduce((a,b) => a + b, 0);
                            return (
                                <tr key={audit.id}>
                                    <td className="px-4 py-3 text-sm text-slate-800 font-medium">
                                        {audit.store.name} <span className="text-slate-400 font-normal">({audit.store.bsrn})</span>
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm font-bold text-slate-600">{qty}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <Button onClick={onExport} disabled={sessionAudits.length === 0} className="shadow-lg shadow-indigo-200">
              1. Download Compiled Excel
          </Button>
          <Button 
            onClick={handleEmail} 
            disabled={sessionAudits.length === 0} 
            variant="secondary" 
            className="border border-slate-300"
          >
             2. Email Report to HO
          </Button>
          
          <div className="mt-4">
             <button 
                onClick={onContinueSession}
                className="w-full py-3 text-indigo-600 font-medium hover:bg-indigo-50 rounded-lg transition-colors"
             >
                ← Return to Dashboard (Add more stores)
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};
