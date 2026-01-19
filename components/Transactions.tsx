import React, { useState, useEffect, useRef } from 'react';
import { InventoryItem, Transaction, TransactionItem, User } from '../types';
import { storageService } from '../services/storageService';
import { Plus, Trash, ShoppingCart, Upload, Search, AlertCircle, FileSpreadsheet, Calendar, Download, X, Zap, ZapOff, Image as ImageIcon, Package, Loader2, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRapidMode, setIsRapidMode] = useState(false);
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
  const [documentImages, setDocumentImages] = useState<string[]>([]);

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

  useEffect(() => {
    if (isRapidMode) {
      searchInputRef.current?.focus();
    }
  }, [isRapidMode]);

  const filteredItems = items.filter(i => 
    i.active && (
      i.name.toLowerCase().includes(itemSearch.toLowerCase()) || 
      i.sku.toLowerCase().includes(itemSearch.toLowerCase())
    )
  );

  const conversionRatio = (selectedItemData?.conversionUnit === selectedUOM && selectedItemData?.conversionRatio) 
      ? selectedItemData.conversionRatio 
      : 1;
  const currentQty = qty === '' ? 0 : qty;
  const actualQtyToDeduct = currentQty * conversionRatio;
  const isStockInsufficient = type === 'outbound' && selectedItemData && actualQtyToDeduct > selectedItemData.stock;

  const handleSelectItem = (item: InventoryItem) => {
      setSelectedItemId(item.id);
      setItemSearch(item.name);
      setSelectedUOM(item.unit);
      setShowDropdown(false);
      if (isRapidMode) {
        setTimeout(() => qtyInputRef.current?.focus(), 10);
      }
  };

  const addToCart = () => {
    try {
      if (!selectedItemData || qty === '' || qty <= 0) return;
      if (isStockInsufficient) {
        notify("Insufficient stock for transaction", 'error');
        return;
      }
      const unitPrice = selectedItemData.price * conversionRatio;
      const existingIndex = cart.findIndex(c => c.itemId === selectedItemId && c.uom === selectedUOM);
      if (existingIndex >= 0) {
        const updatedCart = [...cart];
        const existingItem = updatedCart[existingIndex];
        const newQty = existingItem.qty + actualQtyToDeduct;
        updatedCart[existingIndex] = { ...existingItem, qty: newQty, total: newQty * (unitPrice / conversionRatio) };
        setCart(updatedCart);
      } else {
        setCart([...cart, { itemId: selectedItemData.id, sku: selectedItemData.sku, name: selectedItemData.name, qty: actualQtyToDeduct, uom: selectedUOM, unitPrice: unitPrice, total: currentQty * unitPrice }]);
      }
      setQty(''); setSelectedItemId(''); setItemSearch(''); setSelectedUOM('');
      notify('Batch item added', 'info');
      if (isRapidMode) setTimeout(() => searchInputRef.current?.focus(), 10);
    } catch (e) {
      notify("Failed to add item", 'error');
    }
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
    notify('Batch item removed', 'info');
  };

  const handleSubmit = async () => {
    if (cart.length === 0 || isProcessing) return;
    setIsProcessing(true);
    try {
      const transaction: Transaction = { id: storageService.generateTransactionId(), type, date: new Date(customDate).toISOString(), items: cart, totalValue: cart.reduce((acc, curr) => acc + curr.total, 0), userId: user.id, supplier: type === 'inbound' ? supplier : undefined, poNumber: type === 'inbound' ? poNumber : undefined, deliveryNote: type === 'inbound' ? deliveryNote : undefined, documents: documentImages };
      await storageService.saveTransaction(transaction);
      onSuccess(); setCart([]); setSupplier(''); setPoNumber(''); setDeliveryNote(''); setDocumentImages([]);
      notify(`Transaction ${transaction.id} processed`, 'success');
    } catch (error) {
      notify("Failed to process transaction", 'error');
    } finally { setIsProcessing(false); }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      // Fix: explicitly type the file as File to fix "Property 'size' does not exist on type 'unknown'" and related inference errors.
      Array.from(files).forEach((file: File) => {
        if (file.size > 2 * 1024 * 1024) { notify(`File ${file.name} too large`, 'error'); return; }
        const reader = new FileReader();
        reader.onloadend = () => setDocumentImages(prev => [...prev, reader.result as string]);
        reader.readAsDataURL(file);
      });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
      <div className="lg:col-span-2 space-y-8">
        <div className="glass-card p-8 rounded-3xl shadow-glass">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
            <div className="flex-1 flex gap-3 w-full">
                <button 
                  onClick={() => { setType('inbound'); setCart([]); }}
                  className={`flex-1 flex items-center justify-center gap-3 py-4 px-6 rounded-2xl font-black transition-all duration-500 group ${
                    type === 'inbound' 
                      ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-xl shadow-emerald-500/30 scale-[1.03]' 
                      : 'bg-slate-100/50 dark:bg-slate-800/50 text-slate-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'
                  }`}
                >
                  <ArrowDownLeft size={24} strokeWidth={3} />
                  <span className="tracking-widest text-xs">STOCK IN</span>
                </button>

                <button 
                  onClick={() => { setType('outbound'); setCart([]); }}
                  className={`flex-1 flex items-center justify-center gap-3 py-4 px-6 rounded-2xl font-black transition-all duration-500 group ${
                    type === 'outbound' 
                      ? 'bg-gradient-to-br from-indigo-400 to-indigo-600 text-white shadow-xl shadow-indigo-500/30 scale-[1.03]' 
                      : 'bg-slate-100/50 dark:bg-slate-800/50 text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20'
                  }`}
                >
                  <ArrowUpRight size={24} strokeWidth={3} />
                  <span className="tracking-widest text-xs">STOCK OUT</span>
                </button>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
                <button 
                  onClick={() => setIsRapidMode(!isRapidMode)}
                  className={`flex items-center gap-2 rounded-full border px-4 py-2 text-[10px] font-black tracking-widest transition-all duration-300 ${isRapidMode ? 'bg-amber-500 text-white border-amber-600 shadow-lg shadow-amber-500/20' : 'bg-slate-100/50 dark:bg-slate-800/50 border-slate-200/50 dark:border-slate-700/50 text-slate-500'}`}
                >
                  {isRapidMode ? <Zap size={14} className="fill-white" /> : <ZapOff size={14} />}
                  RAPID INPUT
                </button>

                <div className="relative flex-1 md:w-48">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                    <input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all font-bold text-slate-800 dark:text-slate-100 text-xs" />
                </div>
            </div>
          </div>

          <div className="space-y-6">
            {type === 'inbound' && (
              <div className="space-y-4 animate-slide-up">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 bg-white/30 dark:bg-slate-900/30 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Supplier</label>
                    <input value={supplier} onChange={e => setSupplier(e.target.value)} className="w-full p-2.5 bg-white/70 dark:bg-slate-800/70 border border-slate-200/50 dark:border-slate-700/50 rounded-xl text-sm outline-none" placeholder="Vendor" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">PO #</label>
                    <input value={poNumber} onChange={e => setPoNumber(e.target.value)} className="w-full p-2.5 bg-white/70 dark:bg-slate-800/70 border border-slate-200/50 dark:border-slate-700/50 rounded-xl text-sm outline-none" placeholder="P-000" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">SJ #</label>
                    <input value={deliveryNote} onChange={e => setDeliveryNote(e.target.value)} className="w-full p-2.5 bg-white/70 dark:bg-slate-800/70 border border-slate-200/50 dark:border-slate-700/50 rounded-xl text-sm outline-none" placeholder="SJ-000" />
                  </div>
                </div>

                <div className="p-5 bg-white/30 dark:bg-slate-900/30 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
                    <div className="flex justify-between items-center mb-4">
                        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Attachments ({documentImages.length})</label>
                        <div className="relative">
                            <input type="file" multiple accept="image/*" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                            <button className="flex items-center gap-1.5 text-[10px] text-primary font-black uppercase hover:underline"><Plus size={14} /> Add Photos</button>
                        </div>
                    </div>
                    {documentImages.length > 0 ? (
                        <div className="flex flex-wrap gap-4">
                            {documentImages.map((img, idx) => (
                                <div key={idx} className="relative w-20 h-20 group">
                                    <img src={img} className="w-full h-full object-cover rounded-xl border border-white shadow-xl" alt="Attachment" />
                                    <button onClick={() => setDocumentImages(prev => prev.filter((_, i) => i !== idx))} className="absolute -top-2 -right-2 bg-rose-500 text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"><X size={10} /></button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl py-8 flex flex-col items-center justify-center text-slate-400 opacity-50">
                            <ImageIcon size={32} strokeWidth={1.5} className="mb-2" />
                            <p className="text-[10px] font-bold uppercase tracking-widest">No Documents</p>
                        </div>
                    )}
                </div>
              </div>
            )}

            <div className="flex flex-col md:flex-row gap-4 items-end z-20 relative">
              <div className="flex-1 w-full relative" ref={dropdownRef}>
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Quick Search</label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input ref={searchInputRef} type="text" placeholder="SKU / Name" className={`w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border rounded-2xl text-sm font-bold focus:ring-4 transition-all ${isStockInsufficient ? 'border-rose-400 ring-rose-500/10' : 'border-slate-200/50 dark:border-slate-700/50 focus:ring-primary/10'}`} value={itemSearch} onKeyDown={e => e.key === 'Enter' && filteredItems.length === 1 && handleSelectItem(filteredItems[0])} onChange={(e) => { setItemSearch(e.target.value); setShowDropdown(true); if (selectedItemId) setSelectedItemId(''); }} />
                </div>
                {showDropdown && itemSearch && !selectedItemId && (
                    <div className="absolute top-full left-0 right-0 mt-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/50 dark:border-slate-700/50 max-h-60 overflow-y-auto z-50 animate-slide-up">
                        {filteredItems.length > 0 ? filteredItems.map(item => (
                            <div key={item.id} onClick={() => handleSelectItem(item)} className="p-4 hover:bg-primary/10 cursor-pointer border-b border-slate-50 dark:border-slate-800 last:border-none flex justify-between items-center transition-colors">
                                <div><p className="font-black text-sm text-slate-800 dark:text-slate-100">{item.name}</p><p className="text-[9px] font-bold text-slate-400 uppercase">{item.sku} • {item.category}</p></div>
                                <div className="text-right"><p className={`text-xs font-black ${item.stock <= item.minLevel ? 'text-rose-500' : 'text-emerald-500'}`}>{item.stock} {item.unit}</p></div>
                            </div>
                        )) : <div className="p-6 text-center text-xs text-slate-400 font-bold italic">Item not found</div>}
                    </div>
                )}
              </div>

              <div className="w-full md:w-32">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 mb-1 block">UOM</label>
                <select value={selectedUOM} onChange={(e) => setSelectedUOM(e.target.value)} disabled={!selectedItemData} className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl text-xs font-black focus:ring-4 focus:ring-primary/10 transition-all outline-none disabled:opacity-30">
                    {selectedItemData ? (<><option value={selectedItemData.unit}>{selectedItemData.unit}</option>{selectedItemData.conversionUnit && <option value={selectedItemData.conversionUnit}>{selectedItemData.conversionUnit}</option>}</>) : <option value="">-</option>}
                </select>
              </div>
              
              <div className="w-full md:w-28">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Qty</label>
                <input ref={qtyInputRef} type="number" min="1" value={qty} placeholder="0" onChange={(e) => setQty(e.target.value === '' ? '' : parseInt(e.target.value))} onKeyDown={(e) => e.key === 'Enter' && addToCart()} className={`w-full p-3 bg-white dark:bg-slate-800 border rounded-2xl text-sm font-black text-center outline-none transition-all ${isStockInsufficient ? 'border-rose-400 ring-rose-500/10' : 'border-slate-200/50 dark:border-slate-700/50 focus:ring-4 focus:ring-primary/10'}`} />
              </div>

              <button onClick={addToCart} disabled={!selectedItemId || qty === '' || qty <= 0} className="w-full md:w-auto px-8 py-3 bg-primary text-white font-black rounded-2xl hover:bg-blue-600 disabled:opacity-30 transition-all shadow-lg shadow-primary/30 active:scale-95 text-xs tracking-widest">ADD</button>
            </div>
            {isStockInsufficient && <div className="flex items-center gap-2 text-rose-500 bg-rose-50/50 dark:bg-rose-950/20 p-3 rounded-xl border border-rose-100/50 dark:border-rose-800/50 text-[10px] font-black uppercase"><AlertCircle size={14} /> Insufficient stock: Max {Math.floor(selectedItemData.stock / conversionRatio)} {selectedUOM}</div>}
          </div>
        </div>
      </div>

      <div className="glass-card rounded-3xl shadow-glass flex flex-col h-[calc(100vh-140px)] sticky top-24 overflow-hidden border border-white/20">
        <div className="p-6 border-b border-slate-200/50 dark:border-slate-800/50 bg-white/20 dark:bg-slate-900/20 flex justify-between items-center">
          <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2 text-sm tracking-tight"><ShoppingCart size={18} className="text-primary" /> BATCH QUEUE</h3>
          <span className="bg-primary text-white text-[10px] px-2.5 py-1 rounded-full font-black shadow-md">{cart.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-30 px-6 text-center animate-pulse">
                <Package size={56} strokeWidth={1} className="mb-4" />
                <p className="text-[10px] font-black tracking-widest uppercase">Cart is Empty</p>
            </div>
          ) : cart.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center p-4 bg-white/50 dark:bg-slate-800/50 rounded-2xl border border-slate-100/50 dark:border-slate-700/50 hover:shadow-md transition-all group animate-slide-in-right">
              <div><p className="font-black text-xs text-slate-800 dark:text-slate-100 tracking-tight">{item.name}</p><p className="text-[10px] font-bold text-slate-400 uppercase">{item.qty} {item.uom} • Rp {item.total.toLocaleString('id-ID')}</p></div>
              <button onClick={() => removeFromCart(idx)} className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-xl transition-all"><Trash size={16} /></button>
            </div>
          ))}
        </div>
        <div className="p-6 border-t border-slate-200/50 dark:border-slate-800/50 bg-white/20 dark:bg-slate-900/20">
          <div className="flex justify-between items-center mb-6 px-1">
              <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Total Value</span>
              <span className="font-black text-primary text-lg tracking-tight">Rp {cart.reduce((acc, curr) => acc + curr.total, 0).toLocaleString('id-ID')}</span>
          </div>
          <button onClick={handleSubmit} disabled={cart.length === 0 || isProcessing} className={`w-full py-4 font-black rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 text-sm tracking-widest uppercase ${type === 'inbound' ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/30' : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-indigo-500/30'} disabled:opacity-30`}>
            {isProcessing ? <Loader2 size={20} className="animate-spin" /> : `PROCESS ${type}`}
          </button>
        </div>
      </div>
    </div>
  );
};