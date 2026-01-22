
import React, { useState, useMemo } from 'react';
import { InventoryItem, Role } from '../types';
import { Plus, Search, Edit2, Trash2, Filter, ToggleLeft, ToggleRight, X, Upload, FileSpreadsheet, Download, Layers, Info } from 'lucide-react';
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
      XLSX.writeFile(wb, "Nexus_Import_Inventory.xlsx");
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
        
        let importedCount = 0;
        for (const row of data) {
          if (row.SKU) {
              const sku = String(row.SKU).trim();
              const existing = items.find(i => i.sku === sku);

              const parseNum = (val: any, fallback: number = 0) => {
                  if (val === undefined || val === null || val === '') return fallback;
                  const str = String(val).trim();
                  if (str === '-') return 0;
                  const n = Number(str.replace(/[^0-9.-]+/g, ""));
                  return isNaN(n) ? fallback : n;
              };

              const newItem: InventoryItem = {
                  id: existing ? existing.id : crypto.randomUUID(), 
                  sku: sku,
                  name: row.Name || row.Nama || (existing?.name || 'Unnamed Item'),
                  category: row.Category || row.Kategori || (existing?.category || 'General'),
                  price: parseNum(row.Price || row.Harga, existing?.price || 0),
                  location: row.Location || row.Lokasi || (existing?.location || 'A-01'),
                  unit: row.Unit || row.Satuan || (existing?.unit || 'Pcs'),
                  stock: parseNum(row.Stock || row.Stok, existing?.stock || 0),
                  minLevel: parseNum(row.MinLevel || row.MinStok, existing?.minLevel || 0),
                  active: existing ? existing.active : true,
                  unit2: row.Unit2 || existing?.unit2,
                  ratio2: row.Ratio2 ? parseNum(row.Ratio2) : existing?.ratio2,
                  op2: (row.Op2 === 'divide' || row.Op2 === 'multiply') ? row.Op2 : (existing?.op2 || 'multiply'),
                  unit3: row.Unit3 || existing?.unit3,
                  ratio3: row.Ratio3 ? parseNum(row.Ratio3) : existing?.ratio3,
                  op3: (row.Op3 === 'divide' || row.Op3 === 'multiply') ? row.Op3 : (existing?.op3 || 'multiply'),
              };
              await storageService.saveItem(newItem);
              importedCount++;
          }
        }
        notify(`${importedCount} item berhasil diproses.`, 'success');
        onRefresh();
      } catch (e) { notify("Gagal memproses file.", 'error'); }
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
             <button onClick={downloadTemplate} className="text-slate-400 hover:text-ice-600 transition-colors p-2" title="Download Template">
                 <Download size={20} />
             </button>
             <div className="relative">
                <input type="file" accept=".csv, .xlsx, .xls" onChange={handleBulkImport} className="absolute inset-0 opacity-0 cursor-pointer w-full" />
                <button className="flex items-center gap-2 bg-white dark:bg-gray-800 text-slate-600 dark:text-gray-300 border border-ice-200 dark:border-gray-700 hover:bg-ice-50 dark:hover:bg-gray-700 px-4 py-2.5 rounded-xl font-bold transition-colors text-sm whitespace-nowrap">
                    <FileSpreadsheet size={18} /> Import
                </button>
             </div>
            <button 
              onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
              className="flex items-center gap-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg transition-colors text-sm whitespace-nowrap"
            >
              <Plus size={18} /> Tambah Barang
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-soft border border-ice-100 dark:border-gray-700 overflow-hidden flex flex-col max-h-[calc(100vh-240px)]">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left relative border-collapse">
            <thead className="bg-slate-50 dark:bg-gray-800 border-b border-ice-100 dark:border-gray-700 text-xs font-bold text-slate-500 dark:text-gray-400 uppercase sticky top-0 z-10">
              <tr>
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
                <tr key={item.id} className="hover:bg-ice-50/50 dark:hover:bg-gray-700/50 transition-colors">
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
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
          <ItemModal 
            item={editingItem} 
            onClose={() => setIsModalOpen(false)} 
            onSave={async (item) => { 
                await storageService.saveItem(item); 
                onRefresh(); 
                setIsModalOpen(false); 
                notify('Data barang disimpan', 'success'); 
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
            unit2: item.unit2 || '', ratio2: item.ratio2, op2: item.op2 || 'multiply',
            unit3: item.unit3 || '', ratio3: item.ratio3, op3: item.op3 || 'multiply' 
        };
        return { active: true, stock: 0, minLevel: 0, price: 0, unit: 'Pcs', unit2: '', ratio2: undefined, op2: 'multiply', unit3: '', ratio3: undefined, op3: 'multiply' };
    });

    const handleChange = (e: any) => { 
        const { name, value, type } = e.target; 
        setFormData((prev: any) => ({ ...prev, [name]: type === 'number' ? (value === '' ? '' : parseFloat(value)) : value })); 
    };

    const handleOpChange = (level: 2 | 3, op: 'multiply' | 'divide') => { 
        setFormData((prev: any) => ({ ...prev, [`op${level}`]: op })); 
    };

    const handleSubmit = (e: React.FormEvent) => { 
        e.preventDefault(); 
        onSave({ 
            id: item?.id || crypto.randomUUID(), 
            ...formData, 
            price: Number(formData.price || 0), 
            stock: Number(formData.stock || 0), 
            minLevel: Number(formData.minLevel || 0), 
            ratio2: formData.ratio2 ? Number(formData.ratio2) : undefined,
            ratio3: formData.ratio3 ? Number(formData.ratio3) : undefined
        } as InventoryItem); 
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[95vh] border border-white/50">
                <div className="p-6 border-b border-ice-100 dark:border-gray-800 flex justify-between items-center bg-ice-50/50 dark:bg-gray-800">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">{item ? 'Edit Item' : 'Tambah Item Baru'}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full"><X size={20} className="text-slate-400"/></button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-8 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
                    <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">SKU</label>
                            <input required name="sku" value={formData.sku || ''} onChange={handleChange} className="w-full border border-ice-200 dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-950 text-dark dark:text-white" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Nama Barang</label>
                            <input required name="name" value={formData.name || ''} onChange={handleChange} className="w-full border border-ice-200 dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-950 text-dark dark:text-white" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Kategori</label>
                            <input required name="category" value={formData.category || ''} onChange={handleChange} className="w-full border border-ice-200 dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-950 text-dark dark:text-white"/>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Lokasi Rak/Gudang</label>
                            <input required name="location" value={formData.location || ''} onChange={handleChange} className="w-full border border-ice-200 dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-950 text-dark dark:text-white"/>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-5">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Harga Dasar</label>
                            <input required type="number" name="price" value={formData.price} onChange={handleChange} className="w-full border border-ice-200 dark:border-gray-700 p-3 rounded-xl" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Satuan Utama</label>
                            <input required name="unit" value={formData.unit} onChange={handleChange} className="w-full border border-ice-200 dark:border-gray-700 p-3 rounded-xl" placeholder="Pcs/Kg/Meter"/>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Stok Sekarang</label>
                            <input required type="number" name="stock" value={formData.stock} onChange={handleChange} className="w-full border border-ice-200 dark:border-gray-700 p-3 rounded-xl font-bold text-indigo-600" />
                        </div>
                    </div>

                    {/* MULTI-UNIT SETTINGS (PERSIS SCREENSHOT) */}
                    <div className="p-6 bg-indigo-50/30 dark:bg-gray-800/50 rounded-2xl border border-indigo-100 dark:border-gray-700 space-y-6">
                        <h4 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase flex items-center gap-2">
                            <Layers size={14}/> Multi-Unit & Konversi
                        </h4>

                        {/* Unit 2 Row */}
                        <div className="space-y-3">
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase">Satuan 2 (Optional)</label>
                                    <input name="unit2" value={formData.unit2 || ''} onChange={handleChange} className="w-full border border-ice-200 dark:border-gray-600 p-3 rounded-xl text-sm" placeholder="Contoh: BOX" />
                                </div>
                                <div className="w-28">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase">Isi / Ratio</label>
                                    <input type="number" name="ratio2" value={formData.ratio2 ?? ''} onChange={handleChange} className="w-full border border-ice-200 dark:border-gray-600 p-3 rounded-xl text-sm font-bold" />
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
                                        (1 {formData.unit2} = {formData.op2 === 'multiply' ? formData.ratio2 : `1/${formData.ratio2}`} {formData.unit})
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="h-px bg-indigo-100 dark:bg-gray-700"></div>

                        {/* Unit 3 Row */}
                        <div className="space-y-3">
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase">Satuan 3 (Optional)</label>
                                    <input name="unit3" value={formData.unit3 || ''} onChange={handleChange} className="w-full border border-ice-200 dark:border-gray-600 p-3 rounded-xl text-sm" placeholder="Contoh: CTN" />
                                </div>
                                <div className="w-28">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase">Isi / Ratio</label>
                                    <input type="number" name="ratio3" value={formData.ratio3 ?? ''} onChange={handleChange} className="w-full border border-ice-200 dark:border-gray-600 p-3 rounded-xl text-sm font-bold" />
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
                                        (1 {formData.unit3} = {formData.op3 === 'multiply' ? formData.ratio3 : `1/${formData.ratio3}`} {formData.unit})
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Minimal Stok (Alert)</label>
                        <input type="number" name="minLevel" value={formData.minLevel} onChange={handleChange} className="w-full border border-ice-200 dark:border-gray-700 p-3 rounded-xl" />
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-6 py-2.5 text-slate-500 font-bold hover:bg-slate-100 rounded-xl">Batal</button>
                        <button type="submit" className="px-8 py-2.5 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 shadow-lg">Simpan Barang</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
