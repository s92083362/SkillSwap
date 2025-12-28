"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, Menu, X } from "lucide-react";
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
  showMobileMenu = false,
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
  const roleLabel = "System Administrator";

  const avatarSrc =
    user?.photoURL ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      displayName
    )}&background=F2E5FF&color=4B0082&bold=true`;

  const goDashboard = () => {
    // match your dashboard route exactly; change if you use /dashboard instead
    router.push("/dash-board");
  };

  const handleProfileClick = () => {
    router.push("/profile?section=overview");
  };

  const handleNotificationsClick = () => {
    console.log("Notifications clicked");
  };

  const toggleMobileMenu = () => {
    if (setMobileMenuOpen) {
      setMobileMenuOpen(!mobileMenuOpen);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white">
      <div className="" />

      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-200">
        {/* Left: logo */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goDashboard}
            className="focus:outline-none hover:opacity-80 transition-opacity"
            aria-label="Go to dashboard"
          >
            <img
              src="https://i.ibb.co/FkBjK1WD/logo-removebg-preview.png"
              alt="SkillSwap Logo"
              className="h-8 w-auto"
            />
          </button>
        </div>

        {/* Center: Home button */}
        <div className="flex-1 flex justify-center">
          <button
            type="button"
            onClick={goDashboard}
            className="px-4 py-1.5 rounded-full text-sm font-semibold text-blue-600 border border-blue-200 hover:bg-blue-50 transition-colors"
          >
            Home
          </button>
        </div>

        {/* Right: bell + profile + optional hamburger */}
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            type="button"
            onClick={handleNotificationsClick}
            className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
            {hasNotifications && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full px-2 text-xs">
                1
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={handleProfileClick}
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-200 overflow-hidden border-2 border-orange-400 hover:ring-2 hover:ring-orange-400 transition flex items-center justify-center"
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
              <span className="w-full h-full flex items-center justify-center text-lg font-bold text-gray-700">
                {displayName[0]?.toUpperCase()}
              </span>
            )}
          </button>

          {showMobileMenu && setMobileMenuOpen && (
            <button
              type="button"
              onClick={toggleMobileMenu}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-gray-600" />
              ) : (
                <Menu className="w-5 h-5 text-gray-600" />
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
