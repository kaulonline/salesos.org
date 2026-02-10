import React from 'react';
import { Command, Twitter, Linkedin, Github } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#F2F1EA] pt-20 pb-10 border-t border-black/5">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
          <div className="col-span-1 md:col-span-1">
             <Link to="/" className="flex items-center gap-2 mb-6 group">
                <div className="w-8 h-8 rounded-lg bg-[#1A1A1A] flex items-center justify-center text-white">
                    <Command size={18} />
                </div>
                <span className="text-xl font-bold text-[#1A1A1A]">SalesOS</span>
            </Link>
            <p className="text-[#666] text-sm leading-relaxed max-w-xs">
              The AI-native operating system designed to help modern sales teams close more deals with less effort.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-[#1A1A1A] mb-6">Product</h4>
            <ul className="space-y-2 text-sm text-[#666]">
              <li><Link to="/features" className="hover:text-[#1A1A1A] transition-colors py-1 inline-block">Features</Link></li>
              <li><Link to="/integrations" className="hover:text-[#1A1A1A] transition-colors py-1 inline-block">Integrations</Link></li>
              <li><Link to="/enterprise" className="hover:text-[#1A1A1A] transition-colors py-1 inline-block">Enterprise</Link></li>
              <li><Link to="/changelog" className="hover:text-[#1A1A1A] transition-colors py-1 inline-block">Changelog</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-[#1A1A1A] mb-6">Company</h4>
            <ul className="space-y-2 text-sm text-[#666]">
              <li><Link to="/about" className="hover:text-[#1A1A1A] transition-colors py-1 inline-block">About</Link></li>
              <li><Link to="/blog" className="hover:text-[#1A1A1A] transition-colors py-1 inline-block">Blog</Link></li>
              <li><Link to="/careers" className="hover:text-[#1A1A1A] transition-colors py-1 inline-block">Careers</Link></li>
              <li><Link to="/contact" className="hover:text-[#1A1A1A] transition-colors py-1 inline-block">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-[#1A1A1A] mb-6">Legal</h4>
            <ul className="space-y-2 text-sm text-[#666]">
              <li><Link to="/privacy" className="hover:text-[#1A1A1A] transition-colors py-1 inline-block">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-[#1A1A1A] transition-colors py-1 inline-block">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-black/5">
          <p className="text-xs text-[#888] font-medium">© 2024 SalesOS Inc. All rights reserved.</p>
          <div className="flex items-center gap-6 mt-4 md:mt-0">
            <a href="#" className="p-2.5 text-[#888] hover:text-[#1A1A1A] transition-colors"><Twitter size={20} /></a>
            <a href="#" className="p-2.5 text-[#888] hover:text-[#1A1A1A] transition-colors"><Linkedin size={20} /></a>
            <a href="#" className="p-2.5 text-[#888] hover:text-[#1A1A1A] transition-colors"><Github size={20} /></a>
          </div>
        </div>
      </div>
    </footer>
  );
};