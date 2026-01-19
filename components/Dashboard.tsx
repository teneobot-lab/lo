
import React, { useMemo, useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { InventoryItem, Transaction, DashboardStats } from '../types';
import { TrendingUp, Package, AlertTriangle, Layers, X, AlertCircle } from 'lucide-react';

interface DashboardProps {
  items: InventoryItem[];
  transactions: Transaction[];
  stats: DashboardStats;
}

const COLORS = ['#94bce8', '#5a8cc2', '#deecf7', '#FF8042', '#d0e2f6'];

export const Dashboard: React.FC<DashboardProps> = ({ items, transactions, stats }) => {
  const [isLowStockModalOpen, setIsLowStockModalOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Realtime Clock Effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format Date: Hari DD Month YYYY (e.g., Senin 20 Januari 2026)
  const formattedDate = useMemo(() => {
    return currentTime.toLocaleDateString('id-ID', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
    });
  }, [currentTime]);

  // Format Time: HH.mm.ss (e.g., 15.30.45)
  const formattedTime = useMemo(() => {
    const h = currentTime.getHours().toString().padStart(2, '0');
    const m = currentTime.getMinutes().toString().padStart(2, '0');
    const s = currentTime.getSeconds().toString().padStart(2, '0');
    return `${h}.${m}.${s}`;
  }, [currentTime]);

  // Calculate Low Stock Items locally to apply the "minLevel > 0" logic
  // Logic: Only count as low stock if active AND minLevel is set (greater than 0) AND stock <= minLevel
  const lowStockItems = useMemo(() => {
      return items.filter(i => i.active && (i.minLevel > 0) && (i.stock <= i.minLevel));
  }, [items]);
  
  // Prepare Chart Data
  const categoryData = useMemo(() => {
    const counts: {[key: string]: number} = {};
    items.forEach(i => {
      counts[i.category] = (counts[i.category] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
  }, [items]);

  const topOutbound = useMemo(() => {
    // Simplified logic: Count outbound qty per SKU
    const counts: {[sku: string]: {name: string, qty: number}} = {};
    transactions
      .filter(t => t.type === 'outbound')
      .forEach(t => {
        t.items.forEach(item => {
          if (!counts[item.sku]) counts[item.sku] = { name: item.name, qty: 0 };
          counts[item.sku].qty += item.qty;
        });
      });
    return Object.values(counts)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [transactions]);

  // KPI Card with Transparent/Glassy Icon logic
  const StatCard = ({ title, value, sub, icon: Icon, onClick }: any) => (
    <div 
        onClick={onClick}
        className={`relative overflow-hidden bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-soft border border-ice-100 dark:border-gray-700 flex items-start justify-between group transition-all duration-300 ${onClick ? 'cursor-pointer hover:shadow-lg hover:border-ice-300 dark:hover:border-gray-600 hover:-translate-y-1' : 'hover:shadow-md'}`}
    >
      {/* Decorative Gradient Blob */}
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-ice-gradient opacity-20 rounded-full blur-2xl group-hover:opacity-40 transition-opacity"></div>

      <div className="relative z-10">
        <p className="text-slate-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">{title}</p>
        <h3 className="text-3xl font-bold text-slate-800 dark:text-white mb-1">{value}</h3>
        {sub && <p className="text-xs text-ice-500 dark:text-gray-500 font-medium">{sub}</p>}
      </div>
      
      {/* Transparent / Glassy Icon Container */}
      <div className={`relative p-3.5 rounded-2xl bg-gradient-to-br from-ice-100/50 to-ice-200/30 dark:from-gray-700/50 dark:to-gray-600/30 backdrop-blur-md border border-white/50 dark:border-gray-600/50 shadow-sm text-slate-600 dark:text-ice-200 group-hover:scale-110 transition-transform duration-300`}>
        <Icon size={28} strokeWidth={1.5} />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Date & Time Header - Ice Palette */}
      <div className="bg-ice-gradient rounded-3xl p-8 shadow-glass border border-white/50 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-6 relative overflow-hidden">
          {/* Subtle noise/texture overlay could go here */}
          <div className="relative z-10">
              <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Dashboard Overview</h2>
              <p className="text-slate-600 text-sm mt-1 font-medium opacity-80">Real-time inventory insights & analytics</p>
          </div>
          <div className="flex flex-col items-end gap-1 bg-white/40 dark:bg-black/10 backdrop-blur-md p-4 rounded-2xl border border-white/60 dark:border-white/10 min-w-[220px] shadow-sm relative z-10">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-800">
                  <span>{formattedDate}</span>
              </div>
              <div className="flex items-center gap-2 text-3xl font-bold tracking-widest font-mono text-slate-800 dark:text-slate-900">
                  <span>{formattedTime}</span>
              </div>
          </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Inventory Value" 
          value={`Rp ${stats.totalValue.toLocaleString('id-ID', { notation: "compact", maximumFractionDigits: 1 })}`} 
          sub="Total Asset Value"
          icon={TrendingUp} 
        />
        <StatCard 
          title="Total Units" 
          value={stats.totalUnits.toLocaleString()} 
          sub={`${stats.skuCount} Unique SKUs`}
          icon={Layers} 
        />
        <StatCard 
          title="Low Stock" 
          value={lowStockItems.length} 
          sub="Requires Attention"
          icon={AlertTriangle} 
          onClick={() => setIsLowStockModalOpen(true)}
        />
        <StatCard 
          title="Categories" 
          value={categoryData.length} 
          sub="Active Lines"
          icon={Package} 
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top Outbound */}
        <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-soft border border-ice-100 dark:border-gray-700">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Top Moving Items (Outbound)</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topOutbound} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5EAF1" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{fill: '#F4F9FF'}}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px -5px rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.95)' }}
                />
                <Bar dataKey="qty" fill="url(#colorGradient)" radius={[6, 6, 0, 0]} barSize={40} />
                <defs>
                  <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#94bce8" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#5a8cc2" stopOpacity={1}/>
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Distribution */}
        <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-soft border border-ice-100 dark:border-gray-700">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Inventory by Category</h3>
          <div className="h-72 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px -5px rgba(0,0,0,0.1)' }} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Low Stock Modal */}
      {isLowStockModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] border border-white/50">
                <div className="p-6 border-b border-ice-100 dark:border-gray-800 flex justify-between items-center bg-gradient-to-r from-rose-50 to-white dark:from-gray-800 dark:to-gray-800">
                    <div className="flex items-center gap-4">
                        <div className="bg-white dark:bg-rose-900/50 p-3 rounded-2xl shadow-sm text-rose-500 dark:text-rose-400">
                            <AlertCircle size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">Low Stock Alert</h3>
                            <p className="text-xs text-rose-500 dark:text-rose-400 font-bold uppercase tracking-wide">Immediate Action Required</p>
                        </div>
                    </div>
                    <button onClick={() => setIsLowStockModalOpen(false)} className="text-slate-400 hover:text-slate-800 dark:hover:text-white bg-white/50 hover:bg-white dark:hover:bg-gray-700 p-2 rounded-full transition-all">
                        <X size={20}/>
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-0 custom-scrollbar">
                    {lowStockItems.length > 0 ? (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 dark:bg-gray-800 sticky top-0 z-10 text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                                <tr>
                                    <th className="p-5 border-b border-ice-200 dark:border-gray-700">Item Details</th>
                                    <th className="p-5 border-b border-ice-200 dark:border-gray-700">Category</th>
                                    <th className="p-5 border-b border-ice-200 dark:border-gray-700 text-center">Current</th>
                                    <th className="p-5 border-b border-ice-200 dark:border-gray-700 text-center">Min Level</th>
                                    <th className="p-5 border-b border-ice-200 dark:border-gray-700 text-right">Deficit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-ice-50 dark:divide-gray-800">
                                {lowStockItems.map(item => (
                                    <tr key={item.id} className="hover:bg-rose-50/30 dark:hover:bg-rose-900/10 transition-colors">
                                        <td className="p-5">
                                            <div className="font-bold text-sm text-slate-800 dark:text-gray-200">{item.name}</div>
                                            <div className="text-xs text-slate-400">{item.sku}</div>
                                        </td>
                                        <td className="p-5 text-xs text-slate-500 dark:text-gray-400">{item.category}</td>
                                        <td className="p-5 text-center">
                                            <span className="px-3 py-1 bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 rounded-lg text-xs font-bold shadow-sm">
                                                {item.stock} {item.unit}
                                            </span>
                                        </td>
                                        <td className="p-5 text-center text-xs font-medium text-slate-600 dark:text-gray-400">
                                            {item.minLevel}
                                        </td>
                                        <td className="p-5 text-right text-xs font-bold text-rose-500">
                                            -{item.minLevel - item.stock}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-20 h-20 bg-ice-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6 text-ice-500">
                                <Package size={40} />
                            </div>
                            <h4 className="text-xl font-bold text-slate-800 dark:text-white">All Good!</h4>
                            <p className="text-slate-500 dark:text-gray-400 text-sm max-w-xs mt-2">No items are currently below their minimum stock level.</p>
                        </div>
                    )}
                </div>

                <div className="p-5 border-t border-ice-100 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-800/50 flex justify-end">
                    <button 
                        onClick={() => setIsLowStockModalOpen(false)} 
                        className="px-8 py-3 bg-slate-800 dark:bg-gray-700 hover:bg-slate-900 dark:hover:bg-gray-600 text-white text-sm font-bold rounded-xl transition-all shadow-lg hover:shadow-xl"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
