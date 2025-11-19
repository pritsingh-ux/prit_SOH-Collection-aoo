
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Header } from './components/common/Header';
import { exportToExcel } from './services/excelService';
import type { BdeInfo, StockData, Sku, Store, StoreAudit } from './types';
import { ALL_SKUS } from './constants';
import { serializeState, loadSessionState, clearSessionState } from './services/storageService';

// Components
import { BdeInfoForm } from './components/BdeInfoForm';
import { Dashboard } from './components/Dashboard';
import { StoreSelection } from './components/StoreSelection';
import { StockEntryList } from './components/StockEntryList';
import { StoreAuditReview } from './components/StoreAuditReview';
import { ReviewAndExport } from './components/ReviewAndExport';

type AppStep = 'BDE_LOGIN' | 'DASHBOARD' | 'STORE_SELECT' | 'STOCK_ENTRY' | 'REVIEW_SINGLE' | 'REVIEW_SESSION';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>('BDE_LOGIN');
  const [bdeInfo, setBdeInfo] = useState<BdeInfo | null>(null);
  
  // Session State
  const [sessionAudits, setSessionAudits] = useState<StoreAudit[]>([]);
  
  // Current Audit State
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [currentStockData, setCurrentStockData] = useState<StockData>(new Map());
  
  const [customSkus, setCustomSkus] = useState<Sku[]>([]);
  const activeSkus = useMemo(() => [...ALL_SKUS, ...customSkus], [customSkus]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Delete Modal State
  const [deleteModalState, setDeleteModalState] = useState<{isOpen: boolean, auditId: string | null, storeName: string}>({
      isOpen: false,
      auditId: null,
      storeName: ''
  });

  // --- CRASH RECOVERY LOGIC ---
  
  // 1. Load State on Mount
  useEffect(() => {
      const saved = loadSessionState();
      if (saved && saved.bdeInfo) {
          // Restore state
          setBdeInfo(saved.bdeInfo);
          setSessionAudits(saved.sessionAudits);
          setCurrentStore(saved.currentStore);
          setCurrentStockData(saved.currentStockData);
          setCustomSkus(saved.customSkus);
          setStep(saved.step);
          console.log("Session restored from auto-save");
      }
      setIsLoaded(true);
  }, []);

  // 2. Auto-Save on Change
  useEffect(() => {
      if (!isLoaded) return;
      
      // Only save if we have a logged-in session
      if (bdeInfo) {
          serializeState(step, bdeInfo, sessionAudits, currentStore, currentStockData, customSkus);
      }
  }, [step, bdeInfo, sessionAudits, currentStore, currentStockData, customSkus, isLoaded]);

  // 3. Prevent accidental close
  useEffect(() => {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
          if (bdeInfo && (sessionAudits.length > 0 || currentStockData.size > 0)) {
              e.preventDefault();
              e.returnValue = ''; // Chrome requires this
          }
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [bdeInfo, sessionAudits, currentStockData]);


  // --- HANDLERS ---

  // 1. Login
  const handleLogin = (info: BdeInfo) => {
    setBdeInfo(info);
    setStep('DASHBOARD');
  };

  const handleLogout = () => {
      const hasData = sessionAudits.length > 0;
      
      const performLogout = () => {
          setBdeInfo(null);
          setSessionAudits([]);
          setCurrentStockData(new Map());
          setCurrentStore(null);
          setStep('BDE_LOGIN');
          clearSessionState(); // WIPE DATA
      };

      if (hasData) {
          // Use setTimeout to ensure confirm works on mobile touch events
          setTimeout(() => {
            if (window.confirm("Ending session will clear all collected data. Are you sure you want to exit?")) {
                performLogout();
            }
          }, 50);
      } else {
          performLogout();
      }
  };

  // 2. Dashboard Actions
  const handleStartAudit = () => {
      setStep('STORE_SELECT');
  };

  const handleFinishSession = () => {
      setStep('REVIEW_SESSION');
  };
  
  const handleEditSessionAudit = (auditId: string) => {
      console.log("App: Edit requested for", auditId);
      // Robust ID check: convert both to string to avoid number/string mismatch issues
      const auditToEdit = sessionAudits.find(a => String(a.id) === String(auditId));
      
      if (auditToEdit) {
          // INSTANT EDIT: Removed confirmation dialog to make UI more responsive
          // Remove from completed list
          setSessionAudits(prev => prev.filter(a => String(a.id) !== String(auditId)));
          
          // Load into active state
          setCurrentStore(auditToEdit.store);
          // Create a DEEP COPY of the map to ensure editability
          setCurrentStockData(new Map(auditToEdit.stockData));
          setStep('STOCK_ENTRY');
      } else {
          console.error("Audit not found with ID:", auditId);
          alert("Error: Could not load audit for editing.");
      }
  };

  const handleDeleteSessionAudit = (auditId: string) => {
      console.log("App: Delete requested for", auditId);
      
      // Robust ID check
      const auditToDelete = sessionAudits.find(a => String(a.id) === String(auditId));
      
      if (auditToDelete) {
          // Open Custom Modal instead of window.confirm
          setDeleteModalState({
              isOpen: true,
              auditId: auditId,
              storeName: auditToDelete.store.name
          });
      } else {
           console.error("Audit not found with ID:", auditId);
      }
  };
  
  const confirmDeleteAudit = () => {
      if (deleteModalState.auditId) {
          setSessionAudits(prev => prev.filter(a => String(a.id) !== String(deleteModalState.auditId)));
          setDeleteModalState({ isOpen: false, auditId: null, storeName: '' });
      }
  };

  // 3. Store Selection
  const handleStoreSelected = (store: Store) => {
      setCurrentStore(store);
      setCurrentStockData(new Map()); // Reset for new store
      setStep('STOCK_ENTRY');
  };

  const handleBackToDashboard = () => {
      setStep('DASHBOARD');
  };

  // 4. Stock Entry
  const handleStockSubmit = (data: StockData) => {
      setCurrentStockData(data);
      setStep('REVIEW_SINGLE');
  };
  
  const handleAddCustomSku = (newSku: Sku) => {
    setCustomSkus(prev => [...prev, newSku]);
  };

  // 5. Single Store Review
  const handleConfirmStoreAudit = () => {
      if (currentStore && bdeInfo) {
          const newAudit: StoreAudit = {
              id: Date.now().toString(),
              store: currentStore,
              stockData: currentStockData,
              timestamp: Date.now()
          };
          
          setSessionAudits(prev => [...prev, newAudit]);
          
          // Cleanup
          setCurrentStore(null);
          setCurrentStockData(new Map());
          setStep('DASHBOARD');
      }
  };

  const handleEditCurrentStore = () => {
      setStep('STOCK_ENTRY');
  };

  // 6. Session Export
  const handleExport = useCallback(() => {
    if (bdeInfo) {
      exportToExcel(bdeInfo, sessionAudits, activeSkus);
    }
  }, [bdeInfo, sessionAudits, activeSkus]);

  const handleContinueSession = () => {
      setStep('DASHBOARD');
  };


  const renderStep = () => {
    if (!isLoaded) return <div className="p-10 text-center text-slate-500">Loading...</div>;

    switch (step) {
      case 'BDE_LOGIN':
        return <BdeInfoForm onSubmit={handleLogin} />;
      
      case 'DASHBOARD':
        return bdeInfo && (
            <Dashboard 
                bdeInfo={bdeInfo} 
                sessionAudits={sessionAudits}
                onStartAudit={handleStartAudit}
                onFinishSession={handleFinishSession}
                onLogout={handleLogout}
                onEditAudit={handleEditSessionAudit}
                onDeleteAudit={handleDeleteSessionAudit}
            />
        );
      
      case 'STORE_SELECT':
        return bdeInfo && (
            <StoreSelection 
                bdeName={bdeInfo.bdeName}
                onSelectStore={handleStoreSelected}
                onBack={handleBackToDashboard}
                auditedStoreIds={sessionAudits.map(a => a.store.id)}
            />
        );

      case 'STOCK_ENTRY':
        return currentStore && (
          <StockEntryList 
            initialStockData={currentStockData} 
            availableSkus={activeSkus}
            onSubmit={handleStockSubmit} 
            onBack={() => {
                if(window.confirm("Cancel this store audit? Data will be lost.")) {
                    setStep('DASHBOARD');
                    setCurrentStockData(new Map());
                    setCurrentStore(null);
                }
            }}
            onAddSku={handleAddCustomSku}
            retailerName={currentStore.name} 
          />
        );
        
      case 'REVIEW_SINGLE':
        return currentStore && (
            <StoreAuditReview 
                store={currentStore}
                stockData={currentStockData}
                allSkus={activeSkus}
                onConfirm={handleConfirmStoreAudit}
                onEdit={handleEditCurrentStore}
            />
        );

      case 'REVIEW_SESSION':
        return bdeInfo && (
          <ReviewAndExport
            bdeInfo={bdeInfo}
            sessionAudits={sessionAudits}
            allSkus={activeSkus}
            onExport={handleExport}
            onContinueSession={handleContinueSession}
            onHome={handleLogout}
          />
        );
      default:
        return <BdeInfoForm onSubmit={handleLogin} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 relative">
      <Header />
      <main className="p-3 sm:p-6 pb-24 max-w-4xl mx-auto">
        {renderStep()}
      </main>
      
      {/* Custom Delete Confirmation Modal */}
      {deleteModalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 transform transition-all scale-100">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h3 className="text-lg font-bold text-center text-slate-900 mb-2">Delete Audit?</h3>
                <p className="text-sm text-center text-slate-500 mb-6">
                    Are you sure you want to remove the audit for <span className="font-bold text-slate-800">{deleteModalState.storeName}</span>? This cannot be undone.
                </p>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setDeleteModalState({isOpen: false, auditId: null, storeName: ''})}
                        className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={confirmDeleteAudit}
                        className="flex-1 px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;
