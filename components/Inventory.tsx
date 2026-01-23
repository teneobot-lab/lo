
import React, { useState, useMemo } from 'react';
import { InventoryItem, Role } from '../types';
import { Plus, Search, Edit2, Trash2, Filter, ToggleLeft, ToggleRight, X, FileSpreadsheet, Layers, Loader2, CheckSquare, Square, Table } from 'lucide-react';
import { storageService } from '../services/storageService';
import { googleSheetsService } from '../services/googleSheetsService';
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
  
  const [isImporting, setIsImporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [actionProgress, setActionProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set<string>());

  const categories = useMemo(() => {
    const cats = new Set(items.map(i => i.category));
    return ['All', ...Array.from(cats)];
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
      let matchesStatus = true;
      if (statusFilter === 'Low Stock') matchesStatus = item.stock <= item.minLevel;
      if (statusFilter === 'Active') matchesStatus = item.active;
      if (statusFilter === 'Inactive') matchesStatus = !item.active;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [items, searchTerm, categoryFilter, statusFilter]);

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length) setSelectedIds(new Set<string>());
    else setSelectedIds(new Set(filteredItems.map(i => i.id)));
  };

  const toggleSelectItem = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleDelete = async (id: string) => {
    try {
      if (window.confirm('Hapus item ini?')) {
        await storageService.deleteItem(id);
        onRefresh();
        notify('Item dihapus', 'success');
      }
    } catch (e) { notify("Gagal menghapus", 'error'); }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Hapus ${selectedIds.size} item?`)) return;
    setIsDeleting(true);
    const idsArray = Array.from(selectedIds);
    try {
      for (let i = 0; i < idsArray.length; i += 5) {
        const chunk = idsArray.slice(i, i + 5);
        await Promise.all(chunk.map(id => storageService.deleteItem(id)));
        setActionProgress({ current: Math.min(i + 5, idsArray.length), total: idsArray.length });
      }
      setSelectedIds(new Set<string>());
      notify('Hapus massal berhasil', 'success');
      onRefresh();
    } catch (e) { notify("Gagal hapus massal", 'error'); } finally { setIsDeleting(false); }
  };

  const handleSyncToSheets = async () => {
    const webhookUrl = localStorage.getItem('nexus_sheet_webhook');
    if (!webhookUrl) {
      notify("Konfigurasi Google Sheets belum diatur di Admin Hub!", 'warning');
      return;
    }

    setIsSyncing(true);
    try {
      const syncData = items.map(i => ({
        SKU: i.sku,
        Nama: i.name,
        Kategori: i.category,
        Stok: i.stock,
        Satuan: i.unit,
        Harga: i.price,
        Lokasi: i.location,
        Status: i.active ? 'Active' : 'Inactive',
        Terakhir_Update: new Date().toLocaleString()
      }));

      await googleSheetsService.sync(webhookUrl, { type: 'Inventory', data: syncData });
      notify("Sinkronisasi Master Stok Berhasil!", 'success');
    } catch (e: any) {
      notify(e.message || "Gagal sinkronisasi", 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleStatus = async (item: InventoryItem) => {
    try {
      await storageService.saveItem({ ...item, active: !item.active });
      onRefresh();
      notify('Status diperbarui', 'info');
    } catch (e) { notify("Gagal update status", 'error'); }
  };

  const handleBulkImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws) as any[];
        setIsImporting(true);
        for (let i = 0; i < data.length; i += 5) {
            const chunk = data.slice(i, i + 5);
            await Promise.all(chunk.map(async (row) => {
                const sku = String(row.SKU || row.sku).trim();
                const existing = items.find(item => item.sku === sku);
                const newItem: InventoryItem = {
                    id: existing ? existing.id : crypto.randomUUID(), 
                    sku: sku,
                    name: row.Name || row.name || (existing?.name || 'Unnamed'),
                    category: row.Category || row.category || 'General',
                    price: Number(row.Price || row.price || 0),
                    location: row.Location || row.location || 'A-01',
                    unit: row.Unit || row.unit || 'Pcs',
                    stock: Number(row.Stock || row.stock || 0),
                    minLevel: Number(row.MinLevel || row.minLevel || 0),
                    active: true
                };
                return storageService.saveItem(newItem);
            }));
            setActionProgress({ current: Math.min(i + 5, data.length), total: data.length });
        }
        notify('Import berhasil', 'success');
        onRefresh();
      } catch (e) { notify("Gagal import", 'error'); } finally { setIsImporting(false); }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-6">
      {(isImporting || isDeleting || isSyncing) && (
          <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-md">
              <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-6 max-w-sm w-full border border-white/20">
                  <Loader2 size={48} className={`animate-spin ${isDeleting ? 'text-rose-500' : isSyncing ? 'text-emerald-500' : 'text-indigo-600'}`} />
                  <div className="text-center space-y-1">
                      <h4 className="font-bold text-slate-800 dark:text-white">{isDeleting ? 'Menghapus...' : isSyncing ? 'Sync ke Sheets...' : 'Import Data...'}</h4>
                      {!isSyncing && <p className="text-xs text-slate-500">{actionProgress.current} / {actionProgress.total}</p>}
                  </div>
              </div>
          </div>
      )}

      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-soft border border-ice-100 dark:border-gray-700">
        <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto">
            <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="text" placeholder="Cari SKU atau Nama..." className="w-full pl-10 pr-4 py-2.5 bg-ice-50 dark:bg-gray-900 border border-ice-200 dark:border-gray-700 rounded-xl focus:outline-none text-sm dark:text-gray-200" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="relative w-full md:w-48">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select className="w-full pl-10 pr-4 py-2.5 bg-ice-50 dark:bg-gray-900 border border-ice-200 dark:border-gray-700 rounded-xl focus:outline-none text-sm appearance-none cursor-pointer dark:text-gray-200" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>
        </div>

        {role !== 'viewer' && (
          <div className="flex items-center gap-3 w-full xl:w-auto">
            {selectedIds.size > 0 ? (
               <button onClick={handleBulkDelete} className="flex items-center gap-2 bg-rose-50 dark:bg-rose-900/30 text-rose-600 border border-rose-100 px-4 py-2.5 rounded-xl font-bold transition-all text-sm animate-in zoom-in"><Trash2 size={18} /> Hapus ({selectedIds.size})</button>
            ) : (
              <>
                <button onClick={handleSyncToSheets} className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border border-emerald-100 dark:border-emerald-800/50 px-4 py-2.5 rounded-xl font-bold transition-all text-sm hover:bg-emerald-100" title="Sync Master ke Google Sheets">
                    <Table size={18} /> Sync Sheet
                </button>
                <div className="relative">
                    <input type="file" accept=".xlsx, .xls" onChange={handleBulkImport} className="absolute inset-0 opacity-0 cursor-pointer w-full" />
                    <button className="flex items-center gap-2 bg-white dark:bg-gray-800 text-slate-600 border border-ice-200 px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm hover:bg-ice-50 transition-all"><FileSpreadsheet size={18} /> Bulk Import</button>
                </div>
              </>
            )}
            <button onClick={() => { setEditingItem(null); setIsModalOpen(true); }} className="flex items-center gap-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg transition-colors text-sm"><Plus size={18} /> Tambah Barang</button>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-soft border border-ice-100 dark:border-gray-700 overflow-hidden flex flex-col max-h-[calc(100vh-240px)]">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left relative border-collapse">
            <thead className="bg-slate-50 dark:bg-gray-800 border-b border-ice-100 dark:border-gray-700 text-xs font-bold text-slate-500 dark:text-gray-400 uppercase sticky top-0 z-10">
              <tr>
                {role !== 'viewer' && <th className="p-5 w-10"><button onClick={toggleSelectAll}>{selectedIds.size === filteredItems.length && filteredItems.length > 0 ? <CheckSquare size={20} className="text-indigo-600" /> : <Square size={20} />}</button></th>}
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
                <tr key={item.id} className={`hover:bg-ice-50/50 dark:hover:bg-gray-700/50 transition-colors ${selectedIds.has(item.id) ? 'bg-indigo-50/30' : ''}`}>
                  {role !== 'viewer' && <td className="p-5"><button onClick={() => toggleSelectItem(item.id)}>{selectedIds.has(item.id) ? <CheckSquare size={20} className="text-indigo-600" /> : <Square size={20} />}</button></td>}
                  <td className="p-5"><div className="flex flex-col"><span className="font-bold text-slate-800 dark:text-white">{item.name}</span><span className="text-xs text-slate-500">{item.sku}</span></div></td>
                  <td className="p-5 text-sm"><span className="px-2.5 py-1 bg-ice-50 dark:bg-gray-700 rounded-lg text-xs font-semibold text-slate-600 dark:text-gray-300">{item.location}</span></td>
                  <td className="p-5 text-sm font-semibold dark:text-gray-200">Rp {item.price.toLocaleString('id-ID')}</td>
                  <td className="p-5 text-center"><span className={`text-sm font-bold ${item.stock <= item.minLevel ? 'text-rose-500' : 'text-emerald-600'}`}>{item.stock} {item.unit}</span></td>
                  <td className="p-5 text-center">{role !== 'viewer' ? <button onClick={() => handleToggleStatus(item)} className="text-slate-400">{item.active ? <ToggleRight size={28} className="text-emerald-500" /> : <ToggleLeft size={28} />}</button> : <span className={`text-xs px-2 py-1 rounded-full font-bold ${item.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>{item.active ? 'Active' : 'Inactive'}</span>}</td>
                  {role !== 'viewer' && <td className="p-5 text-right"><div className="flex items-center justify-end gap-2"><button onClick={() => { setEditingItem(item); setIsModalOpen(true); }} className="p-2 text-slate-400 hover:text-indigo-600"><Edit2 size={16} /></button><button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-rose-500"><Trash2 size={16} /></button></div></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && <ItemModal item={editingItem} onClose={() => setIsModalOpen(false)} onSave={async (item) => { await storageService.saveItem(item); onRefresh(); setIsModalOpen(false); notify('Berhasil disimpan', 'success'); }} />}
    </div>
  );
};

