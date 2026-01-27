
import React, { useState } from 'react';
import { storageService } from '../services/storageService';
import { User } from '../types';
import { Lock, User as UserIcon, ArrowRight, Loader2, CheckCircle, Shield, Users, RefreshCw, Hexagon } from 'lucide-react';
import { ToastType } from './Toast';

interface LoginProps {
  onLogin: (user: User) => void;
  notify: (msg: string, type: ToastType) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin, notify }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('12345');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const performLogin = async (u: string, p: string) => {
    setError('');
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 600));
    const hash = storageService.hashPassword(p);
    const user = await storageService.login(u, hash);
    if (user) {
      setIsSuccess(true);
      setTimeout(() => { onLogin(user); }, 800);
    } else {
      setIsLoading(false);
      setError('Username atau password salah.');
      notify('Login gagal. Periksa koneksi atau kredensial.', 'error');
    }
  };

  const handleLogin = (e: React.FormEvent) => { e.preventDefault(); performLogin(username, password); };
  const quickLogin = (u: string, p: string) => { setUsername(u); setPassword(p); performLogin(u, p); };
  const handleResetMode = () => { localStorage.removeItem('nexus_api_url'); notify('Reset koneksi ke default.', 'success'); window.location.reload(); };

  return (
    <div className="min-h-screen bg-[#F4F5F7] dark:bg-gray-900 flex flex-col items-center justify-center p-4">
      {/* Brand Header */}
      <div className="mb-8 text-center flex flex-col items-center">
          <div className="w-12 h-12 bg-corporate-600 rounded flex items-center justify-center text-white mb-4 shadow-lg">
              <Hexagon size={28} fill="currentColor" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white tracking-tight">Nexus<span className="text-corporate-600">WMS</span></h1>
          <p className="text-gray-500 text-sm mt-1">Enterprise Warehouse Management System</p>
      </div>

      <div className={`bg-white dark:bg-gray-800 w-full max-w-sm p-8 rounded shadow-card border border-gray-200 dark:border-gray-700 transition-all duration-300`}>
        {isSuccess ? (
          <div className="flex flex-col items-center justify-center py-8 animate-in zoom-in duration-300">
            <CheckCircle size={64} className="text-green-500 mb-4 animate-bounce" />
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Login Berhasil</h2>
            <p className="text-gray-500 text-sm mt-2">Mengalihkan ke dashboard...</p>
          </div>
        ) : (
          <div>
            <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Sign In</h2>
                <p className="text-xs text-gray-500">Masuk untuk mengakses sistem gudang.</p>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">Username</label>
                <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                        type="text" 
                        disabled={isLoading}
                        className="w-full pl-10 pr-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:border-corporate-500 focus:ring-1 focus:ring-corporate-500 transition-all text-gray-800 dark:text-white"
                        placeholder="contoh: admin"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">Password</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                        type="password" 
                        disabled={isLoading}
                        className="w-full pl-10 pr-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:border-corporate-500 focus:ring-1 focus:ring-corporate-500 transition-all text-gray-800 dark:text-white"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>
              </div>

              {error && <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600 text-center">{error}</div>}

              <button 
                type="submit" 
                disabled={isLoading}
                className={`w-full py-2.5 font-bold rounded text-sm transition-all flex items-center justify-center gap-2
                  ${isLoading 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-corporate-600 hover:bg-corporate-700 text-white shadow-sm'
                  }`}
              >
                {isLoading ? <><Loader2 size={16} className="animate-spin" /> Memproses...</> : 'Masuk'}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
                <p className="text-[10px] text-center text-gray-400 font-bold uppercase mb-3">Quick Login (Dev Mode)</p>
                <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => quickLogin('admin', '12345')} disabled={isLoading} className="flex items-center justify-center gap-2 p-2 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded text-xs font-medium text-gray-600 dark:text-gray-300 transition-colors">
                        <Shield size={14} className="text-corporate-600"/> Admin
                    </button>
                    <button onClick={() => quickLogin('staff', '12345')} disabled={isLoading} className="flex items-center justify-center gap-2 p-2 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded text-xs font-medium text-gray-600 dark:text-gray-300 transition-colors">
                        <Users size={14} className="text-green-600"/> Staff
                    </button>
                </div>
            </div>
            
            <div className="mt-4 text-center">
               <button onClick={handleResetMode} className="text-[10px] text-gray-400 hover:text-corporate-600 flex items-center justify-center gap-1 mx-auto transition-colors">
                  <RefreshCw size={10} /> Reset Koneksi Server
               </button>
            </div>
          </div>
        )}
      </div>
      <p className="mt-8 text-xs text-gray-400">© 2025 Nexus Enterprise Solutions. All rights reserved.</p>
    </div>
  );
};
