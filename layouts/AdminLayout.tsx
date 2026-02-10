import React, { useState } from 'react';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import {
  Command, Shield, Users, CreditCard, Zap, Settings, Clock,
  Activity, ChevronDown, LogOut, User, LayoutDashboard, Search,
  Database, Server, Key, BarChart3, FileText, Bell, HelpCircle,
  Menu, X
} from 'lucide-react';
import { useAuth } from '../src/context/AuthContext';
import { NotificationDropdown } from '../src/components/NotificationDropdown';

export const AdminLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  // Check admin access
  const isAdmin = user?.role?.toUpperCase() === 'ADMIN';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Get user initials for avatar
  const userInitials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`
    : user?.email?.[0]?.toUpperCase() || 'A';

  // Admin-specific navigation
  const primaryNavItems = [
    { label: 'Overview', href: '/admin', icon: Activity },
    { label: 'Users', href: '/admin/users', icon: Users },
    { label: 'Billing', href: '/admin/billing', icon: CreditCard },
    { label: 'Features', href: '/admin/features', icon: Zap },
  ];

  const secondaryNavItems = [
    { label: 'Audit Logs', href: '/admin/audit', icon: Clock },
    { label: 'Settings', href: '/admin/settings', icon: Settings },
    { label: 'System', href: '/admin/system', icon: Server },
    { label: 'API Keys', href: '/admin/api-keys', icon: Key },
  ];

  // If not admin, show access denied
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#F2F1EA] flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 text-center max-w-md shadow-lg">
          <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
            <Shield size={32} className="text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">Access Denied</h2>
          <p className="text-[#666] mb-6">
            You don't have permission to access the admin panel.
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#1A1A1A] text-white rounded-xl hover:bg-[#333] transition-colors"
          >
            <LayoutDashboard size={16} />
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white font-sans selection:bg-[#EAD07D] selection:text-[#1A1A1A]">
      {/* Fixed Admin Header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-6 py-3 bg-[#1A1A1A] border-b border-white/10">
        {/* Logo & Admin Badge */}
        <div className="flex items-center gap-4">
          <Link to="/admin" className="flex items-center gap-2 group cursor-pointer">
            <div className="w-9 h-9 rounded-xl bg-[#EAD07D] flex items-center justify-center shadow-lg shadow-[#EAD07D]/20 transition-transform group-hover:scale-105">
              <Command size={18} className="text-[#1A1A1A]" />
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-lg font-bold tracking-tight">
                SalesOS<span className="text-[#EAD07D]">.</span>
              </span>
              <span className="text-[10px] font-medium text-[#EAD07D] -mt-1 tracking-widest uppercase">
                Admin Console
              </span>
            </div>
          </Link>
        </div>

        {/* Center Navigation - hidden on mobile */}
        <nav className="hidden lg:flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
          {primaryNavItems.map((item) => {
            const isActive = path === item.href || (item.href !== '/admin' && path.startsWith(item.href));
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  isActive
                    ? 'bg-[#EAD07D] text-[#1A1A1A]'
                    : 'text-[#888] hover:text-white hover:bg-white/10'
                }`}
              >
                <item.icon size={14} />
                {item.label}
              </Link>
            );
          })}

          {/* More dropdown - click-toggle instead of hover for touch */}
          <div className="relative">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-[#888] hover:text-white hover:bg-white/10 transition-all flex items-center gap-2"
            >
              More
              <ChevronDown size={14} className={`transition-transform duration-200 ${showMoreMenu ? 'rotate-180' : ''}`} />
            </button>
            {showMoreMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMoreMenu(false)} />
                <div className="absolute top-full right-0 mt-2 w-48 bg-[#1A1A1A] rounded-xl shadow-xl border border-white/10 py-2 z-50">
                  {secondaryNavItems.map((item) => {
                    const isActive = path.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={() => setShowMoreMenu(false)}
                        className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-white/10 text-[#EAD07D]'
                            : 'text-[#888] hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <item.icon size={16} />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile Hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          {/* Back to App */}
          <Link
            to="/dashboard"
            className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/10 rounded-xl text-sm font-medium hover:bg-white/20 transition-all text-[#888] hover:text-white"
          >
            <LayoutDashboard size={16} />
            <span className="hidden sm:inline">Back to App</span>
          </Link>

          {/* Notifications */}
          <NotificationDropdown />

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/10 transition-colors"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-[#EAD07D] to-[#E5C973] rounded-lg flex items-center justify-center font-bold text-[#1A1A1A] text-sm">
                {userInitials}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-white">
                  {user?.firstName || user?.name || 'Admin'}
                </p>
                <p className="text-xs text-[#888]">Administrator</p>
              </div>
              <ChevronDown size={14} className="text-[#888]" />
            </button>

            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                <div className="absolute top-full right-0 mt-2 w-56 bg-[#1A1A1A] rounded-xl shadow-xl border border-white/10 py-2 z-50">
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-white/10">
                    <p className="font-bold text-white">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-sm text-[#888] truncate">{user?.email}</p>
                    <span className="inline-flex items-center gap-1 mt-2 text-xs bg-[#EAD07D]/20 text-[#EAD07D] px-2 py-0.5 rounded-full font-medium">
                      <Shield size={10} />
                      Administrator
                    </span>
                  </div>

                  {/* Menu Items */}
                  <div className="py-1">
                    <Link
                      to="/dashboard/settings"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-[#888] hover:bg-white/5 hover:text-white transition-colors"
                    >
                      <User size={16} />
                      My Profile
                    </Link>
                    <Link
                      to="/admin/settings"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-[#888] hover:bg-white/5 hover:text-white transition-colors"
                    >
                      <Settings size={16} />
                      Admin Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut size={16} />
                      Sign out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed top-[57px] left-0 right-0 bottom-0 z-40 lg:hidden overflow-y-auto bg-[#1A1A1A]/98 backdrop-blur-xl">
            <nav className="px-4 py-4 space-y-1">
              {primaryNavItems.map((item) => {
                const isActive = path === item.href || (item.href !== '/admin' && path.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-[#EAD07D] text-[#1A1A1A]'
                        : 'text-[#888] hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <item.icon size={18} />
                    {item.label}
                  </Link>
                );
              })}
              <div className="border-t border-white/10 my-2 pt-2">
                {secondaryNavItems.map((item) => {
                  const isActive = path.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-white/10 text-[#EAD07D]'
                          : 'text-[#888] hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <item.icon size={18} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </nav>
          </div>
        </>
      )}

      {/* Main Content Area */}
      <main className="pt-20 pb-12 px-4 sm:px-6 max-w-[1920px] mx-auto">
        <Outlet />
      </main>
    </div>
  );
};
