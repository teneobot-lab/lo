
import React, { useState, useEffect } from 'react';
import { User, Role } from '../types';
import { storageService } from '../services/storageService';
import { googleSheetsService } from '../services/googleSheetsService';
import { geminiService } from '../services/geminiService';
import { 
  Settings, Music, Users, Server, Plus, Edit2, Trash2, X, Save, 
  RefreshCcw, ShieldCheck, Youtube, Copy, Search, ArrowRight, 
  Table, Link2, CloudUpload, FileJson, ChevronDown, Wifi, Play, Sparkles, Loader2
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
    const [sheetUrl, setSheetUrl] = useState('');
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [userSearch, setUserSearch] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);
    
    const [playlist, setPlaylist] = useState<PlaylistItem[]>(() => {
        const saved = localStorage.getItem('nexus_media_playlist');
        return saved ? JSON.parse(saved) : [{ id: '1', title: 'Nexus Lo-Fi Relaxing', url: 'https://www.youtube.com/embed/jfKfPfyJRdk' }];
    });
    
    // Media State
    const [mediaSearchQuery, setMediaSearchQuery] = useState('');
    const [isSearchingMedia, setIsSearchingMedia] = useState(false);

    const PROXY_PATH = '/api';

    useEffect(() => {
        refreshUsers();
        const stored = localStorage.getItem('nexus_api_url');
        const storedSheet = localStorage.getItem('nexus_sheet_webhook');
        setApiUrl(stored || PROXY_PATH);
        setSheetUrl(storedSheet || '');
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
        localStorage.setItem('nexus_api_url', apiUrl.trim());
        localStorage.setItem('nexus_sheet_webhook', sheetUrl.trim());
        alert("Konfigurasi disimpan!");
        if (apiUrl !== (localStorage.getItem('nexus_api_url') || PROXY_PATH)) {
            window.location.reload();
        }
    };

    const handleSyncNow = async (module: 'Inventory' | 'Transactions') => {
        if (!sheetUrl) {
            alert("Harap isi URL Apps Script terlebih dahulu!");
            return;
        }
        setIsSyncing(true);
        try {
            let data: any[] = [];
            if (module === 'Inventory') {
                const items = await storageService.getItems();
                data = items.map(i => ({
                    SKU: i.sku,
                    Nama: i.name,
                    Kategori: i.category,
                    Harga: i.price,
                    Lokasi: i.location,
                    Unit: i.unit,
                    Stok: i.stock,
                    Min_Stok: i.minLevel,
                    Status: i.active ? 'Aktif' : 'Non-Aktif',
                    Tgl_Sync: new Date().toLocaleString('id-ID')
                }));
            } else {
                const trxs = await storageService.getTransactions();
                trxs.forEach(t => {
                    t.items.forEach(it => {
                        data.push({
                            ID_TRX: t.id,
                            Tipe: t.type,
                            Tanggal: t.date,
                            SKU: it.sku,
                            Barang: it.name,
                            Qty: it.qty,
                            Unit: it.uom,
                            Total: it.total,
                            Supplier: t.supplier || '-',
                            User: t.userId
                        });
                    });
                });
            }

            await googleSheetsService.sync(sheetUrl, { type: module, data });
            alert(`✅ Perintah sinkronisasi ${module} terkirim!\n\nCatatan: Karena pembatasan keamanan Google, status 'Success' tidak bisa dibaca langsung, tapi data akan muncul di Sheet dalam beberapa detik.`);
        } catch (err: any) {
            alert("Gagal: " + err.message);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleDeleteUser = async (id: string) => {
        if (id === 'admin') return;
        if (window.confirm("Hapus staff ini?")) {
            await storageService.deleteUser(id);
            refreshUsers();
        }
    };

    const handleAISearchMedia = async () => {
        if (!mediaSearchQuery.trim()) return;
        setIsSearchingMedia(true);

        try {
            const result = await geminiService.findYoutubeVideo(mediaSearchQuery);
            
            if (result && result.url) {
                // Convert Standard URL to Embed URL
                let embedUrl = result.url;
                
                // Regex to extract video ID from various YouTube URL formats
                const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
                const match = result.url.match(regExp);

                if (match && match[2].length === 11) {
                    embedUrl = `https://www.youtube.com/embed/${match[2]}?autoplay=1`;
                }

                const newItem = { 
                    id: Math.random().toString(36).substr(2, 9), 
                    title: result.title, 
                    url: embedUrl 
                };

                const next = [...playlist, newItem];
                setPlaylist(next);
                localStorage.setItem('nexus_media_playlist', JSON.stringify(next));
                setMediaSearchQuery('');
            } else {
                alert("AI tidak dapat menemukan video yang sesuai. Coba kata kunci lain.");
            }
        } catch (error) {
            alert("Gagal mencari media. Pastikan API Key valid.");
        } finally {
            setIsSearchingMedia(false);
        }
    };

    const deleteFromPlaylist = (id: string) => {
        const next = playlist.filter(p => p.id !== id);
        setPlaylist(next);
        localStorage.setItem('nexus_media_playlist', JSON.stringify(next));
    };

    const appsScriptCode = `function doPost(e) {
  // Cegah error jika diklik "Jalankan" manual di editor
  if (!e || !e.postData) {
    return ContentService.createTextOutput("Nexus Webhook is Active. Jangan klik 'Jalankan' di editor, gunakan 'Deploy' saja.").setMimeType(ContentService.MimeType.TEXT);
  }

  try {
    var contents = JSON.parse(e.postData.contents);
    var type = contents.type; 
    var data = contents.data; 
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(type) || ss.insertSheet(type);
    
    sheet.clear();
    
    if (data && data.length > 0) {
      // Ambil header dari key objek pertama
      var headers = Object.keys(data[0]);
      sheet.appendRow(headers);
      
      // Map data ke format baris
      var rows = data.map(function(item) {
        return headers.map(function(h) {
          return item[h];
        });
      });
      
      // Tulis semua baris sekaligus (efisien)
      sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
      
      // Styling Header biar cakep
      sheet.getRange(1, 1, 1, headers.length)
           .setBackground("#4F8CFF")
           .setFontColor("white")
           .setFontWeight("bold");
      sheet.setFrozenRows(1);
    }
    
    return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
  } catch (err) {
    return ContentService.createTextOutput("Error: " + err.message).setMimeType(ContentService.MimeType.TEXT);
  }
}`;

    const filteredUsers = users.filter(u => 
        u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
        u.username.toLowerCase().includes(userSearch.toLowerCase())
    );

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-24">
            <div className="sticky top-[-1.5rem] z-[35] pt-4 pb-6 bg-slate-50/80 dark:bg-gray-900/80 backdrop-blur-md -mx-4 px-4 border-b border-ice-100 dark:border-gray-800 transition-all duration-300">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-1">
                        <h2 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-3">
                            Management Hub <Settings className="text-indigo-600 animate-spin-slow" size={32} />
                        </h2>
                        <p className="text-slate-500 dark:text-gray-400 font-medium italic">Konfigurasi infrastruktur dan personil Nexus WMS.</p>
                    </div>
                    <button onClick={() => { setEditingUser(null); setIsUserModalOpen(true); }} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg hover:bg-indigo-700 transition-all active:scale-95">
                        <Plus size={18}/> Rekrut Staff
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {/* Google Sheets Card */}
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-soft border border-emerald-100 dark:border-emerald-900/30 overflow-hidden relative group">
                        <div className="absolute -right-12 -top-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl"></div>
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl text-emerald-600 shadow-sm"><Table size={28}/></div>
                            <div>
                                <h3 className="font-bold text-2xl text-slate-800 dark:text-white">Google Sheets Integration</h3>
                                <p className="text-xs text-emerald-600 font-black uppercase tracking-widest">Row-by-Row Cloud Sync</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Apps Script Web App URL</label>
                                <div className="flex gap-2">
                                    <input 
                                        value={sheetUrl} 
                                        onChange={e => setSheetUrl(e.target.value)} 
                                        placeholder="https://script.google.com/macros/s/.../exec" 
                                        className="flex-1 p-3.5 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl text-sm bg-emerald-50/20 dark:bg-gray-900 dark:text-emerald-400 outline-none focus:ring-2 focus:ring-emerald-300 font-mono" 
                                    />
                                    <button onClick={handleSaveConfig} className="bg-emerald-600 text-white px-6 rounded-2xl hover:bg-emerald-700 shadow-lg active:scale-95 transition-all flex items-center gap-2 font-bold">
                                        <Save size={18}/> Simpan
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <button onClick={() => handleSyncNow('Inventory')} disabled={isSyncing} className="flex items-center justify-center gap-3 p-6 bg-slate-50 dark:bg-gray-900 border border-emerald-100 dark:border-emerald-900/20 rounded-3xl hover:bg-emerald-50 transition-all group">
                                    {isSyncing ? <RefreshCcw size={24} className="animate-spin text-emerald-600" /> : <CloudUpload size={24} className="text-emerald-600 group-hover:scale-110 transition-transform"/>}
                                    <div className="text-left"><p className="font-bold text-slate-800 dark:text-white">Sync Inventory</p><p className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Master Stok Per Baris</p></div>
                                </button>
                                <button onClick={() => handleSyncNow('Transactions')} disabled={isSyncing} className="flex items-center justify-center gap-3 p-6 bg-slate-50 dark:bg-gray-900 border border-emerald-100 dark:border-emerald-900/20 rounded-3xl hover:bg-emerald-50 transition-all group">
                                    {isSyncing ? <RefreshCcw size={24} className="animate-spin text-emerald-600" /> : <FileJson size={24} className="text-emerald-600 group-hover:scale-110 transition-transform"/>}
                                    <div className="text-left"><p className="font-bold text-slate-800 dark:text-white">Sync History</p><p className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Log Transaksi Per Baris</p></div>
                                </button>
                            </div>

                            <div className="p-6 bg-slate-50 dark:bg-gray-950 rounded-3xl border border-ice-100 dark:border-gray-800 space-y-4">
                                <h4 className="text-xs font-bold text-slate-700 dark:text-gray-300 flex items-center gap-2"><Link2 size={14}/> Cara Setup (Penting!):</h4>
                                <ol className="text-[11px] text-slate-500 space-y-2 list-decimal ml-4">
                                    <li>Buka Google Sheets, klik <b>Extensions &gt; Apps Script</b>.</li>
                                    <li>Ganti semua kode di sana dengan kode di bawah ini.</li>
                                    <li>Klik <b>Deploy &gt; New Deployment</b>. Pilih tipe <b>Web App</b>.</li>
                                    <li>Set "Who has access" ke <b>Anyone</b>. Klik Deploy.</li>
                                    <li><b>JANGAN</b> klik tombol "Jalankan" di editor GAS, cukup ambil URL-nya saja.</li>
                                </ol>
                                <div className="group relative">
                                    <code className="block bg-black p-4 rounded-xl text-[10px] text-emerald-400 border border-slate-800 font-mono overflow-x-auto h-32 custom-scrollbar">
                                        {appsScriptCode}
                                    </code>
                                    <button onClick={() => { navigator.clipboard.writeText(appsScriptCode); alert("Disalin!"); }} className="absolute top-2 right-2 p-2 bg-slate-800 text-slate-400 rounded-lg transition-all hover:text-white"><Copy size={12}/></button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Staff List */}
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-soft border border-ice-100 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl text-indigo-600"><Users size={28}/></div>
                                <div><h3 className="font-bold text-2xl text-slate-800 dark:text-white">Akses Staff</h3><p className="text-xs text-slate-400 font-black uppercase tracking-widest">{users.length} Akun Terdaftar</p></div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredUsers.map(u => (
                                <div key={u.id} className="group flex items-center justify-between p-5 bg-slate-50 dark:bg-gray-900/40 rounded-3xl border border-transparent hover:border-indigo-100 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center text-xl font-black text-indigo-600 shadow-sm uppercase">{u.name.charAt(0)}</div>
                                        <div><p className="font-bold text-slate-800 dark:text-white leading-tight">{u.name}</p><p className="text-[10px] text-slate-400 font-mono">@{u.username}</p></div>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                        <button onClick={() => { setEditingUser(u); setIsUserModalOpen(true); }} className="p-2 text-indigo-500 hover:bg-white rounded-lg"><Edit2 size={16}/></button>
                                        <button onClick={() => handleDeleteUser(u.id)} className="p-2 text-rose-500 hover:bg-white rounded-xl"><Trash2 size={18}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    {/* API Connection */}
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-soft border border-ice-100 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl text-indigo-600"><Server size={28}/></div>
                            <h3 className="font-bold text-2xl text-slate-800 dark:text-white">API Config</h3>
                        </div>
                        <div className="space-y-4">
                            <input value={apiUrl} onChange={e => setApiUrl(e.target.value)} placeholder="/api" className="w-full p-3 border border-ice-100 dark:border-gray-700 rounded-xl font-mono text-xs bg-indigo-50/20 dark:bg-gray-900 dark:text-indigo-400 outline-none" />
                            <button onClick={handleSaveConfig} className="w-full bg-slate-800 text-white p-3 rounded-xl hover:bg-slate-900 active:scale-95 transition-all shadow-lg font-bold">Simpan API Config</button>
                        </div>
                    </div>

                    {/* Media Hub - AI Enhanced */}
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-soft border border-ice-100 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-4 bg-rose-50 dark:bg-rose-900/30 rounded-2xl text-rose-600"><Youtube size={28}/></div>
                            <h3 className="font-bold text-2xl text-slate-800 dark:text-white">Media Hub</h3>
                        </div>
                        
                        {/* AI Search Bar */}
                        <div className="mb-6 relative">
                            <label className="text-[10px] font-bold text-rose-400 uppercase tracking-widest block mb-2">AI Media Search</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input 
                                        type="text"
                                        value={mediaSearchQuery}
                                        onChange={e => setMediaSearchQuery(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAISearchMedia()}
                                        placeholder="Cari lagu/video (Contoh: 'Lofi hip hop radio')"
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 dark:text-white"
                                        disabled={isSearchingMedia}
                                    />
                                </div>
                                <button 
                                    onClick={handleAISearchMedia}
                                    disabled={isSearchingMedia || !mediaSearchQuery}
                                    className="bg-rose-500 hover:bg-rose-600 text-white p-3 rounded-xl shadow-lg shadow-rose-200 dark:shadow-rose-900/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSearchingMedia ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} fill="currentColor" className="text-white" />}
                                </button>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-2 italic">
                                *AI akan mencari link YouTube dan otomatis menambahkannya ke playlist.
                            </p>
                        </div>

                        <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar pr-2">
                            {playlist.map(p => (
                                <div key={p.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${currentMediaUrl === p.url ? 'bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800' : 'bg-white border-ice-50 dark:bg-gray-900 dark:border-gray-800'}`}>
                                    <div className="flex-1 min-w-0 pr-2">
                                        <p className="text-sm font-bold truncate text-gray-800 dark:text-gray-200">{p.title}</p>
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                        <button onClick={() => onUpdateMedia?.(p.url)} className="p-2 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"><Play size={16} fill="currentColor"/></button>
                                        <button onClick={() => deleteFromPlaylist(p.id)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"><X size={16}/></button>
                                    </div>
                                </div>
                            ))}
                            {playlist.length === 0 && (
                                <div className="text-center p-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
                                    <Music className="mx-auto text-gray-300 mb-2" size={24} />
                                    <p className="text-xs text-gray-400">Playlist kosong</p>
                                </div>
                            )}
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
            alert("Gagal menyimpan staff.");
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
                        <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-ice-100 dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-950 text-slate-800 dark:text-white outline-none" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Username Login</label>
                        <input required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full border border-ice-100 dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-950 text-slate-800 dark:text-white outline-none" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Role</label>
                        <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as Role})} className="w-full border border-ice-100 dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-950 text-slate-800 dark:text-white outline-none">
                            <option value="staff">Staff Gudang</option>
                            <option value="admin">Administrator</option>
                            <option value="viewer">Viewer Only</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Password</label>
                        <input type="password" required={!user} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full border border-ice-100 dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-950 text-slate-800 dark:text-white outline-none" placeholder="••••••••" />
                    </div>
                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl">Batal</button>
                        <button type="submit" disabled={isSaving} className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-xl disabled:opacity-50">
                            {isSaving ? <RefreshCcw size={18} className="animate-spin" /> : <Save size={18} />} 
                            {isSaving ? 'Menyimpan...' : 'Simpan Staff'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
