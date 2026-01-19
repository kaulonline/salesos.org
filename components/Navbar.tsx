import React, { useState, useEffect } from 'react';
import { Menu, X, Command } from 'lucide-react';
import { NAV_ITEMS } from '../constants';
import { Button } from './ui/Button';
import { Link } from 'react-router-dom';

export const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-[#F2F1EA]/80 backdrop-blur-xl py-4 shadow-sm' 
          : 'bg-transparent border-b border-transparent py-6'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
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

        {/* CTA */}
        <div className="hidden md:flex items-center gap-4">
          <Link to="/login" className="text-sm font-medium text-[#1A1A1A] hover:text-black/70">Log In</Link>
          <Button variant="primary" size="sm">Get Demo</Button>
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
            <Link to="/login" className="block text-xl font-medium text-[#1A1A1A] text-center w-full py-4 rounded-2xl bg-white border border-black/5" onClick={() => setMobileMenuOpen(false)}>Log In</Link>
            <Button variant="primary" className="w-full text-lg py-4">Get Demo</Button>
          </div>
        </div>
      )}
    </nav>
  );
};