import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { client } from '../api';

// All available menu items organized by category
export const MENU_CATEGORIES = {
  sales: {
    label: 'Sales Operations',
    description: 'Quotes, orders, and product management',
    items: [
      { id: 'products', label: 'Products', href: '/dashboard/products' },
      { id: 'quotes', label: 'Quotes', href: '/dashboard/quotes' },
      { id: 'orders', label: 'Orders', href: '/dashboard/orders' },
      { id: 'cpq-analytics', label: 'CPQ Analytics', href: '/dashboard/cpq-analytics' },
    ],
  },
  analytics: {
    label: 'Analytics & Insights',
    description: 'Reports, forecasts, and performance tracking',
    items: [
      { id: 'analytics', label: 'Analytics', href: '/dashboard/analytics' },
      { id: 'revenue', label: 'Revenue', href: '/dashboard/revenue' },
      { id: 'forecast', label: 'Forecast', href: '/dashboard/forecast' },
      { id: 'win-loss', label: 'Win/Loss', href: '/dashboard/win-loss' },
      { id: 'account-health', label: 'Account Health', href: '/dashboard/account-health' },
    ],
  },
  productivity: {
    label: 'Productivity',
    description: 'Calendar, messaging, and team tools',
    items: [
      { id: 'calendar', label: 'Calendar', href: '/dashboard/calendar' },
      { id: 'messages', label: 'Messages', href: '/dashboard/messages' },
      { id: 'campaigns', label: 'Campaigns', href: '/dashboard/campaigns' },
      { id: 'email-templates', label: 'Email Templates', href: '/dashboard/email-templates' },
      { id: 'territories', label: 'Territories', href: '/dashboard/territories' },
      { id: 'playbooks', label: 'Playbooks', href: '/dashboard/playbooks' },
    ],
  },
  ai: {
    label: 'AI Features',
    description: 'AI-powered automation and insights',
    items: [
      { id: 'ai-agents', label: 'AI Agents', href: '/dashboard/ai-agents' },
      { id: 'ai-alerts', label: 'AI Alerts', href: '/dashboard/alerts' },
      { id: 'conversations', label: 'Conversations', href: '/dashboard/conversations' },
      { id: 'knowledge', label: 'Knowledge Base', href: '/dashboard/knowledge' },
    ],
  },
  settings: {
    label: 'Settings & Admin',
    description: 'Configuration and system settings',
    items: [
      { id: 'settings', label: 'General Settings', href: '/dashboard/settings' },
      { id: 'team', label: 'Team', href: '/dashboard/team' },
      { id: 'subscription', label: 'Subscription', href: '/dashboard/subscription' },
      { id: 'automations', label: 'Automations', href: '/dashboard/automations' },
      { id: 'approval-workflows', label: 'Approval Workflows', href: '/dashboard/settings/approval-workflows' },
      { id: 'assignment-rules', label: 'Assignment Rules', href: '/dashboard/settings/assignment-rules' },
      { id: 'custom-fields', label: 'Custom Fields', href: '/dashboard/settings/custom-fields' },
      { id: 'web-forms', label: 'Web Forms', href: '/dashboard/settings/web-forms' },
      { id: 'integrations', label: 'Integrations', href: '/dashboard/integrations' },
      { id: 'reports', label: 'Reports', href: '/dashboard/reports' },
      { id: 'profiles', label: 'Profiles & Roles', href: '/dashboard/settings/profiles' },
      { id: 'security', label: 'Security', href: '/dashboard/settings/security' },
      { id: 'privacy', label: 'Data & Privacy', href: '/dashboard/settings/privacy' },
      { id: 'notifications', label: 'Notifications', href: '/dashboard/settings/notifications' },
      { id: 'api', label: 'API & Webhooks', href: '/dashboard/settings/api' },
    ],
  },
};

// Default: all items visible
const getDefaultPreferences = (): MenuPreferences => {
  const prefs: MenuPreferences = {
    enabledCategories: Object.keys(MENU_CATEGORIES),
    enabledItems: {},
  };

  Object.entries(MENU_CATEGORIES).forEach(([categoryId, category]) => {
    prefs.enabledItems[categoryId] = category.items.map(item => item.id);
  });

  return prefs;
};

export interface MenuPreferences {
  enabledCategories: string[];
  enabledItems: Record<string, string[]>;
}

interface MenuPreferencesContextType {
  preferences: MenuPreferences;
  isLoading: boolean;
  toggleCategory: (categoryId: string) => void;
  toggleItem: (categoryId: string, itemId: string) => void;
  enableAllInCategory: (categoryId: string) => void;
  disableAllInCategory: (categoryId: string) => void;
  resetToDefaults: () => void;
  isCategoryEnabled: (categoryId: string) => boolean;
  isItemEnabled: (categoryId: string, itemId: string) => boolean;
  getVisibleItems: (categoryId: string) => typeof MENU_CATEGORIES.sales.items;
}

const MenuPreferencesContext = createContext<MenuPreferencesContextType | undefined>(undefined);

const STORAGE_KEY = 'salesos_menu_preferences';

