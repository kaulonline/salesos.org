import React, { useState, useMemo } from 'react';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { Command, Settings, Building2, Workflow, Plug, Users, ChevronDown, LogOut, User, Shield, BarChart3, Search, Megaphone, CreditCard, FileText, Mail, Columns, GitBranch, Globe, Key, Lock, Package, ShoppingCart, TrendingUp, CheckSquare, Brain, Target, Map, PieChart, BookOpen, MessageSquare, Heart, AlertCircle, Mic, Bell, Sparkles, Calendar, DollarSign, Swords, HardDrive, Handshake, Menu, X, Upload, Database, History, type LucideIcon } from 'lucide-react';
import { CommandPalette } from '../components/CommandPalette';
import { OfflineIndicator } from '../src/components/OfflineIndicator';
import { GlobalSearch, useGlobalSearch } from '../src/components/GlobalSearch/GlobalSearch';
import { useAuth } from '../src/context/AuthContext';
import { useMenuPreferences } from '../src/context/MenuPreferencesContext';
import { FloatingChat } from '../components/FloatingChat';
import { NotificationDropdown } from '../src/components/NotificationDropdown';
import { AlertsDropdown } from '../src/components/AlertsDropdown';
import { OnboardingWizard, useOnboarding } from '../src/components/onboarding/OnboardingWizard';
import { ProductTour, useProductTour, DASHBOARD_TOUR_STEPS } from '../src/components/ProductTour';

