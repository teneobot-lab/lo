import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { InventoryItem, Transaction, DashboardStats } from '../types';
import { TrendingUp, Package, AlertTriangle, Layers } from 'lucide-react';

interface DashboardProps {
  items: InventoryItem[];
  transactions: Transaction[];
  stats: DashboardStats;
}

const COLORS = ['#4F8CFF', '#6A5CFF', '#3DDCFF', '#FF8042', '#FFBB28'];

export const Dashboard: React.FC<DashboardProps> = ({ items, transactions, stats }) => {
  
  const categoryData = useMemo(() => {
    const counts: {[key: string]: number} = {};
    items.forEach(i => {
      counts[i.category] = (counts[i.category] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
  }, [items]);

  const topOutbound = useMemo(() => {
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

  const StatCard = ({ title, value, sub, icon: Icon, color }: any) => (
    <div className="glass-card p-6 rounded-2xl shadow-glass flex items-start justify-between group hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
      <div>
        <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">{title}</p>
        <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">{value}</h3>
        {sub && <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-2 italic">{sub}</p>}
      </div>
      <div className={`p-3 rounded-2xl ${color} text-white shadow-lg shadow-${color.split('-')[1]}-500/20 group-hover:scale-110 transition-transform`}>
        <Icon size={24} strokeWidth={2.5} />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Inventory Value" 
          value={`Rp ${stats.totalValue.toLocaleString('id-ID')}`} 
          sub="Estimated total asset value"
          icon={TrendingUp} 
          color="bg-emerald-500" 
        />
        <StatCard 
          title="Total Units" 
          value={stats.totalUnits.toLocaleString()} 
          sub={`${stats.skuCount} Unique stock identifiers`}
          icon={Layers} 
          color="bg-primary" 
        />
        <StatCard 
          title="Low Stock Alert" 
          value={stats.lowStockCount} 
          sub="Items needing immediate restock"
          icon={AlertTriangle} 
          color="bg-rose-500" 
        />
        <StatCard 
          title="Categories" 
          value={categoryData.length} 
          sub="Diversified product groups"
          icon={Package} 
          color="bg-indigo-500" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 rounded-2xl shadow-glass">
          <h3 className="text-lg font-black text-slate-800 dark:text-white mb-6 tracking-tight flex items-center gap-2">
            <span className="w-1.5 h-6 bg-primary rounded-full"></span>
            Top Moving Items
          </h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topOutbound} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.2} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} fontWeight={600} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} fontWeight={600} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{fill: 'rgba(79, 140, 255, 0.05)'}}
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                    background: 'rgba(255,255,255,0.9)',
                    backdropFilter: 'blur(8px)'
                  }}
                />
                <Bar dataKey="qty" fill="url(#colorBar)" radius={[10, 10, 0, 0]} barSize={40}>
                    <defs>
                        <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4F8CFF" stopOpacity={1}/>
                            <stop offset="95%" stopColor="#6A5CFF" stopOpacity={0.8}/>
                        </linearGradient>
                    </defs>
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl shadow-glass">
          <h3 className="text-lg font-black text-slate-800 dark:text-white mb-6 tracking-tight flex items-center gap-2">
            <span className="w-1.5 h-6 bg-indigo-500 rounded-full"></span>
            Category Mix
          </h3>
          <div className="h-72 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                    background: 'rgba(255,255,255,0.9)',
                    backdropFilter: 'blur(8px)'
                  }} 
                />
                <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle" 
                    formatter={(val) => <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{val}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};