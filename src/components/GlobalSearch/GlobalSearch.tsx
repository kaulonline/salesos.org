import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  X,
  User,
  Building2,
  Users,
  DollarSign,
  Clock,
  ArrowRight,
  Loader2,
  Command,
  Package,
  Megaphone,
  CheckSquare,
} from 'lucide-react';
import { leadsApi, Lead } from '../../api/leads';
import { contactsApi, Contact } from '../../api/contacts';
import { accountsApi, Account } from '../../api/accounts';
import { opportunitiesApi, Opportunity } from '../../api/opportunities';
import { productsApi, Product } from '../../api/products';
import { campaignsApi } from '../../api/campaigns';
import { tasksApi } from '../../api/tasks';
import type { Campaign, Task } from '../../types';

interface SearchResult {
  id: string;
  type: 'lead' | 'contact' | 'account' | 'opportunity' | 'product' | 'campaign' | 'task';
  title: string;
  subtitle: string;
  meta?: string;
  url: string;
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

const RESULT_ICONS = {
  lead: User,
  contact: Users,
  account: Building2,
  opportunity: DollarSign,
  product: Package,
  campaign: Megaphone,
  task: CheckSquare,
};

const RESULT_COLORS = {
  lead: 'text-blue-600 bg-blue-50',
  contact: 'text-purple-600 bg-purple-50',
  account: 'text-green-600 bg-green-50',
  opportunity: 'text-amber-600 bg-amber-50',
  product: 'text-indigo-600 bg-indigo-50',
  campaign: 'text-pink-600 bg-pink-50',
  task: 'text-teal-600 bg-teal-50',
};

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('salesos_recent_searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved).slice(0, 5));
      } catch {
        // Ignore
      }
    }
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  // Search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    const q = searchQuery.toLowerCase();

    try {
      // Fetch data from all entities in parallel
      const [leadsData, contactsData, accountsData, oppsData, productsData, campaignsData, tasksData] = await Promise.all([
        leadsApi.getAll().catch(() => []),
        contactsApi.getAll().catch(() => []),
        accountsApi.getAll().catch(() => []),
        opportunitiesApi.getAll().catch(() => []),
        productsApi.getAll().catch(() => []),
        campaignsApi.getAll().catch(() => []),
        tasksApi.getAll().catch(() => []),
      ]);

      const allResults: SearchResult[] = [];

      // Search leads - expanded fields
      const leads = (leadsData || []) as Lead[];
      leads
        .filter(lead =>
          lead.firstName?.toLowerCase().includes(q) ||
          lead.lastName?.toLowerCase().includes(q) ||
          lead.email?.toLowerCase().includes(q) ||
          lead.company?.toLowerCase().includes(q) ||
          lead.phone?.toLowerCase().includes(q) ||
          lead.title?.toLowerCase().includes(q) ||
          lead.description?.toLowerCase().includes(q) ||
          lead.status?.toLowerCase().includes(q) ||
          lead.rating?.toLowerCase().includes(q)
        )
        .slice(0, 5)
        .forEach(lead => {
          allResults.push({
            id: lead.id,
            type: 'lead',
            title: `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || lead.email,
            subtitle: lead.company || lead.title || 'No company',
            meta: lead.status,
            url: `/dashboard/leads/${lead.id}`,
          });
        });

      // Search contacts - expanded fields
      const contacts = (contactsData || []) as Contact[];
      contacts
        .filter(contact =>
          contact.firstName?.toLowerCase().includes(q) ||
          contact.lastName?.toLowerCase().includes(q) ||
          contact.email?.toLowerCase().includes(q) ||
          contact.title?.toLowerCase().includes(q) ||
          contact.phone?.toLowerCase().includes(q) ||
          contact.mobilePhone?.toLowerCase().includes(q) ||
          contact.department?.toLowerCase().includes(q) ||
          (contact.account?.name)?.toLowerCase().includes(q)
        )
        .slice(0, 5)
        .forEach(contact => {
          allResults.push({
            id: contact.id,
            type: 'contact',
            title: `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || contact.email,
            subtitle: contact.title || contact.account?.name || 'No title',
            meta: contact.account?.name ? 'Has Account' : undefined,
            url: `/dashboard/contacts/${contact.id}`,
          });
        });

      // Search accounts - expanded fields
      const accounts = (accountsData || []) as Account[];
      accounts
        .filter(account =>
          account.name?.toLowerCase().includes(q) ||
          account.industry?.toLowerCase().includes(q) ||
          account.website?.toLowerCase().includes(q) ||
          account.phone?.toLowerCase().includes(q) ||
          account.description?.toLowerCase().includes(q) ||
          account.type?.toLowerCase().includes(q)
        )
        .slice(0, 5)
        .forEach(account => {
          allResults.push({
            id: account.id,
            type: 'account',
            title: account.name,
            subtitle: account.industry || 'No industry',
            meta: account.type,
            url: `/dashboard/companies/${account.id}`,
          });
        });

      // Search opportunities - expanded fields
      const opportunities = (oppsData || []) as Opportunity[];
      opportunities
        .filter(opp =>
          opp.name?.toLowerCase().includes(q) ||
          opp.stage?.toLowerCase().includes(q) ||
          opp.description?.toLowerCase().includes(q) ||
          opp.type?.toLowerCase().includes(q) ||
          (opp.account?.name)?.toLowerCase().includes(q)
        )
        .slice(0, 5)
        .forEach(opp => {
          allResults.push({
            id: opp.id,
            type: 'opportunity',
            title: opp.name,
            subtitle: opp.account?.name || `$${(opp.amount || 0).toLocaleString()}`,
            meta: opp.stage,
            url: `/dashboard/deals/${opp.id}`,
          });
        });

      // Search products
      const products = (productsData || []) as Product[];
      products
        .filter(product =>
          product.name?.toLowerCase().includes(q) ||
          product.sku?.toLowerCase().includes(q) ||
          product.description?.toLowerCase().includes(q) ||
          product.type?.toLowerCase().includes(q) ||
          product.category?.toLowerCase().includes(q)
        )
        .slice(0, 5)
        .forEach(product => {
          allResults.push({
            id: product.id,
            type: 'product',
            title: product.name,
            subtitle: `$${(product.listPrice || 0).toLocaleString()} • ${product.sku}`,
            meta: product.type,
            url: `/dashboard/products/${product.id}`,
          });
        });

      // Search campaigns
      const campaigns = (campaignsData || []) as Campaign[];
      campaigns
        .filter(campaign =>
          campaign.name?.toLowerCase().includes(q) ||
          campaign.description?.toLowerCase().includes(q) ||
          campaign.type?.toLowerCase().includes(q) ||
          campaign.status?.toLowerCase().includes(q)
        )
        .slice(0, 5)
        .forEach(campaign => {
          allResults.push({
            id: campaign.id,
            type: 'campaign',
            title: campaign.name,
            subtitle: campaign.type || 'Campaign',
            meta: campaign.status,
            url: `/dashboard/campaigns/${campaign.id}`,
          });
        });

      // Search tasks
      const tasks = (tasksData || []) as Task[];
      tasks
        .filter(task =>
          task.subject?.toLowerCase().includes(q) ||
          task.description?.toLowerCase().includes(q) ||
          task.status?.toLowerCase().includes(q) ||
          task.priority?.toLowerCase().includes(q)
        )
        .slice(0, 5)
        .forEach(task => {
          allResults.push({
            id: task.id,
            type: 'task',
            title: task.subject,
            subtitle: task.dueDate ? `Due: ${new Date(task.dueDate).toLocaleDateString()}` : 'No due date',
            meta: task.status,
            url: `/dashboard/tasks?taskId=${task.id}`,
          });
        });

      setResults(allResults.slice(0, 15));
      setSelectedIndex(0);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, performSearch]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    }
  };

  // Handle result selection
  const handleSelect = (result: SearchResult) => {
    // Save to recent searches
    const newRecent = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    setRecentSearches(newRecent);
    localStorage.setItem('salesos_recent_searches', JSON.stringify(newRecent));

    navigate(result.url);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Search Modal */}
      <div className="relative min-h-screen flex items-start justify-center pt-[15vh] px-4">
        <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
            <Search size={20} className="text-gray-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search leads, contacts, companies, deals..."
              className="flex-1 text-lg outline-none placeholder:text-gray-400"
            />
            {loading && <Loader2 size={20} className="text-gray-400 animate-spin" />}
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">esc</kbd>
              <span>to close</span>
            </div>
          </div>

          {/* Results */}
          <div className="max-h-[60vh] overflow-y-auto">
            {query.trim() === '' && recentSearches.length > 0 && (
              <div className="p-4">
                <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                  Recent Searches
                </div>
                {recentSearches.map((search, idx) => (
                  <button
                    key={idx}
                    onClick={() => setQuery(search)}
                    className="flex items-center gap-3 w-full px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <Clock size={14} className="text-gray-400" />
                    {search}
                  </button>
                ))}
              </div>
            )}

            {query.trim() !== '' && results.length === 0 && !loading && (
              <div className="p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <Search size={20} className="text-gray-400" />
                </div>
                <p className="text-gray-600 font-medium">No results found</p>
                <p className="text-sm text-gray-400 mt-1">Try a different search term</p>
              </div>
            )}

            {results.length > 0 && (
              <div className="p-2">
                {['lead', 'contact', 'account', 'opportunity', 'product', 'campaign', 'task'].map(type => {
                  const typeResults = results.filter(r => r.type === type);
                  if (typeResults.length === 0) return null;

                  const Icon = RESULT_ICONS[type as keyof typeof RESULT_ICONS];
                  const colorClass = RESULT_COLORS[type as keyof typeof RESULT_COLORS];

                  return (
                    <div key={type} className="mb-3 last:mb-0">
                      <div className="px-3 py-1.5 text-xs font-medium text-gray-400 uppercase tracking-wider">
                        {type === 'lead' && 'Leads'}
                        {type === 'contact' && 'Contacts'}
                        {type === 'account' && 'Companies'}
                        {type === 'opportunity' && 'Deals'}
                        {type === 'product' && 'Products'}
                        {type === 'campaign' && 'Campaigns'}
                        {type === 'task' && 'Tasks'}
                      </div>
                      {typeResults.map((result, idx) => {
                        const globalIdx = results.indexOf(result);
                        const isSelected = globalIdx === selectedIndex;

                        return (
                          <button
                            key={result.id}
                            onClick={() => handleSelect(result)}
                            onMouseEnter={() => setSelectedIndex(globalIdx)}
                            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-colors ${
                              isSelected ? 'bg-[#1A1A1A] text-white' : 'hover:bg-gray-50'
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              isSelected ? 'bg-white/20' : colorClass
                            }`}>
                              <Icon size={16} className={isSelected ? 'text-white' : ''} />
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                              <div className={`font-medium truncate ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                                {result.title}
                              </div>
                              <div className={`text-sm truncate ${isSelected ? 'text-white/70' : 'text-gray-500'}`}>
                                {result.subtitle}
                              </div>
                            </div>
                            {result.meta && (
                              <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                                isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                              }`}>
                                {result.meta}
                              </span>
                            )}
                            <ArrowRight size={14} className={`flex-shrink-0 ${
                              isSelected ? 'text-white' : 'text-gray-300'
                            }`} />
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded">↓</kbd>
                <span className="ml-1">to navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded">enter</kbd>
                <span className="ml-1">to select</span>
              </span>
            </div>
            <span>Powered by SalesOS</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Hook for global keyboard shortcut
export const useGlobalSearch = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to open search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isOpen,
    openSearch: () => setIsOpen(true),
    closeSearch: () => setIsOpen(false),
  };
};

export default GlobalSearch;
