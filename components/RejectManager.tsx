import React, { useState, useMemo, useRef, useEffect } from 'react';
import { RejectItem, RejectLog, RejectItemDetail } from '../types';
import { Plus, Search, Trash2, Edit2, Save, X, Calendar, FileText, ChevronRight, AlertTriangle, Settings, ChevronDown, Check, Package, AlertCircle, Upload, Copy, FileSpreadsheet, Download, Layers } from 'lucide-react';
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

  // Helper untuk format tanggal MySQL (YYYY-MM-DD HH:mm:ss)
  const formatMySQLDateTime = (date: Date) => {
      return date.toISOString().slice(0, 19).replace('T', ' ');
  };

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
      if (window.confirm("Hapus item ini dari Master Data?")) {
          onUpdateMaster(rejectMasterData.filter(i => i.id !== id));
      }
  };

  const downloadTemplate = () => {
      const template = [
          { 
            SKU: 'SKU-001', 
            Name: 'Nama Barang Contoh', 
            Unit: 'Pcs', 
            Unit2: 'Box', 
            Ratio2: 10, 
            Op2: 'multiply', 
            Unit3: 'Ctn', 
            Ratio3: 100, 
            Op3: 'multiply' 
          },
          { 
            SKU: 'SKU-002', 
            Name: 'Barang Cair', 
            Unit: 'Ml', 
            Unit2: 'Liter', 
            Ratio2: 1000, 
            Op2: 'divide', 
            Unit3: '', 
            Ratio3: '', 
            Op3: '' 
          }
      ];
      const ws = XLSX.utils.json_to_sheet(template);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Template Master Reject");
      XLSX.writeFile(wb, "Nexus_Template_Master_Reject.xlsx");
  };

  const handleBulkImport = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
          try {
              const bstr = evt.target?.result;
              const wb = XLSX.read(bstr, { type: 'binary' });
              const wsname = wb.SheetNames[0];
              const ws = wb.Sheets[wsname];
              const data = XLSX.utils.sheet_to_json(ws) as any[];

              const updatedMaster = [...rejectMasterData];
              const nowFormatted = formatMySQLDateTime(new Date());

              data.forEach(row => {
                  const sku = String(row.SKU || '').trim();
                  if (!sku) return;

                  const existingIdx = updatedMaster.findIndex(m => m.sku === sku);
                  
                  const item: RejectItem = {
                      id: existingIdx >= 0 ? updatedMaster[existingIdx].id : crypto.randomUUID(),
                      sku: sku,
                      name: String(row.Name || row.Nama || row.name || 'Unnamed'),
                      baseUnit: String(row.Unit || row.Satuan || row.unit || 'Pcs'),
                      unit2: row.Unit2 || row.unit2 || null,
                      ratio2: (row.Ratio2 || row.ratio2) ? Number(row.Ratio2 || row.ratio2) : null,
                      op2: (row.Op2 || row.op2) === 'divide' ? 'divide' : 'multiply',
                      unit3: row.Unit3 || row.unit3 || null,
                      ratio3: (row.Ratio3 || row.ratio3) ? Number(row.Ratio3 || row.ratio3) : null,
                      op3: (row.Op3 || row.op3) === 'divide' ? 'divide' : 'multiply',
                      lastUpdated: nowFormatted
                  };

                  if (existingIdx >= 0) {
                      updatedMaster[existingIdx] = item;
                  } else {
                      updatedMaster.push(item);
                  }
              });

              onUpdateMaster(updatedMaster);
              alert(`Berhasil memproses ${data.length} item dari Excel.`);
          } catch (error) {
              console.error(error);
              alert("Gagal import Excel. Pastikan format kolom benar.");
          }
      };
      reader.readAsBinaryString(file);
      e.target.value = ''; 
  };

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
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-soft border border-ice-100 dark:border-gray-700">
           <div className="flex items-center gap-2 p-1 bg-ice-50 dark:bg-gray-900 rounded-xl">
               <button onClick={() => setActiveTab('logs')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'logs' ? 'bg-white dark:bg-gray-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-gray-400'}`}>Log Reject</button>
               <button onClick={() => setActiveTab('master')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'master' ? 'bg-white dark:bg-gray-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-gray-400'}`}>Master Data Reject</button>
           </div>
           
           <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
               <div className="relative flex-1 md:w-64 min-w-[200px]">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                   <input type="text" placeholder="Cari SKU, Nama, atau ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-ice-50 dark:bg-gray-900 border border-ice-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ice-300 dark:text-white" />
               </div>
               
               {activeTab === 'master' && (
                  <div className="flex items-center gap-2">
                      <button onClick={downloadTemplate} className="p-2.5 bg-ice-100 dark:bg-gray-700 text-ice-600 dark:text-ice-400 rounded-xl hover:bg-ice-200 transition-all border border-ice-200 dark:border-gray-600" title="Download Template Master"><Download size={18} /></button>
                      <div className="relative">
                          <button className="flex items-center gap-2 bg-white dark:bg-gray-800 text-slate-600 dark:text-white border border-ice-200 dark:border-gray-700 hover:bg-ice-50 dark:hover:bg-gray-700 px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm whitespace-nowrap"><FileSpreadsheet size={18} /> Import Excel</button>
                          <input type="file" accept=".xlsx, .xls" onChange={handleBulkImport} className="absolute inset-0 opacity-0 cursor-pointer" />
                      </div>
                  </div>
               )}

               <button onClick={() => { if (activeTab === 'logs') { setEditingLog(null); setIsLogModalOpen(true); } else { setEditingMasterItem(null); setIsMasterModalOpen(true); } }} className="flex items-center gap-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg whitespace-nowrap transition-all active:scale-95"><Plus size={18} /> {activeTab === 'logs' ? 'Input Reject Baru' : 'Tambah Master Item'}</button>
           </div>
       </div>

       <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
           {activeTab === 'master' && <MasterDataList items={rejectMasterData.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()) || i.sku.toLowerCase().includes(searchTerm.toLowerCase()))} onEdit={(i) => { setEditingMasterItem(i); setIsMasterModalOpen(true); }} onDelete={handleDeleteMasterItem} />}
           {activeTab === 'logs' && <RejectLogsList logs={rejectLogs.filter(l => l.id.toLowerCase().includes(searchTerm.toLowerCase()) || l.items.some(i => i.itemName.toLowerCase().includes(searchTerm.toLowerCase())))} onEdit={(l) => { setEditingLog(l); setIsLogModalOpen(true); }} onDelete={onDeleteLog} />}
       </div>

       {isMasterModalOpen && <MasterItemModal item={editingMasterItem} onClose={() => setIsMasterModalOpen(false)} onSave={handleSaveMasterItem} />}
       {isLogModalOpen && <RejectLogModal log={editingLog} masterData={rejectMasterData} onClose={() => setIsLogModalOpen(false)} onSave={handleSaveLog} />}
    </div>
  );
};

