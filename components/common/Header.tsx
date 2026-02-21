import React from 'react';
import type { BdeInfo } from '../types';

interface HeaderProps {
  bdeInfo?: BdeInfo | null;
  onLogout?: () => void;
  onAdminAccess?: () => void;
  isAdmin?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ bdeInfo, onLogout, onAdminAccess, isAdmin }) => {
  return (
    <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-4xl mx-auto py-3 px-4 sm:px-6 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <span className="bg-indigo-600 text-white p-1 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
              </svg>
            </span>
            Brillare- Retail SOH
          </h1>
          {isAdmin && <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Admin Control Panel</span>}
        </div>
        
        <div className="flex items-center gap-3">
          {bdeInfo && !isAdmin && (
            <div className="hidden sm:flex flex-col items-end mr-2">
              <span className="text-xs font-bold text-slate-900">{bdeInfo.bdeName}</span>
              <span className="text-[10px] text-slate-500 uppercase">{bdeInfo.region}</span>
            </div>
          )}
          
          {(bdeInfo || isAdmin) && onLogout && (
            <button 
              onClick={onLogout}
              className="px-3 py-1.5 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 rounded-lg text-xs font-bold transition-all border border-slate-200 hover:border-red-100"
            >
              Logout
            </button>
          )}
        </div>
      </div>
    </header>
  );
};