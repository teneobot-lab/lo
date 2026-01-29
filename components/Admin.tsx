
import React, { useState, useEffect } from 'react';
import { User, Role } from '../types';
import { storageService } from '../services/storageService';
import { googleSheetsService } from '../services/googleSheetsService';
import { geminiService } from '../services/geminiService';
import { 
  Settings, Music, Users, Server, Plus, Edit2, Trash2, X, Save, 
  RefreshCcw, ShieldCheck, Youtube, Copy, Search, ArrowRight, 
  Table, Link2, CloudUpload, FileJson, ChevronDown, Wifi, Play, Sparkles, Loader2, Mic2
} from 'lucide-react';

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
    const [isSyncing, setIsSyncing] = useState(false);
    
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

    return (
        <div className="space-y-10 max-w-[1600px] mx-auto pb-20 animate-in fade-in duration-500">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                    <h2 className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter flex items-center gap-4 uppercase">
                        Master Center <Settings className="text-paper-blue animate-spin-slow" size={36} />
                    </h2>
                    <p className="text-slate-500 font-medium italic">Otoritas pusat untuk konfigurasi infrastruktur Nexus WMS.</p>
                </div>
                <button onClick={() => { setEditingUser(null); setIsUserModalOpen(true); }} className="px-8 py-3.5 bg-paper-blue text-white rounded-2xl font-black shadow-lg hover:bg-paper-blueHover transition-all active:scale-95 flex items-center gap-3">
                    <Plus size={20}/> TAMBAH STAFF
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-10">
                    {/* Cloud Integration Card */}
                    <div className="bg-white dark:bg-gray-800 p-10 rounded-[2.5rem] shadow-soft border border-slate-100 relative overflow-hidden group transition-all hover:shadow-paper">
                        <div className="absolute -right-20 -top-20 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-colors"></div>
                        <div className="flex items-center gap-6 mb-10">
                            <div className="p-5 bg-emerald-50 rounded-2xl text-emerald-500 shadow-sm"><Table size={32}/></div>
                            <div>
                                <h3 className="font-black text-3xl text-slate-800 dark:text-white uppercase tracking-tighter">Google Sync Integration</h3>
                                <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest">Enterprise Cloud Webhook</p>
                            </div>
                        </div>

                        <div className="space-y-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-2">Webhook Endpoint URL</label>
                                <div className="flex gap-3">
                                    <input value={sheetUrl} onChange={e => setSheetUrl(e.target.value)} placeholder="https://script.google.com/..." className="flex-1 p-4 border border-slate-200 dark:border-gray-700 rounded-2xl text-sm bg-slate-50 dark:bg-gray-900 outline-none focus:ring-2 focus:ring-emerald-400 font-mono text-emerald-600" />
                                    <button onClick={handleSaveConfig} className="bg-emerald-600 text-white px-8 rounded-2xl font-black hover:bg-emerald-700 shadow-xl transition-all flex items-center gap-2"><Save size={20}/> SIMPAN</button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <SyncCard label="Sync Inventory" icon={<CloudUpload size={28}/>} onClick={() => {}} />
                                <SyncCard label="Sync Transactions" icon={<FileJson size={28}/>} onClick={() => {}} />
                            </div>
                        </div>
                    </div>

                    {/* Team Management */}
                    <div className="bg-white dark:bg-gray-800 p-10 rounded-[2.5rem] shadow-soft border border-slate-100">
                        <div className="flex items-center gap-6 mb-10">
                            <div className="p-5 bg-paper-blue/10 rounded-2xl text-paper-blue shadow-sm"><Users size={32}/></div>
                            <div>
                                <h3 className="font-black text-3xl text-slate-800 dark:text-white uppercase tracking-tighter">Staff Access Hub</h3>
                                <p className="text-[10px] text-paper-blue font-black uppercase tracking-widest">{users.length} Personel Terdaftar</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {users.map(u => (
                                <div key={u.id} className="group flex items-center justify-between p-6 bg-slate-50 dark:bg-gray-900/50 rounded-[2rem] border-2 border-transparent hover:border-paper-blue/20 transition-all">
                                    <div className="flex items-center gap-5">
                                        <div className="w-14 h-14 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center text-2xl font-black text-paper-blue shadow-sm uppercase">{u.name.charAt(0)}</div>
                                        <div>
                                            <p className="font-black text-slate-800 dark:text-white text-lg tracking-tight">{u.name}</p>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">@{u.username} • {u.role}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                        <button onClick={() => { setEditingUser(u); setIsUserModalOpen(true); }} className="p-2.5 text-slate-400 hover:text-paper-blue hover:bg-white rounded-xl transition-colors"><Edit2 size={18}/></button>
                                        <button className="p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"><Trash2 size={20}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Sidebar Admin */}
                <div className="space-y-10">
                    <div className="bg-white dark:bg-gray-800 p-10 rounded-[2.5rem] shadow-soft border border-slate-100">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-4 bg-rose-50 rounded-2xl text-rose-500 shadow-sm"><Youtube size={28}/></div>
                            <h3 className="font-black text-2xl text-slate-800 dark:text-white uppercase tracking-tighter">Media Hub</h3>
                        </div>
                        <div className="space-y-4">
                            {playlist.map(p => (
                                <div key={p.id} className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${currentMediaUrl === p.url ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-transparent'}`}>
                                    <p className="text-sm font-bold text-slate-800 truncate pr-4">{p.title}</p>
                                    <button onClick={() => onUpdateMedia?.(p.url)} className="p-2 bg-white text-rose-500 rounded-xl shadow-sm hover:scale-110 transition-transform"><Play size={16} fill="currentColor"/></button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-[#1C2434] p-10 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden group">
                        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/5 rounded-full blur-2xl"></div>
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-4 bg-white/10 rounded-2xl text-white shadow-sm"><Server size={28}/></div>
                            <h3 className="font-black text-2xl uppercase tracking-tighter">API Infrastructure</h3>
                        </div>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block ml-2">Core API Endpoint</label>
                                <input value={apiUrl} onChange={e => setApiUrl(e.target.value)} className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl font-mono text-xs text-paper-blue outline-none" />
                            </div>
                            <button onClick={handleSaveConfig} className="w-full bg-paper-blue hover:bg-paper-blueHover text-white py-4 rounded-2xl font-black shadow-lg transition-all active:scale-95">RELOAD CONFIG</button>
                        </div>
                    </div>
                </div>
            </div>

            {isUserModalOpen && <UserModal user={editingUser} onClose={() => setIsUserModalOpen(false)} onSave={() => { refreshUsers(); setIsUserModalOpen(false); }} />}
        </div>
    );
};

const SyncCard = ({ label, icon, onClick }: any) => (
    <button onClick={onClick} className="flex items-center gap-5 p-6 bg-slate-50 dark:bg-gray-900/50 rounded-3xl border-2 border-transparent hover:border-emerald-200 transition-all group">
        <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl text-emerald-500 shadow-sm group-hover:scale-110 transition-transform">{icon}</div>
        <div className="text-left"><p className="font-black text-slate-800 dark:text-white uppercase tracking-tighter text-lg">{label}</p><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Real-time Hook</p></div>
    </button>
);

const UserModal = ({ user, onClose, onSave }: any) => {
    const [formData, setFormData] = useState({ name: user?.name || '', username: user?.username || '', role: user?.role || 'staff', password: '' });
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300 border border-white/10">
                <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-paper-blue/5">
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-3">
                        <ShieldCheck size={24} className="text-paper-blue"/> {user ? 'Edit Personnel' : 'New Staff'}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-all"><X size={24}/></button>
                </div>
                <form className="p-10 space-y-6">
                    <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-2">Nama Lengkap</label><input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-gray-800 border-2 border-transparent focus:border-paper-blue rounded-2xl text-sm font-bold outline-none" /></div>
                    <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-2">Username Akses</label><input required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-gray-800 border-2 border-transparent focus:border-paper-blue rounded-2xl text-sm font-bold outline-none" /></div>
                    <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-2">Password</label><input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-gray-800 border-2 border-transparent focus:border-paper-blue rounded-2xl text-sm font-bold outline-none" placeholder="••••••••" /></div>
                    <div className="pt-6 flex justify-end gap-4"><button type="button" onClick={onClose} className="px-6 py-3 text-slate-400 font-black hover:bg-slate-50 rounded-xl">BATAL</button><button onClick={(e) => { e.preventDefault(); onSave(); }} className="px-10 py-3 bg-paper-blue text-white font-black rounded-2xl shadow-xl hover:bg-paper-blueHover transition-all active:scale-95">KONFIRMASI</button></div>
                </form>
            </div>
        </div>
    );
};
