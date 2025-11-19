
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
          if (window.confirm("Ending session will clear all collected data. Are you sure you want to exit?")) {
              performLogout();
          }
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
      const auditToEdit = sessionAudits.find(a => a.id === auditId);
      if (auditToEdit) {
          if(window.confirm(`Re-open audit for ${auditToEdit.store.name}? This will remove it from the completed list so you can edit it.`)) {
              // Remove from completed list
              setSessionAudits(prev => prev.filter(a => a.id !== auditId));
              
              // Load into active state
              setCurrentStore(auditToEdit.store);
              setCurrentStockData(auditToEdit.stockData);
              setStep('STOCK_ENTRY');
          }
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
            />
        );
      
      case 'STORE_SELECT':
        return bdeInfo && (
            <StoreSelection 
                bdeName={bdeInfo.bdeName}
                onSelectStore={handleStoreSelected}
                onBack={handleBackToDashboard}
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
          />
        );
      default:
        return <BdeInfoForm onSubmit={handleLogin} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Header />
      <main className="p-3 sm:p-6 pb-24 max-w-4xl mx-auto">
        {renderStep()}
      </main>
    </div>
  );
};

export default App;
