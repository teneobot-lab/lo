
import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { User } from '../types';
import { Lock, User as UserIcon, Shield, Users, RefreshCw, Hexagon, CheckCircle2 } from 'lucide-react';
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
  const [progress, setProgress] = useState(0);

  // Animation Logic for Percentage
  useEffect(() => {
    let interval: any;
    if (isLoading && progress < 100) {
      interval = setInterval(() => {
        setProgress((prev) => {
          const next = prev + Math.floor(Math.random() * 15) + 5;
          return next > 100 ? 100 : next;
        });
      }, 150);
    }
    return () => clearInterval(interval);
  }, [isLoading, progress]);

  const performLogin = async (u: string, p: string) => {
    setError('');
    setIsLoading(true);
    setProgress(0);

    // Simulate network/processing time aligned with animation
    const hash = storageService.hashPassword(p);
    const user = await storageService.login(u, hash);

    // Wait for animation to hit 100% or close to it
    setTimeout(() => {
        if (user) {
            setProgress(100);
            setTimeout(() => {
                onLogin(user);
            }, 500);
        } else {
            setIsLoading(false);
            setProgress(0);
            setError('Invalid Credentials');
            notify('Login failed. Please check your username and password.', 'error');
        }
    }, 2000);
  };

  const handleLogin = (e: React.FormEvent) => { e.preventDefault(); performLogin(username, password); };
  const quickLogin = (u: string, p: string) => { setUsername(u); setPassword(p); performLogin(u, p); };
  const handleResetMode = () => { localStorage.removeItem('nexus_api_url'); notify('Server connection reset to default.', 'info'); window.location.reload(); };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#021B35] via-[#052e55] to-[#001226] overflow-hidden relative">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/20 blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-600/10 blur-[120px]"></div>

      <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 w-full max-w-sm p-10 rounded-[2rem] shadow-2xl animate-in zoom-in duration-500">
        
        {/* Brand */}
        <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/30 mb-4">
                <Hexagon size={32} fill="white" className="text-white animate-pulse" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-widest uppercase font-sans">User Login</h1>
            <p className="text-blue-200/60 text-xs mt-1 tracking-wider">NEXUS ENTERPRISE WMS</p>
        </div>

        {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-6">
                <div className="relative w-32 h-32 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-blue-900/30" />
                        <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray="351.86" strokeDashoffset={351.86 - (351.86 * progress) / 100} className="text-blue-400 transition-all duration-300 ease-out" strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                        <span className="text-2xl font-bold text-white">{progress}%</span>
                    </div>
                </div>
                <p className="text-blue-200 text-sm animate-pulse tracking-wide">Authenticating Securely...</p>
            </div>
        ) : (
            <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-1">
                    <div className="relative group">
                        <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center text-blue-300 group-focus-within:text-white transition-colors">
                            <UserIcon size={20} />
                        </div>
                        <input 
                            type="text" 
                            disabled={isLoading}
                            className="w-full pl-12 pr-4 py-4 bg-black/20 border border-white/5 rounded-full text-white placeholder-white/30 focus:outline-none focus:bg-black/40 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all text-sm"
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <div className="relative group">
                        <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center text-blue-300 group-focus-within:text-white transition-colors">
                            <Lock size={20} />
                        </div>
                        <input 
                            type="password" 
                            disabled={isLoading}
                            className="w-full pl-12 pr-4 py-4 bg-black/20 border border-white/5 rounded-full text-white placeholder-white/30 focus:outline-none focus:bg-black/40 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all text-sm"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                </div>

                {error && (
                    <div className="py-2 px-4 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
                        <p className="text-xs text-red-300 font-medium">{error}</p>
                    </div>
                )}

                <button 
                    type="submit" 
                    className="w-full py-4 bg-white text-blue-900 font-bold rounded-full shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 uppercase tracking-widest text-sm"
                >
                    Login
                </button>
            </form>
        )}

        {/* Footer Actions */}
        {!isLoading && (
            <div className="mt-8 pt-6 border-t border-white/10">
                <div className="flex justify-center gap-4 mb-4">
                    <button onClick={() => quickLogin('admin', '12345')} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all border border-white/5" title="Quick Admin">
                        <Shield size={16} />
                    </button>
                    <button onClick={() => quickLogin('staff', '12345')} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all border border-white/5" title="Quick Staff">
                        <Users size={16} />
                    </button>
                    <button onClick={handleResetMode} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all border border-white/5" title="Reset Connection">
                        <RefreshCw size={16} />
                    </button>
                </div>
                <p className="text-center text-[10px] text-white/30 uppercase tracking-widest">Secured by Nexus WMS</p>
            </div>
        )}
      </div>
    </div>
  );
};
