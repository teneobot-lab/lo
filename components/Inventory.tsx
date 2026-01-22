
import React, { useState, useMemo } from 'react';
import { InventoryItem, Role } from '../types';
import { Plus, Search, Edit2, Trash2, Filter, ToggleLeft, ToggleRight, X, Upload, FileSpreadsheet, Download, Layers, Info, Loader2, CheckSquare, Square } from 'lucide-react';
import { storageService } from '../services/storageService';
import { ToastType } from './Toast';
import * as XLSX from 'xlsx';

interface InventoryProps {
  items: InventoryItem[];
  role: Role;
  onRefresh: () => void;
  notify: (msg: string, type: ToastType) => void;
}

export const Inventory: React.FC<InventoryProps> = ({ items, role, onRefresh, notify }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All'); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  
  // State untuk Progress Import & Delete
  const [isImporting, setIsImporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  // Fix: Explicitly type actionProgress state to avoid "unknown" in functional updates
  const [actionProgress, setActionProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });

  // State untuk Multi-Select
  // Fix: Explicitly type selectedIds to ensure Set operations remain typed
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set<string>());

  const categories = useMemo(() => {
    const cats = new Set(items.map(i => i.category));
    return ['All', ...Array.from(cats)];
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.sku.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
      
      let matchesStatus = true;
      if (statusFilter === 'Low Stock') matchesStatus = item.stock <= item.minLevel;
      if (statusFilter === 'Active') matchesStatus = item.active;
      if (statusFilter === 'Inactive') matchesStatus = !item.active;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [items, searchTerm, categoryFilter, statusFilter]);

  // Handlers for selection
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set<string>());
    } else {
      setSelectedIds(new Set(filteredItems.map(i => i.id)));
    }
  };

  const toggleSelectItem = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleDelete = async (id: string) => {
    try {
      if (window.confirm('Hapus item ini dari inventaris?')) {
        await storageService.deleteItem(id);
        onRefresh();
        notify('Item berhasil dihapus', 'success');
      }
    } catch (e) {
      notify("Gagal menghapus item", 'error');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Hapus massal ${selectedIds.size} item terpilih? Tindakan ini tidak bisa dibatalkan.`)) return;

    setIsDeleting(true);
    const idsArray = Array.from(selectedIds);
    setActionProgress({ current: 0, total: idsArray.length });

    try {
      const chunkSize = 5;
      for (let i = 0; i < idsArray.length; i += chunkSize) {
        const chunk = idsArray.slice(i, i + chunkSize);
        // Fix: Explicitly type id as string to avoid "unknown" argument error
        await Promise.all(chunk.map((id: string) => storageService.deleteItem(id)));
        // Fix: Explicitly type prev in functional update to avoid "unknown" error
        setActionProgress((prev: { current: number; total: number }) => ({ ...prev, current: Math.min(i + chunkSize, idsArray.length) }));
      }
      
      setSelectedIds(new Set<string>());
      notify(`${idsArray.length} item berhasil dihapus secara massal.`, 'success');
      onRefresh();
    } catch (e) {
      notify("Terjadi kesalahan saat penghapusan massal.", 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleStatus = async (item: InventoryItem) => {
    try {
      await storageService.saveItem({ ...item, active: !item.active });
      onRefresh();
      notify(`Item ${item.active ? 'dinonaktifkan' : 'diaktifkan'}`, 'info');
    } catch (e) {
      notify("Gagal memperbarui status", 'error');
    }
  };

  const downloadTemplate = () => {
      const template = [
          { SKU: 'BRW-001', Name: 'Item Contoh', Category: 'Sembako', Price: 5000, Location: 'Gudang A', Unit: 'Pcs', Stock: 100, MinLevel: 10, Unit2: 'Box', Ratio2: 12, Op2: 'multiply', Unit3: 'Ctn', Ratio3: 144, Op3: 'multiply' }
      ];
      const ws = XLSX.utils.json_to_sheet(template);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Template");
      XLSX.writeFile(wb, "Nexus_Import_Template.xlsx");
  };

  const handleBulkImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        const data = XLSX.utils.sheet_to_json(ws) as any[];
        const validRows = data.filter(row => row.SKU || row.sku);
        
        if (validRows.length === 0) {
            notify("Tidak ada data valid ditemukan (Kolom SKU wajib ada)", "warning");
            return;
        }

        setIsImporting(true);
        setActionProgress({ current: 0, total: validRows.length });

        const parseNum = (val: any, fallback: number = 0) => {
            if (val === undefined || val === null || val === '') return fallback;
            const str = String(val).trim();
            if (str === '-') return 0;
            const n = Number(str.replace(/[^0-9.-]+/g, ""));
            return isNaN(n) ? fallback : n;
        };

        const chunkSize = 5;
        for (let i = 0; i < validRows.length; i += chunkSize) {
            const chunk = validRows.slice(i, i + chunkSize);
            
            await Promise.all(chunk.map(async (row) => {
                const sku = String(row.SKU || row.sku).trim();
                const existing = items.find(item => item.sku === sku);

                const newItem: InventoryItem = {
                    id: existing ? existing.id : crypto.randomUUID(), 
                    sku: sku,
                    name: row.Name || row.Nama || row.name || (existing?.name || 'Unnamed Item'),
                    category: row.Category || row.Kategori || row.category || (existing?.category || 'General'),
                    price: parseNum(row.Price || row.Harga || row.price, existing?.price || 0),
                    location: row.Location || row.Lokasi || row.location || (existing?.location || 'A-01'),
                    unit: row.Unit || row.Satuan || row.unit || (existing?.unit || 'Pcs'),
                    stock: parseNum(row.Stock || row.Stok || row.stock, existing?.stock || 0),
                    minLevel: parseNum(row.MinLevel || row.MinStok || row.minLevel, existing?.minLevel || 0),
                    active: existing ? existing.active : true,
                    unit2: row.Unit2 || row.unit2 || existing?.unit2 || null,
                    ratio2: (row.Ratio2 || row.ratio2) ? parseNum(row.Ratio2 || row.ratio2) : (existing?.ratio2 || null),
                    op2: (row.Op2 || row.op2) === 'divide' ? 'divide' : 'multiply',
                    unit3: row.Unit3 || row.unit3 || existing?.unit3 || null,
                    ratio3: (row.Ratio3 || row.ratio3) ? parseNum(row.Ratio3 || row.ratio3) : (existing?.ratio3 || null),
                    op3: (row.Op3 || row.op3) === 'divide' ? 'divide' : 'multiply',
                };
                
                return storageService.saveItem(newItem);
            }));

            // Fix: Explicitly type prev in functional update to avoid "unknown" error
            setActionProgress((prev: { current: number; total: number }) => ({ ...prev, current: Math.min(i + chunkSize, validRows.length) }));
        }

        notify(`${validRows.length} item berhasil di-import/update.`, 'success');
        onRefresh();
      } catch (e) { 
        console.error(e);
        notify("Gagal memproses file. Pastikan format Excel benar.", 'error'); 
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const calculateDisplayStock = (baseStock: number, ratio: number, op: 'multiply' | 'divide') => {
      if (!ratio || ratio === 0) return 0;
      if (op === 'multiply') return parseFloat((baseStock / ratio).toFixed(2));
      return parseFloat((baseStock * ratio).toFixed(2));
  };

  return (
    <div className="space-y-6">
      {/* Overlay Loading Action (Import / Delete) */}
      {(isImporting || isDeleting) && (
          <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-md">
              <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-6 max-w-sm w-full border border-white/20">
                  <div className="relative">
                      <Loader2 size={48} className={`animate-spin ${isDeleting ? 'text-rose-500' : 'text-indigo-600'}`} />
                      <div className="absolute inset-0 flex items-center justify-center">
                          <span className={`text-[10px] font-bold ${isDeleting ? 'text-rose-500' : 'text-indigo-600'}`}>
                              {Math.round((actionProgress.current / actionProgress.total) * 100)}%
                          </span>
                      </div>
                  </div>
                  <div className="text-center space-y-2">
                      <h4 className="font-bold text-slate-800 dark:text-white">{isDeleting ? 'Menghapus Data...' : 'Sedang Import Data...'}</h4>
                      <p className="text-xs text-slate-500 dark:text-gray-400">
                          Memproses {actionProgress.current} dari {actionProgress.total} item. <br/> Mohon tidak menutup halaman ini.
                      </p>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${isDeleting ? 'bg-rose-500' : 'bg-indigo-600'}`} 
                        style={{ width: `${(actionProgress.current / actionProgress.total) * 100}%` }}
                      ></div>
                  </div>
              </div>
          </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-soft border border-ice-100 dark:border-gray-700">
        <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto">
            <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Cari SKU atau Nama..." 
                    className="w-full pl-10 pr-4 py-2.5 bg-ice-50 dark:bg-gray-900 border border-ice-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-ice-300 transition-all text-sm dark:text-gray-200"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="relative w-full md:w-48">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select 
                    className="w-full pl-10 pr-4 py-2.5 bg-ice-50 dark:bg-gray-900 border border-ice-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-ice-300 text-sm appearance-none cursor-pointer dark:text-gray-200"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>
        </div>

        {role !== 'viewer' && (
          <div className="flex items-center gap-3 w-full xl:w-auto">
            {selectedIds.size > 0 ? (
               <button 
                 onClick={handleBulkDelete}
                 className="flex items-center gap-2 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-800 px-4 py-2.5 rounded-xl font-bold transition-all text-sm animate-in zoom-in"
               >
                 <Trash2 size={18} /> Hapus ({selectedIds.size})
               </button>
            ) : (
              <>
                <button onClick={downloadTemplate} className="text-slate-400 hover:text-ice-600 transition-colors p-2" title="Download Template">
                    <Download size={20} />
                </button>
                <div className="relative">
                    <input type="file" accept=".csv, .xlsx, .xls" onChange={handleBulkImport} className="absolute inset-0 opacity-0 cursor-pointer w-full" />
                    <button className="flex items-center gap-2 bg-white dark:bg-gray-800 text-slate-600 dark:text-gray-300 border border-ice-200 dark:border-gray-700 hover:bg-ice-50 dark:hover:bg-gray-700 px-4 py-2.5 rounded-xl font-bold transition-colors text-sm whitespace-nowrap">
                        <FileSpreadsheet size={18} /> Bulk Import
                    </button>
                </div>
              </>
            )}
            <button 
              onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
              className="flex items-center gap-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg transition-colors text-sm whitespace-nowrap"
            >
              <Plus size={18} /> Tambah Barang
            </button>
          </div>
        )}
      </div>

      {/* Table Area */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-soft border border-ice-100 dark:border-gray-700 overflow-hidden flex flex-col max-h-[calc(100vh-240px)]">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left relative border-collapse">
            <thead className="bg-slate-50 dark:bg-gray-800 border-b border-ice-100 dark:border-gray-700 text-xs font-bold text-slate-500 dark:text-gray-400 uppercase sticky top-0 z-10">
              <tr>
                {role !== 'viewer' && (
                  <th className="p-5 w-10">
                    <button onClick={toggleSelectAll} className="text-slate-400 hover:text-ice-600 transition-colors">
                      {selectedIds.size === filteredItems.length && filteredItems.length > 0 ? <CheckSquare size={20} className="text-indigo-600" /> : <Square size={20} />}
                    </button>
                  </th>
                )}
                <th className="p-5">SKU / Nama</th>
                <th className="p-5">Lokasi</th>
                <th className="p-5">Harga</th>
                <th className="p-5 text-center">Stok Real-Time</th>
                <th className="p-5 text-center">Status</th>
                {role !== 'viewer' && <th className="p-5 text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-ice-50 dark:divide-gray-700">
              {filteredItems.map(item => (
                <tr key={item.id} className={`hover:bg-ice-50/50 dark:hover:bg-gray-700/50 transition-colors ${selectedIds.has(item.id) ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}`}>
                  {role !== 'viewer' && (
                    <td className="p-5">
                      <button onClick={() => toggleSelectItem(item.id)} className="text-slate-400 hover:text-ice-600 transition-colors">
                        {selectedIds.has(item.id) ? <CheckSquare size={20} className="text-indigo-600" /> : <Square size={20} />}
                      </button>
                    </td>
                  )}
                  <td className="p-5">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800 dark:text-white">{item.name}</span>
                      <span className="text-xs text-slate-500 dark:text-gray-500">{item.sku}</span>
                    </div>
                  </td>
                  <td className="p-5 text-sm">
                    <span className="px-2.5 py-1 bg-ice-50 dark:bg-gray-700 rounded-lg text-xs font-semibold text-slate-600 dark:text-gray-300">{item.location}</span>
                  </td>
                  <td className="p-5 text-sm font-semibold dark:text-gray-200">
                      Rp {item.price.toLocaleString('id-ID')}
                      <div className="text-[10px] text-slate-400 font-normal">Per {item.unit}</div>
                  </td>
                  <td className="p-5 text-center">
                    <div className="flex flex-col items-center gap-1">
                        <span className={`text-sm font-bold ${item.stock <= item.minLevel ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {item.stock} {item.unit}
                        </span>
                        {(item.unit2 || item.unit3) && (
                             <div className="flex flex-col gap-0.5">
                                {item.unit2 && <span className="text-[9px] text-slate-500 bg-ice-100 dark:bg-gray-700 px-2 py-0.5 rounded">{calculateDisplayStock(item.stock, item.ratio2!, item.op2 || 'multiply')} {item.unit2}</span>}
                                {item.unit3 && <span className="text-[9px] text-slate-500 bg-ice-100 dark:bg-gray-700 px-2 py-0.5 rounded">{calculateDisplayStock(item.stock, item.ratio3!, item.op3 || 'multiply')} {item.unit3}</span>}
                             </div>
                        )}
                    </div>
                  </td>
                  <td className="p-5 text-center">
                    {role !== 'viewer' ? (
                        <button onClick={() => handleToggleStatus(item)} className="text-slate-400 hover:text-ice-600">
                            {item.active ? <ToggleRight size={28} className="text-emerald-500" /> : <ToggleLeft size={28} />}
                        </button>
                    ) : (
                        <span className={`text-xs px-2 py-1 rounded-full font-bold ${item.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                            {item.active ? 'Active' : 'Inactive'}
                        </span>
                    )}
                  </td>
                  {role !== 'viewer' && (
                    <td className="p-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => { setEditingItem(item); setIsModalOpen(true); }} className="p-2 text-slate-400 hover:text-ice-600 transition-colors">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={role !== 'viewer' ? 7 : 5} className="p-10 text-center text-slate-400">Barang tidak ditemukan.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
          <ItemModal 
            item={editingItem} 
            onClose={() => setIsModalOpen(false)} 
            onSave={async (item) => { 
                try {
                    await storageService.saveItem(item); 
                    onRefresh(); 
                    setIsModalOpen(false); 
                    notify('Data barang disimpan', 'success'); 
                } catch (err) {
                    notify('Gagal menyimpan barang ke server', 'error');
                }
            }} 
          />
      )}
    </div>
  );
};

const ItemModal = ({ item, onClose, onSave }: { item: InventoryItem | null, onClose: () => void, onSave: (i: InventoryItem) => void }) => {
    const [formData, setFormData] = useState<any>(() => {
        if (item) return { 
            ...item, 
            unit2: item.unit2 || '', ratio2: item.ratio2 ?? '', op2: item.op2 || 'multiply',
            unit3: item.unit3 || '', ratio3: item.ratio3 ?? '', op3: item.op3 || 'multiply' 
        };
        return { 
            sku: '', name: '', category: '', location: '',
            active: true, stock: '', minLevel: '', price: '', unit: 'Pcs', 
            unit2: '', ratio2: '', op2: 'multiply', 
            unit3: '', ratio3: '', op3: 'multiply' 
        };
    });

    const handleChange = (e: any) => { 
        const { name, value } = e.target; 
        setFormData((prev: any) => ({ ...prev, [name]: value })); 
    };

    const handleOpChange = (level: 2 | 3, op: 'multiply' | 'divide') => { 
        setFormData((prev: any) => ({ ...prev, [`op${level}`]: op })); 
    };

    const handleSubmit = (e: React.FormEvent) => { 
        e.preventDefault(); 
        
        const payload: InventoryItem = {
            id: item?.id || crypto.randomUUID(),
            sku: formData.sku || '',
            name: formData.name || '',
            category: formData.category || '',
            location: formData.location || '',
            price: formData.price === '' ? 0 : Number(formData.price),
            unit: formData.unit || 'Pcs',
            stock: formData.stock === '' ? 0 : Number(formData.stock),
            minLevel: formData.minLevel === '' ? 0 : Number(formData.minLevel),
            active: Boolean(formData.active),
            unit2: formData.unit2 || null,
            ratio2: (formData.ratio2 === '' || formData.ratio2 === undefined) ? null : Number(formData.ratio2),
            op2: formData.op2 || 'multiply',
            unit3: formData.unit3 || null,
            ratio3: (formData.ratio3 === '' || formData.ratio3 === undefined) ? null : Number(formData.ratio3),
            op3: formData.op3 || 'multiply'
        };

        onSave(payload); 
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[95vh] border border-white/50">
                <div className="p-6 border-b border-ice-100 dark:border-gray-800 flex justify-between items-center bg-ice-50/50 dark:bg-gray-800">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">{item ? 'Edit Item' : 'Tambah Item Baru'}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors"><X size={20} className="text-slate-400"/></button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-8 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
                    <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">SKU</label>
                            <input required name="sku" value={formData.sku || ''} onChange={handleChange} className="w-full border border-ice-200 dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-950 text-dark dark:text-white outline-none focus:ring-2 focus:ring-indigo-300 transition-all" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Nama Barang</label>
                            <input required name="name" value={formData.name || ''} onChange={handleChange} className="w-full border border-ice-200 dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-950 text-dark dark:text-white outline-none focus:ring-2 focus:ring-indigo-300 transition-all" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Kategori</label>
                            <input required name="category" value={formData.category || ''} onChange={handleChange} className="w-full border border-ice-200 dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-950 text-dark dark:text-white outline-none focus:ring-2 focus:ring-indigo-300 transition-all"/>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Lokasi Rak/Gudang</label>
                            <input required name="location" value={formData.location || ''} onChange={handleChange} className="w-full border border-ice-200 dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-950 text-dark dark:text-white outline-none focus:ring-2 focus:ring-indigo-300 transition-all"/>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-5">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Harga Dasar</label>
                            <input required type="number" name="price" value={formData.price} onChange={handleChange} className="w-full border border-ice-200 dark:border-gray-700 p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-300 transition-all" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Satuan Utama</label>
                            <input required name="unit" value={formData.unit || ''} onChange={handleChange} className="w-full border border-ice-200 dark:border-gray-700 p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-300 transition-all" placeholder="Pcs/Kg/Meter"/>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Stok Sekarang</label>
                            <input required type="number" name="stock" value={formData.stock} onChange={handleChange} className="w-full border border-ice-200 dark:border-gray-700 p-3 rounded-xl font-bold text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-300 transition-all" />
                        </div>
                    </div>

                    {/* MULTI-UNIT SETTINGS */}
                    <div className="p-6 bg-indigo-50/30 dark:bg-gray-800/50 rounded-2xl border border-indigo-100 dark:border-gray-700 space-y-6">
                        <h4 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase flex items-center gap-2">
                            <Layers size={14}/> Multi-Unit & Konversi
                        </h4>

                        <div className="space-y-3">
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase">Satuan 2 (Optional)</label>
                                    <input name="unit2" value={formData.unit2 || ''} onChange={handleChange} className="w-full border border-ice-200 dark:border-gray-600 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-300" placeholder="Contoh: BOX" />
                                </div>
                                <div className="w-28">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase">Isi / Ratio</label>
                                    <input type="number" name="ratio2" value={formData.ratio2} onChange={handleChange} className="w-full border border-ice-200 dark:border-gray-600 p-3 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-300" />
                                </div>
                            </div>
                            {formData.unit2 && (
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-bold text-slate-500">Logic:</span>
                                    <div className="flex bg-white dark:bg-gray-700 rounded-lg border border-ice-200 dark:border-gray-600 p-1 shadow-sm">
                                        <button type="button" onClick={() => handleOpChange(2, 'multiply')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${formData.op2 === 'multiply' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>X</button>
                                        <button type="button" onClick={() => handleOpChange(2, 'divide')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${formData.op2 === 'divide' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>/</button>
                                    </div>
                                    <span className="text-[10px] text-slate-400 italic">
                                        (1 {formData.unit2} = {formData.op2 === 'multiply' ? (formData.ratio2 || 0) : `1/${formData.ratio2 || 0}`} {formData.unit})
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="h-px bg-indigo-100 dark:bg-gray-700"></div>

                        <div className="space-y-3">
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase">Satuan 3 (Optional)</label>
                                    <input name="unit3" value={formData.unit3 || ''} onChange={handleChange} className="w-full border border-ice-200 dark:border-gray-600 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-300" placeholder="Contoh: CTN" />
                                </div>
                                <div className="w-28">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase">Isi / Ratio</label>
                                    <input type="number" name="ratio3" value={formData.ratio3} onChange={handleChange} className="w-full border border-ice-200 dark:border-gray-600 p-3 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-300" />
                                </div>
                            </div>
                            {formData.unit3 && (
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-bold text-slate-500">Logic:</span>
                                    <div className="flex bg-white dark:bg-gray-700 rounded-lg border border-ice-200 dark:border-gray-600 p-1 shadow-sm">
                                        <button type="button" onClick={() => handleOpChange(3, 'multiply')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${formData.op3 === 'multiply' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>X</button>
                                        <button type="button" onClick={() => handleOpChange(3, 'divide')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${formData.op3 === 'divide' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>/</button>
                                    </div>
                                    <span className="text-[10px] text-slate-400 italic">
                                        (1 {formData.unit3} = {formData.op3 === 'multiply' ? (formData.ratio3 || 0) : `1/${formData.ratio3 || 0}`} {formData.unit})
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Minimal Stok (Alert)</label>
                        <input type="number" name="minLevel" value={formData.minLevel} onChange={handleChange} className="w-full border border-ice-200 dark:border-gray-700 p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-300 transition-all" />
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-6 py-2.5 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-all">Batal</button>
                        <button type="submit" className="px-8 py-2.5 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 shadow-lg transition-all">Simpan Barang</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
