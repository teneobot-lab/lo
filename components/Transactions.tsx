
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { InventoryItem, Transaction, TransactionItem, User } from '../types';
import { storageService } from '../services/storageService';
import { 
  Plus, 
  Trash, 
  ShoppingCart, 
  Search, 
  Calendar, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  X, 
  FileText, 
  Building2, 
  ArrowLeft, 
  User as UserIcon, 
  FileSpreadsheet, 
  Clipboard, 
  Calculator, 
  Camera,
  ChevronRight,
  Package,
  Zap
} from 'lucide-react';
import { ToastType } from './Toast';

interface TransactionsProps {
  items: InventoryItem[];
  user: User;
  onSuccess: () => void;
  notify: (msg: string, type: ToastType) => void;
}

// Hanya ada Masuk dan Keluar sesuai permintaan user
type TransactionMode = 'menu' | 'inbound' | 'outbound';

export const Transactions: React.FC<TransactionsProps> = ({ items, user, onSuccess, notify }) => {
  const [mode, setMode] = useState<TransactionMode>('menu');
  const [cart, setCart] = useState<any[]>([]); 
  
  // Header Information State
  const [warehouse, setWarehouse] = useState('Gudang Utama');
  const [customDate, setCustomDate] = useState(new Date().toISOString().slice(0, 10));
  const [supplier, setSupplier] = useState(''); 
  const [refNumber, setRefNumber] = useState(''); 
  const [notes, setNotes] = useState('');
  const [documentImages, setDocumentImages] = useState<string[]>([]);
  
  // Item Selection State
  const [itemSearch, setItemSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  
  // Input Qty State
  const [inputQty, setInputQty] = useState<number | ''>('');
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [conversionRatio, setConversionRatio] = useState<number>(1);

  // Refs for Focus Management
  const searchInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredItems = useMemo(() => {
      if (!itemSearch || selectedItem) return [];
      const query = itemSearch.toLowerCase();
      return items.filter(i => 
          i.active && (i.name.toLowerCase().includes(query) || i.sku.toLowerCase().includes(query))
      ).slice(0, 8);
  }, [items, itemSearch, selectedItem]);

  // Handle Click Outside Dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          Array.from(e.target.files).forEach((file) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                  if (reader.result) {
                      setDocumentImages(prev => [...prev, reader.result as string]);
                  }
              };
              reader.readAsDataURL(file);
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
      setFocusedIndex(-1);
      setSelectedUnit(item.unit);
      setConversionRatio(1);
      setInputQty('');
      // Auto focus qty input after selection (Enter di Auto Complete)
      setTimeout(() => qtyInputRef.current?.focus(), 50);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
      if (!showDropdown || filteredItems.length === 0) return;

      if (e.key === 'ArrowDown') {
          e.preventDefault();
          setFocusedIndex(prev => (prev < filteredItems.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setFocusedIndex(prev => (prev > 0 ? prev - 1 : filteredItems.length - 1));
      } else if (e.key === 'Enter') {
          e.preventDefault();
          const target = focusedIndex >= 0 ? filteredItems[focusedIndex] : filteredItems[0];
          if (target) handleSelectItem(target);
      } else if (e.key === 'Escape') {
          setShowDropdown(false);
      }
  };

  const handleQtyKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
          e.preventDefault();
          addToCart(); // Enter di Qty Barang Masuk ke List
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

    setCart([newItem, ...cart]); // Item terbaru di atas
    
    // Reset Input Section & Fokus kembali ke cari produk untuk kecepatan input
    setSelectedItem(null);
    setItemSearch('');
    setInputQty('');
    setFocusedIndex(-1);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  };

  const removeFromCart = (idx: number) => {
      setCart(cart.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (cart.length === 0) { notify("Keranjang masih kosong", 'error'); return; }
    if (!supplier) { notify("Nama Supplier/Customer wajib diisi", 'warning'); return; }

    const transaction: Transaction = { 
        id: storageService.generateTransactionId(), 
        type: mode as 'inbound' | 'outbound', 
        date: `${customDate} ${new Date().toTimeString().split(' ')[0]}`, 
        warehouse, 
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
            <h2 className="text-4xl font-black text-slate-800 dark:text-white mb-12 tracking-tighter uppercase">Pilih Tipe Transaksi</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 w-full max-w-4xl">
                <MenuButton 
                    title="Barang Masuk" sub="Inbound / Restock / PO" 
                    icon={<ArrowDownCircle size={64}/>} color="emerald"
                    onClick={() => setMode('inbound')}
                />
                <MenuButton 
                    title="Barang Keluar" sub="Outbound / Sales / DO" 
                    icon={<ArrowUpCircle size={64}/>} color="rose"
                    onClick={() => setMode('outbound')}
                />
            </div>
        </div>
      );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-24 animate-in slide-in-from-bottom-6 duration-500">
      
      {/* Header Navigation */}
      <div className="flex items-center gap-6">
          <button onClick={() => setMode('menu')} className="p-4 bg-white dark:bg-gray-800 hover:bg-slate-50 rounded-[1.5rem] border border-slate-200 dark:border-gray-700 transition-all shadow-md active:scale-95">
              <ArrowLeft size={24} className="text-slate-600 dark:text-gray-300"/>
          </button>
          <div>
              <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter uppercase flex items-center gap-3">
                  {mode === 'inbound' ? <ArrowDownCircle className="text-emerald-500" size={32}/> : <ArrowUpCircle className="text-rose-500" size={32}/>}
                  Input {mode === 'inbound' ? 'Barang Masuk' : 'Barang Keluar'}
              </h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Sistem Pencatatan Mutasi Barang Real-Time</p>
          </div>
      </div>

      {/* SECTION 1: Detail Informasi */}
      <div className="bg-white dark:bg-gray-800 p-10 rounded-[3rem] shadow-paper border border-slate-100 dark:border-gray-700 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none"><FileText size={180} /></div>
          <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-[0.4em] mb-10 border-b border-slate-50 dark:border-gray-700 pb-3 flex items-center gap-3">
              <FileText size={16} className="text-paper-blue"/> I. INFORMASI TRANSAKSI
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
              <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-3">TANGGAL</label>
                  <div className="relative">
                      <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20}/>
                      <input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)} className="w-full pl-14 pr-5 py-5 bg-slate-50 dark:bg-gray-900 border-2 border-transparent focus:border-paper-blue rounded-[2rem] text-base font-black outline-none shadow-inner dark:text-white dark:[color-scheme:dark]" />
                  </div>
              </div>

              <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-3">{mode === 'inbound' ? 'NAMA SUPPLIER' : 'NAMA CUSTOMER/TUJUAN'}</label>
                  <div className="relative">
                      <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20}/>
                      <input value={supplier} onChange={e => setSupplier(e.target.value)} className="w-full pl-14 pr-5 py-5 bg-slate-50 dark:bg-gray-900 border-2 border-transparent focus:border-paper-blue rounded-[2rem] text-base font-black outline-none shadow-inner dark:text-white" placeholder={mode === 'inbound' ? "Ex: PT. Makmur Jaya" : "Ex: Customer Retail A"} />
                  </div>
              </div>

              <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-3">NO. SURAT JALAN / REF</label>
                  <div className="relative">
                      <FileSpreadsheet className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20}/>
                      <input value={refNumber} onChange={e => setRefNumber(e.target.value)} className="w-full pl-14 pr-5 py-5 bg-slate-50 dark:bg-gray-900 border-2 border-transparent focus:border-paper-blue rounded-[2rem] text-base font-black outline-none shadow-inner dark:text-white" placeholder="Ex: SJ-001/X/2026" />
                  </div>
              </div>

              <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-3">LOKASI GUDANG</label>
                  <div className="relative">
                      <Building2 className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20}/>
                      <select value={warehouse} onChange={e => setWarehouse(e.target.value)} className="w-full pl-14 pr-10 py-5 bg-slate-50 dark:bg-gray-900 border-2 border-transparent focus:border-paper-blue rounded-[2rem] text-base font-black outline-none shadow-inner appearance-none cursor-pointer dark:text-white">
                          <option>Gudang Utama</option><option>Gudang Cabang A</option><option>Gudang Transit</option>
                      </select>
                  </div>
              </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8 relative z-10">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-3">CATATAN TAMBAHAN (OPSIONAL)</label>
                  <div className="relative">
                      <Clipboard className="absolute left-6 top-5 text-slate-300" size={20}/>
                      <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full pl-14 pr-6 py-5 bg-slate-50 dark:bg-gray-900 border-2 border-transparent focus:border-paper-blue rounded-[2.5rem] text-base font-bold outline-none shadow-inner dark:text-white resize-none" placeholder="Keterangan kondisi barang..." />
                  </div>
              </div>

              <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-3">DOKUMEN PENDUKUNG / FOTO</label>
                  <div className="w-full p-5 bg-slate-50 dark:bg-gray-900 border-2 border-dashed border-slate-200 dark:border-gray-700 rounded-[2.5rem] min-h-[140px] flex items-center shadow-inner overflow-x-auto no-scrollbar">
                      <div className="flex flex-nowrap gap-4">
                          {documentImages.map((img, idx) => (
                              <div key={idx} className="relative w-20 h-20 group flex-shrink-0">
                                  <img src={img} alt={`doc-${idx}`} className="w-full h-full object-cover rounded-2xl border-2 border-white shadow-md" />
                                  <button onClick={() => removeImage(idx)} className="absolute -top-2 -right-2 bg-rose-500 text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"><X size={12}/></button>
                              </div>
                          ))}
                          <label className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-paper-blue/30 rounded-2xl cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all active:scale-90 flex-shrink-0">
                              <Camera size={24} className="text-paper-blue mb-1"/>
                              <span className="text-[8px] text-paper-blue font-black tracking-widest uppercase">ADD</span>
                              <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} />
                          </label>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* SECTION 2: Input & Keranjang */}
      <div className="bg-white dark:bg-gray-800 p-10 rounded-[3rem] shadow-paper border border-slate-100 dark:border-gray-700 flex flex-col min-h-[550px]">
          <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-[0.4em] mb-10 border-b border-slate-50 dark:border-gray-700 pb-3 flex justify-between items-center">
              <span className="flex items-center gap-3"><ShoppingCart size={16} className="text-paper-blue"/> II. INPUT BARANG & KERANJANG</span>
              <span className="bg-paper-blue text-white px-5 py-1.5 rounded-full text-[10px] font-black shadow-lg shadow-blue-500/20">{cart.length} ITEM</span>
          </h3>

          {/* Quick Input Area */}
          <div className="p-8 bg-slate-900 dark:bg-gray-900/80 rounded-[2.5rem] mb-10 shadow-2xl relative overflow-hidden group border border-white/5">
               <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity"><Zap size={140} className="text-white"/></div>
               <div className="flex flex-col lg:flex-row gap-8 items-stretch lg:items-end relative z-10">
                  
                  {/* Search Bar with Keyboard Nav */}
                  <div className="flex-[4] relative" ref={dropdownRef}>
                      <label className="text-[11px] font-black text-white/40 uppercase tracking-[0.3em] mb-3 block ml-4">CARI BARANG (ENTER UNTUK PILIH)</label>
                      <div className="relative">
                          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/30" size={24}/>
                          <input 
                            ref={searchInputRef}
                            type="text" 
                            className={`w-full pl-16 pr-6 py-6 rounded-[2rem] border-2 transition-all outline-none text-xl font-black shadow-lg ${selectedItem ? 'border-paper-blue bg-paper-blue/10 text-paper-blue' : 'border-white/5 bg-white/5 text-white placeholder-white/20 focus:border-white/20 focus:bg-white/10'}`} 
                            value={itemSearch} 
                            onChange={e => { setItemSearch(e.target.value); setSelectedItem(null); setShowDropdown(true); setFocusedIndex(-1); }} 
                            onKeyDown={handleSearchKeyDown}
                            onFocus={() => setShowDropdown(true)}
                            placeholder="Ketik produk atau scan barcode..." 
                          />
                          {selectedItem && (
                              <button onClick={() => { setItemSearch(''); setSelectedItem(null); setInputQty(''); setFocusedIndex(-1); searchInputRef.current?.focus(); }} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 rounded-full text-white/40 hover:text-white"><X size={20}/></button>
                          )}
                      </div>
                      
                      {/* Autocomplete Dropdown */}
                      {showDropdown && filteredItems.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-4 bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-[0_30px_100px_-15px_rgba(0,0,0,0.5)] border border-slate-100 dark:border-gray-700 z-[100] max-h-96 overflow-y-auto overflow-x-hidden p-3 animate-in fade-in slide-in-from-top-4 duration-200">
                              {filteredItems.map((item, idx) => (
                                  <div 
                                    key={item.id} 
                                    onClick={() => handleSelectItem(item)} 
                                    className={`p-6 cursor-pointer rounded-[1.5rem] border-2 mb-2 flex justify-between items-center group transition-all ${focusedIndex === idx ? 'bg-paper-blue border-paper-blue text-white shadow-xl' : 'bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-gray-700'}`}
                                  >
                                      <div className="flex items-center gap-5">
                                          <div className={`p-4 rounded-2xl ${focusedIndex === idx ? 'bg-white/20' : 'bg-slate-100 dark:bg-gray-700 group-hover:bg-white'}`}>
                                              <Package size={24} className={focusedIndex === idx ? 'text-white' : 'text-slate-400'}/>
                                          </div>
                                          <div>
                                              <div className={`text-lg font-black uppercase tracking-tight leading-none mb-1 ${focusedIndex === idx ? 'text-white' : 'text-slate-800 dark:text-white'}`}>{item.name}</div>
                                              <div className={`text-[10px] font-mono tracking-widest ${focusedIndex === idx ? 'text-white/60' : 'text-slate-400'}`}>{item.sku}</div>
                                          </div>
                                      </div>
                                      <div className="text-right flex items-center gap-4">
                                         <div className={`text-xs font-black uppercase tracking-widest ${focusedIndex === idx ? 'text-white' : 'text-slate-400'}`}>STOK: {item.stock} {item.unit}</div>
                                         <ChevronRight size={20} className={focusedIndex === idx ? 'text-white' : 'text-slate-200'}/>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>

                  {/* Qty & Add Section */}
                  <div className={`flex-[3] flex gap-5 items-end transition-all duration-300 ${selectedItem ? 'opacity-100 translate-y-0' : 'opacity-20 pointer-events-none translate-y-4'}`}>
                      <div className="flex-1 space-y-3">
                          <label className="text-[11px] font-black text-white/40 uppercase tracking-[0.3em] block ml-4">JML INPUT</label>
                          <input 
                            ref={qtyInputRef}
                            type="number" 
                            step="0.001"
                            value={inputQty} 
                            onChange={e => setInputQty(e.target.value === '' ? '' : Number(e.target.value))} 
                            onKeyDown={handleQtyKeyDown}
                            className="w-full p-6 bg-white/10 border-2 border-transparent focus:border-paper-blue rounded-[2rem] text-2xl font-black text-center text-white outline-none shadow-inner" 
                            placeholder="0" 
                          />
                      </div>
                      
                      <div className="flex-1 space-y-3">
                          <label className="text-[11px] font-black text-white/40 uppercase tracking-[0.3em] block ml-4">SATUAN</label>
                          <select value={selectedUnit} onChange={(e) => handleUnitChange(e.target.value)} className="w-full p-6 bg-white/10 border-2 border-transparent focus:border-paper-blue rounded-[2rem] text-sm font-black outline-none appearance-none cursor-pointer text-center text-white shadow-inner">
                              <option value={selectedItem?.unit} className="text-slate-900">{selectedItem?.unit} (UTAMA)</option>
                              {selectedItem?.unit2 && <option value={selectedItem.unit2} className="text-slate-900">{selectedItem.unit2}</option>}
                              {selectedItem?.unit3 && <option value={selectedItem.unit3} className="text-slate-900">{selectedItem.unit3}</option>}
                          </select>
                      </div>
                      
                      <button onClick={addToCart} disabled={!inputQty} className="h-[84px] px-10 bg-paper-blue text-white font-black rounded-[2rem] shadow-2xl shadow-blue-500/40 hover:bg-paper-blueHover disabled:opacity-30 transition-all active:scale-95 flex items-center justify-center gap-4 uppercase tracking-[0.2em] text-xs">
                          <Plus size={24}/> TAMBAH
                      </button>
                  </div>
               </div>
          </div>

          {/* Cart Section - Modern Enterprise Table */}
          <div className="flex-1 overflow-hidden flex flex-col bg-slate-50 dark:bg-gray-900/50 rounded-[3rem] border border-slate-100 dark:border-gray-700">
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                  {cart.length > 0 ? (
                      <table className="w-full text-left">
                        <thead className="bg-white dark:bg-gray-800 border-b border-slate-100 dark:border-gray-700 text-[10px] font-black text-slate-400 uppercase tracking-widest sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="p-6 rounded-tl-[1.5rem]">Barang</th>
                                <th className="p-6 text-center">Jumlah Input</th>
                                <th className="p-6 text-center">Qty Base (Sistem)</th>
                                <th className="p-6 text-right rounded-tr-[1.5rem]">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                            {cart.map((item, idx) => (
                                <tr key={idx} className="group hover:bg-white dark:hover:bg-gray-800 transition-all animate-in slide-in-from-right-8">
                                    <td className="p-6">
                                        <div className="flex items-center gap-5">
                                            <div className="w-12 h-12 bg-slate-100 dark:bg-gray-700 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-paper-blue transition-colors">
                                                <Package size={20}/>
                                            </div>
                                            <div>
                                                <div className="font-black text-base text-slate-800 dark:text-white uppercase tracking-tight leading-none mb-1.5">{item.name}</div>
                                                <div className="text-[10px] font-mono text-slate-400 tracking-widest">{item.sku}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-6 text-center">
                                        <div className="inline-flex flex-col items-center px-6 py-2 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                                            <div className="font-black text-paper-blue text-lg leading-none">{item.inputQty}</div>
                                            <div className="text-[9px] text-paper-blue font-black uppercase tracking-widest mt-1">{item.inputUnit}</div>
                                        </div>
                                    </td>
                                    <td className="p-6 text-center">
                                        <div className="flex flex-col items-center">
                                           <div className="flex items-center gap-2 font-black text-slate-700 dark:text-gray-300 text-base tracking-tighter">
                                               <Calculator size={14} className="text-slate-300"/>
                                               {item.qty.toFixed(3)} {item.uom}
                                           </div>
                                           {item.inputUnit !== item.uom && <span className="text-[10px] font-bold text-slate-300 italic uppercase">Auto-Conversion</span>}
                                        </div>
                                    </td>
                                    <td className="p-6 text-right">
                                        <button onClick={() => removeFromCart(idx)} className="p-4 text-slate-200 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-2xl transition-all"><Trash size={20}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                  ) : (
                      <div className="h-full flex flex-col items-center justify-center p-24 text-center space-y-8 opacity-20">
                          <ShoppingCart size={120} />
                          <div>
                              <p className="text-xl font-black uppercase tracking-[0.5em] mb-2">Keranjang Kosong</p>
                              <p className="text-xs font-bold uppercase tracking-widest">Gunakan Input Cepat di atas untuk mulai memutasi barang.</p>
                          </div>
                      </div>
                  )}
              </div>

              {/* Summary Bottom Bar */}
              <div className="p-10 bg-white dark:bg-gray-800 border-t border-slate-100 dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-8">
                  <div className="flex items-center gap-8">
                      <div className="p-6 bg-slate-900 rounded-[1.5rem] text-white shadow-2xl">
                          <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-2">Estimasi Nilai Transaksi</p>
                          <h4 className="text-3xl font-black tracking-tighter leading-none">Rp {cart.reduce((acc, curr) => acc + curr.total, 0).toLocaleString('id-ID')}</h4>
                      </div>
                      <div className="hidden lg:block border-l border-slate-100 dark:border-gray-700 pl-8 h-16">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Penanggung Jawab</p>
                          <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-paper-blue flex items-center justify-center text-[10px] font-black text-white">{user.name.charAt(0)}</div>
                              <span className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">{user.name}</span>
                          </div>
                      </div>
                  </div>
                  <div className="flex gap-5 w-full md:w-auto">
                      <button onClick={() => setMode('menu')} className="flex-1 md:flex-none px-10 py-6 text-slate-400 font-black hover:bg-slate-50 dark:hover:bg-gray-700 rounded-[2rem] uppercase tracking-widest text-xs transition-all">Batal</button>
                      <button 
                          onClick={handleSubmit} 
                          disabled={cart.length === 0} 
                          className="flex-[2] md:flex-none px-16 py-6 bg-paper-blue hover:bg-paper-blueHover text-white font-black rounded-[2rem] shadow-[0_20px_60px_-10px_rgba(91,164,230,0.5)] transition-all active:scale-[0.98] disabled:opacity-30 uppercase tracking-[0.3em] text-xs flex items-center justify-center gap-4"
                      >
                          <FileText size={24}/> Simpan Transaksi
                      </button>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

const MenuButton = ({ title, sub, icon, color, onClick }: any) => {
    const colors: any = {
        emerald: "bg-emerald-50 text-emerald-500 border-emerald-100 hover:shadow-emerald-500/20 dark:bg-emerald-900/10 dark:border-emerald-900/20",
        rose: "bg-rose-50 text-rose-500 border-rose-100 hover:shadow-rose-500/20 dark:bg-rose-900/10 dark:border-rose-900/20",
        blue: "bg-blue-50 text-paper-blue border-blue-100 hover:shadow-blue-500/20 dark:bg-blue-900/10 dark:border-blue-900/20"
    };
    return (
        <button onClick={onClick} className={`group bg-white dark:bg-gray-800 p-16 rounded-[4rem] shadow-card border-4 border-transparent transition-all flex flex-col items-center gap-8 ${colors[color]} hover:border-current hover:-translate-y-2`}>
            <div className={`p-10 rounded-[2.5rem] transition-transform group-hover:scale-110 group-active:scale-95 shadow-2xl ${colors[color]}`}>{icon}</div>
            <div className="text-center">
                <h3 className="text-3xl font-black text-slate-800 dark:text-white mb-3 tracking-tighter uppercase">{title}</h3>
                <p className="text-sm font-bold text-slate-400 dark:text-gray-400 tracking-widest uppercase">{sub}</p>
            </div>
        </button>
    );
};
