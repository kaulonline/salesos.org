import React, { useState, useEffect } from 'react';
import {
  Bell,
  Mail,
  Smartphone,
  Monitor,
  Check,
  X,
  AlertCircle,
  Target,
  Users,
  Calendar,
  FileText,
  ShoppingCart,
  Megaphone,
  Settings,
  Loader2,
  TestTube
} from 'lucide-react';
import { usePushNotifications } from '../../../src/hooks/usePushNotifications';

interface NotificationChannel {
  id: 'email' | 'push' | 'inApp';
  name: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
}

interface NotificationCategory {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  channels: {
    email: boolean;
    push: boolean;
    inApp: boolean;
  };
}

const STORAGE_KEY = 'salesos_notification_preferences';

const defaultCategories: NotificationCategory[] = [
  {
    id: 'deals',
    name: 'Deal Updates',
    description: 'Notifications about deal stage changes, won/lost deals',
    icon: <Target className="w-5 h-5" />,
    channels: { email: true, push: true, inApp: true },
  },
  {
    id: 'leads',
    name: 'Lead Assignments',
    description: 'When new leads are assigned to you',
    icon: <Users className="w-5 h-5" />,
    channels: { email: true, push: true, inApp: true },
  },
  {
    id: 'tasks',
    name: 'Task Reminders',
    description: 'Reminders for upcoming and overdue tasks',
    icon: <AlertCircle className="w-5 h-5" />,
    channels: { email: true, push: true, inApp: true },
  },
  {
    id: 'meetings',
    name: 'Meeting Reminders',
    description: 'Reminders before scheduled meetings',
    icon: <Calendar className="w-5 h-5" />,
    channels: { email: true, push: true, inApp: true },
  },
  {
    id: 'quotes',
    name: 'Quote Approvals',
    description: 'When quotes need approval or are approved/rejected',
    icon: <FileText className="w-5 h-5" />,
    channels: { email: true, push: false, inApp: true },
  },
  {
    id: 'orders',
    name: 'Order Updates',
    description: 'Order status changes and shipping updates',
    icon: <ShoppingCart className="w-5 h-5" />,
    channels: { email: true, push: false, inApp: true },
  },
  {
    id: 'campaigns',
    name: 'Campaign Updates',
    description: 'Campaign performance and milestone notifications',
    icon: <Megaphone className="w-5 h-5" />,
    channels: { email: true, push: false, inApp: true },
  },
  {
    id: 'system',
    name: 'System Alerts',
    description: 'Important system announcements and security alerts',
    icon: <Settings className="w-5 h-5" />,
    channels: { email: true, push: true, inApp: true },
  },
];

