import React, { useState, useEffect } from 'react';
import { Package, AlertTriangle, DollarSign, Activity, ArrowUpCircle, ArrowDownCircle, PieChart as PieIcon } from 'lucide-react';
import { apiCall } from '../services/api';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const data = await apiCall('/api/dashboard');
      setStats(data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  // Prepare data for Pie Chart
  const stockHealthData = stats ? [
    { name: 'ปกติ', value: stats.total_products - stats.low_stock_count, color: '#10B981' }, // Emerald-500
    { name: 'ต้องสั่งซื้อ', value: stats.low_stock_count, color: '#EF4444' }, // Red-500
  ] : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute right-0 top-0 h-full w-1 bg-amber-500" />
            <div className="flex items-center justify-between relative z-10">
                <div>
                    <p className="text-sm font-medium text-gray-500">สินค้าทั้งหมด</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2 font-mono">{stats?.total_products || 0}</p>
                </div>
                <div className="bg-amber-100 p-3 rounded-xl group-hover:scale-110 transition-transform">
                    <Package className="w-6 h-6 text-amber-600" />
                </div>
            </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute right-0 top-0 h-full w-1 bg-red-500" />
            <div className="flex items-center justify-between relative z-10">
                <div>
                    <p className="text-sm font-medium text-gray-500">ต้องสั่งซื้อ</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2 font-mono">{stats?.low_stock_count || 0}</p>
                </div>
                <div className="bg-red-100 p-3 rounded-xl group-hover:scale-110 transition-transform">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
            </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute right-0 top-0 h-full w-1 bg-emerald-500" />
            <div className="flex items-center justify-between relative z-10">
                <div>
                    <p className="text-sm font-medium text-gray-500">มูลค่าสต๊อก</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2 font-mono">
                        ฿{(stats?.total_stock_value || 0).toLocaleString()}
                    </p>
                </div>
                <div className="bg-emerald-100 p-3 rounded-xl group-hover:scale-110 transition-transform">
                    <DollarSign className="w-6 h-6 text-emerald-600" />
                </div>
            </div>
        </div>
      </div>

      {stats?.low_stock_products?.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 animate-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <h3 className="text-lg font-bold text-red-900">สินค้าต้องสั่งซื้อด่วน ({stats.low_stock_products.length})</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.low_stock_products.map(product => (
              <div key={product.id} className="bg-white p-4 rounded-lg border border-red-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="inline-block px-2 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-600">
                      {product.code}
                    </span>
                    <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full">
                        เหลือ {product.current_stock} {product.unit}
                    </span>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">{product.name}</h4>
                </div>
                
                <div className="mt-4 pt-3 border-t border-gray-50">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">จุดสั่งซื้อ (ROP):</span>
                        <span className="font-mono font-medium">{Math.round(product.rop)}</span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                        <span className="text-gray-800 font-semibold">แนะนำสั่งซื้อ:</span>
                        <span className="font-bold text-lg text-emerald-600">{Math.round(product.eoq).toLocaleString()} <span className="text-xs font-normal text-gray-500">{product.unit}</span></span>
                    </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-amber-600" />
            ธุรกรรมล่าสุด
            </h3>
            
            {!stats?.recent_transactions?.length ? (
            <EmptyState 
                title="ไม่มีข้อมูลธุรกรรม" 
                description="ยังไม่มีการเคลื่อนไหวของสินค้าในขณะนี้" 
            />
            ) : (
            <div className="overflow-x-auto">
                <table className="w-full">
                <thead>
                    <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">วันที่</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">สินค้า</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">ประเภท</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">จำนวน</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {stats.recent_transactions.slice(0, 8).map((trans) => (
                    <tr key={trans.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-4 text-sm text-gray-600 font-mono">
                        {new Date(trans.transaction_date + 'Z').toLocaleDateString('th-TH', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok'
                        })}
                        </td>
                        <td className="py-3 px-4 text-sm font-medium text-gray-900">{trans.product_name}</td>
                        <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                            trans.transaction_type === 'in' 
                            ? 'bg-green-50 text-green-700 border-green-200' 
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                            {trans.transaction_type === 'in' ? (
                            <>
                                <ArrowUpCircle className="w-3.5 h-3.5" />
                                รับเข้า
                            </>
                            ) : (
                            <>
                                <ArrowDownCircle className="w-3.5 h-3.5" />
                                จ่ายออก
                            </>
                            )}
                        </span>
                        </td>
                        <td className="py-3 px-4 text-right text-sm font-bold text-gray-900 font-mono">
                        {trans.quantity.toLocaleString()}
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
            )}
        </div>

        {/* Stock Health Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <PieIcon className="w-5 h-5 text-amber-600" />
                สถานะสินค้า
            </h3>
            <div className="flex-1 min-h-[300px] flex items-center justify-center">
                {stats?.total_products > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={stockHealthData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {stockHealthData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ borderRadius: '0.5rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Legend verticalAlign="bottom" height={36}/>
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="text-center text-gray-400">
                        <Package className="w-12 h-12 mx-auto mb-2 opacity-20" />
                        <p>ไม่มีข้อมูลสินค้า</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
