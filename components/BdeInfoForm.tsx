
import React, { useState, useEffect } from 'react';
import type { BdeInfo } from '../types';
import { BDE_DETAILS } from '../constants';
import { Button } from './common/Button';

interface BdeInfoFormProps {
  onSubmit: (info: BdeInfo) => void;
}

export const BdeInfoForm: React.FC<BdeInfoFormProps> = ({ onSubmit }) => {
  const [bdeName, setBdeName] = useState('');
  const [region, setRegion] = useState('');

  useEffect(() => {
    if (bdeName) {
      const bdeDetail = BDE_DETAILS.find(b => b.name === bdeName);
      if (bdeDetail) {
        setRegion(bdeDetail.region);
      }
    } else {
      setRegion('');
    }
  }, [bdeName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (bdeName && region) {
      onSubmit({ bdeName, region });
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white rounded-xl shadow-xl overflow-hidden animate-fade-in">
      <div className="bg-indigo-600 px-6 py-8 text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Welcome, BDE</h2>
        <p className="text-indigo-100">Select your identity to start a session.</p>
      </div>
      
      <div className="p-8 space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Who are you?</label>
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

        <div className="pt-4">
          <Button 
            onClick={handleSubmit} 
            disabled={!bdeName || !region}
            className="w-full text-lg py-4"
          >
            Start Session
          </Button>
        </div>
      </div>
    </div>
  );
};
