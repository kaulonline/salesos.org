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
  Calendar,
  FileText,
  ShoppingCart,
  Handshake,
  Swords,
  HardDrive,
  Map,
} from 'lucide-react';
import { leadsApi } from '../../api/leads';
import { contactsApi } from '../../api/contacts';
import { accountsApi } from '../../api/accounts';
import { opportunitiesApi } from '../../api/opportunities';
import { productsApi } from '../../api/products';
import { campaignsApi } from '../../api/campaigns';
import { tasksApi } from '../../api/tasks';
import { meetingsApi } from '../../api/meetings';
import { quotesApi } from '../../api/quotes';
import { ordersApi } from '../../api/orders';
import { partnersApi } from '../../api/partners';
import { competitorsApi } from '../../api/competitors';
import { assetsApi } from '../../api/assets';
import { territoriesApi } from '../../api/territories';
import type { Lead, Contact, Account, Opportunity, Task } from '../../types';
import type { Product } from '../../api/products';
import type { Campaign } from '../../types/campaign';
import type { Meeting } from '../../types/meeting';
import type { Quote } from '../../types/quote';
import type { Order } from '../../types/order';
import type { Partner } from '../../types/partner';
import type { Competitor } from '../../types/competitor';
import type { Asset } from '../../types/asset';
import type { Territory } from '../../types/territory';
import { logger } from '../../lib/logger';

type SearchResultType =
  | 'lead' | 'contact' | 'account' | 'opportunity' | 'product' | 'campaign' | 'task'
  | 'meeting' | 'quote' | 'order' | 'partner' | 'competitor' | 'asset' | 'territory';

interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  meta?: string;
  url: string;
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

const RESULT_ICONS: Record<SearchResultType, React.ElementType> = {
  lead: User,
  contact: Users,
  account: Building2,
  opportunity: DollarSign,
  product: Package,
  campaign: Megaphone,
  task: CheckSquare,
  meeting: Calendar,
  quote: FileText,
  order: ShoppingCart,
  partner: Handshake,
  competitor: Swords,
  asset: HardDrive,
  territory: Map,
};

const RESULT_COLORS: Record<SearchResultType, string> = {
  lead: 'text-blue-600 bg-blue-50',
  contact: 'text-purple-600 bg-purple-50',
  account: 'text-green-600 bg-green-50',
  opportunity: 'text-amber-600 bg-amber-50',
  product: 'text-indigo-600 bg-indigo-50',
  campaign: 'text-pink-600 bg-pink-50',
  task: 'text-teal-600 bg-teal-50',
  meeting: 'text-orange-600 bg-orange-50',
  quote: 'text-cyan-600 bg-cyan-50',
  order: 'text-rose-600 bg-rose-50',
  partner: 'text-emerald-600 bg-emerald-50',
  competitor: 'text-red-600 bg-red-50',
  asset: 'text-slate-600 bg-slate-50',
  territory: 'text-violet-600 bg-violet-50',
};

const RESULT_LABELS: Record<SearchResultType, string> = {
  lead: 'Leads',
  contact: 'Contacts',
  account: 'Companies',
  opportunity: 'Deals',
  product: 'Products',
  campaign: 'Campaigns',
  task: 'Tasks',
  meeting: 'Meetings',
  quote: 'Quotes',
  order: 'Orders',
  partner: 'Partners',
  competitor: 'Competitors',
  asset: 'Assets',
  territory: 'Territories',
};

