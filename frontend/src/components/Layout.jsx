import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-dark-900 text-slate-200 flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className="flex-1 lg:ml-64 min-w-0 w-full">
        {/* Mobile top bar */}
        <div className="lg:hidden h-14 bg-dark-900 border-b border-slate-800 flex items-center px-4 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800/50 transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="ml-3 text-lg font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            NodeWatch
          </span>
        </div>

        <main className="p-4 sm:p-6 lg:p-8 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
