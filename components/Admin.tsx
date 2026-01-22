
import React, { useState, useEffect } from 'react';
import { User, Role } from '../types';
import { storageService } from '../services/storageService';
import { 
  Settings, Music, Users, Server, Plus, Edit2, Trash2, X, Save, 
  Database, Wifi, Play, Globe, Download, Upload, RefreshCcw, 
  ShieldCheck, Youtube, ListMusic, Terminal, AlertCircle, FileJson, 
  Copy, CheckCircle2, Search
} from 'lucide-react';

interface AdminProps {
    currentMediaUrl?: string;
    onUpdateMedia?: (url: string) => void;
}

interface PlaylistItem {
    id: string;
    title: string;
    url: string;
}

export const Admin: React.FC<AdminProps> = ({ currentMediaUrl, onUpdateMedia }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [apiUrl, setApiUrl] = useState('');
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [userSearch, setUserSearch] = useState('');
    
    // Media Playlist State
    const [playlist, setPlaylist] = useState<PlaylistItem[]>(() => {
        const saved = localStorage.getItem('nexus_media_playlist');
        return saved ? JSON.parse(saved) : [{ id: '1', title: 'Nexus Lo-Fi Relaxing', url: 'https://www.youtube.com/embed/jfKfPfyJRdk' }];
    });
    const [newMediaTitle, setNewMediaTitle] = useState('');
    const [newMediaUrl, setNewMediaUrl] = useState('');

    const PROXY_PATH = '/api';

    useEffect(() => {
        refreshUsers();
        const stored = localStorage.getItem('nexus_api_url');
        setApiUrl(stored || PROXY_PATH);
    }, []);

    const refreshUsers = async () => {
        const data = await storageService.getUsers();
        setUsers(data);
    };

    const handleSaveConfig = () => {
        if (!apiUrl || apiUrl === PROXY_PATH) {
            localStorage.removeItem('nexus_api_url');
        } else {
            localStorage.setItem('nexus_api_url', apiUrl);
        }
        alert("Konfigurasi API diperbarui. Halaman akan dimuat ulang.");
        window.location.reload();
    };

    const handleDeleteUser = async (id: string) => {
        if (id === 'admin') {
            alert("Sistem Keamanan: Akun Super Admin Utama tidak dapat dihapus.");
            return;
        }
        if (window.confirm("Hapus staff ini secara permanen dari database?")) {
            await storageService.deleteUser(id);
            refreshUsers();
        }
    };

    // Playlist Management
    const addToPlaylist = () => {
        if (!newMediaTitle || !newMediaUrl) return;
        
        let embedUrl = newMediaUrl;
        // Basic parser for common YT links
        if (newMediaUrl.includes('watch?v=')) {
            const videoId = newMediaUrl.split('v=')[1]?.split('&')[0];
            embedUrl = `https://www.youtube.com/embed/${videoId}`;
        } else if (newMediaUrl.includes('youtu.be/')) {
            const videoId = newMediaUrl.split('youtu.be/')[1]?.split('?')[0];
            embedUrl = `https://www.youtube.com/embed/${videoId}`;
        }

        const newItem = { id: crypto.randomUUID(), title: newMediaTitle, url: embedUrl };
        const next = [...playlist, newItem];
        setPlaylist(next);
        localStorage.setItem('nexus_media_playlist', JSON.stringify(next));
        setNewMediaTitle('');
        setNewMediaUrl('');
    };

    const deleteFromPlaylist = (id: string) => {
        const next = playlist.filter(p => p.id !== id);
        setPlaylist(next);
        localStorage.setItem('nexus_media_playlist', JSON.stringify(next));
    };

    // Backup & Migration Tools
    const exportConfig = () => {
        const data: any = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith('nexus_')) data[key] = localStorage.getItem(key);
        }
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `NEXUS_SYSTEM_BACKUP_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
    };

    const importConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = JSON.parse(evt.target?.result as string);
                Object.keys(data).forEach(k => localStorage.setItem(k, data[k]));
                alert("Restorasi Berhasil! Memuat ulang sistem...");
                window.location.reload();
            } catch (err) { alert("File tidak valid!"); }
        };
        reader.readAsText(file);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert("Command berhasil disalin ke clipboard!");
    };

    const filteredUsers = users.filter(u => 
        u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
        u.username.toLowerCase().includes(userSearch.toLowerCase())
    );

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-24 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                    <h2 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-3">
                        Management Hub <Settings className="text-indigo-600" size={32} />
                    </h2>
                    <p className="text-slate-500 dark:text-gray-400 font-medium">Konfigurasi staff, media hiburan, dan pemeliharaan server Nexus.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button onClick={exportConfig} className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-gray-800 text-slate-700 dark:text-white border border-ice-200 dark:border-gray-700 rounded-2xl font-bold shadow-sm hover:bg-ice-50 transition-all">
                        <FileJson size={18} className="text-indigo-500"/> Export Settings
                    </button>
                    <label className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg hover:bg-indigo-700 cursor-pointer transition-all active:scale-95">
                        <Upload size={18}/> Import & Sync
                        <input type="file" accept=".json" onChange={importConfig} className="hidden" />
                    </label>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Column 1: Staff Management */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-soft border border-ice-100 dark:border-gray-700">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl text-indigo-600"><Users size={28}/></div>
                                <div>
                                    <h3 className="font-bold text-2xl text-slate-800 dark:text-white leading-tight">Manajemen Staff</h3>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">{users.length} Total Terdaftar</p>
                                </div>
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto">
                                <div className="relative flex-1 sm:w-48">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Cari staff..." className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-gray-900 border border-ice-100 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-300" />
                                </div>
                                <button onClick={() => { setEditingUser(null); setIsUserModalOpen(true); }} className="p-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl shadow-lg transition-all active:scale-95"><Plus size={20}/></button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredUsers.map(u => (
                                <div key={u.id} className="group relative bg-slate-50 dark:bg-gray-700/30 p-5 rounded-3xl border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900/50 transition-all flex items-center justify-between overflow-hidden">
                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className="w-14 h-14 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center text-2xl font-black text-indigo-600 shadow-sm border border-ice-50 dark:border-gray-700">
                                            {u.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-800 dark:text-white leading-tight">{u.name}</p>
                                            <p className="text-xs text-slate-400 font-mono">@{u.username}</p>
                                            <span className={`inline-block px-2 py-0.5 mt-1 rounded text-[9px] font-black uppercase tracking-widest ${u.role === 'admin' ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                                {u.role}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                        <button onClick={() => { setEditingUser(u); setIsUserModalOpen(true); }} className="p-2 text-indigo-500 hover:bg-white dark:hover:bg-gray-800 rounded-xl transition-all"><Edit2 size={18}/></button>
                                        <button onClick={() => handleDeleteUser(u.id)} className="p-2 text-rose-500 hover:bg-white dark:hover:bg-gray-800 rounded-xl transition-all"><Trash2 size={18}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Server Migration Terminal Guide */}
                    <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl border border-slate-700 text-white space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="p-4 bg-indigo-600 rounded-2xl text-white shadow-lg"><Terminal size={28}/></div>
                            <div>
                                <h3 className="font-bold text-2xl">Server Migration Guide</h3>
                                <p className="text-xs text-indigo-300 font-bold uppercase tracking-[0.2em]">DevOps Command Line</p>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Download size={14}/> 1. Backup Database (VPS Lama)</h4>
                                <div className="group relative">
                                    <code className="block bg-black p-4 rounded-2xl text-[10px] text-emerald-400 border border-slate-700 font-mono leading-relaxed overflow-x-auto">
                                        mysqldump -u {process.env.DB_USER || 'root'} -p {process.env.DB_NAME || 'nexus_wms'} > backup.sql
                                    </code>
                                    <button onClick={() => copyToClipboard(`mysqldump -u root -p nexus_wms > backup.sql`)} className="absolute top-2 right-2 p-2 bg-slate-800 text-slate-400 rounded-lg opacity-0 group-hover:opacity-100 transition-all"><Copy size={14}/></button>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Upload size={14}/> 2. Restore ke VPS Baru</h4>
                                <div className="group relative">
                                    <code className="block bg-black p-4 rounded-2xl text-[10px] text-emerald-400 border border-slate-700 font-mono leading-relaxed overflow-x-auto">
                                        mysql -u root -p nexus_wms {'<'} backup.sql
                                    </code>
                                    <button onClick={() => copyToClipboard(`mysql -u root -p nexus_wms < backup.sql`)} className="absolute top-2 right-2 p-2 bg-slate-800 text-slate-400 rounded-lg opacity-0 group-hover:opacity-100 transition-all"><Copy size={14}/></button>
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-4 bg-indigo-900/30 rounded-2xl border border-indigo-800/50 flex items-start gap-3">
                            <AlertCircle className="text-indigo-400 flex-shrink-0" size={20}/>
                            <p className="text-xs text-indigo-100 leading-relaxed italic">
                                "PENTING: Sebelum migrate, pastikan skema database (schema.sql) sudah dijalankan di server baru. Gunakan perintah SSH untuk memindahkan file .sql antar server dengan aman."
                            </p>
                        </div>
                    </div>
                </div>

                {/* Column 2: Media & Config */}
                <div className="space-y-8">
                    {/* YouTube Playlist */}
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-soft border border-ice-100 dark:border-gray-700 flex flex-col h-full">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-4 bg-rose-50 dark:bg-rose-900/30 rounded-2xl text-rose-600"><Youtube size={28}/></div>
                            <h3 className="font-bold text-2xl text-slate-800 dark:text-white tracking-tight">Media Hub</h3>
                        </div>

                        <div className="space-y-4 mb-8 p-4 bg-slate-50 dark:bg-gray-900/50 rounded-3xl border border-dashed border-ice-200 dark:border-gray-700">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Judul Playlist</label>
                                <input value={newMediaTitle} onChange={e => setNewMediaTitle(e.target.value)} placeholder="Misal: Music Semangat..." className="w-full p-3 border border-ice-100 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-rose-300" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">URL YouTube</label>
                                <div className="flex gap-2">
                                    <input value={newMediaUrl} onChange={e => setNewMediaUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." className="flex-1 p-3 border border-ice-100 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-rose-300" />
                                    <button onClick={addToPlaylist} className="bg-rose-600 text-white p-3 rounded-xl hover:bg-rose-700 transition-all shadow-lg active:scale-95"><Plus size={20}/></button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 overflow-y-auto max-h-[400px] custom-scrollbar pr-2">
                            {playlist.map(p => (
                                <div key={p.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${currentMediaUrl === p.url ? 'bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800 shadow-sm scale-[1.02]' : 'bg-white dark:bg-gray-800 border-ice-50 dark:border-gray-700 hover:bg-ice-50/50'}`}>
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className={`p-2.5 rounded-xl ${currentMediaUrl === p.url ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-100 dark:bg-gray-700 text-slate-400'}`}>
                                            <Music size={16}/>
                                        </div>
                                        <div className="truncate">
                                            <p className={`text-sm font-black truncate ${currentMediaUrl === p.url ? 'text-rose-700 dark:text-rose-300' : 'text-slate-700 dark:text-gray-300'}`}>{p.title}</p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">YouTube Embed</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {onUpdateMedia && currentMediaUrl !== p.url && (
                                            <button onClick={() => onUpdateMedia(p.url)} className="p-2 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-all"><Play size={18}/></button>
                                        )}
                                        <button onClick={() => deleteFromPlaylist(p.id)} className="p-2 text-slate-300 hover:text-rose-500 rounded-xl transition-all"><X size={18}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* API Connection Settings */}
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-soft border border-ice-100 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl text-indigo-600"><Server size={28}/></div>
                            <h3 className="font-bold text-2xl text-slate-800 dark:text-white">API Connection</h3>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Vercel Proxy Path / VPS URL</label>
                                <div className="flex gap-2">
                                    <input value={apiUrl} onChange={e => setApiUrl(e.target.value)} placeholder="/api" className="flex-1 p-3 border border-ice-100 dark:border-gray-700 rounded-xl font-mono text-sm text-indigo-600 dark:text-indigo-400 bg-indigo-50/20 dark:bg-gray-900 outline-none" />
                                    <button onClick={handleSaveConfig} className="bg-slate-800 text-white p-3.5 rounded-xl hover:bg-slate-900 shadow-lg transition-all active:scale-95"><Save size={18}/></button>
                                </div>
                            </div>
                            <div className={`flex items-center gap-3 p-4 rounded-2xl border ${apiUrl.startsWith('/') ? 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-amber-50 border-amber-100'}`}>
                                <Wifi size={16} className={apiUrl.startsWith('/') ? 'text-emerald-500' : 'text-amber-500'} />
                                <span className={`text-xs font-bold ${apiUrl.startsWith('/') ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700'}`}>
                                    {apiUrl.startsWith('/') ? 'Vercel Proxy Active (Recommended)' : 'Custom URL Mode'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {isUserModalOpen && <UserModal user={editingUser} onClose={() => setIsUserModalOpen(false)} onSave={() => { refreshUsers(); setIsUserModalOpen(false); }} />}
        </div>
    );
};

const UserModal = ({ user, onClose, onSave }: { user: User | null, onClose: () => void, onSave: () => void }) => {
    const [formData, setFormData] = useState({
        name: user?.name || '', username: user?.username || '', role: user?.role || 'staff', password: ''
    });
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const newUser: User = { id: user?.id || crypto.randomUUID(), name: formData.name, username: formData.username, role: formData.role as Role };
        await storageService.saveUser(newUser, formData.password || undefined);
        onSave();
    };
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in zoom-in duration-200">
            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-white/20">
                <div className="p-8 border-b border-ice-100 dark:border-gray-800 flex justify-between items-center bg-indigo-50 dark:bg-gray-800">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <ShieldCheck size={20} className="text-indigo-600"/> {user ? 'Edit Profil Staff' : 'Rekrut Staff Baru'}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-full transition-all"><X size={24}/></button>
                </div>
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Nama Lengkap</label>
                        <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-ice-100 dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-950 text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10" placeholder="Misal: Ahmad Dani" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Username Login</label>
                        <input required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full border border-ice-100 dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-950 text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10" placeholder="Username unik..." />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Tanggung Jawab (Role)</label>
                        <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as Role})} className="w-full border border-ice-100 dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-950 text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10 appearance-none">
                            <option value="staff">Staff Gudang</option>
                            <option value="admin">Administrator</option>
                            <option value="viewer">Viewer Only</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Password {user && '(Kosongkan jika tetap)'}</label>
                        <input type="password" required={!user} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full border border-ice-100 dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-950 text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10" placeholder={user ? "••••••••" : "Masukkan password baru"} />
                    </div>
                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-gray-800 rounded-xl">Batal</button>
                        <button type="submit" className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-xl transition-all active:scale-95 flex items-center gap-2">
                            <Save size={18} /> Simpan Profil
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
