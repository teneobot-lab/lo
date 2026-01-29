
import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Transaction, InventoryItem, TransactionItem } from '../types';
import { Download, Calendar, Search, X, Edit2, Trash2, Loader2, Table, Filter, Eye, Plus, Save, CheckSquare, Square, FileSpreadsheet, Settings2, ArrowRight } from 'lucide-react';
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const [visibleColumns, setVisibleColumns] = useState({
      select: true, id: true, type: true, date: true, supplier: true, items: true, warehouse: true, docs: true, total: true, action: true
  });
  const [showColMenu, setShowColMenu] = useState(false);

  const [previewDocs, setPreviewDocs] = useState<string[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

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

  const filtered = useMemo(() => {
      return transactions.filter(t => {
          const matchType = filterType === 'all' || t.type === filterType;
          const tDate = new Date(t.date).getTime();
          const sDate = startDate ? new Date(startDate).getTime() : 0;
          const eDate = endDate ? new Date(endDate).setHours(23,59,59,999) : Infinity;
          const matchDate = tDate >= sDate && tDate <= eDate;
          const query = searchQuery.toLowerCase();
          return matchType && matchDate && ((t.id || "").toLowerCase().includes(query) || (t.supplier || "").toLowerCase().includes(query) || (t.notes || "").toLowerCase().includes(query));
      });
  }, [transactions, filterType, startDate, endDate, searchQuery]);

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map(t => t.id)));
  };

  const toggleSelectOne = (id: string) => {
      const next = new Set(selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setSelectedIds(next);
  };

  const handleExportFlattened = () => {
      const sourceData = selectedIds.size > 0 ? transactions.filter(t => selectedIds.has(t.id)) : filtered;
      if (sourceData.length === 0) return alert("Tidak ada data untuk diexport.");
      const flatData = sourceData.flatMap(tx => {
          return tx.items.map(item => ({
              "ID Transaksi": tx.id,
              "Tanggal": tx.date.split('T')[0],
              "Waktu": new Date(tx.date).toLocaleTimeString(),
              "Tipe": tx.type === 'inbound' ? 'Masuk' : (tx.type === 'outbound' ? 'Keluar' : 'Transfer'),
              "Gudang Asal": tx.warehouse || 'Gudang Utama',
              "Supplier / Customer": tx.supplier || '-',
              "Nama Barang": item.name,
              "Qty": item.qty,
              "Satuan": item.uom,
              "Total Nilai": tx.totalValue
          }));
      });
      const ws = XLSX.utils.json_to_sheet(flatData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Laporan Transaksi");
      XLSX.writeFile(wb, `Laporan_Mutasi_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const handleSyncHistoryToSheets = async () => {
    const sheetUrl = localStorage.getItem('nexus_sheet_webhook');
    if (!sheetUrl) { alert("Harap isi URL Apps Script di Admin Panel!"); return; }
    setIsSyncing(true);
    try {
      const data: any[] = [];
      filtered.forEach(t => {
          t.items.forEach(it => {
              data.push({ ID_TRX: t.id, Tipe: t.type, Tanggal: t.date, Barang: it.name, Qty: it.qty, Unit: it.uom, Total: it.total, User: t.userId });
          });
      });
      await googleSheetsService.sync(sheetUrl, { type: 'Transactions', data });
      alert("Histori berhasil disinkronkan ke Google Sheets!");
    } catch (err: any) { alert(err.message); } finally { setIsSyncing(false); }
  };

  const handleDelete = async (id: string) => { if (window.confirm("Hapus transaksi ini? Stok akan dikembalikan.")) { try { await storageService.deleteTransaction(id); onRefresh(); } catch (err) { alert("Error deleting"); } } };

  const handleEditSave = async (updatedTx: Transaction) => {
      if (!editingTransaction) return;
      try {
          await storageService.updateTransaction(editingTransaction, updatedTx);
          setIsEditModalOpen(false); setEditingTransaction(null); onRefresh();
      } catch (err: any) { alert("Gagal update: " + err.message); }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] space-y-4 animate-in fade-in duration-300">
      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-paper border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-3">
        <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="text" placeholder="Cari ID, Barang, Supplier..." className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-paper-blue outline-none dark:text-white transition-all" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <select className="pl-3 pr-8 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-paper-blue dark:text-white appearance-none cursor-pointer" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                <option value="all">Semua Tipe</option>
                <option value="inbound">Inbound</option>
                <option value="outbound">Outbound</option>
                <option value="transfer">Transfer</option>
            </select>
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-lg">
                <Calendar size={14} className="text-slate-400" />
                <input type="date" className="bg-transparent text-xs outline-none w-28 dark:text-white" value={startDate} onChange={e => setStartDate(e.target.value)} />
                <span className="text-slate-300">-</span>
                <input type="date" className="bg-transparent text-xs outline-none w-28 dark:text-white" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            <button onClick={() => setShowColMenu(!showColMenu)} className="p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 text-slate-600 dark:text-gray-300">
                <Settings2 size={18} />
            </button>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
            <button onClick={handleSyncHistoryToSheets} className="flex items-center gap-2 bg-white text-emerald-600 border border-emerald-200 px-4 py-2 rounded-lg font-bold text-xs hover:bg-emerald-50 shadow-sm transition-all whitespace-nowrap">
                {isSyncing ? <Loader2 size={14} className="animate-spin"/> : <Table size={16} />} Cloud Sync
            </button>
            <button onClick={handleExportFlattened} className={`flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-xs shadow-sm transition-all whitespace-nowrap border ${selectedIds.size > 0 ? 'bg-paper-blue text-white border-paper-blue' : 'bg-white text-slate-600 border-gray-200 hover:bg-gray-50'}`}>
                <FileSpreadsheet size={16} /> {selectedIds.size > 0 ? `Export (${selectedIds.size})` : 'Export XLSX'}
            </button>
        </div>
      </div>
      
      {/* Dense Table */}
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-paper border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse enterprise-table">
            <thead>
              <tr>
                {visibleColumns.select && (
                    <th className="p-4 w-12 text-center sticky left-0 z-30 bg-slate-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
                        <button onClick={toggleSelectAll} className="text-slate-400 hover:text-paper-blue">
                            {selectedIds.size === filtered.length && filtered.length > 0 ? <CheckSquare size={18} className="text-paper-blue" /> : <Square size={18} />}
                        </button>
                    </th>
                )}
                {visibleColumns.id && <th className="p-4 w-32">ID TRX</th>}
                {visibleColumns.type && <th className="p-4 w-24 text-center">Tipe</th>}
                {visibleColumns.date && <th className="p-4 w-40">Tanggal</th>}
                {visibleColumns.warehouse && <th className="p-4">Gudang</th>}
                {visibleColumns.supplier && <th className="p-4">Supplier / Ref</th>}
                {visibleColumns.items && <th className="p-4">Detail Barang</th>}
                {visibleColumns.docs && <th className="p-4 text-center w-20">Dok</th>}
                {visibleColumns.total && <th className="p-4 text-right w-32">Nilai</th>}
                {visibleColumns.action && <th className="p-4 text-right w-24">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
              {filtered.map((t, idx) => (
                  <tr key={t.id} className={`hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors text-sm ${selectedIds.has(t.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                      {visibleColumns.select && (
                          <td className="p-4 text-center border-r border-slate-100 dark:border-gray-700 sticky left-0 bg-inherit z-10">
                              <button onClick={() => toggleSelectOne(t.id)}>
                                 {selectedIds.has(t.id) ? <CheckSquare size={18} className="text-paper-blue" /> : <Square size={18} className="text-slate-200" />}
                              </button>
                          </td>
                      )}
                      {visibleColumns.id && <td className="p-4 font-mono text-xs font-bold text-paper-blue">{t.id}</td>}
                      {visibleColumns.type && (
                          <td className="p-4 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${t.type === 'inbound' ? 'bg-emerald-100 text-emerald-700' : t.type === 'outbound' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'}`}>
                                  {t.type === 'inbound' ? 'Masuk' : t.type === 'outbound' ? 'Keluar' : 'Transfer'}
                              </span>
                          </td>
                      )}
                      {visibleColumns.date && <td className="p-4 text-xs text-slate-500">{new Date(t.date).toLocaleString('id-ID')}</td>}
                      {visibleColumns.warehouse && <td className="p-4 text-xs font-medium text-slate-700 dark:text-gray-300">{t.warehouse}</td>}
                      {visibleColumns.supplier && <td className="p-4 text-xs text-slate-500">{t.supplier || '-'}</td>}
                      {visibleColumns.items && (
                          <td className="p-4 text-xs">
                              <div className="flex flex-col gap-0.5">
                                  {t.items.slice(0, 1).map((it, i) => (<span key={i} className="text-slate-800 dark:text-gray-200 font-bold">• {it.name} <span className="text-slate-400 font-normal">({getDisplayQty(it)} {it.uom})</span></span>))}
                                  {t.items.length > 1 && <span className="text-[10px] text-slate-400 italic font-medium">+{t.items.length - 1} lainnya...</span>}
                              </div>
                          </td>
                      )}
                      {visibleColumns.docs && (
                          <td className="p-4 text-center">
                              {t.documents && t.documents.length > 0 ? (
                                  <button onClick={() => { setPreviewDocs(t.documents!); setIsPreviewOpen(true); }} className="text-paper-blue hover:bg-blue-50 p-1.5 rounded-lg transition-all"><Eye size={16} /></button>
                              ) : <span className="text-slate-200">-</span>}
                          </td>
                      )}
                      {visibleColumns.total && <td className="p-4 text-right font-bold text-slate-800 dark:text-white">Rp {t.totalValue.toLocaleString('id-ID')}</td>}
                      {visibleColumns.action && (
                          <td className="p-4 text-right">
                              <div className="flex justify-end gap-2">
                                  <button onClick={() => { setEditingTransaction(t); setIsEditModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-paper-blue hover:bg-slate-50 rounded-lg transition-all"><Edit2 size={16} /></button>
                                  <button onClick={() => handleDelete(t.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={16} /></button>
                              </div>
                          </td>
                      )}
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-slate-100 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-widest">
            <div>Data Terfilter: <span className="text-slate-800 dark:text-white">{filtered.length}</span> Transaksi</div>
            <div>Total Nilai: <span className="text-paper-blue">Rp {filtered.reduce((a, b) => a + b.totalValue, 0).toLocaleString('id-ID')}</span></div>
        </div>
      </div>

      {isPreviewOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in zoom-in duration-200">
              <div className="relative bg-white dark:bg-gray-900 rounded-2xl w-full max-w-4xl p-2">
                  <button onClick={() => setIsPreviewOpen(false)} className="absolute -top-12 right-0 text-white hover:text-slate-300 transition-colors p-2"><X size={32}/></button>
                  <div className="flex gap-4 overflow-x-auto p-4 snap-x">
                      {previewDocs.map((doc, idx) => (
                          <div key={idx} className="relative flex-none w-full h-[70vh] bg-slate-50 dark:bg-gray-800 rounded-xl overflow-hidden flex items-center justify-center snap-center">
                              <img src={doc} className="max-w-full max-h-full object-contain shadow-2xl" />
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
