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

  const StatCard = ({ title, value, sub, icon: Icon, color }: any) => (
    <div className="bg-white p-6 rounded-2xl shadow-soft border border-slate-100 flex items-start justify-between group hover:shadow-md transition-shadow">
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
          value={stats.lowStockCount} 
          sub="Requires attention"
          icon={AlertTriangle} 
          color="bg-rose-500" 
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
    </div>
  );
};
