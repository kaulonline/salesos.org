import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, ArrowRight, Zap, FileText, UserPlus, Calendar, Command, Bot, Brain } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const actions = [
    { id: 'agents', label: 'Manage Agents', icon: Bot, action: () => navigate('/dashboard/agents') },
    { id: 'knowledge', label: 'Knowledge Base', icon: Brain, action: () => navigate('/dashboard/knowledge') },
    { id: 'leads', label: 'Go to Leads', icon: UserPlus, action: () => navigate('/dashboard/leads') },
    { id: 'deals', label: 'Go to Opportunities', icon: Zap, action: () => navigate('/dashboard/deals') },
    { id: 'calendar', label: 'View Calendar', icon: Calendar, action: () => navigate('/dashboard/calendar') },
    { id: 'docs', label: 'Search Documents', icon: FileText, action: () => navigate('/dashboard/documents') },
  ];

  const filteredActions = actions.filter(a => a.label.toLowerCase().includes(query.toLowerCase()));

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const executeAction = useCallback((index: number) => {
    const action = filteredActions[index];
    if (action) {
      action.action();
      setIsOpen(false);
      setQuery('');
    }
  }, [filteredActions]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
        if (!isOpen) {
          setQuery('');
          setSelectedIndex(0);
        }
      }
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
        setQuery('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleKeyNavigation = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < filteredActions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev > 0 ? prev - 1 : filteredActions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        executeAction(selectedIndex);
        break;
      case 'Tab':
        e.preventDefault();
        if (e.shiftKey) {
          setSelectedIndex(prev =>
            prev > 0 ? prev - 1 : filteredActions.length - 1
          );
        } else {
          setSelectedIndex(prev =>
            prev < filteredActions.length - 1 ? prev + 1 : 0
          );
        }
        break;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh] px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity"
        onClick={() => { setIsOpen(false); setQuery(''); }}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-2xl bg-[#F2F1EA] rounded-2xl shadow-2xl overflow-hidden border border-black/5 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 px-4 py-4 border-b border-black/5 bg-white/50 backdrop-blur-sm">
           <Search className="text-[#999]" size={20} aria-hidden="true" />
           <input
             ref={inputRef}
             className="flex-1 bg-transparent outline-none text-lg font-medium text-[#1A1A1A] placeholder:text-[#999]"
             placeholder="Type a command or search..."
             value={query}
             onChange={e => setQuery(e.target.value)}
             onKeyDown={handleKeyNavigation}
             role="combobox"
             aria-expanded="true"
             aria-controls="command-list"
             aria-activedescendant={filteredActions[selectedIndex]?.id}
             aria-autocomplete="list"
             aria-label="Search commands"
           />
           <kbd className="flex items-center gap-1 bg-black/5 px-2 py-1 rounded text-xs font-bold text-[#666]">
              <span className="text-xs">ESC</span>
           </kbd>
        </div>

        <div
          ref={listRef}
          id="command-list"
          className="p-2 max-h-[60vh] overflow-y-auto"
          role="listbox"
          aria-label="Command suggestions"
        >
           {filteredActions.length > 0 ? (
             <>
               <div className="px-3 py-2 text-xs font-bold text-[#999] uppercase tracking-wider" aria-hidden="true">Suggestions</div>
               {filteredActions.map((action, i) => (
                 <button
                    key={action.id}
                    id={action.id}
                    role="option"
                    aria-selected={i === selectedIndex}
                    onClick={() => { action.action(); setIsOpen(false); setQuery(''); }}
                    onMouseEnter={() => setSelectedIndex(i)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white hover:shadow-sm transition-all group ${i === selectedIndex ? 'bg-white shadow-sm' : ''}`}
                 >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${i === selectedIndex ? 'bg-[#1A1A1A] text-white' : 'bg-[#EAD07D]/20 text-[#1A1A1A] group-hover:bg-[#1A1A1A] group-hover:text-white'}`}>
                       <action.icon size={18} aria-hidden="true" />
                    </div>
                    <div className="flex-1 text-left">
                       <div className="font-bold text-[#1A1A1A]">{action.label}</div>
                    </div>
                    {i === selectedIndex && <ArrowRight size={16} className="text-[#1A1A1A]" aria-hidden="true" />}
                 </button>
               ))}
             </>
           ) : (
             <div className="py-12 text-center text-[#666]" role="status" aria-live="polite">
                No results found for "{query}"
             </div>
           )}
        </div>

        <div className="px-4 py-3 bg-[#E5E5E0]/50 border-t border-black/5 flex items-center justify-between text-xs text-[#666]" aria-hidden="true">
           <div className="flex gap-4">
              <span><kbd className="font-bold text-[#1A1A1A]">↑↓</kbd> Navigate</span>
              <span><kbd className="font-bold text-[#1A1A1A]">↵</kbd> Select</span>
           </div>
           <div>
              Open with <kbd className="font-bold text-[#1A1A1A]">⌘ K</kbd>
           </div>
        </div>
      </div>
    </div>
  );
};