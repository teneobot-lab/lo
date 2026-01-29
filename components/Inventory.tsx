
import React, { useState, useMemo } from 'react';
import { InventoryItem, Role } from '../types';
import { Plus, Search, Edit2, Trash2, Filter, ToggleLeft, ToggleRight, X, FileSpreadsheet, CheckSquare, Square, Table, CloudUpload, ArrowUpDown, Settings2, Download, Package } from 'lucide-react';
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

type SortConfig = { key: keyof InventoryItem | ''; direction: 'asc' | 'desc' };

export const Inventory: React.FC<InventoryProps> = ({ items, role, onRefresh, notify }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set<string>());
  
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'asc' });
  const [visibleColumns, setVisibleColumns] = useState({
      select: true, sku: true, name: true, category: true, location: true, price: true, stock: true, status: true, action: true
  });
  const [showColMenu, setShowColMenu] = useState(false);

  const categories = useMemo(() => {
    const cats = new Set(items.map(i => i.category));
    return ['All', ...Array.from(cats)];
  }, [items]);

  const filteredItems = useMemo(() => {
    let result = items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
      let matchesStatus = true;
      if (statusFilter === 'Low Stock') matchesStatus = item.stock <= item.minLevel;
      if (statusFilter === 'Active') matchesStatus = item.active;
      if (statusFilter === 'Inactive') matchesStatus = !item.active;
      return matchesSearch && matchesCategory && matchesStatus;
    });

    if (sortConfig.key) {
        result.sort((a, b) => {
            const aVal = a[sortConfig.key as keyof InventoryItem];
            const bVal = b[sortConfig.key as keyof InventoryItem];
            if (aVal === undefined || bVal === undefined) return 0;
            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }
    return result;
  }, [items, searchTerm, categoryFilter, statusFilter, sortConfig]);

  // Fix: Corrected type annotation for direction to use a union type instead of an invalid ternary expression
  const handleSort = (key: keyof InventoryItem) => {
      let direction: 'asc' | 'desc' = 'asc';
      if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
      setSortConfig({ key, direction });
  };

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

  const downloadTemplate = () => {
    const template = [
      { SKU: 'ITEM-001', Name: 'Produk Contoh A', Category: 'Elektronik', Price: 50000, Location: 'A-01', Unit: 'Pcs', Stock: 100, MinLevel: 10 },
      { SKU: 'ITEM-002', Name: 'Produk Contoh B', Category: 'Makanan', Price: 15000, Location: 'B-05', Unit: 'Pack', Stock: 50, MinLevel: 5 }
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Inventory");
    XLSX.writeFile(wb, "Nexus_Template_Inventory.xlsx");
    notify("Template berhasil diunduh!", "info");
  };

  const handleSyncToSheets = async () => {
    const webhookUrl = localStorage.getItem('nexus_sheet_webhook');
    if (!webhookUrl) { notify("Konfigurasi Google Sheets belum diatur!", 'warning'); return; }
    setIsSyncing(true);
    try {
      const syncData = items.map(i => ({ SKU: i.sku, Nama: i.name, Kategori: i.category, Stok: i.stock, Satuan: i.unit, Harga: i.price, Lokasi: i.location, Status: i.active ? 'Active' : 'Inactive', Terakhir_Update: new Date().toLocaleString() }));
      await googleSheetsService.sync(webhookUrl, { type: 'Inventory', data: syncData });
      notify("Sinkronisasi Berhasil!", 'success');
    } catch (e: any) { notify(e.message || "Gagal sinkronisasi", 'error'); } finally { setIsSyncing(false); }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Hapus item ini?')) { try { await storageService.deleteItem(id); onRefresh(); notify('Item dihapus', 'success'); } catch (e) { notify("Gagal menghapus", 'error'); } }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Hapus ${selectedIds.size} item?`)) return;
    const idsArray = Array.from(selectedIds);
    try {
      for (let i = 0; i < idsArray.length; i += 5) { await Promise.all(idsArray.slice(i, i + 5).map(id => storageService.deleteItem(id))); }
      setSelectedIds(new Set<string>()); notify('Hapus massal berhasil', 'success'); onRefresh();
    } catch (e) { notify("Gagal hapus massal", 'error'); }
  };

  const handleToggleStatus = async (item: InventoryItem) => {
    try { await storageService.saveItem({ ...item, active: !item.active }); onRefresh(); } catch (e) { notify("Gagal update status", 'error'); }
  };

  const handleBulkImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const rawData = reader.result;
        if (!rawData || typeof rawData === 'string') return;
        const data = rawData as ArrayBuffer;
        const wb = XLSX.read(data, { type: 'array' });
        const sheetName = wb.SheetNames[0] as string;
        if (!sheetName) throw new Error("Format Excel tidak valid");
        const ws = wb.Sheets[sheetName]; 
        const sheetData = XLSX.utils.sheet_to_json(ws) as any[];
        
        setIsImporting(true);
        let successCount = 0;

        for (let i = 0; i < sheetData.length; i += 5) {
            const chunk = sheetData.slice(i, i + 5);
            await Promise.all(chunk.map(async (row: any) => {
                // Mendukung Case Insensitive header dari Template
                const sku = String(row.SKU || row.sku || '').trim(); 
                if (!sku) return;

                const existing = items.find(item => item.sku === sku);
                
                // Logic: Jika kolom kosong, gunakan default atau data lama
                const newItem: InventoryItem = { 
                  id: existing ? existing.id : (window.crypto.randomUUID() as string), 
                  sku: sku, 
                  name: row.Name || row.name || row.Nama || row.nama || (existing?.name || 'Produk Tanpa Nama'), 
                  category: row.Category || row.category || row.Kategori || row.kategori || (existing?.category || 'General'), 
                  price: Number(row.Price || row.price || row.Harga || row.harga || (existing?.price || 0)), 
                  location: row.Location || row.location || row.Lokasi || row.lokasi || (existing?.location || 'A-01'), 
                  unit: row.Unit || row.unit || row.Satuan || row.satuan || (existing?.unit || 'Pcs'), 
                  stock: Number(row.Stock || row.stock || row.Stok || row.stok || (existing?.stock || 0)), 
                  minLevel: Number(row.MinLevel || row.minLevel || (existing?.minLevel || 0)), 
                  active: existing ? existing.active : true 
                };
                
                successCount++;
                return storageService.saveItem(newItem);
            }));
        }
        
        notify(`Berhasil import ${successCount} data!`, 'success'); 
        onRefresh();
      } catch (e: any) { 
        notify("Gagal membaca file Excel. Pastikan format benar.", 'error'); 
      } finally { 
        setIsImporting(false); 
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = ''; 
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] space-y-4 animate-in fade-in duration-300">
      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-paper border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-3">
        <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="text" placeholder="Cari SKU / Nama Barang..." className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-paper-blue focus:border-transparent outline-none dark:text-white transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <select className="pl-3 pr-8 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-paper-blue dark:text-white appearance-none cursor-pointer" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={() => setShowColMenu(!showColMenu)} className="p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 text-slate-600 dark:text-gray-300 transition-colors">
                <Settings2 size={18} />
            </button>
            {showColMenu && (
                <div className="absolute top-20 left-10 mt-1 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 p-3 animate-in zoom-in duration-150">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Tampilan Kolom</p>
                    {Object.keys(visibleColumns).map((key) => (
                        key !== 'select' && key !== 'action' && (
                            <label key={key} className="flex items-center gap-3 px-2 py-2 hover:bg-slate-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer text-xs text-slate-700 dark:text-gray-300 capitalize font-medium">
                                <input type="checkbox" checked={(visibleColumns as any)[key]} onChange={() => setVisibleColumns(prev => ({ ...prev, [key]: !(prev as any)[key] }))} className="rounded text-paper-blue focus:ring-paper-blue" /> {key}
                            </label>
                        )
                    ))}
                </div>
            )}
        </div>

        {role !== 'viewer' && (
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 ? (
               <button onClick={handleBulkDelete} className="bg-rose-50 text-rose-600 border border-rose-200 px-4 py-2 rounded-lg font-bold text-xs hover:bg-rose-100 flex items-center gap-2 transition-all"><Trash2 size={14} /> Hapus ({selectedIds.size})</button>
            ) : (
              <>
                <button onClick={downloadTemplate} className="p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 text-slate-600 dark:text-gray-300" title="Download Template Excel">
                    <Download size={18} />
                </button>
                <button onClick={handleSyncToSheets} disabled={isSyncing} className="bg-white text-emerald-600 border border-emerald-200 px-4 py-2 rounded-lg font-bold text-xs hover:bg-emerald-50 flex items-center gap-2 transition-all">
                    {isSyncing ? <div className="animate-spin w-3 h-3 border-2 border-current border-t-transparent rounded-full" /> : <Table size={16} />} Sync
                </button>
                <div className="relative">
                    <input type="file" accept=".xlsx, .xls" onChange={handleBulkImport} className="absolute inset-0 opacity-0 cursor-pointer w-full" />
                    <button className="bg-white text-slate-600 border border-gray-300 px-4 py-2 rounded-lg font-bold text-xs hover:bg-gray-50 flex items-center gap-2 transition-all"><FileSpreadsheet size={16} /> Import</button>
                </div>
                <button onClick={() => { setEditingItem(null); setIsModalOpen(true); }} className="bg-paper-blue text-white px-6 py-2 rounded-lg font-bold text-xs hover:bg-paper-blueHover flex items-center gap-2 shadow-sm transition-all active:scale-95"><Plus size={16} /> Tambah Barang</button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Enterprise Table */}
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-paper border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse enterprise-table">
            <thead>
              <tr>
                {visibleColumns.select && role !== 'viewer' && (
                    <th className="p-4 w-12 text-center sticky left-0 z-30 bg-slate-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
                        <button onClick={toggleSelectAll} className="text-slate-400 hover:text-paper-blue">{selectedIds.size === filteredItems.length && filteredItems.length > 0 ? <CheckSquare size={18} className="text-paper-blue" /> : <Square size={18} />}</button>
                    </th>
                )}
                {visibleColumns.sku && <th className="p-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('sku')}><div className="flex items-center gap-2">SKU {sortConfig.key === 'sku' && <ArrowUpDown size={12}/>}</div></th>}
                {visibleColumns.name && <th className="p-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('name')}><div className="flex items-center gap-2">Nama Barang {sortConfig.key === 'name' && <ArrowUpDown size={12}/>}</div></th>}
                {visibleColumns.category && <th className="p-4">Kategori</th>}
                {visibleColumns.location && <th className="p-4">Lokasi</th>}
                {visibleColumns.price && <th className="p-4 text-right">Harga</th>}
                {visibleColumns.stock && <th className="p-4 text-center">Stok</th>}
                {visibleColumns.status && <th className="p-4 text-center">Status</th>}
                {visibleColumns.action && role !== 'viewer' && <th className="p-4 text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
              {filteredItems.map((item, idx) => (
                <tr key={item.id} className={`hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors text-sm ${selectedIds.has(item.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                  {visibleColumns.select && role !== 'viewer' && (
                    <td className="p-4 text-center border-r border-slate-100 dark:border-gray-700 sticky left-0 bg-inherit z-10">
                      <button onClick={() => toggleSelectItem(item.id)}>{selectedIds.has(item.id) ? <CheckSquare size={18} className="text-paper-blue" /> : <Square size={18} className="text-slate-200" />}</button>
                    </td>
                  )}
                  {visibleColumns.sku && <td className="p-4 font-mono text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{item.sku}</td>}
                  {visibleColumns.name && <td className="p-4 font-bold text-slate-800 dark:text-gray-100">{item.name}</td>}
                  {visibleColumns.category && <td className="p-4 text-slate-500 dark:text-gray-400 text-xs font-medium">{item.category}</td>}
                  {visibleColumns.location && <td className="p-4"><span className="px-2 py-0.5 bg-slate-100 dark:bg-gray-700 rounded text-slate-600 dark:text-gray-300 font-mono text-[10px] border border-slate-200 dark:border-gray-600">{item.location}</span></td>}
                  {visibleColumns.price && <td className="p-4 text-right font-bold text-slate-700 dark:text-gray-200">Rp {item.price.toLocaleString('id-ID')}</td>}
                  {visibleColumns.stock && (
                    <td className="p-4 text-center">
                        <div className="flex flex-col items-center">
                            <span className={`text-xs font-bold ${item.stock <= item.minLevel ? 'text-rose-600' : 'text-emerald-600'}`}>{item.stock} {item.unit}</span>
                            {(item.unit2 || item.unit3) && <div className="text-[10px] text-slate-400 mt-1">{item.unit2 && <span>{item.unit2}</span>}</div>}
                        </div>
                    </td>
                  )}
                  {visibleColumns.status && (
                    <td className="p-4 text-center">
                        <button onClick={() => role !== 'viewer' && handleToggleStatus(item)} className={role === 'viewer' ? 'cursor-default' : 'cursor-pointer'}>
                            {item.active ? <ToggleRight size={24} className="text-emerald-500" /> : <ToggleLeft size={24} className="text-slate-300" />}
                        </button>
                    </td>
                  )}
                  {visibleColumns.action && role !== 'viewer' && (
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => { setEditingItem(item); setIsModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-paper-blue hover:bg-slate-50 rounded-lg transition-all"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-slate-100 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 flex justify-between items-center text-xs font-bold text-slate-500 dark:text-gray-400">
            <div className="uppercase tracking-widest">Total: <span className="text-slate-800 dark:text-white">{filteredItems.length}</span> Barang</div>
            <div className="uppercase tracking-widest">Valuasi: <span className="text-paper-blue">Rp {filteredItems.reduce((acc, i) => acc + (i.price * i.stock), 0).toLocaleString()}</span></div>
        </div>
      </div>

      {isModalOpen && <ItemModal item={editingItem} onClose={() => setIsModalOpen(false)} onSave={async (item) => { await storageService.saveItem(item); onRefresh(); setIsModalOpen(false); notify('Data barang disimpan', 'success'); }} />}
    </div>
  );
};

const ItemModal = ({ item, onClose, onSave }: { item: InventoryItem | null, onClose: () => void, onSave: (i: InventoryItem) => void }) => {
    const [formData, setFormData] = useState<any>(item ? { ...item } : { sku: '', name: '', category: '', location: '', active: true, stock: '', minLevel: '', price: '', unit: 'Pcs' });
    const handleChange = (e: any) => setFormData((prev: any) => ({ ...prev, [e.target.name]: e.target.value }));
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ id: item?.id || (window.crypto.randomUUID() as string), sku: formData.sku, name: formData.name, category: formData.category || 'General', location: formData.location || 'A-01', price: Number(formData.price), unit: formData.unit || 'Pcs', stock: Number(formData.stock), minLevel: Number(formData.minLevel), active: Boolean(formData.active), unit2: formData.unit2 || null, ratio2: formData.ratio2 ? Number(formData.ratio2) : null, op2: formData.op2 || 'multiply', unit3: formData.unit3 || null, ratio3: formData.ratio3 ? Number(formData.ratio3) : null, op3: formData.op3 || 'multiply' });
    };
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden border border-white/10 animate-in zoom-in duration-300">
                <div className="p-6 border-b border-slate-100 dark:border-gray-800 flex justify-between items-center bg-slate-50 dark:bg-gray-800">
                    <h3 className="font-bold text-xl text-slate-800 dark:text-white flex items-center gap-3">
                        <Package size={22} className="text-paper-blue"/> {item ? 'Edit Barang' : 'Tambah Barang Baru'}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-all"><X size={24} className="text-slate-400"/></button>
                </div>
                <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">SKU Produk</label><input required name="sku" value={formData.sku} onChange={handleChange} className="w-full border border-slate-200 dark:border-gray-700 p-3 rounded-xl text-sm focus:ring-2 focus:ring-paper-blue outline-none transition-all dark:bg-gray-800 dark:text-white" placeholder="ID Barang" /></div>
                        <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Nama Barang</label><input required name="name" value={formData.name} onChange={handleChange} className="w-full border border-slate-200 dark:border-gray-700 p-3 rounded-xl text-sm focus:ring-2 focus:ring-paper-blue outline-none transition-all dark:bg-gray-800 dark:text-white" placeholder="Nama Lengkap" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Kategori</label><input name="category" value={formData.category} onChange={handleChange} className="w-full border border-slate-200 dark:border-gray-700 p-3 rounded-xl text-sm outline-none dark:bg-gray-800 dark:text-white" /></div>
                        <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Lokasi Rak</label><input name="location" value={formData.location} onChange={handleChange} className="w-full border border-slate-200 dark:border-gray-700 p-3 rounded-xl text-sm outline-none dark:bg-gray-800 dark:text-white" /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-6">
                        <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Harga Beli</label><input type="number" name="price" value={formData.price} onChange={handleChange} className="w-full border border-slate-200 dark:border-gray-700 p-3 rounded-xl text-sm outline-none dark:bg-gray-800 dark:text-white" /></div>
                        <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Stok Awal</label><input type="number" name="stock" value={formData.stock} onChange={handleChange} className="w-full border border-slate-200 dark:border-gray-700 p-3 rounded-xl text-sm font-bold text-paper-blue outline-none dark:bg-gray-800" /></div>
                        <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Satuan</label><input name="unit" value={formData.unit} onChange={handleChange} className="w-full border border-slate-200 dark:border-gray-700 p-3 rounded-xl text-sm outline-none dark:bg-gray-800 dark:text-white" placeholder="Pcs" /></div>
                    </div>
                    <div className="p-6 bg-slate-50 dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-700 space-y-4">
                        <p className="text-[10px] font-bold text-paper-blue uppercase tracking-widest">Multi-Satuan (Opsional)</p>
                        <div className="grid grid-cols-3 gap-4">
                            <input name="unit2" placeholder="Unit 2 (Box)" value={formData.unit2 || ''} onChange={handleChange} className="p-3 border border-slate-200 dark:border-gray-600 rounded-xl text-xs dark:bg-gray-700 dark:text-white" />
                            <input type="number" name="ratio2" placeholder="Isi per Unit" value={formData.ratio2 || ''} onChange={handleChange} className="p-3 border border-slate-200 dark:border-gray-600 rounded-xl text-xs dark:bg-gray-700 dark:text-white" />
                            <select name="op2" value={formData.op2} onChange={handleChange} className="p-3 border border-slate-200 dark:border-gray-600 rounded-xl text-xs dark:bg-gray-700 dark:text-white appearance-none"><option value="multiply">Kali (X)</option><option value="divide">Bagi (/)</option></select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-gray-800">
                        <button type="button" onClick={onClose} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-all">Batal</button>
                        <button type="submit" className="px-8 py-3 bg-paper-blue text-white font-bold rounded-xl shadow-lg hover:bg-paper-blueHover transition-all active:scale-95">Simpan Barang</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
