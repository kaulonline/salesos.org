import React from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { Command, Bell, Settings, User } from 'lucide-react';

export const DashboardLayout: React.FC = () => {
  const location = useLocation();
  const path = location.pathname;

  const navItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Leads', href: '/dashboard/leads' },
    { label: 'Deals', href: '/dashboard/deals' },
    { label: 'Revenue', href: '/dashboard/revenue' },
    { label: 'Calendar', href: '/dashboard/calendar' },
    { label: 'Analytics', href: '/dashboard/analytics' },
    { label: 'Messages', href: '/dashboard/messages' },
  ];

  return (
    <div className="min-h-screen bg-[#F2F1EA] text-[#1A1A1A] font-sans p-4 md:p-6">
      {/* Top Navigation Bar */}
      <header className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
        
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group cursor-pointer mr-8">
          <div className="w-8 h-8 rounded-lg bg-[#1A1A1A] flex items-center justify-center text-white">
            <Command size={18} />
          </div>
          <span className="text-xl font-bold tracking-tight text-[#1A1A1A]">
            SalesOS
          </span>
        </Link>

        {/* Pill Navigation */}
        <nav className="flex items-center bg-white p-1.5 rounded-full shadow-sm overflow-x-auto max-w-full no-scrollbar">
          {navItems.map((item) => {
            const isActive = path === item.href || (item.href !== '/dashboard' && path.startsWith(item.href));
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  isActive ? 'nav-pill-active' : 'nav-pill-inactive'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <Link to="/dashboard/settings" className="flex items-center gap-2 px-4 py-2 bg-white rounded-full text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm text-[#666]">
            <Settings size={16} />
            <span className="hidden sm:inline">Settings</span>
          </Link>
          
          <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-50 shadow-sm text-[#1A1A1A] relative">
            <Bell size={18} />
            <span className="absolute top-2.5 right-3 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>

          <div className="w-10 h-10 bg-[#EAD07D] rounded-full flex items-center justify-center font-bold text-[#1A1A1A] shadow-sm">
            V
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="animate-in fade-in duration-500">
        <Outlet />
      </main>
    </div>
  );
};