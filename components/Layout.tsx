
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
  Bell,
  Sun,
  Moon,
  Music,
  Minimize2,
  ChevronDown,
  User as UserIcon,
  Circle,
  X,
  Plus
} from 'lucide-react';
import { User } from '../types';

interface Tab {
  id: string;
  type: string;
  title: string;
}

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  activeTabId: string;
  tabs: Tab[];
  onOpenTab: (type: string, title: string) => void;
  onCloseTab: (id: string) => void;
  onSwitchTab: (id: string) => void;
  onLogout: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  mediaUrl?: string;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, user, activeTabId, tabs, onOpenTab, onCloseTab, onSwitchTab,
  onLogout, isDarkMode, toggleTheme, mediaUrl 
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
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

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inventory', label: 'Produk & Stok', icon: Package },
    { id: 'transactions', label: 'Penjualan / Pembelian', icon: ArrowRightLeft },
    { id: 'reject', label: 'Barang Reject', icon: Circle },
    { id: 'history', label: 'Laporan', icon: History },
    { id: 'ai', label: 'Smart Assistant', icon: Bot },
    { id: 'admin', label: 'Pengaturan', icon: Settings },
  ];

  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}autoplay=1&mute=0&rel=0&enablejsapi=1`;
  };

  return (
    <div className="flex h-screen bg-[#F5F7FA] dark:bg-gray-900 text-[#334155] dark:text-gray-100 font-sans overflow-hidden">
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Paper Theme (Dark Navy) */}
      <aside 
        className={`fixed lg:relative z-50 h-full bg-[#1C2434] text-white transition-all duration-300 flex flex-col shadow-xl ${isSidebarOpen ? 'w-64' : 'w-20'} ${isMobile && !isSidebarOpen ? '-translate-x-full' : 'translate-x-0'}`}
      >
        {/* Brand Header */}
        <div className="h-20 flex items-center px-6 border-b border-gray-700/50">
            <div className="flex items-center gap-3 w-full">
                <div className="w-8 h-8 rounded-full bg-white text-[#1C2434] flex items-center justify-center font-bold text-lg flex-shrink-0">
                    P
                </div>
                {isSidebarOpen && (
                    <span className="font-bold text-xl tracking-wide">PAPER</span>
                )}
            </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onOpenTab(item.id, item.label);
                if (isMobile) setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center px-3 py-3 rounded-lg transition-all duration-200 group text-sm font-medium ${
                 // Highlight if any tab of this type is active
                 tabs.find(t => t.id === activeTabId)?.type === item.id
                  ? 'bg-gray-700/50 text-white' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <item.icon 
                size={20} 
                strokeWidth={1.5}
                className={`${tabs.find(t => t.id === activeTabId)?.type === item.id ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} 
              />
              {isSidebarOpen && <span className="ml-3 truncate">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-gray-700/50">
            <button onClick={onLogout} className={`flex items-center w-full px-3 py-2 text-gray-400 hover:text-white transition-colors ${!isSidebarOpen && 'justify-center'}`}>
                <LogOut size={20} strokeWidth={1.5} />
                {isSidebarOpen && <span className="ml-3 text-sm">Logout</span>}
            </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* Header - White Clean */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex flex-col z-30">
            <div className="h-16 flex items-center justify-between px-6">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500 transition-colors"
                    >
                        <Menu size={20} />
                    </button>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{user.name}</span>
                        <ChevronDown size={14} className="text-gray-400" />
                    </div>
                    
                    <div className="h-6 w-px bg-gray-200 dark:bg-gray-700"></div>

                    <div className="flex items-center gap-4">
                        <button className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
                            <Bell size={20} />
                        </button>
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                            <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">Free</span>
                        </div>
                        <button 
                            onClick={toggleTheme}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                    </div>
                    
                    {mediaUrl && (
                        <button 
                            onClick={() => setIsPlayerOpen(!isPlayerOpen)}
                            className={`ml-2 p-2 rounded-full hover:bg-gray-100 ${isPlayerOpen ? 'text-paper-blue' : 'text-gray-400'}`}
                        >
                            <Music size={18} />
                        </button>
                    )}
                </div>
            </div>

            {/* Browser-like Tab Bar */}
            <div className="flex items-end px-2 gap-1 bg-gray-100 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 overflow-x-auto no-scrollbar">
                {tabs.map(tab => (
                    <div 
                        key={tab.id}
                        onClick={() => onSwitchTab(tab.id)}
                        className={`
                            group relative flex items-center gap-2 pl-4 pr-2 py-2 min-w-[150px] max-w-[200px] rounded-t-lg cursor-pointer transition-all select-none border-t-2
                            ${activeTabId === tab.id 
                                ? 'bg-[#F5F7FA] dark:bg-gray-800 border-paper-blue text-slate-800 dark:text-white font-bold' 
                                : 'bg-gray-200 dark:bg-gray-800/50 border-transparent text-gray-500 hover:bg-gray-300 dark:hover:bg-gray-700'}
                        `}
                    >
                        <span className="text-xs truncate flex-1">{tab.title}</span>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onCloseTab(tab.id); }}
                            className={`p-1 rounded-full hover:bg-red-500 hover:text-white ${activeTabId === tab.id ? 'text-gray-400' : 'text-gray-400 opacity-0 group-hover:opacity-100'}`}
                        >
                            <X size={12} strokeWidth={3} />
                        </button>
                    </div>
                ))}
                
                {/* New Tab Button Shortcut */}
                <button 
                    onClick={() => onOpenTab('transactions', 'Penjualan / Pembelian')}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg ml-1"
                    title="Buka Tab Transaksi Baru"
                >
                    <Plus size={16} />
                </button>
            </div>
        </header>

        {/* Page Content - Gray Background */}
        <div className="flex-1 overflow-y-auto p-8 scroll-smooth relative">
            {children}
        </div>

        {/* Media Player Overlay */}
        {mediaUrl && (
             <div 
                className={`fixed bottom-6 right-6 z-50 transition-all duration-500 ease-in-out bg-black rounded-lg shadow-2xl overflow-hidden border border-gray-700 ${isPlayerOpen ? 'w-72 h-40 opacity-100 translate-y-0' : 'w-72 h-40 opacity-0 translate-y-[150%] pointer-events-none'}`}
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
