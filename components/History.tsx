import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Transaction, InventoryItem } from '../types';
import { Download, ChevronDown, Calendar, Search, X, Save, Edit2, Trash2, LineChart, Package, FileText, ImageIcon, ExternalLink, DownloadCloud } from 'lucide-react';
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
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const filtered = transactions.filter(t => {
      const matchType = filterType === 'all' || t.type === filterType;
      const tDate = new Date(t.date).getTime();
      const sDate = startDate ? new Date(startDate).getTime() : 0;
      const eDate = endDate ? new Date(endDate).setHours(23,59,59,999) : Infinity;
      const matchDate = tDate >= sDate && tDate <= eDate;
      const query = searchQuery.toLowerCase();
      
      const matchItems = t.items.some(i => i.name.toLowerCase().includes(query) || i.sku.toLowerCase().includes(query));
      const matchHeader = (t.id || "").toLowerCase().includes(query) || 
                          (t.supplier || "").toLowerCase().includes(query) || 
                          (t.notes || "").toLowerCase().includes(query) || 
                          (t.poNumber || "").toLowerCase().includes(query);
      return matchType && matchDate && (matchHeader || matchItems);
  });

  const handleDelete = async (id: string) => {
      if (window.confirm("Hapus transaksi ini? Stok barang akan dikembalikan otomatis.")) {
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

  const downloadImage = (base64: string, filename: string) => {
      const link = document.createElement('a');
      link.href = base64;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const exportToExcel = () => {
    const data = filtered.map(t => ({
      'ID Transaksi': t.id, 
      'Tipe': t.type.toUpperCase(),
      'Tanggal': new Date(t.date).toLocaleString(), 
      'Supplier/PO': t.supplier || t.poNumber || '-',
      'Barang': t.items.map(i => `${i.name} (${i.qty} ${i.uom || ''})`).join(', '),
      'Total Nilai (Rp)': t.totalValue, 
      'Catatan': t.notes || '-'
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
            <select 
                className="bg-ice-50 dark:bg-gray-900 border border-ice-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ice-300 dark:text-white"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
            >
                <option value="all">Semua Tipe</option>
                <option value="inbound">Inbound</option>
                <option value="outbound">Outbound</option>
            </select>

            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-gray-400 bg-ice-50 dark:bg-gray-900 border border-ice-200 dark:border-gray-700 px-3 py-2.5 rounded-xl">
                <Calendar size={14} />
                <input type="date" className="bg-transparent focus:outline-none dark:invert" value={startDate} onChange={e => setStartDate(e.target.value)} />
                <span className="text-slate-400">sd</span>
                <input type="date" className="bg-transparent focus:outline-none dark:invert" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            
            <button onClick={exportToExcel} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-lg font-bold text-sm ml-auto xl:ml-0"><Download size={16} /> Export Data</button>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-soft border border-ice-100 dark:border-gray-700 overflow-hidden flex flex-col max-h-[calc(100vh-240px)]">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left relative border-collapse">
            <thead className="bg-slate-50 dark:bg-gray-800 border-b border-ice-200 dark:border-gray-700 text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase sticky top-0 z-10">
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
                              <button onClick={() => handleEditClick(t)} className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg transition-all" title="Edit/Detail"><Edit2 size={16} /></button>
                              <button onClick={() => handleDelete(t.id)} className="p-2 text-slate-400 hover:text-rose-600 rounded-lg transition-all" title="Hapus"><Trash2 size={16} /></button>
                          </div>
                      </td>
                  </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={8} className="p-10 text-center text-slate-400 italic">Data transaksi tidak ditemukan.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {isEditModalOpen && editingTransaction && (
          <TransactionEditModal 
             transaction={editingTransaction} 
             onClose={() => setIsEditModalOpen(false)}
             onSave={handleUpdate}
             onPreview={(img) => setPreviewImage(img)}
             onDownload={downloadImage}
          />
      )}

      {/* Fullscreen Image Preview */}
      {previewImage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 animate-in fade-in">
              <button onClick={() => setPreviewImage(null)} className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full"><X size={32}/></button>
              <img src={previewImage} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl shadow-indigo-500/20" alt="Preview" />
              <div className="absolute bottom-6 flex gap-4">
                  <button onClick={() => downloadImage(previewImage, 'NEXUS_DOC.png')} className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-xl"><DownloadCloud size={20}/> Download Foto</button>
              </div>
          </div>
      )}
    </div>
  );
};

const TransactionEditModal = ({ transaction, onClose, onSave, onPreview, onDownload }: { 
    transaction: Transaction, 
    onClose: () => void, 
    onSave: (t: Transaction) => void,
    onPreview: (img: string) => void,
    onDownload: (img: string, name: string) => void
}) => {
    const [data, setData] = useState<Transaction>(transaction);

    const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setData(prev => ({ ...prev, [name]: value }));
    };

    const handleItemChange = (index: number, newQty: number) => {
        const newItems = [...data.items];
        const item = newItems[index];
        const updatedItem = { ...item, qty: newQty, total: Number((newQty * item.unitPrice).toFixed(2)) };
        newItems[index] = updatedItem;
        
        const newTotalValue = Number(newItems.reduce((acc, curr) => acc + curr.total, 0).toFixed(2));
        setData(prev => ({ ...prev, items: newItems, totalValue: newTotalValue }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(data);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in zoom-in duration-200">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[95vh] border border-white/20">
                <div className="p-6 border-b border-ice-100 dark:border-gray-800 flex justify-between items-center bg-indigo-50 dark:bg-gray-800">
                    <div className="flex items-center gap-3">
                        <FileText className="text-indigo-600" />
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white">Edit / Detail Transaksi</h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-full transition-colors"><X size={24} className="text-slate-400"/></button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-8 overflow-y-auto space-y-8 flex-1 custom-scrollbar bg-white dark:bg-gray-900">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="md:col-span-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block tracking-widest">ID Transaksi</label>
                            <input disabled value={data.id} className="w-full border p-3 rounded-xl bg-slate-50 dark:bg-gray-800 dark:border-gray-700 text-slate-400 font-mono text-xs" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block tracking-widest">Tipe</label>
                            <span className={`block w-full text-center py-3 rounded-xl font-bold uppercase text-xs ${data.type === 'inbound' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{data.type}</span>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block tracking-widest">Tanggal</label>
                            <input type="datetime-local" value={data.date.replace(' ', 'T')} onChange={e => setData({...data, date: e.target.value.replace('T', ' ')})} className="w-full border p-3 rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-300 text-xs" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block tracking-widest">Supplier / Client</label>
                            <input name="supplier" value={data.supplier || ''} onChange={handleFieldChange} className="w-full border p-3 rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-300 text-sm" placeholder="Nama perusahaan..." />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block tracking-widest">Nomor PO / Reff</label>
                            <input name="poNumber" value={data.poNumber || ''} onChange={handleFieldChange} className="w-full border p-3 rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-300 text-sm" placeholder="PO-XXXX" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block tracking-widest">Keterangan</label>
                            <input name="notes" value={data.notes || ''} onChange={handleFieldChange} className="w-full border p-3 rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-300 text-sm" placeholder="Catatan transaksi..." />
                        </div>
                    </div>

                    <div className="border border-ice-100 dark:border-gray-700 rounded-3xl overflow-hidden shadow-sm">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-gray-800 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                <tr>
                                    <th className="p-4">Item Details</th>
                                    <th className="p-4 w-32 text-center">Qty</th>
                                    <th className="p-4 text-center">Unit</th>
                                    <th className="p-4 text-right">Harga Per Unit</th>
                                    <th className="p-4 text-right">Total Baris</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-ice-50 dark:divide-gray-700">
                                {data.items.map((it, idx) => (
                                    <tr key={idx} className="text-sm dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors">
                                        <td className="p-4"><span className="font-bold">{it.name}</span> <br/> <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">{it.sku}</span></td>
                                        <td className="p-4">
                                            <input type="number" step="any" value={it.qty} onChange={e => handleItemChange(idx, Number(e.target.value))} className="w-full text-center p-2.5 border rounded-xl font-bold bg-white dark:bg-gray-800 dark:border-gray-700 focus:ring-2 focus:ring-indigo-300 outline-none" />
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className="text-[10px] font-bold px-2 py-1 bg-ice-50 dark:bg-gray-700 text-ice-600 dark:text-ice-300 rounded-lg">{it.uom}</span>
                                        </td>
                                        <td className="p-4 text-right text-slate-500">Rp {it.unitPrice.toLocaleString()}</td>
                                        <td className="p-4 text-right font-bold text-slate-800 dark:text-gray-200">Rp {it.total.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Documents Section */}
                    {data.documents && data.documents.length > 0 && (
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><ImageIcon size={14}/> Lampiran Foto / Dokumen</h4>
                            <div className="grid grid-cols-4 md:grid-cols-6 gap-4">
                                {data.documents.map((doc, i) => (
                                    <div key={i} className="group relative aspect-square rounded-2xl overflow-hidden border-2 border-slate-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all cursor-pointer">
                                        <img src={doc} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="Lampiran" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <button type="button" onClick={() => onPreview(doc)} className="p-2 bg-white/20 hover:bg-white text-white hover:text-indigo-600 rounded-full transition-all"><ExternalLink size={16}/></button>
                                            <button type="button" onClick={() => onDownload(doc, `DOC_${data.id}_${i}.png`)} className="p-2 bg-white/20 hover:bg-white text-white hover:text-emerald-600 rounded-full transition-all"><Download size={16}/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between items-center p-6 bg-slate-800 rounded-3xl border border-slate-700 text-white shadow-xl shadow-slate-200 dark:shadow-none">
                         <div className="space-y-1">
                             <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Ringkasan Nilai</span>
                             <p className="text-xs text-slate-300">Total akumulasi dari {data.items.length} item dalam batch ini.</p>
                         </div>
                         <div className="text-right">
                             <span className="text-3xl font-black tracking-tight">Rp {data.totalValue.toLocaleString()}</span>
                         </div>
                    </div>
                </form>

                <div className="p-6 border-t border-ice-100 dark:border-gray-800 bg-slate-50 dark:bg-gray-800 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-6 py-3 text-slate-500 dark:text-gray-400 font-bold hover:bg-white dark:hover:bg-gray-700 rounded-xl transition-all">Batal</button>
                    <button type="submit" onClick={handleSubmit} className="px-10 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg flex items-center gap-2 transition-all active:scale-95 group">
                        <Save size={20} className="group-hover:rotate-12 transition-transform" /> Simpan Perubahan
                    </button>
                </div>
            </div>
        </div>
    );
};