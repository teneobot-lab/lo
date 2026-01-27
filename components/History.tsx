

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

  // Column Visibility State
  const [visibleColumns, setVisibleColumns] = useState({
      select: true, id: true, type: true, date: true, supplier: true, items: true, warehouse: true, docs: true, total: true, action: true
  });
  const [showColMenu, setShowColMenu] = useState(false);

  // Photo Preview State
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

  // Selection Logic
  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
        setSelectedIds(new Set());
    } else {
        setSelectedIds(new Set(filtered.map(t => t.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
      const next = new Set(selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setSelectedIds(next);
  };

  const handleExportFlattened = () => {
      // 1. Determine Source Data (Selected OR All Filtered)
      const sourceData = selectedIds.size > 0 
          ? transactions.filter(t => selectedIds.has(t.id))
          : filtered;

      if (sourceData.length === 0) return alert("Tidak ada data untuk diexport.");

      // 2. Flatten Data (One row per ITEM)
      const flatData = sourceData.flatMap(tx => {
          return tx.items.map(item => ({
              "ID Transaksi": tx.id,
              "Tanggal": tx.date.split('T')[0],
              "Waktu": new Date(tx.date).toLocaleTimeString(),
              "Tipe": tx.type === 'inbound' ? 'Masuk' : (tx.type === 'outbound' ? 'Keluar' : 'Transfer'),
              "Gudang Asal": tx.warehouse || 'Gudang Utama',
              "Gudang Tujuan": tx.targetWarehouse || '-',
              "Supplier / Customer": tx.supplier || '-',
              "No. Referensi (PO)": tx.poNumber || '-',
              "No. Surat Jalan": tx.deliveryNote || '-',
              "Catatan Transaksi": tx.notes || '-',
              "User Admin": tx.userId,
              "SKU Barang": item.sku,
              "Nama Barang": item.name,
              "Qty (Base)": item.qty,
              "Satuan Transaksi": item.uom,
              "Harga Satuan": item.unitPrice,
              "Subtotal": item.total,
              "Total Nilai Transaksi": tx.totalValue // Useful for validation
          }));
      });

      // 3. Generate Excel
      const ws = XLSX.utils.json_to_sheet(flatData);
      
      // Auto-width columns roughly
      const wscols = Object.keys(flatData[0]).map(() => ({ wch: 20 }));
      ws['!cols'] = wscols;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Detail Transaksi");
      
      const fileName = `Export_Detail_Transaksi_${new Date().toISOString().slice(0,10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
  };

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

  const handleDelete = async (id: string) => { if (window.confirm("Hapus transaksi ini? Stok akan dikembalikan.")) { try { await storageService.deleteTransaction(id); onRefresh(); setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next; }); } catch (err) { alert("Error deleting"); } } };

  const handleEditSave = async (updatedTx: Transaction) => {
      if (!editingTransaction) return;
      try {
          await storageService.updateTransaction(editingTransaction, updatedTx);
          setIsEditModalOpen(false);
          setEditingTransaction(null);
          onRefresh();
          alert("Transaksi berhasil diperbarui dan stok disesuaikan.");
      } catch (err: any) {
          alert("Gagal update transaksi: " + err.message);
      }
  };

  const handlePreview = (docs: string[]) => {
      if (!docs || docs.length === 0) return;
      setPreviewDocs(docs);
      setIsPreviewOpen(true);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] space-y-4">
      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-3">
        <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64 flex gap-2">
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input type="text" placeholder="Cari ID, Barang, Supplier..." className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md text-xs focus:ring-1 focus:ring-indigo-500 outline-none dark:text-white" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
            </div>
            <div className="relative">
                <select className="pl-3 pr-8 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md text-xs focus:ring-1 focus:ring-indigo-500 outline-none appearance-none cursor-pointer dark:text-white" value={filterType} onChange={(e) => setFilterType(e.target.value)}><option value="all">Semua Tipe</option><option value="inbound">Inbound</option><option value="outbound">Outbound</option><option value="transfer">Transfer</option></select>
                <Filter className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
            </div>
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-md">
                <Calendar size={12} className="text-gray-400" />
                <input type="date" className="bg-transparent text-xs outline-none w-24 dark:text-white dark:invert" value={startDate} onChange={e => setStartDate(e.target.value)} />
                <span className="text-xs text-gray-400">-</span>
                <input type="date" className="bg-transparent text-xs outline-none w-24 dark:text-white dark:invert" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            <div className="relative">
                <button onClick={() => setShowColMenu(!showColMenu)} className="p-2 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300" title="Atur Kolom">
                    <Settings2 size={16} />
                </button>
                {showColMenu && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded shadow-lg border border-gray-200 dark:border-gray-700 z-50 p-2">
                        {Object.keys(visibleColumns).map((key) => (
                            key !== 'select' && key !== 'action' && (
                                <label key={key} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer text-xs text-gray-700 dark:text-gray-300 capitalize">
                                    <input type="checkbox" checked={(visibleColumns as any)[key]} onChange={() => setVisibleColumns(prev => ({ ...prev, [key]: !(prev as any)[key] }))} className="rounded text-indigo-600" /> {key === 'items' ? 'Items' : key}
                                </label>
                            )
                        ))}
                    </div>
                )}
            </div>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
            <button onClick={handleSyncHistoryToSheets} className="flex items-center gap-2 bg-white text-emerald-600 border border-emerald-200 px-3 py-2 rounded-md font-bold text-xs hover:bg-emerald-50 transition-all whitespace-nowrap shadow-sm">
                {isSyncing ? <Loader2 size={14} className="animate-spin"/> : <Table size={14} />} Sync
            </button>
            <button 
                onClick={handleExportFlattened} 
                className={`flex items-center gap-2 px-4 py-2 rounded-md font-bold text-xs shadow-sm transition-all whitespace-nowrap border ${selectedIds.size > 0 ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700' : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'}`}
            >
                <FileSpreadsheet size={14} /> {selectedIds.size > 0 ? `Export Pilihan (${selectedIds.size})` : 'Export Detail (XLSX)'}
            </button>
        </div>
      </div>
      
      {/* Dense Table */}
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden relative">
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
              <tr>
                {visibleColumns.select && (
                    <th className="p-3 w-10 text-center">
                        <button onClick={toggleSelectAll} className="text-gray-500 hover:text-indigo-600">
                            {selectedIds.size === filtered.length && filtered.length > 0 ? <CheckSquare size={16} className="text-indigo-600" /> : <Square size={16} />}
                        </button>
                    </th>
                )}
                {visibleColumns.id && <th className="p-3 text-xs font-bold text-gray-500 uppercase tracking-wider w-32">ID Transaksi</th>}
                {visibleColumns.type && <th className="p-3 text-xs font-bold text-gray-500 uppercase tracking-wider w-24 text-center">Tipe</th>}
                {visibleColumns.date && <th className="p-3 text-xs font-bold text-gray-500 uppercase tracking-wider w-32">Tanggal</th>}
                {visibleColumns.warehouse && <th className="p-3 text-xs font-bold text-gray-500 uppercase tracking-wider w-40">Gudang</th>}
                {visibleColumns.supplier && <th className="p-3 text-xs font-bold text-gray-500 uppercase tracking-wider w-32">Supplier / Ref</th>}
                {visibleColumns.items && <th className="p-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Detail Barang</th>}
                {visibleColumns.docs && <th className="p-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-20">Dokumen</th>}
                {visibleColumns.total && <th className="p-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider w-32">Total</th>}
                {visibleColumns.action && <th className="p-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider w-24">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.map((t, idx) => (
                  <tr key={t.id} className={`hover:bg-indigo-50/30 dark:hover:bg-gray-700/30 transition-colors text-sm ${selectedIds.has(t.id) ? 'bg-indigo-50 dark:bg-indigo-900/20' : idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/30 dark:bg-gray-800/50'}`}>
                      {visibleColumns.select && (
                          <td className="p-3 text-center">
                              <button onClick={() => toggleSelectOne(t.id)}>
                                 {selectedIds.has(t.id) ? <CheckSquare size={16} className="text-indigo-600" /> : <Square size={16} className="text-gray-300" />}
                              </button>
                          </td>
                      )}
                      {visibleColumns.id && <td className="p-3 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">{t.id}</td>}
                      {visibleColumns.type && (
                          <td className="p-3 text-center">
                              {t.type === 'inbound' && <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700">Masuk</span>}
                              {t.type === 'outbound' && <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-100 text-rose-700">Keluar</span>}
                              {t.type === 'transfer' && <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-700">Transfer</span>}
                          </td>
                      )}
                      {visibleColumns.date && <td className="p-3 text-xs text-gray-600 dark:text-gray-300">{new Date(t.date).toLocaleString('id-ID')}</td>}
                      {visibleColumns.warehouse && (
                          <td className="p-3 text-xs text-gray-600 dark:text-gray-300">
                              {t.type === 'transfer' ? (
                                  <div className="flex flex-col">
                                      <span>{t.warehouse}</span>
                                      <span className="text-[10px] text-blue-500 flex items-center gap-1"><ArrowRight size={10}/> {t.targetWarehouse}</span>
                                  </div>
                              ) : t.warehouse}
                          </td>
                      )}
                      {visibleColumns.supplier && <td className="p-3 text-xs text-gray-500">{t.supplier || t.poNumber || '-'}</td>}
                      {visibleColumns.items && (
                          <td className="p-3 text-xs">
                              <div className="flex flex-col gap-0.5">
                                  {t.items.slice(0, 2).map((it, i) => (<span key={i} className="text-gray-600 dark:text-gray-400 font-medium">• {it.name} <span className="text-gray-400">({getDisplayQty(it)} {it.uom})</span></span>))}
                                  {t.items.length > 2 && <span className="text-[10px] text-gray-400 italic">+{t.items.length - 2} lainnya...</span>}
                              </div>
                          </td>
                      )}
                      {visibleColumns.docs && (
                          <td className="p-3 text-center">
                              {t.documents && t.documents.length > 0 ? (
                                  <button onClick={() => handlePreview(t.documents!)} className="text-indigo-500 hover:bg-indigo-50 p-1.5 rounded transition-all">
                                      <Eye size={16} />
                                  </button>
                              ) : <span className="text-gray-300">-</span>}
                          </td>
                      )}
                      {visibleColumns.total && <td className="p-3 text-right font-bold text-gray-700 dark:text-gray-200">Rp {t.totalValue.toLocaleString('id-ID')}</td>}
                      {visibleColumns.action && (
                          <td className="p-3 text-right">
                              <div className="flex justify-end gap-1">
                                  <button onClick={() => { setEditingTransaction(t); setIsEditModalOpen(true); }} className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded transition-all"><Edit2 size={14} /></button>
                                  <button onClick={() => handleDelete(t.id)} className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all"><Trash2 size={14} /></button>
                              </div>
                          </td>
                      )}
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-between items-center text-xs font-medium text-gray-500 sticky bottom-0 z-20">
            <div>Menampilkan {filtered.length} Transaksi ({selectedIds.size} dipilih)</div>
            <div>Total Valuasi: <span className="font-bold text-gray-800 dark:text-white">Rp {filtered.reduce((a, b) => a + b.totalValue, 0).toLocaleString('id-ID')}</span></div>
        </div>
      </div>

      {/* Transaction Edit Modal */}
      {isEditModalOpen && editingTransaction && (
          <TransactionEditModal 
              transaction={editingTransaction}
              items={items}
              onClose={() => { setIsEditModalOpen(false); setEditingTransaction(null); }}
              onSave={handleEditSave}
          />
      )}

      {/* Photo Preview Modal */}
      {isPreviewOpen && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in zoom-in duration-200">
              <div className="relative bg-transparent w-full max-w-4xl">
                  <button onClick={() => setIsPreviewOpen(false)} className="absolute -top-10 right-0 text-white hover:text-gray-300"><X size={24}/></button>
                  <div className="flex gap-4 overflow-x-auto p-4 snap-x">
                      {previewDocs.map((doc, idx) => (
                          <div key={idx} className="relative flex-none w-full md:w-3/4 h-[70vh] bg-white rounded-lg shadow-2xl flex items-center justify-center snap-center">
                              <img src={doc} className="max-w-full max-h-full object-contain" />
                              <a href={doc} download={`doc-${idx}.png`} className="absolute bottom-4 right-4 bg-white/90 p-2 rounded-full shadow-lg hover:bg-white text-indigo-600"><Download size={20}/></a>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

const TransactionEditModal: React.FC<{ transaction: Transaction, items: InventoryItem[], onClose: () => void, onSave: (tx: Transaction) => void }> = ({ transaction, items, onClose, onSave }) => {
    const [header, setHeader] = useState({ 
        date: transaction.date.split('T')[0], 
        supplier: transaction.supplier || '', 
        poNumber: transaction.poNumber || '', 
        deliveryNote: transaction.deliveryNote || '',
        notes: transaction.notes || ''
    });
    const [cart, setCart] = useState<TransactionItem[]>([...transaction.items]);
    const [search, setSearch] = useState('');
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [qty, setQty] = useState<number>(0);
    const [uom, setUom] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);

    const filteredItems = useMemo(() => items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.sku.toLowerCase().includes(search.toLowerCase())).slice(0, 5), [search, items]);

    const getConversionFactor = (item: InventoryItem, unitName: string) => {
        if (!item || unitName === item.unit) return 1;
        if (item.unit2 && unitName === item.unit2 && item.ratio2) return item.op2 === 'divide' ? (1 / item.ratio2) : item.ratio2;
        if (item.unit3 && unitName === item.unit3 && item.ratio3) return item.op3 === 'divide' ? (1 / item.ratio3) : item.ratio3;
        return 1;
    };

    const handleAddItem = () => {
        if (!selectedItem || qty <= 0) return;
        const ratio = getConversionFactor(selectedItem, uom);
        const baseQty = qty * ratio;
        const newItem: TransactionItem = {
            itemId: selectedItem.id,
            sku: selectedItem.sku,
            name: selectedItem.name,
            qty: parseFloat(baseQty.toFixed(2)),
            uom: uom,
            unitPrice: selectedItem.price,
            total: baseQty * selectedItem.price
        };
        setCart([...cart, newItem]);
        setQty(0); setSearch(''); setSelectedItem(null);
    };

    const handleSave = () => {
        if (cart.length === 0) return;
        const updated: Transaction = {
            ...transaction,
            date: `${header.date} ${new Date().toTimeString().split(' ')[0]}`,
            supplier: header.supplier,
            poNumber: header.poNumber,
            deliveryNote: header.deliveryNote,
            notes: header.notes,
            items: cart,
            totalValue: cart.reduce((a, b) => a + b.total, 0)
        };
        onSave(updated);
    };

    return (
        <div className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in duration-200">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] border border-gray-200 dark:border-gray-700">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-indigo-50 dark:bg-gray-800 rounded-t-xl">
                    <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2"><Edit2 size={18}/> Edit Transaksi ({transaction.id})</h3>
                    <button onClick={onClose}><X className="text-gray-400 hover:text-gray-600" size={18}/></button>
                </div>
                <div className="p-6 overflow-y-auto space-y-6">
                    {/* Header Fields */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Tanggal</label><input type="date" value={header.date} onChange={e => setHeader({...header, date: e.target.value})} className="w-full p-2 border border-gray-300 rounded text-sm"/></div>
                        <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Supplier</label><input value={header.supplier} onChange={e => setHeader({...header, supplier: e.target.value})} className="w-full p-2 border border-gray-300 rounded text-sm"/></div>
                        <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">PO Ref</label><input value={header.poNumber} onChange={e => setHeader({...header, poNumber: e.target.value})} className="w-full p-2 border border-gray-300 rounded text-sm"/></div>
                        <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Catatan</label><input value={header.notes} onChange={e => setHeader({...header, notes: e.target.value})} className="w-full p-2 border border-gray-300 rounded text-sm"/></div>
                    </div>

                    {/* Add Item Section */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
                        <h4 className="text-xs font-bold text-gray-500 uppercase">Tambah / Edit Item</h4>
                        <div className="flex gap-2 items-end">
                            <div className="flex-1 relative">
                                <label className="text-[10px] uppercase font-bold text-gray-400 mb-1 block">Cari Barang</label>
                                <input value={search} onChange={e => { setSearch(e.target.value); setShowDropdown(true); }} className="w-full p-2 border rounded text-sm" placeholder="Ketik nama barang..." />
                                {showDropdown && search && (
                                    <div className="absolute top-full left-0 w-full bg-white shadow-lg border mt-1 z-50 max-h-40 overflow-auto">
                                        {filteredItems.map(i => (
                                            <div key={i.id} onClick={() => { setSelectedItem(i); setSearch(i.name); setUom(i.unit); setShowDropdown(false); }} className="p-2 hover:bg-gray-100 cursor-pointer text-sm">
                                                {i.name} ({i.stock} {i.unit})
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="w-24">
                                <label className="text-[10px] uppercase font-bold text-gray-400 mb-1 block">Satuan</label>
                                <select value={uom} onChange={e => setUom(e.target.value)} disabled={!selectedItem} className="w-full p-2 border rounded text-sm">
                                    {selectedItem && (<><option value={selectedItem.unit}>{selectedItem.unit}</option>{selectedItem.unit2 && <option value={selectedItem.unit2}>{selectedItem.unit2}</option>}{selectedItem.unit3 && <option value={selectedItem.unit3}>{selectedItem.unit3}</option>}</>)}
                                </select>
                            </div>
                            <div className="w-24">
                                <label className="text-[10px] uppercase font-bold text-gray-400 mb-1 block">Qty</label>
                                <input type="number" value={qty} onChange={e => setQty(Number(e.target.value))} className="w-full p-2 border rounded text-sm" />
                            </div>
                            <button onClick={handleAddItem} className="p-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"><Plus size={20}/></button>
                        </div>
                    </div>

                    {/* Cart Table */}
                    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-100 dark:bg-gray-800">
                                <tr>
                                    <th className="p-3">Barang</th>
                                    <th className="p-3 text-center">Qty (Base)</th>
                                    <th className="p-3 text-right">Total</th>
                                    <th className="p-3 text-center">Hapus</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cart.map((item, idx) => (
                                    <tr key={idx} className="border-t border-gray-100 dark:border-gray-700">
                                        <td className="p-3">{item.name} <span className="text-xs text-gray-400">({item.sku})</span></td>
                                        <td className="p-3 text-center">{item.qty} {item.uom}</td>
                                        <td className="p-3 text-right">Rp {item.total.toLocaleString()}</td>
                                        <td className="p-3 text-center"><button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="text-rose-500 hover:text-rose-700"><Trash2 size={16}/></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-b-xl flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-white rounded border border-transparent hover:border-gray-300">Batal</button>
                    <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded shadow hover:bg-indigo-700 flex items-center gap-2"><Save size={16}/> Simpan Perubahan</button>
                </div>
            </div>
        </div>
    );
};
