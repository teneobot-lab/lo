
import React, { useState, useRef, useEffect } from 'react';
import { InventoryItem, RejectItem, RejectTransaction, User } from '../types';
import { storageService } from '../services/storageService';
import { 
  Plus, 
  Search, 
  Trash, 
  Clipboard, 
  Calendar, 
  X, 
  Package, 
  AlertCircle, 
  Layers,
  ArrowRight
} from 'lucide-react';
import { ToastType } from './Toast';

interface RejectProps {
  items: InventoryItem[];
  user: User;
  notify: (msg: string, type: ToastType) => void;
}

export const Reject: React.FC<RejectProps> = ({ items, user, notify }) => {
  const [rejectDate, setRejectDate] = useState(new Date().toISOString().slice(0, 10));
  const [batch, setBatch] = useState<RejectItem[]>([]);
  
  // Form State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [qty, setQty] = useState<number | ''>('');
  const [unit, setUnit] = useState('');
  const [reason, setReason] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedItemData = items.find(i => i.id === selectedItemId);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
            setShowDropdown(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredItems = items.filter(i => 
    i.active && (
      i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      i.sku.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const handleSelectItem = (item: InventoryItem) => {
      setSelectedItemId(item.id);
      setSearchTerm(item.name);
      setUnit(item.unit);
      setShowDropdown(false);
  };

  const addToBatch = () => {
    if (!selectedItemId || !qty || !unit) return;

    const newItem: RejectItem = {
      itemId: selectedItemId,
      sku: selectedItemData?.sku || 'N/A',
      name: selectedItemData?.name || 'Unknown',
      qty: Number(qty),
      unit: unit,
      reason: reason || 'Defective'
    };

    setBatch([...batch, newItem]);
    
    // Reset Form
    setSearchTerm('');
    setSelectedItemId('');
    setQty('');
    setUnit('');
    setReason('');
    notify('Item added to reject batch', 'info');
  };

  const removeFromBatch = (index: number) => {
    setBatch(batch.filter((_, i) => i !== index));
  };

  const formatDDMMYY = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    return `${day}${month}${year}`;
  };

  const exportToClipboard = () => {
    if (batch.length === 0) return;

    const dateFormatted = formatDDMMYY(rejectDate);
    let text = `Data Reject KKL ${dateFormatted}\n`;
    batch.forEach((item, idx) => {
      text += `• ${item.name} (${item.sku}) - ${item.qty} ${item.unit} [${item.reason}]\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      notify('Copied to clipboard in KKL format', 'success');
      
      // Save to ledger as record
      const transaction: RejectTransaction = {
        id: storageService.generateTransactionId('REJ'),
        date: new Date(rejectDate).toISOString(),
        items: batch,
        userId: user.id
      };
      storageService.saveRejectTransaction(transaction);
      setBatch([]);
    }).catch(err => {
      notify('Failed to copy to clipboard', 'error');
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
      <div className="lg:col-span-2 space-y-8">
        <div className="glass-card p-8 rounded-3xl shadow-glass">
          <div className="flex justify-between items-center mb-8">
            <div>
                <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                    <AlertCircle className="text-rose-500" /> REJECT LOGGING
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Audit-only ledger • No stock impact</p>
            </div>
            <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                <input 
                    type="date" 
                    value={rejectDate}
                    onChange={(e) => setRejectDate(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 rounded-xl font-black text-[10px] uppercase tracking-widest outline-none focus:ring-2 focus:ring-rose-500/20"
                />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-30">
             <div className="relative" ref={dropdownRef}>
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Item Search</label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        ref={searchInputRef}
                        type="text" 
                        placeholder="SKU / Name" 
                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-rose-500/10 transition-all outline-none"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setShowDropdown(true);
                            if (selectedItemId) setSelectedItemId('');
                        }}
                    />
                </div>
                {showDropdown && searchTerm && !selectedItemId && (
                    <div className="absolute top-full left-0 right-0 mt-3 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/50 dark:border-slate-700/50 max-h-48 overflow-y-auto z-50 animate-slide-up">
                        {filteredItems.map(item => (
                            <div key={item.id} onClick={() => handleSelectItem(item)} className="p-4 hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer border-b border-slate-50 dark:border-slate-800 last:border-none flex justify-between items-center transition-colors">
                                <div>
                                    <p className="font-black text-xs text-slate-800 dark:text-slate-100">{item.name}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{item.sku}</p>
                                </div>
                                {item.conversionUnit && (
                                    <span className="text-[9px] font-black text-rose-500 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full">
                                        1 {item.conversionUnit} = {item.conversionRatio} {item.unit}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                )}
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Quantity</label>
                    <input 
                        type="number" 
                        value={qty} 
                        onChange={(e) => setQty(e.target.value === '' ? '' : parseFloat(e.target.value))}
                        className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl text-sm font-black outline-none focus:ring-4 focus:ring-rose-500/10 transition-all"
                        placeholder="0"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Unit</label>
                    <input 
                        type="text" 
                        value={unit} 
                        onChange={(e) => setUnit(e.target.value)}
                        className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl text-sm font-black outline-none focus:ring-4 focus:ring-rose-500/10 transition-all"
                        placeholder="Ex: Box"
                    />
                </div>
             </div>
          </div>

          <div className="mt-6 flex flex-col md:flex-row gap-4 items-end">
             <div className="flex-1 w-full space-y-1">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Reject Reason / Remark</label>
                <input 
                    type="text" 
                    value={reason} 
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-rose-500/10 transition-all"
                    placeholder="e.g. Physical Damage, Expired, Wrong SKU"
                />
             </div>
             <button 
                onClick={addToBatch}
                className="w-full md:w-auto px-10 py-3.5 bg-rose-500 text-white font-black rounded-2xl shadow-xl shadow-rose-500/30 hover:bg-rose-600 active:scale-95 transition-all text-xs tracking-widest flex items-center justify-center gap-2"
             >
                <Plus size={18} strokeWidth={3} /> ADD TO BATCH
             </button>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-3xl shadow-glass flex flex-col h-[calc(100vh-140px)] sticky top-24 overflow-hidden border border-white/20">
        <div className="p-6 border-b border-slate-200/50 dark:border-slate-800/50 bg-rose-500/10 dark:bg-rose-950/20 flex justify-between items-center">
          <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2 text-sm tracking-tight uppercase tracking-tighter">
            <Layers size={18} className="text-rose-500" /> REJECT BATCH
          </h3>
          <span className="bg-rose-500 text-white text-[10px] px-2.5 py-1 rounded-full font-black shadow-md">{batch.length}</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {batch.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-30 px-6 text-center animate-pulse">
                <Package size={56} strokeWidth={1} className="mb-4" />
                <p className="text-[10px] font-black tracking-widest uppercase">No Reject Data</p>
            </div>
          ) : batch.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center p-4 bg-white/50 dark:bg-slate-800/50 rounded-2xl border border-slate-100/50 dark:border-slate-700/50 hover:shadow-md transition-all group animate-slide-in-right">
              <div>
                  <p className="font-black text-xs text-slate-800 dark:text-slate-100 tracking-tight">{item.name}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{item.qty} {item.unit} • {item.reason}</p>
              </div>
              <button onClick={() => removeFromBatch(idx)} className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-xl transition-all">
                <Trash size={16} />
              </button>
            </div>
          ))}
        </div>

        <div className="p-6 border-t border-slate-200/50 dark:border-slate-800/50 bg-white/20 dark:bg-slate-900/20">
          <button 
            onClick={exportToClipboard}
            disabled={batch.length === 0}
            className="w-full py-4 bg-gradient-to-br from-indigo-500 to-primary text-white font-black rounded-2xl shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 text-sm tracking-widest uppercase disabled:opacity-30"
          >
            <Clipboard size={20} strokeWidth={2.5} /> EXPORT TO CLIPBOARD
          </button>
          <p className="text-[9px] text-center text-slate-400 font-bold uppercase tracking-widest mt-4">Generates KKL Format ddmmyy</p>
        </div>
      </div>
    </div>
  );
};
