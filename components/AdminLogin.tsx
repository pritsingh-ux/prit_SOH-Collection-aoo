
import React, { useState } from 'react';
import { Button } from './common/Button';
import { Input } from './common/Input';

interface AdminLoginProps {
    onLoginSuccess: () => void;
    onBack: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess, onBack }) => {
    const [adminId, setAdminId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        // Hardcoded check for simplicity as requested. 
        // For higher security, enable Firebase Auth in console.
        if (adminId === 'admin' && password === 'admin123') {
            onLoginSuccess();
        } else {
            setError('Invalid credentials');
        }
    };

    return (
        <div className="max-w-md mx-auto mt-10 bg-white p-8 rounded-xl shadow-2xl animate-fade-in">
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800">Admin Portal</h2>
                <p className="text-slate-500">Enter credentials to access master database</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
                <Input 
                    id="adminId"
                    label="Admin ID"
                    value={adminId}
                    onChange={(e) => setAdminId(e.target.value)}
                    placeholder="Enter Admin ID"
                />
                <Input 
                    id="password"
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter Password"
                />

                {error && <p className="text-red-500 text-sm font-bold text-center">{error}</p>}

                <Button type="submit" className="bg-slate-800 hover:bg-slate-900">
                    Login to Dashboard
                </Button>
            </form>

            <button onClick={onBack} className="w-full mt-4 text-sm text-slate-400 hover:text-slate-600">
                Back to App
            </button>
        </div>
    );
};