export default function NotificationPreferences() {
  const {
    isSupported: isPushSupported,
    permission: pushPermission,
    isSubscribed: isPushSubscribed,
    isLoading: pushLoading,
    error: pushError,
    subscribe: subscribeToPush,
    unsubscribe: unsubscribeFromPush,
    testNotification,
  } = usePushNotifications();

  const [categories, setCategories] = useState<NotificationCategory[]>(defaultCategories);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load preferences from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCategories(parsed);
      } catch {
        // Use defaults if parsing fails
      }
    }
  }, []);

  // Save preferences
  const savePreferences = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));

      // In production, also save to backend:
      // await api.put('/notifications/preferences', { categories });

      setSaveMessage({ type: 'success', text: 'Preferences saved successfully' });
    } catch {
      setSaveMessage({ type: 'error', text: 'Failed to save preferences' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const toggleChannel = (categoryId: string, channel: 'email' | 'push' | 'inApp') => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === categoryId
          ? {
              ...cat,
              channels: {
                ...cat.channels,
                [channel]: !cat.channels[channel],
              },
            }
          : cat
      )
    );
  };

  const enableAllForChannel = (channel: 'email' | 'push' | 'inApp') => {
    setCategories((prev) =>
      prev.map((cat) => ({
        ...cat,
        channels: { ...cat.channels, [channel]: true },
      }))
    );
  };

  const disableAllForChannel = (channel: 'email' | 'push' | 'inApp') => {
    setCategories((prev) =>
      prev.map((cat) => ({
        ...cat,
        channels: { ...cat.channels, [channel]: false },
      }))
    );
  };

  const handlePushToggle = async () => {
    if (isPushSubscribed) {
      await unsubscribeFromPush();
    } else {
      await subscribeToPush();
    }
  };

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-[#EAD07D]/20 flex items-center justify-center">
              <Bell className="w-6 h-6 text-[#1A1A1A]" />
            </div>
            <div>
              <h1 className="text-3xl font-light text-[#1A1A1A]">Notification Preferences</h1>
              <p className="text-[#666]">Manage how and when you receive notifications</p>
            </div>
          </div>
        </div>

        {/* Push Notification Setup */}
        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-black/5 mb-6">
          <h2 className="text-lg font-semibold text-[#1A1A1A] mb-4 flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-[#93C01F]" />
            Browser Push Notifications
          </h2>

          {!isPushSupported ? (
            <div className="bg-[#F8F8F6] rounded-xl p-4">
              <p className="text-sm text-[#666]">
                Push notifications are not supported in your browser. Try using Chrome, Firefox, or Edge.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-[#F8F8F6] rounded-xl">
                <div>
                  <p className="font-medium text-[#1A1A1A]">
                    {isPushSubscribed ? 'Push notifications enabled' : 'Enable push notifications'}
                  </p>
                  <p className="text-sm text-[#666] mt-1">
                    {pushPermission === 'denied'
                      ? 'You have blocked notifications. Please enable them in your browser settings.'
                      : isPushSubscribed
                      ? 'You will receive browser notifications for important updates.'
                      : 'Get instant notifications even when the app is closed.'}
                  </p>
                </div>
                <button
                  onClick={handlePushToggle}
                  disabled={pushLoading || pushPermission === 'denied'}
                  className={`relative w-14 h-8 rounded-full transition-colors ${
                    isPushSubscribed ? 'bg-[#93C01F]' : 'bg-gray-300'
                  } ${pushLoading || pushPermission === 'denied' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {pushLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white" />
                  ) : (
                    <span
                      className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-sm ${
                        isPushSubscribed ? 'right-1' : 'left-1'
                      }`}
                    />
                  )}
                </button>
              </div>

              {pushError && (
                <div className="flex items-center gap-2 text-red-600 text-sm p-3 bg-red-50 rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                  {pushError}
                </div>
              )}

              {isPushSubscribed && (
                <button
                  onClick={testNotification}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#666] hover:text-[#1A1A1A] hover:bg-[#F8F8F6] rounded-lg transition-colors"
                >
                  <TestTube className="w-4 h-4" />
                  Send test notification
                </button>
              )}
            </div>
          )}
        </div>

        {/* Notification Channels Overview */}
        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-black/5 mb-6">
          <h2 className="text-lg font-semibold text-[#1A1A1A] mb-4">Notification Channels</h2>

          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-[#F8F8F6] rounded-xl text-center">
              <Mail className="w-6 h-6 mx-auto mb-2 text-[#666]" />
              <p className="font-medium text-[#1A1A1A]">Email</p>
              <p className="text-xs text-[#666] mt-1">Sent to your inbox</p>
              <div className="flex gap-2 mt-3 justify-center">
                <button
                  onClick={() => enableAllForChannel('email')}
                  className="px-2 py-1 text-xs bg-[#93C01F]/20 text-[#93C01F] rounded hover:bg-[#93C01F]/30"
                >
                  Enable all
                </button>
                <button
                  onClick={() => disableAllForChannel('email')}
                  className="px-2 py-1 text-xs bg-gray-200 text-[#666] rounded hover:bg-gray-300"
                >
                  Disable all
                </button>
              </div>
            </div>

            <div className="p-4 bg-[#F8F8F6] rounded-xl text-center">
              <Smartphone className="w-6 h-6 mx-auto mb-2 text-[#666]" />
              <p className="font-medium text-[#1A1A1A]">Push</p>
              <p className="text-xs text-[#666] mt-1">Browser notifications</p>
              <div className="flex gap-2 mt-3 justify-center">
                <button
                  onClick={() => enableAllForChannel('push')}
                  disabled={!isPushSubscribed}
                  className="px-2 py-1 text-xs bg-[#93C01F]/20 text-[#93C01F] rounded hover:bg-[#93C01F]/30 disabled:opacity-50"
                >
                  Enable all
                </button>
                <button
                  onClick={() => disableAllForChannel('push')}
                  disabled={!isPushSubscribed}
                  className="px-2 py-1 text-xs bg-gray-200 text-[#666] rounded hover:bg-gray-300 disabled:opacity-50"
                >
                  Disable all
                </button>
              </div>
            </div>

            <div className="p-4 bg-[#F8F8F6] rounded-xl text-center">
              <Monitor className="w-6 h-6 mx-auto mb-2 text-[#666]" />
              <p className="font-medium text-[#1A1A1A]">In-App</p>
              <p className="text-xs text-[#666] mt-1">Notification center</p>
              <div className="flex gap-2 mt-3 justify-center">
                <button
                  onClick={() => enableAllForChannel('inApp')}
                  className="px-2 py-1 text-xs bg-[#93C01F]/20 text-[#93C01F] rounded hover:bg-[#93C01F]/30"
                >
                  Enable all
                </button>
                <button
                  onClick={() => disableAllForChannel('inApp')}
                  className="px-2 py-1 text-xs bg-gray-200 text-[#666] rounded hover:bg-gray-300"
                >
                  Disable all
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Notification Categories */}
        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-black/5 mb-6">
          <h2 className="text-lg font-semibold text-[#1A1A1A] mb-4">Notification Types</h2>

          <div className="overflow-hidden rounded-xl border border-black/5">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F8F8F6]">
                  <th className="px-4 py-3 text-left text-sm font-medium text-[#666]">Category</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-[#666] w-20">
                    <Mail className="w-4 h-4 mx-auto" />
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-[#666] w-20">
                    <Smartphone className="w-4 h-4 mx-auto" />
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-[#666] w-20">
                    <Monitor className="w-4 h-4 mx-auto" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category, index) => (
                  <tr
                    key={category.id}
                    className={index % 2 === 0 ? 'bg-white' : 'bg-[#FAFAF9]'}
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#F8F8F6] flex items-center justify-center text-[#666]">
                          {category.icon}
                        </div>
                        <div>
                          <p className="font-medium text-[#1A1A1A]">{category.name}</p>
                          <p className="text-xs text-[#666]">{category.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => toggleChannel(category.id, 'email')}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                          category.channels.email
                            ? 'bg-[#93C01F] text-white'
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        }`}
                      >
                        {category.channels.email ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => toggleChannel(category.id, 'push')}
                        disabled={!isPushSubscribed}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                          category.channels.push && isPushSubscribed
                            ? 'bg-[#93C01F] text-white'
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        } ${!isPushSubscribed ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {category.channels.push ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => toggleChannel(category.id, 'inApp')}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                          category.channels.inApp
                            ? 'bg-[#93C01F] text-white'
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        }`}
                      >
                        {category.channels.inApp ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-between">
          <div>
            {saveMessage && (
              <p
                className={`text-sm ${
                  saveMessage.type === 'success' ? 'text-[#93C01F]' : 'text-red-500'
                }`}
              >
                {saveMessage.text}
              </p>
            )}
          </div>
          <button
            onClick={savePreferences}
            disabled={isSaving}
            className="px-6 py-2.5 bg-[#1A1A1A] text-white rounded-full text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}
