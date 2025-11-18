"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Menu, X } from "lucide-react";
// import { useNotifications, Notification } from "../../../hooks/useNotifications";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../../../lib/firebase/firebaseConfig";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase/firebaseConfig";
// import NotificationList from "./NotificationList";

interface HeaderProps {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ mobileMenuOpen, setMobileMenuOpen }) => {
  const router = useRouter();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [user] = useAuthState(auth);
  const userId = user?.uid;
  const [notifications, setNotifications] = useNotifications(userId);

  const handleNotificationAction = async (notifId: string | number, action: string, notif: Notification) => {
    if (action === "View") {
      // Mark message as read in Firestore
      try {
        const messageRef = doc(db, "messages", notifId as string);
        await updateDoc(messageRef, {
          read: true,
          readAt: new Date()
        });
      } catch (error) {
        console.error("Error marking message as read:", error);
      }

      // Navigate to chat
      if (notif.chatId) {
        router.push(`/chat/${notif.chatId}`);
      }
      // Remove from local notifications
      setNotifications(prev => prev.filter(n => n.id !== notifId));
      setNotificationsOpen(false);
    }
  };

  const dismissNotification = async (notifId: string | number) => {
    try {
      const messageRef = doc(db, "messages", notifId as string);
      await updateDoc(messageRef, {
        read: true,
        readAt: new Date()
      });
      setNotifications(prev => prev.filter(n => n.id !== notifId));
    } catch (error) {
      console.error("Error dismissing notification:", error);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo Section */}
          <div className="flex items-center gap-2">
            <img 
              src="https://i.ibb.co/FkBjK1WD/logo-removebg-preview.png" 
              alt="Company Logo" 
              className="w-20 h-10 sm:w-25 sm:h-10"
            />
          </div>
          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            <a href="#" className="text-gray-700 hover:text-gray-900 font-medium">Home</a>
            <a href="#" className="text-gray-700 hover:text-gray-900 font-medium">My Skills</a>
            <a href="#" className="text-gray-700 hover:text-gray-900 font-medium">Learn</a>
            <a href="#" className="text-gray-700 hover:text-gray-900 font-medium">Teach</a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Notifications Dropdown */}
            <div className="relative">
              <button
                className="p-2 hover:bg-gray-100 rounded-lg relative"
                onClick={() => setNotificationsOpen((v) => !v)}
                aria-label="Show notifications"
              >
                <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full px-2 text-xs">
                    {notifications.length}
                  </span>
                )}
              </button>
              {notificationsOpen && (
                <NotificationList
                  notifications={notifications}
                  onClose={() => setNotificationsOpen(false)}
                  onActionClick={handleNotificationAction}
                  onDismiss={dismissNotification}
                  onClearAll={() => {
                    notifications.forEach(n => dismissNotification(n.id));
                  }}
                />
              )}
            </div>
            {/* Profile Image Button */}
            <button
              onClick={() => router.push("/profile")}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-200 overflow-hidden border-2 border-orange-400 hover:ring-2 hover:ring-orange-400 transition flex items-center justify-center"
              aria-label="Go to Profile"
              title="Profile"
              type="button"
            >
              {user && user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "Profile"}
                  className="object-cover w-full h-full"
                />
              ) : (
                <span className="w-full h-full flex items-center justify-center text-lg font-bold text-gray-700">
                  {user?.displayName ? user.displayName[0].toUpperCase() : (
                    <svg width="20" height="20"><circle cx="10" cy="10" r="10" fill="#F472B6" /></svg>
                  )}
                </span>
              )}
            </button>
            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-gray-600" />
              ) : (
                <Menu className="w-5 h-5 text-gray-600" />
              )}
            </button>
          </div>
        </div>
        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="lg:hidden flex flex-col gap-4 mt-4 pb-4 border-t border-gray-200 pt-4">
            <a href="#" className="text-gray-700 hover:text-gray-900 font-medium">Home</a>
            <a href="#" className="text-gray-700 hover:text-gray-900 font-medium">My Skills</a>
            <a href="#" className="text-gray-700 hover:text-gray-900 font-medium">Learn</a>
            <a href="#" className="text-gray-700 hover:text-gray-900 font-medium">Teach</a>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
