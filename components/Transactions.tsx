
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { InventoryItem, Transaction, TransactionItem, User } from '../types';
import { storageService } from '../services/storageService';
import { Plus, Trash, ShoppingCart, Upload, Search, AlertCircle, FileSpreadsheet, Calendar, Download, ArrowDownCircle, ArrowUpCircle, Loader2, Camera, X, FileText, Image as ImageIcon } from 'lucide-react';
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
  const [notes, setNotes] = useState('');
  const [documentImages, setDocumentImages] = useState<string[]>([]);

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

  // Helper untuk mendapatkan rasio konversi berdasarkan UOM yang dipilih
  const getConversionFactor = (item: InventoryItem, uom: string) => {
      if (!item || uom === item.unit) return 1;
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
    
    // Simpan Base Price agar perhitungan total tetap konsisten di DB
    const basePrice = selectedItemData.price;
    const totalRow = parseFloat((actualQtyToDeduct * basePrice).toFixed(2));
    
    setCart([...cart, {
      itemId: selectedItemData.id,
      sku: selectedItemData.sku,
      name: selectedItemData.name,
      qty: actualQtyToDeduct, // Disimpan dalam Base Unit (Pcs/Btl) agar stok otomatis
      uom: selectedUOM,
      unitPrice: basePrice,
      total: totalRow
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

  const downloadTransactionTemplate = () => {
      const header = ["SKU", "Nama Barang", "QTY", "Unit"];
      const data = [
          ["BRW-001", "Contoh Barang A", 1, "DUS"],
          ["BRW-002", "Contoh Barang B", 10, "Pcs"]
      ];
      const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Template");
      XLSX.writeFile(wb, "Nexus_Template_Transaksi.xlsx");
      notify("Template terbaru diunduh", "success");
  };

  const handleBulkImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const dataBuffer = evt.target?.result as ArrayBuffer;
        if (!dataBuffer) return;
        
        const wb = XLSX.read(dataBuffer, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any[][];
        if (rawRows.length === 0) return;

        setIsImporting(true);
        const keywords = {
            sku: ['sku', 'kode', 'kd'],
            name: ['nama', 'name', 'item'],
            qty: ['qty', 'jumlah', 'quantity'],
            unit: ['unit', 'satuan', 'uom']
        };

        let headerIdx = 0;
        let mapping = { sku: 0, name: 1, qty: 2, unit: 3 }; 

        for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
            const row = rawRows[i].map(c => String(c).toLowerCase());
            if (row.some(c => keywords.sku.some(k => c.includes(k))) || row.some(c => keywords.qty.some(k => c.includes(k)))) {
                headerIdx = i;
                mapping.sku = row.findIndex(c => keywords.sku.some(k => c.includes(k)));
                mapping.name = row.findIndex(c => keywords.name.some(k => c.includes(k)));
                mapping.qty = row.findIndex(c => keywords.qty.some(k => c.includes(k)));
                mapping.unit = row.findIndex(c => keywords.unit.some(k => c.includes(k)));
                break;
            }
        }

        const newItemsInCart: TransactionItem[] = [];
        const currentItems = await storageService.getItems();

        for (let i = headerIdx + 1; i < rawRows.length; i++) {
            const row = rawRows[i];
            const sku = String(row[mapping.sku] || '').trim().toUpperCase();
            if (!sku) continue;

            const qtyVal = Number(String(row[mapping.qty] || '0').replace(/[^0-9.-]+/g, ""));
            const unit = String(row[mapping.unit] || '').trim();

            const inventoryItem = currentItems.find(item => item.sku.toUpperCase() === sku);
            if (inventoryItem) {
                const ratio = getConversionFactor(inventoryItem, unit || inventoryItem.unit);
                const baseQty = qtyVal * ratio;
                
                newItemsInCart.push({
                    itemId: inventoryItem.id,
                    sku: inventoryItem.sku,
                    name: inventoryItem.name,
                    qty: baseQty,
                    uom: unit || inventoryItem.unit,
                    unitPrice: inventoryItem.price,
                    total: baseQty * inventoryItem.price
                });
            }
        }

        if (newItemsInCart.length > 0) {
            setCart(prev => [...prev, ...newItemsInCart]);
            notify(`${newItemsInCart.length} item masuk batch.`, 'success');
        }
      } catch (err) {
        notify("Gagal membaca Excel!", "error");
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsArrayBuffer(file as any);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;
      Array.from(files).forEach(file => {
          const reader = new FileReader();
          reader.onload = (evt) => setDocumentImages(prev => [...prev, evt.target?.result as string]);
          reader.readAsDataURL(file);
      });
  };

  const removePhoto = (index: number) => setDocumentImages(prev => prev.filter((_, i) => i !== index));

  const handleSubmit = async () => {
    if (cart.length === 0) return;
    const now = new Date();
    const mysqlDate = `${customDate} ${now.toTimeString().split(' ')[0]}`;

    const transaction: Transaction = {
      id: storageService.generateTransactionId(),
      type,
      date: mysqlDate,
      items: cart,
      totalValue: cart.reduce((acc, curr) => acc + curr.total, 0),
      userId: user.id || 'admin',
      supplier, poNumber, deliveryNote, notes,
      documents: documentImages
    };

    try {
        await storageService.saveTransaction(transaction);
        onSuccess();
        setCart([]);
        setSupplier(''); setPoNumber(''); setDeliveryNote(''); setNotes(''); setDocumentImages([]);
        notify(`Transaksi ${transaction.id} berhasil`, 'success');
    } catch (e) { notify("Gagal menyimpan transaksi", 'error'); }
  };

  // Helper untuk menampilkan Qty yang sesuai dengan UOM di Cart UI
  const getDisplayQty = (tItem: TransactionItem) => {
      const master = items.find(i => i.id === tItem.itemId);
      if (!master) return tItem.qty;
      const ratio = getConversionFactor(master, tItem.uom);
      return parseFloat((tItem.qty / ratio).toFixed(2));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-soft border border-ice-100 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-6 mb-8">
            <button onClick={() => { setType('inbound'); setCart([]); }} className={`rounded-2xl p-6 flex flex-col items-center gap-3 transition-all border ${type === 'inbound' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-transparent text-slate-400'}`}>
                <ArrowDownCircle size={32} />
                <span className="text-sm font-bold uppercase tracking-widest">Masuk (Inbound)</span>
            </button>
            <button onClick={() => { setType('outbound'); setCart([]); }} className={`rounded-2xl p-6 flex flex-col items-center gap-3 transition-all border ${type === 'outbound' ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-slate-50 border-transparent text-slate-400'}`}>
                <ArrowUpCircle size={32} />
                <span className="text-sm font-bold uppercase tracking-widest">Keluar (Outbound)</span>
            </button>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-gray-900/50 rounded-2xl border border-ice-100 dark:border-gray-700">
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Pilih Barang</label>
                  <div className="relative" ref={dropdownRef}>
                      <input 
                        ref={searchInputRef}
                        type="text"
                        className="w-full pl-4 pr-4 py-3 border border-ice-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-300 transition-all"
                        value={itemSearch}
                        onChange={(e) => { setItemSearch(e.target.value); setShowDropdown(true); }}
                        onFocus={() => setShowDropdown(true)}
                        placeholder="Cari Nama/SKU..."
                      />
                      {showDropdown && itemSearch && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto border border-ice-100 dark:border-gray-700">
                            {filteredItems.map(item => (
                                <div key={item.id} onClick={() => handleSelectItem(item)} className="p-3 hover:bg-indigo-50 dark:hover:bg-gray-700 cursor-pointer border-b border-ice-50 dark:border-gray-700 last:border-0">
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
                  <select className="w-full p-3 border border-ice-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 dark:text-white appearance-none" value={selectedUOM} onChange={(e) => setSelectedUOM(e.target.value)} disabled={!selectedItemData}>
                      {selectedItemData && (
                          <>
                              <option value={selectedItemData.unit}>{selectedItemData.unit}</option>
                              {selectedItemData.unit2 && <option value={selectedItemData.unit2}>{selectedItemData.unit2}</option>}
                              {selectedItemData.unit3 && <option value={selectedItemData.unit3}>{selectedItemData.unit3}</option>}
                          </>
                      )}
                  </select>
                </div>
                <div className="w-full">
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Jumlah</label>
                  <input ref={qtyInputRef} type="number" value={qty} onChange={(e) => setQty(e.target.value === '' ? '' : parseFloat(e.target.value))} className="w-full p-3 border border-ice-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-300 dark:bg-gray-900 dark:text-white" placeholder="0" />
                </div>
            </div>
            <div className="flex flex-col md:flex-row gap-3">
                <button onClick={addToCart} disabled={!selectedItemId || !qty} className="flex-1 py-4 bg-slate-800 dark:bg-slate-700 text-white font-bold rounded-2xl hover:bg-slate-900 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"><Plus size={18} /> Tambah ke Batch</button>
                <div className="flex gap-2 flex-1">
                    <button onClick={downloadTransactionTemplate} className="p-4 bg-white dark:bg-gray-800 border border-ice-200 dark:border-gray-700 text-slate-400 hover:text-indigo-600 rounded-2xl shadow-sm transition-all"><Download size={20} /></button>
                    <div className="relative flex-1">
                        <input type="file" accept=".xlsx, .xls" onChange={handleBulkImport} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                        <button disabled={isImporting} className="w-full h-full bg-white dark:bg-gray-700 text-slate-600 dark:text-white border border-ice-200 dark:border-gray-700 font-bold rounded-2xl hover:bg-ice-50 dark:hover:bg-gray-700 transition-all flex items-center justify-center gap-2 shadow-sm">{isImporting ? <Loader2 className="animate-spin" size={18} /> : <FileSpreadsheet size={18} />} Import Excel</button>
                    </div>
                </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-soft border border-ice-100 dark:border-gray-700 space-y-8">
            <h4 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2"><FileText size={16} className="text-indigo-500"/> Informasi Detail</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-5">
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Supplier / Client</label><input value={supplier} onChange={e => setSupplier(e.target.value)} className="w-full p-3 border border-ice-100 dark:border-gray-700 rounded-xl bg-ice-50/30 dark:bg-gray-900 dark:text-white" placeholder="Nama perusahaan..." /></div>
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Nomor PO / Surat Jalan</label><input value={poNumber} onChange={e => setPoNumber(e.target.value)} className="w-full p-3 border border-ice-100 dark:border-gray-700 rounded-xl bg-ice-50/30 dark:bg-gray-900 dark:text-white" placeholder="PO-XXXXX" /></div>
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Keterangan / Catatan</label><textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full p-3 border border-ice-100 dark:border-gray-700 rounded-xl bg-ice-50/30 dark:bg-gray-900 dark:text-white h-24 resize-none" placeholder="Catatan..."></textarea></div>
                </div>
                <div className="space-y-5">
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Tanggal Transaksi</label><div className="relative"><Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)} className="w-full pl-10 pr-3 py-3 border border-ice-100 dark:border-gray-700 rounded-xl bg-ice-50/30 dark:bg-gray-900 dark:text-white" /></div></div>
                    {type === 'inbound' && (
                        <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Dokumentasi</label><div className="grid grid-cols-3 gap-2">{documentImages.map((img, idx) => (<div key={idx} className="relative aspect-square rounded-xl overflow-hidden border-2 border-indigo-100 group"><img src={img} className="w-full h-full object-cover" alt="Doc" /><button onClick={() => removePhoto(idx)} className="absolute top-1 right-1 p-1 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100"><X size={12} /></button></div>))}<label className="aspect-square rounded-xl border-2 border-dashed border-ice-200 flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-ice-50 transition-all text-slate-400"><Camera size={20} /><span className="text-[8px] font-bold uppercase">Upload</span><input type="file" multiple accept="image/*" onChange={handlePhotoUpload} className="hidden" /></label></div></div>
                    )}
                </div>
            </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-soft border border-ice-100 dark:border-gray-700 flex flex-col h-[calc(100vh-140px)]">
        <div className="p-6 border-b border-ice-100 dark:border-gray-700 flex items-center justify-between"><div className="flex items-center gap-2"><ShoppingCart size={20} className="text-indigo-600" /><h3 className="font-bold dark:text-white text-lg">Batch Cart</h3></div><span className="text-[10px] font-bold bg-ice-100 dark:bg-gray-700 text-indigo-600 px-2 py-1 rounded-full">{cart.length} Items</span></div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
            {cart.map((item, idx) => (
                <div key={idx} className="p-4 border-b border-ice-50 dark:border-gray-700 flex justify-between items-center hover:bg-ice-50/50 dark:hover:bg-gray-700/50 transition-colors group">
                    <div>
                        <p className="font-bold text-sm dark:text-white">{item.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{item.sku} | <span className="text-indigo-500">{getDisplayQty(item)} {item.uom}</span></p>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="font-bold text-sm text-slate-700 dark:text-gray-200">Rp {item.total.toLocaleString()}</span>
                        <button onClick={() => removeFromCart(idx)} className="text-slate-300 hover:text-rose-500 p-1 rounded-lg hover:bg-rose-50 transition-all"><Trash size={16} /></button>
                    </div>
                </div>
            ))}
        </div>
        <div className="p-6 bg-slate-50 dark:bg-gray-900/50 border-t border-ice-100 dark:border-gray-700 rounded-b-3xl">
            <div className="flex justify-between items-end mb-6"><span className="text-xs font-bold text-slate-400 uppercase">Estimasi Total</span><span className="font-black text-2xl dark:text-white tracking-tight">Rp {cart.reduce((a, b) => a + b.total, 0).toLocaleString()}</span></div>
            <button onClick={handleSubmit} disabled={cart.length === 0} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"><ImageIcon size={18} /> Proses Transaksi</button>
        </div>
      </div>
    </div>
  );
};
