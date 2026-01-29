
import React, { useState, useMemo } from 'react';
import { InventoryItem, Role } from '../types';
import { Plus, Search, Edit2, Trash2, Filter, ToggleLeft, ToggleRight, X, FileSpreadsheet, CheckSquare, Square, Table, CloudUpload, ArrowUpDown, Settings2, Download, Package, Loader2, Layers, Calculator } from 'lucide-react';
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

  const downloadTemplate = () => {
    const template = [
      { SKU: 'SKU-001', Nama: 'Produk A', Kategori: 'Elektronik', Harga: 50000, Lokasi: 'A-01', Satuan: 'Pcs', Stok: 100, Minimal_Stok: 10 },
      { SKU: 'SKU-002', Nama: 'Produk B', Kategori: 'Lainnya', Harga: 10000, Lokasi: 'B-02', Satuan: 'Pcs', Stok: 50, Minimal_Stok: 5 }
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");
    XLSX.writeFile(wb, "Nexus_Template_Inventory.xlsx");
    notify("Template XLSX berhasil diunduh!", "info");
  };

  const handleBulkImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; 
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const rawData = reader.result;
        if (!rawData) return;
        
        const data = new Uint8Array(rawData as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        
        if (!wb.SheetNames.length) throw new Error("File Excel kosong.");
        const ws = wb.Sheets[wb.SheetNames[0]];
        const sheetData = XLSX.utils.sheet_to_json(ws) as any[];

        if (sheetData.length === 0) {
            notify("Data di file Excel tidak ditemukan.", 'warning');
            return;
        }

        setIsImporting(true);
        let successCount = 0;

        for (let i = 0; i < sheetData.length; i += 10) {
            const chunk = sheetData.slice(i, i + 10);
            await Promise.all(chunk.map(async (row: any) => {
                const sku = String(row.SKU || row.sku || row.Sku || row['Kode Barang'] || '').trim();
                if (!sku) return;

                const existing = items.find(item => item.sku === sku);
                
                const newItem: InventoryItem = { 
                  id: existing ? existing.id : (window.crypto.randomUUID() as string), 
                  sku: sku, 
                  name: row.Nama || row.nama || row.Name || row.name || (existing?.name ?? 'Item Baru'), 
                  category: row.Kategori || row.kategori || row.Category || row.category || (existing?.category ?? 'General'), 
                  price: Number(row.Harga || row.harga || row.Price || row.price || (existing?.price ?? 0)), 
                  location: row.Lokasi || row.lokasi || row.Location || row.location || (existing?.location ?? 'A-01'), 
                  unit: row.Satuan || row.satuan || row.Unit || row.unit || (existing?.unit ?? 'Pcs'), 
                  stock: Number(row.Stok || row.stok || row.Stock || row.stock || (existing?.stock ?? 0)), 
                  minLevel: Number(row.Minimal_Stok || row.MinimalStok || row.minLevel || row.MinLevel || (existing?.minLevel ?? 0)), 
                  active: existing ? existing.active : true,
                  unit2: row.unit2 ?? null,
                  ratio2: row.ratio2 ? Number(row.ratio2) : null,
                  op2: row.op2 ?? null,
                  unit3: row.unit3 ?? null,
                  ratio3: row.ratio3 ? Number(row.ratio3) : null,
                  op3: row.op3 ?? null
                };
                
                successCount++;
                return storageService.saveItem(newItem);
            }));
        }
        
        notify(`Berhasil mengimpor ${successCount} item.`, 'success'); 
        onRefresh();
      } catch (err: any) { 
        console.error("XLSX Import Error:", err);
        notify("Gagal mengimpor file. Pastikan format benar (XLSX).", 'error'); 
      } finally { 
        setIsImporting(false); 
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = ''; 
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] space-y-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-paper border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-3">
        <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="text" placeholder="Cari SKU / Nama Produk..." className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-paper-blue outline-none transition-all dark:text-white" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <select className="pl-3 pr-8 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-paper-blue dark:text-white appearance-none cursor-pointer" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
        </div>

        {role !== 'viewer' && (
          <div className="flex items-center gap-2">
            <button onClick={downloadTemplate} className="p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 text-slate-600 dark:text-gray-300" title="Download Template Excel">
                <Download size={18} />
            </button>
            <div className="relative">
                <input type="file" accept=".xlsx" onChange={handleBulkImport} className="absolute inset-0 opacity-0 cursor-pointer w-full" />
                <button className="bg-white text-slate-600 border border-gray-300 px-4 py-2 rounded-lg font-bold text-xs hover:bg-gray-50 flex items-center gap-2 transition-all">
                    {isImporting ? <Loader2 className="animate-spin w-3 h-3" /> : <FileSpreadsheet size={16} />} Import XLSX
                </button>
            </div>
            <button onClick={() => { setEditingItem(null); setIsModalOpen(true); }} className="bg-paper-blue text-white px-6 py-2 rounded-lg font-bold text-xs hover:bg-paper-blueHover flex items-center gap-2 shadow-sm transition-all active:scale-95"><Plus size={16} /> Tambah Barang</button>
          </div>
        )}
      </div>

      <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-paper border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse enterprise-table">
            <thead>
              <tr className="sticky top-0 bg-gray-50 dark:bg-gray-800 z-20">
                <th className="p-4 w-12 text-center border-r border-gray-200 dark:border-gray-700">
                    <button onClick={toggleSelectAll} className="text-slate-400">{selectedIds.size === filteredItems.length && filteredItems.length > 0 ? <CheckSquare size={18} className="text-paper-blue" /> : <Square size={18} />}</button>
                </th>
                <th className="p-4">SKU</th>
                <th className="p-4">Nama Produk</th>
                <th className="p-4">Kategori</th>
                <th className="p-4 text-right">Harga</th>
                <th className="p-4 text-center">Stok</th>
                <th className="p-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors text-sm">
                  <td className="p-4 text-center border-r border-slate-100 dark:border-gray-700">
                    <button onClick={() => toggleSelectItem(item.id)}>{selectedIds.has(item.id) ? <CheckSquare size={18} className="text-paper-blue" /> : <Square size={18} className="text-slate-200" />}</button>
                  </td>
                  <td className="p-4 font-mono text-xs font-bold text-slate-500 uppercase">{item.sku}</td>
                  <td className="p-4 font-bold text-slate-800 dark:text-gray-100">{item.name}</td>
                  <td className="p-4 text-xs font-medium text-slate-400">{item.category}</td>
                  <td className="p-4 text-right font-bold text-slate-700 dark:text-gray-200">Rp {item.price.toLocaleString()}</td>
                  <td className="p-4 text-center">
                    <div className="flex flex-col items-center">
                        <span className={`font-bold ${item.stock <= item.minLevel ? 'text-rose-500' : 'text-emerald-500'}`}>{item.stock} {item.unit}</span>
                        {/* Show secondary units info if exists */}
                        {(item.unit2 && item.ratio2) && (
                            <span className="text-[10px] text-slate-400">
                                1 {item.unit2} = {item.ratio2} {item.unit}
                            </span>
                        )}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                        <button onClick={() => { setEditingItem(item); setIsModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-paper-blue transition-all"><Edit2 size={16} /></button>
                        <button onClick={() => storageService.deleteItem(item.id).then(onRefresh)} className="p-1.5 text-slate-400 hover:text-rose-500 transition-all"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && <ItemModal item={editingItem} onClose={() => setIsModalOpen(false)} onSave={async (item: InventoryItem) => { await storageService.saveItem(item); onRefresh(); setIsModalOpen(false); notify('Data barang disimpan', 'success'); }} />}
    </div>
  );
};

