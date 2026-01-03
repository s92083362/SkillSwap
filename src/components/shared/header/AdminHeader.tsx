"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, Menu, X, BarChart3, Mail, Home } from "lucide-react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../../../lib/firebase/firebaseConfig";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useTrackUserActivity } from "@/hooks/users/useTrackUserActivity";

interface AdminHeaderProps {
  hasNotifications?: boolean;
  mobileMenuOpen?: boolean;
  setMobileMenuOpen?: (open: boolean) => void;
  showMobileMenu?: boolean;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({
  hasNotifications,
  mobileMenuOpen = false,
  setMobileMenuOpen,
}) => {
  const router = useRouter();
  const [user] = useAuthState(auth);

  useTrackUserActivity(60000);

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
    console.log("Notifications clicked");
    if (setMobileMenuOpen) setMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    if (setMobileMenuOpen) {
      setMobileMenuOpen(!mobileMenuOpen);
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
          <div className="hidden md:flex items-center gap-2 md:gap-3 flex-1 justify-center">
            <button
              type="button"
              onClick={goDashboard}
              className="px-3 md:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold text-blue-600 border border-blue-200 hover:bg-blue-50 transition-colors"
            >
              Home
            </button>

            <button
              type="button"
              onClick={handleAnalyticsClick}
              className="px-3 md:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors flex items-center gap-1.5"
              aria-label="Analytics"
            >
              <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Analytics</span>
            </button>

            <button
              type="button"
              onClick={handleMessagesClick}
              className="px-3 md:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors flex items-center gap-1.5"
              aria-label="Messages"
            >
              <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Messages</span>
            </button>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-shrink-0">
            {/* Notifications */}
            <button
              type="button"
              onClick={handleNotificationsClick}
              className="relative p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
              {hasNotifications && (
                <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 bg-red-500 text-white rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center text-[10px] sm:text-xs font-bold">
                  1
                </span>
              )}
            </button>

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
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors"
            >
              <Home className="w-5 h-5" />
              <span>Home</span>
            </button>

            <button
              type="button"
              onClick={handleAnalyticsClick}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <BarChart3 className="w-5 h-5" />
              <span>Analytics</span>
            </button>

            <button
              type="button"
              onClick={handleMessagesClick}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Mail className="w-5 h-5" />
              <span>Messages</span>
            </button>
          </nav>
        </div>
      )}


    </>
  );
};

export default AdminHeader;