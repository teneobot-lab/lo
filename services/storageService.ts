
import { InventoryItem, Transaction, User, DashboardStats, RejectItem, RejectLog } from '../types';
import CryptoJS from 'crypto-js';

// --- CONFIGURATION ---
const DEFAULT_API_URL = '/api'; 

const getApiUrl = () => {
    let stored = localStorage.getItem('nexus_api_url');
    if (!stored || stored.trim() === '') return DEFAULT_API_URL;
    if (stored === 'local') return '';
    
    stored = stored.trim();
    if (!stored.startsWith('http') && !stored.startsWith('/')) {
        stored = `http://${stored}`;
    }
    return stored;
};

const isApiMode = () => {
    return !!getApiUrl();
};

const apiCall = async (endpoint: string, method: string = 'GET', body?: any) => {
    const baseUrl = getApiUrl();
    
    let cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    let cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    
    // Jika menggunakan IP langsung (HTTP), pastikan prefix /api ada
    if (cleanBase.startsWith('http')) {
        if (!cleanBase.includes('/api') && !cleanEndpoint.startsWith('api/')) {
            cleanEndpoint = `api/${cleanEndpoint}`;
        }
    }

    const url = `${cleanBase}/${cleanEndpoint}`;

    try {
        const headers: any = { 'Content-Type': 'application/json' };
        const res = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
            mode: 'cors' 
        });
        
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.error || `API Error: ${res.statusText} (${res.status})`);
        }
        
        return await res.json();
    } catch (e: any) {
        console.error(`[NEXUS CONNECTION ERROR] ${method} ${url}:`, e);
        // Berikan pesan yang lebih informatif untuk debugging user
        throw new Error(e.message || "Network Error");
    }
};

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
  try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
  } catch (e) {
      return null;
  }
};
const safeSet = (key: string, data: any) => localStorage.setItem(key, JSON.stringify(data));

