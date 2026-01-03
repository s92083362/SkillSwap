"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../../../lib/firebase/firebaseConfig";
import AdminHeader from "@/components/shared/header/AdminHeader";
import AdminSidebar from "./AdminProfileSidebar";
import AdminEditProfile from "./AdminEditProfile";
import AnalyticsReport from "./analytics/AnalyticsReport";
import ProfileMessages from "../ProfileMessages";
import { useSessionTracking } from "@/hooks/useSessionTracking";
import { Home, BarChart3, Mail } from "lucide-react";

type SectionKey = "overview" | "settings" | "security" | "messages" | "analytics";

export default function AdminProfilePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user] = useAuthState(auth as any);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useSessionTracking();

  const sectionParam = (searchParams.get("section") || "overview") as string;
  const validSections: SectionKey[] = ["overview", "settings", "security", "messages", "analytics"];

  const section: SectionKey = validSections.includes(sectionParam as SectionKey)
    ? (sectionParam as SectionKey)
    : "overview";

  const handleNavigation = (sectionName: SectionKey) => {
    router.push(`/profile?section=${sectionName}`);
    setMobileMenuOpen(false);
  };

  // Navigation handlers for bottom nav
  const goDashboard = () => {
    router.push("/dash-board");
  };

  const handleAnalyticsClick = () => {
    router.push("/profile?section=analytics");
  };

  const handleMessagesClick = () => {
    router.push("/profile?section=messages");
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [mobileMenuOpen]);

  useEffect(() => {
    const prevTitle = document.title;
    document.title = "SkillSwap | Profile";

    return () => {
      document.title = prevTitle;
    };
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [mobileMenuOpen]);

  const renderContent = () => {
    switch (section) {
      case "overview":
        return <AdminEditProfile />;

      case "settings":
        return (
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-lg sm:shadow-xl p-4 sm:p-6 md:p-8 w-full">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">
              Settings
            </h2>
            <p className="text-sm sm:text-base text-gray-500 text-center py-8 sm:py-12">
              Settings page coming soon...
            </p>
          </div>
        );

      case "security":
        return (
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-lg sm:shadow-xl p-4 sm:p-6 md:p-8 w-full">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">
              Security
            </h2>
            <p className="text-sm sm:text-base text-gray-500 text-center py-8 sm:py-12">
              Security page coming soon...
            </p>
          </div>
        );

      case "messages":
        return <ProfileMessages />;

      case "analytics":
        return <AnalyticsReport />;

      default:
        return <AdminEditProfile />;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl sm:shadow-2xl p-6 sm:p-8 md:p-10 text-center max-w-md w-full">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
            <svg
              className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <p className="text-base sm:text-lg text-gray-700">
            Please log in to view your admin profile
          </p>
        </div>
      </div>
    );
  }

  // Check if current page matches for bottom nav active state
  const isHome = !section || section === "overview";
  const isAnalytics = section === "analytics";
  const isMessages = section === "messages";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AdminHeader
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        showMobileMenu={true}
      />

      <div className="flex flex-1">
        {/* Sidebar (hamburger menu for profile sections) */}
        <AdminSidebar
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          activeSection={section}
          setActiveSection={handleNavigation}
        />

        {/* Main Content */}
        <main className="flex-1 w-full pt-20 sm:pt-24 md:pl-60 lg:pl-72 pb-16 md:pb-0 overflow-y-auto">
          <div className="w-full h-full px-3 py-4 sm:px-4 sm:py-5 md:px-6 md:py-6 lg:px-8 lg:py-8">
            <div className="max-w-6xl mx-auto w-full">
              {renderContent()}
            </div>
          </div>
        </main>
      </div>

      {/* Bottom Tab Navigation (Mobile only) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg md:hidden z-40">
        <div className="flex items-center justify-around px-2 py-2">
          {/* Home Tab */}
          <button
            type="button"
            onClick={goDashboard}
            className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-colors flex-1 ${
              isHome
                ? "text-blue-600 bg-blue-50"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-xs font-medium">Home</span>
          </button>

          {/* Analytics Tab */}
          <button
            type="button"
            onClick={handleAnalyticsClick}
            className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-colors flex-1 ${
              isAnalytics
                ? "text-blue-600 bg-blue-50"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-xs font-medium">Analytics</span>
          </button>

          {/* Messages Tab */}
          <button
            type="button"
            onClick={handleMessagesClick}
            className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-colors flex-1 ${
              isMessages
                ? "text-blue-600 bg-blue-50"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Mail className="w-5 h-5" />
            <span className="text-xs font-medium">Messages</span>
          </button>
        </div>
      </nav>
    </div>
  );
}