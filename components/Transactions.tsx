
import React, { useState, useEffect, useRef } from 'react';
import { InventoryItem, Transaction, TransactionItem, User } from '../types';
import { storageService } from '../services/storageService';
import { geminiService } from '../services/geminiService';
import { Plus, Trash, ShoppingCart, Upload, Search, FileSpreadsheet, Calendar, ArrowDownCircle, ArrowUpCircle, Loader2, Camera, X, FileText, Image as ImageIcon, ScanText } from 'lucide-react';
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
  const [activeIndex, setActiveIndex] = useState(-1);
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
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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
  const filteredItems = items.filter(i => i.active && (i.name.toLowerCase().includes(itemSearch.toLowerCase()) || i.sku.toLowerCase().includes(itemSearch.toLowerCase()))).slice(0, 10);

  const getConversionFactor = (item: InventoryItem, uom: string) => {
      if (!item || uom === item.unit) return 1;
      if (item.unit2 && uom === item.unit2 && item.ratio2) return item.op2 === 'divide' ? (1 / item.ratio2) : item.ratio2;
      if (item.unit3 && uom === item.unit3 && item.ratio3) return item.op3 === 'divide' ? (1 / item.ratio3) : item.ratio3;
      return 1;
  };

  const handleSelectItem = (item: InventoryItem) => {
      setSelectedItemId(item.id); setItemSearch(item.name); setSelectedUOM(item.unit); setShowDropdown(false); setActiveIndex(-1);
      setTimeout(() => qtyInputRef.current?.focus(), 100);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
      if (!showDropdown || filteredItems.length === 0) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(prev => (prev + 1) % filteredItems.length); } 
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length); } 
      else if (e.key === 'Enter' && activeIndex >= 0) { e.preventDefault(); handleSelectItem(filteredItems[activeIndex]); } 
      else if (e.key === 'Escape') { setShowDropdown(false); }
  };

  const addToCart = () => {
    if (!selectedItemData || qty === '' || qty <= 0) return;
    const conversionRatio = getConversionFactor(selectedItemData, selectedUOM);
    const actualQtyToDeduct = parseFloat((qty * conversionRatio).toFixed(2));
    if (type === 'outbound' && actualQtyToDeduct > selectedItemData.stock) { notify("Stok tidak mencukupi", 'error'); return; }
    
    setCart([...cart, { itemId: selectedItemData.id, sku: selectedItemData.sku, name: selectedItemData.name, qty: actualQtyToDeduct, uom: selectedUOM, unitPrice: selectedItemData.price, total: parseFloat((actualQtyToDeduct * selectedItemData.price).toFixed(2)) }]);
    setQty(''); setSelectedItemId(''); setItemSearch(''); setSelectedUOM(''); setActiveIndex(-1);
    notify('Item ditambahkan', 'info'); setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  const removeFromCart = (index: number) => setCart(cart.filter((_, i) => i !== index));

  const handleBulkImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const dataBuffer = evt.target?.result as ArrayBuffer; if (!dataBuffer) return;
        const wb = XLSX.read(dataBuffer, { type: 'array' }); const ws = wb.Sheets[wb.SheetNames[0]]; const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any[][];
        if (rawRows.length === 0) return;
        setIsImporting(true);
        // Simplified Logic for Import matching previous implementation
        const keywords = { sku: ['sku'], qty: ['qty', 'jumlah'], unit: ['unit', 'uom'] };
        let headerIdx = 0; let mapping = { sku: 0, qty: 2, unit: 3 }; 
        for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
            const row = rawRows[i].map(c => String(c).toLowerCase());
            if (row.some(c => keywords.sku.some(k => c.includes(k)))) { headerIdx = i; mapping.sku = row.findIndex(c => keywords.sku.some(k => c.includes(k))); mapping.qty = row.findIndex(c => keywords.qty.some(k => c.includes(k))); mapping.unit = row.findIndex(c => keywords.unit.some(k => c.includes(k))); break; }
        }
        const newItemsInCart: TransactionItem[] = []; const currentItems = await storageService.getItems();
        for (let i = headerIdx + 1; i < rawRows.length; i++) {
            const row = rawRows[i]; const sku = String(row[mapping.sku] || '').trim().toUpperCase(); if (!sku) continue;
            const qtyVal = Number(String(row[mapping.qty] || '0').replace(/[^0-9.-]+/g, "")); const unit = String(row[mapping.unit] || '').trim();
            const inventoryItem = currentItems.find(item => item.sku.toUpperCase() === sku);
            if (inventoryItem) {
                const ratio = getConversionFactor(inventoryItem, unit || inventoryItem.unit);
                const baseQty = qtyVal * ratio;
                newItemsInCart.push({ itemId: inventoryItem.id, sku: inventoryItem.sku, name: inventoryItem.name, qty: baseQty, uom: unit || inventoryItem.unit, unitPrice: inventoryItem.price, total: baseQty * inventoryItem.price });
            }
        }
        if (newItemsInCart.length > 0) { setCart(prev => [...prev, ...newItemsInCart]); notify(`${newItemsInCart.length} item diimpor.`, 'success'); }
      } catch (err) { notify("Gagal membaca Excel!", "error"); } finally { setIsImporting(false); }
    };
    reader.readAsArrayBuffer(file as any);
  };

  const handlePdfImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type (basic check)
    if (!file.type.includes('pdf') && !file.type.includes('image')) {
        notify("Format file tidak didukung. Harap gunakan PDF atau Gambar.", 'warning');
        return;
    }

    setIsAnalyzing(true);
    try {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            const base64Str = (reader.result as string).split(',')[1];
            const mimeType = file.type;
            
            const data = await geminiService.parseTransactionDocument(base64Str, mimeType);
            
            if (data.supplier) setSupplier(data.supplier);
            if (data.poNumber) setPoNumber(data.poNumber);
            if (data.date) setCustomDate(data.date);
            
            if (data.items && Array.isArray(data.items)) {
                const newItems: TransactionItem[] = [];
                let matchedCount = 0;

                for (const importedItem of data.items) {
                    // Normalize for matching
                    const importSku = String(importedItem.sku || '').toUpperCase().trim();
                    const importName = String(importedItem.name || '').toLowerCase().trim();

                    // Try matching by SKU first, then Name
                    const existingItem = items.find(i => 
                        (importSku && i.sku.toUpperCase() === importSku) || 
                        (importName && i.name.toLowerCase().includes(importName))
                    );
                    
                    if (existingItem) {
                         const qtyVal = Number(importedItem.qty) || 0;
                         const unitPriceVal = Number(importedItem.unitPrice) || existingItem.price;
                         const uomVal = importedItem.uom || existingItem.unit;
                         
                         // Simple conversion check if uom matches a known alternate unit
                         const ratio = getConversionFactor(existingItem, uomVal);
                         const baseQty = qtyVal * ratio;

                         newItems.push({
                             itemId: existingItem.id,
                             sku: existingItem.sku,
                             name: existingItem.name,
                             qty: baseQty,
                             uom: uomVal,
                             unitPrice: unitPriceVal,
                             total: baseQty * unitPriceVal 
                         });
                         matchedCount++;
                    }
                }

                if (newItems.length > 0) {
                    setCart(prev => [...prev, ...newItems]);
                    notify(`Berhasil import ${matchedCount} item dari dokumen.`, 'success');
                } else {
                    notify("Dokumen terbaca, namun tidak ada item yang cocok dengan Master Data.", 'warning');
                }
            } else {
                notify("Tidak dapat membaca daftar item dari dokumen.", 'warning');
            }
        };
    } catch (err: any) {
        notify("Gagal memproses dokumen: " + err.message, 'error');
    } finally {
        setIsAnalyzing(false);
        e.target.value = ''; // Reset input
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files; if (!files) return;
      Array.from(files).forEach((file: File) => { const reader = new FileReader(); reader.onload = (evt) => setDocumentImages(prev => [...prev, evt.target?.result as string]); reader.readAsDataURL(file); });
  };

  const handleSubmit = async () => {
    if (cart.length === 0) return;
    const transaction: Transaction = { id: storageService.generateTransactionId(), type, date: `${customDate} ${new Date().toTimeString().split(' ')[0]}`, items: cart, totalValue: cart.reduce((acc, curr) => acc + curr.total, 0), userId: user.id || 'admin', supplier, poNumber, deliveryNote, notes, documents: documentImages };
    try { await storageService.saveTransaction(transaction); onSuccess(); setCart([]); setSupplier(''); setPoNumber(''); setDeliveryNote(''); setNotes(''); setDocumentImages([]); notify(`Transaksi ${transaction.id} berhasil`, 'success'); } catch (e) { notify("Gagal menyimpan transaksi", 'error'); }
  };

  const getDisplayQty = (tItem: TransactionItem) => {
      const master = items.find(i => i.id === tItem.itemId); if (!master) return tItem.qty;
      const ratio = getConversionFactor(master, tItem.uom); return parseFloat((tItem.qty / ratio).toFixed(2));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-100px)]">
      {/* Left Panel: Entry Form */}
      <div className="lg:col-span-2 flex flex-col gap-4 overflow-y-auto pr-1">
        <div className="bg-white dark:bg-gray-800 p-6 rounded shadow-card border border-gray-200 dark:border-gray-700">
          {/* Transaction Type Tabs */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg mb-6">
            <button onClick={() => { setType('inbound'); setCart([]); }} className={`flex-1 py-2 rounded-md text-sm font-bold flex items-center justify-center gap-2 transition-all ${type === 'inbound' ? 'bg-white shadow text-corporate-600' : 'text-gray-500 hover:text-gray-700'}`}>
                <ArrowDownCircle size={16} /> Masuk (Inbound)
            </button>
            <button onClick={() => { setType('outbound'); setCart([]); }} className={`flex-1 py-2 rounded-md text-sm font-bold flex items-center justify-center gap-2 transition-all ${type === 'outbound' ? 'bg-white shadow text-red-600' : 'text-gray-500 hover:text-gray-700'}`}>
                <ArrowUpCircle size={16} /> Keluar (Outbound)
            </button>
          </div>

          {/* Quick Item Entry */}
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded border border-gray-200 dark:border-gray-600 mb-6">
            <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Input Barang</h4>
            <div className="flex flex-col md:flex-row gap-3 items-end">
                <div className="flex-1 w-full relative" ref={dropdownRef}>
                    <label className="text-xs font-bold text-gray-600 mb-1 block">Cari Produk</label>
                    <input ref={searchInputRef} type="text" className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-corporate-500 outline-none" value={itemSearch} onChange={(e) => { setItemSearch(e.target.value); setShowDropdown(true); setActiveIndex(-1); }} onFocus={() => setShowDropdown(true)} onKeyDown={handleSearchKeyDown} placeholder="Scan SKU / Nama..." />
                    {showDropdown && itemSearch && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 shadow-lg rounded z-50 max-h-48 overflow-y-auto">
                            {filteredItems.map((item, idx) => (
                                <div key={item.id} onMouseEnter={() => setActiveIndex(idx)} onClick={() => handleSelectItem(item)} className={`p-2 text-sm cursor-pointer border-b last:border-0 ${activeIndex === idx ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                                    <span className="font-bold text-gray-800">{item.name}</span> <span className="text-xs text-gray-500">({item.sku})</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="w-32">
                    <label className="text-xs font-bold text-gray-600 mb-1 block">Satuan</label>
                    <select className="w-full p-2 border border-gray-300 rounded text-sm bg-white" value={selectedUOM} onChange={(e) => setSelectedUOM(e.target.value)} disabled={!selectedItemData}>
                        {selectedItemData && (<><option value={selectedItemData.unit}>{selectedItemData.unit}</option>{selectedItemData.unit2 && <option value={selectedItemData.unit2}>{selectedItemData.unit2}</option>}{selectedItemData.unit3 && <option value={selectedItemData.unit3}>{selectedItemData.unit3}</option>}</>)}
                    </select>
                </div>
                <div className="w-24">
                    <label className="text-xs font-bold text-gray-600 mb-1 block">Qty</label>
                    <input ref={qtyInputRef} type="number" value={qty} onChange={(e) => setQty(e.target.value === '' ? '' : parseFloat(e.target.value))} onKeyDown={(e) => { if (e.key === 'Enter') addToCart(); }} className="w-full p-2 border border-gray-300 rounded text-sm font-bold" placeholder="0" />
                </div>
                <button onClick={addToCart} disabled={!selectedItemId || !qty} className="px-4 py-2 bg-corporate-600 text-white rounded font-bold text-sm hover:bg-corporate-700 disabled:opacity-50"><Plus size={18} /></button>
            </div>
          </div>

          {/* Header Info */}
          <div className="grid grid-cols-2 gap-4">
             <div><label className="text-xs font-bold text-gray-500 uppercase">Tanggal</label><input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)} className="w-full mt-1 p-2 border border-gray-300 rounded text-sm"/></div>
             <div><label className="text-xs font-bold text-gray-500 uppercase">Supplier / Customer</label><input value={supplier} onChange={e => setSupplier(e.target.value)} className="w-full mt-1 p-2 border border-gray-300 rounded text-sm" placeholder="Nama Pihak Terkait"/></div>
             <div><label className="text-xs font-bold text-gray-500 uppercase">No. Referensi (PO/SJ)</label><input value={poNumber} onChange={e => setPoNumber(e.target.value)} className="w-full mt-1 p-2 border border-gray-300 rounded text-sm" placeholder="Ref No."/></div>
             <div><label className="text-xs font-bold text-gray-500 uppercase">Catatan</label><input value={notes} onChange={e => setNotes(e.target.value)} className="w-full mt-1 p-2 border border-gray-300 rounded text-sm" placeholder="Keterangan"/></div>
          </div>
          
          <div className="mt-4 flex gap-2 flex-wrap">
             <div className="relative">
                <input type="file" accept=".xlsx, .xls" onChange={handleBulkImport} className="absolute inset-0 opacity-0 cursor-pointer" />
                <button disabled={isImporting} className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                    {isImporting ? <Loader2 size={14} className="animate-spin"/> : <FileSpreadsheet size={14}/>} Import Excel
                </button>
             </div>
             
             {type === 'inbound' && (
                 <div className="relative">
                    <input type="file" accept=".pdf, image/*" onChange={handlePdfImport} className="absolute inset-0 opacity-0 cursor-pointer" disabled={isAnalyzing} />
                    <button disabled={isAnalyzing} className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded text-xs font-bold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50">
                        {isAnalyzing ? <Loader2 size={14} className="animate-spin"/> : <ScanText size={14}/>} Import PO (PDF/Img)
                    </button>
                 </div>
             )}

             <label className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer">
                <Camera size={14}/> Lampirkan Foto
                <input type="file" multiple accept="image/*" onChange={handlePhotoUpload} className="hidden" />
             </label>
          </div>
          {documentImages.length > 0 && <div className="mt-2 flex gap-2">{documentImages.map((img, idx) => <div key={idx} className="w-12 h-12 border rounded overflow-hidden"><img src={img} className="w-full h-full object-cover"/></div>)}</div>}
        </div>
      </div>

      {/* Right Panel: Transaction Cart (Invoice Style) */}
      <div className="bg-white dark:bg-gray-800 rounded shadow-card border border-gray-200 dark:border-gray-700 flex flex-col h-full overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-bold text-gray-800 flex items-center gap-2"><ShoppingCart size={18} /> Rincian Transaksi</h3>
            <span className="text-xs font-bold bg-white px-2 py-1 border rounded">{cart.length} Item</span>
        </div>
        
        <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 sticky top-0">
                    <tr>
                        <th className="p-3 text-xs font-bold text-gray-500 uppercase border-b">Item</th>
                        <th className="p-3 text-xs font-bold text-gray-500 uppercase border-b text-center">Qty</th>
                        <th className="p-3 text-xs font-bold text-gray-500 uppercase border-b text-right">Subtotal</th>
                        <th className="p-3 border-b w-8"></th>
                    </tr>
                </thead>
                <tbody>
                    {cart.map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                            <td className="p-3">
                                <div className="font-bold text-sm text-gray-800">{item.name}</div>
                                <div className="text-xs text-gray-500">{item.sku}</div>
                            </td>
                            <td className="p-3 text-center text-sm">
                                <span className="font-medium text-corporate-600">{getDisplayQty(item)}</span> <span className="text-xs text-gray-400">{item.uom}</span>
                            </td>
                            <td className="p-3 text-right text-sm font-medium text-gray-800">
                                {item.total.toLocaleString()}
                            </td>
                            <td className="p-3 text-center">
                                <button onClick={() => removeFromCart(idx)} className="text-gray-400 hover:text-red-500"><Trash size={14}/></button>
                            </td>
                        </tr>
                    ))}
                    {cart.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-gray-400 text-sm italic">Belum ada item ditambahkan.</td></tr>}
                </tbody>
            </table>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-200">
            <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-bold text-gray-500 uppercase">Total Estimasi</span>
                <span className="text-2xl font-bold text-gray-800">Rp {cart.reduce((a, b) => a + b.total, 0).toLocaleString()}</span>
            </div>
            <button onClick={handleSubmit} disabled={cart.length === 0} className="w-full py-3 bg-corporate-600 text-white font-bold rounded shadow hover:bg-corporate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                <FileText size={18} /> Simpan Transaksi
            </button>
        </div>
      </div>
    </div>
  );
};
