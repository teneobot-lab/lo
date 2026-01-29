
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { RejectItem, RejectLog, RejectItemDetail } from '../types';
import { Plus, Search, Trash2, Edit2, Save, X, Calendar, FileText, ChevronRight, AlertTriangle, Settings, ChevronDown, Check, Package, AlertCircle, Upload, Copy, FileSpreadsheet, Download, Layers, Table, Clipboard } from 'lucide-react';
import * as XLSX from 'xlsx';

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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredLogs = useMemo(() => rejectLogs.filter(l => l.id.toLowerCase().includes(searchTerm.toLowerCase()) || l.items.some(i => i.itemName.toLowerCase().includes(searchTerm.toLowerCase()))), [rejectLogs, searchTerm]);
  const filteredMaster = useMemo(() => rejectMasterData.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()) || i.sku.toLowerCase().includes(searchTerm.toLowerCase())), [rejectMasterData, searchTerm]);

  // --- Features ---

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
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(ws);
            
            const newItems: RejectItem[] = data.map((row: any) => ({
                id: `REJ-${Math.random().toString(36).substr(2, 9)}`,
                sku: row.SKU || row.sku || '',
                name: row.Nama || row.nama || 'Unnamed',
                baseUnit: row.Satuan_Dasar || row.base_unit || 'Pcs',
                unit2: row.Satuan_2 || row.unit2 || undefined,
                ratio2: row.Rasio_2 || row.ratio2 ? Number(row.Rasio_2 || row.ratio2) : undefined,
                op2: (row.Operasi_2 || row.op2 || 'multiply') as 'multiply' | 'divide',
                unit3: row.Satuan_3 || row.unit3 || undefined,
                ratio3: row.Rasio_3 || row.ratio3 ? Number(row.Rasio_3 || row.ratio3) : undefined,
                op3: (row.Operasi_3 || row.op3 || 'multiply') as 'multiply' | 'divide',
                lastUpdated: new Date().toISOString()
            }));

            // Merge with existing or replace? Let's append/update based on SKU
            const combined = [...rejectMasterData];
            newItems.forEach(ni => {
                const idx = combined.findIndex(ex => ex.sku === ni.sku);
                if (idx >= 0) combined[idx] = { ...combined[idx], ...ni, id: combined[idx].id };
                else combined.push(ni);
            });
            
            onUpdateMaster(combined);
            alert(`Berhasil mengimpor ${newItems.length} data master.`);
        } catch (error) {
            console.error(error);
            alert("Gagal membaca file Excel.");
        }
    };
    reader.readAsBinaryString(file);
    e.target.value = ''; // Reset input
  };

  const copyLogToClipboard = (log: RejectLog) => {
      // Format: ddmmyy
      const d = new Date(log.date);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yy = String(d.getFullYear()).slice(-2);
      const dateStr = `${dd}${mm}${yy}`;

      let text = `Data Reject KKL ${dateStr}\n`;
      
      log.items.forEach(item => {
          // Format: - [Nama Barang] [Qty] [Alasan]
          // Optional: Include unit for clarity, but prompt asked "nama barang qty alasan"
          text += `- ${item.itemName} ${item.quantity} ${item.unit} ${item.reason}\n`;
      });

      navigator.clipboard.writeText(text).then(() => {
          // You might want a toast here, but for now standard alert or rely on UI feedback
          alert("Disalin ke clipboard:\n" + text);
      });
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
               
               {activeTab === 'master' && (
                   <>
                     <button onClick={handleDownloadTemplate} className="p-3 bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300 rounded-xl hover:bg-slate-200" title="Download Template"><Download size={20}/></button>
                     <div className="relative">
                        <input type="file" ref={fileInputRef} onChange={handleBulkImportMaster} accept=".xlsx, .xls" className="hidden" />
                        <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95">
                            <FileSpreadsheet size={18} /> Import Master
                        </button>
                     </div>
                   </>
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
                       <tr><th className="p-6">ID Log</th><th className="p-6">Waktu Kejadian</th><th className="p-6">Item Reject</th><th className="p-6">Status/Keterangan</th><th className="p-6 text-right">Aksi</th></tr>
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
                                       <button onClick={() => onDeleteLog(item.id)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all shadow-sm"><Trash2 size={18}/></button>
                                   </div>
                               </td>
                           </tr>
                       ))
                   ) : (
                       filteredLogs.map(log => (
                           <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors">
                               <td className="p-6 font-black text-paper-blue text-sm uppercase tracking-tighter">{log.id}</td>
                               <td className="p-6 text-sm font-bold text-slate-500 dark:text-gray-400 uppercase tracking-widest">{new Date(log.date).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year: 'numeric'})}</td>
                               <td className="p-6">
                                   <div className="flex flex-col gap-1">
                                       {log.items.slice(0, 3).map((it, idx) => (
                                           <div key={idx} className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-gray-300">
                                               <Package size={14} className="text-rose-500"/> {it.itemName} ({it.quantity} {it.unit}) - {it.reason}
                                           </div>
                                       ))}
                                       {log.items.length > 3 && <span className="text-[10px] text-slate-400 font-bold ml-6">+{log.items.length - 3} LAINNYA</span>}
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
    </div>
  );
};

