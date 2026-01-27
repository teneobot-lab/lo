
import React, { useMemo, useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { InventoryItem, Transaction, DashboardStats } from '../types';
import { TrendingUp, Package, AlertTriangle, Layers, X, AlertCircle, Clock, Calendar } from 'lucide-react';

interface DashboardProps {
  items: InventoryItem[];
  transactions: Transaction[];
  stats: DashboardStats;
}

const COLORS = ['#0066CC', '#36A4FC', '#7CC2FD', '#BADCFE', '#E0EFFE'];

export const Dashboard: React.FC<DashboardProps> = ({ items, transactions, stats }) => {
  const [isLowStockModalOpen, setIsLowStockModalOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = useMemo(() => {
    return currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }, [currentTime]);

  const formattedTime = useMemo(() => {
    const h = currentTime.getHours().toString().padStart(2, '0');
    const m = currentTime.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  }, [currentTime]);

  const lowStockItems = useMemo(() => {
      return items.filter(i => i.active && (i.minLevel > 0) && (i.stock <= i.minLevel));
  }, [items]);
  
  const categoryData = useMemo(() => {
    const counts: {[key: string]: number} = {};
    items.forEach(i => { counts[i.category] = (counts[i.category] || 0) + 1; });
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
  }, [items]);

  const topOutbound = useMemo(() => {
    const counts: {[sku: string]: {name: string, qty: number}} = {};
    transactions.filter(t => t.type === 'outbound').forEach(t => {
        t.items.forEach(item => {
          if (!counts[item.sku]) counts[item.sku] = { name: item.name, qty: 0 };
          counts[item.sku].qty += item.qty;
        });
      });
    return Object.values(counts).sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [transactions]);

  // Enterprise Stat Card
  const StatCard = ({ title, value, sub, icon: Icon, onClick, colorClass }: any) => (
    <div 
        onClick={onClick}
        className={`bg-white dark:bg-gray-800 p-5 rounded shadow-card border border-gray-200 dark:border-gray-700 flex flex-col justify-between h-full transition-all hover:shadow-md ${onClick ? 'cursor-pointer hover:border-corporate-400' : ''}`}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">{title}</p>
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white">{value}</h3>
        </div>
        <div className={`p-2 rounded ${colorClass || 'bg-corporate-50 text-corporate-600 dark:bg-gray-700 dark:text-corporate-400'}`}>
            <Icon size={20} strokeWidth={2} />
        </div>
      </div>
      <div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-700">
        <p className="text-xs text-gray-500 font-medium">{sub}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Context */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-gray-800 p-5 rounded shadow-card border border-gray-200 dark:border-gray-700">
          <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">Ikhtisar Bisnis</h2>
              <p className="text-sm text-gray-500 mt-1">Pantau performa gudang secara real-time.</p>
          </div>
          <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-700 px-4 py-2 rounded border border-gray-200 dark:border-gray-600">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 border-r border-gray-300 pr-4">
                  <Calendar size={14}/>
                  <span className="font-medium">{formattedDate}</span>
              </div>
              <div className="flex items-center gap-2 text-xl font-bold text-gray-800 dark:text-white">
                  <Clock size={18} className="text-corporate-600"/>
                  <span>{formattedTime}</span>
              </div>
          </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Nilai Aset" 
          value={`Rp ${stats.totalValue.toLocaleString('id-ID', { notation: "compact", maximumFractionDigits: 1 })}`} 
          sub="Berdasarkan harga beli"
          icon={TrendingUp} 
          colorClass="bg-green-50 text-green-600"
        />
        <StatCard 
          title="Total Unit" 
          value={stats.totalUnits.toLocaleString()} 
          sub={`${stats.skuCount} SKU Aktif`}
          icon={Layers} 
          colorClass="bg-blue-50 text-blue-600"
        />
        <StatCard 
          title="Stok Menipis" 
          value={lowStockItems.length} 
          sub="Perlu Restock Segera"
          icon={AlertTriangle} 
          colorClass="bg-orange-50 text-orange-600"
          onClick={() => setIsLowStockModalOpen(true)}
        />
        <StatCard 
          title="Kategori" 
          value={categoryData.length} 
          sub="Varian Produk"
          icon={Package} 
          colorClass="bg-purple-50 text-purple-600"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 p-5 rounded shadow-card border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-4 border-b pb-2 border-gray-100 dark:border-gray-700">Produk Terlaris (Outbound)</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topOutbound} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
                <XAxis type="number" stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" width={100} stroke="#4B5563" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip cursor={{fill: '#F3F4F6'}} contentStyle={{ border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '12px' }} />
                <Bar dataKey="qty" fill="#0066CC" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded shadow-card border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-4 border-b pb-2 border-gray-100 dark:border-gray-700">Distribusi Kategori</h3>
          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value">
                  {categoryData.map((entry, index) => ( <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} /> ))}
                </Pie>
                <Tooltip contentStyle={{ border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '12px' }} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Low Stock Modal - Enterprise Dialog Style */}
      {isLowStockModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-orange-50 dark:bg-orange-900/20">
                    <div className="flex items-center gap-3">
                        <AlertCircle size={20} className="text-orange-600" />
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white">Peringatan Stok Menipis</h3>
                    </div>
                    <button onClick={() => setIsLowStockModalOpen(false)} className="text-gray-500 hover:text-gray-800"><X size={20}/></button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-0">
                    {lowStockItems.length > 0 ? (
                        <table className="w-full text-left border-collapse enterprise-table">
                            <thead className="bg-gray-50 sticky top-0 z-10">
                                <tr>
                                    <th className="p-3 border-b">Nama Barang</th>
                                    <th className="p-3 border-b">Kategori</th>
                                    <th className="p-3 border-b text-center">Stok</th>
                                    <th className="p-3 border-b text-center">Min</th>
                                    <th className="p-3 border-b text-right">Defisit</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lowStockItems.map(item => (
                                    <tr key={item.id} className="hover:bg-orange-50/50">
                                        <td className="p-3 border-b text-sm font-medium text-gray-800">{item.name} <br/><span className="text-xs text-gray-500">{item.sku}</span></td>
                                        <td className="p-3 border-b text-sm text-gray-600">{item.category}</td>
                                        <td className="p-3 border-b text-center text-sm font-bold text-orange-600">{item.stock} {item.unit}</td>
                                        <td className="p-3 border-b text-center text-sm text-gray-600">{item.minLevel}</td>
                                        <td className="p-3 border-b text-right text-sm font-bold text-red-600">-{item.minLevel - item.stock}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="p-8 text-center text-gray-500">Semua stok aman.</div>
                    )}
                </div>
                <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
                    <button onClick={() => setIsLowStockModalOpen(false)} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded hover:bg-gray-50">Tutup</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
