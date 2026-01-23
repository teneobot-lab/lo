
import React, { useState, useEffect } from 'react';
import { User, Role } from '../types';
import { storageService } from '../services/storageService';
import { 
  Settings, Music, Users, Server, Plus, Edit2, Trash2, X, Save, 
  Database, Wifi, Play, Globe, Download, Upload, RefreshCcw, 
  ShieldCheck, Youtube, ListMusic, Terminal, AlertCircle, FileJson, 
  Copy, CheckCircle2, Search, ArrowRight, FileText, Monitor, ChevronDown,
  RotateCcw
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
        try {
            const data = await storageService.getUsers();
            setUsers(data);
        } catch (err) {
            console.error("Gagal mengambil data user:", err);
        }
    };

    const handleSaveConfig = () => {
        if (!apiUrl || apiUrl.trim() === '' || apiUrl === PROXY_PATH) {
            localStorage.removeItem('nexus_api_url');
        } else {
            localStorage.setItem('nexus_api_url', apiUrl.trim());
        }
        alert("Konfigurasi API diperbarui. Halaman akan dimuat ulang untuk sinkronisasi.");
        window.location.reload();
    };

    const handleResetToProxy = () => {
        if (window.confirm("Kembalikan ke settingan standar (Proxy Vercel)?")) {
            localStorage.setItem('nexus_api_url', PROXY_PATH);
            window.location.reload();
        }
    };

    const handleDeleteUser = async (id: string) => {
        if (id === 'admin') {
            alert("Sistem Keamanan: Super Admin tidak bisa dihapus.");
            return;
        }
        if (window.confirm("Hapus akun staff ini secara permanen?")) {
            await storageService.deleteUser(id);
            refreshUsers();
        }
    };

    const addToPlaylist = () => {
        if (!newMediaTitle || !newMediaUrl) return;
        
        let videoId = '';
        const url = newMediaUrl.trim();

        // YouTube Link Parsing Logic (Ultra Robust)
        try {
            if (url.includes('watch?v=')) {
                videoId = url.split('v=')[1]?.split('&')[0];
            } else if (url.includes('youtu.be/')) {
                videoId = url.split('youtu.be/')[1]?.split('?')[0];
            } else if (url.includes('/shorts/')) {
                videoId = url.split('/shorts/')[1]?.split('?')[0];
            } else if (url.includes('/embed/')) {
                videoId = url.split('/embed/')[1]?.split('?')[0];
            } else if (url.length === 11) {
                videoId = url;
            }
        } catch (e) {
            console.error("Link parsing failed", e);
        }

        if (!videoId || videoId.length !== 11) {
            alert("Format link YouTube tidak dikenal. Pastikan ID video benar.");
            return;
        }

        const embedUrl = `https://www.youtube.com/embed/${videoId}`;
        const newItem = { id: Math.random().toString(36).substr(2, 9), title: newMediaTitle, url: embedUrl };
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

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert("Command berhasil disalin! Sekarang buka Terminal/Putty dan klik kanan untuk Paste.");
    };

    const filteredUsers = users.filter(u => 
        u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
        u.username.toLowerCase().includes(userSearch.toLowerCase())
    );

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-24">
            {/* STICKY HEADER - HUB */}
            <div className="sticky top-[-1.5rem] z-[35] pt-4 pb-6 bg-slate-50/80 dark:bg-gray-900/80 backdrop-blur-md -mx-4 px-4 border-b border-ice-100 dark:border-gray-800 transition-all duration-300">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-1">
                        <h2 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-3">
                            Management Hub <Settings className="text-indigo-600 animate-spin-slow" size={32} />
                        </h2>
                        <p className="text-slate-500 dark:text-gray-400 font-medium italic">Konfigurasi infrastruktur dan personil Nexus WMS.</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => { setEditingUser(null); setIsUserModalOpen(true); }} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg hover:bg-indigo-700 transition-all active:scale-95">
                            <Plus size={18}/> Rekrut Staff
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Column 1: Staff & Migration Guide */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Staff List */}
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-soft border border-ice-100 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl text-indigo-600"><Users size={28}/></div>
                                <div>
                                    <h3 className="font-bold text-2xl text-slate-800 dark:text-white">Akses Staff</h3>
                                    <p className="text-xs text-slate-400 font-black uppercase tracking-widest">{users.length} Akun Terdaftar</p>
                                </div>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Cari staff..." className="pl-10 pr-4 py-2 bg-slate-50 dark:bg-gray-900 border border-ice-100 dark:border-gray-700 rounded-xl text-sm outline-none" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredUsers.map(u => (
                                <div key={u.id} className="group flex items-center justify-between p-5 bg-slate-50 dark:bg-gray-900/40 rounded-3xl border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center text-xl font-black text-indigo-600 shadow-sm border border-ice-50 dark:border-gray-700 uppercase">{u.name.charAt(0)}</div>
                                        <div>
                                            <p className="font-bold text-slate-800 dark:text-white leading-tight">{u.name}</p>
                                            <p className="text-[10px] text-slate-400 font-mono">@{u.username}</p>
                                            <span className={`inline-block px-2 py-0.5 mt-1 rounded text-[9px] font-black uppercase tracking-widest ${u.role === 'admin' ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600'}`}>{u.role}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                        <button onClick={() => { setEditingUser(u); setIsUserModalOpen(true); }} className="p-2 text-indigo-500 hover:bg-white dark:hover:bg-gray-800 rounded-lg"><Edit2 size={16}/></button>
                                        <button onClick={() => handleDeleteUser(u.id)} className="p-2 text-rose-500 hover:bg-white dark:hover:bg-gray-800 rounded-xl transition-all" title="Hapus Staff"><Trash2 size={18}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* NEWBIE-FRIENDLY MIGRATION GUIDE */}
                    <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl border border-slate-700 text-white space-y-8 overflow-hidden">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-emerald-600 rounded-2xl text-white shadow-lg"><Monitor size={28}/></div>
                            <div>
                                <h3 className="font-bold text-2xl">Panduan Pindah Server (Migrasi)</h3>
                                <p className="text-xs text-emerald-300 font-black uppercase tracking-[0.2em]">Khusus Newbie / Pemula</p>
                            </div>
                        </div>
                        
                        <div className="space-y-8">
                            <div className="relative pl-8 border-l-2 border-slate-800 group">
                                <div className="absolute -left-[13px] top-0 w-6 h-6 bg-slate-800 rounded-full flex items-center justify-center border-4 border-slate-900 group-hover:bg-indigo-500 transition-colors"><span className="text-[10px] font-bold">1</span></div>
                                <h4 className="text-sm font-bold text-indigo-300 mb-2">SIAPKAN BACKUP (DI SERVER LAMA)</h4>
                                <p className="text-xs text-slate-400 mb-4 leading-relaxed italic">"Ketik perintah di bawah ini di terminal server lama untuk mengambil data."</p>
                                <div className="group/code relative">
                                    <code className="block bg-black p-4 rounded-2xl text-[11px] text-emerald-400 border border-slate-800 font-mono overflow-x-auto">
                                        mysqldump -u root -p nexus_wms {'>'} backup_nexus.sql
                                    </code>
                                    <button onClick={() => copyToClipboard(`mysqldump -u root -p nexus_wms > backup_nexus.sql`)} className="absolute top-2 right-2 p-2 bg-slate-800 text-slate-400 rounded-lg opacity-0 group-hover/code:opacity-100 transition-all"><Copy size={14}/></button>
                                </div>
                            </div>

                            <div className="relative pl-8 border-l-2 border-slate-800 group">
                                <div className="absolute -left-[13px] top-0 w-6 h-6 bg-slate-800 rounded-full flex items-center justify-center border-4 border-slate-900 group-hover:bg-indigo-500 transition-colors"><span className="text-[10px] font-bold">2</span></div>
                                <h4 className="text-sm font-bold text-indigo-300 mb-2">TRANSFER FILE KE SERVER BARU</h4>
                                <p className="text-xs text-slate-400 mb-4 leading-relaxed">Pindahkan file <span className="text-white font-bold">backup_nexus.sql</span> ke server baru. <br/> Tips: Gunakan aplikasi <span className="text-indigo-400 underline">WinSCP</span> atau <span className="text-indigo-400 underline">FileZilla</span> biar tinggal tarik-lepas file gampang.</p>
                            </div>

                            <div className="relative pl-8 border-l-2 border-slate-800 group">
                                <div className="absolute -left-[13px] top-0 w-6 h-6 bg-slate-800 rounded-full flex items-center justify-center border-4 border-slate-900 group-hover:bg-indigo-500 transition-colors"><span className="text-[10px] font-bold">3</span></div>
                                <h4 className="text-sm font-bold text-indigo-300 mb-2">PASANG DATA (DI SERVER BARU)</h4>
                                <p className="text-xs text-slate-400 mb-4 leading-relaxed italic">"Masuk ke terminal server baru, lalu jalankan perintah ini:"</p>
                                <div className="group/code relative">
                                    <code className="block bg-black p-4 rounded-2xl text-[11px] text-emerald-400 border border-slate-800 font-mono overflow-x-auto">
                                        mysql -u root -p nexus_wms {'<'} backup_nexus.sql
                                    </code>
                                    <button onClick={() => copyToClipboard(`mysql -u root -p nexus_wms < backup_nexus.sql`)} className="absolute top-2 right-2 p-2 bg-slate-800 text-slate-400 rounded-lg opacity-0 group-hover/code:opacity-100 transition-all"><Copy size={14}/></button>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 bg-amber-900/20 rounded-3xl border border-amber-800/30 flex items-start gap-4">
                            <AlertCircle className="text-amber-500 flex-shrink-0 mt-1" size={20}/>
                            <div>
                                <p className="text-[11px] font-bold text-amber-200">Catatan Penting:</p>
                                <p className="text-[11px] text-amber-100/70 leading-relaxed italic">"Jika server baru belum punya database, ketik: <b>mysql -u root -p -e 'CREATE DATABASE nexus_wms;'</b> terlebih dahulu di terminal sebelum langkah nomor 3."</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Column 2: Media & Hub Settings */}
                <div className="space-y-8">
                    {/* Media Manager */}
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-soft border border-ice-100 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-4 bg-rose-50 dark:bg-rose-900/30 rounded-2xl text-rose-600"><Youtube size={28}/></div>
                            <h3 className="font-bold text-2xl text-slate-800 dark:text-white">Media Hub</h3>
                        </div>
                        <div className="space-y-4 mb-8 p-6 bg-slate-50 dark:bg-gray-950 rounded-3xl border border-dashed border-ice-200 dark:border-gray-700">
                            <input value={newMediaTitle} onChange={e => setNewMediaTitle(e.target.value)} placeholder="Judul Video..." className="w-full p-3 border border-ice-100 dark:border-gray-800 rounded-xl text-sm bg-white dark:bg-gray-800 outline-none focus:ring-2 focus:ring-rose-300" />
                            <div className="flex gap-2">
                                <input value={newMediaUrl} onChange={e => setNewMediaUrl(e.target.value)} placeholder="ID Video atau URL YouTube..." className="flex-1 p-3 border border-ice-100 dark:border-gray-800 rounded-xl text-sm bg-white dark:bg-gray-800 outline-none" />
                                <button onClick={addToPlaylist} className="bg-rose-600 text-white p-3 rounded-xl hover:bg-rose-700 active:scale-95 transition-all shadow-lg"><Plus size={20}/></button>
                            </div>
                        </div>
                        <div className="space-y-3 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                            {playlist.map(p => (
                                <div key={p.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${currentMediaUrl === p.url ? 'bg-rose-50 border-rose-200 dark:bg-rose-900/20' : 'bg-white dark:bg-gray-800 border-ice-50 dark:border-gray-700'}`}>
                                    <div className="flex items-center gap-3 truncate">
                                        <Music size={16} className={currentMediaUrl === p.url ? 'text-rose-600' : 'text-slate-300'}/>
                                        <p className={`text-sm font-bold truncate ${currentMediaUrl === p.url ? 'text-rose-700 dark:text-rose-300' : 'text-slate-700 dark:text-gray-300'}`}>{p.title}</p>
                                    </div>
                                    <div className="flex gap-1">
                                        {onUpdateMedia && <button onClick={() => onUpdateMedia(p.url)} className={`p-2 rounded-lg transition-all ${currentMediaUrl === p.url ? 'text-rose-600 bg-rose-100' : 'text-emerald-500 hover:bg-emerald-50'}`}><Play size={16}/></button>}
                                        <button onClick={() => deleteFromPlaylist(p.id)} className="p-2 text-slate-300 hover:text-rose-500 rounded-lg"><X size={16}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* API Connection */}
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-soft border border-ice-100 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl text-indigo-600"><Server size={28}/></div>
                            <h3 className="font-bold text-2xl text-slate-800 dark:text-white">API Config</h3>
                        </div>
                        <div className="space-y-4">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Vercel Proxy / VPS URL</label>
                            <div className="flex gap-2">
                                <input value={apiUrl} onChange={e => setApiUrl(e.target.value)} placeholder="/api" className="flex-1 p-3 border border-ice-100 dark:border-gray-700 rounded-xl font-mono text-xs bg-indigo-50/20 dark:bg-gray-900 dark:text-indigo-400 outline-none" />
                                <button onClick={handleSaveConfig} className="bg-slate-800 text-white p-3.5 rounded-xl hover:bg-slate-900 active:scale-95 transition-all shadow-lg" title="Simpan Config"><Save size={18}/></button>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handleResetToProxy} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl font-bold text-[10px] border border-rose-100 dark:border-rose-800 uppercase tracking-wider hover:bg-rose-100 transition-all">
                                    <RefreshCcw size={14} /> Reset ke Proxy Vercel
                                </button>
                            </div>
                            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800/30 flex items-center gap-3">
                                <Wifi size={16} className="text-emerald-500"/>
                                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Status API: Aktif</span>
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
    const [formData, setFormData] = useState({ name: user?.name || '', username: user?.username || '', role: user?.role || 'staff', password: '' });
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.username) return;
        setIsSaving(true);
        try {
            const newUser: User = { 
                id: user?.id || Math.random().toString(36).substr(2, 9), 
                name: formData.name, 
                username: formData.username, 
                role: formData.role as Role 
            };
            await storageService.saveUser(newUser, formData.password || undefined);
            onSave();
        } catch (err) {
            alert("Gagal menyimpan staff. Pastikan server API Abang sudah running di VPS.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in zoom-in duration-200">
            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-white/10">
                <div className="p-8 border-b border-ice-100 dark:border-gray-800 flex justify-between items-center bg-indigo-50 dark:bg-gray-800">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-3"><ShieldCheck size={20} className="text-indigo-600"/> {user ? 'Edit Profil Staff' : 'Rekrut Staff Baru'}</h3>
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
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Role / Jabatan</label>
                        <div className="relative">
                            <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as Role})} className="w-full border border-ice-100 dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-950 text-slate-800 dark:text-white outline-none appearance-none focus:ring-4 focus:ring-indigo-500/10">
                                <option value="staff">Staff Gudang</option>
                                <option value="admin">Administrator</option>
                                <option value="viewer">Viewer Only</option>
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16}/>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Password {user && '(Kosongkan jika tetap)'}</label>
                        <input type="password" required={!user} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full border border-ice-100 dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-950 text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10" placeholder={user ? "••••••••" : "Masukkan password baru"} />
                    </div>
                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-gray-800 rounded-xl transition-all">Batal</button>
                        <button type="submit" disabled={isSaving} className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-xl transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50">
                            {isSaving ? <RefreshCcw size={18} className="animate-spin" /> : <Save size={18} />} 
                            {isSaving ? 'Menyimpan...' : 'Simpan Profil Staff'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
