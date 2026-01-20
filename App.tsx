
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

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activePage, setActivePage] = useState('dashboard');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
      totalValue: 0, totalUnits: 0, lowStockCount: 0, skuCount: 0
  });

  // Persistent Media Player State
  const [mediaUrl, setMediaUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('nexus_media_url') || 'https://www.youtube.com/embed/jfKfPfyJRdk?si=relaxing-music';
    }
    return 'https://www.youtube.com/embed/jfKfPfyJRdk?si=relaxing-music';
  });

  const handleUpdateMedia = (url: string) => {
    setMediaUrl(url);
    localStorage.setItem('nexus_media_url', url);
  };

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('nexus_theme') === 'dark';
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('nexus_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('nexus_theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const [rejectMaster, setRejectMaster] = useState<RejectItem[]>([]);
  const [rejectLogs, setRejectLogs] = useState<RejectLog[]>([]);

  useEffect(() => {
    if (user) {
        refreshData();
    }
  }, [user]); 

  const notify = (message: string, type: ToastType) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const refreshData = async () => {
    try {
      const [fetchedItems, fetchedTransactions, fetchedRejectMaster, fetchedRejectLogs] = await Promise.all([
        storageService.getItems(),
        storageService.getTransactions(),
        storageService.getRejectMaster(),
        storageService.getRejectLogs()
      ]);
      
      setItems(fetchedItems);
      setTransactions(fetchedTransactions);
      setRejectMaster(fetchedRejectMaster);
      setRejectLogs(fetchedRejectLogs);

      // Calc stats locally to ensure sync
      setStats({
        totalValue: fetchedItems.reduce((acc, curr) => acc + (curr.price * curr.stock), 0),
        totalUnits: fetchedItems.reduce((acc, curr) => acc + curr.stock, 0),
        lowStockCount: fetchedItems.filter(i => i.stock <= i.minLevel).length,
        skuCount: fetchedItems.length
      });
    } catch (e) {
      notify("Failed to load data from server", 'error');
    }
  };

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    notify(`Welcome back, ${loggedInUser.name}`, 'success');
  };

  const handleLogout = () => {
    setUser(null);
    setActivePage('dashboard');
    notify('Logged out successfully', 'info');
  };

  // Async Handlers for Reject Manager
  const handleUpdateRejectMaster = async (newItems: RejectItem[]) => {
      try {
        await storageService.saveRejectMaster(newItems);
        refreshData();
        notify("Master data updated", 'success');
      } catch (e) {
        notify("Failed to save master data", 'error');
      }
  };

  const handleAddRejectLog = async (log: RejectLog) => {
      try {
        await storageService.saveRejectLog(log);
        refreshData();
        notify("Reject log saved", 'success');
      } catch (e) {
        notify("Failed to save reject log", 'error');
      }
  };

  const handleUpdateRejectLog = async (log: RejectLog) => {
      try {
        await storageService.updateRejectLog(log);
        refreshData();
        notify("Log updated", 'success');
      } catch (e) {
        notify("Update failed", 'error');
      }
  };

  const handleDeleteRejectLog = async (id: string) => {
      try {
        await storageService.deleteRejectLog(id);
        refreshData();
        notify("Log deleted", 'info');
      } catch (e) {
        notify("Delete failed", 'error');
      }
  };

  if (!user) {
    return (
      <ErrorBoundary>
        <ToastContainer toasts={toasts} removeToast={removeToast} />
        <Login onLogin={handleLogin} notify={notify} />
      </ErrorBoundary>
    );
  }

  const renderContent = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard items={items} transactions={transactions} stats={stats} />;
      case 'inventory':
        return <Inventory items={items} role={user.role} onRefresh={refreshData} notify={notify} />;
      case 'transactions':
        if (user.role === 'viewer') return <div className="text-center p-10 text-muted dark:text-gray-400">Viewer access restricted.</div>;
        return <Transactions items={items} user={user} onSuccess={refreshData} notify={notify} />;
      case 'reject':
        return (
          <RejectManager 
            rejectMasterData={rejectMaster}
            rejectLogs={rejectLogs}
            onAddLog={handleAddRejectLog}
            onUpdateLog={handleUpdateRejectLog}
            onDeleteLog={handleDeleteRejectLog}
            onUpdateMaster={handleUpdateRejectMaster}
          />
        );
      case 'history':
        return <History transactions={transactions} items={items} onRefresh={refreshData} />;
      case 'ai':
        return <AIAssistant inventory={items} transactions={transactions} />;
      case 'admin':
        if (user.role !== 'admin') return <div className="text-center p-10 text-muted dark:text-gray-400">Admin access restricted.</div>;
        return <Admin currentMediaUrl={mediaUrl} onUpdateMedia={handleUpdateMedia} />;
      default:
        return <Dashboard items={items} transactions={transactions} stats={stats} />;
    }
  };

  return (
    <ErrorBoundary>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <Layout 
        user={user} 
        activePage={activePage} 
        onNavigate={setActivePage} 
        onLogout={handleLogout}
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
        mediaUrl={mediaUrl}
      >
        {renderContent()}
      </Layout>
    </ErrorBoundary>
  );
}

export default App;
