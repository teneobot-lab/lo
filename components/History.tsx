
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Transaction } from '../types';
import { Download, ChevronDown, Calendar, Search, X, Save, Edit2, Trash2, Eye } from 'lucide-react';
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

      // Text Search (ID, Supplier, Notes)
      const query = searchQuery.toLowerCase();
      const matchSearch = 
        t.id.toLowerCase().includes(query) ||
        (t.supplier && t.supplier.toLowerCase().includes(query)) ||
        (t.notes && t.notes.toLowerCase().includes(query)) ||
        (t.poNumber && t.poNumber.toLowerCase().includes(query));

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
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-soft border border-slate-100 dark:border-gray-700">
        
        {/* Search Input */}
        <div className="relative w-full xl:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted dark:text-gray-400" size={16} />
            <input 
                type="text" 
                placeholder="Search ID, Supplier, PO..." 
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-gray-900 border border-border dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm dark:text-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            <div className="relative">
                <select 
                    className="bg-slate-50 dark:bg-gray-900 border border-border dark:border-gray-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none pr-8 cursor-pointer dark:text-white"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                >
                    <option value="all">All Types</option>
                    <option value="inbound">Inbound</option>
                    <option value="outbound">Outbound</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-muted dark:text-gray-400 pointer-events-none" size={14} />
            </div>

            <div className="flex items-center gap-2 text-sm text-muted dark:text-gray-400 bg-slate-50 dark:bg-gray-900 border border-border dark:border-gray-700 px-3 py-2 rounded-xl">
                <Calendar size={14} />
                <input 
                    type="date" 
                    className="bg-transparent focus:outline-none dark:invert" 
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                />
                <span>to</span>
                <input 
                    type="date" 
                    className="bg-transparent focus:outline-none dark:invert" 
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                />
            </div>
            
            <button 
                onClick={exportToExcel}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors shadow-sm font-medium text-sm ml-auto xl:ml-0"
            >
                <Download size={16} /> Export
            </button>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-soft border border-slate-100 dark:border-gray-700 overflow-hidden flex flex-col max-h-[calc(100vh-240px)]">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left relative border-collapse">
            <thead className="bg-slate-50 dark:bg-gray-700/50 border-b border-border dark:border-gray-700 text-xs font-semibold text-muted dark:text-gray-400 uppercase sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="p-4 bg-slate-50 dark:bg-gray-800">Trans ID</th>
                <th className="p-4 bg-slate-50 dark:bg-gray-800">Type</th>
                <th className="p-4 bg-slate-50 dark:bg-gray-800 w-1/4">References</th>
                <th className="p-4 bg-slate-50 dark:bg-gray-800">Date</th>
                <th className="p-4 text-center bg-slate-50 dark:bg-gray-800">Items</th>
                <th className="p-4 text-right bg-slate-50 dark:bg-gray-800">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-gray-700">
              {filtered.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-gray-700/50 transition-colors group">
                      <td className="p-4">
                          <span className="font-bold text-sm text-dark dark:text-white">{t.id}</span>
                      </td>
                      <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${t.type === 'inbound' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400'}`}>
                              {t.type}
                          </span>
                      </td>
                      <td className="p-4 text-sm text-muted dark:text-gray-400 break-words">
                          {formatReferences(t)}
                      </td>
                      <td className="p-4 text-sm font-medium text-dark dark:text-gray-300">
                          {new Date(t.date).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-center text-sm text-muted dark:text-gray-500">{t.items.length} Items</td>
                      <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => handleEditClick(t)}
                                className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                                title="View/Edit Details"
                              >
                                  <Edit2 size={16} />
                              </button>
                              <button 
                                onClick={() => handleDelete(t.id)}
                                className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
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
                      <td colSpan={6} className="p-8 text-center text-muted dark:text-gray-500">No transactions found.</td>
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
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-10" onClick={() => setViewImage(null)}>
              <button className="absolute top-5 right-5 text-white p-2">
                  <X size={32} />
              </button>
              <img src={viewImage} className="max-w-full max-h-full rounded-lg shadow-2xl" alt="Preview" />
          </div>
      )}
    </div>
  );
};

