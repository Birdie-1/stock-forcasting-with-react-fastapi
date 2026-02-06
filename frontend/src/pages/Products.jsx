import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { apiCall } from '../services/api';
import toast from 'react-hot-toast';
import ProductModal from '../components/ProductModal';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { Skeleton, TableSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  // Confirmation Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      loadProducts();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const loadProducts = async () => {
    try {
      // Don't set loading to true on search to avoid flickering if we want, 
      // but for now let's keep it simple or maybe use a separate loading state for search?
      // For initial load, we want skeleton.
      if (products.length === 0) setLoading(true);
      
      const data = await apiCall(`/api/products${searchTerm ? `?search=${searchTerm}` : ''}`);
      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (product) => {
    setProductToDelete(product);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;
    
    try {
      await apiCall(`/api/products/${productToDelete.id}`, { method: 'DELETE' });
      toast.success(`ลบสินค้า ${productToDelete.name} เรียบร้อยแล้ว`);
      loadProducts();
    } catch (error) {
      // Error handled by apiCall
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">จัดการสินค้า</h2>
        <button
          onClick={() => { setSelectedProduct(null); setShowAddModal(true); }}
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          เพิ่มสินค้า
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="ค้นหาสินค้า (รหัส, ชื่อ, หมวดหมู่)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent shadow-sm"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={5} cols={6} />
          </div>
        ) : products.length === 0 ? (
          <EmptyState 
            title="ไม่พบสินค้า" 
            description={searchTerm ? `ไม่พบสินค้าที่ตรงกับ "${searchTerm}"` : "เริ่มต้นด้วยการเพิ่มสินค้าใหม่"}
            action={!searchTerm && (
              <button
                onClick={() => { setSelectedProduct(null); setShowAddModal(true); }}
                className="mt-4 text-amber-600 font-medium hover:text-amber-700 hover:underline"
              >
                เพิ่มสินค้าสินค้าแรก
              </button>
            )}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">รหัส</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">ชื่อสินค้า</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">หมวดหมู่</th>
                  <th className="text-right py-4 px-6 text-sm font-semibold text-gray-700">สต๊อก</th>
                  <th className="text-right py-4 px-6 text-sm font-semibold text-gray-700">ราคา/หน่วย</th>
                  <th className="text-center py-4 px-6 text-sm font-semibold text-gray-700">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6 text-sm font-medium text-gray-900">{product.code}</td>
                    <td className="py-4 px-6 text-sm text-gray-900">{product.name}</td>
                    <td className="py-4 px-6">
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                        {product.category}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-sm font-bold text-gray-900 font-mono">
                            {product.current_stock.toLocaleString()}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            product.current_stock === 0 
                            ? 'bg-red-100 text-red-700'
                            : product.current_stock < 10 
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-green-100 text-green-700'
                        }`}>
                            {product.current_stock === 0 ? 'หมดสต๊อก' : product.current_stock < 10 ? 'ใกล้หมด' : 'ปกติ'}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right text-sm text-gray-600 font-mono">
                      ฿{product.unit_cost.toLocaleString()}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => { setSelectedProduct(product); setShowAddModal(true); }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="แก้ไข"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(product)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="ลบ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddModal && (
        <ProductModal
          product={selectedProduct}
          onClose={() => { setShowAddModal(false); setSelectedProduct(null); }}
          onSave={() => { loadProducts(); setShowAddModal(false); setSelectedProduct(null); }}
        />
      )}

      <ConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="ยืนยันการลบสินค้า"
        description={`คุณแน่ใจหรือไม่ที่จะลบสินค้า "${productToDelete?.name}"? การกระทำนี้ไม่สามารถยกเลิกได้`}
        confirmText="ลบสินค้า"
        variant="danger"
      />
    </div>
  );
};

export default Products;
