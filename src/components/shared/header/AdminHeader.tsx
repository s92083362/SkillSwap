"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Bell, Menu, X, BarChart3, Mail, Home } from "lucide-react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../../../lib/firebase/firebaseConfig";
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useTrackUserActivity } from "@/hooks/users/useTrackUserActivity";
import {
  useNotifications,
  Notification,
} from "../../../hooks/useNotifications";
import NotificationList from "../NotificationList";

interface AdminHeaderProps {
  hasNotifications?: boolean;
  mobileMenuOpen?: boolean;
  setMobileMenuOpen?: (open: boolean) => void;
  showMobileMenu?: boolean;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({
  mobileMenuOpen = false,
  setMobileMenuOpen,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [user] = useAuthState(auth);
  const userId = user?.uid;

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useNotifications(userId);

  useTrackUserActivity(60000);

  // Determine active section based on current route
  const getActiveSection = () => {
    // Only set home as active if we're actually on the dashboard page
    if (pathname === "/dash-board") {
      return "home";
    }
   
    // Check for profile page sections
    if (pathname === "/profile") {
      const section = searchParams.get("section");
      if (section === "analytics") return "analytics";
      if (section === "messages") return "messages";
    }
   
    // For any other page, return null (no active section)
    return null;
  };

  const [activeSection, setActiveSection] = useState(getActiveSection());

  useEffect(() => {
    setActiveSection(getActiveSection());
  }, [pathname, searchParams]);

  useEffect(() => {
    async function ensureUserDocument() {
      if (!user) return;

      try {
        await setDoc(
          doc(db, "users", user.uid),
          {
            displayName:
              user.displayName || user.email?.split("@")[0] || "Anonymous",
            email: user.email || "",
            photoURL: user.photoURL || "",
            lastActive: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (error) {
        console.error("❌ Error ensuring user document:", error);
      }
    }

    ensureUserDocument();
  }, [user]);

  const displayName =
    user?.displayName || user?.email?.split("@")[0] || "Admin";

  const goDashboard = () => {
    router.push("/dash-board");
    if (setMobileMenuOpen) setMobileMenuOpen(false);
  };

  const handleProfileClick = () => {
    router.push("/profile?section=overview");
    if (setMobileMenuOpen) setMobileMenuOpen(false);
  };

  const handleAnalyticsClick = () => {
    router.push("/profile?section=analytics");
    if (setMobileMenuOpen) setMobileMenuOpen(false);
  };

  const handleMessagesClick = () => {
    router.push("/profile?section=messages");
    if (setMobileMenuOpen) setMobileMenuOpen(false);
  };

  const handleNotificationsClick = () => {
    setNotificationsOpen((v) => !v);
    if (setMobileMenuOpen && mobileMenuOpen) setMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    if (setMobileMenuOpen) {
      setMobileMenuOpen(!mobileMenuOpen);
    }
  };

  const dismissNotification = async (notifId: string | number) => {
    try {
      const notifRef = doc(db, "notifications", String(notifId));
      const snap = await getDoc(notifRef);
      if (snap.exists()) {
        await updateDoc(notifRef, {
          read: true,
          readAt: new Date(),
        });
        setNotifications((prev) => prev.filter((n) => n.id !== notifId));
      }
    } catch (error) {
      console.error("Error dismissing notification:", error);
    }
  };

  const handleNotificationAction = async (
    notifId: string | number,
    action: string,
    notif: Notification
  ) => {
    await dismissNotification(notifId);

    if (notif.type === "swap_request" && action === "View") {
      router.push("/swap-requests");
      setNotificationsOpen(false);
      return;
    }

    if (notif.type === "ping" && action === "View") {
      router.push("/swap-requests");
      setNotificationsOpen(false);
      return;
    }

    if (
      (notif.type === "requestAccepted" || notif.type === "requestRejected") &&
      action === "View"
    ) {
      router.push("/my-requests");
      setNotificationsOpen(false);
      return;
    }

    if (notif.type === "video_call" && action === "Answer") {
      if (!user) {
        alert("You must be logged in to answer the call.");
        return;
      }
      if (!notif.senderId) {
        alert("Missing caller information for this call.");
        return;
      }

      const chatId = [user.uid, notif.senderId].sort().join("_");
      const url =
        `/chat/${chatId}` +
        `?user=${notif.senderId}` +
        `&callId=${encodeURIComponent(notif.callId || "")}` +
        `&callType=video`;

      router.push(url);
      setNotificationsOpen(false);
      return;
    }

    if (
      (notif.type === "chat" || notif.type === "message") &&
      action === "View"
    ) {
      if (notif.chatId) {
        router.push(`/chat/${notif.chatId}`);
      } else if (notif.senderId && notif.senderName) {
        const userInfo = encodeURIComponent(
          JSON.stringify({
            uid: notif.senderId,
            displayName: notif.senderName,
            email: notif.senderEmail || "",
          })
        );
        router.push(`/chat?selectUser=${userInfo}`);
      } else {
        alert("Unable to open chat. Missing chat information.");
      }
      setNotificationsOpen(false);
      return;
    }

    if (action === "Open" || action === "View") {
      setNotificationsOpen(false);
    }
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-2 px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 border-b border-gray-200">
          {/* Left: logo */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={goDashboard}
              className="focus:outline-none hover:opacity-80 transition-opacity"
              aria-label="Go to dashboard"
            >
              <img
                src="https://i.ibb.co/FkBjK1WD/logo-removebg-preview.png"
                alt="SkillSwap Logo"
                className="h-7 sm:h-8 w-auto"
              />
            </button>
          </div>

          {/* Center: Navigation buttons (desktop / tablet only) */}
          <div className="hidden md:flex items-center gap-6 md:gap-8 flex-1 justify-center">
            <button
              type="button"
              onClick={goDashboard}
              className="relative pb-2 text-sm sm:text-base font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              Home
              {activeSection === "home" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500" />
              )}
            </button>

            <button
              type="button"
              onClick={handleAnalyticsClick}
              className="relative pb-2 text-sm sm:text-base font-medium text-gray-700 hover:text-gray-900 transition-colors flex items-center gap-1.5"
              aria-label="Analytics"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Analytics</span>
              {activeSection === "analytics" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500" />
              )}
            </button>

            <button
              type="button"
              onClick={handleMessagesClick}
              className="relative pb-2 text-sm sm:text-base font-medium text-gray-700 hover:text-gray-900 transition-colors flex items-center gap-1.5"
              aria-label="Messages"
            >
              <Mail className="w-4 h-4" />
              <span>Messages</span>
              {activeSection === "messages" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500" />
              )}
            </button>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-shrink-0">
            {/* Notifications */}
            <div className="relative">
              <button
                type="button"
                onClick={handleNotificationsClick}
                className="relative p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                {notifications.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 bg-red-500 text-white rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center text-[10px] sm:text-xs font-bold">
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
                      notifications.map((n) => dismissNotification(n.id))
                    );
                  }}
                />
              )}
            </div>

            {/* Profile avatar */}
            <button
              type="button"
              onClick={handleProfileClick}
              className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full bg-gray-200 overflow-hidden border-2 border-orange-400 hover:ring-2 hover:ring-orange-400 transition flex items-center justify-center flex-shrink-0"
              aria-label="Go to Profile"
              title="Profile"
            >
              {user && user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={displayName}
                  className="object-cover w-full h-full"
                />
              ) : (
                <span className="w-full h-full flex items-center justify-center text-sm sm:text-base md:text-lg font-bold text-gray-700">
                  {displayName[0]?.toUpperCase()}
                </span>
              )}
            </button>

            {/* Mobile menu toggle */}
            <button
              type="button"
              onClick={toggleMobileMenu}
              className="md:hidden p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
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
      </header>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="fixed top-[52px] sm:top-[56px] left-0 right-0 z-40 bg-white border-b border-gray-200 shadow-lg md:hidden">
          <nav className="px-4 py-3 space-y-2">
            <button
              type="button"
              onClick={goDashboard}
              className="relative w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Home className="w-5 h-5" />
              <span>Home</span>
              {activeSection === "home" && (
                <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-cyan-500" />
              )}
            </button>

            <button
              type="button"
              onClick={handleAnalyticsClick}
              className="relative w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <BarChart3 className="w-5 h-5" />
              <span>Analytics</span>
              {activeSection === "analytics" && (
                <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-cyan-500" />
              )}
            </button>

            <button
              type="button"
              onClick={handleMessagesClick}
              className="relative w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Mail className="w-5 h-5" />
              <span>Messages</span>
              {activeSection === "messages" && (
                <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-cyan-500" />
              )}
            </button>
          </nav>
        </div>
      )}
    </>
  );
};

export default AdminHeader;