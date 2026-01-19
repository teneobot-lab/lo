
import React, { useState, useMemo } from 'react';
import { InventoryItem, Role } from '../types';
import { Plus, Search, Edit2, Trash2, Filter, ToggleLeft, ToggleRight, X, Upload, FileSpreadsheet, Download, Layers, Scale } from 'lucide-react';
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
      if (window.confirm('Are you sure you want to delete this item?')) {
        await storageService.deleteItem(id);
        onRefresh();
        notify('Item deleted successfully', 'success');
      }
    } catch (e) {
      notify("Failed to delete item", 'error');
    }
  };

  const handleToggleStatus = async (item: InventoryItem) => {
    try {
      await storageService.saveItem({ ...item, active: !item.active });
      onRefresh();
      notify(`Item ${item.active ? 'deactivated' : 'activated'}`, 'info');
    } catch (e) {
      notify("Failed to update status", 'error');
    }
  };

  const downloadTemplate = () => {
      const template = [
          { 
            SKU: 'ELEC-003', 
            Name: 'Contoh Multi Unit (Box)', 
            Category: 'Electronics', 
            Price: 100000, 
            Location: 'A-01', 
            Unit: 'Pcs', 
            Stock: 100, 
            MinLevel: 5, 
            Unit2: 'Box', 
            Ratio2: 12, 
            Op2: 'multiply',
            Unit3: 'Ctn',
            Ratio3: 144,
            Op3: 'multiply'
          }
      ];
      const ws = XLSX.utils.json_to_sheet(template);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Template");
      XLSX.writeFile(wb, "Nexus_Inventory_Template_New.xlsx");
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
          if (row.SKU && row.Name && row.Price) {
              const newItem: InventoryItem = {
                  id: crypto.randomUUID(), 
                  sku: String(row.SKU),
                  name: String(row.Name),
                  category: String(row.Category || 'General'),
                  price: Number(row.Price),
                  location: String(row.Location || 'Unassigned'),
                  unit: String(row.Unit || 'Pcs'),
                  stock: Number(row.Stock || 0),
                  minLevel: Number(row.MinLevel || 5),
                  active: true,
                  unit2: row.Unit2 ? String(row.Unit2) : undefined,
                  ratio2: row.Ratio2 ? Number(row.Ratio2) : undefined,
                  op2: (row.Op2 === 'divide' || row.Op2 === 'multiply') ? row.Op2 : 'multiply',
                  unit3: row.Unit3 ? String(row.Unit3) : undefined,
                  ratio3: row.Ratio3 ? Number(row.Ratio3) : undefined,
                  op3: (row.Op3 === 'divide' || row.Op3 === 'multiply') ? row.Op3 : 'multiply',
              };
              const existing = items.find(i => i.sku === newItem.sku);
              if (existing) newItem.id = existing.id;
              await storageService.saveItem(newItem);
              importedCount++;
          }
        }
        if (importedCount > 0) { notify(`Successfully processed ${importedCount} items.`, 'success'); onRefresh(); } 
        else { notify('No valid items found in file', 'warning'); }
      } catch (e) { notify("Failed to process file.", 'error'); }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const calculateDisplayStock = (baseStock: number, ratio: number, op: 'multiply' | 'divide') => {
      if (!ratio) return 0;
      if (op === 'multiply') return parseFloat((baseStock / ratio).toFixed(2));
      return parseFloat((baseStock * ratio).toFixed(2));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-soft border border-ice-100 dark:border-gray-700">
        <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto">
            <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Search SKU or Name..." 
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

            <div className="relative w-full md:w-48">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
                    <div className={`w-2 h-2 rounded-full ${statusFilter === 'Low Stock' ? 'bg-rose-500' : 'bg-slate-400'}`}></div>
                </div>
                <select 
                    className="w-full pl-8 pr-4 py-2.5 bg-ice-50 dark:bg-gray-900 border border-ice-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-ice-300 text-sm appearance-none cursor-pointer dark:text-gray-200"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="All">All Status</option>
                    <option value="Low Stock">Low Stock Alert</option>
                    <option value="Active">Active Only</option>
                    <option value="Inactive">Inactive Only</option>
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
              <Plus size={18} /> Add Item
            </button>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-soft border border-ice-100 dark:border-gray-700 overflow-hidden flex flex-col max-h-[calc(100vh-240px)]">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left relative border-collapse">
            <thead className="bg-gradient-to-r from-ice-50 to-white dark:from-gray-800 dark:to-gray-800 border-b border-ice-200 dark:border-gray-700 text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="p-5">SKU / Name</th>
                <th className="p-5">Category</th>
                <th className="p-5">Location</th>
                <th className="p-5">Price</th>
                <th className="p-5 text-center">Stock</th>
                <th className="p-5 text-center">Status</th>
                {role !== 'viewer' && <th className="p-5 text-right">Actions</th>}
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
                  <td className="p-5 text-sm text-slate-600 dark:text-gray-400">{item.category}</td>
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
                                {item.unit2 && <span className="text-[9px] text-slate-500 bg-ice-50 px-1.5 rounded">{calculateDisplayStock(item.stock, item.ratio2!, item.op2 || 'multiply')} {item.unit2}</span>}
                                {item.unit3 && <span className="text-[9px] text-slate-500 bg-ice-50 px-1.5 rounded">{calculateDisplayStock(item.stock, item.ratio3!, item.op3 || 'multiply')} {item.unit3}</span>}
                             </div>
                        )}
                    </div>
                  </td>
                  <td className="p-5 text-center">
                    {role !== 'viewer' ? (
                        <button onClick={() => handleToggleStatus(item)} className="text-slate-400 hover:text-ice-600 transition-colors">
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
                        <button onClick={() => { setEditingItem(item); setIsModalOpen(true); }} className="p-2 text-slate-400 hover:text-ice-600 hover:bg-ice-50 rounded-lg transition-colors">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr><td colSpan={7} className="p-10 text-center text-slate-400">No items found matching your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {isModalOpen && <ItemModal item={editingItem} onClose={() => setIsModalOpen(false)} onSave={async (item) => { await storageService.saveItem(item); onRefresh(); setIsModalOpen(false); notify('Inventory item saved', 'success'); }} />}
    </div>
  );
};

