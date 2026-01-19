import React, { useState } from 'react';
import {
  Plus,
  Phone,
  Mail,
  Calendar,
  FileText,
  UserPlus,
  MessageSquare,
  DollarSign,
  Search,
  Command,
  X,
  ArrowRight,
  Zap
} from 'lucide-react';
import { Card } from '../ui/Card';

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  shortcut?: string;
  color: string;
  bgColor: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'log-call',
    label: 'Log Call',
    description: 'Record a phone call',
    icon: Phone,
    shortcut: 'C',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100 hover:bg-emerald-200'
  },
  {
    id: 'send-email',
    label: 'Send Email',
    description: 'Compose new email',
    icon: Mail,
    shortcut: 'E',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 hover:bg-blue-200'
  },
  {
    id: 'create-deal',
    label: 'New Deal',
    description: 'Add to pipeline',
    icon: DollarSign,
    shortcut: 'D',
    color: 'text-[#1A1A1A]',
    bgColor: 'bg-[#EAD07D] hover:bg-[#dfc56d]'
  },
  {
    id: 'schedule-meeting',
    label: 'Schedule',
    description: 'Book a meeting',
    icon: Calendar,
    shortcut: 'M',
    color: 'text-violet-600',
    bgColor: 'bg-violet-100 hover:bg-violet-200'
  },
  {
    id: 'add-lead',
    label: 'Add Lead',
    description: 'New contact',
    icon: UserPlus,
    shortcut: 'L',
    color: 'text-sky-600',
    bgColor: 'bg-sky-100 hover:bg-sky-200'
  },
  {
    id: 'create-doc',
    label: 'New Doc',
    description: 'Create proposal',
    icon: FileText,
    shortcut: 'P',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 hover:bg-orange-200'
  }
];

