
import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Inventory } from './components/Inventory';
import { Transactions } from './components/Transactions';
import { Reject } from './components/Reject';
import { History } from './components/History';
import { AIAssistant } from './components/AIAssistant';
import { Admin } from './components/Admin';
import { Login } from './components/Login';
import { ToastContainer, ToastMessage, ToastType } from './components/Toast';
import { storageService } from './services/storageService';
import { User, InventoryItem, Transaction, DashboardStats } from './types';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activePage, setActivePage] = useState('dashboard');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('nexus_theme');
    return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  
  const [stats, setStats] = useState<DashboardStats>({
      totalValue: 0, totalUnits: 0, lowStockCount: 0, skuCount: 0
  });

  // Theme effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('nexus_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('nexus_theme', 'light');
    }
  }, [darkMode]);

  const toggleTheme = () => setDarkMode(!darkMode);

  const notify = useCallback((message: string, type: ToastType = 'success') => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setItems(storageService.getItems());
    setTransactions(storageService.getTransactions());
    setStats(storageService.getStats());
  };

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    refreshData();
    notify(`Welcome back, ${loggedInUser.name}!`, 'success');
  };

  const handleLogout = () => {
    setUser(null);
    setActivePage('dashboard');
    notify('Logged out successfully', 'info');
  };

  if (!user) {
    return <Login onLogin={handleLogin} notify={notify} />;
  }

  const renderContent = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard items={items} transactions={transactions} stats={stats} />;
      case 'inventory':
        return <Inventory items={items} role={user.role} onRefresh={refreshData} notify={notify} />;
      case 'transactions':
        if (user.role === 'viewer') return <div className="text-center p-10 text-muted">Viewer access restricted.</div>;
        return <Transactions items={items} user={user} onSuccess={refreshData} notify={notify} />;
      case 'reject':
        if (user.role === 'viewer') return <div className="text-center p-10 text-muted">Viewer access restricted.</div>;
        return <Reject items={items} user={user} notify={notify} />;
      case 'history':
        return <History transactions={transactions} onRefresh={refreshData} notify={notify} />;
      case 'ai':
        return <AIAssistant inventory={items} transactions={transactions} />;
      case 'admin':
        if (user.role !== 'admin') return <div className="text-center p-10 text-muted">Admin access restricted.</div>;
        return <Admin notify={notify} />;
      default:
        return <Dashboard items={items} transactions={transactions} stats={stats} />;
    }
  };

  return (
    <Layout 
      user={user} 
      activePage={activePage} 
      onNavigate={setActivePage} 
      onLogout={handleLogout}
      darkMode={darkMode}
      onToggleTheme={toggleTheme}
    >
      {renderContent()}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </Layout>
  );
}

export default App;
