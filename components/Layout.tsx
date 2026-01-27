
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
  Activity,
  Moon,
  Sun,
  Music,
  Minimize2,
  Hexagon,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
  Bell
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
    const latencyInterval = setInterval(() => {
      const baseLatency = Math.floor(Math.random() * (45 - 20) + 20);
      setLatency(baseLatency);
    }, 3000);
    return () => clearInterval(latencyInterval);
  }, []);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'transactions', label: 'Transaksi', icon: ArrowRightLeft },
    { id: 'reject', label: 'Barang Reject', icon: Hexagon },
    { id: 'history', label: 'Riwayat & Laporan', icon: History },
    { id: 'ai', label: 'Smart Assistant', icon: Bot },
    { id: 'admin', label: 'Pengaturan', icon: Settings },
  ];

  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}autoplay=1&mute=0&rel=0&enablejsapi=1`;
  };

  return (
    <div className="flex h-screen bg-[#F4F5F7] dark:bg-gray-900 text-[#172B4D] dark:text-gray-100 font-sans overflow-hidden">
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Enterprise Style (Deep Blue) */}
      <aside 
        className={`fixed lg:relative z-50 h-full bg-[#003A6D] dark:bg-gray-800 transition-all duration-300 flex flex-col shadow-xl ${isSidebarOpen ? 'w-64' : 'w-16'} ${isMobile && !isSidebarOpen ? '-translate-x-full' : 'translate-x-0'}`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center px-4 bg-[#002B52] dark:bg-gray-900 border-b border-[#004685] dark:border-gray-700">
            <div className="flex items-center gap-3 w-full">
                <div className="w-8 h-8 bg-white/10 rounded flex items-center justify-center text-white flex-shrink-0">
                    <Hexagon size={20} fill="currentColor" className="text-white" />
                </div>
                {isSidebarOpen && (
                    <div className="flex flex-col overflow-hidden">
                        <span className="font-bold text-lg leading-tight tracking-wide text-white">NEXUS<span className="text-corporate-300">WMS</span></span>
                        <span className="text-[10px] text-gray-300 tracking-wider">Enterprise Edition</span>
                    </div>
                )}
            </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                if (isMobile) setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center px-3 py-2.5 rounded transition-all duration-200 group text-sm ${
                activePage === item.id 
                  ? 'bg-corporate-600 dark:bg-gray-700 text-white shadow-sm' 
                  : 'text-gray-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <item.icon 
                size={20} 
                strokeWidth={1.5}
                className={`${activePage === item.id ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} 
              />
              {isSidebarOpen && <span className="ml-3 font-medium truncate">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-[#004685] dark:border-gray-700 bg-[#002B52] dark:bg-gray-900">
            <div className={`flex items-center ${isSidebarOpen ? 'justify-between' : 'justify-center'}`}>
                {isSidebarOpen && (
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-8 h-8 rounded bg-corporate-500 flex items-center justify-center text-xs font-bold text-white uppercase">
                            {user.name.charAt(0)}
                        </div>
                        <div className="flex flex-col truncate">
                            <span className="text-xs font-bold text-white truncate">{user.name}</span>
                            <span className="text-[10px] text-gray-400 capitalize truncate">{user.role}</span>
                        </div>
                    </div>
                )}
                <button onClick={onLogout} className="text-gray-400 hover:text-white transition-colors" title="Keluar">
                    <LogOut size={18} />
                </button>
            </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#F4F5F7] dark:bg-gray-900">
        
        {/* Topbar - White, Clean, Corporate */}
        <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6 shadow-sm z-30">
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500 dark:text-gray-400 transition-colors"
                >
                    <Menu size={20} />
                </button>
                <div>
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white">{activePage === 'ai' ? 'Smart Assistant' : menuItems.find(m => m.id === activePage)?.label}</h2>
                    <p className="text-xs text-gray-500 hidden sm:block">Nexus Warehouse Management System</p>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded text-xs font-medium border border-green-200 dark:border-green-800">
                    <Cloud size={14} />
                    <span>Online</span>
                </div>
                
                <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>

                {mediaUrl && (
                    <button 
                        onClick={() => setIsPlayerOpen(!isPlayerOpen)}
                        className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-all ${isPlayerOpen ? 'text-corporate-600' : 'text-gray-500'}`}
                    >
                        <Music size={18} />
                    </button>
                )}
                
                <button 
                  onClick={toggleTheme}
                  className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-yellow-400 transition-all"
                >
                  {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                
                <div className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 cursor-pointer">
                    <Bell size={18} />
                </div>
            </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
            {children}
        </div>

        {/* Media Player Overlay */}
        {mediaUrl && (
             <div 
                className={`fixed bottom-6 right-6 z-50 transition-all duration-500 ease-in-out bg-black rounded shadow-2xl overflow-hidden border border-gray-700 ${isPlayerOpen ? 'w-72 h-40 opacity-100 translate-y-0' : 'w-72 h-40 opacity-0 translate-y-[150%] pointer-events-none'}`}
             >
                 <div className="absolute top-0 right-0 p-1 z-10 opacity-0 hover:opacity-100 transition-opacity bg-gradient-to-b from-black/80 to-transparent w-full flex justify-end">
                     <button onClick={() => setIsPlayerOpen(false)} className="text-white hover:text-gray-300 bg-black/50 rounded p-1"><Minimize2 size={14}/></button>
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
