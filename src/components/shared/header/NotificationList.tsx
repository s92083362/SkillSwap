"use client";
import React from "react";
import { X } from "lucide-react";

// Notification object interface
export interface Notification {
  id: string | number;
  type?: string;
  title?: string;
  message: string;
  actions?: string[];
  senderId?: string;
  swapRequestId?: string;
  chatId?: string;
  timestamp?: any;
  read?: boolean;
}

// Component props
interface NotificationListProps {
  notifications: Notification[];
  onClose: () => void;
  onActionClick?: (notifId: string | number, action: string, notif: Notification) => void;
  onDismiss?: (notifId: string | number, notif?: Notification) => void;
  onClearAll?: () => void;
}

const NotificationList: React.FC<NotificationListProps> = ({
  notifications,
  onClose,
  onActionClick,
  onDismiss,
  onClearAll,
}) => (
  <div className="fixed sm:absolute right-0 left-0 sm:left-auto mt-0 sm:mt-2 w-full sm:w-96 max-w-full sm:max-w-96 bg-white shadow-lg sm:rounded-xl rounded-b-xl p-4 sm:p-5 border z-50 max-h-[80vh] sm:max-h-[600px] overflow-y-auto">
    <div className="flex items-center justify-between mb-3">
      <h3 className="font-bold text-base sm:text-lg">Notifications</h3>
      {notifications.length > 0 && (
        <span className="text-xs sm:text-sm text-gray-500">
          {notifications.length} new
        </span>
      )}
    </div>
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
          {/* Dismiss button (calls parent's handler, which should update Firestore safely!) */}
          {onDismiss && (
            <button
              onClick={() => onDismiss(notif.id, notif)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Notification title (for swap, etc) */}
          {notif.title && (
            <div className="font-medium text-blue-800 mb-1 text-sm sm:text-base">{notif.title}</div>
          )}
          {/* Message content */}
          <div className="text-sm sm:text-base leading-relaxed pr-6">{notif.message}</div>
          {/* Timestamp */}
          {notif.timestamp && (
            <div className="text-xs text-gray-400 mt-1">{formatTimestamp(notif.timestamp)}</div>
          )}
          {/* Action buttons */}
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
    {/* Bottom actions */}
    <div className="mt-4 flex flex-col sm:flex-row gap-2">
      {notifications.length > 0 && onClearAll && (
        <button
          className="flex-1 py-2 text-gray-600 hover:text-gray-800 text-sm sm:text-base font-medium transition-colors"
          onClick={onClearAll}
        >
          Clear All
        </button>
      )}
      <button
        className="flex-1 py-2 text-blue-600 hover:text-blue-700 underline text-sm sm:text-base font-medium transition-colors"
        onClick={onClose}
      >
        Close
      </button>
    </div>
  </div>
);

// Helper to format timestamps
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
