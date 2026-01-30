
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
      // Auto focus qty input
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

    setCart([newItem, ...cart]);
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
            <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-8 tracking-tighter uppercase">Mode Transaksi</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl">
                <MenuButton 
                    title="Barang Masuk" sub="Inbound / Restock" 
                    icon={<ArrowDownCircle size={48}/>} color="emerald"
                    onClick={() => setMode('inbound')}
                />
                <MenuButton 
                    title="Barang Keluar" sub="Outbound / Penjualan" 
                    icon={<ArrowUpCircle size={48}/>} color="rose"
                    onClick={() => setMode('outbound')}
                />
            </div>
        </div>
      );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 animate-in slide-in-from-bottom-6 duration-500 px-4">
      
      {/* Header Compact */}
      <div className="flex items-center gap-4">
          <button onClick={() => setMode('menu')} className="p-3 bg-white dark:bg-gray-800 hover:bg-slate-50 rounded-xl border border-slate-200 dark:border-gray-700 transition-all shadow-sm active:scale-95">
              <ArrowLeft size={20} className="text-slate-600 dark:text-gray-300"/>
          </button>
          <div>
              <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter uppercase flex items-center gap-2">
                  {mode === 'inbound' ? <ArrowDownCircle className="text-emerald-500" size={24}/> : <ArrowUpCircle className="text-rose-500" size={24}/>}
                  {mode === 'inbound' ? 'Barang Masuk' : 'Barang Keluar'}
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Entry Data Mutasi Persediaan</p>
          </div>
      </div>

      {/* SECTION 1: Informasi Dasar - Ramping */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-gray-700 relative overflow-hidden">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 border-b border-slate-50 dark:border-gray-700 pb-2 flex items-center gap-2">
              <FileText size={14} className="text-paper-blue"/> I. DETAIL TRANSAKSI
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative z-10">
              <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase ml-2">TANGGAL</label>
                  <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16}/>
                      <input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)} className="w-full pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-xl text-sm font-bold outline-none focus:border-paper-blue dark:text-white" />
                  </div>
              </div>

              <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase ml-2">{mode === 'inbound' ? 'SUPPLIER' : 'CUSTOMER'}</label>
                  <div className="relative">
                      <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16}/>
                      <input value={supplier} onChange={e => setSupplier(e.target.value)} className="w-full pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-xl text-sm font-bold outline-none focus:border-paper-blue dark:text-white" placeholder="Nama Pihak Kedua" />
                  </div>
              </div>

              <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase ml-2">NO. REF / SJ</label>
                  <div className="relative">
                      <FileSpreadsheet className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16}/>
                      <input value={refNumber} onChange={e => setRefNumber(e.target.value)} className="w-full pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-xl text-sm font-bold outline-none focus:border-paper-blue dark:text-white" placeholder="No. Dokumen" />
                  </div>
              </div>

              <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase ml-2">GUDANG</label>
                  <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16}/>
                      <select value={warehouse} onChange={e => setWarehouse(e.target.value)} className="w-full pl-10 pr-6 py-2.5 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-xl text-sm font-bold outline-none appearance-none cursor-pointer dark:text-white">
                          <option>Gudang Utama</option><option>Gudang Cabang</option><option>Transit</option>
                      </select>
                  </div>
              </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4 relative z-10">
               <div className="md:col-span-2 space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase ml-2">CATATAN</label>
                  <input value={notes} onChange={e => setNotes(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-xl text-sm font-medium outline-none focus:border-paper-blue dark:text-white" placeholder="Opsional..." />
              </div>

              <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase ml-2">LAMPIRAN FOTO</label>
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                      {documentImages.map((img, idx) => (
                          <div key={idx} className="relative w-10 h-10 flex-shrink-0 group">
                              <img src={img} className="w-full h-full object-cover rounded-lg border border-slate-100" />
                              <button onClick={() => removeImage(idx)} className="absolute -top-1 -right-1 bg-rose-500 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100"><X size={8}/></button>
                          </div>
                      ))}
                      <label className="w-10 h-10 flex flex-col items-center justify-center border-2 border-dashed border-paper-blue/20 rounded-lg cursor-pointer hover:bg-blue-50 transition-all flex-shrink-0">
                          <Camera size={16} className="text-paper-blue"/>
                          <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} />
                      </label>
                  </div>
              </div>
          </div>
      </div>

      {/* SECTION 2: Input & Keranjang - Ramping & Fungsional */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-gray-700 flex flex-col min-h-[400px]">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 border-b border-slate-50 dark:border-gray-700 pb-2 flex justify-between items-center">
              <span className="flex items-center gap-2"><ShoppingCart size={14} className="text-paper-blue"/> II. INPUT & KERANJANG</span>
              <span className="bg-paper-blue text-white px-3 py-1 rounded-full text-[9px] font-black">{cart.length} ITEM</span>
          </h3>

          {/* Quick Input Area - Ramping */}
          <div className="p-4 bg-slate-900 dark:bg-gray-900 rounded-2xl mb-6 shadow-md border border-white/5">
               <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-end">
                  
                  {/* Search Bar */}
                  <div className="flex-[3] relative" ref={dropdownRef}>
                      <label className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1.5 block ml-3">BARANG (ENTER PILIH)</label>
                      <div className="relative">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18}/>
                          <input 
                            ref={searchInputRef}
                            type="text" 
                            className={`w-full pl-11 pr-4 py-2.5 rounded-xl border-2 transition-all outline-none text-sm font-bold ${selectedItem ? 'border-paper-blue bg-paper-blue/10 text-paper-blue' : 'border-white/5 bg-white/5 text-white placeholder-white/20 focus:border-white/10'}`} 
                            value={itemSearch} 
                            onChange={e => { setItemSearch(e.target.value); setSelectedItem(null); setShowDropdown(true); setFocusedIndex(-1); }} 
                            onKeyDown={handleSearchKeyDown}
                            onFocus={() => setShowDropdown(true)}
                            placeholder="Cari SKU / Nama..." 
                          />
                          {selectedItem && (
                              <button onClick={() => { setItemSearch(''); setSelectedItem(null); setInputQty(''); searchInputRef.current?.focus(); }} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/40 hover:text-white"><X size={14}/></button>
                          )}
                      </div>
                      
                      {/* Autocomplete Dropdown - Ramping */}
                      {showDropdown && filteredItems.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-slate-100 dark:border-gray-700 z-[100] max-h-64 overflow-y-auto p-1.5 animate-in fade-in slide-in-from-top-2">
                              {filteredItems.map((item, idx) => (
                                  <div 
                                    key={item.id} 
                                    onClick={() => handleSelectItem(item)} 
                                    className={`p-3 cursor-pointer rounded-lg border-2 mb-1 flex justify-between items-center transition-all ${focusedIndex === idx ? 'bg-paper-blue border-paper-blue text-white' : 'bg-transparent border-transparent hover:bg-slate-50'}`}
                                  >
                                      <div className="flex items-center gap-3">
                                          <Package size={16} className={focusedIndex === idx ? 'text-white' : 'text-slate-300'}/>
                                          <div>
                                              <div className="text-sm font-bold uppercase">{item.name}</div>
                                              <div className="text-[9px] font-mono opacity-60 tracking-wider">{item.sku}</div>
                                          </div>
                                      </div>
                                      <div className="text-[10px] font-bold opacity-60">STOK: {item.stock}</div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>

                  {/* Qty & Unit Section - Ramping */}
                  <div className={`flex-[2] flex gap-3 items-end transition-all ${selectedItem ? 'opacity-100' : 'opacity-20 pointer-events-none'}`}>
                      <div className="w-24">
                          <label className="text-[9px] font-black text-white/40 uppercase tracking-widest block ml-3 mb-1.5">JML</label>
                          <input 
                            ref={qtyInputRef}
                            type="number" 
                            step="0.001"
                            value={inputQty} 
                            onChange={e => setInputQty(e.target.value === '' ? '' : Number(e.target.value))} 
                            onKeyDown={handleQtyKeyDown}
                            className="w-full px-3 py-2.5 bg-white/10 border-2 border-transparent focus:border-paper-blue rounded-xl text-lg font-black text-center text-white outline-none shadow-inner" 
                            placeholder="0" 
                          />
                      </div>
                      
                      <div className="w-28">
                          <label className="text-[9px] font-black text-white/40 uppercase tracking-widest block ml-3 mb-1.5">SATUAN</label>
                          <select value={selectedUnit} onChange={(e) => handleUnitChange(e.target.value)} className="w-full px-3 py-2.5 bg-white/10 border-2 border-transparent focus:border-paper-blue rounded-xl text-xs font-bold outline-none appearance-none cursor-pointer text-center text-white">
                              <option value={selectedItem?.unit} className="text-slate-900">{selectedItem?.unit}</option>
                              {selectedItem?.unit2 && <option value={selectedItem.unit2} className="text-slate-900">{selectedItem.unit2}</option>}
                              {selectedItem?.unit3 && <option value={selectedItem.unit3} className="text-slate-900">{selectedItem.unit3}</option>}
                          </select>
                      </div>
                      
                      <button onClick={addToCart} disabled={!inputQty} className="h-11 px-6 bg-paper-blue text-white font-black rounded-xl shadow-lg hover:bg-paper-blueHover disabled:opacity-20 transition-all active:scale-95 flex items-center justify-center gap-2 uppercase tracking-widest text-[10px]">
                          <Plus size={16}/> TAMBAH
                      </button>
                  </div>
               </div>
          </div>

          {/* Cart Table - Ramping & Jelas */}
          <div className="flex-1 overflow-hidden flex flex-col bg-slate-50 dark:bg-gray-900/50 rounded-xl border border-slate-100 dark:border-gray-700">
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {cart.length > 0 ? (
                      <table className="w-full text-left">
                        <thead className="bg-white dark:bg-gray-800 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-widest sticky top-0 z-10">
                            <tr>
                                <th className="p-4">BARANG</th>
                                <th className="p-4 text-center">INPUT</th>
                                <th className="p-4 text-center">QTY DASAR</th>
                                <th className="p-4 text-right">AKSI</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                            {cart.map((item, idx) => (
                                <tr key={idx} className="bg-white dark:bg-gray-800 hover:bg-slate-50 transition-all text-xs">
                                    <td className="p-4">
                                        <div className="font-bold text-slate-800 dark:text-white uppercase">{item.name}</div>
                                        <div className="text-[9px] font-mono text-slate-400 tracking-wider">{item.sku}</div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className="font-black text-paper-blue">{item.inputQty} {item.inputUnit}</span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex flex-col items-center">
                                           <div className="font-bold text-slate-600 dark:text-gray-300">{item.qty.toFixed(3)} {item.uom}</div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                        <button onClick={() => removeFromCart(idx)} className="p-2 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><Trash size={16}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                  ) : (
                      <div className="h-full flex flex-col items-center justify-center p-12 text-center opacity-20">
                          <ShoppingCart size={48} className="mb-3" />
                          <p className="text-[10px] font-black uppercase tracking-widest">Gunakan Form Input Cepat</p>
                      </div>
                  )}
              </div>

              {/* Action Bar - Ramping */}
              <div className="p-6 bg-white dark:bg-gray-800 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-6">
                      <div className="bg-slate-900 px-6 py-3 rounded-xl text-white shadow-lg">
                          <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1">TOTAL NILAI</p>
                          <h4 className="text-xl font-black tracking-tight leading-none">Rp {cart.reduce((acc, curr) => acc + curr.total, 0).toLocaleString('id-ID')}</h4>
                      </div>
                      <div className="hidden lg:block">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">OPERATOR</p>
                          <span className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-tight">{user.name}</span>
                      </div>
                  </div>
                  <div className="flex gap-3 w-full md:w-auto">
                      <button onClick={() => setMode('menu')} className="px-6 py-3 text-slate-400 font-bold hover:bg-slate-50 rounded-xl uppercase tracking-widest text-[9px]">BATAL</button>
                      <button 
                          onClick={handleSubmit} 
                          disabled={cart.length === 0} 
                          className="flex-1 md:flex-none px-10 py-3 bg-paper-blue hover:bg-paper-blueHover text-white font-black rounded-xl shadow-lg shadow-blue-500/20 disabled:opacity-30 uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-2"
                      >
                          <FileText size={16}/> SIMPAN TRANSAKSI
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
        emerald: "bg-emerald-50 text-emerald-500 border-emerald-100 dark:bg-emerald-900/10",
        rose: "bg-rose-50 text-rose-500 border-rose-100 dark:bg-rose-900/10",
    };
    return (
        <button onClick={onClick} className={`group bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border-2 border-transparent transition-all flex flex-col items-center gap-4 ${colors[color]} hover:border-current hover:shadow-lg`}>
            <div className={`p-4 rounded-xl transition-transform group-hover:scale-105 group-active:scale-95 ${colors[color]}`}>{icon}</div>
            <div className="text-center">
                <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase">{title}</h3>
                <p className="text-[9px] font-bold text-slate-400 tracking-widest uppercase">{sub}</p>
            </div>
        </button>
    );
};
