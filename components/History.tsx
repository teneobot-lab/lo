
import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Transaction, InventoryItem, TransactionItem } from '../types';
import { Download, ChevronDown, Calendar, Search, X, Save, Edit2, Trash2, LineChart, Package, FileText, ImageIcon, ExternalLink, DownloadCloud, Layers } from 'lucide-react';
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
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [isStockCardOpen, setIsStockCardOpen] = useState(false);
  const [scStartDate, setScStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [scEndDate, setScEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [scSearchItem, setScSearchItem] = useState('');
  const [scSelectedItem, setScSelectedItem] = useState<InventoryItem | null>(null);
  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);
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

  // Helper untuk mendapatkan rasio konversi berdasarkan UOM
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
      return items.filter(i => i.name.toLowerCase().includes(scSearchItem.toLowerCase()) || i.sku.toLowerCase().includes(scSearchItem.toLowerCase())).slice(0, 5);
  }, [scSearchItem, items]);

  const calculateItemMovement = (item: InventoryItem, startStr: string, endStr: string) => {
      const start = new Date(startStr); start.setHours(0,0,0,0);
      const end = new Date(endStr); end.setHours(23,59,59,999);
      let openingStock = item.stock;
      const allItemTrans = transactions
        .filter(t => t.items.some(i => i.itemId === item.id))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); 
      allItemTrans.forEach(t => {
          const tDate = new Date(t.date);
          if (tDate >= start) {
              const it = t.items.find(i => i.itemId === item.id);
              if (it) { if (t.type === 'inbound') openingStock -= it.qty; else openingStock += it.qty; }
          }
      });
      const periodTrans = allItemTrans.filter(t => { const d = new Date(t.date); return d >= start && d <= end; }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); 
      let runningBalance = openingStock;
      let totalIn = 0; let totalOut = 0;
      const rows = periodTrans.map(t => {
          const it = t.items.find(i => i.itemId === item.id);
          const qty = it ? it.qty : 0;
          let inQty = 0; let outQty = 0;
          if (t.type === 'inbound') { inQty = qty; totalIn += qty; runningBalance += qty; }
          else { outQty = qty; totalOut += qty; runningBalance -= qty; }
          return { date: t.date, id: t.id, type: t.type, ref: t.poNumber || t.deliveryNote || '-', in: inQty, out: outQty, balance: runningBalance, uom: it?.uom || item.unit };
      });
      return { openingStock, closingStock: runningBalance, totalIn, totalOut, rows };
  };

  const stockCardData = useMemo(() => {
      if (!scSelectedItem) return null;
      return calculateItemMovement(scSelectedItem, scStartDate, scEndDate);
  }, [scSelectedItem, scStartDate, scEndDate, transactions]);

  const handleAdvancedExport = (mode: 'single' | 'all') => {
      if (mode === 'single' && scSelectedItem && stockCardData) {
          const exportData: any[][] = [['LAPORAN KARTU STOK'], [`Item: ${scSelectedItem.name}`], [`Periode: ${scStartDate} s/d ${scEndDate}`], [], ['Tanggal', 'ID Transaksi', 'Tipe', 'Masuk', 'Keluar', 'Saldo', 'Unit']];
          exportData.push(['-', 'STOK AWAL', '-', '-', '-', stockCardData.openingStock, scSelectedItem.unit]);
          stockCardData.rows.forEach(r => exportData.push([new Date(r.date).toLocaleString(), r.id, r.type.toUpperCase(), r.in || '-', r.out || '-', r.balance, r.uom]));
          const ws = XLSX.utils.aoa_to_sheet(exportData); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Kartu Stok"); XLSX.writeFile(wb, `KartuStok_${scSelectedItem.sku}.xlsx`);
      }
  };

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
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[90vh] border border-white/20">
                <div className="p-6 border-b border-ice-100 dark:border-gray-800 flex justify-between items-center bg-indigo-50 dark:bg-gray-800"><h3 className="font-bold text-xl text-slate-800 dark:text-white flex items-center gap-2"><LineChart /> Analisa Kartu Stok</h3><button onClick={() => setIsStockCardOpen(false)} className="p-2 hover:bg-white rounded-full"><X /></button></div>
                <div className="p-6 bg-slate-50 dark:bg-gray-950 grid grid-cols-1 md:grid-cols-4 gap-4 items-end border-b border-ice-100 dark:border-gray-800">
                    <div className="md:col-span-2 relative" ref={autocompleteRef}><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Cari Barang</label><input type="text" className="w-full p-2.5 border rounded-xl dark:bg-gray-800 dark:text-white" placeholder="Nama..." value={scSearchItem} onChange={e => { setScSearchItem(e.target.value); setIsAutocompleteOpen(true); }} onFocus={() => setIsAutocompleteOpen(true)} />
                        {isAutocompleteOpen && scSearchItem && (<div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border rounded-xl shadow-xl z-50 overflow-hidden">{filteredItemsForSC.map(it => (<div key={it.id} onClick={() => { setScSelectedItem(it); setScSearchItem(it.name); setIsAutocompleteOpen(false); }} className="p-3 hover:bg-indigo-50 dark:hover:bg-gray-700 cursor-pointer border-b dark:text-white"><div className="font-bold text-sm">{it.name}</div><div className="text-[10px] text-slate-400">{it.sku}</div></div>))}</div>)}
                    </div>
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Dari</label><input type="date" value={scStartDate} onChange={e => setScStartDate(e.target.value)} className="w-full p-2 border rounded-xl dark:bg-gray-800 dark:text-white" /></div>
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Sampai</label><input type="date" value={scEndDate} onChange={e => setScEndDate(e.target.value)} className="w-full p-2 border rounded-xl dark:bg-gray-800 dark:text-white" /></div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-gray-900">
                    {scSelectedItem && stockCardData && (<div className="space-y-6"><div className="grid grid-cols-4 gap-4"><div className="p-4 bg-slate-50 dark:bg-gray-800 rounded-2xl border text-center"><p className="text-[10px] font-bold text-slate-400">STOK AWAL</p><p className="text-xl font-black dark:text-white">{stockCardData.openingStock} {scSelectedItem.unit}</p></div><div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border text-center"><p className="text-[10px] font-bold text-emerald-600">MASUK</p><p className="text-xl font-black text-emerald-600">+{stockCardData.totalIn}</p></div><div className="p-4 bg-rose-50 dark:bg-rose-900/20 rounded-2xl border text-center"><p className="text-[10px] font-bold text-rose-600">KELUAR</p><p className="text-xl font-black text-rose-600">-{stockCardData.totalOut}</p></div><div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border text-center"><p className="text-[10px] font-bold text-indigo-600">STOK AKHIR</p><p className="text-xl font-black text-indigo-700">{stockCardData.closingStock} {scSelectedItem.unit}</p></div></div><table className="w-full text-left text-sm"><thead className="bg-slate-50 dark:bg-gray-800 text-[10px] font-bold text-slate-500 uppercase"><tr><th className="p-3">Tanggal</th><th className="p-3">Ref</th><th className="p-3 text-center">In</th><th className="p-3 text-center">Out</th><th className="p-3 text-center">Saldo</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-gray-700">{stockCardData.rows.map((row, idx) => (<tr key={idx} className="dark:text-gray-300"><td className="p-3">{new Date(row.date).toLocaleString()}</td><td className="p-3 text-xs">{row.id}</td><td className="p-3 text-center text-emerald-600 font-bold">{row.in || '-'}</td><td className="p-3 text-center text-rose-600 font-bold">{row.out || '-'}</td><td className="p-3 text-center font-bold bg-slate-50/50 dark:bg-gray-800/50">{row.balance} {row.uom}</td></tr>))}</tbody></table></div>)}
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

    // Helper untuk modal edit
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
