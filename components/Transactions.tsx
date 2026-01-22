
import React, { useState, useEffect, useRef } from 'react';
import { InventoryItem, Transaction, TransactionItem, User } from '../types';
import { storageService } from '../services/storageService';
import { Plus, Trash, ShoppingCart, Upload, Search, AlertCircle, FileSpreadsheet, Calendar, Download, ArrowDownCircle, ArrowUpCircle, Loader2 } from 'lucide-react';
import { ToastType } from './Toast';
import * as XLSX from 'xlsx';

interface TransactionsProps {
  items: InventoryItem[];
  user: User;
  onSuccess: () => void;
  notify: (msg: string, type: ToastType) => void;
}

export const Transactions: React.FC<TransactionsProps> = ({ items, user, onSuccess, notify }) => {
  const [type, setType] = useState<'inbound' | 'outbound'>('outbound');
  const [cart, setCart] = useState<TransactionItem[]>([]);
  
  const [itemSearch, setItemSearch] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);

  const [qty, setQty] = useState<number | ''>('');
  const [selectedUOM, setSelectedUOM] = useState(''); 
  const [customDate, setCustomDate] = useState(new Date().toISOString().slice(0, 10));

  const [supplier, setSupplier] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [deliveryNote, setDeliveryNote] = useState('');
  const [documentImage, setDocumentImage] = useState<string | null>(null);

  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
            setShowDropdown(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedItemData = items.find(i => i.id === selectedItemId);

  const filteredItems = items.filter(i => 
    i.active && (
      i.name.toLowerCase().includes(itemSearch.toLowerCase()) || 
      i.sku.toLowerCase().includes(itemSearch.toLowerCase())
    )
  );

  const getConversionFactor = (item: InventoryItem, uom: string) => {
      if (uom === item.unit) return 1;
      if (item.unit2 && uom === item.unit2 && item.ratio2) {
          return item.op2 === 'divide' ? (1 / item.ratio2) : item.ratio2;
      }
      if (item.unit3 && uom === item.unit3 && item.ratio3) {
           return item.op3 === 'divide' ? (1 / item.ratio3) : item.ratio3;
      }
      return 1;
  };

  const handleSelectItem = (item: InventoryItem) => {
      setSelectedItemId(item.id);
      setItemSearch(item.name);
      setSelectedUOM(item.unit);
      setShowDropdown(false);
      setTimeout(() => qtyInputRef.current?.focus(), 100);
  };

  const addToCart = () => {
    if (!selectedItemData || qty === '' || qty <= 0) return;
    
    const conversionRatio = getConversionFactor(selectedItemData, selectedUOM);
    const actualQtyToDeduct = parseFloat((qty * conversionRatio).toFixed(2));
    
    if (type === 'outbound' && actualQtyToDeduct > selectedItemData.stock) {
      notify("Stok tidak mencukupi", 'error');
      return;
    }
    
    const unitPricePerUOM = selectedItemData.price * conversionRatio;
    
    setCart([...cart, {
      itemId: selectedItemData.id,
      sku: selectedItemData.sku,
      name: selectedItemData.name,
      qty: actualQtyToDeduct,
      uom: selectedUOM,
      unitPrice: unitPricePerUOM,
      total: qty * unitPricePerUOM
    }]);

    setQty('');
    setSelectedItemId('');
    setItemSearch('');
    setSelectedUOM('');
    notify('Item ditambahkan ke batch', 'info');
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  // --- LOGIKA BULK IMPORT BARU ---
  const handleBulkImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        if (data.length === 0) {
            notify("File kosong!", "warning");
            return;
        }

        setIsImporting(true);

        // 1. Aggregasi Data berdasarkan SKU (Case Insensitive)
        const aggregated: Record<string, { sku: string, name: string, qty: number, price: number }> = {};
        
        data.forEach(row => {
            const rawSku = String(row.SKU || row.sku || '').trim();
            if (!rawSku) return;
            
            const sku = rawSku.toUpperCase();
            const qty = Number(row.Qty || row.qty || row.Jumlah || 0);
            const name = String(row.Name || row.Nama || row.name || sku);
            const price = Number(row.Price || row.Harga || row.price || 0);

            if (aggregated[sku]) {
                aggregated[sku].qty += qty;
            } else {
                aggregated[sku] = { sku, name, qty, price };
            }
        });

        const newItemsInCart: TransactionItem[] = [];
        const uniqueSkus = Object.values(aggregated);

        // 2. Loop & Sync dengan Inventory
        for (const item of uniqueSkus) {
            let inventoryItem = items.find(i => i.sku.toUpperCase() === item.sku);

            // Jika item belum ada di inventory, buat otomatis
            if (!inventoryItem) {
                const newId = crypto.randomUUID();
                const newItem: InventoryItem = {
                    id: newId,
                    sku: item.sku,
                    name: item.name,
                    category: 'Imported',
                    price: item.price || 0,
                    location: 'A-01',
                    unit: 'Pcs',
                    stock: 0, // Awal 0, nanti ditambah oleh transaksi inbound/outbound
                    minLevel: 0,
                    active: true
                };
                await storageService.saveItem(newItem);
                inventoryItem = newItem;
            }

            const conversionRatio = 1; // Default Pcs jika import massal
            const unitPrice = inventoryItem.price || item.price;

            newItemsInCart.push({
                itemId: inventoryItem.id,
                sku: inventoryItem.sku,
                name: inventoryItem.name,
                qty: item.qty, // Base unit
                uom: inventoryItem.unit,
                unitPrice: unitPrice,
                total: item.qty * unitPrice
            });
        }

        setCart(prev => [...prev, ...newItemsInCart]);
        notify(`${uniqueSkus.length} tipe barang berhasil dimuat ke Cart.`, 'success');
        onSuccess(); // Refresh inventory list agar SKU baru terdeteksi
      } catch (err) {
        console.error(err);
        notify("Gagal memproses file Excel", "error");
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleSubmit = async () => {
    if (cart.length === 0) return;
    
    const transaction: Transaction = {
      id: storageService.generateTransactionId(),
      type,
      date: new Date(customDate).toISOString(),
      items: cart,
      totalValue: cart.reduce((acc, curr) => acc + curr.total, 0),
      userId: user.id,
      supplier, poNumber, deliveryNote,
      documents: documentImage ? [documentImage] : []
    };

    try {
        await storageService.saveTransaction(transaction);
        onSuccess();
        setCart([]);
        setSupplier(''); setPoNumber(''); setDeliveryNote('');
        setDocumentImage(null);
        notify(`Transaksi ${transaction.id} berhasil`, 'success');
    } catch (e) { notify("Gagal menyimpan transaksi", 'error'); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-soft border border-ice-100 dark:border-gray-700">
          
          <div className="grid grid-cols-2 gap-6 mb-8">
            <button onClick={() => { setType('inbound'); setCart([]); }} className={`rounded-2xl p-6 flex flex-col items-center gap-3 transition-all border ${type === 'inbound' ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-transparent text-slate-400'}`}>
                <ArrowDownCircle size={32} />
                <span className="text-sm font-bold uppercase">Masuk (Inbound)</span>
            </button>
            <button onClick={() => { setType('outbound'); setCart([]); }} className={`rounded-2xl p-6 flex flex-col items-center gap-3 transition-all border ${type === 'outbound' ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-transparent text-slate-400'}`}>
                <ArrowUpCircle size={32} />
                <span className="text-sm font-bold uppercase">Keluar (Outbound)</span>
            </button>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-gray-900 rounded-2xl">
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Pilih Barang</label>
                  <div className="relative" ref={dropdownRef}>
                      <input 
                        ref={searchInputRef}
                        type="text"
                        className="w-full pl-4 pr-4 py-3 border border-ice-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-300"
                        value={itemSearch}
                        onChange={(e) => { setItemSearch(e.target.value); setShowDropdown(true); }}
                        onFocus={() => setShowDropdown(true)}
                        placeholder="Cari Nama/SKU..."
                      />
                      {showDropdown && itemSearch && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto border border-ice-100">
                            {filteredItems.map(item => (
                                <div key={item.id} onClick={() => handleSelectItem(item)} className="p-3 hover:bg-indigo-50 dark:hover:bg-gray-700 cursor-pointer border-b border-ice-50 last:border-0">
                                    <p className="font-bold text-sm dark:text-white">{item.name}</p>
                                    <p className="text-xs text-slate-400">{item.sku} | Stok: {item.stock} {item.unit}</p>
                                </div>
                            ))}
                        </div>
                      )}
                  </div>
                </div>

                <div className="w-full">
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Satuan</label>
                  <select 
                      className="w-full p-3 border border-ice-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 dark:text-white outline-none"
                      value={selectedUOM}
                      onChange={(e) => setSelectedUOM(e.target.value)}
                      disabled={!selectedItemId}
                  >
                      {selectedItemData && (
                          <>
                              <option value={selectedItemData.unit}>{selectedItemData.unit} (Base)</option>
                              {selectedItemData.unit2 && <option value={selectedItemData.unit2}>{selectedItemData.unit2}</option>}
                              {selectedItemData.unit3 && <option value={selectedItemData.unit3}>{selectedItemData.unit3}</option>}
                          </>
                      )}
                  </select>
                </div>

                <div className="w-full">
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Jumlah</label>
                  <input 
                    ref={qtyInputRef}
                    type="number" 
                    value={qty} 
                    onChange={(e) => setQty(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="w-full p-3 border border-ice-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-300"
                    placeholder="0"
                  />
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-3">
                <button onClick={addToCart} disabled={!selectedItemId || !qty} className="flex-1 py-4 bg-slate-800 text-white font-bold rounded-2xl hover:bg-slate-900 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50">
                    <Plus size={18} /> Tambah ke Batch
                </button>
                
                <div className="relative flex-1">
                    <input type="file" accept=".xlsx, .xls" onChange={handleBulkImport} className="absolute inset-0 opacity-0 cursor-pointer" />
                    <button disabled={isImporting} className="w-full py-4 bg-white dark:bg-gray-700 text-slate-600 dark:text-white border border-ice-200 dark:border-gray-600 font-bold rounded-2xl hover:bg-ice-50 dark:hover:bg-gray-600 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50">
                        {isImporting ? <Loader2 className="animate-spin" size={18} /> : <FileSpreadsheet size={18} />} Import Excel
                    </button>
                </div>
            </div>
          </div>
        </div>

        {/* Extra Information (Suppliers, Notes, etc) */}
        <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-soft border border-ice-100 dark:border-gray-700">
            <h4 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-6 flex items-center gap-2">
                <FileSpreadsheet size={16} className="text-indigo-500"/> Informasi Tambahan
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Supplier / Client</label>
                        <input value={supplier} onChange={e => setSupplier(e.target.value)} className="w-full p-3 border border-ice-100 dark:border-gray-700 rounded-xl bg-ice-50/30 dark:bg-gray-900 dark:text-white outline-none" placeholder="Nama perusahaan..." />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Nomor PO / Surat Jalan</label>
                        <input value={poNumber} onChange={e => setPoNumber(e.target.value)} className="w-full p-3 border border-ice-100 dark:border-gray-700 rounded-xl bg-ice-50/30 dark:bg-gray-900 dark:text-white outline-none" placeholder="PO-XXXXX" />
                    </div>
                </div>
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Tanggal Transaksi</label>
                    <input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)} className="w-full p-3 border border-ice-100 dark:border-gray-700 rounded-xl bg-ice-50/30 dark:bg-gray-900 dark:text-white outline-none" />
                </div>
            </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-soft border border-ice-100 dark:border-gray-700 flex flex-col h-[calc(100vh-140px)]">
        <div className="p-6 border-b border-ice-100 flex items-center gap-2">
            <ShoppingCart size={20} className="text-indigo-600" />
            <h3 className="font-bold dark:text-white text-lg">Batch Cart</h3>
        </div>
        
        <div className="flex-1 overflow-y-auto">
            {cart.map((item, idx) => (
                <div key={idx} className="p-4 border-b border-ice-50 dark:border-gray-700 flex justify-between items-center hover:bg-slate-50">
                    <div>
                        <p className="font-bold text-sm dark:text-white">{item.name}</p>
                        <p className="text-[10px] text-slate-400">{item.sku} | {item.qty} {item.uom}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="font-bold text-sm text-indigo-600">Rp {item.total.toLocaleString()}</span>
                        <button onClick={() => removeFromCart(idx)} className="text-slate-300 hover:text-rose-500"><Trash size={16} /></button>
                    </div>
                </div>
            ))}
            {cart.length === 0 && (
                <div className="p-10 text-center space-y-3 opacity-40">
                    <ShoppingCart size={48} className="mx-auto text-slate-300" />
                    <p className="text-xs font-bold text-slate-400 uppercase">Keranjang Kosong</p>
                </div>
            )}
        </div>

        <div className="p-6 bg-slate-50 dark:bg-gray-900">
            <div className="flex justify-between mb-4">
                <span className="font-bold text-slate-500">Total Transaksi</span>
                <span className="font-black text-xl dark:text-white">Rp {cart.reduce((a, b) => a + b.total, 0).toLocaleString()}</span>
            </div>
            <button onClick={handleSubmit} disabled={cart.length === 0} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl hover:bg-indigo-700 transition-all disabled:opacity-50">
                Proses Transaksi Sekarang
            </button>
        </div>
      </div>
    </div>
  );
};