// Sub-component: Edit Modal
const TransactionEditModal = ({ transaction, onClose, onSave, onViewImage }: { transaction: Transaction, onClose: () => void, onSave: (t: Transaction) => void, onViewImage: (url: string) => void }) => {
    const [data, setData] = useState<Transaction>(transaction);

    // Simple handler for top-level inputs
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setData(prev => ({ ...prev, [name]: value }));
    };

    // Handler for editing specific line item Quantity
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-border dark:border-gray-800 flex justify-between items-center bg-slate-50 dark:bg-gray-800/50">
                    <h3 className="text-xl font-bold text-dark dark:text-white">Transaction Details: {data.id}</h3>
                    <button onClick={onClose} className="text-muted dark:text-gray-400 hover:text-dark dark:hover:text-white"><X size={24}/></button>
                </div>
                
                <div className="p-6 overflow-y-auto space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-muted dark:text-gray-400 uppercase mb-1">Date</label>
                            <input 
                                type="date" 
                                name="date" 
                                value={new Date(data.date).toISOString().slice(0, 10)} 
                                onChange={(e) => setData({...data, date: new Date(e.target.value).toISOString()})}
                                className="w-full border dark:border-gray-700 p-2 rounded-lg bg-white dark:bg-gray-950 text-dark dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-muted dark:text-gray-400 uppercase mb-1">Type</label>
                            <select name="type" value={data.type} onChange={handleChange as any} className="w-full border dark:border-gray-700 p-2 rounded-lg bg-white dark:bg-gray-950 text-dark dark:text-white">
                                <option value="inbound">Inbound</option>
                                <option value="outbound">Outbound</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-muted dark:text-gray-400 uppercase mb-1">Supplier</label>
                            <input name="supplier" value={data.supplier || ''} onChange={handleChange} className="w-full border dark:border-gray-700 p-2 rounded-lg bg-white dark:bg-gray-950 text-dark dark:text-white" placeholder="-" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-muted dark:text-gray-400 uppercase mb-1">PO Number</label>
                            <input name="poNumber" value={data.poNumber || ''} onChange={handleChange} className="w-full border dark:border-gray-700 p-2 rounded-lg bg-white dark:bg-gray-950 text-dark dark:text-white" placeholder="-" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-muted dark:text-gray-400 uppercase mb-1">Delivery/Ref</label>
                            <input name="deliveryNote" value={data.deliveryNote || ''} onChange={handleChange} className="w-full border dark:border-gray-700 p-2 rounded-lg bg-white dark:bg-gray-950 text-dark dark:text-white" placeholder="-" />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-xs font-semibold text-muted dark:text-gray-400 uppercase mb-1">Notes</label>
                        <input name="notes" value={data.notes || ''} onChange={handleChange} className="w-full border dark:border-gray-700 p-2 rounded-lg bg-white dark:bg-gray-950 text-dark dark:text-white" />
                    </div>

                    {/* Documents / Images Section inside Modal */}
                    {data.documents && data.documents.length > 0 && (
                        <div className="p-4 bg-slate-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-slate-300 dark:border-gray-700">
                             <h4 className="text-xs font-bold text-primary uppercase mb-3">Attachments</h4>
                             <div className="flex gap-4">
                                 {data.documents.map((doc, idx) => (
                                      <div key={idx} className="relative group/doc">
                                          <div onClick={() => onViewImage(doc)} className="cursor-pointer border bg-white rounded-lg p-1 hover:shadow-md transition-shadow">
                                            <img src={doc} alt="Doc" className="h-24 w-24 object-cover rounded-md" />
                                          </div>
                                          <a href={doc} download={`doc-${data.id}-${idx}.png`} className="absolute -top-2 -right-2 bg-white text-primary p-1.5 rounded-full shadow-md border border-slate-100 hover:bg-primary hover:text-white transition-colors">
                                              <Download size={14} />
                                          </a>
                                      </div>
                                 ))}
                             </div>
                        </div>
                    )}

                    <div>
                        <h4 className="font-bold text-sm text-dark dark:text-white mb-2">Line Items</h4>
                        <div className="border border-border dark:border-gray-700 rounded-xl overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-gray-800 text-xs text-muted dark:text-gray-400 uppercase">
                                    <tr>
                                        <th className="p-3">Item</th>
                                        <th className="p-3">UOM</th>
                                        <th className="p-3 w-32">Qty</th>
                                        <th className="p-3 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                                    {data.items.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="p-3 text-sm font-medium dark:text-gray-200">{item.name}</td>
                                            <td className="p-3 text-sm text-muted dark:text-gray-400">{item.uom}</td>
                                            <td className="p-3">
                                                <input 
                                                    type="number" 
                                                    value={item.qty} 
                                                    onChange={(e) => handleItemChange(idx, Number(e.target.value))}
                                                    className="w-full border dark:border-gray-700 bg-white dark:bg-gray-900 text-dark dark:text-white p-1 rounded text-center"
                                                />
                                            </td>
                                            <td className="p-3 text-right text-sm dark:text-gray-300">Rp {item.total.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-border dark:border-gray-700 flex justify-end gap-3 bg-slate-50 dark:bg-gray-800/50">
                    <button onClick={onClose} className="px-5 py-2 text-muted dark:text-gray-400 font-medium hover:bg-slate-100 dark:hover:bg-gray-700 rounded-xl">Cancel</button>
                    <button onClick={() => onSave(data)} className="px-5 py-2 bg-primary text-white font-medium rounded-xl hover:bg-blue-600 transition-all flex items-center gap-2">
                        <Save size={18} /> Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};