const ItemModal = ({ item, onClose, onSave }: any) => {
    const [formData, setFormData] = useState<any>(item ? { ...item } : { sku: '', name: '', category: '', location: '', active: true, stock: '', minLevel: '', price: '', unit: 'Pcs', unit2: '', ratio2: '', op2: 'multiply', unit3: '', ratio3: '', op3: 'multiply' });

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-white/10 animate-in zoom-in duration-300">
                <div className="p-6 border-b border-slate-100 dark:border-gray-800 flex justify-between items-center bg-slate-50 dark:bg-gray-800">
                    <h3 className="font-bold text-xl text-slate-800 dark:text-white flex items-center gap-3"><Package size={22} className="text-paper-blue"/> {item ? 'Perbarui Barang' : 'Barang Baru'}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-all text-slate-400"><X size={24}/></button>
                </div>
                
                <form className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar" onSubmit={(e) => { e.preventDefault(); onSave(formData); }}>
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">SKU</label><input required value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full border border-slate-200 dark:border-gray-700 p-3 rounded-xl text-sm outline-none dark:bg-gray-800 dark:text-white" /></div>
                        <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Nama Produk</label><input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-slate-200 dark:border-gray-700 p-3 rounded-xl text-sm outline-none dark:bg-gray-800 dark:text-white" /></div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-6">
                        <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Stok (Base)</label><input type="number" required value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} className="w-full border border-slate-200 dark:border-gray-700 p-3 rounded-xl text-sm outline-none dark:bg-gray-800 dark:text-white" /></div>
                        <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Harga</label><input type="number" required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full border border-slate-200 dark:border-gray-700 p-3 rounded-xl text-sm outline-none dark:bg-gray-800 dark:text-white" /></div>
                        <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Unit Dasar</label><input required value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full border border-slate-200 dark:border-gray-700 p-3 rounded-xl text-sm outline-none dark:bg-gray-800 dark:text-white font-bold text-center" /></div>
                    </div>

                    {/* Multi-Unit Conversion Section */}
                    <div className="bg-slate-50 dark:bg-gray-800/50 p-6 rounded-2xl border border-slate-100 dark:border-gray-700 space-y-4">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Layers size={14}/> Multi-Satuan (Konversi)
                        </h4>
                        
                        {/* Unit 2 */}
                        <div className="grid grid-cols-7 gap-4 items-end">
                            <div className="col-span-2 space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 block ml-1">Satuan Level 2</label>
                                <input value={formData.unit2 || ''} onChange={e => setFormData({...formData, unit2: e.target.value})} placeholder="Cth: Lusin" className="w-full border border-slate-200 dark:border-gray-600 p-2.5 rounded-lg text-xs outline-none dark:bg-gray-700 dark:text-white" />
                            </div>
                            <div className="col-span-2 space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 block ml-1">Operasi</label>
                                <select value={formData.op2 || 'multiply'} onChange={e => setFormData({...formData, op2: e.target.value})} className="w-full border border-slate-200 dark:border-gray-600 p-2.5 rounded-lg text-xs outline-none dark:bg-gray-700 dark:text-white appearance-none">
                                    <option value="multiply">Dikali (x)</option>
                                    <option value="divide">Dibagi (/)</option>
                                </select>
                            </div>
                            <div className="col-span-2 space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 block ml-1">Rasio</label>
                                <input type="number" value={formData.ratio2 || ''} onChange={e => setFormData({...formData, ratio2: e.target.value})} placeholder="Cth: 12" className="w-full border border-slate-200 dark:border-gray-600 p-2.5 rounded-lg text-xs outline-none dark:bg-gray-700 dark:text-white" />
                            </div>
                            <div className="col-span-1 flex items-center justify-center pb-2">
                                {formData.unit2 && formData.ratio2 && (
                                    <span className="text-[10px] text-paper-blue font-bold whitespace-nowrap" title="Preview">
                                        1 {formData.unit2} = {formData.ratio2} {formData.unit}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Unit 3 */}
                        <div className="grid grid-cols-7 gap-4 items-end">
                            <div className="col-span-2 space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 block ml-1">Satuan Level 3</label>
                                <input value={formData.unit3 || ''} onChange={e => setFormData({...formData, unit3: e.target.value})} placeholder="Cth: Karton" className="w-full border border-slate-200 dark:border-gray-600 p-2.5 rounded-lg text-xs outline-none dark:bg-gray-700 dark:text-white" />
                            </div>
                             <div className="col-span-2 space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 block ml-1">Operasi</label>
                                <select value={formData.op3 || 'multiply'} onChange={e => setFormData({...formData, op3: e.target.value})} className="w-full border border-slate-200 dark:border-gray-600 p-2.5 rounded-lg text-xs outline-none dark:bg-gray-700 dark:text-white appearance-none">
                                    <option value="multiply">Dikali (x)</option>
                                    <option value="divide">Dibagi (/)</option>
                                </select>
                            </div>
                            <div className="col-span-2 space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 block ml-1">Rasio</label>
                                <input type="number" value={formData.ratio3 || ''} onChange={e => setFormData({...formData, ratio3: e.target.value})} placeholder="Cth: 24" className="w-full border border-slate-200 dark:border-gray-600 p-2.5 rounded-lg text-xs outline-none dark:bg-gray-700 dark:text-white" />
                            </div>
                             <div className="col-span-1 flex items-center justify-center pb-2">
                                {formData.unit3 && formData.ratio3 && (
                                    <span className="text-[10px] text-paper-blue font-bold whitespace-nowrap" title="Preview">
                                        1 {formData.unit3} = {formData.ratio3} {formData.unit}
                                    </span>
                                )}
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-400 italic mt-2">* Gunakan fitur ini jika barang dijual dalam berbagai satuan (pcs, lusin, box) namun stok tercatat dalam satuan dasar.</p>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-gray-800">
                        <button type="button" onClick={onClose} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-gray-700 dark:text-gray-400 rounded-xl transition-all">Batal</button>
                        <button type="submit" className="px-8 py-3 bg-paper-blue text-white font-bold rounded-xl shadow-lg hover:bg-paper-blueHover transition-all active:scale-95 flex items-center gap-2">
                            <CheckSquare size={18} /> Simpan Data
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
