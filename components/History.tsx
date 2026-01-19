
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Transaction } from '../types';
import { Download, ChevronDown, Calendar, Search, X, Save, Edit2, Trash2 } from 'lucide-react';
import { storageService } from '../services/storageService';

interface HistoryProps {
  transactions: Transaction[];
  onRefresh: () => void;
}

export const History: React.FC<HistoryProps> = ({ transactions, onRefresh }) => {
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
      // Type Filter
      const matchType = filterType === 'all' || t.type === filterType;
      
      // Date Filter
      const tDate = new Date(t.date).getTime();
      const sDate = startDate ? new Date(startDate).getTime() : 0;
      const eDate = endDate ? new Date(endDate).setHours(23,59,59,999) : Infinity;
      const matchDate = tDate >= sDate && tDate <= eDate;

      // Text Search (ID, Supplier, Notes, PO, AND ITEM NAMES/SKU)
      const query = searchQuery.toLowerCase();
      
      // Check if any item in the transaction matches the search query
      const matchItems = t.items.some(i => 
        i.name.toLowerCase().includes(query) || 
        i.sku.toLowerCase().includes(query)
      );

      const matchSearch = 
        t.id.toLowerCase().includes(query) ||
        (t.supplier && t.supplier.toLowerCase().includes(query)) ||
        (t.notes && t.notes.toLowerCase().includes(query)) ||
        (t.poNumber && t.poNumber.toLowerCase().includes(query)) ||
        matchItems;

      return matchType && matchDate && matchSearch;
  });

  const handleDelete = (id: string) => {
      if (window.confirm("Are you sure you want to delete this transaction? Stock levels will be reverted.")) {
          storageService.deleteTransaction(id);
          onRefresh();
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
     }
  };

  const exportToExcel = () => {
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
                <input 
                    type="date" 
                    className="bg-transparent focus:outline-none dark:invert" 
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                />
                <span className="text-slate-400">to</span>
                <input 
                    type="date" 
                    className="bg-transparent focus:outline-none dark:invert" 
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                />
            </div>
            
            <button 
                onClick={exportToExcel}
                className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 text-slate-600 dark:text-gray-300 border border-ice-200 dark:border-gray-700 rounded-xl hover:bg-ice-50 dark:hover:bg-gray-700 transition-colors shadow-sm font-bold text-sm ml-auto xl:ml-0"
            >
                <Download size={16} /> Export
            </button>
        </div>
      </div>
      
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
                              <button 
                                onClick={() => handleEditClick(t)}
                                className="p-2 text-slate-400 hover:text-ice-600 hover:bg-ice-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                              >
                                  <Edit2 size={16} />
                              </button>
                              <button 
                                onClick={() => handleDelete(t.id)}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                              >
                                  <Trash2 size={16} />
                              </button>
                          </div>
                      </td>
                  </tr>
              ))}
              {filtered.length === 0 && (
                  <tr>
                      <td colSpan={6} className="p-10 text-center text-slate-400">No transactions found.</td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && editingTransaction && (
          <TransactionEditModal 
             transaction={editingTransaction} 
             onClose={() => setIsEditModalOpen(false)}
             onSave={handleUpdate}
             onViewImage={(url) => setViewImage(url)}
          />
      )}

      {/* Image Viewer */}
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

// Sub-component: Edit Modal
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
                        {/* ... Other inputs styled similarly ... */}
                         <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Type</label>
                            <select name="type" value={data.type} onChange={handleChange as any} className="w-full border border-ice-200 dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-950 text-dark dark:text-white">
                                <option value="inbound">Inbound</option>
                                <option value="outbound">Outbound</option>
                            </select>
                        </div>
                    </div>
                    {/* ... Rest of form ... */}
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
