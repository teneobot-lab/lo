
import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Transaction, InventoryItem, TransactionItem } from '../types';
import { Calendar, Search, X, Edit2, Trash2, LineChart, FileSpreadsheet, Table, Loader2 } from 'lucide-react';
import { storageService } from '../services/storageService';
import { googleSheetsService } from '../services/googleSheetsService';

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
  const [isSyncing, setIsSyncing] = useState(false);

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
      const handleClickOutside = (event: MouseEvent) => { if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) setIsAutocompleteOpen(false); };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getConversionFactor = (item: InventoryItem, uom: string) => {
      if (!item || uom === item.unit) return 1;
      if (item.unit2 && uom === item.unit2 && item.ratio2) return item.op2 === 'divide' ? (1 / item.ratio2) : item.ratio2;
      if (item.unit3 && uom === item.unit3 && item.ratio3) return item.op3 === 'divide' ? (1 / item.ratio3) : item.ratio3;
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

  const handleSyncTransactionsToSheets = async () => {
    const webhookUrl = localStorage.getItem('nexus_sheet_webhook');
    if (!webhookUrl) {
      alert("Konfigurasi Google Sheets belum diatur di Admin Hub!");
      return;
    }

    if (!window.confirm(`Sync ${filtered.length} transaksi yang terfilter ke Google Sheets?`)) return;

    setIsSyncing(true);
    try {
      const syncData: any[] = [];
      filtered.forEach(tx => {
        tx.items.forEach(it => {
          syncData.push({
            ID_Transaksi: tx.id,
            Tipe: tx.type.toUpperCase(),
            Tanggal: tx.date,
            Supplier_Client: tx.supplier || '-',
            PO_Ref: tx.poNumber || '-',
            SKU: it.sku,
            Nama_Barang: it.name,
            Qty_Display: getDisplayQty(it),
            UOM: it.uom,
            Base_Qty: it.qty,
            Base_Unit: items.find(i => i.id === it.itemId)?.unit || '-',
            Total_Nilai: it.total,
            Staff: tx.userId
          });
        });
      });

      await googleSheetsService.sync(webhookUrl, { type: 'Transactions', data: syncData });
      alert("Sinkronisasi Transaksi Berhasil!");
    } catch (e: any) {
      alert(e.message || "Gagal sinkronisasi");
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredItemsForSC = useMemo(() => { if (!scSearchItem) return []; return items.filter(i => i.name.toLowerCase().includes(scSearchItem.toLowerCase()) || i.sku.toLowerCase().includes(scSearchItem.toLowerCase())).slice(0, 10); }, [scSearchItem, items]);

  const calculateItemMovement = (item: InventoryItem, startStr: string, endStr: string) => {
      const start = new Date(startStr); start.setHours(0,0,0,0);
      const end = new Date(endStr); end.setHours(23,59,59,999);
      let openingStock = item.stock;
      const allItemTrans = transactions.filter(t => t.items.some(i => i.itemId === item.id)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); 
      allItemTrans.forEach(t => { const tDate = new Date(t.date); if (tDate >= start) { const it = t.items.find(i => i.itemId === item.id); if (it) { if (t.type === 'inbound') openingStock -= it.qty; else openingStock += it.qty; } } });
      const periodTrans = allItemTrans.filter(t => { const d = new Date(t.date); return d >= start && d <= end; }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); 
      let runningBalance = openingStock;
      let totalIn = 0; let totalOut = 0;
      const rows = periodTrans.map(t => {
          const it = t.items.find(i => i.itemId === item.id);
          const qty = it ? it.qty : 0;
          let inQty = 0; let outQty = 0;
          if (t.type === 'inbound') { inQty = qty; totalIn += qty; runningBalance += qty; }
          else { outQty = qty; totalOut += qty; runningBalance -= qty; }
          return { date: t.date, id: t.id, type: t.type, ref: t.poNumber || t.deliveryNote || '-', in: inQty, out: outQty, balance: runningBalance, uom: it?.uom || item.unit, supplier: t.supplier || '-' };
      });
      return { openingStock, closingStock: runningBalance, totalIn, totalOut, rows };
  };

  const stockCardData = useMemo(() => { if (!scSelectedItem) return null; return calculateItemMovement(scSelectedItem, scStartDate, scEndDate); }, [scSelectedItem, scStartDate, scEndDate, transactions]);

  const handleDelete = async (id: string) => { if (window.confirm("Hapus transaksi ini?")) { try { await storageService.deleteTransaction(id); onRefresh(); } catch (err) {} } };

  const handleExportSingleTransaction = (t: Transaction) => {
    const wb = XLSX.utils.book_new();
    const rows: any[][] = [[], [], [], [], [], ['', 'ID TRANSAKSI:', t.id], ['', '', 'No. Barang', '', 'Keterangan Barang', 'Tanggal', 'Shift/User', '', 'Default', '', '', '', 'Kuantita', '', 'Satuan']];
    t.items.forEach(it => { rows.push(['', '', it.sku, '', it.name, new Date(t.date).toLocaleDateString('en-US'), t.userId.toUpperCase(), '', it.qty, '', '', '', getDisplayQty(it), '', it.uom]); });
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Detail");
    XLSX.writeFile(wb, `Laporan_${t.id}.xlsx`);
  };

  const handleEditClick = (t: Transaction) => { setEditingTransaction(JSON.parse(JSON.stringify(t))); setIsEditModalOpen(true); };
  const selectSCItem = (it: InventoryItem) => { setScSelectedItem(it); setScSearchItem(it.name); setIsAutocompleteOpen(false); setActiveIndex(-1); };

  const handleSCKeyDown = (e: React.KeyboardEvent) => {
      if (!isAutocompleteOpen || filteredItemsForSC.length === 0) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(prev => (prev + 1) % filteredItemsForSC.length); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(prev => (prev - 1 + filteredItemsForSC.length) % filteredItemsForSC.length); }
      else if (e.key === 'Enter' && activeIndex >= 0) { e.preventDefault(); selectSCItem(filteredItemsForSC[activeIndex]); }
      else if (e.key === 'Escape') setIsAutocompleteOpen(false);
  };

  return (
    <div className="space-y-6">
      {isSyncing && (
          <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-md">
              <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-6 max-w-sm w-full border border-white/20">
                  <Loader2 size={48} className="animate-spin text-emerald-500" />
                  <div className="text-center space-y-1">
                      <h4 className="font-bold text-slate-800 dark:text-white">Sync ke Google Sheets...</h4>
                      <p className="text-xs text-slate-500 italic">Sedang memproses laporan transaksi.</p>
                  </div>
              </div>
          </div>
      )}

      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-soft border border-ice-100 dark:border-gray-700">
        <div className="relative w-full xl:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="text" placeholder="Cari ID, Barang, Supplier..." className="w-full pl-10 pr-4 py-2.5 bg-ice-50 dark:bg-gray-900 border border-ice-200 dark:border-gray-700 rounded-xl focus:outline-none text-sm dark:text-white" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            <select className="bg-ice-50 dark:bg-gray-900 border border-ice-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm dark:text-white" value={filterType} onChange={(e) => setFilterType(e.target.value)}><option value="all">Semua Tipe</option><option value="inbound">Inbound</option><option value="outbound">Outbound</option></select>
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-gray-400 bg-ice-50 dark:bg-gray-900 border border-ice-200 px-3 py-2.5 rounded-xl"><Calendar size={14} /><input type="date" className="bg-transparent focus:outline-none dark:invert" value={startDate} onChange={e => setStartDate(e.target.value)} /><span>sd</span><input type="date" className="bg-transparent focus:outline-none dark:invert" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
            <button onClick={handleSyncTransactionsToSheets} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-xl hover:bg-emerald-100 font-bold text-sm border border-emerald-100 dark:border-emerald-800/50" title="Sync Laporan Transaksi ke Google Sheets"><Table size={16} /> Sync Sheet</button>
            <button onClick={() => setIsStockCardOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-xl hover:bg-indigo-100 font-bold text-sm"><LineChart size={16} /> Kartu Stok</button>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-soft border border-ice-100 dark:border-gray-700 overflow-hidden flex flex-col max-h-[calc(100vh-240px)]">
        <div className="overflow-auto flex-1 custom-scrollbar">
          <table className="w-full text-left relative border-collapse">
            <thead className="bg-slate-50 dark:bg-gray-800 border-b border-ice-200 dark:border-gray-700 text-[10px] font-bold text-slate-500 uppercase tracking-widest sticky top-0 z-10">
              <tr><th className="p-4">ID Transaksi</th><th className="p-4">Tipe</th><th className="p-4">Tanggal</th><th className="p-4">Supplier / PO</th><th className="p-4">Ringkasan Barang</th><th className="p-4 text-right">Total Nilai</th><th className="p-4 text-right">Aksi</th></tr>
            </thead>
            <tbody className="divide-y divide-ice-50 dark:divide-gray-700">
              {filtered.map(t => (
                  <tr key={t.id} className="hover:bg-ice-50/50 dark:hover:bg-gray-700/50 transition-colors text-sm group">
                      <td className="p-4 font-bold text-slate-800 dark:text-white">{t.id}</td>
                      <td className="p-4"><span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${t.type === 'inbound' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{t.type}</span></td>
                      <td className="p-4 text-slate-600 dark:text-gray-400">{new Date(t.date).toLocaleString()}</td>
                      <td className="p-4 text-slate-500 font-medium">{t.supplier || t.poNumber || '-'}</td>
                      <td className="p-4"><div className="flex flex-col gap-0.5">{t.items.slice(0, 2).map((it, idx) => (<span key={idx} className="text-[11px] truncate w-40 text-slate-600 dark:text-gray-400">• {it.name} ({getDisplayQty(it)} {it.uom})</span>))}{t.items.length > 2 && <span className="text-[10px] text-slate-400">+{t.items.length - 2} lainnya...</span>}</div></td>
                      <td className="p-4 text-right font-bold text-slate-800 dark:text-gray-200">Rp {t.totalValue.toLocaleString()}</td>
                      <td className="p-4 text-right"><div className="flex items-center justify-end gap-1"><button onClick={() => handleExportSingleTransaction(t)} className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"><FileSpreadsheet size={16} /></button><button onClick={() => handleEditClick(t)} className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg transition-all"><Edit2 size={16} /></button><button onClick={() => handleDelete(t.id)} className="p-2 text-slate-400 hover:text-rose-600 rounded-lg transition-all"><Trash2 size={16} /></button></div></td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isStockCardOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in zoom-in duration-200">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-screen-2xl overflow-hidden flex flex-col max-h-[95vh] border border-white/20">
                <div className="p-6 border-b border-ice-100 dark:border-gray-800 flex justify-between items-center bg-indigo-50 dark:bg-gray-800"><div className="flex items-center gap-3"><div className="p-2.5 bg-white dark:bg-indigo-900/50 rounded-xl shadow-sm text-indigo-600 dark:text-indigo-400"><LineChart size={24} /></div><div><h3 className="font-bold text-xl text-slate-800 dark:text-white">Analisa Kartu Stok</h3></div></div><button onClick={() => setIsStockCardOpen(false)} className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-full transition-all"><X className="text-slate-400" /></button></div>
                <div className="p-6 bg-slate-50 dark:bg-gray-950 grid grid-cols-1 md:grid-cols-4 gap-4 items-end border-b border-ice-100 dark:border-gray-800">
                    <div className="md:col-span-2 relative" ref={autocompleteRef}><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Pilih Barang</label><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="text" className="w-full pl-10 pr-4 py-3 border rounded-xl dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-300 transition-all shadow-sm" placeholder="Ketik Nama atau SKU..." value={scSearchItem} onChange={e => { setScSearchItem(e.target.value); setIsAutocompleteOpen(true); setActiveIndex(-1); }} onFocus={() => setIsAutocompleteOpen(true)} onKeyDown={handleSCKeyDown} /></div>{isAutocompleteOpen && scSearchItem && (<div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-ice-100 dark:border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">{filteredItemsForSC.length > 0 ? filteredItemsForSC.map((it, idx) => (<div key={it.id} onMouseEnter={() => setActiveIndex(idx)} onClick={() => selectSCItem(it)} className={`p-4 cursor-pointer border-b last:border-0 dark:text-white transition-colors ${activeIndex === idx ? 'bg-indigo-50 dark:bg-indigo-900/40' : 'hover:bg-slate-50 dark:hover:bg-gray-700'}`}><div className="font-bold text-sm">{it.name}</div><div className="text-[10px] text-slate-400 font-mono tracking-wider">{it.sku}</div></div>)) : <div className="p-4 text-xs text-slate-400 italic">Tidak ditemukan.</div>}</div>)}</div>
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Dari</label><input type="date" value={scStartDate} onChange={e => setScStartDate(e.target.value)} className="w-full p-3 border rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white outline-none" /></div>
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Sampai</label><input type="date" value={scEndDate} onChange={e => setScEndDate(e.target.value)} className="w-full p-3 border rounded-xl dark:bg-gray-800 dark:text-white outline-none" /></div>
                </div>
                <div className="flex-1 overflow-hidden flex flex-col bg-white dark:bg-gray-900">
                    {scSelectedItem && stockCardData ? (
                        <div className="flex flex-col h-full"><div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4 bg-white dark:bg-gray-900"><div className="p-4 bg-slate-50 dark:bg-gray-800 rounded-2xl border border-slate-100 shadow-sm"><p className="text-[10px] font-bold text-slate-400 uppercase mb-1">STOK AWAL</p><p className="text-2xl font-black tracking-tight">{stockCardData.openingStock} {scSelectedItem.unit}</p></div><div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 shadow-sm"><p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">TOTAL MASUK</p><p className="text-2xl font-black text-emerald-600">+{stockCardData.totalIn}</p></div><div className="p-4 bg-rose-50 dark:bg-rose-900/20 rounded-2xl border border-rose-100 shadow-sm"><p className="text-[10px] font-bold text-rose-600 uppercase mb-1">TOTAL KELUAR</p><p className="text-2xl font-black text-rose-600">-{stockCardData.totalOut}</p></div><div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 shadow-sm"><p className="text-[10px] font-bold text-indigo-600 uppercase mb-1">STOK AKHIR</p><p className="text-2xl font-black text-indigo-700 tracking-tight">{stockCardData.closingStock} {scSelectedItem.unit}</p></div></div><div className="flex-1 overflow-auto custom-scrollbar px-6 pb-6"><table className="w-full text-left border-separate border-spacing-0"><thead className="sticky top-0 z-20 bg-slate-50 dark:bg-gray-800"><tr className="text-[10px] font-bold text-slate-500 uppercase tracking-widest"><th className="p-4 border-b border-ice-100">Waktu</th><th className="p-4 border-b border-ice-100">ID / Ref</th><th className="p-4 border-b border-ice-100">Supplier / Client</th><th className="p-4 border-b border-ice-100 text-center">Masuk</th><th className="p-4 border-b border-ice-100 text-center">Keluar</th><th className="p-4 border-b border-ice-100 text-center">Saldo</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-gray-800">{stockCardData.rows.map((row, idx) => (<tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-gray-800/30 transition-colors"><td className="p-4 text-xs font-medium">{new Date(row.date).toLocaleString()}</td><td className="p-4"><div className="text-xs font-bold">{row.id}</div><div className="text-[9px] text-slate-400">REF: {row.ref}</div></td><td className="p-4 text-xs truncate max-w-[150px]">{row.supplier}</td><td className="p-4 text-center">{row.in > 0 ? <span className="text-emerald-600 font-bold">+{row.in}</span> : '-'}</td><td className="p-4 text-center">{row.out > 0 ? <span className="text-rose-600 font-bold">-{row.out}</span> : '-'}</td><td className="p-4 text-center font-bold text-indigo-600">{row.balance} {scSelectedItem.unit}</td></tr>))}</tbody></table></div></div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full p-12 text-slate-400 italic text-sm">Pilih barang untuk melihat kartu stok.</div>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