interface QuickActionsProps {
  variant?: 'inline' | 'floating' | 'compact';
  className?: string;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  variant = 'inline',
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);

  const filteredActions = QUICK_ACTIONS.filter(action =>
    action.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    action.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Floating FAB variant
  if (variant === 'floating') {
    return (
      <>
        {/* Backdrop */}
        {isExpanded && (
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 animate-in fade-in duration-200"
            onClick={() => setIsExpanded(false)}
          />
        )}

        {/* Floating Button & Menu */}
        <div className={`fixed bottom-8 right-8 z-50 ${className}`}>
          {/* Expanded Menu */}
          {isExpanded && (
            <div className="absolute bottom-20 right-0 w-80 bg-white rounded-3xl shadow-2xl border border-black/5 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
              {/* Header */}
              <div className="p-4 border-b border-gray-100 bg-[#F8F7F4]">
                <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-2.5 border border-gray-100">
                  <Search size={16} className="text-[#999]" />
                  <input
                    type="text"
                    placeholder="Search actions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#999]"
                    autoFocus
                  />
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 text-[10px] font-medium text-[#666]">
                    <Command size={10} />K
                  </div>
                </div>
              </div>

              {/* Actions Grid */}
              <div className="p-3 grid grid-cols-2 gap-2">
                {filteredActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      onMouseEnter={() => setHoveredAction(action.id)}
                      onMouseLeave={() => setHoveredAction(null)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all duration-200 ${action.bgColor} group`}
                    >
                      <div className="relative">
                        <Icon size={24} className={action.color} />
                        {action.shortcut && (
                          <div className="absolute -top-1 -right-3 w-4 h-4 rounded bg-[#1A1A1A] text-white text-[8px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            {action.shortcut}
                          </div>
                        )}
                      </div>
                      <span className="text-xs font-medium text-[#1A1A1A]">
                        {action.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Footer Hint */}
              <div className="px-4 py-3 border-t border-gray-100 bg-[#F8F7F4]">
                <p className="text-[10px] text-[#999] text-center">
                  Press <span className="font-mono bg-white px-1.5 py-0.5 rounded">⌘K</span> to open from anywhere
                </p>
              </div>
            </div>
          )}

          {/* FAB Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`w-14 h-14 rounded-full bg-[#1A1A1A] text-white shadow-xl shadow-black/20 flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-2xl ${
              isExpanded ? 'rotate-45 bg-[#333]' : ''
            }`}
          >
            {isExpanded ? <X size={24} /> : <Plus size={24} />}
          </button>
        </div>
      </>
    );
  }

  // Compact variant (horizontal strip)
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {QUICK_ACTIONS.slice(0, 4).map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full ${action.bgColor} transition-all duration-200 group`}
            >
              <Icon size={16} className={action.color} />
              <span className="text-sm font-medium text-[#1A1A1A]">{action.label}</span>
            </button>
          );
        })}
        <button className="flex items-center gap-1.5 px-3 py-2.5 rounded-full bg-white/60 backdrop-blur-md border border-white/40 text-sm font-medium text-[#666] hover:text-[#1A1A1A] hover:bg-white transition-all">
          <Plus size={14} />
          More
        </button>
      </div>
    );
  }

  // Inline Card variant (default)
  return (
    <Card className={`p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center">
            <Zap size={20} className="text-[#EAD07D]" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-[#1A1A1A]">Quick Actions</h3>
            <p className="text-xs text-[#999]">Keyboard shortcuts enabled</p>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-[#F8F7F4] rounded-full px-4 py-2 border border-transparent hover:border-gray-200 focus-within:border-[#EAD07D] transition-colors">
          <Search size={14} className="text-[#999]" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-sm outline-none w-24 placeholder:text-[#999]"
          />
        </div>
      </div>

      {/* Actions Grid */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {filteredActions.map((action, index) => {
          const Icon = action.icon;
          const isHovered = hoveredAction === action.id;

          return (
            <button
              key={action.id}
              onMouseEnter={() => setHoveredAction(action.id)}
              onMouseLeave={() => setHoveredAction(null)}
              className={`relative flex flex-col items-center gap-3 p-4 rounded-2xl transition-all duration-200 ${action.bgColor} group animate-in fade-in`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Shortcut Badge */}
              {action.shortcut && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded bg-white/80 backdrop-blur-sm text-[10px] font-bold flex items-center justify-center text-[#666] opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                  {action.shortcut}
                </div>
              )}

              {/* Icon */}
              <div className={`w-12 h-12 rounded-xl bg-white/60 flex items-center justify-center group-hover:scale-110 transition-transform duration-200 ${isHovered ? 'shadow-md' : ''}`}>
                <Icon size={22} className={action.color} />
              </div>

              {/* Label */}
              <div className="text-center">
                <span className="text-sm font-medium text-[#1A1A1A] block">
                  {action.label}
                </span>
                <span className="text-[10px] text-[#999] hidden md:block">
                  {action.description}
                </span>
              </div>

              {/* Hover Arrow */}
              <ArrowRight
                size={14}
                className="absolute bottom-3 right-3 text-[#1A1A1A] opacity-0 group-hover:opacity-60 translate-x-[-4px] group-hover:translate-x-0 transition-all duration-200"
              />
            </button>
          );
        })}
      </div>

      {/* Keyboard Hint */}
      <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-center gap-4">
        <span className="text-[10px] text-[#999]">Quick keys:</span>
        {QUICK_ACTIONS.slice(0, 4).map((action) => (
          <div key={action.id} className="flex items-center gap-1">
            <div className="w-5 h-5 rounded bg-[#F8F7F4] text-[10px] font-mono font-medium flex items-center justify-center text-[#666] border border-gray-200">
              {action.shortcut}
            </div>
            <span className="text-[10px] text-[#999]">{action.label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
};

// Command Palette Modal (can be triggered by ⌘K)
export const CommandPalette: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredActions = QUICK_ACTIONS.filter(action =>
    action.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    action.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 w-full max-w-lg z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="bg-white rounded-3xl shadow-2xl border border-black/5 overflow-hidden mx-4">
          {/* Search Input */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <Search size={20} className="text-[#999]" />
              <input
                type="text"
                placeholder="Type a command or search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-lg outline-none placeholder:text-[#999]"
                autoFocus
              />
              <button
                onClick={onClose}
                className="px-2 py-1 rounded bg-gray-100 text-xs font-medium text-[#666] hover:bg-gray-200 transition-colors"
              >
                ESC
              </button>
            </div>
          </div>

          {/* Results */}
          <div className="p-2 max-h-80 overflow-y-auto">
            <div className="px-3 py-2">
              <span className="text-[10px] font-bold text-[#999] uppercase tracking-wider">
                Quick Actions
              </span>
            </div>
            {filteredActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-[#F8F7F4] transition-colors group"
                >
                  <div className={`w-10 h-10 rounded-xl ${action.bgColor} flex items-center justify-center`}>
                    <Icon size={18} className={action.color} />
                  </div>
                  <div className="flex-1 text-left">
                    <span className="font-medium text-[#1A1A1A] block">
                      {action.label}
                    </span>
                    <span className="text-xs text-[#999]">
                      {action.description}
                    </span>
                  </div>
                  {action.shortcut && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="px-2 py-1 rounded bg-gray-100 text-xs font-mono font-medium text-[#666]">
                        ⌘{action.shortcut}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-100 bg-[#F8F7F4] flex items-center justify-between">
            <div className="flex items-center gap-4 text-[10px] text-[#999]">
              <span><kbd className="font-mono bg-white px-1.5 py-0.5 rounded border border-gray-200">↑↓</kbd> Navigate</span>
              <span><kbd className="font-mono bg-white px-1.5 py-0.5 rounded border border-gray-200">↵</kbd> Select</span>
            </div>
            <span className="text-[10px] text-[#999]">
              {filteredActions.length} results
            </span>
          </div>
        </div>
      </div>
    </>
  );
};