const ALL_SEARCH_TYPES: SearchResultType[] = [
  'lead', 'contact', 'account', 'opportunity', 'product', 'campaign', 'task',
  'meeting', 'quote', 'order', 'partner', 'competitor', 'asset', 'territory',
];

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
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
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
      const [
        leadsData, contactsData, accountsData, oppsData, productsData, campaignsData, tasksData,
        meetingsData, quotesData, ordersData, partnersData, competitorsData, assetsData, territoriesData,
      ] = await Promise.all([
        leadsApi.getAll().catch(() => []),
        contactsApi.getAll().catch(() => []),
        accountsApi.getAll().catch(() => []),
        opportunitiesApi.getAll().catch(() => []),
        productsApi.getAll().catch(() => []),
        campaignsApi.getAll().catch(() => []),
        tasksApi.getAll().catch(() => []),
        meetingsApi.getAll().catch(() => []),
        quotesApi.getAll().catch(() => []),
        ordersApi.getAll().catch(() => []),
        partnersApi.getAll().catch(() => []),
        competitorsApi.getAll().catch(() => []),
        assetsApi.getAll().catch(() => []),
        territoriesApi.getAll().catch(() => []),
      ]);

      const allResults: SearchResult[] = [];

      // Search leads
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
            title: `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || lead.email || 'Unknown Lead',
            subtitle: lead.company || lead.title || 'No company',
            meta: lead.status,
            url: `/dashboard/leads/${lead.id}`,
          });
        });

      // Search contacts
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
            title: `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || contact.email || 'Unknown Contact',
            subtitle: contact.title || contact.account?.name || 'No title',
            meta: contact.account?.name ? 'Has Account' : undefined,
            url: `/dashboard/contacts/${contact.id}`,
          });
        });

      // Search accounts
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

      // Search opportunities
      const opportunities = (oppsData || []) as Opportunity[];
      opportunities
        .filter(opp =>
          opp.name?.toLowerCase().includes(q) ||
          opp.stage?.toLowerCase().includes(q) ||
          opp.nextStep?.toLowerCase().includes(q) ||
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

      // Search meetings
      const meetings = (meetingsData || []) as Meeting[];
      meetings
        .filter(meeting =>
          meeting.title?.toLowerCase().includes(q) ||
          meeting.description?.toLowerCase().includes(q) ||
          meeting.location?.toLowerCase().includes(q) ||
          meeting.type?.toLowerCase().includes(q) ||
          meeting.status?.toLowerCase().includes(q)
        )
        .slice(0, 5)
        .forEach(meeting => {
          allResults.push({
            id: meeting.id,
            type: 'meeting',
            title: meeting.title,
            subtitle: meeting.startTime ? new Date(meeting.startTime).toLocaleString() : 'No date',
            meta: meeting.status,
            url: `/dashboard/calendar?meetingId=${meeting.id}`,
          });
        });

      // Search quotes
      const quotes = (quotesData || []) as Quote[];
      quotes
        .filter(quote =>
          quote.name?.toLowerCase().includes(q) ||
          quote.quoteNumber?.toLowerCase().includes(q) ||
          quote.status?.toLowerCase().includes(q)
        )
        .slice(0, 5)
        .forEach(quote => {
          allResults.push({
            id: quote.id,
            type: 'quote',
            title: quote.name || quote.quoteNumber,
            subtitle: `$${(quote.subtotal || 0).toLocaleString()} • ${quote.quoteNumber}`,
            meta: quote.status,
            url: `/dashboard/quotes/${quote.id}`,
          });
        });

      // Search orders
      const orders = (ordersData || []) as Order[];
      orders
        .filter(order =>
          order.orderNumber?.toLowerCase().includes(q) ||
          order.name?.toLowerCase().includes(q) ||
          order.status?.toLowerCase().includes(q) ||
          order.account?.name?.toLowerCase().includes(q)
        )
        .slice(0, 5)
        .forEach(order => {
          allResults.push({
            id: order.id,
            type: 'order',
            title: order.name || order.orderNumber,
            subtitle: order.account?.name || `$${(order.subtotal || 0).toLocaleString()}`,
            meta: order.status,
            url: `/dashboard/orders/${order.id}`,
          });
        });

      // Search partners
      const partners = (partnersData || []) as Partner[];
      partners
        .filter(partner =>
          partner.companyName?.toLowerCase().includes(q) ||
          partner.type?.toLowerCase().includes(q) ||
          partner.tier?.toLowerCase().includes(q) ||
          partner.status?.toLowerCase().includes(q) ||
          partner.website?.toLowerCase().includes(q)
        )
        .slice(0, 5)
        .forEach(partner => {
          allResults.push({
            id: partner.id,
            type: 'partner',
            title: partner.companyName,
            subtitle: `${partner.tier} • ${partner.type}`,
            meta: partner.status,
            url: `/dashboard/partners/${partner.id}`,
          });
        });

      // Search competitors
      const competitors = (competitorsData || []) as Competitor[];
      competitors
        .filter(competitor =>
          competitor.name?.toLowerCase().includes(q) ||
          competitor.description?.toLowerCase().includes(q) ||
          competitor.targetMarket?.toLowerCase().includes(q) ||
          competitor.website?.toLowerCase().includes(q) ||
          competitor.tier?.toLowerCase().includes(q)
        )
        .slice(0, 5)
        .forEach(competitor => {
          allResults.push({
            id: competitor.id,
            type: 'competitor',
            title: competitor.name,
            subtitle: competitor.targetMarket || competitor.tier || 'Competitor',
            meta: competitor.status,
            url: `/dashboard/competitors/${competitor.id}`,
          });
        });

      // Search assets
      const assets = (assetsData || []) as Asset[];
      assets
        .filter(asset =>
          asset.name?.toLowerCase().includes(q) ||
          asset.serialNumber?.toLowerCase().includes(q) ||
          asset.status?.toLowerCase().includes(q) ||
          asset.licenseKey?.toLowerCase().includes(q)
        )
        .slice(0, 5)
        .forEach(asset => {
          allResults.push({
            id: asset.id,
            type: 'asset',
            title: asset.name,
            subtitle: asset.serialNumber || `Qty: ${asset.quantity}`,
            meta: asset.status,
            url: `/dashboard/assets/${asset.id}`,
          });
        });

      // Search territories
      const territories = (territoriesData || []) as Territory[];
      territories
        .filter(territory =>
          territory.name?.toLowerCase().includes(q) ||
          territory.description?.toLowerCase().includes(q) ||
          territory.type?.toLowerCase().includes(q) ||
          territory.owner?.name?.toLowerCase().includes(q)
        )
        .slice(0, 5)
        .forEach(territory => {
          allResults.push({
            id: territory.id,
            type: 'territory',
            title: territory.name,
            subtitle: territory.owner?.name || territory.type || 'Territory',
            meta: territory.isActive ? 'Active' : 'Inactive',
            url: `/dashboard/territories/${territory.id}`,
          });
        });

      setResults(allResults.slice(0, 20));
      setSelectedIndex(0);
    } catch (error) {
      logger.error('Search failed:', error);
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
              placeholder="Search everything — leads, deals, quotes, orders..."
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
                {ALL_SEARCH_TYPES.map(type => {
                  const typeResults = results.filter(r => r.type === type);
                  if (typeResults.length === 0) return null;

                  const Icon = RESULT_ICONS[type];
                  const colorClass = RESULT_COLORS[type];

                  return (
                    <div key={type} className="mb-3 last:mb-0">
                      <div className="px-3 py-1.5 text-xs font-medium text-gray-400 uppercase tracking-wider">
                        {RESULT_LABELS[type]}
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
