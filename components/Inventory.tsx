
import React, { useState, useMemo } from 'react';
import { InventoryItem, Role } from '../types';
import { Plus, Search, Edit2, Trash2, Filter, ToggleLeft, ToggleRight, X, FileSpreadsheet, CheckSquare, Square, Table, CloudUpload, ArrowUpDown, Settings2 } from 'lucide-react';
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
        const data = reader.result;
        
        if (!data || typeof data === 'string') return;

        // Use data directly as it's ArrayBuffer
        // Fix: Cast data to any to avoid type mismatch if inferred as unknown/string
        const wb = XLSX.read(data as any, { type: 'array' });
        const sheetName = wb.SheetNames[0];
        if (typeof sheetName !== 'string') throw new Error("Format Excel tidak valid");
        
        const ws = wb.Sheets[sheetName]; 
        const sheetData = XLSX.utils.sheet_to_json(ws) as any[];
        
        setIsImporting(true);
        for (let i = 0; i < sheetData.length; i += 5) {
            const chunk = sheetData.slice(i, i + 5);
            await Promise.all(chunk.map(async (row) => {
                const sku = String(row.SKU || row.sku).trim(); const existing = items.find(item => item.sku === sku);
                const newItem: InventoryItem = { id: existing ? existing.id : (crypto.randomUUID() as string), sku: sku, name: row.Name || row.name || (existing?.name || 'Unnamed'), category: row.Category || row.category || 'General', price: Number(row.Price || row.price || 0), location: row.Location || row.location || 'A-01', unit: row.Unit || row.unit || 'Pcs', stock: Number(row.Stock || row.stock || 0), minLevel: Number(row.MinLevel || row.minLevel || 0), active: true };
                return storageService.saveItem(newItem);
            }));
        }
        notify('Import berhasil', 'success'); onRefresh();
      } catch (e: any) { notify("Gagal import", 'error'); } finally { setIsImporting(false); }
    };
    reader.readAsArrayBuffer(file);
  };

  const calculateDisplayStock = (baseStock: number, ratio: number, op: 'multiply' | 'divide') => {
      if (!ratio || ratio === 0) return 0;
      if (op === 'multiply') return parseFloat((baseStock / ratio).toFixed(2));
      return parseFloat((baseStock * ratio).toFixed(2));
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] space-y-4">
      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-800 p-3 rounded shadow-card border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-3">
        <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input type="text" placeholder="Cari SKU / Nama..." className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-1 focus:ring-corporate-500 focus:border-corporate-500 outline-none dark:bg-gray-900 dark:text-white" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <select className="pl-3 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-1 focus:ring-corporate-500 focus:border-corporate-500 outline-none bg-white dark:bg-gray-900 dark:text-white" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="relative">
                <button onClick={() => setShowColMenu(!showColMenu)} className="p-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300" title="Atur Kolom">
                    <Settings2 size={16} />
                </button>
                {showColMenu && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded shadow-lg border border-gray-200 dark:border-gray-700 z-50 p-2">
                        {Object.keys(visibleColumns).map((key) => (
                            key !== 'select' && key !== 'action' && (
                                <label key={key} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer text-xs text-gray-700 dark:text-gray-300 capitalize">
                                    <input type="checkbox" checked={(visibleColumns as any)[key]} onChange={() => setVisibleColumns(prev => ({ ...prev, [key]: !(prev as any)[key] }))} className="rounded text-corporate-600" /> {key}
                                </label>
                            )
                        ))}
                    </div>
                )}
            </div>
        </div>

        {role !== 'viewer' && (
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 ? (
               <button onClick={handleBulkDelete} className="bg-red-50 text-red-600 border border-red-200 px-3 py-2 rounded font-bold text-xs hover:bg-red-100 flex items-center gap-2"><Trash2 size={14} /> Hapus ({selectedIds.size})</button>
            ) : (
              <>
                <button onClick={handleSyncToSheets} disabled={isSyncing} className="bg-white text-green-600 border border-green-200 px-3 py-2 rounded font-medium text-xs hover:bg-green-50 flex items-center gap-2">
                    {isSyncing ? <div className="animate-spin w-3 h-3 border-2 border-current border-t-transparent rounded-full" /> : <Table size={14} />} Sync
                </button>
                <div className="relative">
                    <input type="file" accept=".xlsx, .xls" onChange={handleBulkImport} className="absolute inset-0 opacity-0 cursor-pointer w-full" />
                    <button className="bg-white text-gray-600 border border-gray-300 px-3 py-2 rounded font-medium text-xs hover:bg-gray-50 flex items-center gap-2"><FileSpreadsheet size={14} /> Import</button>
                </div>
                <button onClick={() => { setEditingItem(null); setIsModalOpen(true); }} className="bg-corporate-600 text-white px-4 py-2 rounded font-bold text-xs hover:bg-corporate-700 flex items-center gap-2 shadow-sm"><Plus size={14} /> Baru</button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Enterprise Table */}
      <div className="flex-1 bg-white dark:bg-gray-800 rounded shadow-card border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse enterprise-table">
            <thead className="sticky top-0 z-20">
              <tr>
                {visibleColumns.select && role !== 'viewer' && (
                    <th className="p-3 w-10 text-center sticky left-0 z-30 bg-[#EBECF0] dark:bg-gray-800 border-r border-gray-300 dark:border-gray-700">
                        <button onClick={toggleSelectAll} className="text-gray-500 hover:text-corporate-600">{selectedIds.size === filteredItems.length && filteredItems.length > 0 ? <CheckSquare size={16} className="text-corporate-600" /> : <Square size={16} />}</button>
                    </th>
                )}
                {visibleColumns.sku && <th className="p-3 cursor-pointer hover:bg-gray-200" onClick={() => handleSort('sku')}><div className="flex items-center gap-1">SKU {sortConfig.key === 'sku' && <ArrowUpDown size={12}/>}</div></th>}
                {visibleColumns.name && <th className="p-3 cursor-pointer hover:bg-gray-200" onClick={() => handleSort('name')}><div className="flex items-center gap-1">Nama Barang {sortConfig.key === 'name' && <ArrowUpDown size={12}/>}</div></th>}
                {visibleColumns.category && <th className="p-3 cursor-pointer hover:bg-gray-200" onClick={() => handleSort('category')}>Kategori</th>}
                {visibleColumns.location && <th className="p-3 cursor-pointer hover:bg-gray-200" onClick={() => handleSort('location')}>Lokasi</th>}
                {visibleColumns.price && <th className="p-3 text-right cursor-pointer hover:bg-gray-200" onClick={() => handleSort('price')}>Harga</th>}
                {visibleColumns.stock && <th className="p-3 text-center cursor-pointer hover:bg-gray-200" onClick={() => handleSort('stock')}>Stok</th>}
                {visibleColumns.status && <th className="p-3 text-center">Status</th>}
                {visibleColumns.action && role !== 'viewer' && <th className="p-3 text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item, idx) => (
                <tr key={item.id} className={`hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors text-sm ${selectedIds.has(item.id) ? 'bg-blue-50 dark:bg-blue-900/20' : idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-[#F9FAFB] dark:bg-gray-800/50'}`}>
                  {visibleColumns.select && role !== 'viewer' && (
                    <td className="p-2 text-center border-r border-gray-200 dark:border-gray-700 sticky left-0 bg-inherit z-10">
                      <button onClick={() => toggleSelectItem(item.id)}>{selectedIds.has(item.id) ? <CheckSquare size={16} className="text-corporate-600" /> : <Square size={16} className="text-gray-300" />}</button>
                    </td>
                  )}
                  {visibleColumns.sku && <td className="p-2 font-mono text-xs font-bold text-corporate-700 dark:text-corporate-400">{item.sku}</td>}
                  {visibleColumns.name && <td className="p-2 font-medium text-gray-800 dark:text-gray-200">{item.name}</td>}
                  {visibleColumns.category && <td className="p-2 text-gray-600 dark:text-gray-400 text-xs">{item.category}</td>}
                  {visibleColumns.location && <td className="p-2 text-xs"><span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-300 font-mono border border-gray-200 dark:border-gray-600">{item.location}</span></td>}
                  {visibleColumns.price && <td className="p-2 text-right font-medium text-gray-700 dark:text-gray-300">Rp {item.price.toLocaleString('id-ID')}</td>}
                  {visibleColumns.stock && (
                    <td className="p-2 text-center">
                        <div className="flex flex-col items-center">
                            <span className={`text-xs font-bold ${item.stock <= item.minLevel ? 'text-red-600' : 'text-green-600'}`}>{item.stock} {item.unit}</span>
                            {(item.unit2 || item.unit3) && <div className="text-[10px] text-gray-400 mt-0.5">{item.unit2 && <span>{calculateDisplayStock(item.stock, item.ratio2!, item.op2 || 'multiply')}{item.unit2}</span>}</div>}
                        </div>
                    </td>
                  )}
                  {visibleColumns.status && (
                    <td className="p-2 text-center">
                        {role !== 'viewer' ? (
                            <button onClick={() => handleToggleStatus(item)}>{item.active ? <ToggleRight size={20} className="text-green-500" /> : <ToggleLeft size={20} className="text-gray-400" />}</button>
                        ) : (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${item.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{item.active ? 'Aktif' : 'Non-Aktif'}</span>
                        )}
                    </td>
                  )}
                  {visibleColumns.action && role !== 'viewer' && (
                    <td className="p-2 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => { setEditingItem(item); setIsModalOpen(true); }} className="p-1 text-gray-500 hover:text-corporate-600 border border-transparent hover:border-gray-300 rounded"><Edit2 size={14} /></button>
                        <button onClick={() => handleDelete(item.id)} className="p-1 text-gray-500 hover:text-red-600 border border-transparent hover:border-gray-300 rounded"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-between items-center text-xs font-medium text-gray-600 dark:text-gray-400">
            <div>Total: <span className="font-bold">{filteredItems.length}</span> Barang</div>
            <div>Total Valuasi: <span className="font-bold">Rp {filteredItems.reduce((acc, i) => acc + (i.price * i.stock), 0).toLocaleString()}</span></div>
        </div>
      </div>

      {isModalOpen && <ItemModal item={editingItem} onClose={() => setIsModalOpen(false)} onSave={async (item) => { await storageService.saveItem(item); onRefresh(); setIsModalOpen(false); notify('Data barang disimpan', 'success'); }} />}
    </div>
  );
};

const ItemModal = ({ item, onClose, onSave }: { item: InventoryItem | null, onClose: () => void, onSave: (i: InventoryItem) => void }) => {
    // CHANGED: Numeric fields initialized to '' if new item
    const [formData, setFormData] = useState<any>(item ? { ...item } : { sku: '', name: '', category: '', location: '', active: true, stock: '', minLevel: '', price: '', unit: 'Pcs' });
    const handleChange = (e: any) => setFormData((prev: any) => ({ ...prev, [e.target.name]: e.target.value }));
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ id: item?.id || crypto.randomUUID(), sku: formData.sku, name: formData.name, category: formData.category || 'General', location: formData.location || 'A-01', price: Number(formData.price), unit: formData.unit || 'Pcs', stock: Number(formData.stock), minLevel: Number(formData.minLevel), active: Boolean(formData.active), unit2: formData.unit2 || null, ratio2: formData.ratio2 ? Number(formData.ratio2) : null, op2: formData.op2 || 'multiply', unit3: formData.unit3 || null, ratio3: formData.ratio3 ? Number(formData.ratio3) : null, op3: formData.op3 || 'multiply' });
    };
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800 rounded-t-lg">
                    <h3 className="font-bold text-gray-800 dark:text-white">{item ? 'Edit Barang' : 'Tambah Barang Baru'}</h3>
                    <button onClick={onClose}><X size={18} className="text-gray-500 hover:text-gray-800"/></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-xs font-bold text-gray-600 uppercase">SKU</label><input required name="sku" value={formData.sku} onChange={handleChange} className="w-full border border-gray-300 p-2 rounded text-sm focus:ring-1 focus:ring-corporate-500 outline-none" placeholder="Kode Unik" /></div>
                        <div className="space-y-1"><label className="text-xs font-bold text-gray-600 uppercase">Nama Barang</label><input required name="name" value={formData.name} onChange={handleChange} className="w-full border border-gray-300 p-2 rounded text-sm focus:ring-1 focus:ring-corporate-500 outline-none" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-xs font-bold text-gray-600 uppercase">Kategori</label><input name="category" value={formData.category} onChange={handleChange} className="w-full border border-gray-300 p-2 rounded text-sm outline-none" /></div>
                        <div className="space-y-1"><label className="text-xs font-bold text-gray-600 uppercase">Lokasi</label><input name="location" value={formData.location} onChange={handleChange} className="w-full border border-gray-300 p-2 rounded text-sm outline-none" /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1"><label className="text-xs font-bold text-gray-600 uppercase">Harga</label><input type="number" name="price" value={formData.price} onChange={handleChange} className="w-full border border-gray-300 p-2 rounded text-sm outline-none" placeholder="" /></div>
                        <div className="space-y-1"><label className="text-xs font-bold text-gray-600 uppercase">Stok Awal</label><input type="number" name="stock" value={formData.stock} onChange={handleChange} className="w-full border border-gray-300 p-2 rounded text-sm font-bold text-corporate-600 outline-none" placeholder="" /></div>
                        <div className="space-y-1"><label className="text-xs font-bold text-gray-600 uppercase">Satuan</label><input name="unit" value={formData.unit} onChange={handleChange} className="w-full border border-gray-300 p-2 rounded text-sm outline-none" placeholder="Pcs" /></div>
                    </div>
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded space-y-3">
                        <p className="text-xs font-bold text-corporate-600 uppercase">Multi Satuan (Opsional)</p>
                        <div className="grid grid-cols-3 gap-3">
                            <input name="unit2" placeholder="Satuan 2 (Box)" value={formData.unit2 || ''} onChange={handleChange} className="p-2 border border-gray-300 rounded text-xs" />
                            <input type="number" name="ratio2" placeholder="Isi" value={formData.ratio2 || ''} onChange={handleChange} className="p-2 border border-gray-300 rounded text-xs" />
                            <select name="op2" value={formData.op2} onChange={handleChange} className="p-2 border border-gray-300 rounded text-xs"><option value="multiply">Kali (X)</option><option value="divide">Bagi (/)</option></select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded text-sm border border-gray-300">Batal</button>
                        <button type="submit" className="px-6 py-2 bg-corporate-600 text-white font-bold rounded text-sm hover:bg-corporate-700 shadow-sm">Simpan</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