const ItemModal = ({ item, onClose, onSave }: { item: InventoryItem | null, onClose: () => void, onSave: (i: InventoryItem) => void }) => {
    const [formData, setFormData] = useState<any>(item ? { ...item } : { sku: '', name: '', category: '', location: '', active: true, stock: '', minLevel: '', price: '', unit: 'Pcs' });
    const handleChange = (e: any) => setFormData((prev: any) => ({ ...prev, [e.target.name]: e.target.value }));
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            id: item?.id || crypto.randomUUID(),
            sku: formData.sku,
            name: formData.name,
            category: formData.category || 'General',
            location: formData.location || 'A-01',
            price: Number(formData.price),
            unit: formData.unit || 'Pcs',
            stock: Number(formData.stock),
            minLevel: Number(formData.minLevel),
            active: Boolean(formData.active)
        });
    };
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col border border-white/50">
                <div className="p-6 border-b border-ice-100 dark:border-gray-800 flex justify-between items-center bg-ice-50/50 dark:bg-gray-800"><h3 className="text-xl font-bold text-slate-800 dark:text-white">{item ? 'Edit Item' : 'Tambah Item'}</h3><button onClick={onClose}><X size={20} className="text-slate-400"/></button></div>
                <form onSubmit={handleSubmit} className="p-8 space-y-5">
                    <div className="grid grid-cols-2 gap-5">
                        <input required name="sku" placeholder="SKU" value={formData.sku} onChange={handleChange} className="w-full border p-3 rounded-xl dark:bg-gray-950 dark:text-white" />
                        <input required name="name" placeholder="Nama" value={formData.name} onChange={handleChange} className="w-full border p-3 rounded-xl dark:bg-gray-950 dark:text-white" />
                    </div>
                    <div className="grid grid-cols-3 gap-5">
                        <input required type="number" name="price" placeholder="Harga" value={formData.price} onChange={handleChange} className="w-full border p-3 rounded-xl dark:bg-gray-950 dark:text-white" />
                        <input required name="unit" placeholder="Satuan" value={formData.unit} onChange={handleChange} className="w-full border p-3 rounded-xl dark:bg-gray-950 dark:text-white" />
                        <input required type="number" name="stock" placeholder="Stok" value={formData.stock} onChange={handleChange} className="w-full border p-3 rounded-xl dark:bg-gray-950 dark:text-white font-bold text-indigo-600" />
                    </div>
                    <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={onClose} className="px-6 py-2.5 text-slate-500 font-bold">Batal</button><button type="submit" className="px-8 py-2.5 bg-slate-800 text-white font-bold rounded-xl shadow-lg">Simpan</button></div>
                </form>
            </div>
        </div>
    );
};
