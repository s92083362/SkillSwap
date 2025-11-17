"use client";
import React from "react";

export interface Notification {
  id: string | number;
  message: string;
  actions?: string[]; // e.g., ["Approve", "Reject"]
}

interface NotificationListProps {
  notifications: Notification[];
  onClose: () => void;
  onActionClick?: (notifId: string | number, action: string) => void;
}

const NotificationList: React.FC<NotificationListProps> = ({ 
  notifications, 
  onClose, 
  onActionClick 
}) => {
  return (
    <div className="fixed sm:absolute right-0 left-0 sm:left-auto mt-0 sm:mt-2 w-full sm:w-96 max-w-full sm:max-w-96 bg-white shadow-lg sm:rounded-xl rounded-b-xl p-4 sm:p-5 border z-50 max-h-[80vh] sm:max-h-[600px] overflow-y-auto">
      <h3 className="font-bold mb-3 text-base sm:text-lg">Notifications</h3>
      <ul className="space-y-3">
        {notifications.length === 0 && (
          <li className="text-gray-500 text-sm sm:text-base text-center py-4">
            No notifications
          </li>
        )}
        {notifications.map((notif) => (
          <li 
            key={notif.id} 
            className="bg-gray-50 rounded-lg p-3 sm:p-4 text-gray-700"
          >
            <div className="text-sm sm:text-base leading-relaxed">
              {notif.message}
            </div>
            {notif.actions && notif.actions.length > 0 && (
              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                {notif.actions.map((action) => (
                  <button
                    key={action}
                    className={`px-3 py-2 rounded text-xs sm:text-sm font-semibold border transition-colors ${
                      action === 'Approve' 
                        ? 'text-green-800 border-green-200 bg-green-50 hover:bg-green-100' 
                        : 'text-red-700 border-red-200 bg-red-50 hover:bg-red-100'
                    }`}
                    onClick={() => onActionClick && onActionClick(notif.id, action)}
                  >
                    {action}
                  </button>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
      <button
        className="w-full mt-4 py-2 text-blue-600 hover:text-blue-700 underline text-sm sm:text-base font-medium transition-colors"
        onClick={onClose}
      >
        Close
      </button>
    </div>
  );
};

export default NotificationList;