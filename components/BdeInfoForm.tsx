
import React, { useState, useEffect } from 'react';
import type { BdeInfo, UserRole } from '../types';
import { BDE_DETAILS } from '../constants';
import { Button } from './common/Button';
import { Input } from './common/Input';

interface BdeInfoFormProps {
  onSubmit: (info: BdeInfo) => void;
  onAdminClick?: () => void;
}

export const BdeInfoForm: React.FC<BdeInfoFormProps> = ({ onSubmit, onAdminClick }) => {
  const [role, setRole] = useState<UserRole>('BDE');
  const [bdeName, setBdeName] = useState('');
  const [region, setRegion] = useState('');
  
  // For BA Manual Input
  const [baName, setBaName] = useState('');

  useEffect(() => {
    if (role === 'BDE') {
        if (bdeName) {
            const bdeDetail = BDE_DETAILS.find(b => b.name === bdeName);
            if (bdeDetail) {
                setRegion(bdeDetail.region);
            }
        } else {
            setRegion('');
        }
    } else {
        // Reset for BA
        setRegion('Store Audit Mode'); 
    }
  }, [bdeName, role]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (role === 'BDE' && bdeName && region) {
      onSubmit({ bdeName, region, role: 'BDE' });
    } else if (role === 'BA' && baName) {
      onSubmit({ bdeName: baName, region: 'N/A', role: 'BA' });
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white rounded-xl shadow-xl overflow-hidden animate-fade-in relative pb-12">
      <div className="bg-indigo-600 px-6 py-8 text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Welcome</h2>
        <p className="text-indigo-100">Select your role to continue.</p>
      </div>
      
      <div className="p-6">
          <div className="flex bg-slate-100 p-1 rounded-lg mb-6">
              <button 
                type="button"
                onClick={() => setRole('BDE')}
                className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${role === 'BDE' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                  I am a BDE (Compiler)
              </button>
              <button 
                type="button"
                onClick={() => setRole('BA')}
                className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${role === 'BA' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                  I am a BA (Store Audit)
              </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {role === 'BDE' ? (
                <>
                    <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Select Name</label>
                    <select 
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-slate-900 text-lg"
                        value={bdeName}
                        onChange={(e) => setBdeName(e.target.value)}
                    >
                        <option value="">-- Select Name --</option>
                        {BDE_DETAILS.map(bde => (
                        <option key={bde.name} value={bde.name}>{bde.name}</option>
                        ))}
                    </select>
                    </div>
                    {region && (
                        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 text-center animate-fade-in">
                            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Your Region</span>
                            <p className="text-xl font-bold text-indigo-900 mt-1">{region}</p>
                        </div>
                    )}
                </>
            ) : (
                <div className="animate-fade-in">
                    <Input 
                        id="baName"
                        label="Your Name"
                        placeholder="Enter your name"
                        value={baName}
                        onChange={(e) => setBaName(e.target.value)}
                    />
                    <div className="mt-4 bg-amber-50 p-4 rounded-xl border border-amber-100">
                        <p className="text-sm text-amber-800">
                            <strong>Note:</strong> As a Beauty Advisor, you will fill stock data for your store and then share a code via WhatsApp to your BDE for compilation.
                        </p>
                    </div>
                </div>
            )}

            <div className="pt-2">
            <Button 
                type="submit"
                disabled={(role === 'BDE' && (!bdeName || !region)) || (role === 'BA' && !baName)}
                className="w-full text-lg py-4"
            >
                {role === 'BDE' ? 'Start Compilation Session' : 'Start Store Audit'}
            </Button>
            </div>
          </form>
      </div>
      
      {/* Admin Link */}
      <div className="absolute bottom-2 w-full text-center">
        <button 
            onClick={onAdminClick}
            className="text-xs text-slate-300 hover:text-indigo-500 transition-colors"
        >
            Admin Access
        </button>
      </div>
    </div>
  );
};