export const DashboardLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showAIMenu, setShowAIMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const { user, logout } = useAuth();
  const { isOpen: searchOpen, openSearch, closeSearch } = useGlobalSearch();
  const { showOnboarding, completeOnboarding } = useOnboarding();
  const { isOpen: tourOpen, closeTour, completeTour, startTour } = useProductTour('dashboard');
  const { getVisibleItems, isCategoryEnabled, isItemEnabled } = useMenuPreferences();

  // Check if user is impersonating on mount and when user changes
  React.useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    setIsImpersonating(!!adminToken);
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleExitImpersonation = () => {
    const adminToken = localStorage.getItem('adminToken');
    if (adminToken) {
      // Remove admin token from localStorage
      localStorage.removeItem('adminToken');
      // Restore the admin token as the current token
      localStorage.setItem('token', adminToken);
      // Show success message (you can add a toast here if you have a toast system)
      alert('Switched back to admin account');
      // Redirect to admin dashboard
      navigate('/dashboard/admin');
      // Reload to apply the admin session
      window.location.reload();
    }
  };

  // Get user initials for avatar
  const userInitials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`
    : user?.email?.[0]?.toUpperCase() || 'U';

  const primaryNavItems: Array<{ label: string; href: string; icon?: LucideIcon; highlight?: boolean }> = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Leads', href: '/dashboard/leads' },
    { label: 'Contacts', href: '/dashboard/contacts', icon: User },
    { label: 'Accounts', href: '/dashboard/companies', icon: Building2 },
    { label: 'Opportunities', href: '/dashboard/deals' },
  ];

  // Icon mapping for dynamic nav items
  const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
    'products': Package,
    'quotes': FileText,
    'orders': ShoppingCart,
    'cpq-analytics': TrendingUp,
    'analytics': BarChart3,
    'revenue': DollarSign,
    'forecast': Target,
    'win-loss': PieChart,
    'account-health': Heart,
    'calendar': Calendar,
    'messages': MessageSquare,
    'campaigns': Megaphone,
    'email-templates': Mail,
    'territories': Map,
    'playbooks': BookOpen,
    'competitors': Swords,
    'assets': HardDrive,
    'partners': Handshake,
  };

  // Build dynamic "More" menu based on user preferences
  const secondaryNavItems = useMemo(() => {
    const items: Array<{ type?: 'header'; label: string; href?: string; icon?: React.ComponentType<{ size?: number; className?: string }> }> = [];

    // Sales section
    const salesItems = getVisibleItems('sales');
    if (salesItems.length > 0) {
      items.push({ type: 'header', label: 'Sales' });
      salesItems.forEach(item => {
        items.push({ label: item.label, href: item.href, icon: iconMap[item.id] });
      });
    }

    // Analytics section
    const analyticsItems = getVisibleItems('analytics');
    if (analyticsItems.length > 0) {
      items.push({ type: 'header', label: 'Analytics' });
      analyticsItems.forEach(item => {
        items.push({ label: item.label, href: item.href, icon: iconMap[item.id] });
      });
    }

    // Productivity section
    const productivityItems = getVisibleItems('productivity');
    if (productivityItems.length > 0) {
      items.push({ type: 'header', label: 'Productivity' });
      productivityItems.forEach(item => {
        items.push({ label: item.label, href: item.href, icon: iconMap[item.id] });
      });
    }

    return items;
  }, [getVisibleItems]);

  // AI icon mapping
  const aiIconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
    'ai-agents': Brain,
    'ai-alerts': AlertCircle,
    'conversations': Mic,
    'knowledge': BookOpen,
  };

  // Build dynamic AI menu based on user preferences
  const aiNavItems = useMemo(() => {
    const items = getVisibleItems('ai');
    return items.map(item => ({
      label: item.label,
      href: item.href,
      icon: aiIconMap[item.id],
    }));
  }, [getVisibleItems]);

  // Check if user is admin (handle potential case differences)
  const isAdmin = user?.role?.toUpperCase() === 'ADMIN';

  // Settings organized with section headers
  const settingsNavItems = [
    // Organization
    { label: 'General Settings', href: '/dashboard/settings', icon: Settings },
    { label: 'Team', href: '/dashboard/team', icon: Users },
    { label: 'Subscription', href: '/dashboard/subscription', icon: CreditCard },
    { type: 'divider' as const, label: 'Workflow' },
    // Workflow & Automation
    { label: 'Automations', href: '/dashboard/automations', icon: Workflow },
    { label: 'Approval Workflows', href: '/dashboard/settings/approval-workflows', icon: CheckSquare },
    { label: 'Assignment Rules', href: '/dashboard/settings/assignment-rules', icon: GitBranch },
    { type: 'divider' as const, label: 'Data' },
    // Data & Customization
    { label: 'Custom Fields', href: '/dashboard/settings/custom-fields', icon: Columns },
    { label: 'Web Forms', href: '/dashboard/settings/web-forms', icon: Globe },
    { label: 'Integrations', href: '/dashboard/integrations', icon: Plug },
    { label: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
    { type: 'divider' as const, label: 'Security' },
    // Security & Access
    { label: 'Profiles & Roles', href: '/dashboard/settings/profiles', icon: Shield },
    { label: 'Security', href: '/dashboard/settings/security', icon: Lock },
    { label: 'Data & Privacy', href: '/dashboard/settings/privacy', icon: Shield },
    { label: 'Notifications', href: '/dashboard/settings/notifications', icon: Bell },
    { label: 'API & Webhooks', href: '/dashboard/settings/api', icon: Key },
    // Admin-only items
    ...(isAdmin ? [
      { type: 'divider' as const, label: 'Admin' },
      { label: 'CRM Migration', href: '/dashboard/settings/migration', icon: Upload },
      { label: 'Migration History', href: '/dashboard/settings/migration-history', icon: History },
      { label: 'Admin Console', href: '/dashboard/admin', icon: Shield },
      { label: 'Billing Admin', href: '/dashboard/admin?tab=billing', icon: BarChart3 },
    ] : []),
  ];

  return (
    <div className="min-h-screen bg-[#F2F1EA] text-[#1A1A1A] font-sans selection:bg-[#EAD07D] selection:text-[#1A1A1A]">
      <CommandPalette />
      <GlobalSearch isOpen={searchOpen} onClose={closeSearch} />

      {/* Fixed Frosted Header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 py-3 lg:py-4 bg-[#F2F1EA]/85 backdrop-blur-xl transition-all duration-300 border-b border-black/5">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group cursor-pointer shrink-0" data-tour="logo">
          <div className="w-9 h-9 rounded-xl bg-[#1A1A1A] flex items-center justify-center text-white shadow-lg shadow-[#1A1A1A]/20 transition-transform group-hover:scale-105">
            <Command size={18} />
          </div>
          <span className="text-xl font-bold tracking-tight text-[#1A1A1A]">
            SalesOS<span className="text-[#EAD07D]">.</span>
          </span>
        </Link>

        {/* Pill Navigation - Hidden on mobile, visible on lg+ */}
        <div className="hidden lg:flex items-center gap-2 mx-auto">
          <nav className="flex items-center bg-white/60 p-1 rounded-full border border-white/50 shadow-sm overflow-x-auto max-w-full no-scrollbar backdrop-blur-md" data-tour="main-nav">
            {primaryNavItems.map((item) => {
              const isActive = path === item.href || (item.href !== '/dashboard' && path.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all whitespace-nowrap duration-300 flex items-center gap-2 ${isActive
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

          {/* More Dropdown - Organized with section headers */}
          <div className="relative">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap duration-300 flex items-center gap-1 border backdrop-blur-md ${secondaryNavItems.some(item => 'href' in item && item.href && path.startsWith(item.href))
                  ? 'bg-[#1A1A1A] text-white shadow-md border-[#1A1A1A]'
                  : showMoreMenu
                    ? 'bg-white text-[#1A1A1A] border-gray-200 shadow-md'
                    : 'bg-white/60 border-white/50 text-[#666] hover:text-[#1A1A1A] hover:bg-white/80'
                }`}
            >
              More
              <ChevronDown size={14} className={`transition-transform duration-200 ${showMoreMenu ? 'rotate-180' : ''}`} />
            </button>

            {showMoreMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMoreMenu(false)} />
                <div className="absolute top-full left-0 right-0 sm:left-auto sm:right-0 sm:w-52 mt-2 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200 max-h-[70vh] overflow-y-auto">
                  {secondaryNavItems.map((item, index) => {
                    if ('type' in item && item.type === 'header') {
                      return (
                        <div key={`header-${index}`} className={`px-4 py-1.5 ${index > 0 ? 'mt-2 border-t border-gray-100 pt-3' : ''}`}>
                          <span className="text-xs font-semibold text-[#999] uppercase tracking-wider">{item.label}</span>
                        </div>
                      );
                    }
                    const navItem = item as { label: string; href: string; icon?: React.ComponentType<{ size?: number; className?: string }> };
                    const isActive = path.startsWith(navItem.href);
                    return (
                      <Link
                        key={navItem.href}
                        to={navItem.href}
                        onClick={() => setShowMoreMenu(false)}
                        className={`flex items-center gap-3 px-4 py-2 text-sm font-medium transition-colors ${isActive
                            ? 'bg-[#F8F8F6] text-[#1A1A1A]'
                            : 'text-[#666] hover:bg-[#F8F8F6] hover:text-[#1A1A1A]'
                          }`}
                      >
                        {navItem.icon && <navItem.icon size={16} className={isActive ? 'text-[#EAD07D]' : 'text-[#999]'} />}
                        {navItem.label}
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 shrink-0">
          {/* Search Button */}
          <button
            onClick={openSearch}
            className="flex items-center gap-2 p-2.5 sm:px-4 sm:py-2 bg-white/60 border border-white/50 rounded-full text-sm font-medium hover:bg-white transition-all shadow-sm text-[#666] hover:text-[#1A1A1A] backdrop-blur-sm group"
            data-tour="search"
          >
            <Search size={16} />
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-100 rounded text-[10px] text-gray-500 font-mono group-hover:bg-gray-200 transition-colors">
              <span className="text-xs">⌘</span>K
            </kbd>
          </button>
          {/* AI Dropdown - hidden on mobile, in drawer instead */}
          <div className="relative hidden sm:block" data-tour="ai-menu">
            <button
              onClick={() => setShowAIMenu(!showAIMenu)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-full text-sm font-medium transition-all shadow-sm backdrop-blur-sm ${aiNavItems.some(item => path.startsWith(item.href))
                  ? 'bg-gradient-to-r from-[#EAD07D] to-[#D4B85C] text-[#1A1A1A] border-[#EAD07D]'
                  : showAIMenu
                    ? 'bg-white text-[#1A1A1A] border-gray-200'
                    : 'bg-white/60 border-white/50 text-[#666] hover:text-[#1A1A1A] hover:bg-white'
                }`}
            >
              <Brain size={16} />
              <span className="hidden sm:inline">AI</span>
              <ChevronDown size={14} className={`transition-transform duration-200 ${showAIMenu ? 'rotate-180' : ''}`} />
            </button>

            {showAIMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowAIMenu(false)} />
                <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  {aiNavItems.map((item) => {
                    const isActive = path.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={() => setShowAIMenu(false)}
                        className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${isActive
                            ? 'bg-[#EAD07D]/20 text-[#1A1A1A]'
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

          {/* Settings Dropdown - hidden on mobile, in drawer instead */}
          <div className="relative hidden sm:block" data-tour="settings-menu">
            <button
              onClick={() => setShowSettingsMenu(!showSettingsMenu)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-full text-sm font-medium transition-all shadow-sm backdrop-blur-sm ${settingsNavItems.some(item => item.href && path.startsWith(item.href))
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
                <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200 max-h-[70vh] overflow-y-auto">
                  {settingsNavItems.map((item, index) => {
                    if ('type' in item && item.type === 'divider') {
                      return (
                        <div key={`divider-${index}`} className="px-4 py-2 mt-1">
                          <div className="border-t border-gray-100" />
                          <span className="text-xs font-semibold text-[#999] uppercase tracking-wider mt-2 block">{item.label}</span>
                        </div>
                      );
                    }
                    const navItem = item as { label: string; href: string; icon?: React.ComponentType<{ size?: number; className?: string }> };
                    const isActive = path === navItem.href || (navItem.href !== '/dashboard/settings' && path.startsWith(navItem.href));
                    return (
                      <Link
                        key={navItem.href}
                        to={navItem.href}
                        onClick={() => setShowSettingsMenu(false)}
                        className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${isActive
                            ? 'bg-[#F8F8F6] text-[#1A1A1A]'
                            : 'text-[#666] hover:bg-[#F8F8F6] hover:text-[#1A1A1A]'
                          }`}
                      >
                        {navItem.icon && <navItem.icon size={16} className={isActive ? 'text-[#EAD07D]' : 'text-[#999]'} />}
                        {navItem.label}
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <div className="hidden sm:block">
            <AlertsDropdown />
          </div>
          <div data-tour="notifications">
            <NotificationDropdown />
          </div>

          {/* User Menu - hidden on mobile, accessible via drawer */}
          <div className="relative hidden sm:block" data-tour="user-menu">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-10 h-10 bg-gradient-to-br from-[#EAD07D] to-[#E5C973] rounded-full flex items-center justify-center font-bold text-[#1A1A1A] shadow-md border-2 border-white cursor-pointer hover:scale-105 transition-transform"
            >
              {userInitials}
            </button>

            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                <div className="absolute top-full right-0 mt-2 w-64 bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
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
                      onClick={() => {
                        setShowUserMenu(false);
                        startTour();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-[#666] hover:bg-[#F8F8F6] hover:text-[#1A1A1A] transition-colors"
                    >
                      <Sparkles size={16} className="text-[#EAD07D]" />
                      Take a Tour
                    </button>
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

          {/* Mobile Hamburger - last item for conventional placement */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2.5 text-[#666] hover:text-[#1A1A1A] hover:bg-white rounded-full transition-colors"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed top-[57px] left-0 right-0 bottom-0 z-40 lg:hidden overflow-y-auto bg-[#1A1A1A] animate-in slide-in-from-top-2 duration-200">
            <nav className="px-4 py-4 space-y-1">
              {/* Primary Nav */}
              {primaryNavItems.map((item) => {
                const isActive = path === item.href || (item.href !== '/dashboard' && path.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-white/15 text-white'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {item.icon && <item.icon size={18} className={isActive ? 'text-[#EAD07D]' : ''} />}
                    {item.label}
                  </Link>
                );
              })}

              {/* Secondary Nav (More items) */}
              {secondaryNavItems.map((item, index) => {
                if ('type' in item && item.type === 'header') {
                  return (
                    <div key={`header-${index}`} className={`px-4 pt-4 pb-1 ${index > 0 ? 'border-t border-white/10 mt-2' : ''}`}>
                      <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">{item.label}</span>
                    </div>
                  );
                }
                const navItem = item as { label: string; href: string; icon?: React.ComponentType<{ size?: number; className?: string }> };
                const isActive = path.startsWith(navItem.href);
                return (
                  <Link
                    key={navItem.href}
                    to={navItem.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-white/15 text-white'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {navItem.icon && <navItem.icon size={18} className={isActive ? 'text-[#EAD07D]' : 'text-white/40'} />}
                    {navItem.label}
                  </Link>
                );
              })}

              {/* AI Items */}
              <div className="px-4 pt-4 pb-1 border-t border-white/10 mt-2">
                <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">AI</span>
              </div>
              {aiNavItems.map((item) => {
                const isActive = path.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-white/15 text-white'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {item.icon && <item.icon size={18} className={isActive ? 'text-[#EAD07D]' : 'text-white/40'} />}
                    {item.label}
                  </Link>
                );
              })}

              {/* Settings Items */}
              <div className="px-4 pt-4 pb-1 border-t border-white/10 mt-2">
                <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">Settings</span>
              </div>
              {settingsNavItems.map((item, index) => {
                if ('type' in item && item.type === 'divider') {
                  return (
                    <div key={`divider-${index}`} className="px-4 pt-3 pb-1">
                      <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">{item.label}</span>
                    </div>
                  );
                }
                const navItem = item as { label: string; href: string; icon?: React.ComponentType<{ size?: number; className?: string }> };
                const isActive = path === navItem.href;
                return (
                  <Link
                    key={navItem.href}
                    to={navItem.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-white/15 text-white'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {navItem.icon && <navItem.icon size={18} className={isActive ? 'text-[#EAD07D]' : 'text-white/40'} />}
                    {navItem.label}
                  </Link>
                );
              })}

              {/* User Info & Sign Out */}
              <div className="border-t border-white/10 mt-4 pt-4 px-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#EAD07D] to-[#E5C973] rounded-full flex items-center justify-center font-bold text-[#1A1A1A] text-sm border-2 border-white/20 shadow-sm">
                    {userInitials}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-white truncate">{user?.firstName} {user?.lastName}</p>
                    <p className="text-xs text-white/50 truncate">{user?.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-white/10 transition-colors"
                >
                  <LogOut size={18} />
                  Sign out
                </button>
              </div>
            </nav>
          </div>
        </>
      )}

      {/* Impersonation Banner */}
      {isImpersonating && (
        <div className="fixed top-[65px] left-0 right-0 z-40 bg-[#EAD07D] border-b-2 border-[#1A1A1A]/20 px-4 py-3 shadow-lg">
          <div className="max-w-[1920px] mx-auto flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-[#1A1A1A]" size={20} />
              <span className="text-sm font-medium text-[#1A1A1A]">
                ⚠️ You are currently viewing as <strong>{user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.email || 'User'}</strong>
              </span>
            </div>
            <button
              onClick={handleExitImpersonation}
              className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] text-white rounded-full text-sm font-medium hover:bg-[#333] transition-colors shadow-sm"
            >
              <Key size={16} />
              Switch Back to Admin
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className={`pb-24 px-4 sm:px-6 lg:px-8 max-w-[1920px] mx-auto ${isImpersonating ? 'pt-32' : 'pt-20'}`}>
        <Outlet />
      </main>

      {/* Bottom Fade Gradient - hidden on mobile */}
      <div className="hidden md:block fixed bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#F2F1EA] via-[#F2F1EA]/80 to-transparent pointer-events-none z-40" />

      {/* Offline Status Indicator */}
      <OfflineIndicator />

      {/* Floating AI Chat */}
      <FloatingChat />

      {/* First-time User Onboarding */}
      {showOnboarding && (
        <OnboardingWizard
          onComplete={completeOnboarding}
          onSkip={completeOnboarding}
        />
      )}

      {/* Product Tour */}
      <ProductTour
        steps={DASHBOARD_TOUR_STEPS}
        isOpen={tourOpen}
        onClose={closeTour}
        onComplete={completeTour}
      />
    </div>
  );
};