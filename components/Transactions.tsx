
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { InventoryItem, Transaction, TransactionItem, User } from '../types';
import { storageService } from '../services/storageService';
import { Plus, Trash, ShoppingCart, Search, Calendar, ArrowDownCircle, ArrowUpCircle, X, FileText, Building2, ArrowRightLeft, ArrowLeft, User as UserIcon, FileSpreadsheet, Clipboard, Calculator, Upload, Image as ImageIcon, Camera } from 'lucide-react';
import { ToastType } from './Toast';

interface TransactionsProps {
  items: InventoryItem[];
  user: User;
  onSuccess: () => void;
  notify: (msg: string, type: ToastType) => void;
}

type TransactionMode = 'menu' | 'inbound' | 'outbound' | 'transfer';

export const Transactions: React.FC<TransactionsProps> = ({ items, user, onSuccess, notify }) => {
  const [mode, setMode] = useState<TransactionMode>('menu');
  const [cart, setCart] = useState<any[]>([]); 
  
  // Header Information State
  const [warehouse, setWarehouse] = useState('Gudang Utama');
  const [targetWarehouse, setTargetWarehouse] = useState('Gudang Cabang A');
  const [customDate, setCustomDate] = useState(new Date().toISOString().slice(0, 10));
  const [supplier, setSupplier] = useState(''); 
  const [refNumber, setRefNumber] = useState(''); 
  const [notes, setNotes] = useState('');
  const [documentImages, setDocumentImages] = useState<string[]>([]); // New State for Images
  
  // Item Selection State
  const [itemSearch, setItemSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Input Qty State
  const [inputQty, setInputQty] = useState<number | ''>('');
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [conversionRatio, setConversionRatio] = useState<number>(1);

  // Refs for Focus Management
  const searchInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);

  const filteredItems = useMemo(() => {
      if (!itemSearch) return [];
      return items.filter(i => i.active && (i.name.toLowerCase().includes(itemSearch.toLowerCase()) || i.sku.toLowerCase().includes(itemSearch.toLowerCase()))).slice(0, 6);
  }, [items, itemSearch]);

  // Effect to focus Qty when item is selected
  useEffect(() => {
      if (selectedItem && qtyInputRef.current) {
          qtyInputRef.current.focus();
      }
  }, [selectedItem]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          // Explicitly type 'file' as File (which extends Blob) to avoid 'unknown' type error
          Array.from(e.target.files).forEach((file) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                  if (reader.result) {
                      setDocumentImages(prev => [...prev, reader.result as string]);
                  }
              };
              reader.readAsDataURL(file as Blob);
          });
      }
  };

  const removeImage = (index: number) => {
      setDocumentImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSelectItem = (item: InventoryItem) => {
      setSelectedItem(item);
      setItemSearch(item.name);
      setShowDropdown(false);
      setSelectedUnit(item.unit);
      setConversionRatio(1);
      setInputQty('');
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
          e.preventDefault();
          // If dropdown is open and there are results, select the first one
          if (filteredItems.length > 0) {
              handleSelectItem(filteredItems[0]);
          }
      }
  };

  const handleQtyKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
          e.preventDefault();
          addToCart();
      }
  };

  const handleUnitChange = (unitName: string) => {
      if (!selectedItem) return;
      setSelectedUnit(unitName);
      
      let ratio = 1;
      if (unitName === selectedItem.unit) {
          ratio = 1;
      } else if (unitName === selectedItem.unit2 && selectedItem.ratio2) {
          ratio = selectedItem.op2 === 'divide' ? (1 / selectedItem.ratio2) : selectedItem.ratio2;
      } else if (unitName === selectedItem.unit3 && selectedItem.ratio3) {
          ratio = selectedItem.op3 === 'divide' ? (1 / selectedItem.ratio3) : selectedItem.ratio3;
      }
      setConversionRatio(ratio);
  };

  const addToCart = () => {
    if (!selectedItem || !inputQty || Number(inputQty) <= 0) return;

    const baseQty = Number(inputQty) * conversionRatio;

    const newItem = { 
        itemId: selectedItem.id, 
        sku: selectedItem.sku, 
        name: selectedItem.name, 
        inputQty: Number(inputQty),
        inputUnit: selectedUnit, 
        qty: baseQty, 
        uom: selectedItem.unit, 
        unitPrice: selectedItem.price, 
        total: baseQty * selectedItem.price 
    };

    setCart([...cart, newItem]);
    
    // Reset Input Section & Focus back to search
    setSelectedItem(null);
    setItemSearch('');
    setInputQty('');
    if (searchInputRef.current) {
        searchInputRef.current.focus();
    }
  };

  const removeFromCart = (idx: number) => {
      setCart(cart.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (cart.length === 0) { notify("Keranjang masih kosong", 'error'); return; }
    if (!supplier && mode !== 'transfer') { notify("Nama Supplier/Customer wajib diisi", 'warning'); return; }

    const transaction: Transaction = { 
        id: storageService.generateTransactionId(), 
        type: mode as 'inbound' | 'outbound' | 'transfer', 
        date: `${customDate} ${new Date().toTimeString().split(' ')[0]}`, 
        warehouse, 
        targetWarehouse: mode === 'transfer' ? targetWarehouse : undefined,
        items: cart.map(c => ({
            itemId: c.itemId,
            sku: c.sku,
            name: c.name,
            qty: c.qty, 
            uom: c.inputUnit, 
            unitPrice: c.unitPrice,
            total: c.total
        })), 
        totalValue: cart.reduce((acc, curr) => acc + curr.total, 0), 
        userId: user.id || 'admin', 
        supplier, 
        deliveryNote: refNumber, 
        notes, 
        documents: documentImages 
    };

    try { 
        await storageService.saveTransaction(transaction); 
        notify(`Transaksi Berhasil: ${transaction.id}`, 'success'); 
        onSuccess(); 
    } catch (e) { notify("Gagal simpan transaksi", 'error'); }
  };

  if (mode === 'menu') {
      return (
        <div className="h-[calc(100vh-100px)] flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in duration-500">
            <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-10 tracking-tight">Apa jenis transaksi hari ini?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
                <MenuButton 
                    title="Barang Masuk" sub="Inbound / Restock" 
                    icon={<ArrowDownCircle size={48}/>} color="emerald"
                    onClick={() => setMode('inbound')}
                />
                <MenuButton 
                    title="Barang Keluar" sub="Outbound / Sales" 
                    icon={<ArrowUpCircle size={48}/>} color="rose"
                    onClick={() => setMode('outbound')}
                />
                <MenuButton 
                    title="Transfer Stok" sub="Mutasi Antar Rak" 
                    icon={<ArrowRightLeft size={48}/>} color="blue"
                    onClick={() => setMode('transfer')}
                />
            </div>
        </div>
      );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 animate-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Navigation */}
      <div className="flex items-center gap-4">
          <button onClick={() => setMode('menu')} className="p-2.5 bg-white dark:bg-gray-800 hover:bg-slate-50 rounded-xl border border-slate-200 dark:border-gray-700 transition-all shadow-sm">
              <ArrowLeft size={20} className="text-slate-600 dark:text-gray-300"/>
          </button>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
              {mode === 'inbound' ? <ArrowDownCircle className="text-emerald-500"/> : mode === 'outbound' ? <ArrowUpCircle className="text-rose-500"/> : <ArrowRightLeft className="text-blue-500"/>}
              Input {mode === 'inbound' ? 'Barang Masuk' : mode === 'outbound' ? 'Barang Keluar' : 'Transfer Stok'}
          </h2>
      </div>

      {/* SECTION 1: Detail Informasi */}
      <div className="bg-white dark:bg-gray-800 p-8 rounded-[2rem] shadow-paper border border-slate-200 dark:border-gray-700 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><FileText size={100} /></div>
          <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-widest mb-6 border-b border-slate-100 dark:border-gray-700 pb-2">I. Informasi Transaksi</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
              <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Tanggal</label>
                  <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                      <input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-paper-blue dark:text-white dark:[color-scheme:dark]" />
                  </div>
              </div>

              <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">{mode === 'inbound' ? 'Nama Supplier' : 'Nama Customer/Tujuan'}</label>
                  <div className="relative">
                      <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                      <input value={supplier} onChange={e => setSupplier(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-paper-blue dark:text-white" placeholder={mode === 'inbound' ? "PT. Supplier..." : "Customer A..."} />
                  </div>
              </div>

              <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">No. Surat Jalan / Ref</label>
                  <div className="relative">
                      <FileSpreadsheet className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                      <input value={refNumber} onChange={e => setRefNumber(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-paper-blue dark:text-white" placeholder="Ex: SJ-001/X/2024" />
                  </div>
              </div>

              <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Lokasi Gudang</label>
                  <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                      <select value={warehouse} onChange={e => setWarehouse(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-paper-blue appearance-none cursor-pointer dark:text-white">
                          <option>Gudang Utama</option><option>Gudang Cabang A</option><option>Gudang Reject</option>
                      </select>
                  </div>
              </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
               <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Catatan Tambahan (Opsional)</label>
                  <div className="relative">
                      <Clipboard className="absolute left-4 top-3 text-slate-400" size={16}/>
                      <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-paper-blue dark:text-white resize-none" placeholder="Keterangan kondisi barang..." />
                  </div>
              </div>

              <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Dokumen Pendukung / Foto</label>
                  <div className="w-full p-4 bg-slate-50 dark:bg-gray-900 border border-dashed border-slate-300 dark:border-gray-700 rounded-xl min-h-[105px]">
                      <div className="flex flex-wrap gap-3">
                          {documentImages.map((img, idx) => (
                              <div key={idx} className="relative w-16 h-16 group">
                                  <img src={img} alt={`doc-${idx}`} className="w-full h-full object-cover rounded-lg border border-slate-200 dark:border-gray-700" />
                                  <button onClick={() => removeImage(idx)} className="absolute -top-2 -right-2 bg-rose-500 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X size={12}/></button>
                              </div>
                          ))}
                          <label className="w-16 h-16 flex flex-col items-center justify-center border-2 border-dashed border-paper-blue/30 rounded-lg cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors">
                              <Camera size={20} className="text-paper-blue mb-1"/>
                              <span className="text-[8px] text-paper-blue font-bold">ADD</span>
                              <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} />
                          </label>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* SECTION 2: Cart & Input */}
      <div className="bg-white dark:bg-gray-800 p-8 rounded-[2rem] shadow-paper border border-slate-200 dark:border-gray-700 flex flex-col min-h-[400px]">
          <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-widest mb-6 border-b border-slate-100 dark:border-gray-700 pb-2 flex justify-between items-center">
              <span>II. Input Barang & Keranjang</span>
              <span className="text-xs bg-slate-100 dark:bg-gray-700 px-3 py-1 rounded-full text-slate-600 dark:text-gray-300 font-bold">{cart.length} Item</span>
          </h3>

          {/* Search & Input Area */}
          <div className="p-6 bg-slate-50 dark:bg-gray-900/50 border border-slate-200 dark:border-gray-700 rounded-2xl mb-8">
               <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
                  
                  {/* Search Bar */}
                  <div className="flex-1 w-full relative z-20">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Cari Barang (Enter untuk Pilih)</label>
                      <div className="relative">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                          <input 
                            ref={searchInputRef}
                            type="text" 
                            className={`w-full pl-12 pr-4 py-3 border ${selectedItem ? 'border-paper-blue bg-blue-50/50 dark:bg-blue-900/20 text-paper-blue font-bold' : 'border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-slate-800 dark:text-white'} rounded-xl text-sm focus:ring-2 focus:ring-paper-blue outline-none transition-all`} 
                            value={itemSearch} 
                            onChange={e => { setItemSearch(e.target.value); setSelectedItem(null); setShowDropdown(true); }} 
                            onKeyDown={handleSearchKeyDown}
                            placeholder="Ketik SKU atau Nama Barang..." 
                          />
                          {selectedItem && (
                              <button onClick={() => { setItemSearch(''); setSelectedItem(null); setInputQty(''); if(searchInputRef.current) searchInputRef.current.focus(); }} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-slate-200 dark:bg-gray-700 rounded-full text-slate-500 hover:text-rose-500"><X size={14}/></button>
                          )}
                      </div>
                      {showDropdown && itemSearch && !selectedItem && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-slate-100 dark:border-gray-700 max-h-56 overflow-y-auto">
                              {filteredItems.map(item => (
                                  <div key={item.id} onClick={() => handleSelectItem(item)} className="p-4 hover:bg-slate-50 dark:hover:bg-gray-700 cursor-pointer border-b last:border-0 border-slate-50 dark:border-gray-700 flex justify-between items-center group">
                                      <div>
                                          <div className="font-bold text-slate-800 dark:text-white group-hover:text-paper-blue">{item.name}</div>
                                          <div className="text-[10px] font-mono text-slate-400">{item.sku}</div>
                                      </div>
                                      <div className="text-right">
                                         <div className="text-xs font-bold text-slate-400">Stok: {item.stock} {item.unit}</div>
                                         {item.unit2 && <div className="text-[10px] text-slate-300">Unit 2: {item.unit2}</div>}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>

                  {/* Quantity & Unit Selection */}
                  {selectedItem ? (
                      <div className="flex gap-4 w-full lg:w-auto animate-in fade-in slide-in-from-left-4">
                          <div className="w-24">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Qty</label>
                              <input 
                                ref={qtyInputRef}
                                type="number" 
                                value={inputQty} 
                                onChange={e => setInputQty(e.target.value === '' ? '' : Number(e.target.value))} 
                                onKeyDown={handleQtyKeyDown}
                                className="w-full p-3 border border-slate-200 dark:border-gray-700 rounded-xl text-sm font-black text-center text-paper-blue focus:ring-2 focus:ring-paper-blue outline-none dark:bg-gray-800" 
                                placeholder="0" 
                              />
                          </div>
                          
                          <div className="w-32">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Satuan</label>
                              <select value={selectedUnit} onChange={(e) => handleUnitChange(e.target.value)} className="w-full p-3 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-paper-blue appearance-none cursor-pointer dark:text-white">
                                  <option value={selectedItem.unit}>{selectedItem.unit} (Base)</option>
                                  {selectedItem.unit2 && <option value={selectedItem.unit2}>{selectedItem.unit2}</option>}
                                  {selectedItem.unit3 && <option value={selectedItem.unit3}>{selectedItem.unit3}</option>}
                              </select>
                          </div>

                          <div className="w-28 hidden md:block">
                               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Konversi</label>
                               <div className="p-3 bg-slate-200 dark:bg-gray-700 rounded-xl text-xs font-mono text-slate-600 dark:text-gray-300 text-center flex items-center justify-center h-[46px]">
                                   {inputQty ? `${Number(inputQty) * conversionRatio} ${selectedItem.unit}` : '-'}
                               </div>
                          </div>
                          
                          <div className="flex items-end pb-0.5">
                              <button onClick={addToCart} disabled={!inputQty} className="h-[46px] px-6 bg-paper-blue text-white font-bold rounded-xl shadow-lg hover:bg-paper-blueHover disabled:opacity-50 transition-all active:scale-95 flex items-center gap-2">
                                  <Plus size={20}/> <span className="hidden md:inline">Tambah</span>
                              </button>
                          </div>
                      </div>
                  ) : (
                      <div className="w-full lg:w-auto flex items-end pb-0.5 opacity-50 pointer-events-none">
                          <button className="h-[46px] px-6 bg-slate-200 text-slate-400 font-bold rounded-xl flex items-center gap-2">
                              <Plus size={20}/> <span className="hidden md:inline">Tambah</span>
                          </button>
                      </div>
                  )}
               </div>
          </div>

          {/* Cart Table */}
          <div className="flex-1 overflow-auto rounded-xl border border-slate-100 dark:border-gray-700">
              <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-gray-900 border-b border-slate-100 dark:border-gray-700 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      <tr>
                          <th className="p-4">Barang</th>
                          <th className="p-4 text-center bg-blue-50/50 dark:bg-blue-900/10 text-paper-blue">Qty Input</th>
                          <th className="p-4 text-center">Qty Base (Sistem)</th>
                          <th className="p-4 text-right">Aksi</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-gray-700">
                      {cart.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors">
                              <td className="p-4">
                                  <div className="font-bold text-sm text-slate-800 dark:text-white">{item.name}</div>
                                  <div className="text-[10px] font-mono text-slate-400">{item.sku}</div>
                              </td>
                              <td className="p-4 text-center bg-blue-50/30 dark:bg-blue-900/5">
                                  <div className="font-black text-paper-blue text-sm">{item.inputQty}</div>
                                  <div className="text-[10px] text-slate-400 font-bold uppercase">{item.inputUnit}</div>
                              </td>
                              <td className="p-4 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                     <Calculator size={12} className="text-slate-300"/>
                                     <span className="font-bold text-slate-700 dark:text-gray-300 text-sm">{item.qty} {item.uom}</span>
                                  </div>
                              </td>
                              <td className="p-4 text-right">
                                  <button onClick={() => removeFromCart(idx)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all"><Trash size={16}/></button>
                              </td>
                          </tr>
                      ))}
                      {cart.length === 0 && (
                          <tr>
                              <td colSpan={4} className="p-12 text-center">
                                  <div className="flex flex-col items-center gap-3 opacity-50">
                                      <ShoppingCart size={48} className="text-slate-300"/>
                                      <p className="text-sm font-medium text-slate-400">Keranjang transaksi masih kosong.</p>
                                  </div>
                              </td>
                          </tr>
                      )}
                  </tbody>
              </table>
          </div>

          <div className="mt-8 flex justify-end">
              <button onClick={handleSubmit} disabled={cart.length === 0} className="px-10 py-4 bg-paper-blue hover:bg-paper-blueHover text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 flex items-center gap-3 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 uppercase tracking-widest text-xs">
                  <FileText size={18}/> Simpan Transaksi
              </button>
          </div>
      </div>
    </div>
  );
};

const MenuButton = ({ title, sub, icon, color, onClick }: any) => {
    const colors: any = {
        emerald: "bg-emerald-50 text-emerald-500 border-emerald-100 hover:shadow-emerald-500/10 dark:bg-emerald-900/20 dark:border-emerald-900/30",
        rose: "bg-rose-50 text-rose-500 border-rose-100 hover:shadow-rose-500/10 dark:bg-rose-900/20 dark:border-rose-900/30",
        blue: "bg-blue-50 text-paper-blue border-blue-100 hover:shadow-blue-500/10 dark:bg-blue-900/20 dark:border-blue-900/30"
    };
    return (
        <button onClick={onClick} className={`group bg-white dark:bg-gray-800 p-10 rounded-[2.5rem] shadow-card border-2 border-transparent transition-all flex flex-col items-center gap-6 ${colors[color]} hover:border-current`}>
            <div className={`p-6 rounded-3xl transition-transform group-hover:scale-110 ${colors[color]}`}>{icon}</div>
            <div className="text-center">
                <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2 tracking-tight">{title}</h3>
                <p className="text-sm font-medium text-slate-400 dark:text-gray-400">{sub}</p>
            </div>
        </button>
    );
};
