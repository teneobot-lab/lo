
export type Role = 'admin' | 'staff' | 'viewer';

export interface User {
  id: string;
  username: string;
  role: Role;
  name: string;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  location: string;
  unit: string;
  stock: number;
  minLevel: number;
  imageUrl?: string;
  active: boolean;
  conversionRatio?: number; // e.g. 10 (1 Box = 10 Pcs)
  conversionUnit?: string; // e.g. "Box"
}

export interface TransactionItem {
  itemId: string;
  sku: string;
  name: string;
  qty: number; // The actual quantity deducted from stock (Base Unit)
  uom: string; // The unit selected during transaction (e.g., "Box" or "Pcs")
  unitPrice: number; // Price per UOM
  total: number;
}

export interface Transaction {
  id: string;
  type: 'inbound' | 'outbound';
  date: string; // ISO string
  items: TransactionItem[];
  totalValue: number;
  // Specific to Inbound
  supplier?: string;
  poNumber?: string;
  deliveryNote?: string; // Surat Jalan
  documents?: string[]; // Base64 images
  // System
  userId: string;
  notes?: string;
}

export interface DashboardStats {
  totalValue: number;
  totalUnits: number;
  lowStockCount: number;
  skuCount: number;
}

// --- Reject Module Types ---

export interface RejectItem {
  id: string;
  sku: string;
  name: string;
  baseUnit: string;
  unit2?: string;
  ratio2?: number;
  unit3?: string;
  ratio3?: number;
  lastUpdated: string;
}

export interface RejectItemDetail {
  itemId: string;
  itemName: string;
  sku: string;
  baseUnit: string;
  quantity: number;
  unit: string;
  ratio: number;
  totalBaseQuantity: number;
  reason: string;
  unit2?: string;
  ratio2?: number;
  unit3?: string;
  ratio3?: number;
}

export interface RejectLog {
  id: string;
  date: string;
  items: RejectItemDetail[];
  notes: string;
  timestamp: string;
}
