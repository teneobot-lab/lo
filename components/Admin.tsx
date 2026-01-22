
import React, { useState, useEffect } from 'react';
import { User, Role } from '../types';
import { storageService } from '../services/storageService';
import { Settings, Music, Users, Server, Plus, Edit2, Trash2, X, Save, Database, Wifi, WifiOff, Play, Link, Globe, Download, Upload, RefreshCcw, ShieldCheck, Youtube, ListMusic, Terminal, AlertCircle, FileJson } from 'lucide-react';

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
    
    // Media Playlist State
    const [playlist, setPlaylist] = useState<PlaylistItem[]>(() => {
        const saved = localStorage.getItem('nexus_media_playlist');
        return saved ? JSON.parse(saved) : [{ id: '1', title: 'Default Relaxing', url: 'https://www.youtube.com/embed/jfKfPfyJRdk' }];
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
        setUsers(await storageService.getUsers());
    };

    const handleSaveConfig = () => {
        if (!apiUrl || apiUrl === PROXY_PATH) {
            localStorage.removeItem('nexus_api_url');
            alert("Sistem sekarang menggunakan Vercel Proxy (/api).");
        } else {
            localStorage.setItem('nexus_api_url', apiUrl);
            alert("Custom API URL disimpan.");
        }
        window.location.reload();
    };

    const handleDeleteUser = async (id: string) => {
        if (id === 'admin') {
            alert("Sistem Keamanan: Akun Super Admin Utama tidak dapat dihapus.");
            return;
        }
        if (window.confirm("Hapus user ini secara permanen?")) {
            await storageService.deleteUser(id);
            refreshUsers();
        }
    };

    // Playlist Logic
    const addToPlaylist = () => {
        if (!newMediaTitle || !newMediaUrl) return;
        let embedUrl = newMediaUrl;
        if (newMediaUrl.includes('watch?v=')) {
            embedUrl = newMediaUrl.replace('watch?v=', 'embed/');
        } else if (newMediaUrl.includes('youtu.be/')) {
            embedUrl = newMediaUrl.replace('youtu.be/', 'youtube.com/embed/');
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

    // Backup & Restore Logic
    const exportSystemConfig = () => {
        const data: any = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith('nexus_')) {
                data[key] = localStorage.getItem(key);
            }
        }
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Nexus_Backup_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    };

    const importSystemConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = JSON.parse(evt.target?.result as string);
                Object.keys(data).forEach(key => localStorage.setItem(key, data[key]));
                alert("Konfigurasi Lokal Berhasil Diimpor! Halaman akan dimuat ulang.");
                window.location.reload();
            } catch (err) { alert("Gagal mengimpor file backup."); }
        };
        reader.readAsText(file);
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-20 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Pusat Kendali Admin</h2>
                    <p className="text-sm text-slate-500 font-medium">Manajemen user, playlist media, dan pemeliharaan server.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={exportSystemConfig} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-slate-700 dark:text-white border border-ice-200 dark:border-gray-700 rounded-xl text-sm font-bold shadow-sm hover:bg-ice-50 transition-all"><FileJson size={16}/> Backup Sistem</button>
                    <label className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-indigo-700 cursor-pointer transition-all"><Upload size={16}/> Restore<input type="file" accept=".json" onChange={importSystemConfig} className="hidden"/></label>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* User Management */}
                <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-soft border border-ice-100 dark:border-gray-700 flex flex-col h-full">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl text-indigo-600"><Users size={24}/></div>
                            <h3 className="font-bold text-xl text-slate-800 dark:text-white">Manajemen Staff</h3>
                        </div>
                        <button onClick={() => { setEditingUser(null); setIsUserModalOpen(true); }} className="p-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl shadow-lg transition-all"><Plus size={20}/></button>
                    </div>
                    <div className="space-y-3 flex-1 overflow-y-auto max-h-[400px] custom-scrollbar pr-2">
                        {users.map(u => (
                            <div key={u.id} className="group flex justify-between items-center p-4 bg-slate-50 dark:bg-gray-700/30 rounded-2xl border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900/50 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white dark:bg-gray-700 rounded-2xl flex items-center justify-center text-indigo-600 font-bold text-lg shadow-sm">{u.name.charAt(0)}</div>
                                    <div>
                                        <p className="font-bold text-slate-800 dark:text-white">{u.name}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-xs text-slate-400 font-mono">@{u.username}</span>
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${u.role === 'admin' ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600'}`}>{u.role}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => { setEditingUser(u); setIsUserModalOpen(true); }} className="p-2 text-indigo-500 hover:bg-white dark:hover:bg-gray-700 rounded-xl transition-all"><Edit2 size={16} /></button>
                                    <button onClick={() => handleDeleteUser(u.id)} className="p-2 text-rose-500 hover:bg-white dark:hover:bg-gray-700 rounded-xl transition-all"><Trash2 size={16} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Media Playlist Manager */}
                <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-soft border border-ice-100 dark:border-gray-700 flex flex-col h-full">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-rose-50 dark:bg-rose-900/30 rounded-2xl text-rose-600"><Youtube size={24}/></div>
                        <h3 className="font-bold text-xl text-slate-800 dark:text-white">YouTube Playlist</h3>
                    </div>
                    
                    <div className="flex flex-col gap-3 mb-6 p-4 bg-slate-50 dark:bg-gray-900/50 rounded-2xl border border-dashed border-ice-200 dark:border-gray-700">
                        <input value={newMediaTitle} onChange={e => setNewMediaTitle(e.target.value)} placeholder="Judul Lagu/Video..." className="w-full p-3 border border-ice-100 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-rose-300" />
                        <div className="flex gap-2">
                            <input value={newMediaUrl} onChange={e => setNewMediaUrl(e.target.value)} placeholder="Link YouTube..." className="flex-1 p-3 border border-ice-100 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-rose-300" />
                            <button onClick={addToPlaylist} className="px-4 py-3 bg-rose-600 text-white rounded-xl font-bold shadow-lg hover:bg-rose-700 active:scale-95 transition-all"><Plus size={20}/></button>
                        </div>
                    </div>

                    <div className="space-y-2 flex-1 overflow-y-auto max-h-[250px] custom-scrollbar pr-2">
                        {playlist.map(p => (
                            <div key={p.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${currentMediaUrl === p.url ? 'bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800' : 'bg-white dark:bg-gray-700/20 border-ice-50 dark:border-gray-700'}`}>
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className={`p-2 rounded-lg ${currentMediaUrl === p.url ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-100 dark:bg-gray-700 text-slate-400'}`}><Music size={16}/></div>
                                    <span className={`text-sm font-bold truncate ${currentMediaUrl === p.url ? 'text-rose-700 dark:text-rose-400' : 'text-slate-600 dark:text-gray-300'}`}>{p.title}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    {onUpdateMedia && currentMediaUrl !== p.url && (
                                        <button onClick={() => onUpdateMedia(p.url)} className="p-2 text-emerald-500 hover:bg-white dark:hover:bg-gray-700 rounded-xl transition-all" title="Putar"><Play size={16}/></button>
                                    )}
                                    <button onClick={() => deleteFromPlaylist(p.id)} className="p-2 text-slate-300 hover:text-rose-500 rounded-xl transition-all"><X size={16}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Vercel Proxy Config */}
                <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-soft border border-ice-100 dark:border-gray-700">
                    <h3 className="flex items-center gap-3 font-bold text-xl mb-6 text-slate-800 dark:text-white"><Server size={24} className="text-indigo-500" /> Vercel Proxy Config</h3>
                    <div className="space-y-4">
                         <div>
                             <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Backend API Path</label>
                             <div className="flex gap-2">
                                 <input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} placeholder="/api" className="flex-1 p-3 border border-ice-100 dark:border-gray-700 rounded-xl text-sm font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50/30 dark:bg-gray-900 outline-none focus:ring-2 focus:ring-indigo-300" />
                                 <button onClick={handleSaveConfig} className="bg-slate-800 text-white p-3.5 rounded-xl hover:bg-slate-900 transition-all shadow-lg active:scale-95"><Save size={18}/></button>
                             </div>
                             <p className="text-[10px] text-slate-400 mt-3 flex items-center gap-1.5"><AlertCircle size={12}/> Vercel Proxy meneruskan request ke server VPS di port 5000.</p>
                         </div>
                         <div className={`flex items-center justify-between p-4 rounded-2xl border ${apiUrl.startsWith('/') ? 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-amber-50 border-amber-100 dark:bg-amber-900/20 dark:border-amber-800'}`}>
                             <div className="flex items-center gap-3">
                                 <div className={`p-2 rounded-full ${apiUrl.startsWith('/') ? 'bg-emerald-500' : 'bg-amber-500'} text-white`}><Wifi size={14} /></div>
                                 <span className={`text-sm font-bold ${apiUrl.startsWith('/') ? 'text-emerald-800 dark:text-emerald-400' : 'text-amber-800 dark:text-amber-400'}`}>{apiUrl.startsWith('/') ? 'Proxy Status: Active' : 'Custom External URL'}</span>
                             </div>
                             <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-white dark:bg-gray-800 rounded shadow-sm">VERIFIED</span>
                         </div>
                    </div>
                </div>

                {/* Backup & Migrate Guide */}
                <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl border border-slate-700 text-white flex flex-col">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg"><Terminal size={24}/></div>
                        <h3 className="font-bold text-xl">Backup & Migrate Guide</h3>
                    </div>
                    <div className="flex-1 space-y-4">
                        <div className="p-4 bg-slate-800 rounded-2xl border border-slate-700">
                            <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2">1. Backup Database VPS</h4>
                            <p className="text-[11px] text-slate-400 mb-2">Jalankan perintah ini di terminal VPS lama Anda:</p>
                            <code className="block bg-black p-3 rounded-lg text-[10px] text-emerald-400 break-all border border-slate-950">mysqldump -u dudung -p nexus_wms > nexus_backup.sql</code>
                        </div>
                        <div className="p-4 bg-slate-800 rounded-2xl border border-slate-700">
                            <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2">2. Migrate ke VPS Baru</h4>
                            <p className="text-[11px] text-slate-400 mb-2">Pindahkan file .sql lalu jalankan di VPS baru:</p>
                            {/* FIX: Escaped the '<' symbol to prevent JSX parsing errors */}
                            <code className="block bg-black p-3 rounded-lg text-[10px] text-emerald-400 break-all border border-slate-950">mysql -u root -p nexus_wms {'<'} nexus_backup.sql</code>
                        </div>
                        <div className="p-4 bg-indigo-900/30 rounded-2xl border border-indigo-800/50">
                            <p className="text-xs text-indigo-200 leading-relaxed italic">"Pastikan username dan password MySQL di server baru sama dengan yang terdaftar di file .env backend Nexus agar sistem langsung sinkron."</p>
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
            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl w-full max-md max-w-md overflow-hidden border border-white/20">
                <div className="p-8 border-b border-ice-100 dark:border-gray-800 flex justify-between items-center bg-indigo-50 dark:bg-gray-800">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2"><ShieldCheck size={20}/> {user ? 'Edit Profil Staff' : 'Rekrut Staff Baru'}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full"><X size={24}/></button>
                </div>
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Nama Lengkap</label>
                        <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-ice-100 dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-950 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-300" placeholder="Misal: Ahmad Dani" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Username Login</label>
                        <input required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full border border-ice-100 dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-950 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-300" placeholder="Username unik..." />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Tanggung Jawab (Role)</label>
                        <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as Role})} className="w-full border border-ice-100 dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-950 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-300 appearance-none">
                            <option value="staff">Staff Gudang</option>
                            <option value="admin">Administrator</option>
                            <option value="viewer">Viewer Only</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Password {user && '(Kosongkan jika tetap)'}</label>
                        <input type="password" required={!user} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full border border-ice-100 dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-950 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-300" placeholder={user ? "••••••••" : "Masukkan password"} />
                    </div>
                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl">Batal</button>
                        <button type="submit" className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-xl transition-all active:scale-95 flex items-center gap-2"><Save size={18} /> Simpan Profil</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
