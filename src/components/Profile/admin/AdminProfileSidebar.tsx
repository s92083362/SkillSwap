"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut,
  User,
  Settings,
  Shield,
  Activity,
  X,
  BarChart3,
} from "lucide-react";
import { auth } from "../../../lib/firebase/firebaseConfig";
import { logout } from "../../../lib/firebase/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import { useActivityTracker } from "@/hooks/useSessionTracking";

export type SectionKey =
  | "overview"
  | "settings"
  | "security"
  | "activity"
  | "analytics";

interface AdminSidebarProps {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  setActiveSection: (section: SectionKey) => void;
  activeSection: SectionKey;
}

export default function AdminSidebar({
  mobileMenuOpen,
  setMobileMenuOpen,
  setActiveSection,
  activeSection,
}: AdminSidebarProps) {
  const router = useRouter();
  const [success, setSuccess] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [user, loading] = useAuthState(auth as any);
  const { trackAction } = useActivityTracker();

  // Close mobile menu on escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [mobileMenuOpen, setMobileMenuOpen]);

  const navItems: {
    key: SectionKey;
    icon: React.ReactNode;
    label: string;
  }[] = [
    { key: "overview", icon: <User className="w-5 h-5" />, label: "Profile Overview" },
    { key: "settings", icon: <Settings className="w-5 h-5" />, label: "Settings" },
    { key: "security", icon: <Shield className="w-5 h-5" />, label: "Security" },
    { key: "activity", icon: <Activity className="w-5 h-5" />, label: "Activity Log" },
    { key: "analytics", icon: <BarChart3 className="w-5 h-5" />, label: "Analytics Report" },
  ];

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleLogoutConfirm = async () => {
    try {
      await logout(); // logout handles activity logging
      setSuccess("You have successfully logged out");
      setShowLogoutConfirm(false);
      setTimeout(() => {
        setSuccess("");
        router.push("/auth/login-and-signup?tab=login");
        setMobileMenuOpen(false);
      }, 1500);
    } catch (err) {
      console.error("❌ Logout error:", err);
      alert(
        "Logout failed: " +
          (err instanceof Error ? err.message : String(err))
      );
      setShowLogoutConfirm(false);
    }
  };

  const handleLogoutCancel = () => {
    setShowLogoutConfirm(false);
  };

  const getButtonClasses = (sectionKey: SectionKey) =>
    `flex items-center gap-3 py-2 px-4 rounded-lg w-full text-left text-sm sm:text-base transition ${
      activeSection === sectionKey
        ? "bg-blue-100 text-blue-700 font-semibold"
        : "text-gray-600 hover:bg-blue-50"
    }`;

  const avatarUrl = user?.photoURL
    ? user.photoURL
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(
        user?.displayName || "Admin"
      )}&background=F2E5FF&color=4B0082&bold=true`;

  const displayName = loading ? "Loading..." : user?.displayName || "Admin";

  const goToSection = (section: SectionKey) => {
    setActiveSection(section);

    // Track navigation action for analytics
    trackAction("page_view", {
      section,
      page: "profile",
      timestamp: new Date().toISOString(),
    });

    if (mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  };

  const sidebarContent = (
    <div className="relative flex flex-col items-center w-full h-full">
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded mb-2 text-center font-semibold absolute top-5 left-4 right-4 z-10 text-xs sm:text-sm">
          {success}
        </div>
      )}

      {/* Avatar + role */}
      <div className="flex flex-col items-center mt-6 sm:mt-4 mb-4 sm:mb-6">
        <img
          src={avatarUrl}
          alt="Admin Profile"
          className="w-16 h-16 lg:w-20 lg:h-20 rounded-full object-cover mb-3 lg:mb-4 ring-4 ring-blue-100"
        />
        <p className="font-bold text-base lg:text-lg mb-1 text-gray-900">
          {displayName}
        </p>
        <p className="text-blue-600 text-xs lg:text-sm font-medium mb-4 lg:mb-6 bg-blue-100 px-3 py-1 rounded-full flex items-center gap-1">
          <Shield className="w-3 h-3" />
          System Administrator
        </p>
      </div>

      {/* Main nav area grows, pushing logout down */}
      <div className="w-full flex-1 flex flex-col gap-2 overflow-y-auto">
        <ul className="w-full space-y-1">
          {navItems.map((item) => (
            <li key={item.key}>
              <button
                type="button"
                className={getButtonClasses(item.key)}
                onClick={() => goToSection(item.key)}
              >
                {item.icon}
                <span className="truncate">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Logout pinned to bottom and centered */}
      <button
        onClick={handleLogoutClick}
        className="mt-4 w-full flex items-center justify-center gap-2 py-2 px-4
                   rounded-lg text-sm sm:text-base text-gray-500
                   hover:text-red-500 hover:bg-red-50 transition-colors"
      >
        <LogOut className="w-5 h-5" />
        <span className="truncate">Logout</span>
      </button>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className="
          hidden md:flex
          fixed left-0 top-[4.5rem]
          w-60 lg:w-72
          h-[calc(100vh-4.5rem)]
          bg-white border-r border-gray-200
          px-3 sm:px-4 lg:px-6 py-6
          flex-col items-center
          overflow-y-auto
          z-40
        "
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Overlay */}
          <div
            className="flex-1 bg-black/40 backdrop-blur-[1px]"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer panel */}
          <aside className="w-[80%] max-w-xs h-full bg-white border-l border-gray-200 px-4 sm:px-6 py-6 flex flex-col items-center relative overflow-y-auto shadow-xl">
            <button
              className="absolute top-4 right-4 rounded-full p-1 hover:bg-gray-100"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu"
            >
              <X className="w-6 h-6 text-gray-700" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 sm:p-6">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-[90%] sm:max-w-md md:max-w-lg p-4 sm:p-6 md:p-8">
            <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-2 sm:mb-3">
              Confirm Logout
            </h3>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 md:mb-8">
              Are you sure you want to log out now?
            </p>
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 justify-end">
              <button
                onClick={handleLogoutCancel}
                className="w-full sm:w-auto px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 text-sm sm:text-base text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-lg font-medium transition"
              >
                No, Stay
              </button>
              <button
                onClick={handleLogoutConfirm}
                className="w-full sm:w-auto px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 text-sm sm:text-base text-white bg-red-500 hover:bg-red-600 active:bg-red-700 rounded-lg font-medium transition"
              >
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
