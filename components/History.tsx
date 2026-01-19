import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Transaction } from '../types';
import { Download, ChevronDown, Calendar, Search, X, Save, Edit2, Trash2 } from 'lucide-react';
import { storageService } from '../services/storageService';
import { ToastType } from './Toast';

interface HistoryProps {
  transactions: Transaction[];
  onRefresh: () => void;
  notify: (msg: string, type: ToastType) => void;
}

export const History: React.FC<HistoryProps> = ({ transactions, onRefresh, notify }) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [viewImage, setViewImage] = useState<string | null>(null);

  // Date Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const filtered = transactions.filter(t => {
      const matchType = filterType === 'all' || t.type === filterType;
      const tDate = new Date(t.date).getTime();
      const sDate = startDate ? new Date(startDate).getTime() : 0;
      const eDate = endDate ? new Date(endDate).setHours(23,59,59,999) : Infinity;
      const matchDate = tDate >= sDate && tDate <= eDate;

      const query = searchQuery.toLowerCase();
      const matchSearch = 
        t.id.toLowerCase().includes(query) ||
        (t.supplier && t.supplier.toLowerCase().includes(query)) ||
        (t.notes && t.notes.toLowerCase().includes(query)) ||
        (t.poNumber && t.poNumber.toLowerCase().includes(query));

      return matchType && matchDate && matchSearch;
  });

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this transaction?\nStock levels will be reverted."
    );

    if (!confirmed) return;

    try {
      await storageService.deleteTransaction(id);
      onRefresh();
      notify('Transaction deleted and stock reverted', 'success');
    } catch (error) {
      console.error("Failed to delete transaction:", error);
      notify("Failed to delete transaction. Please try again.", 'error');
    }
  };

  const handleEditClick = (t: Transaction) => {
      setEditingTransaction(JSON.parse(JSON.stringify(t))); // Deep copy
      setIsEditModalOpen(true);
  };

  const handleUpdate = (updatedTx: Transaction) => {
     if (editingTransaction) {
         storageService.updateTransaction(editingTransaction, updatedTx);
         setIsEditModalOpen(false);
         onRefresh();
         notify('Transaction records updated', 'success');
     }
  };

  const exportToExcel = () => {
    try {
      const data = filtered.map(t => ({
        ID: t.id,
        Date: new Date(t.date).toLocaleDateString(),
        Type: t.type,
        Items: t.items.map(i => `${i.name} (${i.qty} ${i.uom || ''})`).join(', '),
        TotalValue: t.totalValue,
        Supplier: t.supplier || '-',
        PO: t.poNumber || '-'
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Transactions");
      XLSX.writeFile(wb, `Nexus_Transactions_${new Date().toISOString().slice(0,10)}.xlsx`);
      notify('Report exported to Excel', 'success');
    } catch (e) {
      notify('Export failed', 'error');
    }
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
    <div className="space-y-6 animate-fade-in">
      <div className="glass-card p-4 rounded-2xl shadow-glass flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        
        <div className="relative w-full xl:w-80 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={16} />
            <input 
                type="text" 
                placeholder="Search ID, Supplier, PO..." 
                className="w-full pl-10 pr-4 py-2 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm font-medium transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            <div className="relative">
                <select 
                    className="bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none pr-8 cursor-pointer transition-all"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                >
                    <option value="all" className="bg-white dark:bg-slate-900">All Types</option>
                    <option value="inbound" className="bg-white dark:bg-slate-900">Inbound</option>
                    <option value="outbound" className="bg-white dark:bg-slate-900">Outbound</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
            </div>

            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 px-3 py-2 rounded-xl transition-all">
                <Calendar size={14} className="text-primary" />
                <input 
                    type="date" 
                    className="bg-transparent focus:outline-none cursor-pointer" 
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                />
                <span className="opacity-40">→</span>
                <input 
                    type="date" 
                    className="bg-transparent focus:outline-none cursor-pointer" 
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                />
            </div>
            
            <button 
                onClick={exportToExcel}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 font-black text-[10px] uppercase tracking-widest active:scale-95 ml-auto xl:ml-0"
            >
                <Download size={14} strokeWidth={3} /> Export
            </button>
        </div>
      </div>
      
      <div className="glass-card rounded-2xl shadow-glass overflow-hidden flex flex-col max-h-[calc(100vh-240px)] border border-slate-200/50 dark:border-slate-800/50">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left relative border-collapse">
            <thead className="bg-slate-100/50 dark:bg-slate-800/50 border-b border-slate-200/50 dark:border-slate-800/50 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest sticky top-0 z-10 backdrop-blur-md">
              <tr>
                <th className="p-4">Trans ID</th>
                <th className="p-4">Type</th>
                <th className="p-4 w-1/4">References</th>
                <th className="p-4">Date</th>
                <th className="p-4 text-center">Items</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/30 dark:divide-slate-800/30">
              {filtered.map(t => (
                  <tr key={t.id} className="hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors group">
                      <td className="p-4">
                          <span className="font-bold text-sm text-slate-800 dark:text-slate-100 tracking-tight">{t.id}</span>
                      </td>
                      <td className="p-4">
                          <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${t.type === 'inbound' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400'}`}>
                              {t.type}
                          </span>
                      </td>
                      <td className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 break-words italic">
                          {formatReferences(t)}
                      </td>
                      <td className="p-4 text-sm font-black text-slate-800 dark:text-slate-100">
                          {new Date(t.date).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-center">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-400 bg-white/50 dark:bg-slate-800/50 px-2 py-1 rounded-lg border border-slate-200/50 dark:border-slate-700/50">{t.items.length} Units</span>
                      </td>
                      <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                              <button 
                                onClick={() => handleEditClick(t)}
                                className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-xl transition-all hover:scale-110"
                                title="View/Edit Details"
                              >
                                  <Edit2 size={16} />
                              </button>
                              <button 
                                onClick={() => handleDelete(t.id)}
                                className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all hover:scale-110"
                                title="Delete Transaction"
                              >
                                  <Trash2 size={16} />
                              </button>
                          </div>
                      </td>
                  </tr>
              ))}
              {filtered.length === 0 && (
                  <tr>
                      <td colSpan={6} className="p-12 text-center text-slate-400 italic">No historical records found for this period.</td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isEditModalOpen && editingTransaction && (
          <TransactionEditModal 
             transaction={editingTransaction} 
             onClose={() => setIsEditModalOpen(false)}
             onSave={handleUpdate}
             onViewImage={(url) => setViewImage(url)}
          />
      )}

      {viewImage && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-10 animate-fade-in" onClick={() => setViewImage(null)}>
              <button className="absolute top-5 right-5 text-white p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X size={32} />
              </button>
              <img src={viewImage} className="max-w-full max-h-full rounded-2xl shadow-2xl border-4 border-white/10" alt="Preview" />
          </div>
      )}
    </div>
  );
};

const TransactionEditModal = ({ transaction, onClose, onSave, onViewImage }: { transaction: Transaction, onClose: () => void, onSave: (t: Transaction) => void, onViewImage: (url: string) => void }) => {
    const [data, setData] = useState<Transaction>(transaction);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setData(prev => ({ ...prev, [name]: value }));
    };

    const handleItemChange = (index: number, newQty: number) => {
        const newItems = [...data.items];
        newItems[index] = { 
            ...newItems[index], 
            qty: newQty, 
            total: newQty * newItems[index].unitPrice 
        };
        setData(prev => ({
            ...prev,
            items: newItems,
            totalValue: newItems.reduce((acc, curr) => acc + curr.total, 0)
        }));
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="glass-card rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] border border-white/20">
                <div className="p-6 border-b border-slate-200/50 dark:border-slate-800/50 flex justify-between items-center bg-white/30 dark:bg-slate-900/30">
                    <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight uppercase tracking-tighter">TRX ID: {data.id}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><X size={24}/></button>
                </div>
                
                <div className="p-8 overflow-y-auto space-y-8">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Timestamp</label>
                            <input 
                                type="date" 
                                name="date" 
                                value={new Date(data.date).toISOString().slice(0, 10)} 
                                onChange={(e) => setData({...data, date: new Date(e.target.value).toISOString()})}
                                className="w-full bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 p-3 rounded-xl focus:ring-2 focus:ring-primary/30 outline-none font-bold text-sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Direction</label>
                            <select name="type" value={data.type} onChange={handleChange as any} className="w-full bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 p-3 rounded-xl focus:ring-2 focus:ring-primary/30 outline-none font-black text-xs uppercase">
                                <option value="inbound">INBOUND (STOCK IN)</option>
                                <option value="outbound">OUTBOUND (STOCK OUT)</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 p-5 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-slate-100/50 dark:border-slate-800/50">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Supplier</label>
                            <input name="supplier" value={data.supplier || ''} onChange={handleChange} className="w-full bg-white/70 dark:bg-slate-800/70 border border-slate-200/50 dark:border-slate-700/50 p-2.5 rounded-xl text-xs outline-none" placeholder="-" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">PO #</label>
                            <input name="poNumber" value={data.poNumber || ''} onChange={handleChange} className="w-full bg-white/70 dark:bg-slate-800/70 border border-slate-200/50 dark:border-slate-700/50 p-2.5 rounded-xl text-xs outline-none" placeholder="-" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Ref / SJ</label>
                            <input name="deliveryNote" value={data.deliveryNote || ''} onChange={handleChange} className="w-full bg-white/70 dark:bg-slate-800/70 border border-slate-200/50 dark:border-slate-700/50 p-2.5 rounded-xl text-xs outline-none" placeholder="-" />
                        </div>
                    </div>
                    
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Memo / Internal Notes</label>
                        <input name="notes" value={data.notes || ''} onChange={handleChange} className="w-full bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 p-3 rounded-xl outline-none text-sm font-medium" />
                    </div>

                    {data.documents && data.documents.length > 0 && (
                        <div className="p-5 bg-white/30 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 transition-colors">
                             <h4 className="text-[10px] font-black text-primary uppercase tracking-widest mb-4">Supporting Media</h4>
                             <div className="flex flex-wrap gap-4">
                                 {data.documents.map((doc, idx) => (
                                      <div key={idx} className="relative group/doc animate-fade-in">
                                          <div onClick={() => onViewImage(doc)} className="cursor-pointer border-2 border-white dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl p-1 shadow-xl hover:scale-105 transition-all">
                                            <img src={doc} alt="Doc" className="h-24 w-24 object-cover rounded-lg" />
                                          </div>
                                          <a href={doc} download={`nexus-doc-${data.id}-${idx}.png`} className="absolute -top-3 -right-3 bg-primary text-white p-2 rounded-full shadow-xl border-2 border-white dark:border-slate-800 hover:bg-blue-600 transition-colors">
                                              <Download size={14} strokeWidth={3} />
                                          </a>
                                      </div>
                                 ))}
                             </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        <h4 className="font-black text-xs text-slate-800 dark:text-white uppercase tracking-widest ml-1">Inventory Lines</h4>
                        <div className="glass-card rounded-2xl overflow-hidden border border-slate-200/50 dark:border-slate-700/50">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                    <tr>
                                        <th className="p-4">SKU / Product</th>
                                        <th className="p-4">UOM</th>
                                        <th className="p-4 text-center">Batch Qty</th>
                                        <th className="p-4 text-right">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100/50 dark:divide-slate-800/50">
                                    {data.items.map((item, idx) => (
                                        <tr key={idx} className="text-slate-700 dark:text-slate-300">
                                            <td className="p-4 text-sm font-bold">{item.name}</td>
                                            <td className="p-4 text-xs font-black uppercase text-slate-400">{item.uom}</td>
                                            <td className="p-4">
                                                <input 
                                                    type="number" 
                                                    value={item.qty} 
                                                    onChange={(e) => handleItemChange(idx, Number(e.target.value))}
                                                    className="w-20 mx-auto bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 rounded-xl text-center text-sm font-black outline-none focus:ring-2 focus:ring-primary/30"
                                                />
                                            </td>
                                            <td className="p-4 text-right text-sm font-black text-slate-800 dark:text-slate-100">Rp {item.total.toLocaleString('id-ID')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-200/50 dark:border-slate-800/50 flex justify-end gap-3 bg-white/30 dark:bg-slate-900/30">
                    <button onClick={onClose} className="px-6 py-2.5 text-slate-500 dark:text-slate-400 font-black uppercase text-xs hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">Discard</button>
                    <button onClick={() => onSave(data)} className="px-8 py-2.5 bg-primary text-white font-black uppercase text-xs rounded-xl shadow-lg shadow-primary/30 hover:bg-blue-600 hover:scale-105 transition-all flex items-center gap-2">
                        <Save size={18} strokeWidth={2.5} /> Update Ledger
                    </button>
                </div>
            </div>
        </div>
    );
};
