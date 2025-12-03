
import React, { useState } from 'react';
import type { BdeInfo, StoreAudit, Sku } from '../types';
import { Button } from './common/Button';
import { saveAuditsToCloud } from '../services/firebaseConfig';

interface ReviewAndExportProps {
  bdeInfo: BdeInfo;
  sessionAudits: StoreAudit[];
  allSkus: Sku[];
  onExport: () => void;
  onContinueSession: () => void;
  onHome: () => void;
}

export const ReviewAndExport: React.FC<ReviewAndExportProps> = ({ bdeInfo, sessionAudits, allSkus, onExport, onContinueSession, onHome }) => {
  const [syncStatus, setSyncStatus] = useState<'IDLE' | 'SYNCING' | 'DONE' | 'ERROR'>('IDLE');
  
  const totalStores = sessionAudits.length;
  const totalUnits = sessionAudits.reduce((sum, audit) => {
      return sum + Array.from(audit.stockData.values()).reduce((a: number, b: number) => a + b, 0);
  }, 0);

  // Sync to Firebase Helper (Manual trigger)
  const syncToCloud = async () => {
      if (syncStatus === 'DONE') return;
      setSyncStatus('SYNCING');
      const success = await saveAuditsToCloud(bdeInfo, sessionAudits);
      setSyncStatus(success ? 'DONE' : 'ERROR');
  };

  const handleDownload = () => {
      // Trigger sync on click
      if (syncStatus === 'ERROR' || syncStatus === 'IDLE') syncToCloud();
      onExport();
  };

  const handleEmail = () => {
    // Trigger sync on click
    if (syncStatus === 'ERROR' || syncStatus === 'IDLE') syncToCloud();
    const subject = encodeURIComponent(`Compiled Stock Report - ${bdeInfo.region} - ${bdeInfo.bdeName}`);
    const body = encodeURIComponent(`Dear Team,\n\nPlease find the attached compiled Stock In Hand (SOH) report for the following session:\n\nBDE: ${bdeInfo.bdeName}\nRegion: ${bdeInfo.region}\nTotal Stores Audited: ${totalStores}\nTotal Units Counted: ${totalUnits}\n\n[PLEASE ATTACH THE DOWNLOADED EXCEL FILE HERE]\n\nRegards,\n${bdeInfo.bdeName}`);
    window.location.href = `mailto:prit.singh@brillarescience.com?subject=${subject}&body=${body}`;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg animate-fade-in overflow-hidden">
      <div className="p-6 bg-indigo-800 text-white flex justify-between items-center">
         <div>
             <h2 className="text-2xl font-bold">Session Summary</h2>
             <p className="opacity-80">Ready to compile and export.</p>
         </div>
         {/* Sync Status Badge */}
         {syncStatus !== 'IDLE' && (
             <div className="text-xs font-bold px-3 py-1 rounded-full bg-black/30 flex items-center gap-2">
                 {syncStatus === 'SYNCING' && <>
                    <svg className="animate-spin h-3 w-3 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Syncing...
                 </>}
                 {syncStatus === 'DONE' && <span className="text-emerald-300">✓ Saved to Cloud</span>}
                 {syncStatus === 'ERROR' && <span className="text-red-300">⚠ Sync Failed</span>}
             </div>
         )}
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
                            const qty = Array.from(audit.stockData.values()).reduce((a: number, b: number) => a + b, 0);
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
        <div className="space-y-4 pt-4 border-t border-slate-100">
            {/* Option 1: Download */}
            <Button onClick={handleDownload} disabled={sessionAudits.length === 0} className="shadow-lg shadow-indigo-200 py-4">
                <div className="flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    1. Download Compiled Report
                </div>
            </Button>
            
            {/* Option 2: Back to Audit */}
            <Button 
                onClick={onContinueSession}
                variant="secondary"
                className="border-2 border-indigo-600 text-indigo-700 bg-white hover:bg-indigo-50 font-bold py-3"
            >
                2. Back to Audit (Add more stores)
            </Button>
            
            {/* Option 3: Email */}
            <button 
                onClick={handleEmail} 
                disabled={sessionAudits.length === 0} 
                className="w-full py-3 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                3. Email Report to HO (Optional)
            </button>

            {/* Option 4: Homepage */}
             <button 
                onClick={onHome}
                className="w-full py-3 text-red-500 font-medium hover:bg-red-50 rounded-lg transition-colors text-sm mt-2"
            >
                4. Homepage
            </button>
        </div>
      </div>
    </div>
  );
};
