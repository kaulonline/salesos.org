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
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${
        scrolled 
          ? 'bg-[#F2F1EA]/80 backdrop-blur-xl border-black/5 py-4' 
          : 'bg-transparent border-transparent py-6'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group cursor-pointer">
          <div className="w-8 h-8 rounded-lg bg-[#1A1A1A] flex items-center justify-center text-white">
            <Command size={18} />
          </div>
          <span className="text-xl font-bold tracking-tight text-[#1A1A1A]">
            SalesOS<span className="text-[#EAD07D]">.</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_ITEMS.map((item) => (
            <Link 
              key={item.label} 
              to={item.href}
              className="text-sm font-medium text-[#666] hover:text-[#1A1A1A] transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-4">
          <Link to="/login" className="text-sm font-medium text-[#1A1A1A] hover:text-black/70">Log In</Link>
          <Link to="/signup">
            <Button variant="primary" size="sm">Sign Up Free</Button>
          </Link>
        </div>

        {/* Mobile Toggle */}
        <button 
          className="md:hidden text-[#1A1A1A]"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-[#F2F1EA] border-b border-black/5 p-6 md:hidden flex flex-col gap-4 animate-in slide-in-from-top-5 shadow-xl">
           {NAV_ITEMS.map((item) => (
            <Link 
              key={item.label} 
              to={item.href}
              className="text-lg font-medium text-[#666] hover:text-[#1A1A1A] transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <div className="h-px bg-black/10 my-2" />
          <Link to="/login" className="text-lg font-medium text-[#1A1A1A] text-center" onClick={() => setMobileMenuOpen(false)}>Log In</Link>
          <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>
            <Button variant="primary" className="w-full">Sign Up Free</Button>
          </Link>
        </div>
      )}
    </nav>
  );
};