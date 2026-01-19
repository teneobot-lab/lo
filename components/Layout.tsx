
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ArrowRightLeft, 
  History, 
  Bot, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Cloud,
  CloudOff,
  Sun,
  Moon,
  Trash2
} from 'lucide-react';
import { User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  activePage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  darkMode: boolean;
  onToggleTheme: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, activePage, onNavigate, onLogout, darkMode, onToggleTheme }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [cloudStatus, setCloudStatus] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setIsSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCloudStatus(prev => Math.random() > 0.05 ? true : prev); 
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'transactions', label: 'Transactions', icon: ArrowRightLeft },
    { id: 'reject', label: 'Reject Items', icon: Trash2 },
    { id: 'history', label: 'History', icon: History },
    { id: 'ai', label: 'AI Assistant', icon: Bot },
    { id: 'admin', label: 'Admin & Media', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-blue-50/50 dark:from-slate-950 dark:to-indigo-950/30 text-slate-900 dark:text-slate-100 font-sans overflow-hidden transition-colors duration-300">
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside 
        className={`fixed lg:relative z-50 h-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-slate-200/50 dark:border-slate-800/50 transition-all duration-300 flex flex-col ${isSidebarOpen ? 'w-64' : 'w-20'} ${isMobile && !isSidebarOpen ? '-translate-x-full' : 'translate-x-0'}`}
      >
        <div className="h-16 flex items-center justify-center border-b border-slate-200/50 dark:border-slate-800/50 bg-gradient-to-r from-indigo-600 to-primary/90 text-white shadow-lg">
            {isSidebarOpen ? (
                <h1 className="text-xl font-bold tracking-wide">NEXUS WMS</h1>
            ) : (
                <span className="text-xl font-bold">N</span>
            )}
        </div>

        <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                if (isMobile) setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center px-3 py-3 rounded-xl transition-all duration-200 ${
                activePage === item.id 
                  ? 'bg-primary text-white shadow-lg shadow-primary/25 font-medium translate-x-1' 
                  : 'text-slate-500 dark:text-slate-400 hover:bg-primary/10 hover:text-primary'
              }`}
            >
              <item.icon size={22} strokeWidth={1.5} />
              {isSidebarOpen && <span className="ml-3 font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200/50 dark:border-slate-800/50">
            <div className={`flex items-center ${isSidebarOpen ? 'justify-between' : 'justify-center'}`}>
                {isSidebarOpen && (
                    <div className="flex flex-col">
                        <span className="text-sm font-bold truncate w-32">{user.name}</span>
                        <span className="text-[10px] text-muted dark:text-slate-500 uppercase font-bold tracking-wider">{user.role}</span>
                    </div>
                )}
                <button onClick={onLogout} className="text-slate-400 hover:text-rose-500 transition-colors p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30" title="Logout">
                    <LogOut size={20} />
                </button>
            </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="h-16 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50 sticky top-0 z-30 flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="p-2 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-lg text-slate-500 dark:text-slate-400 transition-colors"
                >
                    <Menu size={20} />
                </button>
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 capitalize tracking-tight">{activePage}</h2>
            </div>

            <div className="flex items-center gap-3">
                <button 
                    onClick={onToggleTheme}
                    className="p-2.5 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 text-slate-600 dark:text-slate-300 hover:scale-105 transition-all shadow-sm"
                    title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                    {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>

                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border ${cloudStatus ? 'bg-emerald-50/50 text-emerald-600 border-emerald-100/50 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800/50' : 'bg-rose-50/50 text-rose-600 border-rose-100/50 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-800/50'}`}>
                    {cloudStatus ? <Cloud size={14} /> : <CloudOff size={14} />}
                    <span className="hidden sm:inline uppercase tracking-widest">{cloudStatus ? 'Cloud Active' : 'Offline'}</span>
                </div>
            </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
            {children}
        </div>
      </main>
    </div>
  );
};