// Updated RejectLogModal with Item Entry
const RejectLogModal = ({ log, masterData, onClose, onSave }: any) => {
    const [date, setDate] = useState(log ? log.date : new Date().toISOString().slice(0, 10));
    const [notes, setNotes] = useState(log ? log.notes : '');
    const [items, setItems] = useState<RejectItemDetail[]>(log ? log.items : []);

    // Temp inputs
    const [selectedMasterId, setSelectedMasterId] = useState('');
    const [qty, setQty] = useState('');
    const [unit, setUnit] = useState('');
    const [reason, setReason] = useState('');

    const selectedMaster = useMemo(() => masterData.find((m: any) => m.id === selectedMasterId), [selectedMasterId, masterData]);

    const handleAddItem = () => {
        if (!selectedMaster || !qty || !reason) return;
        
        let ratio = 1;
        let op = 'multiply';

        if (unit === selectedMaster.baseUnit) {
            ratio = 1; 
        } else if (unit === selectedMaster.unit2) {
            ratio = selectedMaster.ratio2;
            op = selectedMaster.op2 || 'multiply';
        } else if (unit === selectedMaster.unit3) {
            ratio = selectedMaster.ratio3;
            op = selectedMaster.op3 || 'multiply';
        }

        const numQty = parseFloat(qty);
        let baseQty = numQty;
        if (op === 'multiply') baseQty = numQty * ratio;
        else if (op === 'divide') baseQty = numQty / ratio;

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
        setQty('');
        setReason('');
    };

    const handleSave = () => {
        const newLog: RejectLog = {
            id: log ? log.id : `LOG-${Date.now()}`,
            date,
            items,
            notes,
            timestamp: new Date().toISOString()
        };
        onSave(newLog);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-white/10">
                <div className="p-8 border-b border-slate-50 dark:border-gray-800 flex justify-between items-center bg-rose-50 dark:bg-gray-800">
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-3">
                        <AlertTriangle size={24} className="text-rose-500"/> {log ? 'Perbarui Log Reject' : 'Catat Barang Reject'}
                    </h3>
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
                            <div className="col-span-4">
                                <label className="text-[10px] font-bold text-slate-400 block ml-1 mb-1">Barang</label>
                                <select value={selectedMasterId} onChange={e => { setSelectedMasterId(e.target.value); const m = masterData.find((x:any) => x.id === e.target.value); if(m) setUnit(m.baseUnit); }} className="w-full p-3 rounded-xl border border-slate-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm outline-none">
                                    <option value="">Pilih Produk...</option>
                                    {masterData.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                            </div>
                            <div className="col-span-2">
                                <label className="text-[10px] font-bold text-slate-400 block ml-1 mb-1">Jml (Desimal OK)</label>
                                <input type="number" step="0.001" value={qty} onChange={e => setQty(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm outline-none" placeholder="0.00" />
                            </div>
                            <div className="col-span-2">
                                <label className="text-[10px] font-bold text-slate-400 block ml-1 mb-1">Satuan</label>
                                <select value={unit} onChange={e => setUnit(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm outline-none">
                                    {selectedMaster && (
                                        <>
                                            <option value={selectedMaster.baseUnit}>{selectedMaster.baseUnit}</option>
                                            {selectedMaster.unit2 && <option value={selectedMaster.unit2}>{selectedMaster.unit2}</option>}
                                            {selectedMaster.unit3 && <option value={selectedMaster.unit3}>{selectedMaster.unit3}</option>}
                                        </>
                                    )}
                                </select>
                            </div>
                            <div className="col-span-3">
                                <label className="text-[10px] font-bold text-slate-400 block ml-1 mb-1">Alasan</label>
                                <input value={reason} onChange={e => setReason(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm outline-none" placeholder="Pecah/Basah/dll" />
                            </div>
                            <div className="col-span-1">
                                <button onClick={handleAddItem} disabled={!selectedMasterId} className="w-full p-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl shadow-lg flex items-center justify-center"><Plus size={18}/></button>
                            </div>
                        </div>

                        <div className="mt-4 space-y-2">
                            {items.map((it: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center p-3 bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700">
                                    <div className="text-sm font-bold text-slate-700 dark:text-gray-200">
                                        {it.itemName} <span className="text-rose-500">{it.quantity} {it.unit}</span>
                                        <span className="text-xs text-slate-400 font-normal ml-2">({it.reason})</span>
                                        {it.unit !== it.baseUnit && <span className="text-[10px] text-slate-400 block">Konversi: {it.totalBaseQuantity.toFixed(3)} {it.baseUnit}</span>}
                                    </div>
                                    <button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-rose-500"><Trash2 size={16}/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-8 border-t border-slate-50 dark:border-gray-800 flex justify-end gap-4 bg-slate-50 dark:bg-gray-800">
                    <button onClick={onClose} className="px-8 py-3 text-slate-400 font-black hover:bg-white dark:hover:bg-gray-700 rounded-2xl uppercase tracking-widest">Batal</button>
                    <button onClick={handleSave} className="px-10 py-3 bg-slate-800 dark:bg-gray-700 text-white font-black rounded-2xl shadow-xl hover:bg-slate-900 dark:hover:bg-gray-600 uppercase tracking-widest active:scale-95 transition-all">Simpan Log</button>
                </div>
            </div>
        </div>
    );
}
