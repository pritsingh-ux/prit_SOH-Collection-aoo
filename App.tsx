import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Header } from './components/common/Header';
import { exportToExcel } from './services/excelService';
import type { BdeInfo, StockData, Sku, Store, StoreAudit } from './types';
import { ALL_SKUS } from './constants';
import { serializeState, loadSessionState, clearSessionState } from './services/storageService';
import { parseShareCode } from './services/shareService';

// Components
import { BdeInfoForm } from './components/BdeInfoForm';
import { Dashboard } from './components/Dashboard';
import { StoreSelection } from './components/StoreSelection';
import { StockEntryList } from './components/StockEntryList';
import { StoreAuditReview } from './components/StoreAuditReview';
import { ReviewAndExport } from './components/ReviewAndExport';
import { AdminLogin } from './components/AdminLogin';
import { AdminDashboard } from './components/AdminDashboard';
import { Button } from './components/common/Button';

type AppStep = 'BDE_LOGIN' | 'DASHBOARD' | 'STORE_SELECT' | 'STOCK_ENTRY' | 'REVIEW_SINGLE' | 'REVIEW_SESSION' | 'ADMIN_LOGIN' | 'ADMIN_DASHBOARD';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>('BDE_LOGIN');
  const [bdeInfo, setBdeInfo] = useState<BdeInfo | null>(null);
  
  // Session State
  const [sessionAudits, setSessionAudits] = useState<StoreAudit[]>([]);
  
  // Current Audit State
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [stockData, setStockData] = useState<StockData>(new Map());
  
  // Custom Items added during session
  const [customSkus, setCustomSkus] = useState<Sku[]>([]);

  // Modals
  const [deleteModalState, setDeleteModalState] = useState<{isOpen: boolean, auditId: string | null}>({isOpen: false, auditId: null});
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importCode, setImportCode] = useState('');

  // 1. Load Session on Mount
  useEffect(() => {
    const saved = loadSessionState();
    if (saved) {
      setStep(saved.step as AppStep); // Explicit cast for safety
      setBdeInfo(saved.bdeInfo);
      setSessionAudits(saved.sessionAudits);
      setCurrentStore(saved.currentStore);
      setStockData(saved.currentStockData);
      setCustomSkus(saved.customSkus);
    }
  }, []);

  // 2. Auto-Save on Change
  useEffect(() => {
    if (step !== 'BDE_LOGIN' && step !== 'ADMIN_LOGIN' && step !== 'ADMIN_DASHBOARD') {
      serializeState(step, bdeInfo, sessionAudits, currentStore, stockData, customSkus);
    }
  }, [step, bdeInfo, sessionAudits, currentStore, stockData, customSkus]);

  // 3. Prevent accidental close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (step !== 'BDE_LOGIN' && step !== 'ADMIN_LOGIN' && step !== 'ADMIN_DASHBOARD') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [step]);

  const allSkus = useMemo(() => [...ALL_SKUS, ...customSkus], [customSkus]);
  const auditedStoreIds = useMemo(() => sessionAudits.map(a => a.store.id), [sessionAudits]);

  const handleBdeLogin = (info: BdeInfo) => {
    setBdeInfo(info);
    setStep('DASHBOARD');
  };

  const handleAdminAccess = () => {
      setStep('ADMIN_LOGIN');
  };

  const handleAdminLoginSuccess = () => {
      setStep('ADMIN_DASHBOARD');
  };

  const handleLogout = useCallback(() => {
    if (sessionAudits.length > 0) {
        // Use custom modal for confirmation instead of window.confirm in production if needed, 
        // but for logout, usually a clean wipe is fine if they confirm. 
        // For simplicity in React, we'll assume they want to logout.
        // Or implement a modal.
    }
    clearSessionState();
    setStep('BDE_LOGIN');
    setBdeInfo(null);
    setSessionAudits([]);
    setCurrentStore(null);
    setStockData(new Map());
    setCustomSkus([]);
  }, [sessionAudits]);

  const handleStartStoreAudit = () => {
    setStep('STORE_SELECT');
  };

  const handleStoreSelect = (store: Store) => {
    setCurrentStore(store);
    // If we are editing an existing audit, load its data, otherwise empty map
    const existingAudit = sessionAudits.find(a => String(a.store.id) === String(store.id));
    if (existingAudit) {
        setStockData(new Map(existingAudit.stockData));
    } else {
        setStockData(new Map());
    }
    setStep('STOCK_ENTRY');
  };

  const handleAddCustomSku = (sku: Sku) => {
      setCustomSkus(prev => [...prev, sku]);
  };

  const handleStockSubmit = (data: StockData) => {
    setStockData(data);
    setStep('REVIEW_SINGLE');
  };

  const handleAuditConfirm = () => {
    if (!currentStore || !bdeInfo) return;

    const newAudit: StoreAudit = {
      id: Date.now().toString(),
      store: currentStore,
      stockData: new Map(stockData), // Create copy
      timestamp: Date.now()
    };

    // If editing, replace. If new, push.
    setSessionAudits(prev => {
        const idx = prev.findIndex(a => String(a.store.id) === String(currentStore.id));
        if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = newAudit;
            return updated;
        }
        return [...prev, newAudit];
    });

    setCurrentStore(null);
    setStockData(new Map());
    
    // If BA, they stay on review screen to share code. If BDE, back to dashboard.
    if (bdeInfo.role === 'BDE') {
        setStep('DASHBOARD');
    }
  };

  const handleEditAudit = () => {
    setStep('STOCK_ENTRY');
  };

  const handleSessionFinish = () => {
    setStep('REVIEW_SESSION');
  };

  const handleExport = () => {
    if (bdeInfo) {
      exportToExcel(bdeInfo, sessionAudits, allSkus);
    }
  };

  // Dashboard History Actions
  const handleEditSessionAudit = (auditId: string) => {
      console.log("App: Edit requested for", auditId);
      const audit = sessionAudits.find(a => String(a.id) === String(auditId));
      if (audit) {
          setCurrentStore(audit.store);
          setStockData(new Map(audit.stockData)); // Deep copy to prevent ref issues
          setStep('STOCK_ENTRY');
      }
  };

  const handleDeleteSessionAudit = (auditId: string) => {
      console.log("App: Delete requested for", auditId);
      const audit = sessionAudits.find(a => String(a.id) === String(auditId));
      if (audit) {
        setDeleteModalState({ isOpen: true, auditId });
      } else {
        alert("Error: Could not find audit data.");
      }
  };

  const confirmDeleteAudit = () => {
      if (deleteModalState.auditId) {
        setSessionAudits(prev => prev.filter(a => String(a.id) !== String(deleteModalState.auditId)));
        setDeleteModalState({ isOpen: false, auditId: null });
      }
  };

  // Import Audit Logic
  const handleImportAudit = () => {
      setImportCode('');
      setImportModalOpen(true);
  };

  const processImport = () => {
      const result = parseShareCode(importCode);
      if (result) {
          const { store, stockData: importedData } = result;
          
          // Add to session
          const newAudit: StoreAudit = {
            id: Date.now().toString(),
            store: store,
            stockData: importedData,
            timestamp: Date.now()
          };
          
          // Check if already exists, replace or add
          setSessionAudits(prev => {
             const idx = prev.findIndex(a => a.store.bsrn === store.bsrn);
             if (idx >= 0) {
                 const updated = [...prev];
                 updated[idx] = newAudit;
                 return updated;
             }
             return [...prev, newAudit];
          });
          
          setImportModalOpen(false);
          alert(`Successfully imported audit for ${store.name}`);
      } else {
          alert("Invalid Code. Please check and try again.");
      }
  };

  const renderStep = () => {
    switch (step) {
      case 'BDE_LOGIN':
        return <BdeInfoForm onSubmit={handleBdeLogin} onAdminClick={handleAdminAccess} />;
      
      case 'ADMIN_LOGIN':
          return <AdminLogin onLoginSuccess={handleAdminLoginSuccess} onBack={() => setStep('BDE_LOGIN')} />;
      
      case 'ADMIN_DASHBOARD':
          return <AdminDashboard onLogout={() => setStep('BDE_LOGIN')} />;

      case 'DASHBOARD':
        return bdeInfo ? (
            <Dashboard 
                bdeInfo={bdeInfo} 
                sessionAudits={sessionAudits}
                onStartAudit={handleStartStoreAudit}
                onFinishSession={handleSessionFinish}
                onLogout={handleLogout}
                onEditAudit={handleEditSessionAudit}
                onDeleteAudit={handleDeleteSessionAudit}
                onImportAudit={handleImportAudit}
            />
        ) : null;

      case 'STORE_SELECT':
        return bdeInfo ? (
            <StoreSelection 
                bdeName={bdeInfo.bdeName}
                onSelectStore={handleStoreSelect}
                onBack={() => setStep('DASHBOARD')}
                auditedStoreIds={auditedStoreIds}
            />
        ) : null;

      case 'STOCK_ENTRY':
        return currentStore ? (
            <StockEntryList 
                initialStockData={stockData}
                availableSkus={allSkus}
                onSubmit={handleStockSubmit}
                onBack={() => setStep('DASHBOARD')}
                onAddSku={handleAddCustomSku}
                retailerName={currentStore.name}
            />
        ) : null;

      case 'REVIEW_SINGLE':
        return currentStore && bdeInfo ? (
            <StoreAuditReview 
                store={currentStore}
                stockData={stockData}
                allSkus={allSkus}
                onConfirm={handleAuditConfirm}
                onEdit={handleEditAudit}
                bdeInfo={bdeInfo}
                onHome={handleLogout}
            />
        ) : null;

      case 'REVIEW_SESSION':
        return bdeInfo ? (
            <ReviewAndExport 
                bdeInfo={bdeInfo} 
                sessionAudits={sessionAudits}
                allSkus={allSkus}
                onExport={handleExport}
                onContinueSession={() => setStep('DASHBOARD')}
                onHome={handleLogout}
            />
        ) : null;

      default:
        return (
            <div className="text-center p-10">
                <p>Something went wrong.</p>
                <Button onClick={handleLogout}>Reset App</Button>
            </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Header />
      <main className="max-w-4xl mx-auto p-4 sm:p-6 pb-20">
        {renderStep()}
      </main>

      {/* Delete Confirmation Modal */}
      {deleteModalState.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 animate-fade-in">
             <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6">
                 <h3 className="text-lg font-bold text-slate-800 mb-2">Delete Audit?</h3>
                 <p className="text-slate-500 mb-6">This will remove the store data from your current session.</p>
                 <div className="flex gap-3">
                     <button onClick={() => setDeleteModalState({isOpen: false, auditId: null})} className="flex-1 py-3 font-bold text-slate-600 bg-slate-100 rounded-lg">Cancel</button>
                     <button onClick={confirmDeleteAudit} className="flex-1 py-3 font-bold text-white bg-red-600 rounded-lg">Delete</button>
                 </div>
             </div>
          </div>
      )}

      {/* Import Audit Modal */}
      {importModalOpen && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 animate-fade-in">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Import Audit Code</h3>
                  <div className="space-y-4">
                      <p className="text-sm text-slate-500">Paste the code shared by the Beauty Advisor via WhatsApp.</p>
                      <textarea 
                          className="w-full h-32 p-3 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                          placeholder="Paste code here..."
                          value={importCode}
                          onChange={(e) => setImportCode(e.target.value)}
                      />
                      <div className="flex gap-3">
                          <button onClick={() => setImportModalOpen(false)} className="flex-1 py-3 font-bold text-slate-600 bg-slate-100 rounded-lg">Cancel</button>
                          <button onClick={processImport} disabled={!importCode} className="flex-1 py-3 font-bold text-white bg-indigo-600 rounded-lg disabled:opacity-50">Import</button>
                      </div>
                  </div>
              </div>
           </div>
      )}
    </div>
  );
};

export default App;