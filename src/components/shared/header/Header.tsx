"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Menu, X } from "lucide-react";
import { useNotifications, Notification } from "../../../hooks/useNotifications";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../../../lib/firebase/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase/firebaseConfig";
import NotificationList from "./NotificationList";
import { useTrackUserActivity } from "@/hooks/useTrackUserActivity";
import { useEffect } from "react";
import { setDoc, serverTimestamp } from "firebase/firestore";

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
  
  // Track user activity (updates every 60 seconds)
  useTrackUserActivity(60000);

  // Ensure user document exists in Firestore
  useEffect(() => {
    async function ensureUserDocument() {
      if (!user) return;
      
      try {
        await setDoc(
          doc(db, "users", user.uid),
          {
            displayName: user.displayName || user.email?.split('@')[0] || "Anonymous",
            email: user.email || "",
            photoURL: user.photoURL || "",
            lastActive: serverTimestamp(),
            updatedAt: serverTimestamp()
          },
          { merge: true }
        );
        console.log("✅ User document ensured for:", user.email);
      } catch (error) {
        console.error("❌ Error ensuring user document:", error);
      }
    }
    
    ensureUserDocument();
  }, [user]);

  // Dismiss: always use "notifications" collection!
  const dismissNotification = async (notifId: string | number) => {
    try {
      const notifRef = doc(db, "notifications", String(notifId));
      const snap = await getDoc(notifRef);
      if (snap.exists()) {
        await updateDoc(notifRef, {
          read: true,
          readAt: new Date()
        });
        setNotifications(prev => prev.filter(n => n.id !== notifId));
      } else {
        console.warn("Notification not found:", notifId);
      }
    } catch (error) {
      console.error("Error dismissing notification:", error);
    }
  };

  const handleNotificationAction = async (notifId: string | number, action: string, notif: Notification) => {
    // Mark as read in the notifications collection
    await dismissNotification(notifId);

    // Swap request notifications
    if (notif.type === "swap_request" && action === "View") {
      router.push("/swap-requests");
      setNotificationsOpen(false);
      return;
    }

    // Chat/message notifications
    if ((notif.type === "chat" || notif.type === "message") && action === "View") {
      if (notif.chatId) {
        // Navigate to the specific chat using the chatId
        router.push(`/chat/${notif.chatId}`);
      } else if (notif.senderId && notif.senderName) {
        // Fallback: Navigate with user selection if no chatId
        const userInfo = encodeURIComponent(JSON.stringify({
          uid: notif.senderId,
          displayName: notif.senderName,
          email: notif.senderEmail || ""
        }));
        router.push(`/chat?selectUser=${userInfo}`);
      } else {
        // Last resort: just go to chat page
        alert("Unable to open chat. Missing chat information.");
      }
      setNotificationsOpen(false);
      return;
    }

    // Default action for other notification types
    if (action === "Open" || action === "View") {
      setNotificationsOpen(false);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo Section */}
          <div className="flex items-center gap-2">
            <a href="/dash-board">
              <img
                src="https://i.ibb.co/FkBjK1WD/logo-removebg-preview.png"
                alt="Company Logo"
                className="w-20 h-10 sm:w-25 sm:h-10"
              />
            </a>
          </div>
          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            <a href="/dash-board" className="text-gray-700 hover:text-gray-900 font-medium">Home</a>
            <a href="/profile?section=skills" className="text-gray-700 hover:text-gray-900 font-medium">My Skills</a>
            <a href="/my-requests" className="text-gray-700 hover:text-gray-900 font-medium">Learn</a>
            <a href="/swap-requests" className="text-gray-700 hover:text-gray-900 font-medium">Teach</a>
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
                  onClearAll={async () => {
                    await Promise.all(
                      notifications.map(n => dismissNotification(n.id))
                    );
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