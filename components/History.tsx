import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Transaction, InventoryItem } from '../types';
import { Download, ChevronDown, Calendar, Search, X, Save, Edit2, Trash2, LineChart, Package, ArrowRight, ArrowRightLeft, FileText, Layers, User as UserIcon } from 'lucide-react';
import { storageService } from '../services/storageService';

interface HistoryProps {
  transactions: Transaction[];
  items: InventoryItem[]; 
  onRefresh: () => void;
}

export const History: React.FC<HistoryProps> = ({ transactions, items, onRefresh }) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [viewImage, setViewImage] = useState<string | null>(null);

  const [isStockCardOpen, setIsStockCardOpen] = useState(false);
  const [scStartDate, setScStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [scEndDate, setScEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [scSearchItem, setScSearchItem] = useState('');
  const [scSelectedItem, setScSelectedItem] = useState<InventoryItem | null>(null);
  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

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

  const filteredItems = useMemo(() => {
      if (!scSearchItem) return [];
      return items.filter(i => i.name.toLowerCase().includes(scSearchItem.toLowerCase()) || i.sku.toLowerCase().includes(scSearchItem.toLowerCase())).slice(0, 5);
  }, [scSearchItem, items]);

  const calculateItemMovement = (item: InventoryItem, startStr: string, endStr: string) => {
      const start = new Date(startStr);
      start.setHours(0,0,0,0);
      const end = new Date(endStr);
      end.setHours(23,59,59,999);
      let openingStock = item.stock;
      const allItemTrans = transactions
        .filter(t => t.items.some(i => i.itemId === item.id))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); 

      allItemTrans.forEach(t => {
          const tDate = new Date(t.date);
          if (tDate >= start) {
              const itemInTrans = t.items.find(i => i.itemId === item.id);
              if (itemInTrans) {
                  const qty = itemInTrans.qty; 
                  if (t.type === 'inbound') openingStock -= qty;
                  else openingStock += qty;
              }
          }
      });

      const periodTrans = allItemTrans.filter(t => {
          const d = new Date(t.date);
          return d >= start && d <= end;
      }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); 

      let runningBalance = openingStock;
      let totalIn = 0;
      let totalOut = 0;

      const rows = periodTrans.map(t => {
          const itemInTrans = t.items.find(i => i.itemId === item.id);
          const qty = itemInTrans ? itemInTrans.qty : 0;
          const uom = itemInTrans ? itemInTrans.uom : item.unit;
          let inQty = 0; let outQty = 0;
          if (t.type === 'inbound') { inQty = qty; totalIn += qty; runningBalance += qty; }
          else { outQty = qty; totalOut += qty; runningBalance -= qty; }
          return { date: t.date, id: t.id, type: t.type, ref: t.poNumber || t.deliveryNote || '-', in: inQty, out: outQty, uom: uom, balance: runningBalance };
      });
      return { openingStock, closingStock: runningBalance, totalIn, totalOut, rows };
  };

  const stockCardData = useMemo(() => {
      if (!scSelectedItem) return null;
      return calculateItemMovement(scSelectedItem, scStartDate, scEndDate);
  }, [scSelectedItem, scStartDate, scEndDate, transactions]);

  const handleAdvancedExport = (mode: 'single' | 'all') => {
      if (mode === 'single') {
          if (!scSelectedItem || !stockCardData) return;
          const exportData = [
              ['STOCK CARD REPORT'], [`Item: ${scSelectedItem.name} (${scSelectedItem.sku})`], [`Period: ${scStartDate} to ${scEndDate}`], [],
              ['Date', 'Time', 'Transaction ID', 'Type', 'Reference', 'In', 'Out', 'Balance', 'Unit']
          ];
          exportData.push(['', '', 'OPENING STOCK', '', '', '', '', stockCardData.openingStock.toString(), scSelectedItem.unit]);
          stockCardData.rows.forEach(r => {
              exportData.push([new Date(r.date).toLocaleDateString(), new Date(r.date).toLocaleTimeString(), r.id, r.type.toUpperCase(), r.ref, r.in > 0 ? r.in.toString() : '-', r.out > 0 ? r.out.toString() : '-', r.balance.toString(), r.uom]);
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
              summaryData.push({ SKU: item.sku, Name: item.name, Unit: item.unit, 'Opening Stock': data.openingStock, 'Total In': data.totalIn, 'Total Out': data.totalOut, 'Closing Stock': data.closingStock });
          });
          const ws = XLSX.utils.json_to_sheet(summaryData);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Inventory Summary");
          XLSX.writeFile(wb, `Inventory_Summary_${scStartDate}_${scEndDate}.xlsx`);
      }
      setShowExportMenu(false);
  };

  const handleDelete = async (id: string) => {
      if (window.confirm("Hapus transaksi ini? Stok akan otomatis dikembalikan.")) {
          try {
              await storageService.deleteTransaction(id);
              onRefresh();
          } catch (err) {
              alert("Gagal menghapus transaksi.");
          }
      }
  };

  const handleEditClick = (t: Transaction) => {
      setEditingTransaction(JSON.parse(JSON.stringify(t)));
      setIsEditModalOpen(true);
  };

  const handleUpdate = async (updatedTx: Transaction) => {
     if (editingTransaction) {
         try {
             await storageService.updateTransaction(editingTransaction, updatedTx);
             setIsEditModalOpen(false);
             onRefresh();
         } catch (err) {
             alert("Gagal memperbarui transaksi.");
         }
     }
  };

  const exportToExcel = () => {
    const data = filtered.map(t => ({
      ID: t.id, Date: new Date(t.date).toLocaleString(), Type: t.type.toUpperCase(),
      Supplier_Ref: t.supplier || t.poNumber || '-',
      Items: t.items.map(i => `${i.name} (${i.qty} ${i.uom || ''})`).join(', '),
      Value_Rp: t.totalValue, Notes: t.notes || '-'
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "History");
    XLSX.writeFile(wb, `Nexus_History_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-soft border border-ice-100 dark:border-gray-700">
        <div className="relative w-full xl:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
                type="text" 
                placeholder="Cari ID, Barang, Supplier..." 
                className="w-full pl-10 pr-4 py-2.5 bg-ice-50 dark:bg-gray-900 border border-ice-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-ice-300 text-sm dark:text-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            <div className="relative">
                <select 
                    className="bg-ice-50 dark:bg-gray-900 border border-ice-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ice-300 appearance-none pr-8 cursor-pointer dark:text-white"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                >
                    <option value="all">Semua Tipe</option>
                    <option value="inbound">Inbound</option>
                    <option value="outbound">Outbound</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-gray-400 bg-ice-50 dark:bg-gray-900 border border-ice-200 dark:border-gray-700 px-3 py-2.5 rounded-xl">
                <Calendar size={14} />
                <input type="date" className="bg-transparent focus:outline-none dark:invert" value={startDate} onChange={e => setStartDate(e.target.value)} />
                <span className="text-slate-400">sd</span>
                <input type="date" className="bg-transparent focus:outline-none dark:invert" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            
            <button onClick={() => setIsStockCardOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors shadow-sm font-bold text-sm whitespace-nowrap"><LineChart size={16} /> Kartu Stok</button>
            <button onClick={exportToExcel} className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 text-slate-600 dark:text-gray-300 border border-ice-200 dark:border-gray-700 rounded-xl hover:bg-ice-50 dark:hover:bg-gray-700 transition-colors shadow-sm font-bold text-sm ml-auto xl:ml-0"><Download size={16} /> Export</button>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-soft border border-ice-100 dark:border-gray-700 overflow-hidden flex flex-col max-h-[calc(100vh-240px)]">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left relative border-collapse">
            <thead className="bg-slate-50 dark:bg-gray-800 border-b border-ice-200 dark:border-gray-700 text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="p-4">ID Transaksi</th>
                <th className="p-4">Tipe</th>
                <th className="p-4">Tanggal</th>
                <th className="p-4">Supplier / PO</th>
                <th className="p-4">Ringkasan Barang</th>
                <th className="p-4 text-right">Total Nilai</th>
                <th className="p-4">Catatan</th>
                <th className="p-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ice-50 dark:divide-gray-700">
              {filtered.map(t => (
                  <tr key={t.id} className="hover:bg-ice-50/50 dark:hover:bg-gray-700/50 transition-colors text-sm">
                      <td className="p-4 font-bold text-slate-800 dark:text-white">{t.id}</td>
                      <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${t.type === 'inbound' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{t.type}</span>
                      </td>
                      <td className="p-4 text-slate-600 dark:text-gray-400">{new Date(t.date).toLocaleString()}</td>
                      <td className="p-4 text-slate-500 font-medium">{t.supplier || t.poNumber || '-'}</td>
                      <td className="p-4">
                          <div className="flex flex-col gap-0.5">
                              {t.items.slice(0, 2).map((it, idx) => (
                                  <span key={idx} className="text-[11px] truncate w-40 text-slate-600 dark:text-gray-400">• {it.name} ({it.qty} {it.uom})</span>
                              ))}
                              {t.items.length > 2 && <span className="text-[10px] text-slate-400">+{t.items.length - 2} lainnya...</span>}
                          </div>
                      </td>
                      <td className="p-4 text-right font-bold text-slate-800 dark:text-gray-200">Rp {t.totalValue.toLocaleString()}</td>
                      <td className="p-4 text-xs italic text-slate-400 truncate max-w-[150px]">{t.notes || '-'}</td>
                      <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                              <button onClick={() => handleEditClick(t)} className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg"><Edit2 size={16} /></button>
                              <button onClick={() => handleDelete(t.id)} className="p-2 text-slate-400 hover:text-rose-600 rounded-lg"><Trash2 size={16} /></button>
                          </div>
                      </td>
                  </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={8} className="p-10 text-center text-slate-400">Tidak ada transaksi ditemukan.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {isEditModalOpen && editingTransaction && (
          <TransactionEditModal 
             transaction={editingTransaction} 
             onClose={() => setIsEditModalOpen(false)}
             onSave={handleUpdate}
          />
      )}

      {isStockCardOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[90vh] border border-white/50 dark:border-gray-700">
                <div className="p-6 border-b border-ice-100 dark:border-gray-800 flex justify-between items-center bg-indigo-50 dark:bg-gray-800">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2"><LineChart /> Analisa Kartu Stok</h3>
                    <button onClick={() => setIsStockCardOpen(false)} className="p-2 hover:bg-white rounded-full"><X /></button>
                </div>
                <div className="p-6 bg-slate-50 dark:bg-gray-900 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="md:col-span-2 relative" ref={autocompleteRef}>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Cari Barang</label>
                        <input type="text" className="w-full p-2.5 border rounded-xl dark:bg-gray-800 dark:text-white" placeholder="Nama atau SKU..." value={scSearchItem} onChange={e => { setScSearchItem(e.target.value); setIsAutocompleteOpen(true); }} onFocus={() => setIsAutocompleteOpen(true)} />
                        {isAutocompleteOpen && scSearchItem && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border rounded-xl shadow-xl z-50 overflow-hidden">
                                {filteredItems.map(it => (
                                    <div key={it.id} onClick={() => { setScSelectedItem(it); setScSearchItem(it.name); setIsAutocompleteOpen(false); }} className="p-3 hover:bg-indigo-50 dark:hover:bg-gray-700 cursor-pointer border-b last:border-0 dark:text-white">
                                        <div className="font-bold text-sm">{it.name}</div>
                                        <div className="text-[10px] text-slate-400">{it.sku}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Mulai</label>
                        <input type="date" value={scStartDate} onChange={e => setScStartDate(e.target.value)} className="w-full p-2 border rounded-xl dark:bg-gray-800 dark:text-white" />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Sampai</label>
                        <input type="date" value={scEndDate} onChange={e => setScEndDate(e.target.value)} className="w-full p-2 border rounded-xl dark:bg-gray-800 dark:text-white" />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-gray-900">
                    {scSelectedItem && stockCardData ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-4 gap-4">
                                <div className="p-4 bg-slate-50 dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 text-center">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Stok Awal</p>
                                    <p className="text-xl font-black dark:text-white">{stockCardData.openingStock}</p>
                                </div>
                                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800 text-center">
                                    <p className="text-[10px] font-bold text-emerald-600 uppercase">Total In</p>
                                    <p className="text-xl font-black text-emerald-600">+{stockCardData.totalIn}</p>
                                </div>
                                <div className="p-4 bg-rose-50 dark:bg-rose-900/20 rounded-2xl border border-rose-100 dark:border-rose-800 text-center">
                                    <p className="text-[10px] font-bold text-rose-600 uppercase">Total Out</p>
                                    <p className="text-xl font-black text-rose-600">-{stockCardData.totalOut}</p>
                                </div>
                                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800 text-center">
                                    <p className="text-[10px] font-bold text-indigo-600 uppercase">Stok Akhir</p>
                                    <p className="text-xl font-black text-indigo-700 dark:text-indigo-400">{stockCardData.closingStock}</p>
                                </div>
                            </div>
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-gray-800 text-xs font-bold text-slate-500 uppercase">
                                    <tr><th className="p-3">Tanggal</th><th className="p-3">ID & Ref</th><th className="p-3 text-center">In</th><th className="p-3 text-center">Out</th><th className="p-3 text-center">Saldo</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                                    {stockCardData.rows.map((row, idx) => (
                                        <tr key={idx} className="dark:text-gray-300">
                                            <td className="p-3 whitespace-nowrap">{new Date(row.date).toLocaleDateString()}</td>
                                            <td className="p-3 text-xs"><span className="font-bold">{row.id}</span> <br/> <span className="text-slate-400">{row.ref}</span></td>
                                            <td className="p-3 text-center text-emerald-600 font-bold">{row.in || '-'}</td>
                                            <td className="p-3 text-center text-rose-600 font-bold">{row.out || '-'}</td>
                                            <td className="p-3 text-center font-bold bg-slate-50/50 dark:bg-gray-800/50">{row.balance}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="h-64 flex flex-col items-center justify-center text-slate-400 opacity-50">
                            <Package size={48} className="mb-2" />
                            <p>Cari barang untuk melihat analisa pergerakan stok</p>
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-ice-100 dark:border-gray-800 bg-slate-50 dark:bg-gray-800 flex justify-end gap-3">
                    <button onClick={() => handleAdvancedExport('single')} disabled={!scSelectedItem} className="px-5 py-2 bg-white dark:bg-gray-700 border border-ice-200 dark:border-gray-600 rounded-xl text-xs font-bold flex items-center gap-2"><FileText size={14}/> Export Item</button>
                    <button onClick={() => handleAdvancedExport('all')} className="px-5 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2"><Layers size={14}/> Export Semua Summary</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

const TransactionEditModal = ({ transaction, onClose, onSave }: { transaction: Transaction, onClose: () => void, onSave: (t: Transaction) => void }) => {
    const [data, setData] = useState<Transaction>(transaction);

    const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setData(prev => ({ ...prev, [name]: value }));
    };

    const handleItemChange = (index: number, newQty: number) => {
        const newItems = [...data.items];
        const item = newItems[index];
        const updatedItem = { ...item, qty: newQty, total: newQty * item.unitPrice };
        newItems[index] = updatedItem;
        
        const newTotalValue = newItems.reduce((acc, curr) => acc + curr.total, 0);
        setData(prev => ({ ...prev, items: newItems, totalValue: newTotalValue }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(data);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[95vh] border border-white/20">
                <div className="p-6 border-b border-ice-100 dark:border-gray-800 flex justify-between items-center bg-indigo-50 dark:bg-gray-800">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">Edit Detail Transaksi</h3>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full"><X size={20}/></button>
                </div>
                <form onSubmit={handleSubmit} className="p-8 overflow-y-auto space-y-6 flex-1 custom-scrollbar bg-white dark:bg-gray-900">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="md:col-span-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">ID Transaksi</label>
                            <input disabled value={data.id} className="w-full border p-3 rounded-xl bg-slate-50 dark:bg-gray-800 dark:border-gray-700 text-slate-400" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Tipe</label>
                            <input disabled value={data.type.toUpperCase()} className="w-full border p-3 rounded-xl bg-slate-50 dark:bg-gray-800 dark:border-gray-700 text-slate-400 font-bold" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Tanggal</label>
                            <input type="date" value={new Date(data.date).toISOString().split('T')[0]} onChange={e => setData({...data, date: e.target.value})} className="w-full border p-3 rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Supplier / Client</label>
                            <input name="supplier" value={data.supplier || ''} onChange={handleFieldChange} className="w-full border p-3 rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Nomor PO</label>
                            <input name="poNumber" value={data.poNumber || ''} onChange={handleFieldChange} className="w-full border p-3 rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Catatan</label>
                            <input name="notes" value={data.notes || ''} onChange={handleFieldChange} className="w-full border p-3 rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                        </div>
                    </div>

                    <div className="border border-ice-100 dark:border-gray-700 rounded-2xl overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-gray-800 text-[10px] font-bold text-slate-500 uppercase">
                                <tr>
                                    <th className="p-4">Item (SKU)</th>
                                    <th className="p-4 w-32 text-center">Jumlah (Qty)</th>
                                    <th className="p-4 text-center">Unit</th>
                                    <th className="p-4 text-right">Harga</th>
                                    <th className="p-4 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-ice-50 dark:divide-gray-700">
                                {data.items.map((it, idx) => (
                                    <tr key={idx} className="text-sm dark:text-gray-300">
                                        <td className="p-4"><span className="font-bold">{it.name}</span> <br/> <span className="text-[10px] text-slate-400">{it.sku}</span></td>
                                        <td className="p-4">
                                            <input type="number" value={it.qty} onChange={e => handleItemChange(idx, Number(e.target.value))} className="w-full text-center p-2 border rounded-lg font-bold bg-white dark:bg-gray-800" />
                                        </td>
                                        <td className="p-4 text-center text-slate-400">{it.uom}</td>
                                        <td className="p-4 text-right">Rp {it.unitPrice.toLocaleString()}</td>
                                        <td className="p-4 text-right font-bold">Rp {it.total.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-between items-center p-6 bg-slate-50 dark:bg-gray-800 rounded-2xl border border-ice-100 dark:border-gray-700">
                         <span className="text-slate-500 font-bold uppercase text-[10px]">Total Nilai Transaksi</span>
                         <span className="text-2xl font-black text-slate-800 dark:text-white">Rp {data.totalValue.toLocaleString()}</span>
                    </div>
                </form>
                <div className="p-6 border-t border-ice-100 dark:border-gray-800 bg-slate-50 dark:bg-gray-800 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-6 py-3 text-slate-500 font-bold hover:bg-white rounded-xl">Batal</button>
                    <button type="submit" onClick={handleSubmit} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg flex items-center gap-2 transition-all active:scale-95"><Save size={18} /> Simpan Perubahan</button>
                </div>
            </div>
        </div>
    );
};