const MasterDataList: React.FC<{ items: RejectItem[], onEdit: (i: RejectItem) => void, onDelete: (id: string) => void }> = ({ items, onEdit, onDelete }) => (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-soft border border-ice-100 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-gray-800 border-b border-ice-100 dark:border-gray-700 text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                <tr><th className="p-4">SKU / Nama Barang</th><th className="p-4">Satuan Dasar</th><th className="p-4">Konversi Satuan</th><th className="p-4 text-right">Aksi</th></tr>
            </thead>
            <tbody className="divide-y divide-ice-50 dark:divide-gray-700">
                {items.length > 0 ? items.map(item => (
                    <tr key={item.id} className="hover:bg-ice-50/50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="p-4"><div className="font-bold text-sm text-slate-800 dark:text-white">{item.name}</div><div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">{item.sku}</div></td>
                        <td className="p-4"><span className="px-2 py-1 bg-ice-50 dark:bg-gray-700 text-ice-600 dark:text-ice-400 rounded-lg text-xs font-bold">{item.baseUnit}</span></td>
                        <td className="p-4 text-xs text-slate-500 dark:text-gray-400">
                            <div className="flex flex-col gap-1">
                                {item.unit2 && <div className="flex items-center gap-1"><span className="font-bold bg-slate-100 dark:bg-gray-700 px-1.5 rounded">{item.unit2}</span> <ChevronRight size={10}/> {item.op2 === 'divide' ? '/' : 'x'} {item.ratio2} {item.baseUnit}</div>}
                                {item.unit3 && <div className="flex items-center gap-1"><span className="font-bold bg-slate-100 dark:bg-gray-700 px-1.5 rounded">{item.unit3}</span> <ChevronRight size={10}/> {item.op3 === 'divide' ? '/' : 'x'} {item.ratio3} {item.baseUnit}</div>}
                                {!item.unit2 && !item.unit3 && <span className="italic opacity-50">Tidak ada konversi</span>}
                            </div>
                        </td>
                        <td className="p-4 text-right">
                            <div className="flex justify-end gap-1">
                                <button onClick={() => onEdit(item)} className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors"><Edit2 size={16}/></button>
                                <button onClick={() => onDelete(item.id)} className="p-2 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"><Trash2 size={16}/></button>
                            </div>
                        </td>
                    </tr>
                )) : <tr><td colSpan={4} className="p-12 text-center text-slate-400 italic">Data Master Belum Tersedia. Silakan tambah atau import Excel.</td></tr>}
            </tbody>
        </table>
    </div>
);

