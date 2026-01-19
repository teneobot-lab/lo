import React, { useState, useEffect } from 'react';
import { User, Role } from '../types';
import { storageService } from '../services/storageService';
import { Settings, Music, Users, Server, Plus, Edit2, Trash2, X, Save } from 'lucide-react';
import { ToastType } from './Toast';

interface AdminProps {
    notify: (msg: string, type: ToastType) => void;
}

export const Admin: React.FC<AdminProps> = ({ notify }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [apiUrl, setApiUrl] = useState('https://api.nexus-wms.com/v1');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    useEffect(() => {
        refreshUsers();
    }, []);

    const refreshUsers = () => {
        setUsers(storageService.getUsers());
    };

    const handleDelete = (id: string) => {
        if (id === 'admin') {
            notify("Cannot delete super admin account.", 'error');
            return;
        }
        if (window.confirm("Are you sure you want to delete this user?")) {
            try {
                storageService.deleteUser(id);
                refreshUsers();
                notify('User account deleted', 'success');
            } catch (e) {
                notify('Failed to delete user', 'error');
            }
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
            <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-4 tracking-tight">Control Center</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-card p-6 rounded-2xl shadow-glass">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="flex items-center gap-2 font-black text-lg text-slate-800 dark:text-white tracking-tight">
                            <Users size={20} className="text-primary" /> User Management
                        </h3>
                    </div>
                    
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                        {users.map(u => (
                            <div key={u.id} className="flex justify-between items-center p-4 bg-slate-50/50 dark:bg-slate-800/50 border border-slate-100/50 dark:border-slate-700/50 rounded-xl transition-colors">
                                <div>
                                    <p className="font-bold text-sm text-slate-800 dark:text-slate-100">{u.name}</p>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">@{u.username}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-1 bg-white dark:bg-slate-700 border border-slate-200/50 dark:border-slate-600/50 rounded text-[9px] uppercase font-black text-slate-500 dark:text-slate-400">{u.role}</span>
                                    <button 
                                        onClick={() => { setEditingUser(u); setIsModalOpen(true); }}
                                        className="p-1.5 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg transition-all"
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(u.id)}
                                        className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-all"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button 
                        onClick={() => { setEditingUser(null); setIsModalOpen(true); }}
                        className="mt-6 w-full py-3 border border-dashed border-primary/50 text-primary rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
                    >
                        <Plus size={16} strokeWidth={3} /> Add New User
                    </button>
                </div>

                <div className="glass-card p-6 rounded-2xl shadow-glass">
                    <h3 className="flex items-center gap-2 font-black text-lg mb-6 text-slate-800 dark:text-white tracking-tight">
                        <Server size={20} className="text-indigo-500" /> System Configuration
                    </h3>
                    <div className="space-y-5">
                         <div>
                             <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Backend API Endpoint</label>
                             <input 
                                value={apiUrl} 
                                onChange={(e) => setApiUrl(e.target.value)}
                                className="w-full p-3 border border-slate-200/50 dark:border-slate-700/50 rounded-xl text-xs font-mono text-slate-600 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-800/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                             />
                             <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 font-medium italic">Supports Vercel Proxy for SSL/Mixed Content</p>
                         </div>
                         <div className="flex items-center justify-between p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100/50 dark:border-emerald-800/50 transition-colors">
                             <span className="text-xs font-black uppercase tracking-widest text-emerald-800 dark:text-emerald-400">Database Sync</span>
                             <span className="text-[10px] bg-emerald-500 text-white px-2.5 py-1 rounded-full font-black uppercase shadow-lg shadow-emerald-500/20">Active</span>
                         </div>
                    </div>
                </div>

                <div className="md:col-span-2 glass-card p-6 rounded-2xl shadow-glass">
                    <h3 className="flex items-center gap-2 font-black text-lg mb-6 text-slate-800 dark:text-white tracking-tight">
                        <Music size={20} className="text-rose-500" /> Admin Media Center
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl">
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
                         <div className="flex flex-col justify-center bg-slate-50/50 dark:bg-slate-800/50 p-8 rounded-2xl text-center space-y-4 border border-slate-100/50 dark:border-slate-700/50">
                             <p className="text-slate-500 dark:text-slate-400 text-xs font-bold leading-relaxed">Focus on performance while managing the global supply chain.</p>
                             <div className="h-1 w-12 bg-primary/30 mx-auto rounded-full"></div>
                             <p className="text-[10px] font-black uppercase tracking-widest text-primary">Nexus Productivity Engine</p>
                         </div>
                    </div>
                </div>
            </div>

            {isModalOpen && (
                <UserModal 
                    user={editingUser} 
                    onClose={() => setIsModalOpen(false)} 
                    onSave={(msg) => {
                        refreshUsers();
                        setIsModalOpen(false);
                        notify(msg, 'success');
                    }} 
                />
            )}
        </div>
    );
};

const UserModal = ({ user, onClose, onSave }: { user: User | null, onClose: () => void, onSave: (msg: string) => void }) => {
    const [formData, setFormData] = useState({
        name: user?.name || '',
        username: user?.username || '',
        role: user?.role || 'staff',
        password: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newUser: User = {
            id: user?.id || crypto.randomUUID(),
            name: formData.name,
            username: formData.username,
            role: formData.role as Role
        };
        storageService.saveUser(newUser, formData.password || undefined);
        onSave(user ? 'User records updated' : 'User account created');
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="glass-card rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-white/20">
                <div className="p-6 border-b border-slate-200/50 dark:border-slate-800/50 flex justify-between items-center bg-white/30 dark:bg-slate-900/30">
                    <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">{user ? 'EDIT USER' : 'NEW ACCESS CARD'}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><X size={20}/></button>
                </div>
                <form onSubmit={handleSubmit} className="p-8 space-y-5">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Identity Name</label>
                        <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 p-3 rounded-xl focus:ring-2 focus:ring-primary/30 outline-none text-sm font-medium" placeholder="Ex: John Doe" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Username</label>
                        <input required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 p-3 rounded-xl focus:ring-2 focus:ring-primary/30 outline-none text-sm font-medium" placeholder="Ex: john_nexus" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Security Clearance</label>
                        <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as Role})} className="w-full bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 p-3 rounded-xl focus:ring-2 focus:ring-primary/30 outline-none text-sm font-black">
                            <option value="staff">STAFF</option>
                            <option value="admin">ADMIN</option>
                            <option value="viewer">VIEWER</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Access Token {user && '(Blank for no change)'}</label>
                        <input 
                            type="password" 
                            required={!user}
                            value={formData.password} 
                            onChange={e => setFormData({...formData, password: e.target.value})} 
                            className="w-full bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 p-3 rounded-xl focus:ring-2 focus:ring-primary/30 outline-none text-sm font-medium" 
                            placeholder={user ? "••••••••" : "Set password"}
                        />
                    </div>
                    
                    <div className="pt-6 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-6 py-2.5 text-slate-500 dark:text-slate-400 font-black uppercase text-xs hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">Cancel</button>
                        <button type="submit" className="px-8 py-2.5 bg-primary text-white font-black uppercase text-xs rounded-xl shadow-lg shadow-primary/30 hover:bg-blue-600 hover:scale-105 transition-all flex items-center gap-2">
                            <Save size={16} /> Save Credentials
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
