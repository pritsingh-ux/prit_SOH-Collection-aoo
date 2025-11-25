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
import { Input } from './components/common/Input';
import { Button } from './components/common/Button';

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

  // Modals
  const [deleteModalState, setDeleteModalState] = useState<{isOpen: boolean, auditId: string | null, storeName: string}>({
      isOpen: false,
      auditId: null,
      storeName: ''
  });
  
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importCode, setImportCode] = useState('');

  // --- CRASH RECOVERY LOGIC ---
  useEffect(() => {
      const saved = loadSessionState();
      if (saved && saved.bdeInfo) {
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

  useEffect(() => {
      if (!isLoaded) return;
      if (bdeInfo) {
          serializeState(step, bdeInfo, sessionAudits, currentStore, currentStockData, customSkus);
      }
  }, [step, bdeInfo, sessionAudits, currentStore, currentStockData, customSkus, isLoaded]);

  useEffect(() => {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
          if (bdeInfo && (sessionAudits.length > 0 || currentStockData.size > 0)) {
              e.preventDefault();
              e.returnValue = ''; 
          }
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [bdeInfo, sessionAudits, currentStockData]);


  // --- HANDLERS ---

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
          clearSessionState(); 
      };

      if (hasData) {
          setTimeout(() => {
            if (window.confirm("Ending session will clear all collected data. Are you sure you want to exit?")) {
                performLogout();
            }
          }, 50);
      } else {
          performLogout();
      }
  };

  const handleStartAudit = () => {
      setStep('STORE_SELECT');
  };

  const handleFinishSession = () => {
      setStep('REVIEW_SESSION');
  };
  
  const handleEditSessionAudit = (auditId: string) => {
      console.log("App: Edit requested for", auditId);
      const auditToEdit = sessionAudits.find(a => String(a.id) === String(auditId));
      if (auditToEdit) {
          setSessionAudits(prev => prev.filter(a => String(a.id) !== String(auditId)));
          setCurrentStore(auditToEdit.store);
          setCurrentStockData(new Map(auditToEdit.stockData));
          setStep('STOCK_ENTRY');
      } else {
          console.error("Audit not found with ID:", auditId);
          alert("Error: Could not load audit for editing.");
      }
  };

  const handleDeleteSessionAudit = (auditId: string) => {
      const auditToDelete = sessionAudits.find(a => String(a.id) === String(auditId));
      if (auditToDelete) {
          setDeleteModalState({
              isOpen: true,
              auditId: auditId,
              storeName: auditToDelete.store.name
          });
      }
  };
  
  const confirmDeleteAudit = () => {
      if (deleteModalState.auditId) {
          setSessionAudits(prev => prev.filter(a => String(a.id) !== String(deleteModalState.auditId)));
          setDeleteModalState({ isOpen: false, auditId: null, storeName: '' });
      }
  };
  
  // --- IMPORT LOGIC ---
  const handleImportAudit = () => {
      setIsImportModalOpen(true);
  };
  
  const confirmImport = () => {
      if (!importCode) return;
      
      const result = parseShareCode(importCode);
      if (result) {
          const newAudit: StoreAudit = {
              id: Date.now().toString(),
              store: result.store,
              stockData: result.stockData,
              timestamp: Date.now()
          };
          
          setSessionAudits(prev => [...prev, newAudit]);
          setIsImportModalOpen(false);
          setImportCode('');
          alert(`Successfully imported audit for ${result.store.name}`);
      } else {
          alert("Invalid Code. Please ask the BA to share the code again.");
      }
  };

  // --- STORE FLOW ---
  const handleStoreSelected = (store: Store) => {
      setCurrentStore(store);
      setCurrentStockData(new Map()); 
      setStep('STOCK_ENTRY');
  };

  const handleBackToDashboard = () => {
      setStep('DASHBOARD');
  };

  const handleStockSubmit = (data: StockData) => {
      setCurrentStockData(data);
      setStep('REVIEW_SINGLE');
  };
  
  const handleAddCustomSku = (newSku: Sku) => {
    setCustomSkus(prev => [...prev, newSku]);
  };

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
                onImportAudit={handleImportAudit}
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
        return currentStore && bdeInfo && (
            <StoreAuditReview 
                store={currentStore}
                stockData={currentStockData}
                allSkus={activeSkus}
                onConfirm={handleConfirmStoreAudit}
                onEdit={handleEditCurrentStore}
                userRole={bdeInfo.role}
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
      
      {/* Delete Modal */}
      {deleteModalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6">
                <h3 className="text-lg font-bold text-center text-slate-900 mb-2">Delete Audit?</h3>
                <p className="text-sm text-center text-slate-500 mb-6">
                    Remove <span className="font-bold">{deleteModalState.storeName}</span>?
                </p>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setDeleteModalState({isOpen: false, auditId: null, storeName: ''})}
                        className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={confirmDeleteAudit}
                        className="flex-1 px-4 py-2 bg-red-600 text-white font-bold rounded-lg"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Import Audit Code</h3>
                <p className="text-sm text-slate-500 mb-4">Paste the code shared by the Beauty Advisor via WhatsApp.</p>
                
                <textarea 
                    className="w-full h-32 p-3 border border-slate-300 rounded-lg text-xs font-mono mb-4 focus:ring-2 focus:ring-purple-500"
                    placeholder="Paste code here..."
                    value={importCode}
                    onChange={(e) => setImportCode(e.target.value)}
                ></textarea>

                <div className="flex gap-3">
                     <button 
                        onClick={() => setIsImportModalOpen(false)}
                        className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 font-bold rounded-lg"
                    >
                        Cancel
                    </button>
                    <Button 
                        onClick={confirmImport}
                        disabled={!importCode}
                        className="flex-1 bg-purple-600 hover:bg-purple-700"
                    >
                        Import Data
                    </Button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;