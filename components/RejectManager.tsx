
import React, { useState, useMemo } from 'react';
import { RejectItem, RejectLog, RejectItemDetail } from '../types';
import { Plus, Search, Trash2, Edit2, Save, X, Calendar, FileText, ChevronRight, AlertTriangle, Settings, ChevronDown, Check, Package, AlertCircle } from 'lucide-react';

interface RejectManagerProps {
  rejectMasterData: RejectItem[];
  rejectLogs: RejectLog[];
  onAddLog: (log: RejectLog) => void;
  onUpdateLog: (log: RejectLog) => void;
  onDeleteLog: (id: string) => void;
  onUpdateMaster: (items: RejectItem[]) => void;
}

export const RejectManager: React.FC<RejectManagerProps> = ({
  rejectMasterData,
  rejectLogs,
  onAddLog,
  onUpdateLog,
  onDeleteLog,
  onUpdateMaster
}) => {
  const [activeTab, setActiveTab] = useState<'logs' | 'master'>('logs');
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<RejectLog | null>(null);
  
  const [isMasterModalOpen, setIsMasterModalOpen] = useState(false);
  const [editingMasterItem, setEditingMasterItem] = useState<RejectItem | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');

  // --- Master Data Handlers ---
  const handleSaveMasterItem = (item: RejectItem) => {
    let newItems = [...rejectMasterData];
    const idx = newItems.findIndex(i => i.id === item.id);
    if (idx >= 0) {
        newItems[idx] = item;
    } else {
        newItems.push(item);
    }
    onUpdateMaster(newItems);
    setIsMasterModalOpen(false);
  };

  const handleDeleteMasterItem = (id: string) => {
      if (window.confirm("Delete this item from Master Data?")) {
          onUpdateMaster(rejectMasterData.filter(i => i.id !== id));
      }
  };

  // --- Log Handlers ---
  const handleSaveLog = (log: RejectLog) => {
      if (editingLog) {
          onUpdateLog(log);
      } else {
          onAddLog(log);
      }
      setIsLogModalOpen(false);
  };

  return (
    <div className="space-y-6">
       {/* Tab Navigation */}
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-soft border border-ice-100 dark:border-gray-700">
           <div className="flex items-center gap-2 p-1 bg-ice-50 dark:bg-gray-900 rounded-xl">
               <button 
                  onClick={() => setActiveTab('logs')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'logs' ? 'bg-white dark:bg-gray-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-gray-400'}`}
               >
                   Reject Logs
               </button>
               <button 
                  onClick={() => setActiveTab('master')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'master' ? 'bg-white dark:bg-gray-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-gray-400'}`}
               >
                   Master Data
               </button>
           </div>
           
           <div className="flex gap-3 w-full md:w-auto">
               <div className="relative flex-1 md:w-64">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                   <input 
                       type="text" 
                       placeholder="Search..." 
                       value={searchTerm}
                       onChange={e => setSearchTerm(e.target.value)}
                       className="w-full pl-10 pr-4 py-2.5 bg-ice-50 dark:bg-gray-900 border border-ice-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ice-300 dark:text-white"
                   />
               </div>
               <button 
                   onClick={() => {
                       if (activeTab === 'logs') {
                           setEditingLog(null);
                           setIsLogModalOpen(true);
                       } else {
                           setEditingMasterItem(null);
                           setIsMasterModalOpen(true);
                       }
                   }}
                   className="flex items-center gap-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-lg whitespace-nowrap"
               >
                   <Plus size={18} /> {activeTab === 'logs' ? 'New Reject Log' : 'Add Master Item'}
               </button>
           </div>
       </div>

       {/* Content */}
       {activeTab === 'master' && (
           <MasterDataList 
                items={rejectMasterData.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()) || i.sku.toLowerCase().includes(searchTerm.toLowerCase()))} 
                onEdit={(i) => { setEditingMasterItem(i); setIsMasterModalOpen(true); }}
                onDelete={handleDeleteMasterItem}
           />
       )}

       {activeTab === 'logs' && (
           <RejectLogsList 
                logs={rejectLogs.filter(l => l.id.toLowerCase().includes(searchTerm.toLowerCase()) || l.items.some(i => i.itemName.toLowerCase().includes(searchTerm.toLowerCase())))}
                onEdit={(l) => { setEditingLog(l); setIsLogModalOpen(true); }}
                onDelete={onDeleteLog}
           />
       )}

       {/* Modals */}
       {isMasterModalOpen && (
           <MasterItemModal 
               item={editingMasterItem} 
               onClose={() => setIsMasterModalOpen(false)} 
               onSave={handleSaveMasterItem} 
           />
       )}

       {isLogModalOpen && (
           <RejectLogModal 
               log={editingLog} 
               masterData={rejectMasterData}
               onClose={() => setIsLogModalOpen(false)} 
               onSave={handleSaveLog} 
           />
       )}
    </div>
  );
};

