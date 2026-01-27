
import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Plus,
  Search,
  Loader2,
  Calendar,
  Filter
} from 'lucide-react';
import { User, InventoryItem, Transaction } from '../types';
import { storageService } from '../services/storageService';

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

  // --- Global Search State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [allItems, setAllItems] = useState<InventoryItem[]>([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState<InventoryItem[]>([]);
  const [searchModalItem, setSearchModalItem] = useState<InventoryItem | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setIsSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    // Fetch items for search context
    const loadItems = async () => {
        try {
            const items = await storageService.getItems();
            setAllItems(items);
        } catch (e) { console.error("Failed to load items for search", e); }
    };
    loadItems();

    const handleClickOutside = (event: MouseEvent) => {
        if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
            setShowSuggestions(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
        window.removeEventListener('resize', handleResize);
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const query = e.target.value;
      setSearchQuery(query);
      
      if (query.trim().length > 0) {
          // Fuzzy-like search: Split by space and check if all terms exist in name OR sku
          const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 0);
          
          const matches = allItems.filter(item => {
              const searchString = `${item.name} ${item.sku}`.toLowerCase();
              return terms.every(term => searchString.includes(term));
          }).slice(0, 8); // Limit to 8 suggestions
          
          setFilteredSuggestions(matches);
          setShowSuggestions(true);
      } else {
          setShowSuggestions(false);
      }
  };

  const handleSelectItem = (item: InventoryItem) => {
      setSearchModalItem(item);
      setSearchQuery('');
      setShowSuggestions(false);
  };

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
                <div className="flex items-center gap-4 flex-1">
                    <button 
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500 transition-colors"
                    >
                        <Menu size={20} />
                    </button>
                    
                    {/* Global Search Bar */}
                    <div className="relative w-full max-w-lg hidden md:block" ref={searchContainerRef}>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input 
                                type="text"
                                value={searchQuery}
                                onChange={handleSearchChange}
                                onFocus={() => searchQuery && setShowSuggestions(true)}
                                placeholder="Cari Mutasi Barang (Nama / SKU)..." 
                                className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700/50 border-transparent focus:bg-white dark:focus:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-paper-blue focus:border-transparent outline-none transition-all dark:text-white"
                            />
                        </div>
                        {/* Autocomplete Dropdown */}
                        {showSuggestions && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 max-h-80 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
                                {filteredSuggestions.length > 0 ? (
                                    <>
                                        <div className="px-3 py-2 text-xs font-bold text-gray-500 uppercase bg-gray-50 dark:bg-gray-900 sticky top-0">Hasil Pencarian</div>
                                        {filteredSuggestions.map(item => (
                                            <div 
                                                key={item.id} 
                                                onClick={() => handleSelectItem(item)}
                                                className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-50 dark:border-gray-700 last:border-0"
                                            >
                                                <div className="font-bold text-gray-800 dark:text-gray-200 text-sm">{item.name}</div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-xs font-mono bg-gray-100 dark:bg-gray-600 px-1.5 rounded text-gray-600 dark:text-gray-300">{item.sku}</span>
                                                    <span className="text-xs text-gray-400">Stok: {item.stock} {item.unit}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </>
                                ) : (
                                    <div className="p-4 text-center text-gray-400 text-sm">Tidak ada barang ditemukan.</div>
                                )}
                            </div>
                        )}
                    </div>
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

        {/* Search Result Modal */}
        {searchModalItem && (
            <ItemMutationModal 
                item={searchModalItem} 
                onClose={() => setSearchModalItem(null)} 
            />
        )}

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

// --- Internal Component: Item Mutation Modal ---
const ItemMutationModal: React.FC<{ item: InventoryItem; onClose: () => void }> = ({ item, onClose }) => {
    const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
    const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
    const [typeFilter, setTypeFilter] = useState<'all' | 'inbound' | 'outbound'>('all');
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const allTx = await storageService.getTransactions();
                setTransactions(allTx);
            } catch(e) { console.error(e); }
            finally { setIsLoading(false); }
        };
        fetchData();
    }, []);

    const filteredMutations = useMemo(() => {
        const start = new Date(startDate).setHours(0,0,0,0);
        const end = new Date(endDate).setHours(23,59,59,999);

        // Filter transactions relevant to this item
        const relevantTx = transactions.filter(t => {
            const tDate = new Date(t.date).getTime();
            const dateMatch = tDate >= start && tDate <= end;
            const typeMatch = typeFilter === 'all' || t.type === typeFilter;
            const hasItem = t.items.some(i => i.itemId === item.id);
            return dateMatch && typeMatch && hasItem;
        });

        // Map to flat mutation list
        return relevantTx.map(t => {
            const detail = t.items.find(i => i.itemId === item.id);
            return {
                id: t.id,
                date: t.date,
                type: t.type,
                qty: detail ? detail.qty : 0, // Base Qty
                unit: detail ? detail.uom : item.unit,
                ref: t.poNumber || t.deliveryNote || '-',
                warehouse: t.warehouse || 'Gudang Utama'
            };
        }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions, item.id, startDate, endDate, typeFilter]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in duration-200">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">
                {/* Header */}
                <div className="p-5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2">
                            <Package size={20} className="text-paper-blue"/> {item.name}
                        </h3>
                        <p className="text-xs text-gray-500 font-mono mt-1">SKU: {item.sku} | Stok Saat Ini: {item.stock} {item.unit}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-500">
                        <X size={20}/>
                    </button>
                </div>

                {/* Filters */}
                <div className="p-4 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex flex-wrap gap-4 items-end">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Rentang Tanggal</label>
                        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700">
                            <Calendar size={14} className="text-gray-400 ml-2"/>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent text-xs p-1.5 outline-none dark:text-white" />
                            <span className="text-gray-400">-</span>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent text-xs p-1.5 outline-none dark:text-white" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Tipe Transaksi</label>
                        <div className="relative">
                            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                            <select 
                                value={typeFilter} 
                                onChange={(e:any) => setTypeFilter(e.target.value)} 
                                className="pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs outline-none focus:ring-1 focus:ring-paper-blue dark:text-white appearance-none cursor-pointer"
                            >
                                <option value="all">Semua</option>
                                <option value="inbound">Masuk (Inbound)</option>
                                <option value="outbound">Keluar (Outbound)</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900/50 p-4">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-40">
                            <Loader2 size={32} className="animate-spin text-paper-blue"/>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                                    <tr>
                                        <th className="p-3 text-xs font-bold text-gray-500 uppercase">Tanggal</th>
                                        <th className="p-3 text-xs font-bold text-gray-500 uppercase text-center">Tipe</th>
                                        <th className="p-3 text-xs font-bold text-gray-500 uppercase">Ref / Dokumen</th>
                                        <th className="p-3 text-xs font-bold text-gray-500 uppercase">Gudang</th>
                                        <th className="p-3 text-xs font-bold text-gray-500 uppercase text-center">Qty</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {filteredMutations.length > 0 ? filteredMutations.map((m, idx) => (
                                        <tr key={idx} className="hover:bg-blue-50/50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="p-3 text-gray-600 dark:text-gray-300 font-mono text-xs whitespace-nowrap">
                                                {new Date(m.date).toLocaleString('id-ID')}
                                            </td>
                                            <td className="p-3 text-center">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${m.type === 'inbound' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                    {m.type === 'inbound' ? 'Masuk' : 'Keluar'}
                                                </span>
                                            </td>
                                            <td className="p-3 text-gray-700 dark:text-gray-300">
                                                <div className="font-bold text-xs">{m.id}</div>
                                                <div className="text-[10px] text-gray-400">{m.ref}</div>
                                            </td>
                                            <td className="p-3 text-gray-600 dark:text-gray-400 text-xs">
                                                {m.warehouse}
                                            </td>
                                            <td className="p-3 text-center font-bold text-gray-800 dark:text-white">
                                                {m.type === 'inbound' ? '+' : '-'}{m.qty} {m.unit}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={5} className="p-10 text-center text-gray-400 italic">
                                                Tidak ada mutasi pada periode ini.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                
                {/* Footer Summary */}
                <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-between text-xs font-medium text-gray-500">
                    <div>Total Transaksi: {filteredMutations.length}</div>
                    <div className="flex gap-4">
                        <span className="text-emerald-600">Total Masuk: {filteredMutations.filter(m => m.type === 'inbound').reduce((a,b) => a + b.qty, 0)}</span>
                        <span className="text-rose-600">Total Keluar: {filteredMutations.filter(m => m.type === 'outbound').reduce((a,b) => a + b.qty, 0)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
