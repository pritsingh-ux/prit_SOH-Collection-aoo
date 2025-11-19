
import React from 'react';
import type { BdeInfo, StoreAudit } from '../types';
import { Button } from './common/Button';

interface DashboardProps {
    bdeInfo: BdeInfo;
    sessionAudits: StoreAudit[];
    onStartAudit: () => void;
    onFinishSession: () => void;
    onLogout: () => void;
    onEditAudit: (auditId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ bdeInfo, sessionAudits, onStartAudit, onFinishSession, onLogout, onEditAudit }) => {
    
    const totalItemsCollected = sessionAudits.reduce((sum, audit) => {
        return sum + Array.from(audit.stockData.values()).reduce((a, b) => a + b, 0);
    }, 0);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header Card */}
            <div className="bg-indigo-700 rounded-2xl p-6 text-white shadow-xl">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-indigo-200 text-sm font-medium mb-1">Current Session</p>
                        <h2 className="text-3xl font-bold">{bdeInfo.bdeName}</h2>
                        <div className="flex items-center gap-2 mt-2 text-indigo-100">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                            </svg>
                            <span>{bdeInfo.region}</span>
                        </div>
                    </div>
                    <button 
                        onClick={onLogout}
                        className="text-xs bg-indigo-900/50 hover:bg-red-600/90 border border-indigo-400 hover:border-red-500 text-white px-4 py-2 rounded-lg transition-all font-semibold flex items-center gap-1"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        End Session
                    </button>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-8">
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                        <p className="text-indigo-200 text-xs uppercase font-bold">Stores Audited</p>
                        <p className="text-2xl font-bold">{sessionAudits.length}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                        <p className="text-indigo-200 text-xs uppercase font-bold">Total Quantity</p>
                        <p className="text-2xl font-bold">{totalItemsCollected}</p>
                    </div>
                </div>
            </div>

            {/* Action Area */}
            <div className="grid gap-4">
                <Button onClick={onStartAudit} className="py-4 text-lg shadow-indigo-200">
                    <div className="flex items-center justify-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Audit New Store
                    </div>
                </Button>

                {sessionAudits.length > 0 && (
                     <Button onClick={onFinishSession} variant="secondary" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200">
                        Compile & Finish Session
                    </Button>
                )}
            </div>

            {/* Recent Activity List */}
            <div>
                <h3 className="text-sm font-bold text-slate-500 uppercase mb-3 ml-1">Session History</h3>
                {sessionAudits.length === 0 ? (
                    <div className="text-center py-8 bg-white rounded-xl border-2 border-dashed border-slate-200">
                        <p className="text-slate-400 font-medium">No stores audited yet.</p>
                        <p className="text-xs text-slate-300 mt-1">Click "Audit New Store" to begin.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {sessionAudits.map((audit, index) => {
                            const count = Array.from(audit.stockData.values()).reduce((a, b) => a + b, 0);
                            return (
                                <div key={audit.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <span className="bg-slate-100 text-slate-500 text-xs font-bold h-6 w-6 rounded-full flex items-center justify-center">
                                            {index + 1}
                                        </span>
                                        <div>
                                            <p className="font-bold text-slate-800">{audit.store.name}</p>
                                            <p className="text-xs text-slate-400">BSRN: {audit.store.bsrn}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-right mr-2">
                                            <p className="text-lg font-bold text-indigo-600">{count}</p>
                                            <p className="text-[10px] text-slate-400 uppercase">Units</p>
                                        </div>
                                        <button 
                                            onClick={() => onEditAudit(audit.id)}
                                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                            title="Edit Audit"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
