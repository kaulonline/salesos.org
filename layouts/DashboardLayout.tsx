import React, { useState } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { Command, Bell, Settings, Bot, Brain, Building2, Workflow, Plug, Users, ChevronDown, Sparkles } from 'lucide-react';
import { CommandPalette } from '../components/CommandPalette';

export const DashboardLayout: React.FC = () => {
  const location = useLocation();
  const path = location.pathname;
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const primaryNavItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'AI Agents', href: '/dashboard/ai-agents', icon: Sparkles, highlight: true },
    { label: 'Leads', href: '/dashboard/leads' },
    { label: 'Companies', href: '/dashboard/companies', icon: Building2 },
    { label: 'Deals', href: '/dashboard/deals' },
    { label: 'Analytics', href: '/dashboard/analytics' },
  ];

  const secondaryNavItems = [
    { label: 'Automations', href: '/dashboard/automations', icon: Workflow },
    { label: 'Integrations', href: '/dashboard/integrations', icon: Plug },
    { label: 'Team', href: '/dashboard/team', icon: Users },
    { label: 'Revenue', href: '/dashboard/revenue' },
    { label: 'Calendar', href: '/dashboard/calendar' },
    { label: 'Messages', href: '/dashboard/messages' },
  ];

  return (
    <div className="min-h-screen bg-[#F2F1EA] text-[#1A1A1A] font-sans selection:bg-[#EAD07D] selection:text-[#1A1A1A]">
      <CommandPalette />
      
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
          <Link to="/dashboard/settings" className="flex items-center gap-2 px-4 py-2 bg-white/60 border border-white/50 rounded-full text-sm font-medium hover:bg-white transition-all shadow-sm text-[#666] hover:text-[#1A1A1A] backdrop-blur-sm">
            <Settings size={16} />
            <span className="hidden sm:inline">Settings</span>
          </Link>
          
          <button className="w-10 h-10 bg-white/60 border border-white/50 rounded-full flex items-center justify-center hover:bg-white transition-all shadow-sm text-[#1A1A1A] backdrop-blur-sm relative group">
            <Bell size={18} className="group-hover:scale-110 transition-transform" />
            <span className="absolute top-2.5 right-3 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>

          <div className="w-10 h-10 bg-gradient-to-br from-[#EAD07D] to-[#E5C973] rounded-full flex items-center justify-center font-bold text-[#1A1A1A] shadow-md border-2 border-white cursor-pointer hover:scale-105 transition-transform">
            V
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="animate-in fade-in slide-in-from-bottom-4 duration-700 pt-[180px] md:pt-32 pb-24 px-4 md:px-8 max-w-[1920px] mx-auto">
        <Outlet />
      </main>

      {/* Bottom Fade Gradient */}
      <div className="fixed bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#F2F1EA] via-[#F2F1EA]/80 to-transparent pointer-events-none z-40" />
    </div>
  );
};