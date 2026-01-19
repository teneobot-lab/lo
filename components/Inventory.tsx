import React, { useState, useMemo } from 'react';
import { InventoryItem, Role } from '../types';
import { Plus, Search, Edit2, Trash2, Filter, ToggleLeft, ToggleRight, X, Upload, FileSpreadsheet, Download } from 'lucide-react';
import { storageService } from '../services/storageService';
import * as XLSX from 'xlsx';

interface InventoryProps {
  items: InventoryItem[];
  role: Role;
  onRefresh: () => void;
}

export const Inventory: React.FC<InventoryProps> = ({ items, role, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All'); // All, Low Stock, Active, Inactive
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // Extract unique categories for filter dropdown
  const categories = useMemo(() => {
    const cats = new Set(items.map(i => i.category));
    return ['All', ...Array.from(cats)];
  }, [items]);

  // Advanced Filter Logic
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
    if (window.confirm('Are you sure you want to delete this item?')) {
      storageService.deleteItem(id);
      onRefresh();
    }
  };

  const handleToggleStatus = (item: InventoryItem) => {
    storageService.saveItem({ ...item, active: !item.active });
    onRefresh();
  };

  const downloadTemplate = () => {
      const template = [
          { SKU: 'ELEC-003', Name: 'Example Item', Category: 'Electronics', Price: 100000, Location: 'A-01', Unit: 'Pcs', Stock: 10, MinLevel: 5, ConversionUnit: 'Box', ConversionRatio: 12 }
      ];
      const ws = XLSX.utils.json_to_sheet(template);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Template");
      XLSX.writeFile(wb, "Nexus_Inventory_Template.xlsx");
  };

  const handleBulkImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws) as any[];

      let importedCount = 0;
      data.forEach(row => {
        // Basic validation mapping
        if (row.SKU && row.Name && row.Price) {
            const newItem: InventoryItem = {
                id: crypto.randomUUID(), // In real app, check if SKU exists to update ID
                sku: String(row.SKU),
                name: String(row.Name),
                category: String(row.Category || 'General'),
                price: Number(row.Price),
                location: String(row.Location || 'Unassigned'),
                unit: String(row.Unit || 'Pcs'),
                stock: Number(row.Stock || 0),
                minLevel: Number(row.MinLevel || 5),
                active: true,
                conversionRatio: Number(row.ConversionRatio || 0),
                conversionUnit: String(row.ConversionUnit || '')
            };
            
            // Basic Upsert Logic based on SKU
            const existing = items.find(i => i.sku === newItem.sku);
            if (existing) {
                newItem.id = existing.id;
            }
            storageService.saveItem(newItem);
            importedCount++;
        }
      });
      alert(`Successfully processed ${importedCount} items.`);
      onRefresh();
    };
    reader.readAsBinaryString(file);
    // Reset input
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Top Bar: Search, Filters, Actions */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-4 rounded-2xl shadow-soft border border-slate-100">
        
        {/* Search & Filters Group */}
        <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto">
             {/* Search */}
            <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                <input 
                    type="text" 
                    placeholder="Search SKU or Name..." 
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Category Filter */}
            <div className="relative w-full md:w-48">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                <select 
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm appearance-none cursor-pointer"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>

            {/* Status Filter */}
            <div className="relative w-full md:w-48">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
                    <div className={`w-2 h-2 rounded-full ${statusFilter === 'Low Stock' ? 'bg-rose-500' : 'bg-slate-400'}`}></div>
                </div>
                <select 
                    className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm appearance-none cursor-pointer"
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

        {/* Action Buttons */}
        {role !== 'viewer' && (
          <div className="flex items-center gap-3 w-full xl:w-auto">
             <button onClick={downloadTemplate} className="text-muted hover:text-primary transition-colors p-2" title="Download Template">
                 <Download size={20} />
             </button>
             <div className="relative">
                <input 
                    type="file" 
                    accept=".csv, .xlsx, .xls" 
                    onChange={handleBulkImport} 
                    className="absolute inset-0 opacity-0 cursor-pointer w-full"
                    title="Import Excel/CSV (Columns: SKU, Name, Price, Stock, etc)"
                />
                <button className="flex items-center gap-2 bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 px-4 py-2 rounded-xl font-medium transition-colors text-sm whitespace-nowrap">
                    <FileSpreadsheet size={18} />
                    Bulk Import
                </button>
             </div>

            <button 
              onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
              className="flex items-center gap-2 bg-primary hover:bg-blue-600 text-white px-5 py-2 rounded-xl font-medium shadow-soft transition-colors text-sm whitespace-nowrap"
            >
              <Plus size={18} />
              Add Item
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-soft border border-slate-100 overflow-hidden flex flex-col max-h-[calc(100vh-240px)]">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left relative border-collapse">
            <thead className="bg-slate-50 border-b border-border text-xs font-semibold text-muted uppercase tracking-wider sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="p-4 bg-slate-50">SKU / Name</th>
                <th className="p-4 bg-slate-50">Category</th>
                <th className="p-4 bg-slate-50">Location</th>
                <th className="p-4 bg-slate-50">Price</th>
                <th className="p-4 text-center bg-slate-50">Stock</th>
                <th className="p-4 text-center bg-slate-50">Status</th>
                {role !== 'viewer' && <th className="p-4 text-right bg-slate-50">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredItems.map(item => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-dark">{item.name}</span>
                      <span className="text-xs text-muted">{item.sku}</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-gray-600">{item.category}</td>
                  <td className="p-4 text-sm">
                    <span className="px-2 py-1 bg-slate-100 rounded text-xs font-medium text-slate-600">{item.location}</span>
                  </td>
                  <td className="p-4 text-sm font-medium">
                      Rp {item.price.toLocaleString('id-ID')}
                      <div className="text-[10px] text-muted font-normal">Per {item.unit}</div>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex flex-col items-center">
                        <span className={`text-sm font-bold ${item.stock <= item.minLevel ? 'text-rose-500' : 'text-emerald-600'}`}>
                            {item.stock}
                        </span>
                        <span className="text-xs text-muted">{item.unit}</span>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    {role !== 'viewer' ? (
                        <button onClick={() => handleToggleStatus(item)} className="text-muted hover:text-primary transition-colors">
                            {item.active ? <ToggleRight size={24} className="text-emerald-500" /> : <ToggleLeft size={24} />}
                        </button>
                    ) : (
                        <span className={`text-xs px-2 py-1 rounded-full ${item.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                            {item.active ? 'Active' : 'Inactive'}
                        </span>
                    )}
                  </td>
                  {role !== 'viewer' && (
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => { setEditingItem(item); setIsModalOpen(true); }}
                          className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
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
                  <td colSpan={7} className="p-8 text-center text-muted">No items found matching your filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <ItemModal 
          item={editingItem} 
          onClose={() => setIsModalOpen(false)} 
          onSave={(item) => {
            storageService.saveItem(item);
            onRefresh();
            setIsModalOpen(false);
          }} 
        />
      )}
    </div>
  );
};

// Sub-component: Modal for Add/Edit
// Updated to accept partial inputs, allow empty strings for numbers, and look cleaner
const ItemModal = ({ item, onClose, onSave }: { item: InventoryItem | null, onClose: () => void, onSave: (i: InventoryItem) => void }) => {
    // We use a flexible type for form state to allow empty strings during editing
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
        // For numbers, allow string if empty, else parse
        let val: any = value;
        if (type === 'number') {
             val = value === '' ? '' : parseFloat(value);
        }

        setFormData((prev: any) => ({
            ...prev,
            [name]: val
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newItem: InventoryItem = {
            id: item?.id || crypto.randomUUID(),
            sku: formData.sku!,
            name: formData.name!,
            category: formData.category!,
            price: Number(formData.price || 0),
            location: formData.location!,
            unit: formData.unit!,
            stock: Number(formData.stock || 0),
            minLevel: Number(formData.minLevel || 0),
            active: formData.active !== undefined ? formData.active : true,
            conversionRatio: Number(formData.conversionRatio || 0),
            conversionUnit: formData.conversionUnit || ''
        };
        onSave(newItem);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in">
                <div className="p-6 border-b border-border flex justify-between items-center bg-slate-50">
                    <h3 className="text-xl font-bold text-dark">{item ? 'Edit Item' : 'New Inventory Item'}</h3>
                    <button onClick={onClose} className="text-muted hover:text-dark"><X size={24}/></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-muted uppercase mb-1">SKU</label>
                            <input required name="sku" value={formData.sku || ''} onChange={handleChange} className="w-full border p-2 rounded-lg" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-muted uppercase mb-1">Item Name</label>
                            <input required name="name" value={formData.name || ''} onChange={handleChange} className="w-full border p-2 rounded-lg" />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-muted uppercase mb-1">Category</label>
                            <input required name="category" value={formData.category || ''} onChange={handleChange} className="w-full border p-2 rounded-lg"/>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-muted uppercase mb-1">Location</label>
                            <input required name="location" value={formData.location || ''} onChange={handleChange} className="w-full border p-2 rounded-lg"/>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-muted uppercase mb-1">Price (Rp) / Unit</label>
                            <input required type="number" name="price" value={formData.price} onChange={handleChange} className="w-full border p-2 rounded-lg" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-muted uppercase mb-1">Base Unit</label>
                            <select name="unit" value={formData.unit} onChange={handleChange} className="w-full border p-2 rounded-lg">
                                <option value="Pcs">Pcs</option>
                                <option value="Box">Box</option>
                                <option value="Unit">Unit</option>
                                <option value="Kg">Kg</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-muted uppercase mb-1">Current Stock (Base)</label>
                            <input required type="number" name="stock" value={formData.stock} onChange={handleChange} className="w-full border p-2 rounded-lg" />
                        </div>
                    </div>

                     {/* Conversion Section */}
                     <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                        <h4 className="text-xs font-bold text-primary uppercase mb-3 flex items-center gap-2">
                             Multi-Unit Conversion (Optional)
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-muted uppercase mb-1">Conversion Unit</label>
                                <input name="conversionUnit" value={formData.conversionUnit || ''} onChange={handleChange} className="w-full border p-2 rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-muted uppercase mb-1">Ratio (1 Conv = X Base)</label>
                                <input type="number" name="conversionRatio" value={formData.conversionRatio} onChange={handleChange} className="w-full border p-2 rounded-lg" />
                            </div>
                        </div>
                     </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-muted uppercase mb-1">Min Level (Alert)</label>
                            <input type="number" name="minLevel" value={formData.minLevel} onChange={handleChange} className="w-full border p-2 rounded-lg" />
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-5 py-2 text-muted font-medium hover:bg-slate-100 rounded-xl">Cancel</button>
                        <button type="submit" className="px-5 py-2 bg-primary text-white font-medium rounded-xl shadow-lg shadow-blue-500/30 hover:bg-blue-600 transition-all">Save Item</button>
                    </div>
                </form>
            </div>
        </div>
    );
};