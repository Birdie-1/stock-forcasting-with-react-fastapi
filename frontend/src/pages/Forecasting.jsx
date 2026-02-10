import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ComposedChart, Area, ReferenceLine
} from 'recharts';
import { TrendingUp, Info } from 'lucide-react';
import { apiCall } from '../services/api';

const Forecasting = () => {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [forecastData, setForecastData] = useState(null);
  const [historySeries, setHistorySeries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [periods, setPeriods] = useState(30);
  const [historyRangeDays, setHistoryRangeDays] = useState(180); // 90/180/365/0(all)
  const [historyGranularity, setHistoryGranularity] = useState('weekly'); // daily | weekly

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await apiCall('/api/products');
      setProducts(data);
    } catch (error) {
       console.error(error);
    }
  };

  const loadForecast = async () => {
    if (!selectedProduct) return;
    
    setLoading(true);
    try {
      const [forecastRes, historyRes] = await Promise.all([
        apiCall(`/api/forecast/${selectedProduct}?periods=${periods}`),
        apiCall(`/api/sales/${selectedProduct}`)
      ]);

      setForecastData(forecastRes);

      // Aggregate actual sales by date
      const dailyMap = {};
      historyRes.forEach((sale) => {
        const dateKey = sale.sale_date; // 'YYYY-MM-DD'
        dailyMap[dateKey] = (dailyMap[dateKey] || 0) + sale.quantity;
      });

      const sortedDates = Object.keys(dailyMap).sort();
      const historyPoints = sortedDates.map((dateStr) => {
        const d = new Date(dateStr);
        return {
          dateISO: dateStr,
          date: d.toLocaleDateString('th-TH', { month: 'short', day: 'numeric' }),
          actual: dailyMap[dateStr]
        };
      });

      setHistorySeries(historyPoints);
    } catch (error) {
       // handled by apiCall toast
    } finally {
      setLoading(false);
    }
  };

  const visibleHistorySeries = useMemo(() => {
    if (historySeries.length === 0) return [];

    // Range filter (last N days)
    let filtered = historySeries;
    if (historyRangeDays && historyRangeDays > 0) {
      const lastISO = historySeries[historySeries.length - 1]?.dateISO;
      if (lastISO) {
        const last = new Date(lastISO);
        const start = new Date(last);
        start.setDate(start.getDate() - historyRangeDays);
        filtered = historySeries.filter((p) => new Date(p.dateISO) >= start);
      }
    }

    // Granularity: weekly aggregation to reduce noise
    if (historyGranularity !== 'weekly') return filtered;

    const weekKey = (iso) => {
      const d = new Date(iso);
      // Monday-start week
      const day = (d.getDay() + 6) % 7; // 0 = Monday
      const monday = new Date(d);
      monday.setDate(d.getDate() - day);
      const y = monday.getFullYear();
      const m = String(monday.getMonth() + 1).padStart(2, '0');
      const dd = String(monday.getDate()).padStart(2, '0');
      return `${y}-${m}-${dd}`;
    };

    const buckets = {};
    const bucketCounts = {};
    for (const p of filtered) {
      const k = weekKey(p.dateISO);
      buckets[k] = (buckets[k] || 0) + p.actual;
      bucketCounts[k] = (bucketCounts[k] || 0) + 1;
    }

    return Object.keys(buckets)
      .sort()
      .map((k) => {
        const d = new Date(k);
        // Normalize to 7 days if partial week
        const daysInWeek = bucketCounts[k] || 1;
        const normalized = Math.round((buckets[k] / daysInWeek) * 7);
        return {
          dateISO: k,
          date: d.toLocaleDateString('th-TH', { month: 'short', day: 'numeric' }),
          actual: normalized,
          rawActual: buckets[k], // Keep raw for tooltip if needed
          isPartial: daysInWeek < 7
        };
      });
  }, [historySeries, historyRangeDays, historyGranularity]);

  // Combine actual history (Left) + forecast (Right)
  const chartData = useMemo(() => {
    if (!forecastData && visibleHistorySeries.length === 0) return [];

    let forecastPoints = [];
    if (forecastData) {
      if (historyGranularity === 'weekly') {
        // Aggregate forecast into weeks to match history scale
        const buckets = {};
        const bucketCounts = {};
        const ciBuckets = {};

        // Helper to get Monday-based week key
        const getWeekKey = (d) => {
          const day = (d.getDay() + 6) % 7; // 0 = Monday
          const monday = new Date(d);
          monday.setDate(d.getDate() - day);
          const y = monday.getFullYear();
          const m = String(monday.getMonth() + 1).padStart(2, '0');
          const dd = String(monday.getDate()).padStart(2, '0');
          return `${y}-${m}-${dd}`;
        };

        forecastData.forecast.dates.forEach((dateISO, idx) => {
          const d = new Date(dateISO);
          const k = getWeekKey(d);
          buckets[k] = (buckets[k] || 0) + forecastData.forecast.values[idx];
          
          if (!ciBuckets[k]) ciBuckets[k] = { lower: 0, upper: 0 };
          const ci = forecastData.forecast.confidence_intervals[idx] || [0, 0];
          ciBuckets[k].lower += ci[0];
          ciBuckets[k].upper += ci[1];

          bucketCounts[k] = (bucketCounts[k] || 0) + 1;
        });

        forecastPoints = Object.keys(buckets).sort().map(k => {
          const d = new Date(k);
          const daysInWeek = bucketCounts[k] || 1;
          
          // Normalize to 7 days
          const normalizedVal = Math.round((buckets[k] / daysInWeek) * 7);
          const normalizedLower = Math.max(0, Math.round((ciBuckets[k].lower / daysInWeek) * 7));
          const normalizedUpper = Math.round((ciBuckets[k].upper / daysInWeek) * 7);

          return {
            dateISO: k,
            date: d.toLocaleDateString('th-TH', { month: 'short', day: 'numeric' }),
            forecast: normalizedVal,
            ci_lower: normalizedLower,
            ci_upper: normalizedUpper,
            isPartial: daysInWeek < 7
          };
        });
      } else {
        // Daily granularity
        forecastPoints = forecastData.forecast.dates.map((date, idx) => {
          const d = new Date(date);
          const ci = forecastData.forecast.confidence_intervals[idx] || [0, 0];
          return {
            dateISO: date,
            date: d.toLocaleDateString('th-TH', { month: 'short', day: 'numeric' }),
            forecast: Math.round(forecastData.forecast.values[idx]),
            ci_lower: Math.max(0, Math.round(ci[0])),
            ci_upper: Math.round(ci[1])
          };
        });
      }
    }

    return [...visibleHistorySeries, ...forecastPoints];
  }, [visibleHistorySeries, forecastData, historyGranularity]);

  // -- 2. Total Cost Curve Logic --
  const costCurveData = useMemo(() => {
    if (!forecastData) return [];
    
    const { eoq, annual_demand } = forecastData.metrics;
    const { unit_cost, ordering_cost, holding_cost_percentage } = forecastData.product;
    const holding_cost_per_unit = unit_cost * holding_cost_percentage;

    const dataPoints = [];
    // Generate points from 0.5 * EOQ to 2.0 * EOQ
    const startQ = Math.max(1, Math.floor(eoq * 0.5));
    const endQ = Math.ceil(eoq * 2.0);
    const step = Math.max(1, Math.floor((endQ - startQ) / 20)); // ~20 points

    for (let Q = startQ; Q <= endQ; Q += step) {
        const holding = (Q / 2) * holding_cost_per_unit;
        const ordering = (annual_demand / Q) * ordering_cost;
        const total = holding + ordering;

        dataPoints.push({
            qty: Q,
            holding: holding,
            ordering: ordering,
            total: total
        });
    }
    
    const eoqHolding = (eoq / 2) * holding_cost_per_unit;
    const eoqOrdering = (annual_demand / eoq) * ordering_cost;
    const eoqTotal = eoqHolding + eoqOrdering;

    dataPoints.push({
        qty: Math.round(eoq),
        holding: eoqHolding,
        ordering: eoqOrdering,
        total: eoqTotal,
        isEOQ: true
    });

    return dataPoints.sort((a, b) => a.qty - b.qty);
  }, [forecastData]);

  // -- 3. Sawtooth Inventory Logic --
  const sawtoothData = useMemo(() => {
    if (!forecastData) return [];
    
    const { eoq, safety_stock, reorder_point, avg_daily_demand } = forecastData.metrics;
    const { lead_time_days } = forecastData.product;
    
    // Simulate stock behavior
    const maxStock = Math.round(eoq + safety_stock);
    const data = [];
    
    let currentStock = maxStock;
    let day = 1;
    let pendingOrderDay = -1;
    
    const cycles = 3;
    const cycleLength = eoq / avg_daily_demand;
    // Estimate total days for 3 cycles + some buffer
    const maxDays = Math.ceil((cycleLength * 3) + (lead_time_days * 3)) + 10;
    
    // Cap at reasonable number to prevent freezing if numbers are weird
    const safeMaxDays = Math.min(maxDays, 365); 

    // Re-simulating with time steps
    while (day <= safeMaxDays) {
        // Record start of day stock
        data.push({
            day: day,
            stock: Math.max(0, currentStock),
            reorderPoint: reorder_point,
            safetyStock: safety_stock
        });

        // Check for order arrival at start of day (or end of previous day)
        if (pendingOrderDay !== -1 && day >= pendingOrderDay) {
            // Order arrives!
            const previousStock = currentStock;
            currentStock += eoq;
            pendingOrderDay = -1;
            
            // Add a data point for the vertical jump (same day, higher stock)
            data.push({
                day: day,
                stock: Math.max(0, currentStock),
                reorderPoint: reorder_point,
                safetyStock: safety_stock
            });
        }

        // Check reorder point
        if (currentStock <= reorder_point && pendingOrderDay === -1) {
            pendingOrderDay = day + lead_time_days;
        }
        
        // Consume stock
        currentStock -= avg_daily_demand;
        day++;
    }

    return data;
  }, [forecastData]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <h2 className="text-2xl font-bold text-gray-900">การพยากรณ์ความต้องการ</h2>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">เลือกสินค้า</label>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
            >
              <option value="">-- เลือกสินค้า --</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ระยะพยากรณ์ (วัน)</label>
            <input
              type="number"
              min="7"
              max="90"
              value={periods}
              onChange={(e) => setPeriods(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
            />
          </div>
          
           <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ช่วงยอดขายจริง</label>
            <select
              value={historyRangeDays}
              onChange={(e) => setHistoryRangeDays(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
            >
              <option value={90}>ย้อนหลัง 90 วัน</option>
              <option value={180}>ย้อนหลัง 180 วัน</option>
              <option value={365}>ย้อนหลัง 365 วัน</option>
              <option value={0}>ทั้งหมด</option>
            </select>
          </div>

           <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ความละเอียดกราฟ</label>
            <select
              value={historyGranularity}
              onChange={(e) => setHistoryGranularity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
            >
              <option value="weekly">รายสัปดาห์</option>
              <option value="daily">รายวัน</option>
            </select>
          </div>
        </div>
        
        

        <button
          onClick={loadForecast}
          disabled={!selectedProduct || loading}
          className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              กำลังคำนวณ...
            </>
          ) : (
            <>
              <TrendingUp className="w-5 h-5" />
              พยากรณ์
            </>
          )}
        </button>
      </div>

      {forecastData && (
        <div className="space-y-6 animate-in slide-in-from-bottom-5 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200 shadow-sm">
              <p className="text-sm font-medium text-blue-800">EOQ (ปริมาณสั่งซื้อที่เหมาะสม)</p>
              <p className="text-3xl font-bold text-blue-900 mt-2">
                {Math.round(forecastData.metrics.eoq).toLocaleString()}
              </p>
              <p className="text-xs text-blue-700 mt-1">{forecastData.product.unit}</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200 shadow-sm">
              <p className="text-sm font-medium text-purple-800">Safety Stock</p>
              <p className="text-3xl font-bold text-purple-900 mt-2">
                {Math.round(forecastData.metrics.safety_stock).toLocaleString()}
              </p>
              <p className="text-xs text-purple-700 mt-1">{forecastData.product.unit}</p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-6 border border-orange-200 shadow-sm">
              <p className="text-sm font-medium text-orange-800">Reorder Point</p>
              <p className="text-3xl font-bold text-orange-900 mt-2">
                {Math.round(forecastData.metrics.reorder_point).toLocaleString()}
              </p>
              <p className="text-xs text-orange-700 mt-1">{forecastData.product.unit}</p>
            </div>

            {forecastData.metrics.stock_status === 'ต้องสั่งซื้อ' ? (
              <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl p-6 border border-red-200 shadow-sm animate-pulse">
                <p className="text-sm font-medium text-red-800">สต๊อกคงเหลือ</p>
                <p className="text-3xl font-bold text-red-900 mt-2">
                  {forecastData.metrics.current_stock.toLocaleString()}
                </p>
                <div className="flex justify-between items-end mt-1">
                    <p className="text-xs text-red-700">{forecastData.product.unit}</p>
                    <span className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                        ต่ำกว่าจุดสั่งซื้อ
                    </span>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200 shadow-sm">
                <p className="text-sm font-medium text-green-800">สต๊อกคงเหลือ</p>
                <p className="text-3xl font-bold text-green-900 mt-2">
                  {forecastData.metrics.current_stock.toLocaleString()}
                </p>
                <p className="text-xs text-green-700 mt-1">
                    ปกติ (เหลือ {forecastData.metrics.current_stock - forecastData.metrics.reorder_point} ก่อนสั่งซื้อ)
                </p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-gray-900">กราฟการพยากรณ์จริง vs คาดการณ์</h3>
              <p className="text-sm font-medium text-gray-800">
                ARIMA({forecastData.forecast.arima_params.p}, {forecastData.forecast.arima_params.d}, {forecastData.forecast.arima_params.q}) ·
                <span className="ml-1 text-gray-500 font-normal">แถบสีเทาแสดงช่วงความเชื่อมั่น (Confidence Interval) ของการพยากรณ์</span>
              </p>
            </div>

            <div className="w-full h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData.map(d => ({
                     ...d,
                     ci_range: [d.ci_lower, d.ci_upper] 
                 }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                    dataKey="date" 
                    stroke="#374151" 
                    tick={{ fill: '#1f2937', fontSize: 12, fontWeight: 500 }}
                    />
                    <YAxis 
                    stroke="#374151" 
                    tick={{ fill: '#1f2937', fontSize: 12, fontWeight: 500 }}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            color: '#1f2937',
                            fontWeight: '500'
                        }}
                    />
                    <Legend wrapperStyle={{ color: '#1f2937', fontWeight: '500' }} />

                    <Area
                        type="monotone"
                        dataKey="ci_range"
                        stroke="none"
                        fill="#9ca3af"
                        fillOpacity={0.2}
                        name="ช่วงความเชื่อมั่น (95% CI)"
                    />

                    <Line
                    type="monotone"
                    dataKey="actual"
                    name="ยอดขายจริง"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5 }}
                    />

                    <Line
                    type="monotone"
                    dataKey="forecast"
                    name="พยากรณ์"
                    stroke="#f97316"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 5 }}
                    strokeDasharray="4 2"
                    />
                </ComposedChart>
                </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="mb-4 flex items-start justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Total Cost Curve (กราฟต้นทุนรวม)</h3>
                        <p className="text-sm text-gray-500">
                            แสดงจุดสมดุล (Trade-off) ระหว่างต้นทุนการเก็บรักษาและต้นทุนการสั่งซื้อ
                        </p>
                    </div>
                </div>

                <div className="w-full h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={costCurveData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                            <XAxis 
                                dataKey="qty" 
                                label={{ value: 'ปริมาณสั่งซื้อ (Q)', position: 'insideBottom', offset: -5, fontSize: 12 }} 
                                tick={{ fontSize: 12 }}
                                type="number"
                                domain={['dataMin', 'dataMax']}
                            />
                            <YAxis 
                                tickFormatter={(val) => `฿${val}`}
                                tick={{ fontSize: 12 }}
                            />
                            <Tooltip 
                                formatter={(val) => `฿${val.toLocaleString()}`}
                                contentStyle={{ borderRadius: '8px' }}
                            />
                            <Legend />
                            
                            <Line type="monotone" dataKey="holding" name="Holding Cost" stroke="#10b981" strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="ordering" name="Ordering Cost" stroke="#ef4444" strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="total" name="Total Cost" stroke="#3b82f6" strokeWidth={3} dot={false} />
                            
                            <ReferenceLine x={Math.round(forecastData.metrics.eoq)} stroke="black" strokeDasharray="3 3" label={{ position: 'top', value: 'EOQ', fontSize: 12 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="mb-4 flex items-start justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Sawtooth Inventory Model</h3>
                        <p className="text-sm text-gray-500">
                            แบบจำลองพฤติกรรมสต๊อกที่แสดงรอบการสั่งซื้อและของมาส่ง
                        </p>
                    </div>
                </div>

                <div className="w-full h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={sawtoothData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                            <XAxis 
                                dataKey="day" 
                                label={{ value: 'เวลา (วัน)', position: 'insideBottom', offset: -5, fontSize: 12 }} 
                                tick={{ fontSize: 12 }}
                                type="number"
                                domain={[0, 'auto']}
                                allowDecimals={false}
                            />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip contentStyle={{ borderRadius: '8px' }} />
                            <Legend />
                            
                            <Line 
                                type="linear" 
                                dataKey="stock" 
                                name="ระดับสต๊อก" 
                                stroke="#8b5cf6" 
                                strokeWidth={2} 
                                dot={false}
                                isAnimationActive={false}
                            />
                            
                            <ReferenceLine y={forecastData.metrics.safety_stock} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'right', value: 'Safety Stock', fill: '#ef4444', fontSize: 12 }} />
                            
                            <ReferenceLine y={forecastData.metrics.reorder_point} stroke="#f59e0b" strokeDasharray="3 3" label={{ position: 'right', value: 'ROP', fill: '#f59e0b', fontSize: 12 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">สถิติและตัวชี้วัด</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm font-medium text-gray-800">ความต้องการเฉลี่ยต่อวัน</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {forecastData.metrics.avg_daily_demand.toFixed(2)} {forecastData.product.unit}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">ความต้องการต่อปี (ประมาณ)</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {Math.round(forecastData.metrics.annual_demand).toLocaleString()} {forecastData.product.unit}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">ส่วนเบี่ยงเบนมาตรฐาน</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {forecastData.metrics.demand_std.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Forecasting;
