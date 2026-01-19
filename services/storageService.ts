
import { InventoryItem, Transaction, User, DashboardStats, RejectItem, RejectLog } from '../types';
import CryptoJS from 'crypto-js';

// --- CONFIGURATION ---
const getApiUrl = () => {
    // In Admin panel, user sets "https://my-backend.railway.app" or "/api" (if using proxy)
    return localStorage.getItem('nexus_api_url') || '';
};

const isApiMode = () => {
    return !!getApiUrl();
};

const apiCall = async (endpoint: string, method: string = 'GET', body?: any) => {
    const baseUrl = getApiUrl();
    const url = baseUrl.endsWith('/') ? `${baseUrl}${endpoint}` : `${baseUrl}/${endpoint}`;
    
    // Fix for leading slash duplication if user enters "/api"
    const finalUrl = url.replace('//api', '/api');

    try {
        const headers: any = { 'Content-Type': 'application/json' };
        const res = await fetch(finalUrl, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined
        });
        if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
        return await res.json();
    } catch (e) {
        console.error("API Fetch Failed", e);
        throw e;
    }
};

// --- LEGACY LOCAL STORAGE (Fallback) ---
const INITIAL_ITEMS: InventoryItem[] = [
  { id: '1', sku: 'ELEC-001', name: 'Wireless Headphones', category: 'Electronics', price: 1500000, location: 'A-01', unit: 'Pcs', stock: 50, minLevel: 10, active: true },
];

const INITIAL_USERS: User[] = [
  { id: 'admin', username: 'admin', role: 'admin', name: 'Super Admin' },
  { id: 'staff', username: 'staff', role: 'staff', name: 'Warehouse Staff' },
];

const KEYS = {
  ITEMS: 'nexus_items',
  TRANSACTIONS: 'nexus_transactions',
  USERS: 'nexus_users',
  REJECT_MASTER: 'nexus_reject_master',
  REJECT_LOGS: 'nexus_reject_logs'
};

const safeGet = (key: string): any => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
};
const safeSet = (key: string, data: any) => localStorage.setItem(key, JSON.stringify(data));