const RejectLogsList: React.FC<{ logs: RejectLog[], onEdit: (l: RejectLog) => void, onDelete: (id: string) => void }> = ({ logs, onEdit, onDelete }) => (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-soft border border-ice-100 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-gray-800 border-b border-ice-100 dark:border-gray-700 text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                <tr><th className="p-4">ID Log</th><th className="p-4">Tanggal Reject</th><th className="p-4">Ringkasan Barang</th><th className="p-4">Keterangan</th><th className="p-4 text-right">Aksi</th></tr>
            </thead>
            <tbody className="divide-y divide-ice-50 dark:divide-gray-700">
                {logs.length > 0 ? logs.map(log => (
                    <tr key={log.id} className="hover:bg-ice-50/50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="p-4 font-bold text-sm text-slate-800 dark:text-white">{log.id}</td>
                        <td className="p-4 text-sm text-slate-600 dark:text-gray-300">{new Date(log.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</td>
                        <td className="p-4 text-sm"><div className="flex flex-col gap-1">{log.items.slice(0, 2).map((item, idx) => (<span key={idx} className="text-slate-600 dark:text-gray-400 flex items-center gap-1 text-[11px]"><Package size={12} className="text-rose-400"/> {item.itemName} ({item.quantity} {item.unit})</span>))}{log.items.length > 2 && <span className="text-[10px] text-slate-400 pl-4">+{log.items.length - 2} item lainnya...</span>}</div></td>
                        <td className="p-4 text-sm text-slate-500 italic truncate max-w-xs">{log.notes || '-'}</td>
                        <td className="p-4 text-right">
                            <div className="flex justify-end gap-1">
                                <button onClick={() => onEdit(log)} className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors"><Settings size={16}/></button>
                                <button onClick={() => onDelete(log.id)} className="p-2 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"><Trash2 size={16}/></button>
                            </div>
                        </td>
                    </tr>
                )) : <tr><td colSpan={5} className="p-12 text-center text-slate-400 italic">Belum ada catatan reject. Klik tombol di atas untuk menginput.</td></tr>}
            </tbody>
        </table>
    </div>
);

// --- Modals ---

const MasterItemModal: React.FC<{ item: RejectItem | null, onClose: () => void, onSave: (i: RejectItem) => void }> = ({ item, onClose, onSave }) => {
    const [formData, setFormData] = useState<Partial<RejectItem>>(item || { sku: '', name: '', baseUnit: 'Pcs', op2: 'multiply', op3: 'multiply' });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            id: item?.id || crypto.randomUUID(),
            lastUpdated: new Date().toISOString().slice(0, 19).replace('T', ' '),
            sku: formData.sku!,
            name: formData.name!,
            baseUnit: formData.baseUnit!,
            unit2: formData.unit2 || null,
            ratio2: formData.ratio2 ? Number(formData.ratio2) : null,
            op2: formData.op2,
            unit3: formData.unit3 || null,
            ratio3: formData.ratio3 ? Number(formData.ratio3) : null,
            op3: formData.op3
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in zoom-in duration-200">
            <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-white/10">
                <div className="p-6 border-b border-ice-100 dark:border-gray-800 flex justify-between items-center bg-indigo-50 dark:bg-gray-800"><h3 className="font-bold text-xl text-slate-800 dark:text-white flex items-center gap-2"><Settings size={20}/> {item ? 'Edit Master Item' : 'Tambah Master Item'}</h3><button onClick={onClose} className="p-2 hover:bg-white rounded-full"><X className="text-slate-400" /></button></div>
                <form id="master-form" onSubmit={handleSubmit} className="p-8 overflow-y-auto flex-1 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">SKU Produk</label><input required value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value.toUpperCase()})} className="w-full p-3 border rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-300 transition-all" placeholder="Misal: ELEC-001" /></div><div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nama Barang</label><input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 border rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-300 transition-all" placeholder="Nama lengkap produk..." /></div></div>
                    <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Satuan Dasar (Inventory)</label><input required value={formData.baseUnit} onChange={e => setFormData({...formData, baseUnit: e.target.value})} className="w-full p-3 border rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-300 transition-all" placeholder="Contoh: Pcs, Kg, Meter" /></div>
                    <div className="p-6 bg-slate-50 dark:bg-gray-800 rounded-2xl space-y-6 border border-ice-100 dark:border-gray-700">
                        <h4 className="font-bold text-xs text-slate-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2"><Layers size={14}/> Pengaturan Konversi Satuan</h4>
                        <div className="space-y-3"><div className="flex flex-col md:flex-row gap-3"><div className="flex-1"><label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Satuan 2</label><input placeholder="Misal: Box" value={formData.unit2 || ''} onChange={e => setFormData({...formData, unit2: e.target.value})} className="w-full p-3 border rounded-xl text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" /></div><div className="w-full md:w-32"><label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Rasio</label><input type="number" step="any" placeholder="Isi" value={formData.ratio2 || ''} onChange={e => setFormData({...formData, ratio2: Number(e.target.value)})} className="w-full p-3 border rounded-xl text-sm font-bold dark:bg-gray-700 dark:border-gray-600 dark:text-white" /></div><div className="w-full md:w-40"><label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Operasi</label><select value={formData.op2} onChange={(e: any) => setFormData({...formData, op2: e.target.value})} className="w-full p-3 border rounded-xl text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white appearance-none"><option value="multiply">Kali (x)</option><option value="divide">Bagi (/)</option></select></div></div></div>
                        <div className="h-px bg-slate-200 dark:bg-gray-700"></div>
                        <div className="space-y-3"><div className="flex flex-col md:flex-row gap-3"><div className="flex-1"><label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Satuan 3</label><input placeholder="Misal: Ctn" value={formData.unit3 || ''} onChange={e => setFormData({...formData, unit3: e.target.value})} className="w-full p-3 border rounded-xl text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" /></div><div className="w-full md:w-32"><label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Rasio</label><input type="number" step="any" placeholder="Isi" value={formData.ratio3 || ''} onChange={e => setFormData({...formData, ratio3: Number(e.target.value)})} className="w-full p-3 border rounded-xl text-sm font-bold dark:bg-gray-700 dark:border-gray-600 dark:text-white" /></div><div className="w-full md:w-40"><label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Operasi</label><select value={formData.op3} onChange={(e: any) => setFormData({...formData, op3: e.target.value})} className="w-full p-3 border rounded-xl text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white appearance-none"><option value="multiply">Kali (x)</option><option value="divide">Bagi (/)</option></select></div></div></div>
                    </div>
                </form>
                <div className="p-6 border-t border-ice-100 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 flex justify-end gap-3"><button type="button" onClick={onClose} className="px-6 py-3 text-slate-500 font-bold hover:bg-white rounded-xl transition-all">Batal</button><button type="submit" form="master-form" className="px-10 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 shadow-lg transition-all active:scale-95">Simpan Data</button></div>
            </div>
        </div>
    );
};

