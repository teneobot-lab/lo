
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
  Cloud,
  CloudOff,
  AlertTriangle,
  Hexagon,
  Activity,
  Moon,
  Sun,
  Music,
  X,
  Minimize2
} from 'lucide-react';
import { User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  activePage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  mediaUrl?: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, activePage, onNavigate, onLogout, isDarkMode, toggleTheme, mediaUrl }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [latency, setLatency] = useState(24);
  const [isPlayerOpen, setIsPlayerOpen] = useState(true);

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

  // Simulate Latency Fluctuation
  useEffect(() => {
    const latencyInterval = setInterval(() => {
      const baseLatency = Math.floor(Math.random() * (45 - 20) + 20);
      setLatency(baseLatency);
    }, 3000);
    return () => clearInterval(latencyInterval);
  }, []);

  const getLatencyColor = (ms: number) => {
    if (ms < 100) return 'bg-ice-100 text-ice-600 border-ice-200 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400';
    if (ms < 200) return 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-400';
    return 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-400';
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'transactions', label: 'Transactions', icon: ArrowRightLeft },
    { id: 'reject', label: 'Reject Mgmt', icon: AlertTriangle },
    { id: 'history', label: 'History', icon: History },
    { id: 'ai', label: 'AI Assistant', icon: Bot },
    { id: 'admin', label: 'Admin & Media', icon: Settings },
  ];

  // Helper to construct YouTube URL properly
  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}autoplay=1&mute=0&rel=0`;
  };

  return (
    <div className="flex h-screen bg-background dark:bg-gray-900 text-dark dark:text-white font-sans overflow-hidden transition-colors duration-500">
      {/* Mobile Overlay */}
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed lg:relative z-50 h-full bg-[#FCFCFC] dark:bg-gray-800 border-r border-ice-200 dark:border-gray-700 transition-all duration-300 flex flex-col ${isSidebarOpen ? 'w-64' : 'w-20'} ${isMobile && !isSidebarOpen ? '-translate-x-full' : 'translate-x-0'}`}
      >
        <div className="h-20 flex items-center justify-center border-b border-ice-100 dark:border-gray-700 bg-gradient-to-br from-ice-50 to-[#FCFCFC] dark:from-gray-800 dark:to-gray-900">
            <div className={`flex items-center gap-3 transition-all duration-300 ${isSidebarOpen ? 'px-4' : 'px-0'}`}>
                <div className="relative group cursor-pointer">
                    <div className="absolute -inset-2 bg-ice-300/50 rounded-full blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                    <div className="relative w-10 h-10 bg-gradient-to-br from-ice-200 to-ice-400 dark:from-indigo-600 dark:to-purple-600 rounded-xl flex items-center justify-center shadow-lg text-ice-600 dark:text-white">
                        <Hexagon size={20} strokeWidth={2.5} className="text-white dark:text-white/90" />
                    </div>
                </div>
                {isSidebarOpen && (
                    <div className="flex flex-col animate-in fade-in slide-in-from-left-4 duration-300">
                        <span className="font-bold text-xl text-slate-800 dark:text-white tracking-tight leading-none">NEXUS</span>
                        <span className="text-[9px] font-bold text-ice-600 dark:text-ice-400 tracking-[0.25em] uppercase mt-0.5">Systems</span>
                    </div>
                )}
            </div>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                if (isMobile) setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center px-3 py-3 rounded-xl transition-all duration-300 group ${
                activePage === item.id 
                  ? 'bg-ice-gradient dark:bg-ice-gradient-dark shadow-md text-slate-800 dark:text-ice-100 font-semibold' 
                  : 'text-slate-500 dark:text-gray-400 hover:bg-ice-50 dark:hover:bg-gray-700 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <item.icon 
                size={22} 
                strokeWidth={1.5} 
                className={`transition-colors ${activePage === item.id ? 'text-slate-700 dark:text-ice-200' : 'text-slate-400 dark:text-gray-500 group-hover:text-ice-500 dark:group-hover:text-gray-300'}`} 
              />
              {isSidebarOpen && <span className="ml-3">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-ice-100 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800">
            <div className={`flex items-center ${isSidebarOpen ? 'justify-between' : 'justify-center'}`}>
                {isSidebarOpen && (
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold truncate w-32 text-slate-700 dark:text-gray-200">{user.name}</span>
                        <span className="text-xs text-slate-400 capitalize">{user.role}</span>
                    </div>
                )}
                <button onClick={onLogout} className="text-slate-400 hover:text-rose-500 transition-colors p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg" title="Logout">
                    <LogOut size={20} />
                </button>
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#EEF2F6] dark:bg-gray-900">
        <header className="h-16 bg-white/60 dark:bg-gray-800/80 backdrop-blur-xl border-b border-ice-200 dark:border-gray-700 sticky top-0 z-30 flex items-center justify-between px-6 transition-colors">
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="p-2 hover:bg-ice-50 dark:hover:bg-gray-700 rounded-lg text-slate-500 dark:text-gray-400 transition-colors"
                >
                    <Menu size={20} />
                </button>
                <h2 className="text-lg font-medium text-slate-800 dark:text-white capitalize tracking-tight">{activePage}</h2>
            </div>

            <div className="flex items-center gap-3">
                {mediaUrl && (
                    <button 
                        onClick={() => setIsPlayerOpen(!isPlayerOpen)}
                        className={`p-2 rounded-full transition-all ${isPlayerOpen ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400' : 'hover:bg-ice-50 dark:hover:bg-gray-700 text-slate-400'}`}
                        title="Toggle Music Player"
                    >
                        <Music size={18} />
                    </button>
                )}
                <button 
                  onClick={toggleTheme}
                  className="p-2 rounded-full hover:bg-ice-50 dark:hover:bg-gray-700 text-slate-400 dark:text-yellow-400 transition-all"
                  title="Toggle Theme"
                >
                  {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors duration-500 ${getLatencyColor(latency)}`}>
                    <Activity size={14} className={latency > 200 ? 'animate-pulse' : ''} />
                    <span className="hidden sm:inline">VPS: {latency} ms</span>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors bg-ice-100 text-ice-600 border-ice-200 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400`}>
                    <Cloud size={14} />
                    <span className="hidden sm:inline">System Online</span>
                </div>
            </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 scroll-smooth bg-gradient-to-br from-[#EBF3FA] via-[#F5F7FA] to-[#F9FAFB] dark:from-gray-900 dark:to-gray-900 relative">
            {children}
        </div>

        {/* Global Persistent Media Player */}
        {mediaUrl && (
             <div 
                className={`fixed bottom-4 right-4 z-50 transition-all duration-500 ease-in-out bg-black rounded-2xl shadow-2xl overflow-hidden border border-slate-700 ${isPlayerOpen ? 'w-80 h-48 opacity-100 translate-y-0' : 'w-80 h-48 opacity-0 translate-y-[150%] pointer-events-none'}`}
             >
                 <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-black/80 to-transparent z-10 flex justify-end p-2 opacity-0 hover:opacity-100 transition-opacity">
                     <button onClick={() => setIsPlayerOpen(false)} className="text-white/80 hover:text-white bg-black/50 rounded-full p-1"><Minimize2 size={14}/></button>
                 </div>
                 <iframe 
                    width="100%" 
                    height="100%" 
                    src={getEmbedUrl(mediaUrl)}
                    title="Nexus Media Player" 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                    className="w-full h-full"
                ></iframe>
             </div>
        )}
      </main>
    </div>
  );
};
