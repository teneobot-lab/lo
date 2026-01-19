
import React, { useState } from 'react';
import { storageService } from '../services/storageService';
import { User } from '../types';
import { Lock, User as UserIcon, ArrowRight } from 'lucide-react';
import { ToastType } from './Toast';

interface LoginProps {
  onLogin: (user: User) => void;
  notify: (msg: string, type: ToastType) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin, notify }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const hash = storageService.hashPassword(password);
    const user = storageService.login(username, hash);
    
    if (user) {
      onLogin(user);
    } else {
      setError('Invalid credentials');
      notify('Invalid credentials. Try admin / 12345', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FB] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md p-8 rounded-3xl shadow-xl shadow-indigo-100 border border-white">
        <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">Nexus WMS</h1>
            <p className="text-muted mt-2">Sign in to your warehouse dashboard</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted uppercase ml-1">Username</label>
            <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                    type="text" 
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="Enter username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-muted uppercase ml-1">Password</label>
            <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                    type="password" 
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
            </div>
          </div>

          {error && <p className="text-rose-500 text-sm text-center font-medium bg-rose-50 py-2 rounded-lg">{error}</p>}

          <button 
            type="submit" 
            className="w-full py-3.5 bg-gradient-to-r from-primary to-secondary text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2 group"
          >
            Sign In <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-muted">Protected by SHA-256 Encryption. <br/> Demo Accounts: admin/12345, staff/12345</p>
        </div>
      </div>
    </div>
  );
};
