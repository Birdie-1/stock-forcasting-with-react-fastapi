import React, { useState, useEffect } from 'react';
import { Plus, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { apiCall } from '../services/api';
import TransactionModal from '../components/TransactionModal';
import { Skeleton, TableSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';

const Transactions = () => {
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
    loadTransactions();
  }, [selectedProduct]);

  const loadProducts = async () => {
    const data = await apiCall('/api/products');
    setProducts(data);
  };

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const endpoint = selectedProduct 
        ? `/api/transactions?product_id=${selectedProduct}`
        : '/api/transactions';
      const data = await apiCall(endpoint);
      setTransactions(data);
    } catch (error) {
       console.error("Failed to load transactions", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">ธุรกรรมสินค้า</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          บันทึกธุรกรรม
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <label className="block text-sm font-medium text-gray-700 mb-2">กรองตามสินค้า</label>
        <select
          value={selectedProduct}
          onChange={(e) => setSelectedProduct(e.target.value)}
          className="w-full md:w-96 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
        >
          <option value="">ทั้งหมด</option>
          {products.map(p => (
            <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
             <div className="p-6">
                 <TableSkeleton rows={5} cols={5} />
             </div>
        ) : transactions.length === 0 ? (
            <EmptyState 
              title="ไม่มีประวัติธุรกรรม" 
              description={selectedProduct ? "ไม่พบธุรกรรมสำหรับสินค้านี้" : "ยังไม่มีการบันทึกธุรกรรม"}
              action={
                <button
                    onClick={() => setShowAddModal(true)}
                    className="mt-4 text-amber-600 font-medium hover:text-amber-700 hover:underline"
                >
                    บันทึกธุรกรรมแรก
                </button>
              }
            />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">วันที่/เวลา</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">สินค้า</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">ประเภท</th>
                  <th className="text-right py-4 px-6 text-sm font-semibold text-gray-700">จำนวน</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">หมายเหตุ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.map((trans) => (
                  <tr key={trans.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6 text-sm text-gray-800 font-medium">
                      {new Date(trans.transaction_date + 'Z').toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-900">
                      {trans.product_code} - {trans.product_name}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                        trans.transaction_type === 'in' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {trans.transaction_type === 'in' ? (
                          <>
                            <ArrowUpCircle className="w-3 h-3" />
                            รับเข้า
                          </>
                        ) : (
                          <>
                            <ArrowDownCircle className="w-3 h-3" />
                            จ่ายออก
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right text-sm font-semibold text-gray-900">
                      {trans.quantity.toLocaleString()}
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-800 font-medium">{trans.note || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddModal && (
        <TransactionModal
          products={products}
          onClose={() => setShowAddModal(false)}
          onSave={() => { loadTransactions(); loadProducts(); setShowAddModal(false); }}
        />
      )}
    </div>
  );
};

export default Transactions;
