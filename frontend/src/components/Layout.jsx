import React, { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ArrowUpCircle, 
  TrendingUp, 
  Upload, 
  Boxes, 
  Menu, 
  X 
} from 'lucide-react';
import { Toaster } from 'react-hot-toast';

const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  const navigation = [
    { name: 'แดชบอร์ด', href: '/', icon: LayoutDashboard },
    { name: 'จัดการสินค้า', href: '/products', icon: Package },
    { name: 'ธุรกรรม', href: '/transactions', icon: ArrowUpCircle },
    { name: 'พยากรณ์', href: '/forecast', icon: TrendingUp },
    { name: 'นำเข้าข้อมูล', href: '/upload', icon: Upload },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="bg-gradient-to-r from-amber-600 to-orange-600 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Boxes className="w-10 h-10 text-white" />
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white leading-tight">
                  ระบบจัดการสต๊อก
                </h1>
                <p className="text-amber-100 text-xs md:text-sm hidden sm:block">
                  Inventory Forecasting System with ARIMA
                </p>
              </div>
            </div>
            
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <aside className={`
            lg:w-64 flex-shrink-0 
            ${isSidebarOpen ? 'block' : 'hidden'} 
            lg:block
            fixed lg:static inset-0 top-[72px] z-40 bg-white lg:bg-transparent p-4 lg:p-0
          `}>
            <nav className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-1 h-full lg:h-auto">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all
                      ${isActive 
                        ? 'bg-amber-100 text-amber-900 shadow-sm border-l-4 border-amber-600' 
                        : 'text-gray-700 hover:bg-gray-50'
                      }
                    `}
                  >
                    <item.icon className={`w-5 h-5 ${isActive ? 'text-amber-600' : 'text-gray-500'}`} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default Layout;
