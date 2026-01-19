
import React, { useMemo, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { InventoryItem, Transaction, DashboardStats } from '../types';
import { TrendingUp, Package, AlertTriangle, Layers, X, AlertCircle, ArrowRight } from 'lucide-react';

interface DashboardProps {
  items: InventoryItem[];
  transactions: Transaction[];
  stats: DashboardStats;
}

const COLORS = ['#4F8CFF', '#6A5CFF', '#3DDCFF', '#FF8042', '#FFBB28'];

export const Dashboard: React.FC<DashboardProps> = ({ items, transactions, stats }) => {
  const [isLowStockModalOpen, setIsLowStockModalOpen] = useState(false);

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

  const StatCard = ({ title, value, sub, icon: Icon, color, onClick }: any) => (
    <div 
        onClick={onClick}
        className={`bg-white p-6 rounded-2xl shadow-soft border border-slate-100 flex items-start justify-between group transition-all ${onClick ? 'cursor-pointer hover:shadow-lg hover:border-rose-200 hover:scale-[1.01]' : 'hover:shadow-md'}`}
    >
      <div>
        <p className="text-muted text-sm font-medium mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-dark">{value}</h3>
        {sub && <p className="text-xs text-muted mt-2">{sub}</p>}
      </div>
      <div className={`p-3 rounded-xl ${color} text-white bg-opacity-90 shadow-sm group-hover:scale-110 transition-transform`}>
        <Icon size={24} />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Inventory Value" 
          value={`Rp ${stats.totalValue.toLocaleString('id-ID')}`} 
          sub="Based on average cost"
          icon={TrendingUp} 
          color="bg-emerald-500" 
        />
        <StatCard 
          title="Total Units" 
          value={stats.totalUnits.toLocaleString()} 
          sub={`${stats.skuCount} Unique SKUs`}
          icon={Layers} 
          color="bg-primary" 
        />
        <StatCard 
          title="Low Stock Items" 
          value={lowStockItems.length} // Used local calculation instead of stats.lowStockCount to match logic
          sub="Click to view details"
          icon={AlertTriangle} 
          color="bg-rose-500"
          onClick={() => setIsLowStockModalOpen(true)}
        />
        <StatCard 
          title="Categories" 
          value={categoryData.length} 
          sub="Active product lines"
          icon={Package} 
          color="bg-indigo-500" 
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top Outbound */}
        <div className="bg-white p-6 rounded-2xl shadow-soft border border-slate-100">
          <h3 className="text-lg font-semibold text-dark mb-4">Top Moving Items (Outbound)</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topOutbound} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5EAF1" />
                <XAxis dataKey="name" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{fill: '#F4F7FB'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="qty" fill="#4F8CFF" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Distribution */}
        <div className="bg-white p-6 rounded-2xl shadow-soft border border-slate-100">
          <h3 className="text-lg font-semibold text-dark mb-4">Inventory by Category</h3>
          <div className="h-72 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.1)' }} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Low Stock Modal */}
      {isLowStockModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-rose-50">
                    <div className="flex items-center gap-3">
                        <div className="bg-rose-100 p-2 rounded-full text-rose-600">
                            <AlertCircle size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-dark">Low Stock Alert</h3>
                            <p className="text-xs text-rose-600 font-medium">Items requiring immediate reorder</p>
                        </div>
                    </div>
                    <button onClick={() => setIsLowStockModalOpen(false)} className="text-slate-400 hover:text-dark hover:bg-white/50 p-2 rounded-full transition-all">
                        <X size={20}/>
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-0 custom-scrollbar">
                    {lowStockItems.length > 0 ? (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 sticky top-0 z-10 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                <tr>
                                    <th className="p-4 border-b border-slate-100">Item Details</th>
                                    <th className="p-4 border-b border-slate-100">Category</th>
                                    <th className="p-4 border-b border-slate-100 text-center">Current</th>
                                    <th className="p-4 border-b border-slate-100 text-center">Min Level</th>
                                    <th className="p-4 border-b border-slate-100 text-right">Deficit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {lowStockItems.map(item => (
                                    <tr key={item.id} className="hover:bg-rose-50/30 transition-colors">
                                        <td className="p-4">
                                            <div className="font-bold text-sm text-slate-800">{item.name}</div>
                                            <div className="text-xs text-slate-400">{item.sku}</div>
                                        </td>
                                        <td className="p-4 text-xs text-slate-500">{item.category}</td>
                                        <td className="p-4 text-center">
                                            <span className="px-2 py-1 bg-rose-100 text-rose-700 rounded-lg text-xs font-bold">
                                                {item.stock} {item.unit}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center text-xs font-medium text-slate-600">
                                            {item.minLevel}
                                        </td>
                                        <td className="p-4 text-right text-xs font-bold text-rose-500">
                                            -{item.minLevel - item.stock}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4 text-emerald-500">
                                <Package size={32} />
                            </div>
                            <h4 className="text-lg font-bold text-slate-800">All Good!</h4>
                            <p className="text-slate-500 text-sm max-w-xs">No items are currently below their minimum stock level.</p>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                    <button 
                        onClick={() => setIsLowStockModalOpen(false)} 
                        className="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-xl transition-colors shadow-lg shadow-slate-200"
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
