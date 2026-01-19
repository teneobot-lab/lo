
import { InventoryItem, Transaction, User, DashboardStats, RejectItem, RejectLog } from '../types';
import CryptoJS from 'crypto-js';

// Seed Data
const INITIAL_ITEMS: InventoryItem[] = [
  { id: '1', sku: 'ELEC-001', name: 'Wireless Headphones', category: 'Electronics', price: 1500000, location: 'A-01', unit: 'Pcs', stock: 50, minLevel: 10, active: true },
  { id: '2', sku: 'ELEC-002', name: 'Smart Watch Gen 3', category: 'Electronics', price: 3200000, location: 'A-02', unit: 'Pcs', stock: 5, minLevel: 8, active: true },
  { id: '3', sku: 'FURN-101', name: 'Ergonomic Office Chair', category: 'Furniture', price: 2100000, location: 'B-05', unit: 'Unit', stock: 12, minLevel: 5, active: true },
  { id: '4', sku: 'STAT-555', name: 'A4 Paper Ream', category: 'Stationery', price: 45000, location: 'C-12', unit: 'Box', stock: 200, minLevel: 50, active: true },
];

const INITIAL_USERS: User[] = [
  { id: 'admin', username: 'admin', role: 'admin', name: 'Super Admin' },
  { id: 'staff', username: 'staff', role: 'staff', name: 'Warehouse Staff' },
  { id: 'viewer', username: 'viewer', role: 'viewer', name: 'Auditor' },
];

// LocalStorage Keys
const KEYS = {
  ITEMS: 'nexus_items',
  TRANSACTIONS: 'nexus_transactions',
  USERS: 'nexus_users',
  SESSION: 'nexus_session',
  REJECT_MASTER: 'nexus_reject_master',
  REJECT_LOGS: 'nexus_reject_logs'
};

