
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { RejectItem, RejectLog, RejectItemDetail } from '../types';
import { 
    Plus, Search, Trash2, Edit2, Save, X, Calendar, FileText, 
    ChevronRight, AlertTriangle, Settings, ChevronDown, Check, 
    Package, AlertCircle, Upload, Copy, FileSpreadsheet, 
    Download, Layers, Table, Clipboard, CheckSquare, Square, 
    Share2, Calculator, FileJson
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
  
  // Selection State
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

  const handleDownloadTemplate = () => {
    const template = [
      { SKU: 'REJ-001', Nama: 'Beras Reject', Satuan_Dasar: 'KG', Satuan_2: 'Gram', Rasio_2: 1000, Operasi_2: 'divide', Satuan_3: 'Ton', Rasio_3: 1000, Operasi_3: 'multiply' },
      { SKU: 'REJ-002', Nama: 'Gula Basah', Satuan_Dasar: 'KG', Satuan_2: 'Karung', Rasio_2: 50, Operasi_2: 'multiply', Satuan_3: '', Rasio_3: '', Operasi_3: '' }
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MasterTemplate");
    XLSX.writeFile(wb, "Template_Master_Reject.xlsx");
  };

  const handleBulkImportMaster = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
        try {
            const arrayBuffer = evt.target?.result;
            if (!arrayBuffer) return;
            const wb = XLSX.read(arrayBuffer, { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(ws);
            
            const newItems: RejectItem[] = data.map((row: any) => {
                const op2 = String(row.Operasi_2 || 'multiply').toLowerCase() === 'divide' ? 'divide' : 'multiply';
                const op3 = String(row.Operasi_3 || 'multiply').toLowerCase() === 'divide' ? 'divide' : 'multiply';
                
                return {
                    id: `REJ-${Math.random().toString(36).substr(2, 9)}`,
                    sku: String(row.SKU || row.sku || '').trim(),
                    name: String(row.Nama || row.nama || '').trim(),
                    baseUnit: row.Satuan_Dasar || row.base_unit || 'Pcs',
                    unit2: row.Satuan_2 || undefined,
                    ratio2: row.Rasio_2 ? Number(row.Rasio_2) : undefined,
                    op2: op2 as any,
                    unit3: row.Satuan_3 || undefined,
                    ratio3: row.Rasio_3 ? Number(row.Rasio_3) : undefined,
                    op3: op3 as any,
                    lastUpdated: new Date().toISOString()
                };
            }).filter(i => i.sku && i.name);

            onUpdateMaster(newItems);
            alert(`Berhasil mengimpor ${newItems.length} master barang.`);
        } catch (error) { alert("Format Excel tidak sesuai."); }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const exportFlattenedExcel = () => {
    const targetLogs = rejectLogs.filter(l => selectedLogIds.has(l.id));
    if (targetLogs.length === 0) return alert("Pilih minimal satu log untuk diekspor.");

    // 1. Dapatkan semua tanggal unik dan urutkan
    const uniqueDates = Array.from(new Set(targetLogs.map(l => l.date))).sort();
    
    // 2. Kelompokkan data berdasarkan SKU/Barang
    const matrix: Record<string, { name: string, sku: string, unit: string, values: Record<string, number> }> = {};

    targetLogs.forEach(log => {
        log.items.forEach(item => {
            if (!matrix[item.sku]) {
                matrix[item.sku] = { 
                    name: item.itemName, 
                    sku: item.sku, 
                    unit: item.baseUnit, 
                    values: {} 
                };
            }
            const currentVal = matrix[item.sku].values[log.date] || 0;
            matrix[item.sku].values[log.date] = currentVal + item.totalBaseQuantity;
        });
    });

    // 3. Konversi ke format Flat untuk SheetJS
    const exportData = Object.values(matrix).map(row => {
        const rowData: any = {
            'SKU': row.sku,
            'Nama Barang': row.name,
            'Satuan': row.unit
        };

        let totalRow = 0;
        uniqueDates.forEach(date => {
            const val = row.values[date] || 0;
            rowData[date] = val;
            totalRow += val;
        });

        rowData['TOTAL AKHIR'] = totalRow;
        return rowData;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reject_Flattened");
    XLSX.writeFile(wb, `Report_Reject_Flattened_${new Date().toISOString().slice(0,10)}.xlsx`);
    
    alert("Export Berhasil! Data diatur secara horizontal berdasarkan tanggal.");
  };

  const copyLogToClipboard = (log: RejectLog) => {
      const d = new Date(log.date);
      const dateStr = d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '');
      let text = `Data Reject KKL ${dateStr}\n`;
      log.items.forEach(item => {
          text += `- ${item.itemName} ${item.quantity} ${item.unit} ${item.reason}\n`;
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
               
               {activeTab === 'master' ? (
                   <>
                     <button onClick={handleDownloadTemplate} className="p-3 bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300 rounded-xl hover:bg-slate-200" title="Download Template"><Download size={20}/></button>
                     <div className="relative">
                        <input type="file" ref={fileInputRef} onChange={handleBulkImportMaster} accept=".xlsx, .xls" className="hidden" />
                        <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95">
                            <FileSpreadsheet size={18} /> Import Master
                        </button>
                     </div>
                   </>
               ) : (
                   selectedLogIds.size > 0 && (
                       <button onClick={exportFlattenedExcel} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg animate-in zoom-in duration-200">
                           <Share2 size={18} /> Export Flattened ({selectedLogIds.size})
                       </button>
                   )
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
                           <th className="p-6 w-12 text-center">
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
                               <td className="p-6 text-center">
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
                                               <Package size={14} className="text-rose-500"/> {it.itemName} ({it.quantity} {it.unit}) - {it.reason}
                                           </div>
                                       ))}
                                   </div>
                               </td>
                               <td className="p-6 text-xs font-bold text-slate-400 italic uppercase tracking-tighter truncate max-w-xs">{log.notes || 'Reguler Reject'}</td>
                               <td className="p-6 text-right">
                                   <div className="flex justify-end gap-2">
                                       <button onClick={() => copyLogToClipboard(log)} className="p-2 text-emerald-500 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all shadow-sm" title="Copy for WA"><Clipboard size={18}/></button>
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
    
    const [qty, setQty] = useState('');
    const [unit, setUnit] = useState('');
    const [reason, setReason] = useState('');
    
    const itemSearchRef = useRef<HTMLDivElement>(null);
    const qtyInputRef = useRef<HTMLInputElement>(null);

    const selectedMaster = useMemo(() => masterData.find((m: any) => m.id === selectedMasterId), [selectedMasterId, masterData]);

    const filteredMasters = useMemo(() => {
        if (!itemSearch || selectedMasterId) return [];
        const query = itemSearch.toLowerCase();
        return masterData.filter((m: any) => 
            m.name.toLowerCase().includes(query) || 
            m.sku.toLowerCase().includes(query)
        ).slice(0, 8);
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
        setUnit(m.baseUnit);
        setShowItemDropdown(false);
        // Focus Qty after selection
        setTimeout(() => qtyInputRef.current?.focus(), 50);
    };

    const handleAddItem = () => {
        if (!selectedMaster || !qty || !reason) return;
        let ratio = 1;
        let op = 'multiply';
        if (unit === selectedMaster.baseUnit) ratio = 1; 
        else if (unit === selectedMaster.unit2) { ratio = selectedMaster.ratio2; op = selectedMaster.op2 || 'multiply'; }
        else if (unit === selectedMaster.unit3) { ratio = selectedMaster.ratio3; op = selectedMaster.op3 || 'multiply'; }
        
        const numQty = parseFloat(qty);
        // LOGIC: If input is sub-unit (e.g. PRS) and ratio is 10, then KG = input / 10
        let baseQty = op === 'multiply' ? numQty * ratio : numQty / ratio;
        
        const newItem: RejectItemDetail = { 
            itemId: selectedMaster.id, 
            itemName: selectedMaster.name, 
            sku: selectedMaster.sku, 
            baseUnit: selectedMaster.baseUnit, 
            quantity: numQty, 
            unit: unit, 
            ratio: ratio, 
            operation: op as any, 
            totalBaseQuantity: baseQty, 
            reason: reason 
        };
        
        setItems([...items, newItem]);
        // Reset Item Fields
        setItemSearch('');
        setSelectedMasterId('');
        setQty('');
        setReason('');
    };

    const handleSave = () => {
        onSave({ id: log ? log.id : `LOG-${Date.now()}`, date, items, notes, timestamp: new Date().toISOString() });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-white/10">
                <div className="p-8 border-b border-slate-50 dark:border-gray-800 flex justify-between items-center bg-rose-50 dark:bg-gray-800">
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-3"><AlertTriangle size={24} className="text-rose-500"/> {log ? 'Perbarui Log Reject' : 'Catat Barang Reject'}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-full transition-all"><X size={24} className="text-slate-400"/></button>
                </div>
                <div className="p-8 overflow-y-auto flex-1 space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-2">Waktu Kejadian</label><input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-gray-800 border-2 border-transparent focus:border-rose-400 rounded-2xl outline-none dark:text-white dark:[color-scheme:dark]" /></div>
                        <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-2">Catatan Umum</label><input value={notes} onChange={e => setNotes(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-gray-800 border-2 border-transparent focus:border-rose-400 rounded-2xl outline-none dark:text-white" placeholder="Keterangan..." /></div>
                    </div>
                    
                    <div className="bg-slate-50 dark:bg-gray-800/50 p-6 rounded-3xl border border-slate-100 dark:border-gray-700">
                        <label className="text-[10px] font-bold text-rose-500 uppercase tracking-widest block ml-2 mb-4">Input Barang Reject</label>
                        <div className="grid grid-cols-12 gap-4 items-end">
                            {/* Autocomplete Item Field */}
                            <div className="col-span-4 relative" ref={itemSearchRef}>
                                <label className="text-[10px] font-bold text-slate-400 block ml-1 mb-1">Cari Barang (Nama/SKU)</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14}/>
                                    <input 
                                        type="text" 
                                        value={itemSearch} 
                                        onChange={e => {
                                            setItemSearch(e.target.value);
                                            setSelectedMasterId('');
                                            setShowItemDropdown(true);
                                        }}
                                        onFocus={() => setShowItemDropdown(true)}
                                        className={`w-full pl-9 pr-3 py-3 rounded-xl border-2 transition-all outline-none text-sm font-bold ${selectedMasterId ? 'border-paper-blue bg-blue-50/30 dark:bg-blue-900/10 text-paper-blue' : 'border-slate-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-rose-300'}`}
                                        placeholder="Ketik nama produk..."
                                    />
                                    {selectedMasterId && (
                                        <button onClick={() => { setItemSearch(''); setSelectedMasterId(''); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-rose-500"><X size={12}/></button>
                                    )}
                                </div>
                                
                                {showItemDropdown && filteredMasters.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-slate-100 dark:border-gray-700 z-[110] max-h-56 overflow-y-auto">
                                        {filteredMasters.map(m => (
                                            <div 
                                                key={m.id} 
                                                onClick={() => handleSelectItem(m)}
                                                className="p-3 hover:bg-slate-50 dark:hover:bg-gray-700 cursor-pointer border-b last:border-0 border-slate-50 dark:border-gray-700 flex justify-between items-center group"
                                            >
                                                <div>
                                                    <div className="text-sm font-bold text-slate-800 dark:text-gray-200 group-hover:text-paper-blue">{m.name}</div>
                                                    <div className="text-[10px] font-mono text-slate-400 tracking-widest">{m.sku}</div>
                                                </div>
                                                <ChevronRight size={14} className="text-slate-200 group-hover:text-paper-blue"/>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="col-span-2">
                                <label className="text-[10px] font-bold text-slate-400 block ml-1 mb-1">Jml</label>
                                <input 
                                    ref={qtyInputRef}
                                    type="number" 
                                    step="0.001" 
                                    value={qty} 
                                    onChange={e => setQty(e.target.value)} 
                                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm outline-none focus:border-rose-300 font-bold text-center" 
                                    placeholder="0.00" 
                                />
                            </div>

                            <div className="col-span-2">
                                <label className="text-[10px] font-bold text-slate-400 block ml-1 mb-1">Satuan</label>
                                <select value={unit} onChange={e => setUnit(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm outline-none appearance-none cursor-pointer">
                                    {selectedMaster ? (
                                        <>
                                            <option value={selectedMaster.baseUnit}>{selectedMaster.baseUnit} (Dasar)</option>
                                            {selectedMaster.unit2 && <option value={selectedMaster.unit2}>{selectedMaster.unit2}</option>}
                                            {selectedMaster.unit3 && <option value={selectedMaster.unit3}>{selectedMaster.unit3}</option>}
                                        </>
                                    ) : <option value="">-</option>}
                                </select>
                            </div>

                            <div className="col-span-3">
                                <label className="text-[10px] font-bold text-slate-400 block ml-1 mb-1">Alasan</label>
                                <input value={reason} onChange={e => setReason(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm outline-none focus:border-rose-300" placeholder="Pecah/Basah/dll" />
                            </div>

                            <div className="col-span-1">
                                <button 
                                    onClick={handleAddItem} 
                                    disabled={!selectedMasterId || !qty || !reason}
                                    className="w-full h-[46px] bg-rose-500 hover:bg-rose-600 text-white rounded-xl shadow-lg flex items-center justify-center transition-all active:scale-95 disabled:opacity-50"
                                >
                                    <Plus size={20}/>
                                </button>
                            </div>
                        </div>

                        {/* Conversion Preview */}
                        {selectedMaster && qty && (
                            <div className="mt-3 ml-1 flex items-center gap-2 text-[10px] font-bold text-rose-400 uppercase tracking-widest animate-in fade-in slide-in-from-left-2">
                                <Calculator size={12}/> Estimasi Stok Berkurang: {(() => {
                                    let ratio = 1;
                                    let op = 'multiply';
                                    if (unit === selectedMaster.baseUnit) ratio = 1; 
                                    else if (unit === selectedMaster.unit2) { ratio = selectedMaster.ratio2; op = selectedMaster.op2 || 'multiply'; }
                                    else if (unit === selectedMaster.unit3) { ratio = selectedMaster.ratio3; op = selectedMaster.op3 || 'multiply'; }
                                    const val = op === 'multiply' ? parseFloat(qty) * ratio : parseFloat(qty) / ratio;
                                    return `${val.toFixed(3)} ${selectedMaster.baseUnit}`;
                                })()}
                            </div>
                        )}

                        <div className="mt-6 space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                            {items.map((it: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center p-4 bg-white dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-700 shadow-sm animate-in slide-in-from-bottom-2">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-rose-50 dark:bg-rose-900/20 rounded-xl flex items-center justify-center text-rose-500 font-black text-xs uppercase">{it.unit.charAt(0)}</div>
                                        <div>
                                            <div className="text-sm font-black text-slate-800 dark:text-gray-200 uppercase tracking-tight">{it.itemName} <span className="text-rose-500 ml-1">{it.quantity} {it.unit}</span></div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                Alasan: <span className="text-slate-500 dark:text-gray-400">{it.reason}</span>
                                                {it.unit !== it.baseUnit && <span className="text-paper-blue">• Konversi: {it.totalBaseQuantity.toFixed(3)} {it.baseUnit}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="p-2 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={16}/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="p-8 border-t border-slate-50 dark:border-gray-800 flex justify-end gap-4 bg-slate-50 dark:bg-gray-800">
                    <button onClick={onClose} className="px-8 py-3 text-slate-400 font-black hover:bg-white dark:hover:bg-gray-700 rounded-2xl uppercase tracking-widest text-xs">Batal</button>
                    <button onClick={handleSave} disabled={items.length === 0} className="px-10 py-3 bg-slate-800 dark:bg-gray-700 text-white font-black rounded-2xl shadow-xl hover:bg-slate-900 dark:hover:bg-gray-600 uppercase tracking-widest text-xs active:scale-95 transition-all disabled:opacity-50">Simpan Log</button>
                </div>
            </div>
        </div>
    );
}

const MasterItemModal = ({ item, onClose, onSave }: any) => {
    const [formData, setFormData] = useState(item || { id: `REJ-${Date.now()}`, sku: '', name: '', baseUnit: 'Pcs', unit2: '', ratio2: '', op2: 'multiply', unit3: '', ratio3: '', op3: 'multiply', lastUpdated: new Date().toISOString() });
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-gray-900 p-10 rounded-[2.5rem] w-full max-w-lg shadow-2xl border border-white/10 animate-in zoom-in duration-300">
                <h3 className="text-2xl font-black mb-8 text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-3"><Settings className="text-paper-blue"/> Master Barang Reject</h3>
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase ml-2">SKU</label><input value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} placeholder="SKU" className="w-full p-4 border-2 border-slate-100 rounded-2xl dark:bg-gray-800 dark:text-white outline-none focus:border-paper-blue font-bold" /></div>
                        <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Satuan Dasar</label><input value={formData.baseUnit} onChange={e => setFormData({...formData, baseUnit: e.target.value})} placeholder="KG/Pcs" className="w-full p-4 border-2 border-slate-100 rounded-2xl dark:bg-gray-800 dark:text-white outline-none focus:border-paper-blue font-bold text-center" /></div>
                    </div>
                    <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Nama Barang</label><input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Nama Lengkap" className="w-full p-4 border-2 border-slate-100 rounded-2xl dark:bg-gray-800 dark:text-white outline-none focus:border-paper-blue font-black" /></div>
                    
                    <div className="p-6 bg-slate-50 dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-700">
                        <p className="text-[10px] font-bold text-paper-blue uppercase mb-4 tracking-widest flex items-center gap-2"><Layers size={12}/> Konversi Satuan Alternatif</p>
                        <div className="grid grid-cols-3 gap-2">
                            <input value={formData.unit2 || ''} onChange={e => setFormData({...formData, unit2: e.target.value})} placeholder="Unit 2" className="p-3 border rounded-xl dark:bg-gray-700 dark:text-white text-xs font-bold" />
                            <input type="number" value={formData.ratio2 || ''} onChange={e => setFormData({...formData, ratio2: Number(e.target.value)})} placeholder="Rasio" className="p-3 border rounded-xl dark:bg-gray-700 dark:text-white text-xs font-bold" />
                            <select value={formData.op2 || 'multiply'} onChange={e => setFormData({...formData, op2: e.target.value})} className="p-3 border rounded-xl dark:bg-gray-700 dark:text-white text-xs font-bold appearance-none cursor-pointer">
                                <option value="multiply">Kali (x)</option>
                                <option value="divide">Bagi (/)</option>
                            </select>
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-2">
                            <input value={formData.unit3 || ''} onChange={e => setFormData({...formData, unit3: e.target.value})} placeholder="Unit 3" className="p-3 border rounded-xl dark:bg-gray-700 dark:text-white text-xs font-bold" />
                            <input type="number" value={formData.ratio3 || ''} onChange={e => setFormData({...formData, ratio3: Number(e.target.value)})} placeholder="Rasio" className="p-3 border rounded-xl dark:bg-gray-700 dark:text-white text-xs font-bold" />
                            <select value={formData.op3 || 'multiply'} onChange={e => setFormData({...formData, op3: e.target.value})} className="p-3 border rounded-xl dark:bg-gray-700 dark:text-white text-xs font-bold appearance-none cursor-pointer">
                                <option value="multiply">Kali (x)</option>
                                <option value="divide">Bagi (/)</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div className="mt-10 flex justify-end gap-4 border-t pt-8">
                    <button onClick={onClose} className="px-8 py-3 text-slate-400 font-bold hover:bg-slate-50 rounded-2xl uppercase tracking-widest text-xs">Batal</button>
                    <button onClick={() => onSave(formData)} className="px-10 py-3 bg-paper-blue text-white rounded-2xl font-black shadow-xl hover:bg-paper-blueHover transition-all active:scale-95 uppercase tracking-widest text-xs">Simpan Master</button>
                </div>
            </div>
        </div>
    );
};
