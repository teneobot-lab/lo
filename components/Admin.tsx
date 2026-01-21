
import React, { useState, useEffect } from 'react';
import { User, Role } from '../types';
import { storageService } from '../services/storageService';
import { Settings, Music, Users, Server, Plus, Edit2, Trash2, X, Save, Database, Wifi, WifiOff, Play, Link, Globe } from 'lucide-react';

interface AdminProps {
    currentMediaUrl?: string;
    onUpdateMedia?: (url: string) => void;
}

export const Admin: React.FC<AdminProps> = ({ currentMediaUrl, onUpdateMedia }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [apiUrl, setApiUrl] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    // Default use the proxy path
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

    const handleDelete = async (id: string) => {
        if (id === 'admin') {
            alert("Tidak bisa menghapus akun admin utama.");
            return;
        }
        if (window.confirm("Hapus user ini?")) {
            await storageService.deleteUser(id);
            refreshUsers();
        }
    };

    const isLocalMode = apiUrl === 'local';

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-dark dark:text-white mb-4">Control Center</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* User Management */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-soft border border-slate-100 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="flex items-center gap-2 font-bold text-lg text-dark dark:text-white">
                            <Users size={20} className="text-primary" /> User Management
                        </h3>
                    </div>
                    <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
                        {users.map(u => (
                            <div key={u.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-gray-700/50 rounded-xl">
                                <div>
                                    <p className="font-semibold text-sm dark:text-gray-200">{u.name}</p>
                                    <p className="text-xs text-muted dark:text-gray-400">@{u.username}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-1 bg-white dark:bg-gray-600 border border-border dark:border-gray-500 rounded text-[10px] uppercase font-bold text-muted dark:text-gray-300">{u.role}</span>
                                    <button onClick={() => { setEditingUser(u); setIsModalOpen(true); }} className="p-1.5 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"><Edit2 size={14} /></button>
                                    <button onClick={() => handleDelete(u.id)} className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"><Trash2 size={14} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button onClick={() => { setEditingUser(null); setIsModalOpen(true); }} className="mt-4 w-full py-2 border border-dashed border-primary text-primary rounded-xl text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center justify-center gap-2"><Plus size={16} /> Add New User</button>
                </div>

                {/* Database Connection */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-soft border border-slate-100 dark:border-gray-700">
                    <h3 className="flex items-center gap-2 font-bold text-lg mb-4 text-dark dark:text-white"><Server size={20} className="text-indigo-500" /> Vercel Proxy Config</h3>
                    <div className="space-y-4">
                         <div>
                             <label className="block text-xs font-bold text-muted dark:text-gray-400 uppercase mb-1">Backend API Path</label>
                             <div className="flex gap-2">
                                 <input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} placeholder="/api" className="flex-1 p-3 border border-border dark:border-gray-600 rounded-lg text-sm font-mono text-slate-600 dark:text-gray-300 bg-slate-50 dark:bg-gray-900 focus:ring-2 focus:ring-primary outline-none" />
                                 <button onClick={handleSaveConfig} className="bg-primary text-white p-3 rounded-lg hover:bg-blue-600 transition-all shadow-md"><Save size={18}/></button>
                             </div>
                             <p className="text-[10px] text-muted dark:text-gray-500 mt-2">
                                💡 Gunakan <code>/api</code> agar Vercel meneruskan data ke VPS <code>165.245.187.238</code> secara aman.
                             </p>
                         </div>
                         
                         <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
                            <div className="flex items-start gap-3">
                                <Globe size={18} className="text-indigo-600 mt-0.5" />
                                <div>
                                    <p className="text-sm font-bold text-indigo-900 dark:text-indigo-300">Status Proxy Aktif</p>
                                    <p className="text-xs text-indigo-700 dark:text-indigo-400 mt-0.5">Frontend Vercel akan otomatis me-route semua request dari <code>/api</code> ke server backend di port <code>5000</code>.</p>
                                </div>
                            </div>
                         </div>

                         <div className={`flex items-center justify-between p-3 rounded-xl border ${!isLocalMode ? 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20' : 'bg-amber-50 border-amber-100 dark:bg-amber-900/20'}`}>
                             <div className="flex items-center gap-2">
                                 {!isLocalMode ? <Wifi size={16} className="text-emerald-600" /> : <WifiOff size={16} className="text-amber-600" />}
                                 <span className={`text-sm font-medium ${!isLocalMode ? 'text-emerald-800 dark:text-emerald-400' : 'text-amber-800 dark:text-amber-400'}`}>{!isLocalMode ? 'Connected via Proxy' : 'Offline Mode'}</span>
                             </div>
                             <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${!isLocalMode ? 'bg-emerald-200 text-emerald-800' : 'bg-amber-200 text-amber-800'}`}>ONLINE</span>
                         </div>
                    </div>
                </div>
            </div>
            {isModalOpen && <UserModal user={editingUser} onClose={() => setIsModalOpen(false)} onSave={() => { refreshUsers(); setIsModalOpen(false); }} />}
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="p-6 border-b border-border dark:border-gray-800 flex justify-between items-center bg-slate-50 dark:bg-gray-800/50">
                    <h3 className="text-xl font-bold text-dark dark:text-white">{user ? 'Edit User' : 'New User'}</h3>
                    <button onClick={onClose} className="text-muted dark:text-gray-400 hover:text-dark dark:hover:text-white"><X size={24}/></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-muted dark:text-gray-400 uppercase mb-1">Full Name</label>
                        <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border dark:border-gray-700 p-2 rounded-lg bg-white dark:bg-gray-950 text-dark dark:text-white" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-muted dark:text-gray-400 uppercase mb-1">Username</label>
                        <input required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full border dark:border-gray-700 p-2 rounded-lg bg-white dark:bg-gray-950 text-dark dark:text-white" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-muted dark:text-gray-400 uppercase mb-1">Role</label>
                        <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as Role})} className="w-full border dark:border-gray-700 p-2 rounded-lg bg-white dark:bg-gray-950 text-dark dark:text-white">
                            <option value="staff">Staff</option>
                            <option value="admin">Admin</option>
                            <option value="viewer">Viewer</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-muted dark:text-gray-400 uppercase mb-1">Password {user && '(Kosongkan jika tetap)'}</label>
                        <input type="password" required={!user} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full border dark:border-gray-700 p-2 rounded-lg bg-white dark:bg-gray-950 text-dark dark:text-white" placeholder={user ? "********" : "Enter password"} />
                    </div>
                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-5 py-2 text-muted dark:text-gray-400 font-medium hover:bg-slate-100 dark:hover:bg-gray-800 rounded-xl">Cancel</button>
                        <button type="submit" className="px-5 py-2 bg-primary text-white font-medium rounded-xl hover:bg-blue-600 transition-all flex items-center gap-2 shadow-md"><Save size={18} /> Save User</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
