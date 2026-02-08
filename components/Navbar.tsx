import React, { useState, useEffect } from 'react';
import { Menu, X, Command, LogOut, LayoutDashboard } from 'lucide-react';
import { NAV_ITEMS } from '../constants';
import { Button } from './ui/Button';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../src/context/AuthContext';

export const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  return (
    <nav
      className="fixed w-full z-50 transition-all duration-300 backdrop-blur-md"
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group cursor-pointer">
          <div className="w-8 h-8 rounded-lg bg-[#1A1A1A] flex items-center justify-center text-white shadow-lg shadow-[#1A1A1A]/20">
            <Command size={18} />
          </div>
          <span className="text-xl font-bold tracking-tight text-[#1A1A1A]">
            SalesOS<span className="text-[#EAD07D]">.</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1 bg-white/50 backdrop-blur-md px-2 py-1.5 rounded-full border border-white/50 shadow-sm">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              className="px-4 py-2 text-sm font-medium text-[#666] hover:text-[#1A1A1A] hover:bg-white rounded-full transition-all"
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* CTA - Changes based on auth state */}
        <div className="hidden md:flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 text-sm font-medium text-[#1A1A1A] hover:text-black/70"
              >
                <LayoutDashboard size={16} />
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#666] hover:text-[#1A1A1A] hover:bg-white/50 rounded-full transition-all"
              >
                <LogOut size={16} />
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm font-medium text-[#1A1A1A] hover:text-black/70">Log In</Link>
              <Button variant="primary" size="sm">Get Demo</Button>
            </>
          )}
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden text-[#1A1A1A] p-2 rounded-full hover:bg-black/5 transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu - Frosted Glass Overlay */}
      {mobileMenuOpen && (
        <div className="absolute top-0 left-0 right-0 h-screen bg-[#F2F1EA]/95 backdrop-blur-xl z-[-1] pt-32 px-6 md:hidden flex flex-col gap-6 animate-in slide-in-from-top-5">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              className="text-2xl font-medium text-[#1A1A1A] hover:text-[#EAD07D] transition-colors border-b border-black/5 pb-4"
              onClick={() => setMobileMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <div className="mt-4 space-y-4">
            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  className="flex items-center justify-center gap-2 text-xl font-medium text-[#1A1A1A] w-full py-4 rounded-2xl bg-[#EAD07D] border border-black/5"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <LayoutDashboard size={20} />
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-2 text-xl font-medium text-[#666] w-full py-4 rounded-2xl bg-white border border-black/5"
                >
                  <LogOut size={20} />
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="block text-xl font-medium text-[#1A1A1A] text-center w-full py-4 rounded-2xl bg-white border border-black/5"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Log In
                </Link>
                <Button variant="primary" className="w-full text-lg py-4">Get Demo</Button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