const RejectLogModal: React.FC<{ log: RejectLog | null, masterData: RejectItem[], onClose: () => void, onSave: (l: RejectLog) => void }> = ({ log, masterData, onClose, onSave }) => {
    const [date, setDate] = useState(log?.date || new Date().toISOString().slice(0, 10));
    const [notes, setNotes] = useState(log?.notes || '');
    const [items, setItems] = useState<RejectItemDetail[]>(log?.items || []);
    const [itemSearch, setItemSearch] = useState(''); 
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedItemId, setSelectedItemId] = useState('');
    const [selectedUnit, setSelectedUnit] = useState('');
    const [quantityInput, setQuantityInput] = useState<number | ''>('');
    const [reason, setReason] = useState('');
    const [conversionRatio, setConversionRatio] = useState(1);
    const [conversionOp, setConversionOp] = useState<'multiply'|'divide'>('multiply');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const qtyInputRef = useRef<HTMLInputElement>(null);

    const filteredMaster = useMemo(() => { if (!itemSearch) return []; return masterData.filter(m => m.name.toLowerCase().includes(itemSearch.toLowerCase()) || m.sku.toLowerCase().includes(itemSearch.toLowerCase())).slice(0, 10); }, [itemSearch, masterData]);
    const selectedItem = useMemo(() => masterData.find(i => i.id === selectedItemId) || null, [selectedItemId, masterData]);

    useEffect(() => { const handleClickOutside = (event: MouseEvent) => { if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) { setShowDropdown(false); } }; document.addEventListener('mousedown', handleClickOutside); return () => document.removeEventListener('mousedown', handleClickOutside); }, []);

    const handleSelectItem = (item: RejectItem) => { setSelectedItemId(item.id); setItemSearch(item.name); setShowDropdown(false); handleUnitChange(item.baseUnit, item); setSelectedUnit(item.baseUnit); setTimeout(() => qtyInputRef.current?.focus(), 100); };
    const handleUnitChange = (unitName: string, itemOverride?: RejectItem) => { const item = itemOverride || selectedItem; setSelectedUnit(unitName); if (!item) return; if (item.baseUnit === unitName) { setConversionRatio(1); setConversionOp('divide'); } else if (item.unit2 === unitName) { setConversionRatio(item.ratio2 || 1); setConversionOp(item.op2 || 'divide'); } else if (item.unit3 === unitName) { setConversionRatio(item.ratio3 || 1); setConversionOp(item.op3 || 'divide'); } };
    const calculateBaseQuantity = (qty: number, ratio: number, op: 'multiply' | 'divide') => { if (!ratio || ratio === 0) return 0; let result = 0; if (op === 'multiply') result = qty * ratio; else result = qty / ratio; return parseFloat(result.toFixed(1)); };

    const handleAddItem = () => { if (!selectedItem || !quantityInput || quantityInput <= 0) return; const baseQty = calculateBaseQuantity(Number(quantityInput), conversionRatio, conversionOp); const newItem: RejectItemDetail = { itemId: selectedItem.id, itemName: selectedItem.name, sku: selectedItem.sku, baseUnit: selectedItem.baseUnit, quantity: Number(quantityInput), unit: selectedUnit, ratio: conversionRatio, operation: conversionOp, totalBaseQuantity: baseQty, reason: reason, unit2: selectedItem.unit2, ratio2: selectedItem.ratio2, op2: selectedItem.op2, unit3: selectedItem.unit3, ratio3: selectedItem.ratio3, op3: selectedItem.op3 }; setItems([...items, newItem]); setQuantityInput(''); setReason(''); setItemSearch(''); setSelectedItemId(''); setSelectedUnit(''); };
    const handleRemoveItem = (idx: number) => { setItems(items.filter((_, i) => i !== idx)); };
    
    const handleSave = () => { 
        const now = new Date();
        // MySQL DATETIME: YYYY-MM-DD HH:mm:ss
        const mysqlTimestamp = now.toISOString().slice(0, 19).replace('T', ' ');
        
        onSave({ 
            id: log?.id || `RJ-${Date.now()}`, 
            date, 
            items, 
            notes, 
            timestamp: mysqlTimestamp 
        }); 
    };

    const handleCopyToClipboard = () => { 
        try { 
            // Format ddmmyy dari date (YYYY-MM-DD)
            const [y, m, d] = date.split('-');
            const ddmmyy = `${d}${m}${y.slice(2)}`;
            
            let text = `Data Reject KKL ${ddmmyy}\n`; 
            items.forEach(item => { 
                text += `• ${item.itemName} - ${item.quantity} ${item.unit} (${item.reason || 'Sesuai Fisik'})\n`; 
            }); 
            
            navigator.clipboard.writeText(text); 
            alert("Format teks berhasil disalin ke clipboard!"); 
        } catch (e) { 
            alert("Gagal menyalin teks."); 
        } 
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in zoom-in duration-200">
            <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl border border-white/10">
                <div className="p-6 border-b border-ice-100 dark:border-gray-700 flex justify-between items-center bg-rose-50 dark:bg-gray-800"><h3 className="font-bold text-xl text-slate-800 dark:text-white flex items-center gap-2"><AlertTriangle size={20} className="text-rose-500"/> {log ? 'Edit Log Reject' : 'Input Reject Barang'}</h3><button onClick={onClose} className="p-2 hover:bg-white rounded-full"><X className="text-slate-400" /></button></div>
                <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tanggal Kejadian</label><input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-3 border rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-rose-300" /></div><div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Catatan Umum</label><input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="w-full p-3 border rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-rose-300" placeholder="Keterangan tambahan..." /></div></div>
                    <div className="bg-slate-50 dark:bg-gray-950 p-6 rounded-2xl border border-ice-100 dark:border-gray-800 space-y-6">
                        <div className="flex flex-col md:flex-row gap-4"><div className="flex-1 relative" ref={dropdownRef}><label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Cari Produk Master</label><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="text" className="w-full pl-10 pr-4 py-3 border rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-300" placeholder="Ketik Nama atau SKU..." value={itemSearch} onChange={(e) => { setItemSearch(e.target.value); setShowDropdown(true); setSelectedItemId(''); }} onFocus={() => setShowDropdown(true)} /></div>{showDropdown && itemSearch && (<div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-ice-200 dark:border-gray-700 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto">{filteredMaster.length > 0 ? filteredMaster.map(m => (<div key={m.id} onClick={() => handleSelectItem(m)} className="p-3 hover:bg-ice-50 dark:hover:bg-gray-700 cursor-pointer border-b border-ice-50 dark:border-gray-700 last:border-0"><div className="font-bold text-sm text-slate-800 dark:text-white">{m.name}</div><div className="text-[10px] text-slate-500 font-mono">{m.sku}</div></div>)) : <div className="p-4 text-xs text-slate-400 italic">Produk tidak terdaftar di Master Reject</div>}</div>)}</div><div className="w-full md:w-32"><label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Satuan</label><select value={selectedUnit} onChange={(e) => handleUnitChange(e.target.value)} className="w-full p-3 border rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white appearance-none" disabled={!selectedItem}>{selectedItem && (<><option value={selectedItem.baseUnit}>{selectedItem.baseUnit}</option>{selectedItem.unit2 && <option value={selectedItem.unit2}>{selectedItem.unit2}</option>}{selectedItem.unit3 && <option value={selectedItem.unit3}>{selectedItem.unit3}</option>}</>)}</select></div><div className="w-full md:w-32"><label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Qty</label><input ref={qtyInputRef} type="number" step="any" value={quantityInput} onChange={e => setQuantityInput(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-3 border rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white font-bold" placeholder="0" onKeyDown={e => e.key === 'Enter' && handleAddItem()} /></div></div>
                        <div className="flex flex-col md:flex-row gap-4 items-end"><div className="flex-1 w-full"><label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Alasan Reject</label><input value={reason} onChange={e => setReason(e.target.value)} className="w-full p-3 border rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-rose-300" placeholder="Contoh: Expired, Segel Rusak, Penyok..." onKeyDown={e => e.key === 'Enter' && handleAddItem()} /></div><button onClick={handleAddItem} disabled={!selectedItem || !quantityInput} className="px-10 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 transition-all active:scale-95 flex items-center gap-2"><Plus size={18} /> Tambah</button></div>
                    </div>
                    <div className="border border-ice-100 dark:border-gray-800 rounded-3xl overflow-hidden shadow-sm"><div className="flex justify-between items-center bg-slate-50 dark:bg-gray-800 px-6 py-3 border-b border-ice-100 dark:border-gray-800"><h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Package size={14}/> Daftar Item Terpilih</h4><button onClick={handleCopyToClipboard} disabled={items.length === 0} className="text-[10px] font-bold flex items-center gap-1.5 text-slate-600 dark:text-gray-300 hover:text-indigo-600 transition-all"><Copy size={14} /> Salin Format Teks</button></div><table className="w-full text-left"><thead className="bg-slate-50 dark:bg-gray-800 border-b border-ice-50 dark:border-gray-800 text-[10px] font-bold text-slate-400 uppercase tracking-widest"><tr><th className="p-4">Item Details</th><th className="p-4 text-center">Qty Input</th><th className="p-4 text-center">Konversi Dasar</th><th className="p-4">Alasan</th><th className="p-4 w-10"></th></tr></thead><tbody className="divide-y divide-ice-50 dark:divide-gray-800">{items.length > 0 ? items.map((item, idx) => (<tr key={idx} className="hover:bg-slate-50 dark:hover:bg-gray-800/50"><td className="p-4"><div className="font-bold text-sm text-slate-800 dark:text-white">{item.itemName}</div><div className="text-[10px] font-mono text-slate-400">{item.sku}</div></td><td className="p-4 text-center"><span className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold">{item.quantity} {item.unit}</span></td><td className="p-4 text-center"><span className="text-xs font-bold text-slate-700 dark:text-gray-200">{item.totalBaseQuantity} {item.baseUnit}</span></td><td className="p-4 text-sm text-rose-500 italic">{item.reason || '-'}</td><td className="p-4"><button onClick={() => handleRemoveItem(idx)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors"><X size={16}/></button></td></tr>)) : <tr><td colSpan={5} className="p-12 text-center text-xs text-slate-400 italic">Belum ada item yang ditambahkan ke log ini.</td></tr>}</tbody></table></div>
                </div>
                <div className="p-6 border-t border-ice-100 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 flex justify-end gap-3"><button onClick={onClose} className="px-6 py-3 text-slate-500 font-bold hover:bg-white rounded-xl transition-all">Batal</button><button onClick={handleSave} disabled={items.length === 0} className="px-10 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-xl transition-all active:scale-95 disabled:opacity-50">Simpan Log Reject</button></div>
            </div>
        </div>
    );
};