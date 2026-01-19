
import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Transaction, InventoryItem } from '../types';
import { Download, ChevronDown, Calendar, Search, X, Save, Edit2, Trash2, LineChart, Package, ArrowRight, ArrowRightLeft, FileText, Layers } from 'lucide-react';
import { storageService } from '../services/storageService';

interface HistoryProps {
  transactions: Transaction[];
  items: InventoryItem[]; 
  onRefresh: () => void;
}

export const History: React.FC<HistoryProps> = ({ transactions, items, onRefresh }) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [viewImage, setViewImage] = useState<string | null>(null);

  // Stock Card Modal State
  const [isStockCardOpen, setIsStockCardOpen] = useState(false);
  const [scStartDate, setScStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)); // Default 1st of month
  const [scEndDate, setScEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [scSearchItem, setScSearchItem] = useState('');
  const [scSelectedItem, setScSelectedItem] = useState<InventoryItem | null>(null);
  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  // Export Menu State
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Main History Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
              setIsAutocompleteOpen(false);
          }
          if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
              setShowExportMenu(false);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter Logic for Main Table
  const filtered = transactions.filter(t => {
      const matchType = filterType === 'all' || t.type === filterType;
      const tDate = new Date(t.date).getTime();
      const sDate = startDate ? new Date(startDate).getTime() : 0;
      const eDate = endDate ? new Date(endDate).setHours(23,59,59,999) : Infinity;
      const matchDate = tDate >= sDate && tDate <= eDate;
      const query = searchQuery.toLowerCase();
      const matchItems = t.items.some(i => i.name.toLowerCase().includes(query) || i.sku.toLowerCase().includes(query));
      const matchSearch = t.id.toLowerCase().includes(query) || (t.supplier && t.supplier.toLowerCase().includes(query)) || (t.notes && t.notes.toLowerCase().includes(query)) || (t.poNumber && t.poNumber.toLowerCase().includes(query)) || matchItems;
      return matchType && matchDate && matchSearch;
  });

  // Stock Card Logic
  const filteredItems = useMemo(() => {
      if (!scSearchItem) return [];
      return items.filter(i => i.name.toLowerCase().includes(scSearchItem.toLowerCase()) || i.sku.toLowerCase().includes(scSearchItem.toLowerCase())).slice(0, 5);
  }, [scSearchItem, items]);

  // Helper Logic: Calculate movements for a single item
  const calculateItemMovement = (item: InventoryItem, startStr: string, endStr: string) => {
      const start = new Date(startStr);
      start.setHours(0,0,0,0);
      const end = new Date(endStr);
      end.setHours(23,59,59,999);

      let openingStock = item.stock;
      
      const allItemTrans = transactions
        .filter(t => t.items.some(i => i.itemId === item.id))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); 

      // 1. Calculate Opening Stock (Reverse logic)
      allItemTrans.forEach(t => {
          const tDate = new Date(t.date);
          if (tDate >= start) {
              const itemInTrans = t.items.find(i => i.itemId === item.id);
              if (itemInTrans) {
                  const qty = itemInTrans.qty; 
                  if (t.type === 'inbound') {
                      openingStock -= qty;
                  } else {
                      openingStock += qty;
                  }
              }
          }
      });

      // 2. Filter transactions strictly within period
      const periodTrans = allItemTrans.filter(t => {
          const d = new Date(t.date);
          return d >= start && d <= end;
      }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); 

      // 3. Calculate running balance and totals
      let runningBalance = openingStock;
      let totalIn = 0;
      let totalOut = 0;

      const rows = periodTrans.map(t => {
          const itemInTrans = t.items.find(i => i.itemId === item.id);
          const qty = itemInTrans ? itemInTrans.qty : 0;
          const uom = itemInTrans ? itemInTrans.uom : item.unit;
          
          let inQty = 0;
          let outQty = 0;

          if (t.type === 'inbound') {
              inQty = qty;
              totalIn += qty;
              runningBalance += qty;
          } else {
              outQty = qty;
              totalOut += qty;
              runningBalance -= qty;
          }

          return {
              date: t.date,
              id: t.id,
              type: t.type,
              ref: t.poNumber || t.deliveryNote || '-',
              in: inQty,
              out: outQty,
              uom: uom, 
              balance: runningBalance
          };
      });

      return {
          openingStock,
          closingStock: runningBalance,
          totalIn,
          totalOut,
          rows
      };
  };

  const stockCardData = useMemo(() => {
      if (!scSelectedItem) return null;
      return calculateItemMovement(scSelectedItem, scStartDate, scEndDate);
  }, [scSelectedItem, scStartDate, scEndDate, transactions]);

  const handleAdvancedExport = (mode: 'single' | 'all') => {
      if (mode === 'single') {
          if (!scSelectedItem || !stockCardData) return;
          const exportData = [
              ['STOCK CARD REPORT'],
              [`Item: ${scSelectedItem.name} (${scSelectedItem.sku})`],
              [`Period: ${scStartDate} to ${scEndDate}`],
              [],
              ['Date', 'Time', 'Transaction ID', 'Type', 'Reference', 'In', 'Out', 'Balance', 'Unit']
          ];
          exportData.push(['', '', 'OPENING STOCK', '', '', '', '', stockCardData.openingStock.toString(), scSelectedItem.unit]);
          stockCardData.rows.forEach(r => {
              exportData.push([
                  new Date(r.date).toLocaleDateString(),
                  new Date(r.date).toLocaleTimeString(),
                  r.id, r.type.toUpperCase(), r.ref, r.in > 0 ? r.in.toString() : '-', r.out > 0 ? r.out.toString() : '-', r.balance.toString(), r.uom
              ]);
          });
          exportData.push(['', '', 'CLOSING STOCK', '', '', '', '', stockCardData.closingStock.toString(), scSelectedItem.unit]);
          const ws = XLSX.utils.aoa_to_sheet(exportData);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Stock Card");
          XLSX.writeFile(wb, `StockCard_${scSelectedItem.sku}_${scStartDate}_${scEndDate}.xlsx`);
      } else {
          const summaryData: any[] = [];
          items.forEach(item => {
              if(!item.active) return;
              const data = calculateItemMovement(item, scStartDate, scEndDate);
              summaryData.push({
                  SKU: item.sku, Name: item.name, Unit: item.unit,
                  'Opening Stock': data.openingStock, 'Total In': data.totalIn, 'Total Out': data.totalOut, 'Closing Stock': data.closingStock
              });
          });
          const ws = XLSX.utils.json_to_sheet(summaryData);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Inventory Summary");
          XLSX.writeFile(wb, `Inventory_Summary_${scStartDate}_${scEndDate}.xlsx`);
      }
      setShowExportMenu(false);
  };

  // Actions
  const handleDelete = async (id: string) => {
      if (window.confirm("Are you sure you want to delete this transaction? Stock levels will be reverted.")) {
          await storageService.deleteTransaction(id);
          onRefresh();
      }
  };

  const handleEditClick = (t: Transaction) => {
      setEditingTransaction(JSON.parse(JSON.stringify(t)));
      setIsEditModalOpen(true);
  };

  const handleUpdate = async (updatedTx: Transaction) => {
     if (editingTransaction) {
         await storageService.updateTransaction(editingTransaction, updatedTx);
         setIsEditModalOpen(false);
         onRefresh();
     }
  };

  const exportToExcel = () => {
    const data = filtered.map(t => ({
      ID: t.id, Date: new Date(t.date).toLocaleDateString(), Type: t.type,
      Items: t.items.map(i => `${i.name} (${i.qty} ${i.uom || ''})`).join(', '),
      TotalValue: t.totalValue, Supplier: t.supplier || '-', PO: t.poNumber || '-'
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transactions");
    XLSX.writeFile(wb, `Nexus_Transactions_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const formatReferences = (t: Transaction) => {
      if (t.type === 'outbound') return '-';
      const parts = [];
      if (t.supplier && t.supplier.trim() !== '') parts.push(t.supplier);
      if (t.poNumber && t.poNumber.trim() !== '') parts.push(t.poNumber);
      if (t.deliveryNote && t.deliveryNote.trim() !== '') parts.push(t.deliveryNote);
      return parts.length > 0 ? parts.join(' / ') : '-';
  };

  return (
    <div className="space-y-6">
      {/* Top Toolbar */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-soft border border-ice-100 dark:border-gray-700">
        
        {/* Search Input */}
        <div className="relative w-full xl:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
                type="text" 
                placeholder="Search Item Name, ID, Supplier..." 
                className="w-full pl-10 pr-4 py-2.5 bg-ice-50 dark:bg-gray-900 border border-ice-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-ice-300 text-sm dark:text-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            {/* Filter Controls */}
            <div className="relative">
                <select 
                    className="bg-ice-50 dark:bg-gray-900 border border-ice-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ice-300 appearance-none pr-8 cursor-pointer dark:text-white"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                >
                    <option value="all">All Types</option>
                    <option value="inbound">Inbound</option>
                    <option value="outbound">Outbound</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-gray-400 bg-ice-50 dark:bg-gray-900 border border-ice-200 dark:border-gray-700 px-3 py-2.5 rounded-xl">
                <Calendar size={14} />
                <input type="date" className="bg-transparent focus:outline-none dark:invert" value={startDate} onChange={e => setStartDate(e.target.value)} />
                <span className="text-slate-400">to</span>
                <input type="date" className="bg-transparent focus:outline-none dark:invert" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            
            <div className="h-8 w-px bg-slate-200 dark:bg-gray-700 mx-1 hidden xl:block"></div>

            <button 
                onClick={() => setIsStockCardOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors shadow-sm font-bold text-sm whitespace-nowrap"
            >
                <LineChart size={16} /> Analisa Kartu Stok
            </button>

            <button 
                onClick={exportToExcel}
                className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 text-slate-600 dark:text-gray-300 border border-ice-200 dark:border-gray-700 rounded-xl hover:bg-ice-50 dark:hover:bg-gray-700 transition-colors shadow-sm font-bold text-sm ml-auto xl:ml-0"
            >
                <Download size={16} /> Export
            </button>
        </div>
      </div>
      
      {/* Main Table */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-soft border border-ice-100 dark:border-gray-700 overflow-hidden flex flex-col max-h-[calc(100vh-240px)]">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left relative border-collapse">
            <thead className="bg-gradient-to-r from-ice-50 to-white dark:from-gray-800 dark:to-gray-800 border-b border-ice-200 dark:border-gray-700 text-xs font-bold text-slate-500 dark:text-gray-400 uppercase sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="p-5">Trans ID</th>
                <th className="p-5">Type</th>
                <th className="p-5 w-1/4">References</th>
                <th className="p-5">Date</th>
                <th className="p-5 text-center">Items</th>
                <th className="p-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ice-50 dark:divide-gray-700">
              {filtered.map(t => (
                  <tr key={t.id} className="hover:bg-ice-50/50 dark:hover:bg-gray-700/50 transition-colors group">
                      <td className="p-5">
                          <span className="font-bold text-sm text-slate-800 dark:text-white">{t.id}</span>
                      </td>
                      <td className="p-5">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide ${t.type === 'inbound' ? 'bg-ice-100 text-ice-600 border border-ice-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                              {t.type}
                          </span>
                      </td>
                      <td className="p-5 text-sm text-slate-500 dark:text-gray-400 break-words font-medium">
                          {formatReferences(t)}
                      </td>
                      <td className="p-5 text-sm font-semibold text-slate-700 dark:text-gray-300">
                          {new Date(t.date).toLocaleDateString()}
                      </td>
                      <td className="p-5 text-center text-sm text-slate-500 dark:text-gray-500 font-bold">{t.items.length} Items</td>
                      <td className="p-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                              <button onClick={() => handleEditClick(t)} className="p-2 text-slate-400 hover:text-ice-600 hover:bg-ice-50 dark:hover:bg-gray-700 rounded-lg transition-colors"><Edit2 size={16} /></button>
                              <button onClick={() => handleDelete(t.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"><Trash2 size={16} /></button>
                          </div>
                      </td>
                  </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="p-10 text-center text-slate-400">No transactions found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* STOCK CARD MODAL */}
      {isStockCardOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
            {/* Modal Container: Increased max-w to 7xl for bigger view */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-7xl overflow-hidden flex flex-col max-h-[90vh] border border-white/50 dark:border-gray-700">
                {/* Modal Header */}
                <div className="p-6 border-b border-ice-100 dark:border-gray-800 flex justify-between items-center bg-ice-gradient dark:bg-gray-900">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/50 dark:bg-gray-800/50 p-2.5 rounded-xl shadow-sm"><LineChart size={24} className="text-slate-800 dark:text-white" /></div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">Analisa Pergerakan Stok (Stock Card)</h3>
                            <p className="text-xs text-slate-600 dark:text-gray-400 font-medium opacity-80">Lacak alur barang dan saldo stok per periode</p>
                        </div>
                    </div>
                    <button onClick={() => setIsStockCardOpen(false)} className="p-2 hover:bg-white/40 dark:hover:bg-gray-800 rounded-full transition-colors"><X size={24} className="text-slate-800 dark:text-white"/></button>
                </div>
                {/* ... Rest of Stock Card (Filter & Display) remains same but uses state calculated data ... */}
                {/* Filters Section */}
                <div className="p-6 bg-slate-50 dark:bg-gray-800/50 border-b border-ice-100 dark:border-gray-800 grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
                    <div className="md:col-span-5 relative" ref={autocompleteRef}>
                        <label className="text-xs font-bold text-slate-500 dark:text-gray-400 uppercase mb-2 block">Cari Barang</label>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text" 
                                className="w-full pl-11 pr-4 py-3 border border-ice-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-ice-400 text-base bg-white dark:bg-gray-950 text-dark dark:text-white shadow-sm"
                                placeholder="Ketik Nama Barang / SKU..."
                                value={scSearchItem}
                                onChange={e => { setScSearchItem(e.target.value); setIsAutocompleteOpen(true); }}
                                onFocus={() => setIsAutocompleteOpen(true)}
                            />
                        </div>
                        {isAutocompleteOpen && scSearchItem && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-ice-100 dark:border-gray-700 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                                {filteredItems.length > 0 ? filteredItems.map(item => (
                                    <div 
                                        key={item.id} 
                                        onClick={() => { setScSelectedItem(item); setScSearchItem(item.name); setIsAutocompleteOpen(false); }}
                                        className="p-3 hover:bg-ice-50 dark:hover:bg-gray-800 cursor-pointer border-b border-slate-50 dark:border-gray-800 last:border-0"
                                    >
                                        <div className="font-bold text-sm text-slate-800 dark:text-white">{item.name}</div>
                                        <div className="text-xs text-slate-500 dark:text-gray-400 flex justify-between">
                                            <span>{item.sku}</span>
                                            <span className="font-medium">Stok Kini: {item.stock} {item.unit}</span>
                                        </div>
                                    </div>
                                )) : <div className="p-4 text-center text-xs text-slate-400">Tidak ada barang ditemukan</div>}
                            </div>
                        )}
                    </div>
                    
                    <div className="md:col-span-2">
                         <label className="text-xs font-bold text-slate-500 dark:text-gray-400 uppercase mb-2 block">Dari Tanggal</label>
                         <input type="date" value={scStartDate} onChange={e => setScStartDate(e.target.value)} className="w-full px-4 py-3 border border-ice-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-950 text-dark dark:text-white outline-none focus:ring-2 focus:ring-ice-400 shadow-sm" />
                    </div>
                    <div className="md:col-span-2">
                         <label className="text-xs font-bold text-slate-500 dark:text-gray-400 uppercase mb-2 block">Sampai Tanggal</label>
                         <input type="date" value={scEndDate} onChange={e => setScEndDate(e.target.value)} className="w-full px-4 py-3 border border-ice-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-950 text-dark dark:text-white outline-none focus:ring-2 focus:ring-ice-400 shadow-sm" />
                    </div>
                    
                    <div className="md:col-span-3 flex gap-2" ref={exportMenuRef}>
                        <div className="relative w-full">
                            <button 
                                onClick={() => setShowExportMenu(!showExportMenu)}
                                className="w-full py-3 bg-white dark:bg-gray-800 border border-ice-200 dark:border-gray-600 text-slate-700 dark:text-gray-200 rounded-xl font-bold text-sm hover:bg-ice-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                            >
                                <Download size={16} /> Export Laporan <ChevronDown size={14} />
                            </button>
                            {showExportMenu && (
                                <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-ice-100 dark:border-gray-700 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                    <div className="p-2 border-b border-ice-50 dark:border-gray-700">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1">Pilih Tipe Export</div>
                                    </div>
                                    <button onClick={() => handleAdvancedExport('single')} disabled={!scSelectedItem} className="w-full text-left px-4 py-3 hover:bg-ice-50 dark:hover:bg-gray-700 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed">
                                        <div className="bg-indigo-100 text-indigo-600 p-1.5 rounded-lg"><FileText size={16}/></div>
                                        <div>
                                            <div className="text-sm font-bold text-slate-800 dark:text-white">Export Detail (Item Ini)</div>
                                            <div className="text-[10px] text-slate-500 dark:text-gray-400">Rincian transaksi item terpilih saja</div>
                                        </div>
                                    </button>
                                    <button onClick={() => handleAdvancedExport('all')} className="w-full text-left px-4 py-3 hover:bg-ice-50 dark:hover:bg-gray-700 flex items-center gap-3">
                                        <div className="bg-emerald-100 text-emerald-600 p-1.5 rounded-lg"><Layers size={16}/></div>
                                        <div>
                                            <div className="text-sm font-bold text-slate-800 dark:text-white">Export Ringkasan (Semua)</div>
                                            <div className="text-[10px] text-slate-500 dark:text-gray-400">Rekap stok awal/akhir semua barang</div>
                                        </div>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-8 bg-white dark:bg-gray-900 custom-scrollbar">
                    {scSelectedItem && stockCardData ? (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 flex flex-col items-center text-center shadow-sm">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Stok Awal</span>
                                    <span className="text-2xl font-black text-slate-800 dark:text-white">{stockCardData.openingStock} <span className="text-sm font-normal text-slate-400">{scSelectedItem.unit}</span></span>
                                    <span className="text-[10px] text-slate-400 mt-1">Per {new Date(scStartDate).toLocaleDateString()}</span>
                                </div>
                                <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 flex flex-col items-center text-center shadow-sm">
                                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">Total Masuk</span>
                                    <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300">+{stockCardData.totalIn}</span>
                                </div>
                                <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 flex flex-col items-center text-center shadow-sm">
                                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-2">Total Keluar</span>
                                    <span className="text-2xl font-black text-rose-700 dark:text-rose-300">-{stockCardData.totalOut}</span>
                                </div>
                                <div className="p-6 rounded-2xl bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 flex flex-col items-center text-center relative overflow-hidden shadow-sm">
                                    <div className="absolute inset-0 bg-indigo-200/20 blur-xl rounded-full transform scale-150"></div>
                                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2 relative z-10">Stok Akhir</span>
                                    <span className="text-2xl font-black text-indigo-700 dark:text-indigo-300 relative z-10">{stockCardData.closingStock} <span className="text-sm font-normal opacity-70">{scSelectedItem.unit}</span></span>
                                    <span className="text-[10px] text-indigo-400 mt-1 relative z-10">Per {new Date(scEndDate).toLocaleDateString()}</span>
                                </div>
                            </div>
                            {/* Detailed Table */}
                            <div className="border border-ice-100 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 dark:bg-gray-800 text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                                        <tr>
                                            <th className="p-5">Tanggal</th>
                                            <th className="p-5">Tipe & Ref</th>
                                            <th className="p-5 text-center bg-emerald-50/50 dark:bg-emerald-900/10 text-emerald-600">Masuk</th>
                                            <th className="p-5 text-center bg-rose-50/50 dark:bg-rose-900/10 text-rose-600">Keluar</th>
                                            <th className="p-5 text-center bg-slate-100/50 dark:bg-gray-700/30 text-slate-700 dark:text-gray-300">Saldo</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                                        <tr className="bg-slate-50/30 dark:bg-gray-800/20 italic">
                                            <td className="p-5 text-slate-400" colSpan={4}>Saldo Awal</td>
                                            <td className="p-5 text-center font-bold text-slate-700 dark:text-gray-300">{stockCardData.openingStock}</td>
                                        </tr>
                                        {stockCardData.rows.length > 0 ? stockCardData.rows.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors">
                                                <td className="p-5 font-medium text-slate-600 dark:text-gray-300 whitespace-nowrap">
                                                    {new Date(row.date).toLocaleDateString()} <br/>
                                                    <span className="text-[10px] text-slate-400 font-normal">{new Date(row.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                                </td>
                                                <td className="p-5">
                                                    <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${row.type === 'inbound' ? 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400' : 'text-rose-600 bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400'}`}>{row.type}</span>
                                                    <div className="text-xs text-slate-500 dark:text-gray-400 mt-1 font-mono">{row.ref}</div>
                                                </td>
                                                <td className="p-5 text-center bg-emerald-50/20 dark:bg-emerald-900/5 font-bold text-emerald-600 dark:text-emerald-400">
                                                    {row.in > 0 ? `+${row.in}` : '-'}
                                                </td>
                                                <td className="p-5 text-center bg-rose-50/20 dark:bg-rose-900/5 font-bold text-rose-600 dark:text-rose-400">
                                                    {row.out > 0 ? `-${row.out}` : '-'}
                                                </td>
                                                <td className="p-5 text-center font-bold text-slate-800 dark:text-white bg-slate-50/30 dark:bg-gray-800/30">
                                                    {row.balance}
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan={5} className="p-10 text-center text-slate-400">Tidak ada pergerakan pada periode ini.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4 opacity-60">
                            <div className="p-6 rounded-full bg-slate-100 dark:bg-gray-800"><Package size={48} strokeWidth={1} /></div>
                            <p className="text-lg font-medium">Silakan cari barang dan tentukan periode</p>
                            <p className="text-sm max-w-sm text-center">Data pergerakan stok (Stock Card) akan muncul di sini beserta opsi export lanjutan.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* Edit Modal (Existing) */}
      {isEditModalOpen && editingTransaction && (
          <TransactionEditModal 
             transaction={editingTransaction} 
             onClose={() => setIsEditModalOpen(false)}
             onSave={handleUpdate}
             onViewImage={(url) => setViewImage(url)}
          />
      )}

      {/* Image Viewer (Existing) */}
      {viewImage && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-10 backdrop-blur-sm" onClick={() => setViewImage(null)}>
              <button className="absolute top-5 right-5 text-white p-2 hover:bg-white/20 rounded-full transition-colors">
                  <X size={32} />
              </button>
              <img src={viewImage} className="max-w-full max-h-full rounded-2xl shadow-2xl" alt="Preview" />
          </div>
      )}
    </div>
  );
};

