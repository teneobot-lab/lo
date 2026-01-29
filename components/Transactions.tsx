
import React, { useState, useEffect, useRef } from 'react';
import { InventoryItem, Transaction, TransactionItem, User } from '../types';
import { storageService } from '../services/storageService';
import { geminiService } from '../services/geminiService';
import { Plus, Trash, ShoppingCart, Upload, Search, FileSpreadsheet, Calendar, ArrowDownCircle, ArrowUpCircle, Loader2, Camera, X, FileText, Image as ImageIcon, ScanText, Building2, ArrowRightLeft, ArrowLeft } from 'lucide-react';
import { ToastType } from './Toast';
import * as XLSX from 'xlsx';

interface TransactionsProps {
  items: InventoryItem[];
  user: User;
  onSuccess: () => void;
  notify: (msg: string, type: ToastType) => void;
}

type TransactionMode = 'menu' | 'inbound' | 'outbound' | 'transfer';

export const Transactions: React.FC<TransactionsProps> = ({ items, user, onSuccess, notify }) => {
  const [mode, setMode] = useState<TransactionMode>('menu');
  const [cart, setCart] = useState<TransactionItem[]>([]);
  const [itemSearch, setItemSearch] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [qty, setQty] = useState<number | ''>('');
  const [selectedUOM, setSelectedUOM] = useState(''); 
  const [customDate, setCustomDate] = useState(new Date().toISOString().slice(0, 10));
  const [warehouse, setWarehouse] = useState('Gudang Utama');
  const [targetWarehouse, setTargetWarehouse] = useState('Gudang Cabang A');
  const [supplier, setSupplier] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [documentImages, setDocumentImages] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const selectedItemData = items.find(i => i.id === selectedItemId);
  const filteredItems = items.filter(i => i.active && (i.name.toLowerCase().includes(itemSearch.toLowerCase()) || i.sku.toLowerCase().includes(itemSearch.toLowerCase()))).slice(0, 8);

  const addToCart = () => {
    if (!selectedItemData || qty === '' || qty <= 0) return;
    const newItem: TransactionItem = { 
        itemId: selectedItemData.id, sku: selectedItemData.sku, name: selectedItemData.name, 
        qty: Number(qty), uom: selectedUOM, unitPrice: selectedItemData.price, 
        total: Number(qty) * selectedItemData.price 
    };
    setCart([...cart, newItem]);
    setQty(''); setItemSearch(''); setSelectedItemId(''); notify('Item ditambahkan', 'info');
  };

  const handleSubmit = async () => {
    if (cart.length === 0) return;
    const transaction: Transaction = { 
        id: storageService.generateTransactionId(), 
        type: mode as 'inbound' | 'outbound' | 'transfer', 
        date: `${customDate} ${new Date().toTimeString().split(' ')[0]}`, 
        warehouse, 
        targetWarehouse: mode === 'transfer' ? targetWarehouse : undefined,
        items: cart, 
        totalValue: cart.reduce((acc, curr) => acc + curr.total, 0), 
        userId: user.id || 'admin', 
        supplier, poNumber, notes, documents: documentImages 
    };
    try { 
        await storageService.saveTransaction(transaction); 
        notify(`Berhasil: ${transaction.id}`, 'success'); onSuccess(); 
    } catch (e) { notify("Gagal simpan", 'error'); }
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-100px)] animate-in slide-in-from-bottom-4 duration-500">
      {/* Form Panel */}
      <div className="lg:col-span-2 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-paper border border-slate-200 dark:border-gray-700">
          <div className="flex items-center gap-4 mb-8">
              <button onClick={() => setMode('menu')} className="p-2.5 bg-slate-50 dark:bg-gray-700 hover:bg-slate-100 rounded-xl transition-all"><ArrowLeft size={22} className="text-slate-600 dark:text-gray-300"/></button>
              <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Input Mutasi {mode}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
              <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Dari Gudang / Lokasi</label>
                  <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                      <select value={warehouse} onChange={e => setWarehouse(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-paper-blue outline-none appearance-none cursor-pointer dark:text-white">
                          <option>Gudang Utama</option><option>Gudang Cabang A</option><option>Gudang Reject</option>
                      </select>
                  </div>
              </div>
              {mode === 'transfer' && (
                  <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Tujuan Mutasi</label>
                      <div className="relative">
                          <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                          <select value={targetWarehouse} onChange={e => setTargetWarehouse(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-paper-blue outline-none appearance-none cursor-pointer dark:text-white">
                              <option>Gudang Cabang A</option><option>Gudang Utama</option><option>Gudang Reject</option>
                          </select>
                      </div>
                  </div>
              )}
          </div>

          {/* Item Search Bar */}
          <div className="p-6 bg-slate-50 dark:bg-gray-900/50 rounded-2xl border border-slate-200 dark:border-gray-700 mb-8 space-y-4">
              <div className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex-1 w-full relative">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Cari Barang</label>
                      <div className="relative">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                          <input type="text" className="w-full pl-12 pr-4 py-3 border border-slate-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-paper-blue outline-none transition-all dark:bg-gray-800 dark:text-white" value={itemSearch} onChange={e => { setItemSearch(e.target.value); setShowDropdown(true); }} placeholder="Ketik SKU atau Nama Barang..." />
                      </div>
                      {showDropdown && itemSearch && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-slate-100 dark:border-gray-700 z-50 max-h-56 overflow-y-auto">
                              {filteredItems.map(item => (
                                  <div key={item.id} onClick={() => { setSelectedItemId(item.id); setItemSearch(item.name); setSelectedUOM(item.unit); setShowDropdown(false); }} className="p-4 hover:bg-slate-50 dark:hover:bg-gray-700 cursor-pointer border-b last:border-0 border-slate-50 dark:border-gray-700 flex justify-between items-center group">
                                      <div>
                                          <div className="font-bold text-slate-800 dark:text-white group-hover:text-paper-blue">{item.name}</div>
                                          <div className="text-[10px] font-mono text-slate-400">{item.sku}</div>
                                      </div>
                                      <div className="text-xs font-bold text-slate-400">Stok: {item.stock}</div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
                  <div className="w-full md:w-32">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Qty</label>
                      <input type="number" value={qty} onChange={e => setQty(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-3 border border-slate-200 dark:border-gray-700 rounded-xl text-sm font-black text-center text-paper-blue focus:ring-2 focus:ring-paper-blue outline-none dark:bg-gray-800" placeholder="0" />
                  </div>
                  <button onClick={addToCart} disabled={!selectedItemId || !qty} className="px-8 py-3 bg-paper-blue text-white font-bold rounded-xl shadow-lg hover:bg-paper-blueHover disabled:opacity-50 transition-all active:scale-95"><Plus size={20}/></button>
              </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Tanggal Transaksi</label><input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)} className="w-full p-3 border border-slate-200 dark:border-gray-700 rounded-xl text-sm outline-none dark:bg-gray-900 dark:text-white dark:[color-scheme:dark]" /></div>
              <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Pihak Terkait (Supplier/Customer)</label><input value={supplier} onChange={e => setSupplier(e.target.value)} className="w-full p-3 border border-slate-200 dark:border-gray-700 rounded-xl text-sm outline-none dark:bg-gray-900 dark:text-white" placeholder="Nama..." /></div>
          </div>
        </div>
      </div>

      {/* Invoice Panel */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-paper border border-slate-200 dark:border-gray-700 flex flex-col h-full overflow-hidden transition-colors">
          <div className="p-6 bg-slate-50 dark:bg-gray-700/50 border-b border-slate-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-2"><ShoppingCart size={20}/> Rincian Antrean</h3>
              <div className="px-3 py-1 bg-white dark:bg-gray-900 rounded-full text-xs font-bold text-paper-blue border border-slate-100 dark:border-gray-700">{cart.length} Item</div>
          </div>
          <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-gray-800 border-b border-slate-100 dark:border-gray-700 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <tr><th className="p-4">Item Mutasi</th><th className="p-4 text-center">Qty</th><th className="p-4"></th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-gray-700">
                      {cart.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors">
                              <td className="p-4">
                                  <div className="font-bold text-sm text-slate-800 dark:text-white">{item.name}</div>
                                  <div className="text-[10px] font-mono text-slate-400">{item.sku}</div>
                              </td>
                              <td className="p-4 text-center font-black text-paper-blue text-sm">{item.qty} <span className="text-[10px] text-slate-400">{item.uom}</span></td>
                              <td className="p-4 text-right"><button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="p-2 text-slate-300 hover:text-rose-500 rounded-lg"><Trash size={16}/></button></td>
                          </tr>
                      ))}
                      {cart.length === 0 && <tr><td colSpan={3} className="p-12 text-center text-slate-300 dark:text-gray-500 italic text-sm">Belum ada barang di rincian.</td></tr>}
                  </tbody>
              </table>
          </div>
          <div className="p-6 bg-slate-50 dark:bg-gray-700/50 border-t border-slate-200 dark:border-gray-700">
              <button onClick={handleSubmit} disabled={cart.length === 0} className="w-full py-4 bg-paper-blue hover:bg-paper-blueHover text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50">
                  <FileText size={20}/> SELESAIKAN MUTASI
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
