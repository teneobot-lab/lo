import React, { useState, useEffect } from 'react';
import { User, Role } from '../types';
import { storageService } from '../services/storageService';
import { Settings, Music, Users, Server, Plus, Edit2, Trash2, X, Save, Database, Wifi, WifiOff } from 'lucide-react';

export const Admin: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [apiUrl, setApiUrl] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    // Default VPS URL
    const DEFAULT_VPS = 'http://178.128.106.33:5000/api';

    useEffect(() => {
        refreshUsers();
        // Load API config or default
        const stored = localStorage.getItem('nexus_api_url');
        setApiUrl(stored || DEFAULT_VPS);
    }, []);

    const refreshUsers = async () => {
        setUsers(await storageService.getUsers());
    };

    const handleSaveConfig = () => {
        // If user clears the field, we assume they want the default VPS
        // If they type 'local', we set local mode
        // If they type a URL, we use that
        if (!apiUrl || apiUrl === DEFAULT_VPS) {
            localStorage.removeItem('nexus_api_url');
            alert("Reverted to Default VPS Configuration.");
        } else {
            localStorage.setItem('nexus_api_url', apiUrl);
            alert("Custom Configuration saved.");
        }
        window.location.reload();
    };

    const handleDelete = async (id: string) => {
        if (id === 'admin') {
            alert("Cannot delete the main admin account.");
            return;
        }
        if (window.confirm("Are you sure you want to delete this user?")) {
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
                    
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                        {users.map(u => (
                            <div key={u.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-gray-700/50 rounded-xl">
                                <div>
                                    <p className="font-semibold text-sm dark:text-gray-200">{u.name}</p>
                                    <p className="text-xs text-muted dark:text-gray-400">@{u.username}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-1 bg-white dark:bg-gray-600 border border-border dark:border-gray-500 rounded text-xs uppercase font-bold text-muted dark:text-gray-300">{u.role}</span>
                                    <button 
                                        onClick={() => { setEditingUser(u); setIsModalOpen(true); }}
                                        className="p-1.5 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(u.id)}
                                        className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button 
                        onClick={() => { setEditingUser(null); setIsModalOpen(true); }}
                        className="mt-4 w-full py-2 border border-dashed border-primary text-primary rounded-xl text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center justify-center gap-2"
                    >
                        <Plus size={16} /> Add New User
                    </button>
                </div>

                {/* System Config */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-soft border border-slate-100 dark:border-gray-700">
                    <h3 className="flex items-center gap-2 font-bold text-lg mb-4 text-dark dark:text-white">
                        <Server size={20} className="text-indigo-500" /> Database Connection
                    </h3>
                    <div className="space-y-4">
                         <div>
                             <label className="block text-xs font-bold text-muted dark:text-gray-400 uppercase mb-1">Backend API URL</label>
                             <div className="flex gap-2">
                                 <input 
                                    value={apiUrl} 
                                    onChange={(e) => setApiUrl(e.target.value)}
                                    placeholder="e.g. http://178.128.106.33:5000/api"
                                    className="flex-1 p-3 border border-border dark:border-gray-600 rounded-lg text-sm font-mono text-slate-600 dark:text-gray-300 bg-slate-50 dark:bg-gray-900 focus:ring-2 focus:ring-primary outline-none" 
                                 />
                                 <button onClick={handleSaveConfig} className="bg-primary text-white p-3 rounded-lg hover:bg-blue-600"><Save size={18}/></button>
                             </div>
                             <p className="text-[10px] text-muted dark:text-gray-500 mt-2">
                                * Default VPS: <code>{DEFAULT_VPS}</code><br/>
                                * To work offline with Browser Storage, type <code>local</code> and save.
                             </p>
                         </div>
                         <div className={`flex items-center justify-between p-3 rounded-xl border ${!isLocalMode ? 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20' : 'bg-amber-50 border-amber-100 dark:bg-amber-900/20'}`}>
                             <div className="flex items-center gap-2">
                                 {!isLocalMode ? <Wifi size={16} className="text-emerald-600" /> : <WifiOff size={16} className="text-amber-600" />}
                                 <span className={`text-sm font-medium ${!isLocalMode ? 'text-emerald-800 dark:text-emerald-400' : 'text-amber-800 dark:text-amber-400'}`}>
                                     {!isLocalMode ? 'Connected to VPS Database' : 'Offline Mode (Local Storage)'}
                                 </span>
                             </div>
                             <span className={`text-xs px-2 py-1 rounded-full font-bold ${!isLocalMode ? 'bg-emerald-200 text-emerald-800' : 'bg-amber-200 text-amber-800'}`}>
                                 Active
                             </span>
                         </div>
                    </div>
                </div>

                {/* Media Center */}
                <div className="md:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-soft border border-slate-100 dark:border-gray-700">
                    <h3 className="flex items-center gap-2 font-bold text-lg mb-4 text-dark dark:text-white">
                        <Music size={20} className="text-rose-500" /> Admin Media Center
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="aspect-video rounded-xl overflow-hidden bg-black">
                            <iframe 
                                width="100%" 
                                height="100%" 
                                src="https://www.youtube.com/embed/jfKfPfyJRdk?si=relaxing-music" 
                                title="YouTube video player" 
                                frameBorder="0" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                allowFullScreen
                            ></iframe>
                        </div>
                         <div className="flex flex-col justify-center bg-slate-50 dark:bg-gray-700/30 p-6 rounded-xl text-center space-y-2">
                             <p className="text-muted dark:text-gray-400 text-sm">Play some Lo-Fi beats while managing the warehouse.</p>
                             <div className="h-1 w-20 bg-slate-200 dark:bg-gray-600 mx-auto rounded-full"></div>
                             <p className="text-xs text-slate-400 dark:text-gray-500">Integrated Widget</p>
                         </div>
                    </div>
                </div>
            </div>

            {isModalOpen && (
                <UserModal 
                    user={editingUser} 
                    onClose={() => setIsModalOpen(false)} 
                    onSave={() => {
                        refreshUsers();
                        setIsModalOpen(false);
                    }} 
                />
            )}
        </div>
    );
};

const UserModal = ({ user, onClose, onSave }: { user: User | null, onClose: () => void, onSave: () => void }) => {
    const [formData, setFormData] = useState({
        name: user?.name || '',
        username: user?.username || '',
        role: user?.role || 'staff',
        password: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const newUser: User = {
            id: user?.id || crypto.randomUUID(),
            name: formData.name,
            username: formData.username,
            role: formData.role as Role
        };
        await storageService.saveUser(newUser, formData.password || undefined);
        onSave();
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
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
                        <label className="block text-xs font-semibold text-muted dark:text-gray-400 uppercase mb-1">Password {user && '(Leave blank to keep current)'}</label>
                        <input 
                            type="password" 
                            required={!user}
                            value={formData.password} 
                            onChange={e => setFormData({...formData, password: e.target.value})} 
                            className="w-full border dark:border-gray-700 p-2 rounded-lg bg-white dark:bg-gray-950 text-dark dark:text-white" 
                            placeholder={user ? "********" : "Enter password"}
                        />
                    </div>
                    
                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-5 py-2 text-muted dark:text-gray-400 font-medium hover:bg-slate-100 dark:hover:bg-gray-800 rounded-xl">Cancel</button>
                        <button type="submit" className="px-5 py-2 bg-primary text-white font-medium rounded-xl hover:bg-blue-600 transition-all flex items-center gap-2">
                            <Save size={18} /> Save User
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};