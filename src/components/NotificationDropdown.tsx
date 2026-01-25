import React, { useState } from 'react';
import { Bell, Check, CheckCheck, Trash2, AlertCircle, Calendar, Users, TrendingUp, Megaphone, Settings } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import type { Notification, NotificationType } from '../api/notifications';
import { formatDistanceToNow } from 'date-fns';

// Icon mapping for notification types
const typeIcons: Record<NotificationType, React.ReactNode> = {
  DEAL_UPDATE: <TrendingUp size={16} className="text-green-500" />,
  LEAD_ASSIGNED: <Users size={16} className="text-blue-500" />,
  TASK_DUE: <AlertCircle size={16} className="text-orange-500" />,
  MEETING_REMINDER: <Calendar size={16} className="text-purple-500" />,
  QUOTE_APPROVED: <Check size={16} className="text-green-500" />,
  CUSTOM: <Bell size={16} className="text-gray-500" />,
  SYSTEM_ALERT: <Settings size={16} className="text-red-500" />,
  CAMPAIGN_UPDATE: <Megaphone size={16} className="text-indigo-500" />,
};

// Priority badge colors
const priorityColors: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-600',
  NORMAL: 'bg-blue-100 text-blue-600',
  HIGH: 'bg-orange-100 text-orange-600',
  URGENT: 'bg-red-100 text-red-600',
};

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onMarkAsRead, onDelete }) => {
  const isUnread = notification.status !== 'READ';
  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true });

  return (
    <div
      className={`px-4 py-3 hover:bg-[#F8F8F6] transition-colors border-b border-gray-100 last:border-b-0 ${
        isUnread ? 'bg-blue-50/30' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {typeIcons[notification.type] || typeIcons.CUSTOM}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className={`text-sm font-medium truncate ${isUnread ? 'text-[#1A1A1A]' : 'text-[#666]'}`}>
              {notification.title}
            </p>
            {notification.priority !== 'NORMAL' && (
              <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${priorityColors[notification.priority]}`}>
                {notification.priority}
              </span>
            )}
          </div>
          <p className="text-xs text-[#999] line-clamp-2 mb-1">{notification.body}</p>
          <p className="text-[10px] text-[#999]">{timeAgo}</p>
        </div>
        <div className="flex-shrink-0 flex items-center gap-1">
          {isUnread && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMarkAsRead(notification.id);
              }}
              className="p-1.5 text-[#999] hover:text-[#1A1A1A] hover:bg-white rounded-full transition-colors"
              title="Mark as read"
            >
              <Check size={14} />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(notification.id);
            }}
            className="p-1.5 text-[#999] hover:text-red-500 hover:bg-white rounded-full transition-colors"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export const NotificationDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    markingAllAsRead,
  } = useNotifications({ pageSize: 10 });

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead(id);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNotification(id);
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 bg-white/60 border border-white/50 rounded-full flex items-center justify-center hover:bg-white transition-all shadow-sm text-[#1A1A1A] backdrop-blur-sm relative group"
      >
        <Bell size={18} className="group-hover:scale-110 transition-transform" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full border-2 border-white flex items-center justify-center">
            <span className="text-[10px] font-bold text-white px-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-[#1A1A1A]">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={markingAllAsRead}
                  className="flex items-center gap-1 text-xs text-[#666] hover:text-[#1A1A1A] transition-colors disabled:opacity-50"
                >
                  <CheckCheck size={14} />
                  Mark all read
                </button>
              )}
            </div>

            {/* Content */}
            <div className="max-h-[400px] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-[#EAD07D] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <Bell size={24} className="text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-[#666]">No notifications yet</p>
                  <p className="text-xs text-[#999] mt-1">We'll notify you when something arrives</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={handleMarkAsRead}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="border-t border-gray-100 px-4 py-3">
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-full text-center text-sm text-[#666] hover:text-[#1A1A1A] font-medium transition-colors"
                >
                  View all notifications
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationDropdown;
