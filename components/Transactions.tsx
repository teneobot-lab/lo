
import React, { useState, useEffect, useRef } from 'react';
import { InventoryItem, Transaction, TransactionItem, User } from '../types';
import { storageService } from '../services/storageService';
import { Plus, Trash, ShoppingCart, Upload, Search, AlertCircle, FileSpreadsheet, Calendar, Download, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
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

  const selectedItemData = items.find(i => i.id === selectedItemId);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
            setShowDropdown(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredItems = items.filter(i => 
    i.active && (
      i.name.toLowerCase().includes(itemSearch.toLowerCase()) || 
      i.sku.toLowerCase().includes(itemSearch.toLowerCase())
    )
  );

  const getConversionFactor = (item: InventoryItem, uom: string) => {
      if (uom === item.unit) return 1;
      
      // Unit 2
      if (item.unit2 && uom === item.unit2 && item.ratio2) {
          return item.op2 === 'divide' ? (1 / item.ratio2) : item.ratio2;
      }
      
      // Unit 3
      if (item.unit3 && uom === item.unit3 && item.ratio3) {
           return item.op3 === 'divide' ? (1 / item.ratio3) : item.ratio3;
      }

      // Legacy fallback
      if (item.conversionUnit && uom === item.conversionUnit && item.conversionRatio) {
          return item.conversionRatio;
      }
      
      return 1;
  };

  const conversionRatio = selectedItemData ? getConversionFactor(selectedItemData, selectedUOM) : 1;
  const currentQty = qty === '' ? 0 : qty;
  const actualQtyToDeduct = parseFloat((currentQty * conversionRatio).toFixed(2));
  const isStockInsufficient = type === 'outbound' && selectedItemData && actualQtyToDeduct > selectedItemData.stock;

  const handleSelectItem = (item: InventoryItem) => {
      setSelectedItemId(item.id);
      setItemSearch(item.name);
      setSelectedUOM(item.unit);
      setShowDropdown(false);
      setTimeout(() => qtyInputRef.current?.focus(), 100);
  };

  const addToCart = () => {
    if (!selectedItemData || qty === '' || qty <= 0) return;
    if (isStockInsufficient) {
      notify("Stok tidak mencukupi", 'error');
      return;
    }
    
    // Total price is calculated based on Base Price * Ratio
    const unitPricePerUOM = selectedItemData.price * conversionRatio;
    
    setCart([...cart, {
      itemId: selectedItemData.id,
      sku: selectedItemData.sku,
      name: selectedItemData.name,
      qty: actualQtyToDeduct, // This is always converted to base unit for DB consistency
      uom: selectedUOM,
      unitPrice: unitPricePerUOM,
      total: currentQty * unitPricePerUOM
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
                    className={`w-full p-3 border rounded-xl outline-none ${isStockInsufficient ? 'border-rose-400 bg-rose-50' : 'border-ice-200'}`}
                    placeholder="0"
                  />
                </div>
            </div>

            {isStockInsufficient && (
                <div className="p-3 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold flex items-center gap-2 border border-rose-100">
                    <AlertCircle size={14} /> Stok tidak cukup. Anda butuh {actualQtyToDeduct} {selectedItemData?.unit}.
                </div>
            )}

            <button onClick={addToCart} disabled={!selectedItemId || isStockInsufficient || !qty} className="w-full py-4 bg-slate-800 text-white font-bold rounded-2xl hover:bg-slate-900 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50">
                <Plus size={18} /> Tambah ke Batch
            </button>
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
                        <p className="text-[10px] text-slate-400">{item.sku} | {item.qty} Base Unit</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="font-bold text-sm text-indigo-600">Rp {item.total.toLocaleString()}</span>
                        <button onClick={() => removeFromCart(idx)} className="text-slate-300 hover:text-rose-500"><Trash size={16} /></button>
                    </div>
                </div>
            ))}
        </div>

        <div className="p-6 bg-slate-50 dark:bg-gray-900">
            <div className="flex justify-between mb-4">
                <span className="font-bold text-slate-500">Total</span>
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