export const storageService = {
  // --- Auth & User Management ---
  getUsers: (): User[] => {
    const data = localStorage.getItem(KEYS.USERS);
    if (!data) {
      localStorage.setItem(KEYS.USERS, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    return JSON.parse(data);
  },

  saveUser: (user: User, password?: string) => {
    const users = storageService.getUsers();
    const index = users.findIndex(u => u.id === user.id);
    
    if (index >= 0) {
      users[index] = { ...users[index], ...user };
    } else {
      users.push(user);
    }
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));

    // Handle Password (in a real app, this would be salted and hashed securely on server)
    if (password) {
        localStorage.setItem(`pwd_${user.username}`, storageService.hashPassword(password));
    }
  },

  deleteUser: (id: string) => {
      const users = storageService.getUsers();
      const filtered = users.filter(u => u.id !== id);
      localStorage.setItem(KEYS.USERS, JSON.stringify(filtered));
  },

  login: (username: string, passwordHash: string): User | null => {
    const users = storageService.getUsers();
    const user = users.find(u => u.username === username);
    
    if (!user) return null;

    // Check specific stored password first
    const storedHash = localStorage.getItem(`pwd_${username}`);
    if (storedHash) {
        return storedHash === passwordHash ? user : null;
    }

    // Fallback for demo initial users (password '12345')
    const defaultHash = '827ccb0eea8a706c4c34a16891f84e7b'; 
    if (passwordHash === defaultHash) return user;
    
    return null;
  },

  hashPassword: (password: string): string => {
    return CryptoJS.MD5(password).toString();
  },

  // --- Items ---
  getItems: (): InventoryItem[] => {
    const data = localStorage.getItem(KEYS.ITEMS);
    if (!data) {
      localStorage.setItem(KEYS.ITEMS, JSON.stringify(INITIAL_ITEMS));
      return INITIAL_ITEMS;
    }
    return JSON.parse(data);
  },

  saveItem: (item: InventoryItem) => {
    const items = storageService.getItems();
    const index = items.findIndex(i => i.id === item.id);
    if (index >= 0) {
      items[index] = item;
    } else {
      items.push(item);
    }
    localStorage.setItem(KEYS.ITEMS, JSON.stringify(items));
  },

  deleteItem: (id: string) => {
    const items = storageService.getItems();
    const filtered = items.filter(i => i.id !== id);
    localStorage.setItem(KEYS.ITEMS, JSON.stringify(filtered));
  },

  // --- Transactions ---
  generateTransactionId: (): string => {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
      const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, ''); // HHMMSS
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      return `TRX-${dateStr}-${timeStr}-${random}`;
  },

  getTransactions: (): Transaction[] => {
    const data = localStorage.getItem(KEYS.TRANSACTIONS);
    return data ? JSON.parse(data) : [];
  },

  saveTransaction: (transaction: Transaction) => {
    const transactions = storageService.getTransactions();
    transactions.unshift(transaction); // Add to top
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(transactions));

    // Update Stock Levels
    const items = storageService.getItems();
    transaction.items.forEach(tItem => {
      const dbItemIndex = items.findIndex(i => i.id === tItem.itemId);
      if (dbItemIndex >= 0) {
        if (transaction.type === 'inbound') {
          items[dbItemIndex].stock += tItem.qty;
        } else {
          items[dbItemIndex].stock -= tItem.qty;
        }
      }
    });
    localStorage.setItem(KEYS.ITEMS, JSON.stringify(items));
  },

  updateTransaction: (oldTx: Transaction, newTx: Transaction) => {
    const items = storageService.getItems();
    
    // 1. Revert Old Transaction Impact
    oldTx.items.forEach(tItem => {
      const itemIndex = items.findIndex(i => i.id === tItem.itemId);
      if (itemIndex >= 0) {
        // If it was inbound (added stock), we remove it. If outbound (removed stock), we add it back.
        if (oldTx.type === 'inbound') items[itemIndex].stock -= tItem.qty;
        else items[itemIndex].stock += tItem.qty;
      }
    });

    // 2. Apply New Transaction Impact
    newTx.items.forEach(tItem => {
      const itemIndex = items.findIndex(i => i.id === tItem.itemId);
      if (itemIndex >= 0) {
        if (newTx.type === 'inbound') items[itemIndex].stock += tItem.qty;
        else items[itemIndex].stock -= tItem.qty;
      }
    });

    // 3. Save Items
    localStorage.setItem(KEYS.ITEMS, JSON.stringify(items));

    // 4. Update Transaction Record
    const transactions = storageService.getTransactions();
    const txIndex = transactions.findIndex(t => t.id === oldTx.id);
    if (txIndex >= 0) {
        transactions[txIndex] = newTx;
        localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(transactions));
    }
  },

  deleteTransaction: (id: string) => {
    const transactions = storageService.getTransactions();
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;

    const items = storageService.getItems();

    // Revert Stock
    tx.items.forEach(tItem => {
      const itemIndex = items.findIndex(i => i.id === tItem.itemId);
      if (itemIndex >= 0) {
        // If it was inbound (added), remove it. If outbound (removed), add it back.
        if (tx.type === 'inbound') {
          items[itemIndex].stock -= tItem.qty;
        } else {
          items[itemIndex].stock += tItem.qty;
        }
      }
    });

    // Save updated items
    localStorage.setItem(KEYS.ITEMS, JSON.stringify(items));

    // Remove transaction
    const filteredTx = transactions.filter(t => t.id !== id);
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(filteredTx));
  },

  // --- Reject Module Storage ---
  getRejectMaster: (): RejectItem[] => {
    const data = localStorage.getItem(KEYS.REJECT_MASTER);
    return data ? JSON.parse(data) : [];
  },

  saveRejectMaster: (items: RejectItem[]) => {
    localStorage.setItem(KEYS.REJECT_MASTER, JSON.stringify(items));
  },

  getRejectLogs: (): RejectLog[] => {
    const data = localStorage.getItem(KEYS.REJECT_LOGS);
    return data ? JSON.parse(data) : [];
  },

  saveRejectLog: (log: RejectLog) => {
    const logs = storageService.getRejectLogs();
    logs.unshift(log);
    localStorage.setItem(KEYS.REJECT_LOGS, JSON.stringify(logs));
  },

  updateRejectLog: (updatedLog: RejectLog) => {
    const logs = storageService.getRejectLogs();
    const index = logs.findIndex(l => l.id === updatedLog.id);
    if (index >= 0) {
      logs[index] = updatedLog;
      localStorage.setItem(KEYS.REJECT_LOGS, JSON.stringify(logs));
    }
  },

  deleteRejectLog: (id: string) => {
    const logs = storageService.getRejectLogs();
    const filtered = logs.filter(l => l.id !== id);
    localStorage.setItem(KEYS.REJECT_LOGS, JSON.stringify(filtered));
  },

  // --- Stats ---
  getStats: (): DashboardStats => {
    const items = storageService.getItems();
    return {
      totalValue: items.reduce((acc, curr) => acc + (curr.price * curr.stock), 0),
      totalUnits: items.reduce((acc, curr) => acc + curr.stock, 0),
      lowStockCount: items.filter(i => i.stock <= i.minLevel).length,
      skuCount: items.length
    };
  }
};