// --- Sub Components ---

const MasterDataList: React.FC<{ items: RejectItem[], onEdit: (i: RejectItem) => void, onDelete: (id: string) => void }> = ({ items, onEdit, onDelete }) => (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-soft border border-ice-100 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-gray-800 border-b border-ice-100 dark:border-gray-700 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                    <th className="p-4">SKU / Name</th>
                    <th className="p-4">Base Unit</th>
                    <th className="p-4">Conversions</th>
                    <th className="p-4 text-right">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-ice-50 dark:divide-gray-700">
                {items.length > 0 ? items.map(item => (
                    <tr key={item.id} className="hover:bg-ice-50/50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="p-4">
                            <div className="font-bold text-sm text-slate-800 dark:text-white">{item.name}</div>
                            <div className="text-xs text-slate-400">{item.sku}</div>
                        </td>
                        <td className="p-4 text-sm text-slate-600 dark:text-gray-300">{item.baseUnit}</td>
                        <td className="p-4 text-xs text-slate-500 dark:text-gray-400">
                            {item.unit2 && <div className="mb-0.5"><span className="font-bold">{item.unit2}:</span> {item.op2 === 'divide' ? '/' : 'x'} {item.ratio2}</div>}
                            {item.unit3 && <div><span className="font-bold">{item.unit3}:</span> {item.op3 === 'divide' ? '/' : 'x'} {item.ratio3}</div>}
                        </td>
                        <td className="p-4 text-right">
                            <div className="flex justify-end gap-2">
                                <button onClick={() => onEdit(item)} className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg"><Edit2 size={16}/></button>
                                <button onClick={() => onDelete(item.id)} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg"><Trash2 size={16}/></button>
                            </div>
                        </td>
                    </tr>
                )) : (
                    <tr><td colSpan={4} className="p-8 text-center text-slate-400">No Master Items Found</td></tr>
                )}
            </tbody>
        </table>
    </div>
);

const RejectLogsList: React.FC<{ logs: RejectLog[], onEdit: (l: RejectLog) => void, onDelete: (id: string) => void }> = ({ logs, onEdit, onDelete }) => (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-soft border border-ice-100 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-gray-800 border-b border-ice-100 dark:border-gray-700 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                    <th className="p-4">Log ID</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Items</th>
                    <th className="p-4">Notes</th>
                    <th className="p-4 text-right">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-ice-50 dark:divide-gray-700">
                {logs.length > 0 ? logs.map(log => (
                    <tr key={log.id} className="hover:bg-ice-50/50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="p-4 font-bold text-sm text-slate-800 dark:text-white">{log.id}</td>
                        <td className="p-4 text-sm text-slate-600 dark:text-gray-300">{new Date(log.date).toLocaleDateString()}</td>
                        <td className="p-4 text-sm">
                            <div className="flex flex-col gap-1">
                                {log.items.slice(0, 2).map((item, idx) => (
                                    <span key={idx} className="text-slate-600 dark:text-gray-400 flex items-center gap-1">
                                        <Package size={12}/> {item.itemName} ({item.quantity} {item.unit})
                                    </span>
                                ))}
                                {log.items.length > 2 && <span className="text-xs text-slate-400">+{log.items.length - 2} more...</span>}
                            </div>
                        </td>
                        <td className="p-4 text-sm text-slate-500 italic truncate max-w-xs">{log.notes || '-'}</td>
                        <td className="p-4 text-right">
                            <div className="flex justify-end gap-2">
                                <button onClick={() => onEdit(log)} className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg"><Settings size={16}/></button>
                                <button onClick={() => onDelete(log.id)} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg"><Trash2 size={16}/></button>
                            </div>
                        </td>
                    </tr>
                )) : (
                    <tr><td colSpan={5} className="p-8 text-center text-slate-400">No Reject Logs Found</td></tr>
                )}
            </tbody>
        </table>
    </div>
);