// Sub-component: Edit Modal (Unchanged logic, just ensure it's here)
const TransactionEditModal = ({ transaction, onClose, onSave, onViewImage }: { transaction: Transaction, onClose: () => void, onSave: (t: Transaction) => void, onViewImage: (url: string) => void }) => {
    // ... Logic preserved ...
    const [data, setData] = useState<Transaction>(transaction);
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setData(prev => ({ ...prev, [name]: value }));
    };
    const handleItemChange = (index: number, newQty: number) => {
        const newItems = [...data.items];
        newItems[index] = { ...newItems[index], qty: newQty, total: newQty * newItems[index].unitPrice };
        setData(prev => ({ ...prev, items: newItems, totalValue: newItems.reduce((acc, curr) => acc + curr.total, 0) }));
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] border border-white/50">
                <div className="p-6 border-b border-ice-100 dark:border-gray-800 flex justify-between items-center bg-ice-50/50 dark:bg-gray-800">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">Transaction Details</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-800"><X size={24}/></button>
                </div>
                <div className="p-8 overflow-y-auto space-y-6 custom-scrollbar flex-1">
                    <div className="grid grid-cols-2 gap-5">
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Date</label>
                            <input type="date" name="date" value={new Date(data.date).toISOString().slice(0, 10)} onChange={(e) => setData({...data, date: new Date(e.target.value).toISOString()})} className="w-full border border-ice-200 dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-950 text-dark dark:text-white" />
                        </div>
                         <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Type</label>
                            <select name="type" value={data.type} onChange={handleChange as any} className="w-full border border-ice-200 dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-950 text-dark dark:text-white">
                                <option value="inbound">Inbound</option>
                                <option value="outbound">Outbound</option>
                            </select>
                        </div>
                    </div>
                    <div className="border border-ice-200 dark:border-gray-700 rounded-2xl overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-ice-50 dark:bg-gray-800 text-xs font-bold text-slate-500 uppercase">
                                <tr><th className="p-3">Item</th><th className="p-3">UOM</th><th className="p-3 w-32">Qty</th><th className="p-3 text-right">Total</th></tr>
                            </thead>
                            <tbody className="divide-y divide-ice-100 dark:divide-gray-700">
                                {data.items.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="p-3 text-sm font-bold text-slate-700 dark:text-gray-200">{item.name}</td>
                                        <td className="p-3 text-sm text-slate-500">{item.uom}</td>
                                        <td className="p-3"><input type="number" value={item.qty} onChange={(e) => handleItemChange(idx, Number(e.target.value))} className="w-full border border-ice-200 rounded p-1 text-center font-bold" /></td>
                                        <td className="p-3 text-right text-sm text-slate-600">Rp {item.total.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="p-5 border-t border-ice-100 dark:border-gray-700 flex justify-end gap-3 bg-slate-50/50">
                    <button onClick={onClose} className="px-6 py-2.5 text-slate-500 font-bold hover:bg-white rounded-xl transition-all">Cancel</button>
                    <button onClick={() => onSave(data)} className="px-6 py-2.5 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-all flex items-center gap-2"><Save size={18} /> Save Changes</button>
                </div>
            </div>
        </div>
    );
};
