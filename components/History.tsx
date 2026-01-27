
import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Transaction, InventoryItem, TransactionItem } from '../types';
import { Download, Calendar, Search, X, Edit2, Trash2, LineChart, Package, ArrowUpRight, ArrowDownLeft, FileSpreadsheet, DownloadCloud, Loader2, Table, Filter } from 'lucide-react';
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
  
  // Stock Card State
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

  const handleSyncHistoryToSheets = async () => {
    const sheetUrl = localStorage.getItem('nexus_sheet_webhook');
    if (!sheetUrl) { alert("Harap isi URL Apps Script di Admin Panel!"); return; }
    setIsSyncing(true);
    try {
      const data: any[] = [];
      filtered.forEach(t => {
          t.items.forEach(it => {
              data.push({
                  ID_TRX: t.id,
                  Tipe: t.type,
                  Tanggal: t.date,
                  SKU: it.sku,
                  Barang: it.name,
                  Qty: it.qty,
                  Unit: it.uom,
                  Total: it.total,
                  Supplier_Client: t.supplier || '-',
                  User: t.userId
              });
          });
      });
      await googleSheetsService.sync(sheetUrl, { type: 'Transactions', data });
      alert("Histori berhasil disinkronkan ke Google Sheets!");
    } catch (err: any) { alert(err.message); } finally { setIsSyncing(false); }
  };

  const filteredItemsForSC = useMemo(() => {
      if (!scSearchItem) return [];
      return items.filter(i => i.name.toLowerCase().includes(scSearchItem.toLowerCase()) || i.sku.toLowerCase().includes(scSearchItem.toLowerCase())).slice(0, 10);
  }, [scSearchItem, items]);

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
          if (t.type === 'inbound') { inQty = qty; totalIn += qty; runningBalance += qty; } else { outQty = qty; totalOut += qty; runningBalance -= qty; }
          return { date: t.date, id: t.id, type: t.type, ref: t.poNumber || t.deliveryNote || '-', in: inQty, out: outQty, balance: runningBalance, uom: it?.uom || item.unit, supplier: t.supplier || '-' };
      });
      return { openingStock, closingStock: runningBalance, totalIn, totalOut, rows };
  };

  const stockCardData = useMemo(() => { if (!scSelectedItem) return null; return calculateItemMovement(scSelectedItem, scStartDate, scEndDate); }, [scSelectedItem, scStartDate, scEndDate, transactions]);

  const handleDelete = async (id: string) => { if (window.confirm("Hapus transaksi ini?")) { try { await storageService.deleteTransaction(id); onRefresh(); } catch (err) { alert("Error deleting"); } } };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] space-y-4">
      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-3">
        <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input type="text" placeholder="Cari ID, Barang, Supplier..." className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md text-xs focus:ring-1 focus:ring-indigo-500 outline-none dark:text-white" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <div className="relative">
                <select className="pl-3 pr-8 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md text-xs focus:ring-1 focus:ring-indigo-500 outline-none appearance-none cursor-pointer dark:text-white" value={filterType} onChange={(e) => setFilterType(e.target.value)}><option value="all">Semua Tipe</option><option value="inbound">Inbound</option><option value="outbound">Outbound</option></select>
                <Filter className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
            </div>
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-md">
                <Calendar size={12} className="text-gray-400" />
                <input type="date" className="bg-transparent text-xs outline-none w-24 dark:text-white dark:invert" value={startDate} onChange={e => setStartDate(e.target.value)} />
                <span className="text-xs text-gray-400">-</span>
                <input type="date" className="bg-transparent text-xs outline-none w-24 dark:text-white dark:invert" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
            <button onClick={handleSyncHistoryToSheets} className="flex items-center gap-2 bg-white text-emerald-600 border border-emerald-200 px-3 py-2 rounded-md font-bold text-xs hover:bg-emerald-50 transition-all whitespace-nowrap shadow-sm">
                {isSyncing ? <Loader2 size={14} className="animate-spin"/> : <Table size={14} />} Sync
            </button>
            <button onClick={() => setIsStockCardOpen(true)} className="flex items-center gap-2 bg-white text-indigo-600 border border-indigo-200 px-3 py-2 rounded-md font-bold text-xs hover:bg-indigo-50 transition-all whitespace-nowrap shadow-sm">
                <LineChart size={14} /> Kartu Stok
            </button>
            <button onClick={() => { const ws = XLSX.utils.json_to_sheet(filtered.map(t => ({ ID: t.id, Tipe: t.type, Tanggal: t.date, Total: t.totalValue }))); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "History"); XLSX.writeFile(wb, `History.xlsx`); }} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md font-bold text-xs hover:bg-indigo-700 shadow-sm transition-all whitespace-nowrap"><Download size={14} /> Export</button>
        </div>
      </div>
      
      {/* Dense Table */}
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden relative">
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
              <tr>
                <th className="p-3 text-xs font-bold text-gray-500 uppercase tracking-wider w-32">ID Transaksi</th>
                <th className="p-3 text-xs font-bold text-gray-500 uppercase tracking-wider w-24 text-center">Tipe</th>
                <th className="p-3 text-xs font-bold text-gray-500 uppercase tracking-wider w-40">Tanggal</th>
                <th className="p-3 text-xs font-bold text-gray-500 uppercase tracking-wider w-40">Supplier / PO</th>
                <th className="p-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Detail Barang</th>
                <th className="p-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider w-32">Total</th>
                <th className="p-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.map((t, idx) => (
                  <tr key={t.id} className={`hover:bg-indigo-50/30 dark:hover:bg-gray-700/30 transition-colors text-sm ${idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/30 dark:bg-gray-800/50'}`}>
                      <td className="p-3 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">{t.id}</td>
                      <td className="p-3 text-center"><span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${t.type === 'inbound' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{t.type === 'inbound' ? 'Masuk' : 'Keluar'}</span></td>
                      <td className="p-3 text-xs text-gray-600 dark:text-gray-300">{new Date(t.date).toLocaleString('id-ID')}</td>
                      <td className="p-3 text-xs text-gray-500">{t.supplier || t.poNumber || '-'}</td>
                      <td className="p-3 text-xs">
                          <div className="flex flex-col gap-0.5">
                              {t.items.slice(0, 2).map((it, i) => (<span key={i} className="text-gray-600 dark:text-gray-400 font-medium">• {it.name} <span className="text-gray-400">({getDisplayQty(it)} {it.uom})</span></span>))}
                              {t.items.length > 2 && <span className="text-[10px] text-gray-400 italic">+{t.items.length - 2} lainnya...</span>}
                          </div>
                      </td>
                      <td className="p-3 text-right font-bold text-gray-700 dark:text-gray-200">Rp {t.totalValue.toLocaleString('id-ID')}</td>
                      <td className="p-3 text-right">
                          <div className="flex justify-end gap-1">
                              <button onClick={() => {}} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded transition-all"><FileSpreadsheet size={14} /></button>
                              <button onClick={() => handleDelete(t.id)} className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all"><Trash2 size={14} /></button>
                          </div>
                      </td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-between items-center text-xs font-medium text-gray-500 sticky bottom-0 z-20">
            <div>Menampilkan {filtered.length} Transaksi</div>
            <div>Total Valuasi: <span className="font-bold text-gray-800 dark:text-white">Rp {filtered.reduce((a, b) => a + b.totalValue, 0).toLocaleString('id-ID')}</span></div>
        </div>
      </div>

      {isStockCardOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in zoom-in duration-200">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-5xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh] overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
                    <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2"><LineChart size={18}/> Kartu Stok</h3>
                    <button onClick={() => setIsStockCardOpen(false)}><X className="text-gray-400 hover:text-gray-600" size={18}/></button>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2 relative" ref={autocompleteRef}>
                        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} /><input type="text" className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-gray-800 dark:text-white" placeholder="Cari Barang..." value={scSearchItem} onChange={e => { setScSearchItem(e.target.value); setIsAutocompleteOpen(true); }} /></div>
                        {isAutocompleteOpen && scSearchItem && (<div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">{filteredItemsForSC.map((it) => (<div key={it.id} onClick={() => { setScSelectedItem(it); setScSearchItem(it.name); setIsAutocompleteOpen(false); }} className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm border-b dark:border-gray-700 last:border-0"><div className="font-bold text-gray-800 dark:text-white">{it.name}</div><div className="text-xs text-gray-500">{it.sku}</div></div>))}</div>)}
                    </div>
                    <input type="date" value={scStartDate} onChange={e => setScStartDate(e.target.value)} className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-800 dark:text-white" />
                    <input type="date" value={scEndDate} onChange={e => setScEndDate(e.target.value)} className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-800 dark:text-white" />
                </div>
                
                <div className="flex-1 overflow-auto bg-white dark:bg-gray-900">
                    {scSelectedItem && stockCardData ? (
                        <div className="flex flex-col h-full">
                            <div className="grid grid-cols-4 gap-0 border-b border-gray-200 dark:border-gray-700 text-center bg-gray-50 dark:bg-gray-800 text-sm">
                                <div className="p-3 border-r border-gray-200 dark:border-gray-700"><p className="text-xs text-gray-500 uppercase font-bold">Awal</p><p className="font-bold text-lg">{stockCardData.openingStock}</p></div>
                                <div className="p-3 border-r border-gray-200 dark:border-gray-700 text-emerald-600"><p className="text-xs uppercase font-bold">Masuk</p><p className="font-bold text-lg">+{stockCardData.totalIn}</p></div>
                                <div className="p-3 border-r border-gray-200 dark:border-gray-700 text-rose-600"><p className="text-xs uppercase font-bold">Keluar</p><p className="font-bold text-lg">-{stockCardData.totalOut}</p></div>
                                <div className="p-3 text-indigo-600"><p className="text-xs uppercase font-bold">Akhir</p><p className="font-bold text-lg">{stockCardData.closingStock}</p></div>
                            </div>
                            <div className="flex-1 overflow-auto custom-scrollbar p-4">
                                <table className="w-full text-left border-collapse text-sm">
                                    <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10 border-b border-gray-200 dark:border-gray-700">
                                        <tr><th className="p-2 text-xs font-bold text-gray-500 uppercase">Tanggal</th><th className="p-2 text-xs font-bold text-gray-500 uppercase">Ref</th><th className="p-2 text-xs font-bold text-gray-500 uppercase">Ket</th><th className="p-2 text-center text-xs font-bold text-gray-500 uppercase">In</th><th className="p-2 text-center text-xs font-bold text-gray-500 uppercase">Out</th><th className="p-2 text-center text-xs font-bold text-gray-500 uppercase">Saldo</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {stockCardData.rows.map((row, i) => (
                                            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                                <td className="p-2 text-gray-600 dark:text-gray-400">{new Date(row.date).toLocaleDateString()}</td>
                                                <td className="p-2 font-mono text-xs text-indigo-600">{row.id}</td>
                                                <td className="p-2 text-gray-500">{row.supplier}</td>
                                                <td className="p-2 text-center font-bold text-emerald-600">{row.in > 0 ? row.in : '-'}</td>
                                                <td className="p-2 text-center font-bold text-rose-600">{row.out > 0 ? row.out : '-'}</td>
                                                <td className="p-2 text-center font-bold text-gray-800 dark:text-white bg-gray-50 dark:bg-gray-800/50">{row.balance}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : <div className="h-full flex items-center justify-center text-gray-400 italic">Pilih barang untuk melihat kartu stok</div>}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
