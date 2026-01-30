
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Inventory } from './components/Inventory';
import { Transactions } from './components/Transactions';
import { History } from './components/History';
import { AIAssistant } from './components/AIAssistant';
import { Admin } from './components/Admin';
import { Login } from './components/Login';
import { RejectManager } from './components/RejectManager';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastContainer, ToastMessage, ToastType } from './components/Toast';
import { storageService } from './services/storageService';
import { User, InventoryItem, Transaction, DashboardStats, RejectItem, RejectLog } from './types';

interface Tab {
  id: string;
  type: string;
  title: string;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [tabs, setTabs] = useState<Tab[]>([{ id: 'dashboard-1', type: 'dashboard', title: 'Dashboard' }]);
  const [activeTabId, setActiveTabId] = useState<string>('dashboard-1');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<DashboardStats>({ totalValue: 0, totalUnits: 0, lowStockCount: 0, skuCount: 0 });
  const [mediaUrl, setMediaUrl] = useState(() => localStorage.getItem('nexus_media_url') || 'https://www.youtube.com/embed/jfKfPfyJRdk');
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('nexus_theme') === 'dark');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [rejectMaster, setRejectMaster] = useState<RejectItem[]>([]);
  const [rejectLogs, setRejectLogs] = useState<RejectLog[]>([]);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('nexus_theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);
  const notify = (message: string, type: ToastType) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
  };
  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  useEffect(() => { if (user) refreshData(); }, [user]); 

  const handleOpenTab = (type: string, title: string) => {
    if (['dashboard', 'inventory', 'history', 'ai', 'admin'].includes(type)) {
      const existing = tabs.find(t => t.type === type);
      if (existing) { setActiveTabId(existing.id); return; }
    }
    const newTab: Tab = { id: `${type}-${Date.now()}`, type, title };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  };

  const handleCloseTab = (id: string) => {
    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);
    if (activeTabId === id && newTabs.length > 0) setActiveTabId(newTabs[newTabs.length - 1].id);
    else if (newTabs.length === 0) handleOpenTab('dashboard', 'Dashboard');
  };

  const handleSwitchTab = (id: string) => setActiveTabId(id);

  const refreshData = async () => {
    try {
      const [fItems, fTransactions, fRejectMaster, fRejectLogs] = await Promise.allSettled([
        storageService.getItems(), storageService.getTransactions(), storageService.getRejectMaster(), storageService.getRejectLogs()
      ]);
      if (fItems.status === 'fulfilled') {
          const fetchedItems = fItems.value;
          setItems(fetchedItems);
          setStats({ totalValue: fetchedItems.reduce((acc, curr) => acc + (curr.price * curr.stock), 0), totalUnits: fetchedItems.reduce((acc, curr) => acc + curr.stock, 0), lowStockCount: fetchedItems.filter(i => i.stock <= i.minLevel).length, skuCount: fetchedItems.length });
      }
      if (fTransactions.status === 'fulfilled') setTransactions(fTransactions.value);
      if (fRejectMaster.status === 'fulfilled') setRejectMaster(fRejectMaster.value);
      if (fRejectLogs.status === 'fulfilled') setRejectLogs(fRejectLogs.value);
    } catch (e) { notify("Gagal sinkronisasi data", 'error'); }
  };

  const handleLogin = (loggedInUser: User) => { setUser(loggedInUser); notify(`Selamat datang, ${loggedInUser.name}`, 'success'); };
  const handleLogout = () => { setUser(null); setTabs([{ id: 'dashboard-1', type: 'dashboard', title: 'Dashboard' }]); setActiveTabId('dashboard-1'); notify('Logged out', 'info'); };
  const handleUpdateRejectMaster = async (newItems: RejectItem[]) => { try { await storageService.saveRejectMaster(newItems); refreshData(); notify("Data Master Diperbarui", 'success'); } catch (e) { notify("Gagal simpan master", 'error'); } };
  const handleDeleteRejectMaster = async (id: string) => { try { await storageService.deleteRejectMaster(id); refreshData(); notify("Master Barang Terhapus", 'info'); } catch (e) { notify("Gagal hapus master", 'error'); } };
  const handleAddRejectLog = async (log: RejectLog) => { try { await storageService.saveRejectLog(log); refreshData(); notify("Log Kejadian Disimpan", 'success'); } catch (e) { notify("Gagal simpan log", 'error'); } };
  const handleUpdateRejectLog = async (log: RejectLog) => { try { await storageService.updateRejectLog(log); refreshData(); notify("Log Kejadian Diupdate", 'success'); } catch (e) { notify("Update gagal", 'error'); } };
  const handleDeleteRejectLog = async (id: string) => { try { await storageService.deleteRejectLog(id); refreshData(); notify("Log Kejadian Terhapus", 'info'); } catch (e) { notify("Delete gagal", 'error'); } };

  if (!user) return (<ErrorBoundary><ToastContainer toasts={toasts} removeToast={removeToast} /><Login onLogin={handleLogin} notify={notify} /></ErrorBoundary>);

  const renderTabContent = (tab: Tab) => {
    switch (tab.type) {
      case 'dashboard': return <Dashboard items={items} transactions={transactions} stats={stats} />;
      case 'inventory': return <Inventory items={items} role={user.role} onRefresh={refreshData} notify={notify} />;
      case 'transactions': return <Transactions items={items} user={user} onSuccess={() => { refreshData(); handleCloseTab(tab.id); }} notify={notify} />;
      case 'reject': return <RejectManager rejectMasterData={rejectMaster} rejectLogs={rejectLogs} onAddLog={handleAddRejectLog} onUpdateLog={handleUpdateRejectLog} onDeleteLog={handleDeleteRejectLog} onDeleteMaster={handleDeleteRejectMaster} onUpdateMaster={handleUpdateRejectMaster} />;
      case 'history': return <History transactions={transactions} items={items} onRefresh={refreshData} />;
      case 'ai': return <AIAssistant inventory={items} transactions={transactions} />;
      case 'admin': return <Admin currentMediaUrl={mediaUrl} onUpdateMedia={(url) => { setMediaUrl(url); localStorage.setItem('nexus_media_url', url); }} />;
      default: return null;
    }
  };

  return (
    <ErrorBoundary>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <Layout user={user} activeTabId={activeTabId} tabs={tabs} onOpenTab={handleOpenTab} onCloseTab={handleCloseTab} onSwitchTab={handleSwitchTab} onLogout={handleLogout} isDarkMode={isDarkMode} toggleTheme={toggleTheme} mediaUrl={mediaUrl}>
        <div className="relative w-full h-full">
          {tabs.map(tab => (
            <div key={tab.id} className={`w-full h-full absolute inset-0 transition-opacity duration-200 ${activeTabId === tab.id ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none hidden'}`}>{renderTabContent(tab)}</div>
          ))}
        </div>
      </Layout>
    </ErrorBoundary>
  );
}

export default App;
