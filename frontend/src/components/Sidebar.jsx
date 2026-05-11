import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { LayoutDashboard, AlertCircle, Settings as SettingsIcon, LogOut, ShieldAlert, Menu, X, Pencil, BarChart3, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import clsx from 'clsx';
import ProfileModal from './ProfileModal';

const Sidebar = ({ isOpen, onClose }) => {
  const { logout, user } = useAuth();
  const [showProfile, setShowProfile] = useState(false);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['admin', 'developer', 'guest'] },
    { name: 'Incidents', path: '/incidents', icon: AlertCircle, roles: ['admin', 'developer', 'guest'] },
    { name: 'Analytics', path: '/analytics', icon: BarChart3, roles: ['admin', 'developer', 'guest'] },
    { name: 'Monitoring', path: '/monitoring', icon: Activity, roles: ['admin', 'developer'] },
    { name: 'Settings', path: '/settings', icon: SettingsIcon, roles: ['admin', 'developer'] },
  ];

  // Filter nav items based on user role
  const visibleItems = navItems.filter(item => item.roles.includes(user?.role));

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'w-64 bg-dark-900 border-r border-slate-800 flex flex-col h-screen fixed top-0 left-0 z-50 transition-transform duration-300 ease-in-out',
          'lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
          <Link to="/" className="flex items-center hover:opacity-80 transition-opacity cursor-pointer" onClick={onClose}>
            <ShieldAlert className="w-8 h-8 text-brand-500 mr-3" />
            <span className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              NodeWatch
            </span>
          </Link>
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
          {visibleItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.path === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                clsx(
                  'flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors',
                  isActive
                    ? 'bg-brand-500/10 text-brand-500'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                )
              }
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        {/* User Profile & Logout */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center px-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white font-bold text-sm mr-3">
              {user?.email?.[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-200 truncate">{user?.email}</p>
              <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
            </div>
            <button
              onClick={() => setShowProfile(true)}
              className="p-1.5 text-slate-400 hover:text-brand-400 hover:bg-brand-500/10 rounded-lg transition-colors"
              title="Edit profile"
            >
              <Pencil className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center px-4 py-2 text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Log Out
          </button>
        </div>
      </aside>

      {/* Profile Edit Modal */}
      <ProfileModal
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        user={user}
        onUpdated={() => {
          // After profile update, force re-login with new credentials
          logout();
        }}
      />
    </>
  );
};

export default Sidebar;
