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
    onDeleteAudit: (auditId: string) => void;
    onImportAudit: () => void; // New Handler
}

export const Dashboard: React.FC<DashboardProps> = ({ bdeInfo, sessionAudits, onStartAudit, onFinishSession, onLogout, onEditAudit, onDeleteAudit, onImportAudit }) => {
    
    const totalItemsCollected = sessionAudits.reduce((sum, audit) => {
        return sum + Array.from(audit.stockData.values()).reduce((a: number, b: number) => a + b, 0);
    }, 0);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header Card */}
            <div className={`${bdeInfo.role === 'BDE' ? 'bg-indigo-700' : 'bg-slate-700'} rounded-2xl p-6 text-white shadow-xl`}>
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-white/60 text-sm font-medium mb-1">
                            {bdeInfo.role === 'BDE' ? 'Compiler Session' : 'Store Audit Mode'}
                        </p>
                        <h2 className="text-3xl font-bold">{bdeInfo.bdeName}</h2>
                        {bdeInfo.role === 'BDE' && (
                            <div className="flex items-center gap-2 mt-2 text-indigo-100">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                </svg>
                                <span>{bdeInfo.region}</span>
                            </div>
                        )}
                    </div>
                    <button 
                        onClick={onLogout}
                        className="text-xs bg-black/20 hover:bg-red-600/90 border border-white/20 hover:border-red-50 text-white px-4 py-2 rounded-lg transition-all font-semibold flex items-center gap-1"
                    >
                        End Session
                    </button>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-8">
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                        <p className="text-white/60 text-xs uppercase font-bold">Stores Audited</p>
                        <p className="text-2xl font-bold">{sessionAudits.length}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                        <p className="text-white/60 text-xs uppercase font-bold">Total Quantity</p>
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
                
                {/* BDE ONLY: Import Button */}
                {bdeInfo.role === 'BDE' && (
                     <Button 
                        onClick={onImportAudit} 
                        className="bg-purple-600 hover:bg-purple-700 shadow-purple-200 py-4"
                     >
                        <div className="flex items-center justify-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Import Audit (From BA)
                        </div>
                    </Button>
                )}

                {sessionAudits.length > 0 && bdeInfo.role === 'BDE' && (
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
                            const count = Array.from(audit.stockData.values()).reduce((a: number, b: number) => a + b, 0);
                            return (
                                <div key={audit.id} className="bg-white p-3 sm:p-4 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center relative z-0">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <span className="bg-slate-100 text-slate-500 text-xs font-bold h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0">
                                            {index + 1}
                                        </span>
                                        <div className="truncate pr-2">
                                            <p className="font-bold text-slate-800 truncate">{audit.store.name}</p>
                                            <p className="text-xs text-slate-400">Store Id: {audit.store.bsrn}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        <div className="text-right hidden sm:block mr-2">
                                            <p className="text-lg font-bold text-indigo-600">{count}</p>
                                            <p className="text--[10px] text-slate-400 uppercase">Units</p>
                                        </div>
                                        <div className="flex gap-3">
                                            <button 
                                                type="button"
                                                onClick={(e) => { 
                                                    e.preventDefault(); 
                                                    e.stopPropagation(); 
                                                    onEditAudit(audit.id); 
                                                }}
                                                className="w-12 h-12 flex items-center justify-center bg-indigo-100 text-indigo-600 rounded-xl hover:bg-indigo-200 hover:text-indigo-700 active:scale-95 transition-all cursor-pointer shadow-sm z-30"
                                                title="Edit Audit"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
                                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                </svg>
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={(e) => { 
                                                    e.preventDefault(); 
                                                    e.stopPropagation(); 
                                                    onDeleteAudit(audit.id); 
                                                }}
                                                className="w-12 h-12 flex items-center justify-center bg-red-50 text-red-400 rounded-xl hover:bg-red-100 hover:text-red-600 active:scale-95 transition-all cursor-pointer shadow-sm z-30"
                                                title="Delete Audit"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        </div>
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