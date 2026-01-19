import React, { useState, useEffect } from 'react';
import { Search, ArrowRight, Zap, FileText, UserPlus, Calendar, Command } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isOpen) return null;

  const actions = [
    { id: 'leads', label: 'Go to Leads', icon: UserPlus, action: () => navigate('/dashboard/leads') },
    { id: 'deals', label: 'Go to Deals', icon: Zap, action: () => navigate('/dashboard/deals') },
    { id: 'calendar', label: 'View Calendar', icon: Calendar, action: () => navigate('/dashboard/calendar') },
    { id: 'docs', label: 'Search Documents', icon: FileText, action: () => navigate('/dashboard/documents') },
  ];

  const filteredActions = actions.filter(a => a.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh] px-4">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" onClick={() => setIsOpen(false)} />
      
      <div className="relative w-full max-w-2xl bg-[#F2F1EA] rounded-2xl shadow-2xl overflow-hidden border border-black/5 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 px-4 py-4 border-b border-black/5 bg-white/50 backdrop-blur-sm">
           <Search className="text-[#999]" size={20} />
           <input 
             autoFocus
             className="flex-1 bg-transparent outline-none text-lg font-medium text-[#1A1A1A] placeholder:text-[#999]"
             placeholder="Type a command or search..."
             value={query}
             onChange={e => setQuery(e.target.value)}
           />
           <div className="flex items-center gap-1 bg-black/5 px-2 py-1 rounded text-xs font-bold text-[#666]">
              <span className="text-xs">ESC</span>
           </div>
        </div>
        
        <div className="p-2 max-h-[60vh] overflow-y-auto">
           {filteredActions.length > 0 ? (
             <>
               <div className="px-3 py-2 text-xs font-bold text-[#999] uppercase tracking-wider">Suggestions</div>
               {filteredActions.map((action, i) => (
                 <button 
                    key={action.id}
                    onClick={() => { action.action(); setIsOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white hover:shadow-sm transition-all group ${i === 0 ? 'bg-white shadow-sm' : ''}`}
                 >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${i === 0 ? 'bg-[#1A1A1A] text-white' : 'bg-[#EAD07D]/20 text-[#1A1A1A] group-hover:bg-[#1A1A1A] group-hover:text-white'}`}>
                       <action.icon size={18} />
                    </div>
                    <div className="flex-1 text-left">
                       <div className="font-bold text-[#1A1A1A]">{action.label}</div>
                    </div>
                    {i === 0 && <ArrowRight size={16} className="text-[#1A1A1A]" />}
                 </button>
               ))}
             </>
           ) : (
             <div className="py-12 text-center text-[#666]">
                No results found for "{query}"
             </div>
           )}
        </div>
        
        <div className="px-4 py-3 bg-[#E5E5E0]/50 border-t border-black/5 flex items-center justify-between text-xs text-[#666]">
           <div className="flex gap-4">
              <span><strong className="font-bold text-[#1A1A1A]">↑↓</strong> Navigate</span>
              <span><strong className="font-bold text-[#1A1A1A]">↵</strong> Select</span>
           </div>
           <div>
              Open with <strong className="font-bold text-[#1A1A1A]">⌘ K</strong>
           </div>
        </div>
      </div>
    </div>
  );
};