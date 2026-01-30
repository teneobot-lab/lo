
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { RejectItem, RejectLog, RejectItemDetail } from '../types';
import { 
    Plus, Search, Trash2, Edit2, Save, X, Calendar, FileText, 
    ChevronRight, AlertTriangle, Settings, ChevronDown, Check, 
    Package, AlertCircle, Upload, Copy, FileSpreadsheet, 
    Download, Layers, Table, Clipboard, CheckSquare, Square, 
    Share2, Calculator, ShoppingCart, Zap, ArrowRight, TrendingDown,
    ListFilter, MoreHorizontal
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface RejectManagerProps {
  rejectMasterData: RejectItem[];
  rejectLogs: RejectLog[];
  onAddLog: (log: RejectLog) => void;
  onUpdateLog: (log: RejectLog) => void;
  onDeleteLog: (id: string) => void;
  onDeleteMaster: (id: string) => void;
  onUpdateMaster: (items: RejectItem[]) => void;
}

export const RejectManager: React.FC<RejectManagerProps> = ({
  rejectMasterData,
  rejectLogs,
  onAddLog,
  onUpdateLog,
  onDeleteLog,
  onDeleteMaster,
  onUpdateMaster
}) => {
  const [activeTab, setActiveTab] = useState<'logs' | 'master'>('logs');
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<RejectLog | null>(null);
  const [isMasterModalOpen, setIsMasterModalOpen] = useState(false);
  const [editingMasterItem, setEditingMasterItem] = useState<RejectItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedLogIds, setSelectedLogIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredLogs = useMemo(() => rejectLogs.filter(l => l.id.toLowerCase().includes(searchTerm.toLowerCase()) || l.items.some(i => i.itemName.toLowerCase().includes(searchTerm.toLowerCase()))), [rejectLogs, searchTerm]);
  const filteredMaster = useMemo(() => rejectMasterData.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()) || i.sku.toLowerCase().includes(searchTerm.toLowerCase())), [rejectMasterData, searchTerm]);

  const toggleLogSelection = (id: string) => {
    const next = new Set(selectedLogIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedLogIds(next);
  };

  const toggleSelectAllLogs = () => {
    if (selectedLogIds.size === filteredLogs.length) setSelectedLogIds(new Set());
    else setSelectedLogIds(new Set(filteredLogs.map(l => l.id)));
  };

  const exportFlattenedExcel = () => {
    const targetLogs = rejectLogs.filter(l => selectedLogIds.has(l.id));
    if (targetLogs.length === 0) return alert("Pilih minimal satu log untuk diekspor.");

    const uniqueDates = Array.from(new Set(targetLogs.map(l => l.date))).sort();
    const matrix: Record<string, { name: string, sku: string, unit: string, values: Record<string, number> }> = {};

    targetLogs.forEach(log => {
        log.items.forEach(item => {
            if (!matrix[item.sku]) {
                matrix[item.sku] = { name: item.itemName, sku: item.sku, unit: item.baseUnit, values: {} };
            }
            const currentVal = matrix[item.sku].values[log.date] || 0;
            matrix[item.sku].values[log.date] = currentVal + item.totalBaseQuantity;
        });
    });

    // Formatting for "Boss": Zero values are replaced with empty strings for a clean look
    const exportData = Object.values(matrix).map(row => {
        const rowData: any = { 
            'SKU': row.sku, 
            'NAMA BARANG': row.name.toUpperCase(), 
            'SATUAN': row.unit.toUpperCase() 
        };
        
        let totalRow = 0;
        uniqueDates.forEach(date => {
            const val = row.values[date] || 0;
            rowData[date] = val === 0 ? "" : val;
            totalRow += val;
        });

        rowData['TOTAL AKHIR'] = totalRow === 0 ? "" : totalRow;
        return rowData;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Auto-size columns for better readability
    const wscols = [
        {wch: 15}, {wch: 45}, {wch: 10},
        ...uniqueDates.map(() => ({wch: 14})),
        {wch: 18}
    ];
    ws['!cols'] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan_Reject");
    XLSX.writeFile(wb, `LAPORAN_REJECT_ENTERPRISE_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const copyLogToClipboard = (log: RejectLog) => {
      const d = new Date(log.date);
      const dateStr = d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '');
      let text = `*Data Reject KKL ${dateStr}*\n`;
      log.items.forEach(item => {
          text += `• ${item.itemName} ${item.quantity} ${item.unit} (${item.reason})\n`;
      });
      navigator.clipboard.writeText(text).then(() => alert("Disalin ke clipboard!"));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-paper border border-slate-100 dark:border-gray-700 transition-colors">
           <div className="flex items-center gap-2 p-1.5 bg-slate-50 dark:bg-gray-900 rounded-2xl">
               <button onClick={() => setActiveTab('logs')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'logs' ? 'bg-white dark:bg-gray-700 text-paper-blue shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:text-gray-500 dark:hover:text-gray-300'}`}>Log Kejadian</button>
               <button onClick={() => setActiveTab('master')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'master' ? 'bg-white dark:bg-gray-700 text-paper-blue shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:text-gray-500 dark:hover:text-gray-300'}`}>Master Barang</button>
           </div>
           
           <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
               <div className="relative flex-1 md:w-72">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                   <input type="text" placeholder="Cari Log atau Produk..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-paper-blue transition-all dark:text-white" />
               </div>
               
               {activeTab === 'logs' && selectedLogIds.size > 0 && (
                   <button onClick={exportFlattenedExcel} className="flex items-center gap-2 bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl animate-in zoom-in duration-200 hover:scale-105 transition-all">
                       <FileSpreadsheet size={18} className="text-emerald-400" /> Export Laporan Atasan ({selectedLogIds.size})
                   </button>
               )}

               <button onClick={() => { if (activeTab === 'logs') { setEditingLog(null); setIsLogModalOpen(true); } else { setEditingMasterItem(null); setIsMasterModalOpen(true); } }} className="flex items-center gap-3 bg-paper-blue hover:bg-paper-blueHover text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95"><Plus size={20} /> {activeTab === 'logs' ? 'Catat Reject' : 'Tambah Master'}</button>
           </div>
       </div>

       <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-paper border border-slate-100 dark:border-gray-700 overflow-hidden transition-colors">
           <table className="w-full text-left enterprise-table">
               <thead>
                   {activeTab === 'master' ? (
                       <tr><th className="p-6">Produk Master</th><th className="p-6">Satuan Dasar</th><th className="p-6">Konversi Unit</th><th className="p-6 text-right">Aksi</th></tr>
                   ) : (
                       <tr>
                           <th className="p-6 w-12 text-center sticky left-0 z-10 bg-inherit">
                               <button onClick={toggleSelectAllLogs} className="text-slate-400">
                                   {selectedLogIds.size === filteredLogs.length && filteredLogs.length > 0 ? <CheckSquare size={20} className="text-paper-blue" /> : <Square size={20} />}
                               </button>
                           </th>
                           <th className="p-6">ID Log</th><th className="p-6">Waktu Kejadian</th><th className="p-6">Item Reject</th><th className="p-6">Status/Keterangan</th><th className="p-6 text-right">Aksi</th>
                       </tr>
                   )}
               </thead>
               <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                   {activeTab === 'master' ? (
                       filteredMaster.map(item => (
                           <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors">
                               <td className="p-6"><div className="font-black text-slate-800 dark:text-white uppercase tracking-tight">{item.name}</div><div className="text-[10px] font-mono text-slate-400">SKU: {item.sku}</div></td>
                               <td className="p-6"><span className="px-3 py-1.5 bg-slate-100 dark:bg-gray-700 rounded-lg text-xs font-black text-slate-600 dark:text-gray-300 uppercase tracking-widest">{item.baseUnit}</span></td>
                               <td className="p-6 text-xs text-slate-500 dark:text-gray-400 font-bold">
                                   {item.unit2 && <div>1 {item.unit2} = {item.op2 === 'divide' ? '/' : 'x'}{item.ratio2} {item.baseUnit}</div>}
                                   {item.unit3 && <div>1 {item.unit3} = {item.op3 === 'divide' ? '/' : 'x'}{item.ratio3} {item.baseUnit}</div>}
                               </td>
                               <td className="p-6 text-right">
                                   <div className="flex justify-end gap-2">
                                       <button onClick={() => { setEditingMasterItem(item); setIsMasterModalOpen(true); }} className="p-2 text-slate-400 hover:text-paper-blue hover:bg-white dark:hover:bg-gray-600 rounded-xl transition-all shadow-sm"><Edit2 size={18}/></button>
                                       <button onClick={() => onDeleteMaster(item.id)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all shadow-sm"><Trash2 size={18}/></button>
                                   </div>
                               </td>
                           </tr>
                       ))
                   ) : (
                       filteredLogs.map(log => (
                           <tr key={log.id} className={`hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors ${selectedLogIds.has(log.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                               <td className="p-6 text-center sticky left-0 bg-inherit z-10">
                                   <button onClick={() => toggleLogSelection(log.id)}>
                                       {selectedLogIds.has(log.id) ? <CheckSquare size={20} className="text-paper-blue" /> : <Square size={20} className="text-slate-200" />}
                                   </button>
                               </td>
                               <td className="p-6 font-black text-paper-blue text-sm uppercase tracking-tighter">{log.id}</td>
                               <td className="p-6 text-sm font-bold text-slate-500 dark:text-gray-400 uppercase tracking-widest">{new Date(log.date).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year: 'numeric'})}</td>
                               <td className="p-6">
                                   <div className="flex flex-col gap-1">
                                       {log.items.slice(0, 3).map((it, idx) => (
                                           <div key={idx} className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-gray-300">
                                               <Package size={14} className="text-rose-500"/> {it.itemName} ({it.quantity} {it.unit})
                                           </div>
                                       ))}
                                       {log.items.length > 3 && <div className="text-[10px] text-slate-400 font-black italic">+{log.items.length - 3} ITEM LAINNYA</div>}
                                   </div>
                               </td>
                               <td className="p-6 text-xs font-bold text-slate-400 italic uppercase tracking-tighter truncate max-w-xs">{log.notes || 'Reguler Reject'}</td>
                               <td className="p-6 text-right">
                                   <div className="flex justify-end gap-2">
                                       <button onClick={() => copyLogToClipboard(log)} className="p-2 text-emerald-500 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all shadow-sm" title="Copy for WhatsApp"><Clipboard size={18}/></button>
                                       <button onClick={() => { setEditingLog(log); setIsLogModalOpen(true); }} className="p-2 text-slate-400 hover:text-paper-blue hover:bg-white dark:hover:bg-gray-600 rounded-xl transition-all shadow-sm"><Settings size={18}/></button>
                                       <button onClick={() => onDeleteLog(log.id)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all shadow-sm"><Trash2 size={18}/></button>
                                   </div>
                               </td>
                           </tr>
                       ))
                   )}
               </tbody>
           </table>
       </div>

       {isLogModalOpen && <RejectLogModal log={editingLog} masterData={rejectMasterData} onClose={() => setIsLogModalOpen(false)} onSave={onAddLog} />}
       {isMasterModalOpen && <MasterItemModal item={editingMasterItem} onClose={() => setIsMasterModalOpen(false)} onSave={(item: RejectItem) => {
           const combined = [...rejectMasterData];
           const idx = combined.findIndex(ex => ex.id === item.id);
           if (idx >= 0) combined[idx] = item;
           else combined.push(item);
           onUpdateMaster(combined);
           setIsMasterModalOpen(false);
       }} />}
    </div>
  );
};

