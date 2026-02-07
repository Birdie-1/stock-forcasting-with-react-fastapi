import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { TrendingUp, Package, BarChart3, PieChart as PieIcon, Activity, ChevronDown } from 'lucide-react';
import { apiCall } from '../services/api';
import { Skeleton } from '../components/ui/Skeleton';

const Analytics = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedChart, setSelectedChart] = useState('sales');

    useEffect(() => {
        loadAnalytics();
    }, []);

    const loadAnalytics = async () => {
        try {
            const res = await apiCall('/api/analytics');
            setData(res);
        } catch (error) {
            console.error('Error loading analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6 space-y-6">
                <Skeleton className="h-12 w-64" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="p-6 text-center">
                <p className="text-red-500">ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง หรือตรวจสอบว่า Server ทำงานอยู่หรือไม่</p>
                <button 
                    onClick={loadAnalytics}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    ลองใหม่
                </button>
            </div>
        );
    }

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    const HEALTH_COLORS = {
        healthy: '#10b981',
        low_stock: '#f59e0b',
        out_of_stock: '#ef4444'
    };

    const stockHealthData = [
        { name: 'ปกติ', value: data.stock_health.healthy, color: HEALTH_COLORS.healthy },
        { name: 'ใกล้หมด', value: data.stock_health.low_stock, color: HEALTH_COLORS.low_stock },
        { name: 'หมดสต๊อก', value: data.stock_health.out_of_stock, color: HEALTH_COLORS.out_of_stock },
    ].filter(d => d.value > 0);

    const chartOptions = [
        { value: 'sales', label: 'ยอดขายรายวัน (30 วันล่าสุด)', icon: TrendingUp },
        { value: 'top_products', label: '10 อันดับสินค้าขายดี', icon: BarChart3 },
        { value: 'category', label: 'สัดส่วนมูลค่าสินค้าตามหมวดหมู่', icon: PieIcon },
        { value: 'health', label: 'ความเสี่ยงของสต๊อก (Stock Health)', icon: Package },
    ];

    const renderChart = () => {
        switch (selectedChart) {
            case 'sales':
                return (
                    <div className="h-[500px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.sales_trends}>
                                <defs>
                                    <linearGradient id="colorQty" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis 
                                    dataKey="sale_date" 
                                    tick={{fontSize: 12}}
                                    tickFormatter={(val) => new Date(val).toLocaleDateString('th-TH', {day: 'numeric', month: 'short'})}
                                />
                                <YAxis tick={{fontSize: 12}} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Area type="monotone" dataKey="total_qty" name="ยอดขาย" stroke="#3b82f6" fillOpacity={1} fill="url(#colorQty)" strokeWidth={3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                );
            case 'top_products':
                return (
                    <div className="h-[500px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.top_products} layout="vertical" margin={{ left: 40, right: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                                <XAxis type="number" />
                                <YAxis 
                                    dataKey="name" 
                                    type="category" 
                                    width={150} 
                                    tick={{fontSize: 14, fontWeight: 500}}
                                />
                                <Tooltip 
                                    cursor={{fill: '#f9fafb'}}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="total_qty" name="จำนวนที่ขาย" fill="#10b981" radius={[0, 4, 4, 0]} barSize={30}>
                                     {data.top_products.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                );
            case 'category':
                return (
                    <div className="h-[500px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data.category_value}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={160}
                                    paddingAngle={2}
                                    dataKey="value"
                                    nameKey="category"
                                    label={({category, percent}) => `${category} ${(percent * 100).toFixed(0)}%`}
                                >
                                    {data.category_value.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    formatter={(val) => `฿${val.toLocaleString()}`}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                );
            case 'health':
                return (
                    <div className="h-[500px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stockHealthData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={0}
                                    outerRadius={160}
                                    paddingAngle={0}
                                    dataKey="value"
                                    nameKey="name"
                                    label={({name, value}) => `${name}: ${value}`}
                                >
                                    {stockHealthData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-gray-900">ตัวชี้วัดและรายงานวิเคราะห์</h2>
                
                {/* Chart Selector */}
                <div className="relative">
                    <select
                        value={selectedChart}
                        onChange={(e) => setSelectedChart(e.target.value)}
                        className="appearance-none bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 pr-8 shadow-sm font-medium"
                    >
                        {chartOptions.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                        <ChevronDown className="h-4 w-4" />
                    </div>
                </div>
            </div>

            {/* Inventory Turn Rate Card - Always Visible */}
            <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm flex items-center justify-between max-w-sm">
                <div>
                    <p className="text-sm font-medium text-gray-500">อัตราการหมุนเวียน (Inventory Turn)</p>
                    <p className="text-4xl font-bold text-gray-900 mt-2">{data.turn_rate}x</p>
                    <p className="text-xs text-gray-400 mt-1">ยิ่งมากยิ่งดี (ขายออกเร็ว)</p>
                </div>
                <div className="bg-blue-100 p-4 rounded-xl">
                    <Activity className="w-8 h-8 text-blue-600" />
                </div>
            </div>

            {/* Main Chart Area */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
                <div className="mb-6">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        {(() => {
                            const option = chartOptions.find(o => o.value === selectedChart);
                            const Icon = option?.icon || BarChart3;
                            return (
                                <>
                                    <Icon className="w-6 h-6 text-blue-600" />
                                    {option?.label}
                                </>
                            );
                        })()}
                    </h3>
                </div>
                
                {renderChart()}
            </div>
        </div>
    );
};

export default Analytics;
