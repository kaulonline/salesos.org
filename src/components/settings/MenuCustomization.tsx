import React from 'react';
import { Check, RotateCcw, Package, BarChart3, Calendar, Brain, Settings, Eye, EyeOff } from 'lucide-react';
import { useMenuPreferences, MENU_CATEGORIES } from '../../context/MenuPreferencesContext';

const CATEGORY_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  sales: Package,
  analytics: BarChart3,
  productivity: Calendar,
  ai: Brain,
  settings: Settings,
};

export const MenuCustomization: React.FC = () => {
  const {
    preferences,
    toggleCategory,
    toggleItem,
    enableAllInCategory,
    disableAllInCategory,
    resetToDefaults,
    isCategoryEnabled,
    isItemEnabled,
  } = useMenuPreferences();

  const getCategoryItemCount = (categoryId: string) => {
    const category = MENU_CATEGORIES[categoryId as keyof typeof MENU_CATEGORIES];
    const enabledCount = (preferences.enabledItems[categoryId] || []).length;
    return { enabled: enabledCount, total: category.items.length };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[#1A1A1A]">Customize Your Menu</h3>
          <p className="text-sm text-[#666] mt-1">
            Choose which features appear in your navigation. Hidden items can still be accessed via search.
          </p>
        </div>
        <button
          onClick={resetToDefaults}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#666] hover:text-[#1A1A1A] hover:bg-[#F8F8F6] rounded-xl transition-colors"
        >
          <RotateCcw size={16} />
          Reset to Defaults
        </button>
      </div>

      {/* Categories */}
      <div className="space-y-4">
        {Object.entries(MENU_CATEGORIES).map(([categoryId, category]) => {
          const Icon = CATEGORY_ICONS[categoryId] || Settings;
          const isEnabled = isCategoryEnabled(categoryId);
          const { enabled, total } = getCategoryItemCount(categoryId);

          return (
            <div
              key={categoryId}
              className={`bg-white rounded-2xl border transition-all ${
                isEnabled ? 'border-[#EAD07D]/30 shadow-sm' : 'border-black/5 opacity-75'
              }`}
            >
              {/* Category Header */}
              <div className="flex items-center justify-between p-4 border-b border-black/5">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isEnabled ? 'bg-[#EAD07D]/20 text-[#1A1A1A]' : 'bg-[#F8F8F6] text-[#999]'
                  }`}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <h4 className="font-medium text-[#1A1A1A]">{category.label}</h4>
                    <p className="text-xs text-[#666]">{category.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[#999] bg-[#F8F8F6] px-2 py-1 rounded-full">
                    {enabled}/{total} visible
                  </span>
                  <button
                    onClick={() => toggleCategory(categoryId)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      isEnabled ? 'bg-[#EAD07D]' : 'bg-[#E5E5E5]'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        isEnabled ? 'left-7' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Category Items */}
              {isEnabled && (
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-[#999] uppercase tracking-wider">Menu Items</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => enableAllInCategory(categoryId)}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#666] hover:text-[#1A1A1A] hover:bg-[#F8F8F6] rounded-lg transition-colors"
                      >
                        <Eye size={12} />
                        Show All
                      </button>
                      <button
                        onClick={() => disableAllInCategory(categoryId)}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#666] hover:text-[#1A1A1A] hover:bg-[#F8F8F6] rounded-lg transition-colors"
                      >
                        <EyeOff size={12} />
                        Hide All
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {category.items.map((item) => {
                      const itemEnabled = isItemEnabled(categoryId, item.id);
                      return (
                        <button
                          key={item.id}
                          onClick={() => toggleItem(categoryId, item.id)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                            itemEnabled
                              ? 'bg-[#EAD07D]/20 text-[#1A1A1A] border border-[#EAD07D]/30'
                              : 'bg-[#F8F8F6] text-[#666] border border-transparent hover:border-black/10'
                          }`}
                        >
                          <span
                            className={`w-4 h-4 rounded flex items-center justify-center ${
                              itemEnabled ? 'bg-[#EAD07D] text-white' : 'bg-white border border-black/10'
                            }`}
                          >
                            {itemEnabled && <Check size={12} />}
                          </span>
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Info Note */}
      <div className="bg-[#F8F8F6] rounded-2xl p-4 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#EAD07D]/20 flex items-center justify-center flex-shrink-0">
          <Eye size={16} className="text-[#1A1A1A]" />
        </div>
        <div>
          <p className="text-sm font-medium text-[#1A1A1A]">Quick Access</p>
          <p className="text-xs text-[#666] mt-0.5">
            Even hidden menu items can be accessed anytime using the global search (Cmd/Ctrl + K).
            Your preferences are saved automatically and sync across devices.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MenuCustomization;