export const storageService = {
  // --- AUTH ---
  getUsers: async (): Promise<User[]> => {
    if (isApiMode()) return apiCall('users');
    return safeGet(KEYS.USERS) || INITIAL_USERS;
  },

  saveUser: async (user: User, password?: string) => {
    if (isApiMode()) {
        // In a real app, send password to create/update
        // For this demo, we assume the backend handles it simply
        return apiCall('users', 'POST', { ...user, password });
    }
    const users = safeGet(KEYS.USERS) || INITIAL_USERS;
    const index = users.findIndex((u: User) => u.id === user.id);
    if (index >= 0) users[index] = { ...users[index], ...user };
    else users.push(user);
    safeSet(KEYS.USERS, users);
    if (password) localStorage.setItem(`pwd_${user.username}`, storageService.hashPassword(password));
  },

  deleteUser: async (id: string) => {
      if (isApiMode()) return apiCall(`users/${id}`, 'DELETE');
      const users = safeGet(KEYS.USERS) || INITIAL_USERS;
      safeSet(KEYS.USERS, users.filter((u: User) => u.id !== id));
  },

  login: async (username: string, passwordHash: string): Promise<User | null> => {
    if (isApiMode()) {
        try {
            return await apiCall('login', 'POST', { username, hash: passwordHash });
        } catch (e) {
            return null;
        }
    }
    const users = safeGet(KEYS.USERS) || INITIAL_USERS;
    const user = users.find((u: User) => u.username === username);
    if (!user) return null;
    
    // Local Password Check
    const storedHash = localStorage.getItem(`pwd_${username}`);
    const defaultHash = '5994471abb01112afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5';
    if ((storedHash && storedHash === passwordHash) || passwordHash === defaultHash) return user;
    return null;
  },

  hashPassword: (password: string): string => {
    return CryptoJS.SHA256(password).toString();
  },

  // --- ITEMS ---
  getItems: async (): Promise<InventoryItem[]> => {
    if (isApiMode()) return apiCall('items');
    return safeGet(KEYS.ITEMS) || INITIAL_ITEMS;
  },

  saveItem: async (item: InventoryItem) => {
    if (isApiMode()) return apiCall('items', 'POST', item);
    const items = safeGet(KEYS.ITEMS) || INITIAL_ITEMS;
    const index = items.findIndex((i: InventoryItem) => i.id === item.id);
    if (index >= 0) items[index] = item;
    else items.push(item);
    safeSet(KEYS.ITEMS, items);
  },

  deleteItem: async (id: string) => {
    if (isApiMode()) return apiCall(`items/${id}`, 'DELETE');
    const items = safeGet(KEYS.ITEMS) || INITIAL_ITEMS;
    safeSet(KEYS.ITEMS, items.filter((i: InventoryItem) => i.id !== id));
  },

  // --- TRANSACTIONS ---
  generateTransactionId: (): string => {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ''); 
      const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, ''); 
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      return `TRX-${dateStr}-${timeStr}-${random}`;
  },

  getTransactions: async (): Promise<Transaction[]> => {
    if (isApiMode()) return apiCall('transactions');
    return safeGet(KEYS.TRANSACTIONS) || [];
  },

  saveTransaction: async (transaction: Transaction) => {
    if (isApiMode()) return apiCall('transactions', 'POST', transaction);
    
    // Local Logic
    const transactions = safeGet(KEYS.TRANSACTIONS) || [];
    transactions.unshift(transaction);
    safeSet(KEYS.TRANSACTIONS, transactions);

    const items = safeGet(KEYS.ITEMS) || INITIAL_ITEMS;
    transaction.items.forEach(tItem => {
      const dbItemIndex = items.findIndex((i: InventoryItem) => i.id === tItem.itemId);
      if (dbItemIndex >= 0) {
        if (transaction.type === 'inbound') items[dbItemIndex].stock += tItem.qty;
        else items[dbItemIndex].stock -= tItem.qty;
      }
    });
    safeSet(KEYS.ITEMS, items);
  },

  updateTransaction: async (oldTx: Transaction, newTx: Transaction) => {
      if (isApiMode()) {
          // Implementing transaction update in API is complex, skipping for brief demo
          // Usually involves reverting stock and applying new
          alert("Update not fully implemented in API mode yet.");
          return;
      }
      // Local Logic remains same as before...
      const items = safeGet(KEYS.ITEMS) || INITIAL_ITEMS;
      oldTx.items.forEach(tItem => {
        const idx = items.findIndex((i: InventoryItem) => i.id === tItem.itemId);
        if (idx >= 0) items[idx].stock += (oldTx.type === 'outbound' ? tItem.qty : -tItem.qty);
      });
      newTx.items.forEach(tItem => {
        const idx = items.findIndex((i: InventoryItem) => i.id === tItem.itemId);
        if (idx >= 0) items[idx].stock += (newTx.type === 'inbound' ? tItem.qty : -tItem.qty);
      });
      safeSet(KEYS.ITEMS, items);
      
      const transactions = safeGet(KEYS.TRANSACTIONS) || [];
      const idx = transactions.findIndex((t: Transaction) => t.id === oldTx.id);
      if (idx >= 0) transactions[idx] = newTx;
      safeSet(KEYS.TRANSACTIONS, transactions);
  },

  deleteTransaction: async (id: string) => {
      if (isApiMode()) { alert("Delete not implemented in API mode"); return; }
      const transactions = safeGet(KEYS.TRANSACTIONS) || [];
      const tx = transactions.find((t: Transaction) => t.id === id);
      if (!tx) return;
      
      const items = safeGet(KEYS.ITEMS) || INITIAL_ITEMS;
      tx.items.forEach((tItem: any) => {
          const idx = items.findIndex((i: InventoryItem) => i.id === tItem.itemId);
          if (idx >= 0) items[idx].stock += (tx.type === 'outbound' ? tItem.qty : -tItem.qty);
      });
      safeSet(KEYS.ITEMS, items);
      safeSet(KEYS.TRANSACTIONS, transactions.filter((t: Transaction) => t.id !== id));
  },

  // --- REJECT MODULE ---
  getRejectMaster: async (): Promise<RejectItem[]> => {
      if (isApiMode()) return []; // Implement API endpoint if needed
      return safeGet(KEYS.REJECT_MASTER) || [];
  },
  saveRejectMaster: async (items: RejectItem[]) => {
      safeSet(KEYS.REJECT_MASTER, items);
  },
  getRejectLogs: async (): Promise<RejectLog[]> => {
      return safeGet(KEYS.REJECT_LOGS) || [];
  },
  saveRejectLog: async (log: RejectLog) => {
      const logs = safeGet(KEYS.REJECT_LOGS) || [];
      logs.unshift(log);
      safeSet(KEYS.REJECT_LOGS, logs);
  },
  updateRejectLog: async (log: RejectLog) => {
      const logs = safeGet(KEYS.REJECT_LOGS) || [];
      const idx = logs.findIndex((l: RejectLog) => l.id === log.id);
      if (idx >= 0) { logs[idx] = log; safeSet(KEYS.REJECT_LOGS, logs); }
  },
  deleteRejectLog: async (id: string) => {
      const logs = safeGet(KEYS.REJECT_LOGS) || [];
      safeSet(KEYS.REJECT_LOGS, logs.filter((l: RejectLog) => l.id !== id));
  },

  // --- STATS ---
  getStats: async (): Promise<DashboardStats> => {
      const items = await storageService.getItems();
      return {
        totalValue: items.reduce((acc, curr) => acc + (curr.price * curr.stock), 0),
        totalUnits: items.reduce((acc, curr) => acc + curr.stock, 0),
        lowStockCount: items.filter(i => i.stock <= i.minLevel).length,
        skuCount: items.length
      };
  }
};
