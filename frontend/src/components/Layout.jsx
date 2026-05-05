import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const Layout = () => {
  return (
    <div className="min-h-screen bg-dark-900 text-slate-200 flex">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
