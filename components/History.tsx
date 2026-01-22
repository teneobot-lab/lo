
import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Transaction, InventoryItem, TransactionItem } from '../types';
import { Download, ChevronDown, Calendar, Search, X, Save, Edit2, Trash2, LineChart, Package, FileText, ImageIcon, ExternalLink, DownloadCloud, Layers, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { storageService } from '../services/storageService';

interface HistoryProps {
  transactions: Transaction[];
  items: InventoryItem[]; 
  onRefresh: () => void;
}

export const History: React.FC<HistoryProps> = ({ transactions, items, onRefresh }) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  const [isStockCardOpen, setIsStockCardOpen] = useState(false);
  const [scStartDate, setScStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [scEndDate, setScEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [scSearchItem, setScSearchItem] = useState('');
  const [scSelectedItem, setScSelectedItem] = useState<InventoryItem | null>(null);
  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
              setIsAutocompleteOpen(false);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const getDisplayQty = (tItem: TransactionItem) => {
      const master = items.find(i => i.id === tItem.itemId);
      if (!master) return tItem.qty;
      const ratio = getConversionFactor(master, tItem.uom);
      return parseFloat((tItem.qty / ratio).toFixed(2));
  };

  const filtered = transactions.filter(t => {
      const matchType = filterType === 'all' || t.type === filterType;
      const tDate = new Date(t.date).getTime();
      const sDate = startDate ? new Date(startDate).getTime() : 0;
      const eDate = endDate ? new Date(endDate).setHours(23,59,59,999) : Infinity;
      const matchDate = tDate >= sDate && tDate <= eDate;
      const query = searchQuery.toLowerCase();
      return matchType && matchDate && ((t.id || "").toLowerCase().includes(query) || (t.supplier || "").toLowerCase().includes(query) || (t.notes || "").toLowerCase().includes(query));
  });

  const filteredItemsForSC = useMemo(() => {
      if (!scSearchItem) return [];
      return items.filter(i => i.name.toLowerCase().includes(scSearchItem.toLowerCase()) || i.sku.toLowerCase().includes(scSearchItem.toLowerCase())).slice(0, 10);
  }, [scSearchItem, items]);

  const calculateItemMovement = (item: InventoryItem, startStr: string, endStr: string) => {
      const start = new Date(startStr); start.setHours(0,0,0,0);
      const end = new Date(endStr); end.setHours(23,59,59,999);
      
      // Hitung stok awal (revert semua transaksi setelah tanggal start)
      let openingStock = item.stock;
      const allItemTrans = transactions
        .filter(t => t.items.some(i => i.itemId === item.id))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); 
      
      allItemTrans.forEach(t => {
          const tDate = new Date(t.date);
          if (tDate >= start) {
              const it = t.items.find(i => i.itemId === item.id);
              if (it) { 
                if (t.type === 'inbound') openingStock -= it.qty; 
                else openingStock += it.qty; 
              }
          }
      });

      const periodTrans = allItemTrans
        .filter(t => { const d = new Date(t.date); return d >= start && d <= end; })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); 
      
      let runningBalance = openingStock;
      let totalIn = 0; let totalOut = 0;
      const rows = periodTrans.map(t => {
          const it = t.items.find(i => i.itemId === item.id);
          const qty = it ? it.qty : 0;
          let inQty = 0; let outQty = 0;
          if (t.type === 'inbound') { inQty = qty; totalIn += qty; runningBalance += qty; }
          else { outQty = qty; totalOut += qty; runningBalance -= qty; }
          return { 
            date: t.date, 
            id: t.id, 
            type: t.type, 
            ref: t.poNumber || t.deliveryNote || '-', 
            in: inQty, 
            out: outQty, 
            balance: runningBalance, 
            uom: it?.uom || item.unit,
            supplier: t.supplier || '-'
          };
      });
      return { openingStock, closingStock: runningBalance, totalIn, totalOut, rows };
  };

  const stockCardData = useMemo(() => {
      if (!scSelectedItem) return null;
      return calculateItemMovement(scSelectedItem, scStartDate, scEndDate);
  }, [scSelectedItem, scStartDate, scEndDate, transactions]);

  const handleDelete = async (id: string) => {
      if (window.confirm("Hapus transaksi ini?")) {
          try { await storageService.deleteTransaction(id); onRefresh(); } catch (err) { alert("Error deleting"); }
      }
  };

  const handleEditClick = (t: Transaction) => { setEditingTransaction(JSON.parse(JSON.stringify(t))); setIsEditModalOpen(true); };
  const handleUpdate = async (updatedTx: Transaction) => {
     if (editingTransaction) {
         try { await storageService.updateTransaction(editingTransaction, updatedTx); setIsEditModalOpen(false); onRefresh(); } catch (err) { alert("Error updating"); }
     }
  };

  const selectSCItem = (it: InventoryItem) => {
      setScSelectedItem(it);
      setScSearchItem(it.name);
      setIsAutocompleteOpen(false);
      setActiveIndex(-1);
  };

  const handleSCKeyDown = (e: React.KeyboardEvent) => {
      if (!isAutocompleteOpen || filteredItemsForSC.length === 0) return;
      if (e.key === 'ArrowDown') {
          e.preventDefault();
          setActiveIndex(prev => (prev + 1) % filteredItemsForSC.length);
      } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setActiveIndex(prev => (prev - 1 + filteredItemsForSC.length) % filteredItemsForSC.length);
      } else if (e.key === 'Enter' && activeIndex >= 0) {
          e.preventDefault();
          selectSCItem(filteredItemsForSC[activeIndex]);
      } else if (e.key === 'Escape') {
          setIsAutocompleteOpen(false);
      }
  };

  // FIX: Implementation of handleAdvancedExport for Stock Card reporting
  const handleAdvancedExport = (mode: 'single') => {
      if (!scSelectedItem || !stockCardData) return;

      const exportData = stockCardData.rows.map(row => ({
          'Tanggal': new Date(row.date).toLocaleString('id-ID'),
          'ID Transaksi': row.id,
          'Tipe': row.type.toUpperCase(),
          'Referensi': row.ref,
          'Supplier/Client': row.supplier,
          'Masuk': row.in || 0,
          'Keluar': row.out || 0,
          'Saldo': row.balance,
          'Satuan': row.uom
      }));

      const summary = [
          { 'Keterangan': 'Nama Barang', 'Nilai': scSelectedItem.name },
          { 'Keterangan': 'SKU', 'Nilai': scSelectedItem.sku },
          { 'Keterangan': 'Periode', 'Nilai': `${scStartDate} s/d ${scEndDate}` },
          { 'Keterangan': 'Satuan Dasar', 'Nilai': scSelectedItem.unit },
          { 'Keterangan': 'Stok Awal', 'Nilai': stockCardData.openingStock },
          { 'Keterangan': 'Total Masuk', 'Nilai': stockCardData.totalIn },
          { 'Keterangan': 'Total Keluar', 'Nilai': stockCardData.totalOut },
          { 'Keterangan': 'Stok Akhir', 'Nilai': stockCardData.closingStock }
      ];

      const wb = XLSX.utils.book_new();
      const wsSummary = XLSX.utils.json_to_sheet(summary);
      const wsDetails = XLSX.utils.json_to_sheet(exportData);
      
      XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan");
      XLSX.utils.book_append_sheet(wb, wsDetails, "Detail Pergerakan");
      
      XLSX.writeFile(wb, `Kartu_Stok_${scSelectedItem.sku}_${scStartDate}_${scEndDate}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-soft border border-ice-100 dark:border-gray-700">
        <div className="relative w-full xl:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="text" placeholder="Cari ID, Barang, Supplier..." className="w-full pl-10 pr-4 py-2.5 bg-ice-50 dark:bg-gray-900 border border-ice-200 dark:border-gray-700 rounded-xl focus:outline-none text-sm dark:text-white" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            <select className="bg-ice-50 dark:bg-gray-900 border border-ice-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm dark:text-white" value={filterType} onChange={(e) => setFilterType(e.target.value)}><option value="all">Semua Tipe</option><option value="inbound">Inbound</option><option value="outbound">Outbound</option></select>
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-gray-400 bg-ice-50 dark:bg-gray-900 border border-ice-200 px-3 py-2.5 rounded-xl"><Calendar size={14} /><input type="date" className="bg-transparent focus:outline-none dark:invert" value={startDate} onChange={e => setStartDate(e.target.value)} /><span>sd</span><input type="date" className="bg-transparent focus:outline-none dark:invert" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
            <button onClick={() => setIsStockCardOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-xl hover:bg-indigo-100 font-bold text-sm"><LineChart size={16} /> Kartu Stok</button>
            <button onClick={() => { const ws = XLSX.utils.json_to_sheet(filtered.map(t => ({ ID: t.id, Tipe: t.type, Tanggal: t.date, Total: t.totalValue }))); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "History"); XLSX.writeFile(wb, `History.xlsx`); }} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-lg font-bold text-sm ml-auto xl:ml-0"><Download size={16} /> Export Data</button>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-soft border border-ice-100 dark:border-gray-700 overflow-hidden flex flex-col max-h-[calc(100vh-240px)]">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left relative border-collapse">
            <thead className="bg-slate-50 dark:bg-gray-800 border-b border-ice-200 dark:border-gray-700 text-[10px] font-bold text-slate-500 uppercase tracking-widest sticky top-0 z-10">
              <tr><th className="p-4">ID Transaksi</th><th className="p-4">Tipe</th><th className="p-4">Tanggal</th><th className="p-4">Supplier / PO</th><th className="p-4">Ringkasan Barang</th><th className="p-4 text-right">Total Nilai</th><th className="p-4 text-right">Aksi</th></tr>
            </thead>
            <tbody className="divide-y divide-ice-50 dark:divide-gray-700">
              {filtered.map(t => (
                  <tr key={t.id} className="hover:bg-ice-50/50 dark:hover:bg-gray-700/50 transition-colors text-sm">
                      <td className="p-4 font-bold text-slate-800 dark:text-white">{t.id}</td>
                      <td className="p-4"><span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${t.type === 'inbound' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{t.type}</span></td>
                      <td className="p-4 text-slate-600 dark:text-gray-400">{new Date(t.date).toLocaleString()}</td>
                      <td className="p-4 text-slate-500 font-medium">{t.supplier || t.poNumber || '-'}</td>
                      <td className="p-4">
                          <div className="flex flex-col gap-0.5">
                              {t.items.slice(0, 2).map((it, idx) => (<span key={idx} className="text-[11px] truncate w-40 text-slate-600 dark:text-gray-400">• {it.name} ({getDisplayQty(it)} {it.uom})</span>))}
                              {t.items.length > 2 && <span className="text-[10px] text-slate-400">+{t.items.length - 2} lainnya...</span>}
                          </div>
                      </td>
                      <td className="p-4 text-right font-bold text-slate-800 dark:text-gray-200">Rp {t.totalValue.toLocaleString()}</td>
                      <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                              <button onClick={() => handleEditClick(t)} className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg transition-all"><Edit2 size={16} /></button>
                              <button onClick={() => handleDelete(t.id)} className="p-2 text-slate-400 hover:text-rose-600 rounded-lg transition-all"><Trash2 size={16} /></button>
                          </div>
                      </td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isStockCardOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in zoom-in duration-200">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-7xl overflow-hidden flex flex-col max-h-[95vh] border border-white/20">
                <div className="p-6 border-b border-ice-100 dark:border-gray-800 flex justify-between items-center bg-indigo-50 dark:bg-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-white dark:bg-indigo-900/50 rounded-xl shadow-sm text-indigo-600 dark:text-indigo-400">
                            <LineChart size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-xl text-slate-800 dark:text-white">Analisa Kartu Stok</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Lacak pergerakan stok per barang secara detail</p>
                        </div>
                    </div>
                    <button onClick={() => setIsStockCardOpen(false)} className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-full transition-all">
                        <X className="text-slate-400" />
                    </button>
                </div>
                
                <div className="p-6 bg-slate-50 dark:bg-gray-950 grid grid-cols-1 md:grid-cols-4 gap-4 items-end border-b border-ice-100 dark:border-gray-800">
                    <div className="md:col-span-2 relative" ref={autocompleteRef}>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Cari Barang Inventaris</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                                type="text" 
                                className="w-full pl-10 pr-4 py-3 border rounded-xl dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-300 transition-all shadow-sm" 
                                placeholder="Ketik Nama atau SKU Barang..." 
                                value={scSearchItem} 
                                onChange={e => { setScSearchItem(e.target.value); setIsAutocompleteOpen(true); setActiveIndex(-1); }} 
                                onFocus={() => setIsAutocompleteOpen(true)} 
                                onKeyDown={handleSCKeyDown} 
                            />
                        </div>
                        {isAutocompleteOpen && scSearchItem && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-ice-100 dark:border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                {filteredItemsForSC.length > 0 ? filteredItemsForSC.map((it, idx) => (
                                    <div key={it.id} onMouseEnter={() => setActiveIndex(idx)} onClick={() => selectSCItem(it)} className={`p-4 cursor-pointer border-b last:border-0 dark:text-white transition-colors ${activeIndex === idx ? 'bg-indigo-50 dark:bg-indigo-900/40' : 'hover:bg-slate-50 dark:hover:bg-gray-700'}`}>
                                        <div className="font-bold text-sm">{it.name}</div>
                                        <div className="text-[10px] text-slate-400 font-mono tracking-wider">{it.sku} | Unit Dasar: {it.unit}</div>
                                    </div>
                                )) : <div className="p-4 text-xs text-slate-400 italic">Barang tidak ditemukan.</div>}
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Periode Dari</label>
                        <input type="date" value={scStartDate} onChange={e => setScStartDate(e.target.value)} className="w-full p-3 border rounded-xl dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-300 shadow-sm" />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Sampai Dengan</label>
                        <input type="date" value={scEndDate} onChange={e => setScEndDate(e.target.value)} className="w-full p-3 border rounded-xl dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-300 shadow-sm" />
                    </div>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col bg-white dark:bg-gray-900">
                    {scSelectedItem && stockCardData ? (
                        <div className="flex flex-col h-full animate-in fade-in slide-in-from-top-4 duration-500">
                            {/* Summary Boxes */}
                            <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4 bg-white dark:bg-gray-900">
                                <div className="p-4 bg-slate-50 dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-700 shadow-sm">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">STOK AWAL</p>
                                    <p className="text-2xl font-black text-slate-700 dark:text-white tracking-tight">{stockCardData.openingStock} <span className="text-xs font-bold text-slate-400 uppercase">{scSelectedItem.unit}</span></p>
                                </div>
                                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800/30 shadow-sm">
                                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">TOTAL MASUK</p>
                                    <div className="flex items-center gap-2">
                                        <ArrowDownLeft size={16} className="text-emerald-500"/>
                                        <p className="text-2xl font-black text-emerald-600">+{stockCardData.totalIn}</p>
                                    </div>
                                </div>
                                <div className="p-4 bg-rose-50 dark:bg-rose-900/20 rounded-2xl border border-rose-100 dark:border-rose-800/30 shadow-sm">
                                    <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest mb-1">TOTAL KELUAR</p>
                                    <div className="flex items-center gap-2">
                                        <ArrowUpRight size={16} className="text-rose-500"/>
                                        <p className="text-2xl font-black text-rose-600">-{stockCardData.totalOut}</p>
                                    </div>
                                </div>
                                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/30 shadow-sm">
                                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-1">STOK AKHIR</p>
                                    <p className="text-2xl font-black text-indigo-700 dark:text-indigo-300 tracking-tight">{stockCardData.closingStock} <span className="text-xs font-bold text-indigo-400 uppercase">{scSelectedItem.unit}</span></p>
                                </div>
                            </div>

                            {/* Table with Sticky Header and Proper Scroll */}
                            <div className="flex-1 overflow-auto custom-scrollbar px-6 pb-6">
                                <table className="w-full text-left border-separate border-spacing-0">
                                    <thead className="sticky top-0 z-20 bg-slate-50 dark:bg-gray-800 border-b border-ice-100 dark:border-gray-700">
                                        <tr className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                            <th className="p-4 bg-slate-50 dark:bg-gray-800 border-b border-ice-100 dark:border-gray-700 rounded-tl-xl">Tanggal & Waktu</th>
                                            <th className="p-4 bg-slate-50 dark:bg-gray-800 border-b border-ice-100 dark:border-gray-700">ID Transaksi / Ref</th>
                                            <th className="p-4 bg-slate-50 dark:bg-gray-800 border-b border-ice-100 dark:border-gray-700">Supplier / Client</th>
                                            <th className="p-4 bg-slate-50 dark:bg-gray-800 border-b border-ice-100 dark:border-gray-700 text-center">Masuk</th>
                                            <th className="p-4 bg-slate-50 dark:bg-gray-800 border-b border-ice-100 dark:border-gray-700 text-center">Keluar</th>
                                            <th className="p-4 bg-slate-50 dark:bg-gray-800 border-b border-ice-100 dark:border-gray-700 text-center rounded-tr-xl">Saldo Running</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                                        {/* Awal Saldo baris virtual */}
                                        <tr className="bg-slate-50/30 dark:bg-gray-800/30 italic">
                                            <td className="p-4 text-xs text-slate-400">-</td>
                                            <td className="p-4 text-xs font-bold text-slate-400">SALDO AWAL PERIODE</td>
                                            <td className="p-4 text-xs text-slate-400">-</td>
                                            <td className="p-4 text-center text-slate-400">-</td>
                                            <td className="p-4 text-center text-slate-400">-</td>
                                            <td className="p-4 text-center font-bold text-slate-500">{stockCardData.openingStock} {scSelectedItem.unit}</td>
                                        </tr>
                                        {stockCardData.rows.length > 0 ? stockCardData.rows.map((row, idx) => (
                                            <tr key={idx} className="dark:text-gray-300 hover:bg-slate-50/50 dark:hover:bg-gray-800/30 transition-colors">
                                                <td className="p-4 text-sm font-medium">{new Date(row.date).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                                                <td className="p-4">
                                                    <div className="text-xs font-mono font-bold text-slate-700 dark:text-indigo-400">{row.id}</div>
                                                    <div className="text-[9px] text-slate-400 tracking-wider">REF: {row.ref}</div>
                                                </td>
                                                <td className="p-4 text-xs text-slate-600 dark:text-gray-400 truncate max-w-[150px]">{row.supplier}</td>
                                                <td className="p-4 text-center">
                                                    {row.in > 0 ? (
                                                        <span className="px-2 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-bold">
                                                            +{row.in}
                                                        </span>
                                                    ) : '-'}
                                                </td>
                                                <td className="p-4 text-center">
                                                    {row.out > 0 ? (
                                                        <span className="px-2 py-1 bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 rounded-lg text-xs font-bold">
                                                            -{row.out}
                                                        </span>
                                                    ) : '-'}
                                                </td>
                                                <td className="p-4 text-center font-bold bg-slate-50/20 dark:bg-gray-800/50 text-indigo-700 dark:text-indigo-300 border-l border-slate-100 dark:border-gray-800">
                                                    {row.balance} <span className="text-[9px] font-bold uppercase">{scSelectedItem.unit}</span>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={6} className="p-12 text-center text-slate-400 italic text-sm">
                                                    Tidak ada transaksi ditemukan pada periode ini untuk barang tersebut.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center p-12 space-y-4">
                            <div className="w-24 h-24 bg-slate-50 dark:bg-gray-800 rounded-full flex items-center justify-center text-slate-200 dark:text-slate-700">
                                <Package size={48} />
                            </div>
                            <div>
                                <h4 className="text-xl font-bold text-slate-700 dark:text-white">Pilih Barang Dulu Bang</h4>
                                <p className="text-sm text-slate-400 max-w-xs mx-auto mt-1">Gunakan kotak pencarian di atas untuk memilih barang yang ingin dianalisa riwayat stoknya.</p>
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="p-6 border-t border-ice-100 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 flex justify-between items-center">
                    <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Masuk</div>
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-500"></div> Keluar</div>
                    </div>
                    <button 
                        onClick={() => handleAdvancedExport('single')}
                        disabled={!scSelectedItem || !stockCardData}
                        className="px-6 py-2.5 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white rounded-xl font-bold text-sm transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
                    >
                        <DownloadCloud size={18} /> Export Laporan (.xlsx)
                    </button>
                </div>
            </div>
        </div>
      )}

      {isEditModalOpen && editingTransaction && (
          <TransactionEditModal transaction={editingTransaction} items={items} onClose={() => setIsEditModalOpen(false)} onSave={handleUpdate} />
      )}
    </div>
  );
};

const TransactionEditModal = ({ transaction, items, onClose, onSave }: { transaction: Transaction, items: InventoryItem[], onClose: () => void, onSave: (t: Transaction) => void }) => {
    const [data, setData] = useState<Transaction>(JSON.parse(JSON.stringify(transaction)));

    const getConversionFactor = (item: InventoryItem, uom: string) => {
        if (!item || uom === item.unit) return 1;
        if (item.unit2 && uom === item.unit2 && item.ratio2) return item.op2 === 'divide' ? (1 / item.ratio2) : item.ratio2;
        if (item.unit3 && uom === item.unit3 && item.ratio3) return item.op3 === 'divide' ? (1 / item.ratio3) : item.ratio3;
        return 1;
    };

    const handleItemChange = (index: number, newDisplayQty: number) => {
        const newItems = [...data.items];
        const tItem = newItems[index];
        const master = items.find(i => i.id === tItem.itemId);
        if (!master) return;
        
        const ratio = getConversionFactor(master, tItem.uom);
        const baseQty = parseFloat((newDisplayQty * ratio).toFixed(2));
        
        newItems[index] = { ...tItem, qty: baseQty, total: Number((baseQty * tItem.unitPrice).toFixed(2)) };
        const newTotalValue = Number(newItems.reduce((acc, curr) => acc + curr.total, 0).toFixed(2));
        setData(prev => ({ ...prev, items: newItems, totalValue: newTotalValue }));
    };

    const getDisplayQty = (tItem: TransactionItem) => {
        const master = items.find(i => i.id === tItem.itemId);
        if (!master) return tItem.qty;
        const ratio = getConversionFactor(master, tItem.uom);
        return parseFloat((tItem.qty / ratio).toFixed(2));
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in zoom-in duration-200">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[95vh] border border-white/20">
                <div className="p-6 border-b border-ice-100 dark:border-gray-800 flex justify-between items-center bg-indigo-50 dark:bg-gray-800"><h3 className="font-bold text-xl text-slate-800 dark:text-white">Detail Transaksi</h3><button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors"><X className="text-slate-400"/></button></div>
                <div className="p-8 overflow-y-auto space-y-8 flex-1 custom-scrollbar">
                    <div className="border border-ice-100 dark:border-gray-700 rounded-3xl overflow-hidden shadow-sm">
                        <table className="w-full text-left"><thead className="bg-slate-50 dark:bg-gray-800 text-[10px] font-bold text-slate-500 uppercase"><tr><th className="p-4">Item Details</th><th className="p-4 w-32 text-center">Qty</th><th className="p-4 text-center">Unit</th><th className="p-4 text-right">Total Baris</th></tr></thead>
                            <tbody className="divide-y divide-ice-50 dark:divide-gray-700">
                                {data.items.map((it, idx) => (
                                    <tr key={idx} className="text-sm dark:text-gray-300">
                                        <td className="p-4 font-bold">{it.name}</td>
                                        <td className="p-4"><input type="number" step="any" value={getDisplayQty(it)} onChange={e => handleItemChange(idx, Number(e.target.value))} className="w-full text-center p-2.5 border rounded-xl font-bold bg-white dark:bg-gray-800 dark:border-gray-700 outline-none" /></td>
                                        <td className="p-4 text-center"><span className="text-[10px] font-bold px-2 py-1 bg-ice-50 dark:bg-gray-700 rounded-lg">{it.uom}</span></td>
                                        <td className="p-4 text-right font-bold text-slate-800 dark:text-gray-200">Rp {it.total.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="p-6 border-t border-ice-100 dark:border-gray-800 bg-slate-50 dark:bg-gray-800 flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-3 text-slate-500 font-bold hover:bg-white rounded-xl">Batal</button>
                    <button onClick={() => onSave(data)} className="px-10 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg">Simpan Perubahan</button>
                </div>
            </div>
        </div>
    );
};
