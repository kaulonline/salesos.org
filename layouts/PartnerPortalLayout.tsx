import React, { useState } from 'react';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  FileText,
  TrendingUp,
  LogOut,
  User,
  ChevronDown,
  Handshake,
  Bell,
  Menu,
  X,
  Shield,
} from 'lucide-react';
import { useAuth } from '../src/context/AuthContext';
import { usePortalProfile } from '../src/hooks/usePortal';

const TIER_COLORS = {
  REGISTERED: 'bg-gray-100 text-gray-700',
  SILVER: 'bg-gray-200 text-gray-800',
  GOLD: 'bg-[#EAD07D]/20 text-[#1A1A1A]',
  PLATINUM: 'bg-purple-100 text-purple-800',
};

export const PartnerPortalLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const { data: profile } = usePortalProfile();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userInitials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`
    : user?.email?.[0]?.toUpperCase() || 'P';

  const navItems = [
    { label: 'Dashboard', href: '/portal', icon: LayoutDashboard },
    { label: 'Deal Registrations', href: '/portal/registrations', icon: FileText },
    { label: 'My Deals', href: '/portal/deals', icon: TrendingUp },
    { label: 'Accounts', href: '/portal/accounts', icon: Building2 },
  ];

  const isActive = (href: string) => {
    if (href === '/portal') {
      return path === '/portal';
    }
    return path.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-[#F2F1EA]">
      {/* Header */}
      <header className="bg-[#1A1A1A] text-white sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Partner Badge */}
            <div className="flex items-center gap-4">
              <Link to="/portal" className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#EAD07D] rounded-xl flex items-center justify-center">
                  <Handshake size={20} className="text-[#1A1A1A]" />
                </div>
                <div className="hidden sm:block">
                  <span className="font-semibold text-lg">Partner Portal</span>
                  {profile?.partner && (
                    <span className="ml-3 text-sm text-white/60">
                      {profile.partner.companyName}
                    </span>
                  )}
                </div>
              </Link>
              {profile?.partner && (
                <span className={`hidden md:inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${TIER_COLORS[profile.partner.tier]}`}>
                  {profile.partner.tier}
                </span>
              )}
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? 'bg-white/10 text-white'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <item.icon size={18} />
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
              {/* Notifications */}
              <button className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                <Bell size={20} />
              </button>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <div className="w-8 h-8 bg-[#EAD07D] rounded-full flex items-center justify-center text-[#1A1A1A] font-semibold text-sm">
                    {userInitials}
                  </div>
                  <ChevronDown size={16} className="hidden sm:block text-white/60" />
                </button>

                {showUserMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowUserMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-black/5 py-2 z-50">
                      <div className="px-4 py-2 border-b border-black/5">
                        <p className="font-medium text-[#1A1A1A] text-sm">
                          {user?.firstName} {user?.lastName}
                        </p>
                        <p className="text-xs text-[#666]">{user?.email}</p>
                        {profile && (
                          <p className="text-xs text-[#999] mt-1">
                            Role: {profile.role}
                            {profile.isPrimary && ' (Primary Contact)'}
                          </p>
                        )}
                      </div>
                      <Link
                        to="/portal/profile"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#666] hover:bg-[#F8F8F6] transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <User size={16} />
                        Profile
                      </Link>
                      <Link
                        to="/portal/security"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#666] hover:bg-[#F8F8F6] transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Shield size={16} />
                        Security
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut size={16} />
                        Logout
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="lg:hidden border-t border-white/10 py-2 px-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? 'bg-white/10 text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      {/* Main Content */}
      <main className="min-h-[calc(100vh-64px)]">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-black/5 py-6">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[#666]">
            <p>SalesOS Partner Portal</p>
            <div className="flex items-center gap-6">
              <Link to="/portal/help" className="hover:text-[#1A1A1A] transition-colors">Help Center</Link>
              <Link to="/portal/agreement" className="hover:text-[#1A1A1A] transition-colors">Partner Agreement</Link>
              <Link to="/portal/support" className="hover:text-[#1A1A1A] transition-colors">Contact Support</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PartnerPortalLayout;
