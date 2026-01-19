
import React, { useState } from 'react';
import { storageService } from '../services/storageService';
import { User } from '../types';
import { Lock, User as UserIcon, ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import { ToastType } from './Toast';

interface LoginProps {
  onLogin: (user: User) => void;
  notify: (msg: string, type: ToastType) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin, notify }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Artificial delay for better UX (animation)
    await new Promise(resolve => setTimeout(resolve, 800));

    const hash = storageService.hashPassword(password);
    const user = storageService.login(username, hash);
    
    if (user) {
      setIsSuccess(true);
      // Wait for success animation to finish before changing state in App
      setTimeout(() => {
        onLogin(user);
      }, 1000);
    } else {
      setIsLoading(false);
      setError('Invalid credentials');
      notify('Invalid credentials. Try admin / 12345', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FB] dark:bg-gray-900 flex items-center justify-center p-4 transition-colors duration-500">
      <div className={`bg-white dark:bg-gray-800 w-full max-w-md p-8 rounded-3xl shadow-xl shadow-indigo-100 dark:shadow-none border border-white dark:border-gray-700 transition-all duration-500 ease-in-out transform ${isSuccess ? 'scale-105 shadow-emerald-200 dark:shadow-emerald-900/20' : ''}`}>
        
        {isSuccess ? (
          <div className="flex flex-col items-center justify-center py-10 animate-in zoom-in duration-500">
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4 text-emerald-600 dark:text-emerald-400 shadow-lg shadow-emerald-200 dark:shadow-none">
              <CheckCircle size={48} className="animate-bounce" strokeWidth={3} />
            </div>
            <h2 className="text-2xl font-bold text-dark dark:text-white">Login Successful!</h2>
            <p className="text-muted dark:text-gray-400 mt-2">Redirecting to dashboard...</p>
          </div>
        ) : (
          <div className={`transition-opacity duration-300 ${isLoading ? 'opacity-90' : 'opacity-100'}`}>
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">Nexus WMS</h1>
                <p className="text-muted dark:text-gray-400 mt-2">Sign in to your warehouse dashboard</p>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted dark:text-gray-400 uppercase ml-1">Username</label>
                <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        disabled={isLoading}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-gray-900 border border-border dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-dark dark:text-white"
                        placeholder="Enter username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted dark:text-gray-400 uppercase ml-1">Password</label>
                <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="password" 
                        disabled={isLoading}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-gray-900 border border-border dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-dark dark:text-white"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>
              </div>

              {error && <p className="text-rose-500 text-sm text-center font-medium bg-rose-50 dark:bg-rose-900/20 py-2 rounded-lg animate-in fade-in slide-in-from-top-2">{error}</p>}

              <button 
                type="submit" 
                disabled={isLoading}
                className={`w-full py-3.5 font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 group relative overflow-hidden
                  ${isLoading 
                    ? 'bg-slate-100 dark:bg-gray-700 text-slate-400 dark:text-gray-500 shadow-none cursor-not-allowed' 
                    : 'bg-gradient-to-r from-primary to-secondary text-white shadow-indigo-500/30 hover:shadow-xl hover:scale-[1.02]'
                  }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" /> Verifying...
                  </>
                ) : (
                  <>
                    Sign In <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-gray-700 text-center">
                <p className="text-xs text-muted dark:text-gray-500">Protected by SHA-256 Encryption. <br/> Demo Accounts: admin/12345, staff/12345</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