// --- Modals ---

const MasterItemModal: React.FC<{ item: RejectItem | null, onClose: () => void, onSave: (i: RejectItem) => void }> = ({ item, onClose, onSave }) => {
    const [formData, setFormData] = useState<Partial<RejectItem>>(item || {
        sku: '', name: '', baseUnit: 'Pcs', op2: 'multiply', op3: 'multiply'
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            id: item?.id || crypto.randomUUID(),
            lastUpdated: new Date().toISOString(),
            sku: formData.sku!,
            name: formData.name!,
            baseUnit: formData.baseUnit!,
            unit2: formData.unit2,
            ratio2: formData.ratio2 ? Number(formData.ratio2) : undefined,
            op2: formData.op2,
            unit3: formData.unit3,
            ratio3: formData.ratio3 ? Number(formData.ratio3) : undefined,
            op3: formData.op3
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                <div className="p-6 border-b border-ice-100 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="font-bold text-xl text-slate-800 dark:text-white">{item ? 'Edit Master Item' : 'New Master Item'}</h3>
                    <button onClick={onClose}><X className="text-slate-400 hover:text-slate-800" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase">SKU</label>
                            <input required value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full p-3 border rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase">Name</label>
                            <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 border rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase">Base Unit</label>
                        <input required value={formData.baseUnit} onChange={e => setFormData({...formData, baseUnit: e.target.value})} className="w-full p-3 border rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                    </div>
                    
                    <div className="p-4 bg-slate-50 dark:bg-gray-800 rounded-xl space-y-4 border border-ice-100 dark:border-gray-700">
                        <h4 className="font-bold text-sm text-slate-700 dark:text-gray-300">Conversions (Optional)</h4>
                        {/* Unit 2 */}
                        <div className="flex gap-2">
                            <input placeholder="Unit 2 (e.g. Box)" value={formData.unit2 || ''} onChange={e => setFormData({...formData, unit2: e.target.value})} className="flex-1 p-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                            <select value={formData.op2} onChange={(e: any) => setFormData({...formData, op2: e.target.value})} className="p-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                                <option value="multiply">Multiply by</option>
                                <option value="divide">Divide by</option>
                            </select>
                            <input type="number" placeholder="Ratio" value={formData.ratio2 || ''} onChange={e => setFormData({...formData, ratio2: Number(e.target.value)})} className="w-24 p-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                        </div>
                         {/* Unit 3 */}
                         <div className="flex gap-2">
                            <input placeholder="Unit 3 (e.g. Ctn)" value={formData.unit3 || ''} onChange={e => setFormData({...formData, unit3: e.target.value})} className="flex-1 p-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                            <select value={formData.op3} onChange={(e: any) => setFormData({...formData, op3: e.target.value})} className="p-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                                <option value="multiply">Multiply by</option>
                                <option value="divide">Divide by</option>
                            </select>
                            <input type="number" placeholder="Ratio" value={formData.ratio3 || ''} onChange={e => setFormData({...formData, ratio3: Number(e.target.value)})} className="w-24 p-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button type="submit" className="px-6 py-2 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900">Save Item</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const RejectLogModal: React.FC<{ log: RejectLog | null, masterData: RejectItem[], onClose: () => void, onSave: (l: RejectLog) => void }> = ({ log, masterData, onClose, onSave }) => {
    const [date, setDate] = useState(log?.date || new Date().toISOString().slice(0, 10));
    const [notes, setNotes] = useState(log?.notes || '');
    const [items, setItems] = useState<RejectItemDetail[]>(log?.items || []);

    // Item Entry State
    const [selectedItemId, setSelectedItemId] = useState('');
    const [selectedUnit, setSelectedUnit] = useState('');
    const [quantityInput, setQuantityInput] = useState<number | ''>('');
    const [reason, setReason] = useState('');
    const [conversionRatio, setConversionRatio] = useState(1);
    const [conversionOp, setConversionOp] = useState<'multiply'|'divide'>('multiply');

    const selectedItem = useMemo(() => masterData.find(i => i.id === selectedItemId) || null, [selectedItemId, masterData]);

    const handleUnitChange = (unitName: string) => {
        setSelectedUnit(unitName);
        if (!selectedItem) return;

        if (selectedItem.baseUnit === unitName) {
            setConversionRatio(1);
            setConversionOp('divide');
        } else if (selectedItem.unit2 === unitName) {
            setConversionRatio(selectedItem.ratio2 || 1);
            setConversionOp(selectedItem.op2 || 'divide');
        } else if (selectedItem.unit3 === unitName) {
            setConversionRatio(selectedItem.ratio3 || 1);
            setConversionOp(selectedItem.op3 || 'divide');
        }
    };

    const calculateBaseQuantity = (qty: number, ratio: number, op: 'multiply' | 'divide') => {
        if (!ratio || ratio === 0) return 0;
        let result = 0;
        if (op === 'multiply') result = qty * ratio;
        else result = qty / ratio;
        // Fix: Round to 1 decimal place (e.g. 0.1, 0.3)
        return parseFloat(result.toFixed(1));
    };

    const handleAddItem = () => {
        if (!selectedItem || !quantityInput || quantityInput <= 0) return;

        const baseQty = calculateBaseQuantity(Number(quantityInput), conversionRatio, conversionOp);
        
        const newItem: RejectItemDetail = {
            itemId: selectedItem.id,
            itemName: selectedItem.name,
            sku: selectedItem.sku,
            baseUnit: selectedItem.baseUnit,
            quantity: Number(quantityInput),
            unit: selectedUnit,
            ratio: conversionRatio,
            operation: conversionOp,
            totalBaseQuantity: baseQty,
            reason: reason,
            unit2: selectedItem.unit2,
            ratio2: selectedItem.ratio2,
            op2: selectedItem.op2,
            unit3: selectedItem.unit3,
            ratio3: selectedItem.ratio3,
            op3: selectedItem.op3
        };

        setItems([...items, newItem]);
        // Reset entry
        setQuantityInput('');
        setReason('');
    };

    const handleRemoveItem = (idx: number) => {
        setItems(items.filter((_, i) => i !== idx));
    };

    const handleSave = () => {
        onSave({
            id: log?.id || `RJ-${Date.now()}`,
            date,
            items,
            notes,
            timestamp: new Date().toISOString()
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl">
                <div className="p-6 border-b border-ice-100 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="font-bold text-xl text-slate-800 dark:text-white">{log ? 'Edit Reject Log' : 'New Reject Log'}</h3>
                    <button onClick={onClose}><X className="text-slate-400 hover:text-slate-800" /></button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Header Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase">Date</label>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-3 border rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase">Notes</label>
                            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="w-full p-3 border rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white" placeholder="Optional notes..." />
                        </div>
                    </div>

                    {/* Entry Form */}
                    <div className="bg-slate-50 dark:bg-gray-800 p-5 rounded-2xl border border-ice-100 dark:border-gray-700 space-y-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1">
                                <label className="text-xs font-bold text-slate-400 uppercase">Select Item</label>
                                <select 
                                    value={selectedItemId} 
                                    onChange={(e) => {
                                        const id = e.target.value;
                                        setSelectedItemId(id);
                                        const item = masterData.find(i => i.id === id);
                                        if (item) {
                                            handleUnitChange(item.baseUnit); // Default to base unit
                                            setSelectedUnit(item.baseUnit);
                                        }
                                    }}
                                    className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                >
                                    <option value="">-- Choose Item --</option>
                                    {masterData.map(m => (
                                        <option key={m.id} value={m.id}>{m.sku} - {m.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="w-full md:w-32">
                                <label className="text-xs font-bold text-slate-400 uppercase">Unit</label>
                                <select 
                                    value={selectedUnit} 
                                    onChange={(e) => handleUnitChange(e.target.value)}
                                    className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    disabled={!selectedItem}
                                >
                                    {selectedItem && (
                                        <>
                                            <option value={selectedItem.baseUnit}>{selectedItem.baseUnit}</option>
                                            {selectedItem.unit2 && <option value={selectedItem.unit2}>{selectedItem.unit2}</option>}
                                            {selectedItem.unit3 && <option value={selectedItem.unit3}>{selectedItem.unit3}</option>}
                                        </>
                                    )}
                                </select>
                            </div>
                            <div className="w-full md:w-32">
                                <label className="text-xs font-bold text-slate-400 uppercase">Qty</label>
                                <input type="number" value={quantityInput} onChange={e => setQuantityInput(Number(e.target.value))} className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="0" />
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="text-xs font-bold text-slate-400 uppercase">Reason</label>
                                <input value={reason} onChange={e => setReason(e.target.value)} className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="e.g. Expired, Damaged..." />
                            </div>
                            <button 
                                onClick={handleAddItem}
                                disabled={!selectedItem || !quantityInput}
                                className="self-end px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 disabled:shadow-none transition-all"
                            >
                                <Plus size={18} /> Add
                            </button>
                        </div>
                    </div>

                    {/* Items List */}
                    <div className="border border-ice-100 dark:border-gray-700 rounded-2xl overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-gray-800 border-b border-ice-100 dark:border-gray-700 text-xs font-bold text-slate-500 uppercase">
                                <tr>
                                    <th className="p-3">Item</th>
                                    <th className="p-3 text-center">Qty Input</th>
                                    <th className="p-3 text-center">Base Qty</th>
                                    <th className="p-3">Reason</th>
                                    <th className="p-3 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-ice-50 dark:divide-gray-700">
                                {items.length > 0 ? items.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="p-3">
                                            <div className="font-bold text-sm text-slate-800 dark:text-white">{item.itemName}</div>
                                            <div className="text-xs text-slate-400">{item.sku}</div>
                                        </td>
                                        <td className="p-3 text-center text-sm dark:text-gray-300">
                                            {item.quantity} {item.unit}
                                        </td>
                                        <td className="p-3 text-center text-sm font-bold text-slate-700 dark:text-gray-200">
                                            {item.totalBaseQuantity} {item.baseUnit}
                                        </td>
                                        <td className="p-3 text-sm text-rose-500 italic">
                                            {item.reason}
                                        </td>
                                        <td className="p-3">
                                            <button onClick={() => handleRemoveItem(idx)} className="text-slate-400 hover:text-rose-500"><X size={16}/></button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={5} className="p-4 text-center text-xs text-slate-400">No items added to this log yet.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="p-6 border-t border-ice-100 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-3 text-slate-500 font-bold hover:bg-white rounded-xl">Cancel</button>
                    <button onClick={handleSave} disabled={items.length === 0} className="px-8 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-lg disabled:opacity-50">Save Log</button>
                </div>
            </div>
        </div>
    );
};