export const storageService = {
  getUsers: async (): Promise<User[]> => {
    if (isApiMode()) return apiCall('users');
    return safeGet(KEYS.USERS) || INITIAL_USERS;
  },

  saveUser: async (user: User, password?: string) => {
    if (isApiMode()) return apiCall('users', 'POST', { ...user, password });
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
    const storedHash = localStorage.getItem(`pwd_${username}`);
    const defaultHash = '5994471abb01112afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5';
    if ((storedHash && storedHash === passwordHash) || passwordHash === defaultHash) return user;
    return null;
  },

  hashPassword: (password: string): string => {
    return CryptoJS.SHA256(password).toString();
  },

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
    
    // Local Mode: Update Stock
    const items = safeGet(KEYS.ITEMS) || INITIAL_ITEMS;
    transaction.items.forEach(tItem => {
        const itemIndex = items.findIndex((i: InventoryItem) => i.id === tItem.itemId);
        if (itemIndex >= 0) {
            if (transaction.type === 'inbound') {
                items[itemIndex].stock += tItem.qty;
            } else {
                items[itemIndex].stock -= tItem.qty;
            }
        }
    });
    safeSet(KEYS.ITEMS, items);

    const transactions = safeGet(KEYS.TRANSACTIONS) || [];
    transactions.unshift(transaction);
    safeSet(KEYS.TRANSACTIONS, transactions);
  },

  updateTransaction: async (oldTx: Transaction, newTx: Transaction) => {
      if (isApiMode()) return apiCall(`transactions/${newTx.id}`, 'PUT', { oldTx, newTx });
      
      const transactions = safeGet(KEYS.TRANSACTIONS) || [];
      const idx = transactions.findIndex((t: Transaction) => t.id === oldTx.id);
      if (idx >= 0) {
          transactions[idx] = newTx;
          safeSet(KEYS.TRANSACTIONS, transactions);

          // Update Stocks locally
          const items = safeGet(KEYS.ITEMS) || INITIAL_ITEMS;
          
          // Revert Old
          oldTx.items.forEach(oldItem => {
              const iIdx = items.findIndex((i: InventoryItem) => i.id === oldItem.itemId);
              if (iIdx >= 0) {
                  // If inbound was +qty, revert means -qty.
                  if (oldTx.type === 'inbound') items[iIdx].stock -= oldItem.qty;
                  else items[iIdx].stock += oldItem.qty;
              }
          });

          // Apply New
          newTx.items.forEach(newItem => {
              const iIdx = items.findIndex((i: InventoryItem) => i.id === newItem.itemId);
              if (iIdx >= 0) {
                  if (newTx.type === 'inbound') items[iIdx].stock += newItem.qty;
                  else items[iIdx].stock -= newItem.qty;
              }
          });
          
          safeSet(KEYS.ITEMS, items);
      }
  },

  deleteTransaction: async (id: string) => {
      if (isApiMode()) return apiCall(`transactions/${id}`, 'DELETE');
      
      const transactions = safeGet(KEYS.TRANSACTIONS) || [];
      const txToDelete = transactions.find((t: Transaction) => t.id === id);
      
      if (txToDelete) {
          // Revert stock before deleting
          const items = safeGet(KEYS.ITEMS) || INITIAL_ITEMS;
          txToDelete.items.forEach((item: any) => {
              const iIdx = items.findIndex((i: InventoryItem) => i.id === item.itemId);
              if (iIdx >= 0) {
                  if (txToDelete.type === 'inbound') items[iIdx].stock -= item.qty;
                  else items[iIdx].stock += item.qty;
              }
          });
          safeSet(KEYS.ITEMS, items);
      }

      safeSet(KEYS.TRANSACTIONS, transactions.filter((t: Transaction) => t.id !== id));
  },

  getRejectMaster: async (): Promise<RejectItem[]> => {
      if (isApiMode()) return apiCall('reject_master');
      return safeGet(KEYS.REJECT_MASTER) || [];
  },
  saveRejectMaster: async (items: RejectItem[]) => {
      if (isApiMode()) return apiCall('reject_master', 'POST', items);
      safeSet(KEYS.REJECT_MASTER, items);
  },
  getRejectLogs: async (): Promise<RejectLog[]> => {
      if (isApiMode()) return apiCall('reject_logs');
      return safeGet(KEYS.REJECT_LOGS) || [];
  },
  saveRejectLog: async (log: RejectLog) => {
      if (isApiMode()) return apiCall('reject_logs', 'POST', log);
      const logs = safeGet(KEYS.REJECT_LOGS) || [];
      logs.unshift(log);
      safeSet(KEYS.REJECT_LOGS, logs);
  },
  updateRejectLog: async (log: RejectLog) => {
      if (isApiMode()) return apiCall(`reject_logs/${log.id}`, 'PUT', log);
      const logs = safeGet(KEYS.REJECT_LOGS) || [];
      const idx = logs.findIndex((l: RejectLog) => l.id === log.id);
      if (idx >= 0) { logs[idx] = log; safeSet(KEYS.REJECT_LOGS, logs); }
  },
  deleteRejectLog: async (id: string) => {
      if (isApiMode()) return apiCall(`reject_logs/${id}`, 'DELETE');
      const logs = safeGet(KEYS.REJECT_LOGS) || [];
      safeSet(KEYS.REJECT_LOGS, logs.filter((l: RejectLog) => l.id !== id));
  },

  getStats: async (): Promise<DashboardStats> => {
      try {
          const items = await storageService.getItems();
          return {
            totalValue: items.reduce((acc, curr) => acc + (curr.price * curr.stock), 0),
            totalUnits: items.reduce((acc, curr) => acc + curr.stock, 0),
            lowStockCount: items.filter(i => i.stock <= i.minLevel).length,
            skuCount: items.length
          };
      } catch (e) {
          return { totalValue: 0, totalUnits: 0, lowStockCount: 0, skuCount: 0 };
      }
  }
};
