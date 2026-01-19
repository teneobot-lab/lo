
import React, { useState, useMemo } from 'react';
import { InventoryItem, Role } from '../types';
import { Plus, Search, Edit2, Trash2, Filter, ToggleLeft, ToggleRight, X, Download, AlertCircle, FileUp, Database, FileSpreadsheet } from 'lucide-react';
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
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
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

  const handleDelete = (id: string) => {
    try {
      if (window.confirm('Are you sure you want to delete this item?')) {
        storageService.deleteItem(id);
        onRefresh();
        notify('Item deleted successfully', 'success');
      }
    } catch (e) {
      notify("Failed to delete item", 'error');
    }
  };

  const handleToggleStatus = (item: InventoryItem) => {
    try {
      storageService.saveItem({ ...item, active: !item.active });
      onRefresh();
      notify(`Item ${item.active ? 'deactivated' : 'activated'}`, 'info');
    } catch (e) {
      notify("Failed to update status", 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="glass-card p-4 rounded-2xl shadow-glass flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto">
            <div className="relative w-full md:w-64 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
                <input 
                    type="text" 
                    placeholder="Search SKU or Name..." 
                    className="w-full pl-10 pr-4 py-2 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="relative w-full md:w-48">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select 
                    className="w-full pl-10 pr-4 py-2 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm font-bold appearance-none cursor-pointer"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                >
                    {categories.map(c => <option key={c} value={c} className="bg-white dark:bg-slate-900">{c}</option>)}
                </select>
            </div>
        </div>

        {role !== 'viewer' && (
          <div className="flex items-center gap-3 w-full xl:w-auto">
            <button 
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-5 py-2 rounded-xl font-black transition-all text-xs whitespace-nowrap active:scale-95 border border-slate-200/50 dark:border-slate-700/50"
            >
              <FileUp size={16} /> BULK IMPORT
            </button>
            <button 
              onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
              className="flex items-center justify-center gap-2 bg-primary hover:bg-blue-600 text-white px-5 py-2 rounded-xl font-black shadow-lg shadow-primary/30 transition-all text-sm whitespace-nowrap active:scale-95"
            >
              <Plus size={18} strokeWidth={3} /> ADD ITEM
            </button>
          </div>
        )}
      </div>

      <div className="glass-card rounded-2xl shadow-glass overflow-hidden flex flex-col max-h-[calc(100vh-240px)] border border-slate-200/50 dark:border-slate-800/50">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left relative border-collapse">
            <thead className="bg-slate-100/50 dark:bg-slate-800/50 border-b border-slate-200/50 dark:border-slate-800/50 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest sticky top-0 z-10 backdrop-blur-md">
              <tr>
                <th className="p-4">SKU / Name</th>
                <th className="p-4">Category</th>
                <th className="p-4">Location</th>
                <th className="p-4">Price</th>
                <th className="p-4 text-center">Stock</th>
                <th className="p-4 text-center">Status</th>
                {role !== 'viewer' && <th className="p-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/30 dark:divide-slate-800/30">
              {filteredItems.map(item => (
                <tr key={item.id} className="hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors group">
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800 dark:text-slate-100 tracking-tight">{item.name}</span>
                      <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">{item.sku}</span>
                    </div>
                  </td>
                  <td className="p-4 text-xs font-bold text-slate-600 dark:text-slate-400">{item.category}</td>
                  <td className="p-4 text-xs">
                    <span className="px-2 py-1 bg-white/50 dark:bg-slate-800/50 rounded-lg text-[10px] font-black text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50">{item.location}</span>
                  </td>
                  <td className="p-4 text-sm font-black text-slate-700 dark:text-slate-200">
                      Rp {item.price.toLocaleString('id-ID')}
                      <div className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Per {item.unit}</div>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex flex-col items-center">
                        <span className={`text-sm font-black ${item.stock <= item.minLevel ? 'text-rose-500' : 'text-emerald-500'}`}>
                            {item.stock}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">{item.unit}</span>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    {role !== 'viewer' ? (
                        <button onClick={() => handleToggleStatus(item)} className="text-slate-400 hover:text-primary transition-all active:scale-90">
                            {item.active ? <ToggleRight size={28} className="text-emerald-500" /> : <ToggleLeft size={28} />}
                        </button>
                    ) : (
                        <span className={`text-[10px] px-2 py-1 rounded-full font-black uppercase ${item.active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-500'}`}>
                            {item.active ? 'Active' : 'Inactive'}
                        </span>
                    )}
                  </td>
                  {role !== 'viewer' && (
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => { setEditingItem(item); setIsModalOpen(true); }}
                          className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-xl transition-all hover:scale-110"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all hover:scale-110"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400 italic">No inventory matching current filters.</td>
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
          onSave={(item) => {
            try {
              storageService.saveItem(item);
              onRefresh();
              setIsModalOpen(false);
              notify('Inventory record updated', 'success');
            } catch (e) {
              notify("Failed to save changes", 'error');
            }
          }} 
        />
      )}

      {isImportModalOpen && (
          <BulkImportModal 
            onClose={() => setIsImportModalOpen(false)}
            onImport={(items) => {
                storageService.bulkImportItems(items);
                onRefresh();
                setIsImportModalOpen(false);
                notify(`${items.length} items imported successfully`, 'success');
            }}
          />
      )}
    </div>
  );
};

const BulkImportModal = ({ onClose, onImport }: { onClose: () => void, onImport: (items: InventoryItem[]) => void }) => {
    const [importData, setImportData] = useState('');
    
    const downloadTemplate = () => {
        const headers = [['SKU', 'Name', 'Category', 'Price', 'Location', 'Unit', 'Stock', 'MinLevel']];
        const exampleRow = [['SKU-DEMO-01', 'Sample Product Name', 'General', '15000', 'Bin-A1', 'Pcs', '100', '10']];
        const worksheet = XLSX.utils.aoa_to_sheet([...headers, ...exampleRow]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
        XLSX.writeFile(workbook, "Nexus_WMS_Import_Template.xlsx");
    };

    const handleImport = () => {
        try {
            // Support simple TSV or JSON
            let parsedItems: any[] = [];
            if (importData.trim().startsWith('[')) {
                parsedItems = JSON.parse(importData);
            } else {
                // Tab-separated processing (Copy paste from Excel)
                const lines = importData.split('\n');
                parsedItems = lines.filter(l => l.trim()).map(line => {
                    const [sku, name, category, price, location, unit, stock, minLevel] = line.split('\t');
                    if (!sku || !name) return null;
                    return {
                        id: crypto.randomUUID(),
                        sku: sku?.trim(),
                        name: name?.trim(),
                        category: category?.trim() || 'General',
                        price: Number(price) || 0,
                        location: location?.trim() || 'Unassigned',
                        unit: unit?.trim() || 'Pcs',
                        stock: Number(stock) || 0,
                        minLevel: Number(minLevel) || 0,
                        active: true
                    };
                }).filter(i => i !== null);
            }

            if (parsedItems.length === 0) throw new Error("No data found");
            onImport(parsedItems);
        } catch (e) {
            alert("Import failed. Ensure JSON format or Tab-separated columns (SKU, Name, Category, Price, Loc, Unit, Stock, Min)");
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="glass-card rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden border border-white/20">
                <div className="p-6 border-b border-slate-200/50 dark:border-slate-800/50 flex justify-between items-center bg-white/30 dark:bg-slate-900/30">
                    <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight uppercase tracking-widest">BULK IMPORT DATABASE</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-100 rounded-full"><X size={24}/></button>
                </div>
                <div className="p-8 space-y-6">
                    <div className="bg-primary/5 dark:bg-primary/10 p-4 rounded-2xl border border-primary/20 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
                                <AlertCircle size={14} /> Format Guide
                            </p>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                Paste columns from Excel in this order: <br/>
                                <code className="bg-white/50 dark:bg-black/20 px-1 py-0.5 rounded">SKU [TAB] Name [TAB] Category [TAB] Price [TAB] Loc [TAB] Unit [TAB] Stock [TAB] Min</code>
                            </p>
                        </div>
                        <button 
                            onClick={downloadTemplate}
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 text-primary border border-primary/30 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-sm"
                        >
                            <FileSpreadsheet size={16} /> Download Template
                        </button>
                    </div>
                    <textarea 
                        className="w-full h-64 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 p-4 rounded-2xl text-xs font-mono outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                        placeholder="Paste your TSV data or JSON array here..."
                        value={importData}
                        onChange={(e) => setImportData(e.target.value)}
                    />
                    <div className="flex justify-end gap-3">
                        <button onClick={onClose} className="px-6 py-2.5 text-slate-500 font-black uppercase text-xs">Cancel</button>
                        <button onClick={handleImport} className="px-8 py-2.5 bg-primary text-white font-black uppercase text-xs rounded-xl shadow-lg flex items-center gap-2">
                            <Database size={16} /> Execute Import
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ItemModal = ({ item, onClose, onSave }: { item: InventoryItem | null, onClose: () => void, onSave: (i: InventoryItem) => void }) => {
    const [formData, setFormData] = useState<any>(item || {
        active: true,
        stock: '',
        minLevel: '',
        price: '',
        unit: 'Pcs',
        conversionUnit: '',
        conversionRatio: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        let val: any = value;
        if (type === 'number') {
             val = value === '' ? '' : parseFloat(value);
        }
        setFormData((prev: any) => ({ ...prev, [name]: val }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.sku || !formData.name) return;
        
        const newItem: InventoryItem = {
            id: item?.id || crypto.randomUUID(),
            sku: formData.sku.trim(),
            name: formData.name.trim(),
            category: formData.category || 'General',
            price: Number(formData.price || 0),
            location: formData.location || 'Unassigned',
            unit: formData.unit || 'Pcs',
            stock: Number(formData.stock || 0),
            minLevel: Number(formData.minLevel || 0),
            active: formData.active !== undefined ? formData.active : true,
            conversionRatio: Number(formData.conversionRatio || 0),
            conversionUnit: formData.conversionUnit || ''
        };
        onSave(newItem);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="glass-card rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-white/20">
                <div className="p-6 border-b border-slate-200/50 dark:border-slate-800/50 flex justify-between items-center bg-white/30 dark:bg-slate-900/30">
                    <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">{item ? 'EDIT PRODUCT' : 'CREATE NEW ITEM'}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><X size={20}/></button>
                </div>
                <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">SKU Identification</label>
                            <input required name="sku" value={formData.sku || ''} onChange={handleChange} className="w-full bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 p-3 rounded-xl focus:ring-2 focus:ring-primary/30 outline-none" placeholder="Ex: SKU-100" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Display Name</label>
                            <input required name="name" value={formData.name || ''} onChange={handleChange} className="w-full bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 p-3 rounded-xl focus:ring-2 focus:ring-primary/30 outline-none" placeholder="Ex: Smart Monitor" />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Classification</label>
                            <input required name="category" value={formData.category || ''} onChange={handleChange} className="w-full bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 p-3 rounded-xl focus:ring-2 focus:ring-primary/30 outline-none" placeholder="Ex: Electronics" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Storage Location</label>
                            <input required name="location" value={formData.location || ''} onChange={handleChange} className="w-full bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 p-3 rounded-xl focus:ring-2 focus:ring-primary/30 outline-none" placeholder="Ex: Bin-A01" />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">MSRP (Rp)</label>
                            <input required type="number" name="price" value={formData.price} onChange={handleChange} className="w-full bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 p-3 rounded-xl focus:ring-2 focus:ring-primary/30 outline-none" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Base Unit</label>
                            <input required name="unit" value={formData.unit} onChange={handleChange} className="w-full bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 p-3 rounded-xl focus:ring-2 focus:ring-primary/30 outline-none font-bold" placeholder="Pcs / Box" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Initial Stock</label>
                            <input required type="number" name="stock" value={formData.stock} onChange={handleChange} className="w-full bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 p-3 rounded-xl focus:ring-2 focus:ring-primary/30 outline-none" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-primary uppercase tracking-widest ml-1">Conv Unit (Bulk)</label>
                            <input name="conversionUnit" value={formData.conversionUnit} onChange={handleChange} className="w-full bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 p-3 rounded-xl text-xs outline-none" placeholder="Ex: Box" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-primary uppercase tracking-widest ml-1">Ratio (1 Bulk = X Base)</label>
                            <input type="number" name="conversionRatio" value={formData.conversionRatio} onChange={handleChange} className="w-full bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 p-3 rounded-xl text-xs outline-none" placeholder="Ex: 12" />
                        </div>
                    </div>

                    <div className="pt-6 flex justify-end gap-3 border-t border-slate-200/50 dark:border-slate-800/50">
                        <button type="button" onClick={onClose} className="px-6 py-2.5 text-slate-500 dark:text-slate-400 font-black uppercase text-xs hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">Cancel</button>
                        <button type="submit" className="px-8 py-2.5 bg-primary text-white font-black uppercase text-xs rounded-xl shadow-lg shadow-primary/30 hover:bg-blue-600 hover:scale-105 transition-all">Commit Changes</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
