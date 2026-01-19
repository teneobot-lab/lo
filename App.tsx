
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

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('nexus_theme') === 'dark';
    }
    return false;
  });

  // Apply Dark Mode Class
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

  // Toast State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Reject Module State
  const [rejectMaster, setRejectMaster] = useState<RejectItem[]>([]);
  const [rejectLogs, setRejectLogs] = useState<RejectLog[]>([]);

  // Load Data on Mount
  useEffect(() => {
    try {
      refreshData();
    } catch (e) {
      notify("Failed to load initial data", 'error');
    }
  }, []);

  const notify = (message: string, type: ToastType) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const refreshData = () => {
    setItems(storageService.getItems());
    setTransactions(storageService.getTransactions());
    setStats(storageService.getStats());
    setRejectMaster(storageService.getRejectMaster());
    setRejectLogs(storageService.getRejectLogs());
  };

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    refreshData();
    notify(`Welcome back, ${loggedInUser.name}`, 'success');
  };

  const handleLogout = () => {
    setUser(null);
    setActivePage('dashboard');
    notify('Logged out successfully', 'info');
  };

  // Reject Module Handlers
  const handleUpdateRejectMaster = (newItems: RejectItem[]) => {
      try {
        storageService.saveRejectMaster(newItems);
        setRejectMaster(newItems);
        notify("Master data updated", 'success');
      } catch (e) {
        notify("Failed to save master data", 'error');
      }
  };

  const handleAddRejectLog = (log: RejectLog) => {
      try {
        storageService.saveRejectLog(log);
        setRejectLogs(storageService.getRejectLogs());
        notify("Reject log saved", 'success');
      } catch (e) {
        notify("Failed to save reject log", 'error');
      }
  };

  const handleUpdateRejectLog = (log: RejectLog) => {
      try {
        storageService.updateRejectLog(log);
        setRejectLogs(storageService.getRejectLogs());
        notify("Log updated", 'success');
      } catch (e) {
        notify("Update failed", 'error');
      }
  };

  const handleDeleteRejectLog = (id: string) => {
      try {
        storageService.deleteRejectLog(id);
        setRejectLogs(storageService.getRejectLogs());
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
        return <History transactions={transactions} onRefresh={refreshData} />;
      case 'ai':
        return <AIAssistant inventory={items} transactions={transactions} />;
      case 'admin':
        if (user.role !== 'admin') return <div className="text-center p-10 text-muted dark:text-gray-400">Admin access restricted.</div>;
        return <Admin />;
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
      >
        {renderContent()}
      </Layout>
    </ErrorBoundary>
  );
}

export default App;