const ItemModal = ({ item, onClose, onSave }: { item: InventoryItem | null, onClose: () => void, onSave: (i: InventoryItem) => void }) => {
    // ... Logic kept same, just styling ...
    const [formData, setFormData] = useState<any>(() => {
        if (item) return { ...item, unit2: item.unit2 || item.conversionUnit || '', ratio2: item.ratio2 || item.conversionRatio, op2: item.op2 || 'multiply', unit3: item.unit3 || '', ratio3: item.ratio3, op3: item.op3 || 'multiply' };
        return { active: true, stock: '', minLevel: '', price: '', unit: 'Pcs', unit2: '', ratio2: undefined, op2: 'multiply', unit3: '', ratio3: undefined, op3: 'multiply' };
    });
    const handleChange = (e: any) => { const { name, value, type } = e.target; setFormData((prev: any) => ({ ...prev, [name]: type === 'number' ? (value === '' ? '' : parseFloat(value)) : value })); };
    const handleOpChange = (level: 2 | 3, op: 'multiply' | 'divide') => { setFormData((prev: any) => ({ ...prev, [`op${level}`]: op })); };
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave({ id: item?.id || crypto.randomUUID(), ...formData, price: Number(formData.price || 0), stock: Number(formData.stock || 0), minLevel: Number(formData.minLevel || 0), ratio2: formData.ratio2 ? Number(formData.ratio2) : undefined, ratio3: formData.ratio3 ? Number(formData.ratio3) : undefined } as InventoryItem); };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-white/50">
                <div className="p-6 border-b border-ice-100 dark:border-gray-800 flex justify-between items-center bg-ice-50/50 dark:bg-gray-800">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">{item ? 'Edit Item' : 'New Inventory Item'}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full"><X size={20} className="text-slate-400"/></button>
                </div>
                <form onSubmit={handleSubmit} className="p-8 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
                    {/* Inputs styled with Ice Blue borders */}
                    <div className="grid grid-cols-2 gap-5">
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">SKU</label>
                            <input required name="sku" value={formData.sku || ''} onChange={handleChange} className="w-full border border-ice-200 dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-950 text-dark dark:text-white outline-none focus:ring-2 focus:ring-ice-300" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Name</label>
                            <input required name="name" value={formData.name || ''} onChange={handleChange} className="w-full border border-ice-200 dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-950 text-dark dark:text-white outline-none focus:ring-2 focus:ring-ice-300" />
                        </div>
                    </div>
                    {/* ... (Other inputs similar style) ... */}
                    <div className="grid grid-cols-2 gap-5">
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Category</label>
                            <input required name="category" value={formData.category || ''} onChange={handleChange} className="w-full border border-ice-200 dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-950 text-dark dark:text-white outline-none focus:ring-2 focus:ring-ice-300"/>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Location</label>
                            <input required name="location" value={formData.location || ''} onChange={handleChange} className="w-full border border-ice-200 dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-950 text-dark dark:text-white outline-none focus:ring-2 focus:ring-ice-300"/>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-5">
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Price</label>
                            <input required type="number" name="price" value={formData.price} onChange={handleChange} className="w-full border border-ice-200 dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-950 text-dark dark:text-white outline-none focus:ring-2 focus:ring-ice-300" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Base Unit</label>
                            <input required name="unit" value={formData.unit} onChange={handleChange} className="w-full border border-ice-200 dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-950 text-dark dark:text-white outline-none focus:ring-2 focus:ring-ice-300" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Stock</label>
                            <input required type="number" name="stock" value={formData.stock} onChange={handleChange} className="w-full border border-ice-200 dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-950 text-dark dark:text-white outline-none focus:ring-2 focus:ring-ice-300" />
                        </div>
                    </div>
                    {/* Multi-Unit Section */}
                    <div className="p-5 bg-ice-50/50 dark:bg-gray-800/50 rounded-2xl border border-ice-100 dark:border-gray-700 space-y-4">
                        <h4 className="text-xs font-bold text-ice-600 uppercase flex items-center gap-2"><Layers size={14}/> Multi-Unit Settings</h4>
                        {/* Level 2 */}
                        <div className="flex gap-4">
                             <div className="flex-1">
                                <label className="text-[9px] font-bold text-slate-400 uppercase">Unit 2</label>
                                <input name="unit2" value={formData.unit2 || ''} onChange={handleChange} className="w-full border border-ice-200 p-2 rounded-lg text-sm" placeholder="e.g. Box" />
                             </div>
                             <div className="w-24">
                                <label className="text-[9px] font-bold text-slate-400 uppercase">Ratio</label>
                                <input type="number" name="ratio2" value={formData.ratio2 ?? ''} onChange={handleChange} className="w-full border border-ice-200 p-2 rounded-lg text-sm" />
                             </div>
                        </div>
                        {/* Logic Toggle 2 */}
                        {formData.unit2 && (
                             <div className="flex items-center gap-2 text-xs">
                                 <span className="font-bold text-slate-500">Logic:</span>
                                 <div className="flex bg-white rounded border border-ice-200">
                                    <button type="button" onClick={() => handleOpChange(2, 'multiply')} className={`px-2 py-0.5 ${formData.op2 === 'multiply' ? 'bg-ice-100 text-ice-700 font-bold' : 'text-slate-400'}`}>X</button>
                                    <button type="button" onClick={() => handleOpChange(2, 'divide')} className={`px-2 py-0.5 ${formData.op2 === 'divide' ? 'bg-ice-100 text-ice-700 font-bold' : 'text-slate-400'}`}>/</button>
                                 </div>
                             </div>
                        )}
                        {/* Level 3 */}
                        <div className="flex gap-4">
                             <div className="flex-1">
                                <label className="text-[9px] font-bold text-slate-400 uppercase">Unit 3</label>
                                <input name="unit3" value={formData.unit3 || ''} onChange={handleChange} className="w-full border border-ice-200 p-2 rounded-lg text-sm" placeholder="e.g. Ctn" />
                             </div>
                             <div className="w-24">
                                <label className="text-[9px] font-bold text-slate-400 uppercase">Ratio</label>
                                <input type="number" name="ratio3" value={formData.ratio3 ?? ''} onChange={handleChange} className="w-full border border-ice-200 p-2 rounded-lg text-sm" />
                             </div>
                        </div>
                    </div>
                    
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Min Level</label>
                        <input type="number" name="minLevel" value={formData.minLevel} onChange={handleChange} className="w-full border border-ice-200 dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-950 text-dark dark:text-white outline-none focus:ring-2 focus:ring-ice-300" />
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-6 py-2.5 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-all">Cancel</button>
                        <button type="submit" className="px-8 py-2.5 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-all shadow-lg">Save Item</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