export const MenuPreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<MenuPreferences>(getDefaultPreferences());
  const [isLoading, setIsLoading] = useState(true);

  // Load preferences from API or localStorage
  useEffect(() => {
    const loadPreferences = async () => {
      setIsLoading(true);
      try {
        // Try to load from API first
        if (user?.id) {
          const response = await client.get('/users/me/preferences');
          if (response.data?.menuPreferences) {
            setPreferences(response.data.menuPreferences);
            setIsLoading(false);
            return;
          }
        }
      } catch {
        // API failed, fall back to localStorage
      }

      // Fall back to localStorage
      const stored = localStorage.getItem(`${STORAGE_KEY}_${user?.id || 'guest'}`);
      if (stored) {
        try {
          setPreferences(JSON.parse(stored));
        } catch {
          setPreferences(getDefaultPreferences());
        }
      }
      setIsLoading(false);
    };

    loadPreferences();
  }, [user?.id]);

  // Save preferences
  const savePreferences = useCallback(async (newPrefs: MenuPreferences) => {
    setPreferences(newPrefs);

    // Save to localStorage immediately
    localStorage.setItem(`${STORAGE_KEY}_${user?.id || 'guest'}`, JSON.stringify(newPrefs));

    // Try to save to API
    if (user?.id) {
      try {
        await client.patch('/users/me/preferences', { menuPreferences: newPrefs });
      } catch {
        // Silently fail - localStorage is the backup
      }
    }
  }, [user?.id]);

  const toggleCategory = useCallback((categoryId: string) => {
    setPreferences(prev => {
      const isEnabled = prev.enabledCategories.includes(categoryId);
      const newPrefs = {
        ...prev,
        enabledCategories: isEnabled
          ? prev.enabledCategories.filter(id => id !== categoryId)
          : [...prev.enabledCategories, categoryId],
      };
      savePreferences(newPrefs);
      return newPrefs;
    });
  }, [savePreferences]);

  const toggleItem = useCallback((categoryId: string, itemId: string) => {
    setPreferences(prev => {
      const categoryItems = prev.enabledItems[categoryId] || [];
      const isEnabled = categoryItems.includes(itemId);
      const newPrefs = {
        ...prev,
        enabledItems: {
          ...prev.enabledItems,
          [categoryId]: isEnabled
            ? categoryItems.filter(id => id !== itemId)
            : [...categoryItems, itemId],
        },
      };
      savePreferences(newPrefs);
      return newPrefs;
    });
  }, [savePreferences]);

  const enableAllInCategory = useCallback((categoryId: string) => {
    const category = MENU_CATEGORIES[categoryId as keyof typeof MENU_CATEGORIES];
    if (!category) return;

    setPreferences(prev => {
      const newPrefs = {
        ...prev,
        enabledCategories: prev.enabledCategories.includes(categoryId)
          ? prev.enabledCategories
          : [...prev.enabledCategories, categoryId],
        enabledItems: {
          ...prev.enabledItems,
          [categoryId]: category.items.map(item => item.id),
        },
      };
      savePreferences(newPrefs);
      return newPrefs;
    });
  }, [savePreferences]);

  const disableAllInCategory = useCallback((categoryId: string) => {
    setPreferences(prev => {
      const newPrefs = {
        ...prev,
        enabledItems: {
          ...prev.enabledItems,
          [categoryId]: [],
        },
      };
      savePreferences(newPrefs);
      return newPrefs;
    });
  }, [savePreferences]);

  const resetToDefaults = useCallback(() => {
    const defaults = getDefaultPreferences();
    savePreferences(defaults);
  }, [savePreferences]);

  const isCategoryEnabled = useCallback((categoryId: string) => {
    return preferences.enabledCategories.includes(categoryId);
  }, [preferences.enabledCategories]);

  const isItemEnabled = useCallback((categoryId: string, itemId: string) => {
    const categoryItems = preferences.enabledItems[categoryId] || [];
    return categoryItems.includes(itemId);
  }, [preferences.enabledItems]);

  const getVisibleItems = useCallback((categoryId: string) => {
    const category = MENU_CATEGORIES[categoryId as keyof typeof MENU_CATEGORIES];
    if (!category || !preferences.enabledCategories.includes(categoryId)) {
      return [];
    }
    const enabledItemIds = preferences.enabledItems[categoryId] || [];
    return category.items.filter(item => enabledItemIds.includes(item.id));
  }, [preferences]);

  return (
    <MenuPreferencesContext.Provider
      value={{
        preferences,
        isLoading,
        toggleCategory,
        toggleItem,
        enableAllInCategory,
        disableAllInCategory,
        resetToDefaults,
        isCategoryEnabled,
        isItemEnabled,
        getVisibleItems,
      }}
    >
      {children}
    </MenuPreferencesContext.Provider>
  );
};

export const useMenuPreferences = () => {
  const context = useContext(MenuPreferencesContext);
  if (!context) {
    throw new Error('useMenuPreferences must be used within a MenuPreferencesProvider');
  }
  return context;
};
