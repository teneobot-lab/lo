
import React, { useMemo, useState, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { InventoryItem, Transaction, DashboardStats } from '../types';
import { Eye, Calendar as CalendarIcon, Filter } from 'lucide-react';

interface DashboardProps {
  items: InventoryItem[];
  transactions: Transaction[];
  stats: DashboardStats;
}

export const Dashboard: React.FC<DashboardProps> = ({ items, transactions, stats }) => {
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

  // Dummy data generation for chart (mimicking 'Quantity Movement')
  const chartData = useMemo(() => {
    // Generate last 7 days empty data or real data if we had detailed history in stats
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push({ name: d.getDate().toString(), value: Math.floor(Math.random() * 100) });
    }
    return days;
  }, []);

  const topProducts = useMemo(() => {
      // Just take top 5 items by stock for demo, in real app usage transaction frequency
      return items.slice(0, 5);
  }, [items]);

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">
        
        {/* User Greeting & Verification (Mock) */}
        <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-gray-700 text-lg">Hi, User</span>
            </div>
            <div className="text-sm text-gray-500">
                Belum Verifikasi Dokumen Usaha <a href="#" className="text-green-500 font-semibold hover:underline">Verifikasi Sekarang</a>
            </div>
        </div>

        {/* Filter Section */}
        <div className="space-y-2">
            <h3 className="font-semibold text-gray-700">Filter Produk</h3>
            <div className="flex flex-wrap items-end gap-6 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <div className="space-y-1">
                    <label className="text-sm font-semibold text-gray-600 block">Dari:</label>
                    <div className="relative">
                         <input 
                            type="date" 
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="border-b border-gray-300 pb-1 pt-1 pr-8 outline-none text-gray-600 font-medium w-48 focus:border-paper-blue transition-colors bg-transparent"
                         />
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-sm font-semibold text-gray-600 block">Sampai:</label>
                    <div className="relative">
                         <input 
                            type="date" 
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="border-b border-gray-300 pb-1 pt-1 pr-8 outline-none text-gray-600 font-medium w-48 focus:border-paper-blue transition-colors bg-transparent"
                         />
                    </div>
                </div>
                <div>
                    <button className="bg-paper-blue hover:bg-paper-blueHover text-white px-8 py-2 rounded-full font-semibold shadow-sm transition-all active:scale-95">
                        Terapkan
                    </button>
                </div>
            </div>
        </div>

        {/* Blue Banner Stats */}
        <div className="w-full bg-gradient-to-r from-[#5BA4E6] to-[#428BCA] rounded-xl shadow-md text-white overflow-hidden relative">
            {/* Decorative background waves could go here */}
            <div className="absolute bottom-0 left-0 w-full h-24 bg-white/5 skew-y-3 origin-bottom-left pointer-events-none"></div>

            <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-white/20 relative z-10">
                <BannerStat 
                    label="Order untuk Diterima" 
                    value={transactions.filter(t => t.type === 'inbound').length.toFixed(2)} 
                    subAction="Lihat Detail"
                />
                <BannerStat 
                    label="Order untuk Dikirim" 
                    value={transactions.filter(t => t.type === 'outbound').length.toFixed(2)} 
                    subAction="Lihat Detail"
                />
                <BannerStat 
                    label="Jumlah Kuantitas" 
                    value={stats.totalUnits.toFixed(2)} 
                    // No subaction in image for this one, but keeping layout consistent
                />
                <BannerStat 
                    label="Sisa Nilai Kuantitas" 
                    value={`Rp. ${stats.totalValue.toLocaleString('id-ID')}`} 
                />
            </div>
        </div>

        {/* Charts & Tables Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left: Chart */}
            <div className="space-y-4">
                <h3 className="font-semibold text-gray-700">Grafik Quantity Movement</h3>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 min-h-[400px]">
                    <div className="flex items-center gap-2 mb-6">
                        <button className="text-sm font-semibold text-gray-600 flex items-center gap-1">
                            <Filter size={14} /> Filter by Monthly
                        </button>
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#5BA4E6" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#5BA4E6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94A3B8'}} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94A3B8'}} />
                                <Tooltip />
                                <Area type="monotone" dataKey="value" stroke="#5BA4E6" strokeWidth={2} fillOpacity={1} fill="url(#colorVal)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    {/* Placeholder for empty state if needed */}
                    <div className="mt-4 border-t border-gray-100 pt-4">
                        <div className="h-px w-full bg-gray-100 relative top-1/2"></div>
                    </div>
                </div>
            </div>

            {/* Right: Trending Products Table */}
            <div className="space-y-4">
                <h3 className="font-semibold text-gray-700">Produk Terlaku</h3>
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 min-h-[400px] flex flex-col">
                    <div className="grid grid-cols-2 p-4 bg-gray-50/50 border-b border-gray-100 font-semibold text-sm text-gray-600">
                        <div>Produk</div>
                        <div>Terkirim</div>
                    </div>
                    <div className="flex-1 p-4">
                        {/* Empty State / List */}
                        {topProducts.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                                Tidak ada data
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {topProducts.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                                        <div className="text-sm font-medium text-gray-700">{item.name}</div>
                                        <div className="text-sm font-bold text-gray-800">0.00</div> 
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

        </div>
    </div>
  );
};

// Helper Component for Banner Stats
const BannerStat: React.FC<{ label: string; value: string; subAction?: string }> = ({ label, value, subAction }) => (
    <div className="p-8 flex flex-col items-center justify-center text-center">
        <span className="text-sm font-medium text-white/90 mb-2">{label}</span>
        <span className="text-3xl font-bold text-white mb-2">{value}</span>
        {subAction && (
            <button className="flex items-center gap-1 text-xs font-medium text-white/80 hover:text-white transition-colors mt-1">
                <Eye size={12} /> {subAction}
            </button>
        )}
    </div>
);
