"use client";

import React from "react";
import { X } from "lucide-react";
import type { Notification } from "@/hooks/useNotifications";

interface NotificationListProps {
  notifications: Notification[];
  onClose: () => void;
  onActionClick?: (
    notifId: string | number,
    action: string,
    notif: Notification
  ) => void;
  onDismiss?: (notifId: string | number, notif?: Notification) => void;
  onClearAll?: () => void | Promise<void>;
}

const NotificationList: React.FC<NotificationListProps> = ({
  notifications,
  onClose,
  onActionClick,
  onDismiss,
  onClearAll,
}) => (
  <div className="fixed sm:absolute right-0 left-0 sm:left-auto mt-0 sm:mt-2 w-full sm:w-96 max-w-full sm:max-w-96 bg-white shadow-lg sm:rounded-xl rounded-b-xl border z-50 max-h-[80vh] sm:max-h-[600px] overflow-y-auto">
    {/* Header */}
    <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-200 sticky top-0 bg-white z-10">
      <h3 className="font-bold text-base sm:text-lg text-gray-900">
        Notifications
      </h3>
      <div className="flex items-center gap-3">
        {notifications.length > 0 && onClearAll && (
          <button
            onClick={onClearAll}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
          >
            Mark all as read
          </button>
        )}
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close notifications"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>

    {/* Notification List */}
    <div className="p-4 sm:p-5">
      <ul className="space-y-3">
        {notifications.length === 0 && (
          <li className="text-gray-500 text-sm sm:text-base text-center py-8">
            <div className="mb-2 text-4xl">🔔</div>
            <div>No new notifications</div>
          </li>
        )}

        {notifications.map((notif) => (
          <li
            key={notif.id}
            className="bg-gray-50 hover:bg-gray-100 rounded-lg p-3 sm:p-4 text-gray-700 relative transition-colors"
          >
            {onDismiss && (
              <button
                onClick={() => onDismiss(notif.id, notif)}
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {notif.title && (
              <div className="font-medium text-blue-800 mb-1 text-sm sm:text-base">
                {notif.title}
              </div>
            )}

            <div className="text-sm sm:text-base leading-relaxed pr-6">
              {notif.message}
            </div>

            {notif.timestamp && (
              <div className="text-xs text-gray-400 mt-1">
                {formatTimestamp(notif.timestamp)}
              </div>
            )}

            {notif.actions && notif.actions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {notif.actions.map((action) => (
                  <button
                    key={action}
                    className={`px-3 py-1.5 rounded text-xs sm:text-sm font-semibold border transition-colors ${
                      action === "View"
                        ? "text-blue-800 border-blue-200 bg-blue-50 hover:bg-blue-100"
                        : action === "Approve"
                        ? "text-green-800 border-green-200 bg-green-50 hover:bg-green-100"
                        : "text-red-700 border-red-200 bg-red-50 hover:bg-red-100"
                    }`}
                    onClick={() => {
                      if (onActionClick) onActionClick(notif.id, action, notif);
                    }}
                  >
                    {action}
                  </button>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  </div>
);

function formatTimestamp(timestamp: any): string {
  if (!timestamp) return "";
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  } catch {
    return "";
  }
}

export default NotificationList;