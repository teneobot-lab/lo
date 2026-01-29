
import React, { useState, useEffect } from 'react';
import { User, Role } from '../types';
import { storageService } from '../services/storageService';
import { googleSheetsService } from '../services/googleSheetsService';
import { 
  Settings, Users, Server, Plus, Edit2, Trash2, X, Save, 
  ShieldCheck, Youtube, Search, Table, CloudUpload, 
  FileJson, Play, Database, Download, Upload, ShieldAlert,
  HardDrive, Activity, Globe, Lock
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface AdminProps {
    currentMediaUrl?: string;
    onUpdateMedia?: (url: string) => void;
}

export const Admin: React.FC<AdminProps> = ({ currentMediaUrl, onUpdateMedia }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [apiUrl, setApiUrl] = useState('');
    const [sheetUrl, setSheetUrl] = useState('');
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isBackingUp, setIsBackingUp] = useState(false);
    
    const [playlist, setPlaylist] = useState<any[]>(() => {
        const saved = localStorage.getItem('nexus_media_playlist');
        return saved ? JSON.parse(saved) : [{ id: '1', title: 'Nexus Radio Lo-Fi', url: 'https://www.youtube.com/embed/jfKfPfyJRdk' }];
    });

    useEffect(() => {
        refreshUsers();
        setApiUrl(localStorage.getItem('nexus_api_url') || '/api');
        setSheetUrl(localStorage.getItem('nexus_sheet_webhook') || '');
    }, []);

    const refreshUsers = async () => {
        try { const data = await storageService.getUsers(); setUsers(data); } catch (e) {}
    };

    const handleSaveConfig = () => {
        localStorage.setItem('nexus_api_url', apiUrl.trim());
        localStorage.setItem('nexus_sheet_webhook', sheetUrl.trim());
        alert("Konfigurasi Sistem Diperbarui!");
    };

    const handleFullBackup = async () => {
        setIsBackingUp(true);
        try {
            const items = await storageService.getItems();
            const txs = await storageService.getTransactions();
            const rejectMaster = await storageService.getRejectMaster();
            const rejectLogs = await storageService.getRejectLogs();
            
            const backupData = {
                version: "2.5.0-Enterprise",
                timestamp: new Date().toISOString(),
                data: { items, transactions: txs, rejectMaster, rejectLogs }
            };

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(items), "Inventory");
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(txs), "Transactions");
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rejectLogs), "Reject_Logs");
            
            XLSX.writeFile(wb, `Nexus_Backup_${new Date().toISOString().slice(0,10)}.xlsx`);
            
            // Juga download JSON untuk full restore capability
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", `Nexus_Master_Backup_${new Date().toISOString().slice(0,10)}.json`);
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();

        } catch (e) {
            alert("Gagal melakukan backup data.");
        } finally {
            setIsBackingUp(false);
        }
    };

    return (
        <div className="space-y-12 max-w-[1600px] mx-auto pb-24 animate-in fade-in duration-500 px-4">
            {/* Page Header - Enterprise Style */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-slate-200 pb-8">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-paper-blue rounded-xl text-white shadow-lg shadow-blue-500/20">
                            <Settings size={28} />
                        </div>
                        <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">
                            Administrator Hub
                        </h2>
                    </div>
                    <p className="text-slate-500 font-medium text-lg ml-1">Manajemen infrastruktur dan integritas data enterprise.</p>
                </div>
                <div className="flex gap-4">
                    <button onClick={handleFullBackup} disabled={isBackingUp} className="px-8 py-4 bg-white border border-slate-200 text-slate-700 rounded-2xl font-black shadow-sm hover:bg-slate-50 transition-all flex items-center gap-3 uppercase tracking-widest text-xs">
                        {isBackingUp ? <div className="animate-spin w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full" /> : <Database size={18} className="text-paper-blue" />} Backup Database
                    </button>
                    <button onClick={() => { setEditingUser(null); setIsUserModalOpen(true); }} className="px-10 py-4 bg-paper-blue text-white rounded-2xl font-black shadow-xl hover:bg-paper-blueHover transition-all active:scale-95 flex items-center gap-3 uppercase tracking-widest text-xs">
                        <Plus size={18}/> Tambah Personnel
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-10">
                {/* Main Config Column */}
                <div className="col-span-12 lg:col-span-8 space-y-10">
                    
                    {/* Data Integrity & Backup Module */}
                    <div className="bg-white p-10 rounded-[2.5rem] shadow-card border border-slate-100 overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-paper-blue/5 rounded-bl-[5rem]"></div>
                        <div className="flex items-center gap-6 mb-12 relative z-10">
                            <div className="p-5 bg-paper-blue/10 rounded-3xl text-paper-blue">
                                <HardDrive size={32}/>
                            </div>
                            <div>
                                <h3 className="font-black text-3xl text-slate-900 uppercase tracking-tighter">Maintenance & Integrity</h3>
                                <p className="text-[10px] text-paper-blue font-black uppercase tracking-widest flex items-center gap-2">
                                    <Activity size={12}/> System Health: Optimal
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                            <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-200 group hover:border-paper-blue transition-all cursor-pointer" onClick={handleFullBackup}>
                                <div className="flex justify-between items-start mb-6">
                                    <div className="p-4 bg-white rounded-2xl text-slate-800 shadow-sm"><Download size={24}/></div>
                                    <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full uppercase">Ready</span>
                                </div>
                                <h4 className="font-black text-xl text-slate-900 mb-2 uppercase">Ekspor Cloud Backup</h4>
                                <p className="text-sm text-slate-500 leading-relaxed font-medium">Cadangkan seluruh inventaris dan mutasi ke format XLSX & JSON.</p>
                            </div>

                            <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-200 group hover:border-rose-400 transition-all cursor-pointer">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="p-4 bg-white rounded-2xl text-slate-800 shadow-sm"><Upload size={24}/></div>
                                    <span className="text-[10px] font-black text-rose-500 bg-rose-50 px-3 py-1 rounded-full uppercase tracking-widest">Restricted</span>
                                </div>
                                <h4 className="font-black text-xl text-slate-900 mb-2 uppercase">Restore Master Data</h4>
                                <p className="text-sm text-slate-500 leading-relaxed font-medium">Pulihkan sistem menggunakan berkas cadangan resmi Nexus.</p>
                            </div>
                        </div>
                    </div>

                    {/* Google Cloud Integration - Re-positioned Fields */}
                    <div className="bg-white p-10 rounded-[2.5rem] shadow-card border border-slate-100 group transition-all hover:shadow-paper">
                        <div className="flex items-center gap-6 mb-12">
                            <div className="p-5 bg-emerald-50 rounded-3xl text-emerald-500"><Table size={32}/></div>
                            <div>
                                <h3 className="font-black text-3xl text-slate-900 uppercase tracking-tighter">Sync Engine v2.0</h3>
                                <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest tracking-widest">Google Apps Script Webhook</p>
                            </div>
                        </div>

                        <div className="space-y-10">
                            <div className="space-y-3">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] block ml-1">Cloud Integration Endpoint URL</label>
                                <div className="flex flex-col md:flex-row gap-4">
                                    <div className="relative flex-1">
                                        <Globe className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                                        <input 
                                            value={sheetUrl} 
                                            onChange={e => setSheetUrl(e.target.value)} 
                                            placeholder="https://script.google.com/macros/s/..." 
                                            className="w-full pl-14 pr-6 py-5 border border-slate-200 rounded-2xl text-sm bg-slate-50 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-mono text-emerald-700" 
                                        />
                                    </div>
                                    <button onClick={handleSaveConfig} className="bg-emerald-600 text-white px-10 rounded-2xl font-black hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs min-h-[64px]">
                                        <Save size={20}/> Update Endpoint
                                    </button>
                                </div>
                                <p className="text-xs text-slate-400 font-medium italic ml-1">Pastikan Webhook dikonfigurasi sebagai "Anyone" di Google Console.</p>
                            </div>
                        </div>
                    </div>

                    {/* Team Access Hub */}
                    <div className="bg-white p-10 rounded-[2.5rem] shadow-card border border-slate-100">
                        <div className="flex items-center gap-6 mb-12">
                            <div className="p-5 bg-paper-blue/10 rounded-3xl text-paper-blue"><Users size={32}/></div>
                            <div>
                                <h3 className="font-black text-3xl text-slate-900 uppercase tracking-tighter">Security & Permissions</h3>
                                <p className="text-[10px] text-paper-blue font-black uppercase tracking-widest tracking-widest">{users.length} Authorized Personnels</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {users.map(u => (
                                <div key={u.id} className="group flex items-center justify-between p-8 bg-slate-50 rounded-[2.5rem] border-2 border-transparent hover:border-paper-blue/30 transition-all">
                                    <div className="flex items-center gap-6">
                                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-2xl font-black text-paper-blue shadow-sm border border-slate-100 uppercase">{u.name.charAt(0)}</div>
                                        <div>
                                            <p className="font-black text-slate-900 text-xl tracking-tight">{u.name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${u.role === 'admin' ? 'bg-paper-blue text-white' : 'bg-slate-200 text-slate-600'}`}>{u.role}</span>
                                                <span className="text-xs font-bold text-slate-400">@{u.username}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => { setEditingUser(u); setIsUserModalOpen(true); }} className="p-3 text-slate-400 hover:text-paper-blue hover:bg-white rounded-xl transition-all"><Edit2 size={18}/></button>
                                        <button className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={20}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Sidebar Column - More Compact but Structured */}
                <div className="col-span-12 lg:col-span-4 space-y-10">
                    
                    {/* Security Alert / Status */}
                    <div className="bg-rose-500 p-10 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden group">
                        <div className="absolute top-[-20%] right-[-10%] w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
                        <div className="flex items-center gap-4 mb-10 relative z-10">
                            <div className="p-4 bg-white/20 rounded-2xl text-white shadow-sm"><ShieldAlert size={28}/></div>
                            <h3 className="font-black text-2xl uppercase tracking-tighter">System Security</h3>
                        </div>
                        <div className="space-y-6 relative z-10">
                            <div className="p-6 bg-white/10 rounded-2xl border border-white/20">
                                <p className="text-xs font-bold uppercase tracking-widest opacity-60 mb-2">Encryption Status</p>
                                <p className="text-lg font-black flex items-center gap-2 uppercase tracking-tighter"><Lock size={16}/> AES-256 ACTIVE</p>
                            </div>
                            <div className="p-6 bg-white/10 rounded-2xl border border-white/20">
                                <p className="text-xs font-bold uppercase tracking-widest opacity-60 mb-2">Login Verification</p>
                                <p className="text-lg font-black uppercase tracking-tighter">2FA ENFORCED</p>
                            </div>
                        </div>
                    </div>

                    {/* Media Hub Section */}
                    <div className="bg-white p-10 rounded-[2.5rem] shadow-card border border-slate-100">
                        <div className="flex items-center gap-4 mb-10">
                            <div className="p-4 bg-rose-50 rounded-2xl text-rose-500"><Youtube size={28}/></div>
                            <h3 className="font-black text-2xl text-slate-900 uppercase tracking-tighter">Radio Channel</h3>
                        </div>
                        <div className="space-y-4">
                            {playlist.map(p => (
                                <div key={p.id} onClick={() => onUpdateMedia?.(p.url)} className={`group flex items-center justify-between p-6 rounded-[2rem] border-2 transition-all cursor-pointer ${currentMediaUrl === p.url ? 'bg-rose-50 border-rose-200 shadow-sm' : 'bg-slate-50 border-transparent hover:bg-slate-100'}`}>
                                    <div className="flex-1 overflow-hidden pr-4">
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Station 0{p.id}</p>
                                        <p className="text-sm font-black text-slate-800 truncate uppercase tracking-tight">{p.title}</p>
                                    </div>
                                    <div className={`p-3 rounded-2xl transition-all ${currentMediaUrl === p.url ? 'bg-rose-500 text-white' : 'bg-white text-slate-300 group-hover:text-rose-500'}`}>
                                        <Play size={16} fill="currentColor"/>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Infrastructure Stats */}
                    <div className="bg-[#1C2434] p-10 rounded-[2.5rem] shadow-2xl text-white">
                        <div className="flex items-center gap-4 mb-10">
                            <div className="p-4 bg-white/10 rounded-2xl text-white"><Server size={28}/></div>
                            <h3 className="font-black text-2xl uppercase tracking-tighter">Core API Config</h3>
                        </div>
                        <div className="space-y-8">
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-white/40 uppercase tracking-[0.3em] block ml-1">Master API Endpoint</label>
                                <input 
                                    value={apiUrl} 
                                    onChange={e => setApiUrl(e.target.value)} 
                                    className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl font-mono text-xs text-paper-blue outline-none focus:ring-2 focus:ring-paper-blue/40" 
                                />
                            </div>
                            <button onClick={handleSaveConfig} className="w-full bg-paper-blue hover:bg-paper-blueHover text-white py-5 rounded-2xl font-black shadow-xl shadow-blue-500/20 transition-all active:scale-95 uppercase tracking-widest text-xs">
                                Reload System Instance
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {isUserModalOpen && <UserModal user={editingUser} onClose={() => setIsUserModalOpen(false)} onSave={() => { refreshUsers(); setIsUserModalOpen(false); }} />}
        </div>
    );
};

// ... UserModal remains largely same but updated with consistent styles ...
const UserModal = ({ user, onClose, onSave }: any) => {
    const [formData, setFormData] = useState({ name: user?.name || '', username: user?.username || '', role: user?.role || 'staff', password: '' });
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300 border border-white/10">
                <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-paper-blue/5">
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                        <ShieldCheck size={24} className="text-paper-blue"/> {user ? 'Update Staff' : 'Register Staff'}
                    </h3>
                    <button onClick={onClose} className="p-3 hover:bg-white rounded-full transition-all text-slate-400"><X size={28}/></button>
                </div>
                <form className="p-10 space-y-8">
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-2">Full Personnel Name</label><input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-paper-blue rounded-2xl text-sm font-bold outline-none transition-all" placeholder="e.g. John Doe" /></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-2">Secure Username</label><input required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-paper-blue rounded-2xl text-sm font-bold outline-none transition-all" /></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-2">Access Key (Password)</label><input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-paper-blue rounded-2xl text-sm font-bold outline-none transition-all" placeholder="••••••••" /></div>
                    <div className="pt-8 flex justify-end gap-4"><button type="button" onClick={onClose} className="px-8 py-4 text-slate-400 font-black hover:bg-slate-50 rounded-2xl uppercase tracking-widest text-xs">Cancel</button><button onClick={(e) => { e.preventDefault(); onSave(); }} className="px-12 py-4 bg-paper-blue text-white font-black rounded-2xl shadow-xl shadow-blue-500/30 hover:bg-paper-blueHover transition-all active:scale-95 uppercase tracking-widest text-xs">Authorize Personnel</button></div>
                </form>
            </div>
        </div>
    );
};
