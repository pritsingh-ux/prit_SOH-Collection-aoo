
import React, { useState, useCallback, useMemo } from 'react';
import { BdeInfoForm } from './components/BdeInfoForm';
import { StockEntryList } from './components/StockEntryList';
import { ReviewAndExport } from './components/ReviewAndExport';
import { Header } from './components/common/Header';
import { exportToExcel } from './services/excelService';
import type { BdeInfo, StockData, Sku } from './types';
import { ALL_SKUS } from './constants';

type AppStep = 'BDE_INFO' | 'STOCK_ENTRY' | 'REVIEW';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>('BDE_INFO');
  const [bdeInfo, setBdeInfo] = useState<BdeInfo | null>(null);
  const [stockData, setStockData] = useState<StockData>(new Map());
  const [customSkus, setCustomSkus] = useState<Sku[]>([]);

  // Merge static SKUs with user-added custom SKUs
  const activeSkus = useMemo(() => [...ALL_SKUS, ...customSkus], [customSkus]);

  const handleInfoSubmit = (info: BdeInfo) => {
    setBdeInfo(info);
    setStep('STOCK_ENTRY');
  };

  const handleStockSubmit = (data: StockData) => {
    setStockData(data);
    setStep('REVIEW');
  };

  const handleAddCustomSku = (newSku: Sku) => {
    setCustomSkus(prev => [...prev, newSku]);
  };

  const handleEditStock = () => {
    setStep('STOCK_ENTRY');
  };
  
  const handleBackToInfo = () => {
    setStep('BDE_INFO');
  };

  const handleExport = useCallback(() => {
    if (bdeInfo) {
      exportToExcel(bdeInfo, stockData, activeSkus);
    }
  }, [bdeInfo, stockData, activeSkus]);

  const handleStartOver = () => {
    if (window.confirm("Are you sure? Current progress will be lost.")) {
      setStep('BDE_INFO');
      setBdeInfo(null);
      setStockData(new Map());
      setCustomSkus([]);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'BDE_INFO':
        return <BdeInfoForm onSubmit={handleInfoSubmit} />;
      case 'STOCK_ENTRY':
        return (
          <StockEntryList 
            initialStockData={stockData} 
            availableSkus={activeSkus}
            onSubmit={handleStockSubmit} 
            onBack={handleBackToInfo}
            onAddSku={handleAddCustomSku}
            retailerName={bdeInfo?.store.name || ''} 
          />
        );
      case 'REVIEW':
        return bdeInfo && (
          <ReviewAndExport
            bdeInfo={bdeInfo}
            stockData={stockData}
            allSkus={activeSkus}
            onExport={handleExport}
            onEdit={handleEditStock}
            onStartOver={handleStartOver}
          />
        );
      default:
        return null;
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
