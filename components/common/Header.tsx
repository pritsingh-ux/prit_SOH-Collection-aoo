
import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-md">
      <div className="max-w-4xl mx-auto py-4 px-4 sm:px-6">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
          Brillare- Retail SOH
        </h1>
        <p className="text-sm text-slate-500">Stock-in-Hand Data Collection</p>
      </div>
    </header>
  );
};