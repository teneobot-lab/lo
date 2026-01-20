import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { User } from '../types';
import { Lock, User as UserIcon, ArrowRight, Loader2, CheckCircle, Shield, Users, RefreshCw, Waves, Fish, Droplets } from 'lucide-react';
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
  const [bubbles, setBubbles] = useState<Array<{id: number, x: number, size: number, speed: number}>>([]);

  // Bubble animation for ocean theme
  useEffect(() => {
    const generateBubbles = () => {
      const bubbleCount = 15;
      const newBubbles = [];
      for (let i = 0; i < bubbleCount; i++) {
        newBubbles.push({
          id: i,
          x: Math.random() * 100,
          size: Math.random() * 20 + 5,
          speed: Math.random() * 2 + 1
        });
      }
      setBubbles(newBubbles);
    };
    generateBubbles();
  }, []);

  const performLogin = async (u: string, p: string) => {
    setError('');
    setIsLoading(true);

    // Artificial delay for UX
    await new Promise(resolve => setTimeout(resolve, 600));

    const hash = storageService.hashPassword(p);
    const user = await storageService.login(u, hash);
    
    if (user) {
      setIsSuccess(true);
      setTimeout(() => {
        onLogin(user);
      }, 1200); // Slightly extended for animation
    } else {
      setIsLoading(false);
      setError('Invalid credentials or Server Unreachable');
      notify('Login failed. Check server connection.', 'error');
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    performLogin(username, password);
  };

  // Quick Login Helper
  const quickLogin = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    performLogin(u, p);
  };

  const handleResetMode = () => {
    localStorage.removeItem('nexus_api_url');
    notify('Reverted to Default VPS. Please login again.', 'success');
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-sky-100 dark:from-gray-900 dark:via-blue-900/20 dark:to-cyan-900/10 flex items-center justify-center p-4 transition-colors duration-500 overflow-hidden relative">
      {/* Ocean Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Animated Bubbles */}
        {bubbles.map(bubble => (
          <div
            key={bubble.id}
            className="absolute bottom-0 rounded-full bg-gradient-to-b from-cyan-200/30 to-blue-300/20 dark:from-cyan-400/20 dark:to-blue-500/10"
            style={{
              left: `${bubble.x}%`,
              width: `${bubble.size}px`,
              height: `${bubble.size}px`,
              animation: `bubble-rise ${bubble.speed * 10 + 10}s linear infinite`,
              animationDelay: `${bubble.id * 0.5}s`
            }}
          />
        ))}
        
        {/* Wave Pattern */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-blue-200/20 to-transparent dark:from-blue-400/10">
          <Waves className="w-full h-full text-blue-300/30 dark:text-blue-500/10" />
        </div>
        
        {/* Floating Fish Icon */}
        <Fish className="absolute top-1/4 left-10 text-blue-300/20 dark:text-cyan-400/10 animate-float" size={32} />
        <Droplets className="absolute top-1/3 right-16 text-cyan-300/20 dark:text-blue-400/10 animate-float-delayed" size={28} />
      </div>

      {/* Keyframes for animations */}
      <style>
        {`
          @keyframes bubble-rise {
            0% {
              transform: translateY(0) scale(1);
              opacity: 0.5;
            }
            100% {
              transform: translateY(-100vh) scale(1.2);
              opacity: 0;
            }
          }
          
          @keyframes float {
            0%, 100% {
              transform: translateY(0) translateX(0);
            }
            50% {
              transform: translateY(-20px) translateX(10px);
            }
          }
          
          @keyframes float-delayed {
            0%, 100% {
              transform: translateY(0) translateX(0);
            }
            50% {
              transform: translateY(-15px) translateX(-15px);
            }
          }
          
          @keyframes pulse-soft {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.7;
            }
          }
          
          @keyframes wave {
            0% {
              background-position: 0% 50%;
            }
            50% {
              background-position: 100% 50%;
            }
            100% {
              background-position: 0% 50%;
            }
          }
          
          .animate-float {
            animation: float 8s ease-in-out infinite;
          }
          
          .animate-float-delayed {
            animation: float-delayed 10s ease-in-out infinite;
          }
          
          .animate-pulse-soft {
            animation: pulse-soft 2s ease-in-out infinite;
          }
          
          .animate-wave {
            animation: wave 15s ease infinite;
            background-size: 200% 200%;
          }
        `}
      </style>

      <div className={`bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm w-full max-w-md p-8 rounded-3xl shadow-xl shadow-blue-100/50 dark:shadow-blue-900/20 border border-blue-100/50 dark:border-blue-800/30 transition-all duration-700 ease-in-out transform relative z-10
        ${isSuccess ? 'scale-105 shadow-cyan-200/50 dark:shadow-cyan-900/30 ring-2 ring-cyan-300/30 dark:ring-cyan-700/30' : ''}
        ${isLoading ? 'animate-pulse-soft' : ''}`}>
        
        {isSuccess ? (
          <div className="flex flex-col items-center justify-center py-12">
            {/* Ocean-themed Success Animation */}
            <div className="relative mb-6">
              {/* Pulsing Ocean Circle */}
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full animate-ping opacity-20" style={{animationDuration: '1.5s'}}></div>
              
              {/* Main Success Icon */}
              <div className="relative w-24 h-24 bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-xl shadow-cyan-500/30 dark:shadow-cyan-900/40">
                {/* Ripple Effect */}
                <div className="absolute inset-0 rounded-full border-4 border-cyan-300/40 animate-ping" style={{animationDuration: '2s'}}></div>
                <div className="absolute inset-4 rounded-full border-4 border-blue-300/30 animate-ping" style={{animationDuration: '2.5s', animationDelay: '0.5s'}}></div>
                
                {/* Check Icon with Ocean Theme */}
                <div className="relative">
                  <CheckCircle 
                    size={48} 
                    className="text-white animate-scale-in" 
                    strokeWidth={2.5}
                    style={{
                      animation: 'scaleIn 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards',
                      filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))'
                    }}
                  />
                  {/* Sparkle Effect */}
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-300 rounded-full animate-ping" style={{animationDuration: '1s'}}></div>
                </div>
              </div>
              
              {/* Floating Bubbles Around Success */}
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-cyan-200/60 dark:bg-cyan-400/40 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              <div className="absolute -bottom-1 -left-2 w-5 h-5 bg-blue-200/60 dark:bg-blue-400/40 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
            </div>
            
            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-600 to-blue-700 dark:from-cyan-400 dark:to-blue-500 mb-2">
              Login Successful!
            </h2>
            <p className="text-blue-600/80 dark:text-blue-400/80 mt-2 mb-4">Welcome to the Ocean Dashboard</p>
            
            {/* Progress Wave */}
            <div className="w-48 h-2 bg-gradient-to-r from-cyan-200 via-blue-300 to-indigo-300 dark:from-cyan-800/30 dark:via-blue-700/30 dark:to-indigo-700/30 rounded-full overflow-hidden mt-4">
              <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full animate-wave"></div>
            </div>
            <p className="text-sm text-blue-500/60 dark:text-blue-400/60 mt-2 animate-pulse">Navigating to dashboard...</p>
          </div>
        ) : (
          <div className={`transition-all duration-500 ${isLoading ? 'opacity-90 scale-[0.995]' : 'opacity-100'}`}>
            <div className="text-center mb-10">
              {/* Ocean-themed Logo */}
              <div className="relative inline-block mb-4">
                <div className="absolute -inset-4 bg-gradient-to-r from-cyan-400/20 to-blue-500/20 rounded-full blur-xl"></div>
                <div className="relative bg-gradient-to-br from-cyan-500 to-blue-600 p-3 rounded-2xl shadow-lg shadow-cyan-500/30">
                  <Waves className="text-white" size={32} />
                </div>
              </div>
              
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 dark:from-cyan-400 dark:via-blue-400 dark:to-indigo-400 animate-wave">
                Nexus WMS
              </h1>
              <p className="text-blue-600/70 dark:text-blue-400/70 mt-2">Dive into your warehouse dashboard</p>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-blue-600/80 dark:text-blue-400/80 uppercase ml-1 flex items-center gap-1">
                  <UserIcon size={12} /> Username
                </label>
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-400/30 to-blue-500/30 rounded-xl blur opacity-0 group-hover:opacity-70 transition duration-300"></div>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-500/80" size={18} />
                    <input 
                      type="text" 
                      disabled={isLoading}
                      className="w-full pl-12 pr-4 py-3.5 bg-white/80 dark:bg-gray-900/80 border border-blue-200/50 dark:border-blue-800/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-300/50 focus:border-cyan-400 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-blue-900 dark:text-blue-100 placeholder-blue-400/50"
                      placeholder="Enter username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-blue-600/80 dark:text-blue-400/80 uppercase ml-1 flex items-center gap-1">
                  <Lock size={12} /> Password
                </label>
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-400/30 to-cyan-500/30 rounded-xl blur opacity-0 group-hover:opacity-70 transition duration-300"></div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500/80" size={18} />
                    <input 
                      type="password" 
                      disabled={isLoading}
                      className="w-full pl-12 pr-4 py-3.5 bg-white/80 dark:bg-gray-900/80 border border-blue-200/50 dark:border-blue-800/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300/50 focus:border-blue-400 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-blue-900 dark:text-blue-100 placeholder-blue-400/50"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <p className="text-rose-600 text-sm text-center font-medium bg-rose-50/80 dark:bg-rose-900/30 py-3 rounded-xl border border-rose-200/50 dark:border-rose-800/50">
                    {error}
                  </p>
                </div>
              )}

              <button 
                type="submit" 
                disabled={isLoading}
                className={`w-full py-4 font-bold rounded-xl transition-all flex items-center justify-center gap-2 group relative overflow-hidden
                  ${isLoading 
                    ? 'bg-blue-100/50 dark:bg-blue-900/30 text-blue-400/50 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'
                  }`}
              >
                {/* Animated Background Effect */}
                {!isLoading && (
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                )}
                
                <div className="relative z-10 flex items-center gap-2">
                  {isLoading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" /> 
                      <span className="animate-pulse">Verifying...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span> 
                      <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform duration-300" />
                    </>
                  )}
                </div>
                
                {/* Wave effect on hover */}
                {!isLoading && (
                  <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -inset-y-full -left-12 group-hover:left-full w-12 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 transition-all duration-700 group-hover:duration-1000"></div>
                  </div>
                )}
              </button>
            </form>

            {/* Quick Login Section - Ocean Theme */}
            <div className="mt-10 pt-8 border-t border-blue-200/30 dark:border-blue-800/30">
              <p className="text-xs text-center text-blue-600/60 dark:text-blue-400/60 mb-5 font-bold uppercase tracking-wider flex items-center justify-center gap-2">
                <Fish size={12} /> Quick Access (VPS) <Droplets size={12} />
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => quickLogin('admin', '12345')}
                  disabled={isLoading}
                  className="relative group flex flex-col items-center justify-center p-4 bg-gradient-to-br from-cyan-50 to-blue-100/50 dark:from-cyan-900/20 dark:to-blue-900/20 border border-cyan-200/50 dark:border-cyan-800/30 rounded-xl hover:from-cyan-100 hover:to-blue-200/70 dark:hover:from-cyan-900/40 dark:hover:to-blue-900/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
                >
                  {/* Ripple effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/0 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                  
                  <Shield size={22} className="text-cyan-600 dark:text-cyan-400 mb-2 group-hover:scale-110 transition-transform duration-300"/>
                  <span className="text-sm font-bold text-cyan-800 dark:text-cyan-300">Admin</span>
                  <span className="text-[10px] text-cyan-600/60 dark:text-cyan-400/60 mt-1">Full Access</span>
                </button>
                <button 
                  onClick={() => quickLogin('staff', '12345')}
                  disabled={isLoading}
                  className="relative group flex flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100/50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200/50 dark:border-blue-800/30 rounded-xl hover:from-blue-100 hover:to-indigo-200/70 dark:hover:from-blue-900/40 dark:hover:to-indigo-900/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
                >
                  {/* Ripple effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/0 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                  
                  <Users size={22} className="text-blue-600 dark:text-blue-400 mb-2 group-hover:scale-110 transition-transform duration-300"/>
                  <span className="text-sm font-bold text-blue-800 dark:text-blue-300">Staff</span>
                  <span className="text-[10px] text-blue-600/60 dark:text-blue-400/60 mt-1">Limited Access</span>
                </button>
              </div>
            </div>
            
            {/* Reset Button */}
            <div className="mt-6 text-center">
              <button 
                onClick={handleResetMode} 
                className="text-xs text-blue-500/60 hover:text-cyan-600 dark:text-blue-400/60 dark:hover:text-cyan-400 flex items-center justify-center gap-1.5 mx-auto transition-all duration-300 hover:gap-2 group"
              >
                <RefreshCw size={12} className="group-hover:rotate-180 transition-transform duration-500" /> 
                Reset to Default Connection
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
