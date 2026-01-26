import React, { useState } from 'react';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { Command, Settings, Building2, Workflow, Plug, Users, ChevronDown, LogOut, User, Shield, BarChart3, Search, Megaphone, CreditCard, FileText, Mail, Columns, GitBranch, Globe, Key, Lock, Package } from 'lucide-react';
import { CommandPalette } from '../components/CommandPalette';
import { OfflineIndicator } from '../src/components/OfflineIndicator';
import { GlobalSearch, useGlobalSearch } from '../src/components/GlobalSearch/GlobalSearch';
import { useAuth } from '../src/context/AuthContext';
import { FloatingChat } from '../components/FloatingChat';
import { NotificationDropdown } from '../src/components/NotificationDropdown';

export const DashboardLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const { user, logout } = useAuth();
  const { isOpen: searchOpen, openSearch, closeSearch } = useGlobalSearch();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Get user initials for avatar
  const userInitials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`
    : user?.email?.[0]?.toUpperCase() || 'U';

  const primaryNavItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Leads', href: '/dashboard/leads' },
    { label: 'Contacts', href: '/dashboard/contacts', icon: User },
    { label: 'Accounts', href: '/dashboard/companies', icon: Building2 },
    { label: 'Opportunities', href: '/dashboard/deals' },
  ];

  const secondaryNavItems = [
    { label: 'Analytics', href: '/dashboard/analytics' },
    { label: 'Campaigns', href: '/dashboard/campaigns', icon: Megaphone },
    { label: 'Revenue', href: '/dashboard/revenue' },
    { label: 'Calendar', href: '/dashboard/calendar' },
    { label: 'Messages', href: '/dashboard/messages' },
    { label: 'Products', href: '/dashboard/products', icon: Package },
    { label: 'Quotes', href: '/dashboard/quotes', icon: FileText },
    { label: 'Email Templates', href: '/dashboard/email-templates', icon: Mail },
  ];

  // Check if user is admin (handle potential case differences)
  const isAdmin = user?.role?.toUpperCase() === 'ADMIN';

  const settingsNavItems = [
    { label: 'Settings', href: '/dashboard/settings', icon: Settings },
    { label: 'Subscription', href: '/dashboard/subscription', icon: CreditCard },
    { label: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
    { label: 'Automations', href: '/dashboard/automations', icon: Workflow },
    { label: 'Integrations', href: '/dashboard/integrations', icon: Plug },
    { label: 'Team', href: '/dashboard/team', icon: Users },
    { label: 'Custom Fields', href: '/dashboard/settings/custom-fields', icon: Columns },
    { label: 'Assignment Rules', href: '/dashboard/settings/assignment-rules', icon: GitBranch },
    { label: 'Web Forms', href: '/dashboard/settings/web-forms', icon: Globe },
    { label: 'Profiles', href: '/dashboard/settings/profiles', icon: Shield },
    { label: 'Security', href: '/dashboard/settings/security', icon: Lock },
    { label: 'API & Webhooks', href: '/dashboard/settings/api', icon: Key },
    // Admin-only items
    ...(isAdmin ? [
      { label: 'Admin Console', href: '/dashboard/admin', icon: Shield },
      { label: 'Billing Admin', href: '/dashboard/admin?tab=billing', icon: BarChart3 },
    ] : []),
  ];

  return (
    <div className="min-h-screen bg-[#F2F1EA] text-[#1A1A1A] font-sans selection:bg-[#EAD07D] selection:text-[#1A1A1A]">
      <CommandPalette />
      <GlobalSearch isOpen={searchOpen} onClose={closeSearch} />
      
      {/* Fixed Frosted Header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex flex-col md:flex-row items-center justify-between gap-4 px-4 md:px-8 py-4 bg-[#F2F1EA]/85 backdrop-blur-xl transition-all duration-300 border-b border-black/5">
        
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group cursor-pointer mr-4 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-[#1A1A1A] flex items-center justify-center text-white shadow-lg shadow-[#1A1A1A]/20 transition-transform group-hover:scale-105">
            <Command size={18} />
          </div>
          <span className="text-xl font-bold tracking-tight text-[#1A1A1A]">
            SalesOS<span className="text-[#EAD07D]">.</span>
          </span>
        </Link>

        {/* Pill Navigation - Scrollable on mobile */}
        <div className="flex items-center gap-2 mx-auto md:mx-0">
          <nav className="flex items-center bg-white/60 p-1 rounded-full border border-white/50 shadow-sm overflow-x-auto max-w-full no-scrollbar backdrop-blur-md">
            {primaryNavItems.map((item) => {
              const isActive = path === item.href || (item.href !== '/dashboard' && path.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap duration-300 flex items-center gap-2 ${
                    isActive
                      ? 'bg-[#1A1A1A] text-white shadow-md'
                      : item.highlight
                      ? 'text-[#1A1A1A] hover:bg-[#EAD07D]/20'
                      : 'text-[#666] hover:text-[#1A1A1A] hover:bg-white/50'
                  }`}
                >
                  {item.icon && <item.icon size={14} className={isActive ? 'text-[#EAD07D]' : item.highlight ? 'text-[#EAD07D]' : ''} />}
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* More Dropdown - Outside nav to avoid overflow clipping */}
          <div className="relative">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap duration-300 flex items-center gap-1 border backdrop-blur-md ${
                secondaryNavItems.some(item => path.startsWith(item.href))
                  ? 'bg-[#1A1A1A] text-white shadow-md border-[#1A1A1A]'
                  : showMoreMenu
                  ? 'bg-white text-[#1A1A1A] border-gray-200 shadow-md'
                  : 'bg-white/60 border-white/50 text-[#666] hover:text-[#1A1A1A] hover:bg-white'
              }`}
            >
              More
              <ChevronDown size={14} className={`transition-transform duration-200 ${showMoreMenu ? 'rotate-180' : ''}`} />
            </button>

            {showMoreMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMoreMenu(false)} />
                <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  {secondaryNavItems.map((item) => {
                    const isActive = path.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={() => setShowMoreMenu(false)}
                        className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-[#F8F8F6] text-[#1A1A1A]'
                            : 'text-[#666] hover:bg-[#F8F8F6] hover:text-[#1A1A1A]'
                        }`}
                      >
                        {item.icon && <item.icon size={16} className={isActive ? 'text-[#EAD07D]' : 'text-[#999]'} />}
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Search Button */}
          <button
            onClick={openSearch}
            className="flex items-center gap-2 px-4 py-2 bg-white/60 border border-white/50 rounded-full text-sm font-medium hover:bg-white transition-all shadow-sm text-[#666] hover:text-[#1A1A1A] backdrop-blur-sm group"
          >
            <Search size={16} />
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-100 rounded text-[10px] text-gray-500 font-mono group-hover:bg-gray-200 transition-colors">
              <span className="text-xs">⌘</span>K
            </kbd>
          </button>
          {/* Settings Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSettingsMenu(!showSettingsMenu)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-full text-sm font-medium transition-all shadow-sm backdrop-blur-sm ${
                settingsNavItems.some(item => path.startsWith(item.href))
                  ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                  : showSettingsMenu
                  ? 'bg-white text-[#1A1A1A] border-gray-200'
                  : 'bg-white/60 border-white/50 text-[#666] hover:text-[#1A1A1A] hover:bg-white'
              }`}
            >
              <Settings size={16} />
              <span className="hidden sm:inline">Settings</span>
              <ChevronDown size={14} className={`transition-transform duration-200 ${showSettingsMenu ? 'rotate-180' : ''}`} />
            </button>

            {showSettingsMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowSettingsMenu(false)} />
                <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  {settingsNavItems.map((item) => {
                    const isActive = path === item.href || (item.href !== '/dashboard/settings' && path.startsWith(item.href));
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={() => setShowSettingsMenu(false)}
                        className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-[#F8F8F6] text-[#1A1A1A]'
                            : 'text-[#666] hover:bg-[#F8F8F6] hover:text-[#1A1A1A]'
                        }`}
                      >
                        {item.icon && <item.icon size={16} className={isActive ? 'text-[#EAD07D]' : 'text-[#999]'} />}
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </div>
          
          <NotificationDropdown />

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-10 h-10 bg-gradient-to-br from-[#EAD07D] to-[#E5C973] rounded-full flex items-center justify-center font-bold text-[#1A1A1A] shadow-md border-2 border-white cursor-pointer hover:scale-105 transition-transform"
            >
              {userInitials}
            </button>

            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="font-bold text-[#1A1A1A]">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-sm text-[#666] truncate">{user?.email}</p>
                    {user?.role && (
                      <span className="inline-block mt-1 text-xs bg-[#EAD07D]/20 text-[#1A1A1A] px-2 py-0.5 rounded-full font-medium">
                        {user.role}
                      </span>
                    )}
                  </div>

                  {/* Menu Items */}
                  <div className="py-1">
                    {isAdmin && (
                      <Link
                        to="/dashboard/admin"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-[#666] hover:bg-[#F8F8F6] hover:text-[#1A1A1A] transition-colors"
                      >
                        <Shield size={16} className="text-[#EAD07D]" />
                        Admin Console
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
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

      {/* Main Content Area */}
      <main className="pt-[180px] md:pt-32 pb-24 px-4 md:px-8 max-w-[1920px] mx-auto">
        <Outlet />
      </main>

      {/* Bottom Fade Gradient */}
      <div className="fixed bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#F2F1EA] via-[#F2F1EA]/80 to-transparent pointer-events-none z-40" />

      {/* Offline Status Indicator */}
      <OfflineIndicator />

      {/* Floating AI Chat */}
      <FloatingChat />
    </div>
  );
};