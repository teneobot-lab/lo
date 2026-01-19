
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
  AlertTriangle,
  Hexagon
} from 'lucide-react';
import { User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  activePage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, activePage, onNavigate, onLogout }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [cloudStatus, setCloudStatus] = useState(true);

  // Responsive check
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

  // Simulate Cloud Sync Check
  useEffect(() => {
    const interval = setInterval(() => {
      // Randomly toggle cloud status to simulate network checks for demo
      setCloudStatus(prev => Math.random() > 0.05 ? true : prev); 
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'transactions', label: 'Transactions', icon: ArrowRightLeft },
    { id: 'reject', label: 'Reject Mgmt', icon: AlertTriangle },
    { id: 'history', label: 'History', icon: History },
    { id: 'ai', label: 'AI Assistant', icon: Bot },
    { id: 'admin', label: 'Admin & Media', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-background text-dark font-sans overflow-hidden">
      {/* Mobile Overlay */}
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed lg:relative z-50 h-full bg-white border-r border-border transition-all duration-300 flex flex-col ${isSidebarOpen ? 'w-64' : 'w-20'} ${isMobile && !isSidebarOpen ? '-translate-x-full' : 'translate-x-0'}`}
      >
        <div className="h-20 flex items-center justify-center border-b border-border bg-white">
            <div className={`flex items-center gap-3 transition-all duration-300 ${isSidebarOpen ? 'px-4' : 'px-0'}`}>
                {/* Logo Icon */}
                <div className="relative group cursor-pointer">
                    <div className="absolute -inset-2 bg-indigo-500/20 rounded-full blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                    <div className="relative w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 text-white">
                        <Hexagon size={20} strokeWidth={3} className="fill-indigo-500/20" />
                    </div>
                </div>
                
                {/* Logo Text */}
                {isSidebarOpen && (
                    <div className="flex flex-col animate-in fade-in slide-in-from-left-4 duration-300">
                        <span className="font-bold text-xl text-slate-800 tracking-tight leading-none">NEXUS</span>
                        <span className="text-[9px] font-bold text-indigo-500 tracking-[0.25em] uppercase mt-0.5">Systems</span>
                    </div>
                )}
            </div>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                if (isMobile) setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center px-3 py-3 rounded-xl transition-all duration-200 group ${
                activePage === item.id 
                  ? 'bg-indigo-50 text-indigo-600 font-medium shadow-sm' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon 
                size={22} 
                strokeWidth={1.5} 
                className={`transition-colors ${activePage === item.id ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`} 
              />
              {isSidebarOpen && <span className="ml-3">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
            <div className={`flex items-center ${isSidebarOpen ? 'justify-between' : 'justify-center'}`}>
                {isSidebarOpen && (
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold truncate w-32 text-slate-700">{user.name}</span>
                        <span className="text-xs text-slate-400 capitalize">{user.role}</span>
                    </div>
                )}
                <button onClick={onLogout} className="text-slate-400 hover:text-rose-500 transition-colors p-2 hover:bg-rose-50 rounded-lg" title="Logout">
                    <LogOut size={20} />
                </button>
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-border sticky top-0 z-30 flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="p-2 hover:bg-slate-100 rounded-lg text-muted transition-colors"
                >
                    <Menu size={20} />
                </button>
                <h2 className="text-lg font-medium text-dark capitalize tracking-tight">{activePage}</h2>
            </div>

            <div className="flex items-center gap-4">
                {/* Cloud Status */}
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${cloudStatus ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                    {cloudStatus ? <Cloud size={14} /> : <CloudOff size={14} />}
                    <span className="hidden sm:inline">{cloudStatus ? 'Cloud Active' : 'Offline'}</span>
                </div>
            </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
            {children}
        </div>
      </main>
    </div>
  );
};