const RejectLogModal = ({ log, masterData, onClose, onSave }: any) => {
    const [date, setDate] = useState(log ? log.date : new Date().toISOString().slice(0, 10));
    const [notes, setNotes] = useState(log ? log.notes : '');
    const [items, setItems] = useState<RejectItemDetail[]>(log ? log.items : []);
    
    // Autocomplete State
    const [itemSearch, setItemSearch] = useState('');
    const [showItemDropdown, setShowItemDropdown] = useState(false);
    const [selectedMasterId, setSelectedMasterId] = useState('');
    const [focusedIndex, setFocusedIndex] = useState(-1);
    
    const [qty, setQty] = useState('');
    const [unit, setUnit] = useState('');
    const [reason, setReason] = useState('');
    
    const itemSearchRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const qtyInputRef = useRef<HTMLInputElement>(null);
    const reasonInputRef = useRef<HTMLInputElement>(null);

    const selectedMaster = useMemo(() => masterData.find((m: any) => m.id === selectedMasterId), [selectedMasterId, masterData]);

    const filteredMasters = useMemo(() => {
        if (!itemSearch || selectedMasterId) return [];
        const query = itemSearch.toLowerCase();
        return masterData.filter((m: any) => 
            m.name.toLowerCase().includes(query) || 
            m.sku.toLowerCase().includes(query)
        ).slice(0, 10);
    }, [itemSearch, masterData, selectedMasterId]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (itemSearchRef.current && !itemSearchRef.current.contains(e.target as Node)) {
                setShowItemDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelectItem = (m: RejectItem) => {
        setSelectedMasterId(m.id);
        setItemSearch(m.name);
        
        // Smart Unit Memory
        const savedUnit = localStorage.getItem(`reject_unit_pref_${m.id}`);
        if (savedUnit && (savedUnit === m.baseUnit || savedUnit === m.unit2 || savedUnit === m.unit3)) {
            setUnit(savedUnit);
        } else {
            setUnit(m.baseUnit);
        }

        setShowItemDropdown(false);
        setFocusedIndex(-1);
        setTimeout(() => qtyInputRef.current?.focus(), 50);
    };

    const handleSearchKeyDown = (e: React.KeyboardEvent) => {
        if (!showItemDropdown || filteredMasters.length === 0) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); setFocusedIndex(prev => (prev < filteredMasters.length - 1 ? prev + 1 : 0)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setFocusedIndex(prev => (prev > 0 ? prev - 1 : filteredMasters.length - 1)); }
        else if (e.key === 'Enter') {
            e.preventDefault();
            if (focusedIndex >= 0) handleSelectItem(filteredMasters[focusedIndex]);
            else if (filteredMasters.length > 0) handleSelectItem(filteredMasters[0]);
        }
    };

    const handleAddItem = () => {
        if (!selectedMaster || !qty || !reason) return;
        let ratio = 1; let op = 'multiply';
        if (unit === selectedMaster.baseUnit) ratio = 1; 
        else if (unit === selectedMaster.unit2) { ratio = selectedMaster.ratio2; op = selectedMaster.op2 || 'multiply'; }
        else if (unit === selectedMaster.unit3) { ratio = selectedMaster.ratio3; op = selectedMaster.op3 || 'multiply'; }
        
        const numQty = parseFloat(qty);
        let baseQty = op === 'multiply' ? numQty * ratio : numQty / ratio;
        
        const newItem: RejectItemDetail = { 
            itemId: selectedMaster.id, itemName: selectedMaster.name, sku: selectedMaster.sku, 
            baseUnit: selectedMaster.baseUnit, quantity: numQty, unit: unit, ratio: ratio, 
            operation: op as any, totalBaseQuantity: baseQty, reason: reason 
        };
        
        localStorage.setItem(`reject_unit_pref_${selectedMaster.id}`, unit);
        setItems([newItem, ...items]);
        setItemSearch(''); setSelectedMasterId(''); setQty(''); setReason('');
        setTimeout(() => searchInputRef.current?.focus(), 50);
    };

    const handleSave = () => {
        onSave({ id: log ? log.id : `LOG-${Date.now()}`, date, items, notes, timestamp: new Date().toISOString() });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-2xl animate-in fade-in duration-300">
            <div className="bg-white dark:bg-gray-900 rounded-[3.5rem] shadow-[0_40px_160px_-16px_rgba(0,0,0,0.6)] w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col border border-white/20 animate-in zoom-in duration-300">
                {/* Modal Header */}
                <div className="px-12 py-10 border-b border-slate-100 dark:border-gray-800 flex justify-between items-center bg-gradient-to-r from-rose-50 to-white dark:from-gray-800 dark:to-gray-900">
                    <div className="flex items-center gap-6">
                        <div className="p-5 bg-rose-500 rounded-[2rem] text-white shadow-2xl shadow-rose-500/30">
                            <AlertTriangle size={40} />
                        </div>
                        <div>
                            <h3 className="text-4xl font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-none mb-2">{log ? 'Update Laporan Reject' : 'Catat Barang Reject'}</h3>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.4em]">Sistem Manajemen Kerusakan & Pemusnahan Aset</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-5 hover:bg-white dark:hover:bg-gray-700 rounded-full transition-all text-slate-300 hover:text-rose-500 shadow-sm border border-transparent hover:border-slate-100"><X size={40}/></button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                    {/* LEFT PANEL: INPUT FORM (LEBIH LEBAR) */}
                    <div className="flex-[7] overflow-y-auto p-12 space-y-12 border-r border-slate-100 dark:border-gray-800 custom-scrollbar">
                        <div className="grid grid-cols-2 gap-10">
                            <div className="space-y-3">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] block ml-3">Waktu Kejadian</label>
                                <div className="relative">
                                    <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 text-rose-400" size={20}/>
                                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full pl-16 pr-6 py-6 bg-slate-50 dark:bg-gray-800 border-2 border-transparent focus:border-rose-400 rounded-[2.5rem] outline-none font-bold text-xl text-slate-700 dark:text-white dark:[color-scheme:dark] shadow-inner" />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] block ml-3">Keterangan Umum Laporan</label>
                                <input value={notes} onChange={e => setNotes(e.target.value)} className="w-full p-6 bg-slate-50 dark:bg-gray-800 border-2 border-transparent focus:border-rose-400 rounded-[2.5rem] outline-none font-bold text-xl text-slate-700 dark:text-white shadow-inner" placeholder="Contoh: Kerusakan saat distribusi..." />
                            </div>
                        </div>

                        <div className="p-10 bg-slate-50 dark:bg-gray-800/50 rounded-[3rem] border border-slate-200 dark:border-gray-700 space-y-10 relative overflow-hidden shadow-2xl">
                            <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none"><Zap size={140} /></div>
                            <h4 className="text-sm font-black text-rose-500 uppercase tracking-[0.4em] flex items-center gap-3"><Zap size={18} fill="currentColor"/> Detail Item Reject</h4>
                            
                            <div className="grid grid-cols-12 gap-6 items-end relative z-10">
                                {/* Autocomplete Repositioned to prevent cutting */}
                                <div className="col-span-12 xl:col-span-5 relative" ref={itemSearchRef}>
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block ml-3 mb-3">Cari Barang (SKU / Nama Produk)</label>
                                    <div className="relative">
                                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={24}/>
                                        <input 
                                            ref={searchInputRef} type="text" value={itemSearch} 
                                            onChange={e => { setItemSearch(e.target.value); setSelectedMasterId(''); setShowItemDropdown(true); setFocusedIndex(-1); }}
                                            onFocus={() => setShowItemDropdown(true)} onKeyDown={handleSearchKeyDown}
                                            className={`w-full pl-16 pr-6 py-5 rounded-[2rem] border-2 transition-all outline-none text-lg font-black ${selectedMasterId ? 'border-rose-500 bg-rose-50/50 text-rose-600' : 'border-slate-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:border-rose-400 shadow-sm'}`}
                                            placeholder="Ketik produk atau scan SKU..."
                                        />
                                    </div>
                                    {showItemDropdown && filteredMasters.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-3 bg-white dark:bg-gray-800 rounded-[2rem] shadow-[0_20px_80px_-10px_rgba(0,0,0,0.4)] border border-slate-100 dark:border-gray-700 z-[150] max-h-80 overflow-y-auto overflow-x-hidden p-2">
                                            {filteredMasters.map((m, idx) => (
                                                <div key={m.id} onClick={() => handleSelectItem(m)} className={`p-5 cursor-pointer rounded-2xl mb-1 flex justify-between items-center group transition-all ${focusedIndex === idx ? 'bg-rose-500 text-white shadow-lg' : 'hover:bg-slate-50 dark:hover:bg-gray-700'}`}>
                                                    <div>
                                                        <div className={`text-base font-black uppercase tracking-tight ${focusedIndex === idx ? 'text-white' : 'text-slate-800 dark:text-gray-200'}`}>{m.name}</div>
                                                        <div className={`text-[10px] font-mono tracking-widest ${focusedIndex === idx ? 'text-white/70' : 'text-slate-400'}`}>{m.sku}</div>
                                                    </div>
                                                    <ChevronRight size={20} className={focusedIndex === idx ? 'text-white' : 'text-slate-200'}/>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="col-span-4 xl:col-span-2">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block ml-3 mb-3">Jml</label>
                                    <input ref={qtyInputRef} type="number" step="0.001" value={qty} onChange={e => setQty(e.target.value)} onKeyDown={e => { if(e.key === 'Enter') { e.preventDefault(); reasonInputRef.current?.focus(); } }} className="w-full p-5 rounded-[2rem] border-2 border-slate-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white outline-none focus:border-rose-400 font-black text-center text-2xl shadow-sm" placeholder="0" />
                                </div>

                                <div className="col-span-4 xl:col-span-2">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block ml-3 mb-3">Satuan</label>
                                    <select value={unit} onChange={e => setUnit(e.target.value)} className="w-full p-5 bg-white dark:bg-gray-800 border-2 border-slate-200 dark:border-gray-700 rounded-[2rem] text-sm font-black outline-none appearance-none cursor-pointer text-center shadow-sm">
                                        {selectedMaster ? (<><option value={selectedMaster.baseUnit}>{selectedMaster.baseUnit} (UTAMA)</option>{selectedMaster.unit2 && <option value={selectedMaster.unit2}>{selectedMaster.unit2}</option>}{selectedMaster.unit3 && <option value={selectedMaster.unit3}>{selectedMaster.unit3}</option>}</>) : <option value="">-</option>}
                                    </select>
                                </div>

                                <div className="col-span-4 xl:col-span-3">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block ml-3 mb-3">Alasan Reject</label>
                                    <input ref={reasonInputRef} value={reason} onChange={e => setReason(e.target.value)} onKeyDown={e => { if(e.key === 'Enter') { e.preventDefault(); handleAddItem(); } }} className="w-full p-5 rounded-[2rem] border-2 border-slate-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white outline-none focus:border-rose-400 font-bold text-lg shadow-sm" placeholder="Pecah/Rusak/Exp..." />
                                </div>
                            </div>
                            
                            {/* Conversion Visual Hint */}
                            {selectedMaster && qty && (
                                <div className="flex items-center gap-4 p-6 bg-rose-50/70 dark:bg-rose-900/10 rounded-[2rem] border border-rose-100 dark:border-rose-900/30 animate-in slide-in-from-top-4">
                                    <TrendingDown size={28} className="text-rose-500" />
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Estimasi Pengurangan Stok Utama</p>
                                        <div className="text-2xl font-black text-rose-600 uppercase tracking-tighter leading-none">
                                            {(() => {
                                                let ratio = 1; let op = 'multiply';
                                                if (unit === selectedMaster.baseUnit) ratio = 1; 
                                                else if (unit === selectedMaster.unit2) { ratio = selectedMaster.ratio2; op = selectedMaster.op2 || 'multiply'; }
                                                else if (unit === selectedMaster.unit3) { ratio = selectedMaster.ratio3; op = selectedMaster.op3 || 'multiply'; }
                                                const val = op === 'multiply' ? parseFloat(qty) * ratio : parseFloat(qty) / ratio;
                                                return `${val.toFixed(3)} ${selectedMaster.baseUnit}`;
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <button onClick={handleAddItem} disabled={!selectedMasterId || !qty || !reason} className="w-full py-6 bg-rose-500 hover:bg-rose-600 text-white rounded-[2.5rem] font-black shadow-2xl shadow-rose-500/30 flex items-center justify-center gap-4 transition-all active:scale-[0.98] disabled:opacity-30 uppercase tracking-[0.2em] text-sm">
                                <Plus size={24}/> Tambahkan Ke Laporan (Enter)
                            </button>
                        </div>
                    </div>

                    {/* RIGHT PANEL: CART / SUMMARY (PROPORSIONAL) */}
                    <div className="flex-[3] bg-slate-50 dark:bg-gray-800/80 p-12 flex flex-col space-y-10 overflow-hidden">
                        <div className="flex justify-between items-center border-b-2 border-slate-200 dark:border-gray-700 pb-6">
                            <h4 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-[0.3em] flex items-center gap-4"><ShoppingCart size={24}/> Daftar Item</h4>
                            <span className="bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-300 px-4 py-2 rounded-2xl text-xs font-black">{items.length} RECORD</span>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto space-y-5 pr-3 custom-scrollbar">
                            {items.map((it, idx) => (
                                <div key={idx} className="group relative bg-white dark:bg-gray-900 p-6 rounded-[2rem] shadow-xl border border-slate-100 dark:border-gray-700 animate-in slide-in-from-right-8">
                                    <div className="flex items-start justify-between">
                                        <div className="flex gap-5">
                                            <div className="w-14 h-14 bg-rose-50 dark:bg-rose-900/40 rounded-[1.2rem] flex items-center justify-center text-rose-500 font-black text-sm shadow-inner uppercase">{it.unit.charAt(0)}</div>
                                            <div>
                                                <div className="text-base font-black text-slate-800 dark:text-gray-100 uppercase tracking-tight leading-none mb-2">{it.itemName}</div>
                                                <div className="text-sm font-black text-rose-500 uppercase tracking-widest">{it.quantity} {it.unit}</div>
                                                <div className="text-[11px] font-bold text-slate-400 italic mt-2 flex items-center gap-2"><ArrowRight size={10}/> {it.reason}</div>
                                            </div>
                                        </div>
                                        <button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="p-3 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"><Trash2 size={20}/></button>
                                    </div>
                                    {it.unit !== it.baseUnit && (
                                        <div className="mt-4 pt-4 border-t border-slate-50 dark:border-gray-800 text-[10px] font-black text-slate-300 tracking-[0.2em] uppercase flex justify-between">
                                            <span>KONVERSI:</span>
                                            <span className="text-paper-blue">{it.totalBaseQuantity.toFixed(3)} {it.baseUnit}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {items.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-20 py-24">
                                    <ShoppingCart size={100} />
                                    <p className="text-sm font-black uppercase tracking-[0.5em]">Belum Ada Data</p>
                                </div>
                            )}
                        </div>

                        <div className="space-y-6">
                            <div className="p-8 bg-slate-900 dark:bg-black rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-br from-rose-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <p className="text-[11px] font-black text-white/40 uppercase tracking-[0.4em] mb-3 relative z-10">Total Akumulasi Record</p>
                                <div className="flex justify-between items-end relative z-10">
                                    <span className="text-5xl font-black tracking-tighter leading-none">{items.length} <span className="text-xs text-white/30 uppercase font-black ml-2 tracking-widest">Items</span></span>
                                    <span className="text-[10px] bg-rose-500 px-4 py-2 rounded-full font-black shadow-lg">READY TO LOG</span>
                                </div>
                            </div>
                            <div className="flex gap-5">
                                <button onClick={onClose} className="flex-1 py-5 text-slate-400 font-black hover:bg-white dark:hover:bg-gray-700 rounded-[2rem] uppercase tracking-widest text-[11px] transition-all">Batal</button>
                                <button onClick={handleSave} disabled={items.length === 0} className="flex-[2] py-5 bg-paper-blue hover:bg-paper-blueHover text-white font-black rounded-[2rem] shadow-2xl shadow-blue-500/30 transition-all active:scale-[0.98] disabled:opacity-30 uppercase tracking-[0.3em] text-[11px]">Finalisasi Log</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const MasterItemModal = ({ item, onClose, onSave }: any) => {
    const [formData, setFormData] = useState(item || { id: `REJ-${Date.now()}`, sku: '', name: '', baseUnit: 'Pcs', unit2: '', ratio2: '', op2: 'multiply', unit3: '', ratio3: '', op3: 'multiply', lastUpdated: new Date().toISOString() });
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-gray-900 p-12 rounded-[3.5rem] w-full max-w-xl shadow-2xl border border-white/10 animate-in zoom-in duration-300">
                <div className="flex items-center gap-5 mb-10">
                   <div className="p-4 bg-paper-blue rounded-3xl text-white shadow-xl shadow-blue-500/20"><Settings size={32}/></div>
                   <h3 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Master Barang Reject</h3>
                </div>
                <div className="space-y-8">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">SKU PRODUK</label><input value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} placeholder="SKU" className="w-full p-5 border-2 border-slate-100 dark:border-gray-700 rounded-3xl dark:bg-gray-800 dark:text-white outline-none focus:border-paper-blue font-black shadow-sm" /></div>
                        <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">SATUAN UTAMA</label><input value={formData.baseUnit} onChange={e => setFormData({...formData, baseUnit: e.target.value})} placeholder="KG/Pcs" className="w-full p-5 border-2 border-slate-100 dark:border-gray-700 rounded-3xl dark:bg-gray-800 dark:text-white outline-none focus:border-paper-blue font-black text-center shadow-sm" /></div>
                    </div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">NAMA LENGKAP BARANG</label><input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Nama Barang..." className="w-full p-5 border-2 border-slate-100 dark:border-gray-700 rounded-3xl dark:bg-gray-800 dark:text-white outline-none focus:border-paper-blue font-black text-lg shadow-sm" /></div>
                    <div className="p-8 bg-slate-50 dark:bg-gray-800/50 rounded-[2.5rem] border border-slate-100 dark:border-gray-700 shadow-inner">
                        <p className="text-[11px] font-black text-paper-blue uppercase mb-6 tracking-[0.3em] flex items-center gap-3"><Layers size={14}/> Konversi Satuan Alternatif</p>
                        <div className="grid grid-cols-3 gap-3">
                            <input value={formData.unit2 || ''} onChange={e => setFormData({...formData, unit2: e.target.value})} placeholder="Unit 2" className="p-4 border-2 rounded-2xl dark:bg-gray-700 dark:text-white text-xs font-black shadow-sm" />
                            <input type="number" value={formData.ratio2 || ''} onChange={e => setFormData({...formData, ratio2: Number(e.target.value)})} placeholder="Rasio" className="p-4 border-2 rounded-2xl dark:bg-gray-700 dark:text-white text-xs font-black shadow-sm" />
                            <select value={formData.op2 || 'multiply'} onChange={e => setFormData({...formData, op2: e.target.value})} className="p-4 border-2 rounded-2xl dark:bg-gray-700 dark:text-white text-[10px] font-black appearance-none cursor-pointer shadow-sm">
                                <option value="multiply">KALI (x)</option>
                                <option value="divide">BAGI (/)</option>
                            </select>
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-3">
                            <input value={formData.unit3 || ''} onChange={e => setFormData({...formData, unit3: e.target.value})} placeholder="Unit 3" className="p-4 border-2 rounded-2xl dark:bg-gray-700 dark:text-white text-xs font-black shadow-sm" />
                            <input type="number" value={formData.ratio3 || ''} onChange={e => setFormData({...formData, ratio3: Number(e.target.value)})} placeholder="Rasio" className="p-4 border-2 rounded-2xl dark:bg-gray-700 dark:text-white text-xs font-black shadow-sm" />
                            <select value={formData.op3 || 'multiply'} onChange={e => setFormData({...formData, op3: e.target.value})} className="p-4 border-2 rounded-2xl dark:bg-gray-700 dark:text-white text-[10px] font-black appearance-none cursor-pointer shadow-sm">
                                <option value="multiply">KALI (x)</option>
                                <option value="divide">BAGI (/)</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div className="mt-12 flex justify-end gap-5 pt-10 border-t border-slate-100 dark:border-gray-800">
                    <button onClick={onClose} className="px-8 py-4 text-slate-400 font-black hover:bg-slate-50 rounded-2xl uppercase tracking-widest text-[11px]">Batal</button>
                    <button onClick={() => onSave(formData)} className="px-12 py-4 bg-paper-blue text-white rounded-2xl font-black shadow-2xl shadow-blue-500/30 hover:bg-paper-blueHover transition-all active:scale-[0.98] uppercase tracking-widest text-[11px]">Simpan Master</button>
                </div>
            </div>
        </div>
    );
};
