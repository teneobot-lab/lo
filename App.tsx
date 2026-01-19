
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

  // Reject Module State
  const [rejectMaster, setRejectMaster] = useState<RejectItem[]>([]);
  const [rejectLogs, setRejectLogs] = useState<RejectLog[]>([]);

  // Load Data on Mount
  useEffect(() => {
    refreshData();
  }, []);

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
  };

  const handleLogout = () => {
    setUser(null);
    setActivePage('dashboard');
  };

  // Reject Module Handlers
  const handleUpdateRejectMaster = (newItems: RejectItem[]) => {
      storageService.saveRejectMaster(newItems);
      setRejectMaster(newItems);
  };

  const handleAddRejectLog = (log: RejectLog) => {
      storageService.saveRejectLog(log);
      setRejectLogs(storageService.getRejectLogs());
  };

  const handleUpdateRejectLog = (log: RejectLog) => {
      storageService.updateRejectLog(log);
      setRejectLogs(storageService.getRejectLogs());
  };

  const handleDeleteRejectLog = (id: string) => {
      storageService.deleteRejectLog(id);
      setRejectLogs(storageService.getRejectLogs());
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const renderContent = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard items={items} transactions={transactions} stats={stats} />;
      case 'inventory':
        return <Inventory items={items} role={user.role} onRefresh={refreshData} />;
      case 'transactions':
        if (user.role === 'viewer') return <div className="text-center p-10 text-muted">Viewer access restricted.</div>;
        return <Transactions items={items} user={user} onSuccess={refreshData} />;
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
        if (user.role !== 'admin') return <div className="text-center p-10 text-muted">Admin access restricted.</div>;
        return <Admin />;
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
    >
      {renderContent()}
    </Layout>
  );
}

export default App;
