
import { InventoryItem, Transaction, User, DashboardStats, RejectTransaction } from '../types';
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
  REJECTS: 'nexus_rejects',
  USERS: 'nexus_users',
  SESSION: 'nexus_session'
};

// Internal safe wrappers
const safeGet = (key: string): any => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error(`StorageService: Error parsing data for key "${key}"`, error);
    return null;
  }
};

const safeSet = (key: string, data: any): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`StorageService: Error saving data for key "${key}"`, error);
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      alert("Storage Error: Local storage is full. Please clear some data or history.");
    }
    throw new Error(`Failed to save data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const storageService = {
  // --- Auth & User Management ---
  getUsers: (): User[] => {
    const users = safeGet(KEYS.USERS);
    if (!users) {
      safeSet(KEYS.USERS, INITIAL_USERS);
      return INITIAL_USERS;
    }
    return users;
  },

  saveUser: (user: User, password?: string) => {
    try {
      const users = storageService.getUsers();
      const index = users.findIndex(u => u.id === user.id);
      
      if (index >= 0) {
        users[index] = { ...users[index], ...user };
      } else {
        users.push(user);
      }
      safeSet(KEYS.USERS, users);

      if (password) {
          localStorage.setItem(`pwd_${user.username}`, storageService.hashPassword(password));
      }
    } catch (error) {
      throw error;
    }
  },

  deleteUser: (id: string) => {
    try {
      const users = storageService.getUsers();
      const filtered = users.filter(u => u.id !== id);
      safeSet(KEYS.USERS, filtered);
    } catch (error) {
      throw error;
    }
  },

  login: (username: string, passwordHash: string): User | null => {
    try {
      const users = storageService.getUsers();
      const user = users.find(u => u.username === username);
      
      if (!user) return null;

      const storedHash = localStorage.getItem(`pwd_${username}`);
      if (storedHash) {
          return storedHash === passwordHash ? user : null;
      }

      // SHA-256 for '12345'
      const defaultHash = '5994471abb01112afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5'; 
      if (passwordHash === defaultHash) return user;
      
      return null;
    } catch (error) {
      console.error("Login process failed", error);
      return null;
    }
  },

  hashPassword: (password: string): string => {
    try {
      return CryptoJS.SHA256(password).toString();
    } catch (e) {
      console.error("Hashing failed", e);
      return password; // Fallback
    }
  },

  // --- Items ---
  getItems: (): InventoryItem[] => {
    const items = safeGet(KEYS.ITEMS);
    if (!items) {
      safeSet(KEYS.ITEMS, INITIAL_ITEMS);
      return INITIAL_ITEMS;
    }
    return items;
  },

  saveItem: (item: InventoryItem) => {
    try {
      const items = storageService.getItems();
      const index = items.findIndex(i => i.id === item.id);
      if (index >= 0) {
        items[index] = item;
      } else {
        items.push(item);
      }
      safeSet(KEYS.ITEMS, items);
    } catch (error) {
      throw error;
    }
  },

  bulkImportItems: (newItems: InventoryItem[]) => {
    try {
      const items = storageService.getItems();
      // Use SKU as unique key to prevent duplicates
      const skuMap = new Map(items.map(i => [i.sku, i]));
      newItems.forEach(ni => {
        skuMap.set(ni.sku, { ...ni, id: ni.id || crypto.randomUUID() });
      });
      safeSet(KEYS.ITEMS, Array.from(skuMap.values()));
    } catch (e) {
      throw e;
    }
  },

  deleteItem: (id: string) => {
    try {
      const items = storageService.getItems();
      const filtered = items.filter(i => i.id !== id);
      safeSet(KEYS.ITEMS, filtered);
    } catch (error) {
      throw error;
    }
  },

  // --- Transactions ---
  generateTransactionId: (prefix: string = 'TRX'): string => {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ''); 
      const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, ''); 
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      return `${prefix}-${dateStr}-${timeStr}-${random}`;
  },

  getTransactions: (): Transaction[] => {
    return safeGet(KEYS.TRANSACTIONS) || [];
  },

  saveTransaction: async (transaction: Transaction) => {
    try {
      const transactions = storageService.getTransactions();
      transactions.unshift(transaction); 
      
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
      
      // Atomic update of both keys
      safeSet(KEYS.ITEMS, items);
      safeSet(KEYS.TRANSACTIONS, transactions);
    } catch (error) {
      console.error("Failed to save transaction", error);
      throw error;
    }
  },

  updateTransaction: (oldTx: Transaction, newTx: Transaction) => {
    try {
      const items = storageService.getItems();
      
      // 1. Revert Old Impact
      oldTx.items.forEach(tItem => {
        const itemIndex = items.findIndex(i => i.id === tItem.itemId);
        if (itemIndex >= 0) {
          if (oldTx.type === 'inbound') items[itemIndex].stock -= tItem.qty;
          else items[itemIndex].stock += tItem.qty;
        }
      });

      // 2. Apply New Impact
      newTx.items.forEach(tItem => {
        const itemIndex = items.findIndex(i => i.id === tItem.itemId);
        if (itemIndex >= 0) {
          if (newTx.type === 'inbound') items[itemIndex].stock += tItem.qty;
          else items[itemIndex].stock -= tItem.qty;
        }
      });

      // 3. Update Records
      const transactions = storageService.getTransactions();
      const txIndex = transactions.findIndex(t => t.id === oldTx.id);
      if (txIndex >= 0) {
          transactions[txIndex] = newTx;
          safeSet(KEYS.ITEMS, items);
          safeSet(KEYS.TRANSACTIONS, transactions);
      }
    } catch (error) {
      throw error;
    }
  },

  deleteTransaction: (id: string) => {
    try {
      const transactions = storageService.getTransactions();
      const tx = transactions.find(t => t.id === id);
      if (!tx) return;

      const items = storageService.getItems();
      tx.items.forEach(tItem => {
        const itemIndex = items.findIndex(i => i.id === tItem.itemId);
        if (itemIndex >= 0) {
          if (tx.type === 'inbound') {
            items[itemIndex].stock -= tItem.qty;
          } else {
            items[itemIndex].stock += tItem.qty;
          }
        }
      });

      const filteredTx = transactions.filter(t => t.id !== id);
      safeSet(KEYS.ITEMS, items);
      safeSet(KEYS.TRANSACTIONS, filteredTx);
    } catch (error) {
      throw error;
    }
  },

  // --- Reject Transactions (Independent Logs) ---
  getRejectTransactions: (): RejectTransaction[] => {
    return safeGet(KEYS.REJECTS) || [];
  },

  saveRejectTransaction: (transaction: RejectTransaction) => {
    try {
      const rejects = storageService.getRejectTransactions();
      rejects.unshift(transaction);
      safeSet(KEYS.REJECTS, rejects);
    } catch (e) {
      throw e;
    }
  },

  // --- Stats ---
  getStats: (): DashboardStats => {
    try {
      const items = storageService.getItems();
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
