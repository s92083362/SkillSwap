"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../../../lib/firebase/firebaseConfig";
import AdminHeader from "@/components/shared/header/AdminHeader";
import AdminSidebar from "./AdminProfileSidebar";
import AdminEditProfile from "./AdminEditProfile";

// Keep SectionKey in sync with AdminSidebar
type SectionKey = "overview" | "settings" | "security" | "activity";

export default function AdminProfilePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user] = useAuthState(auth as any);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Read section from URL and safely narrow to SectionKey
  const sectionParam = (searchParams.get("section") || "overview") as string;
  const validSections: SectionKey[] = ["overview", "settings", "security", "activity"];

  const section: SectionKey = validSections.includes(
    sectionParam as SectionKey
  )
    ? (sectionParam as SectionKey)
    : "overview";

  // Navigation handler used by sidebar + header
  const handleNavigation = (sectionName: SectionKey) => {
    router.push(`/profile?section=${sectionName}`);
    setMobileMenuOpen(false);
  };

  const renderContent = () => {
    switch (section) {
      case "overview":
        return <AdminEditProfile />;

      case "settings":
        return (
          <div className="bg-white rounded-3xl shadow-xl p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Settings</h2>
            <p className="text-gray-500 text-center py-12">
              Settings page coming soon...
            </p>
          </div>
        );

      case "security":
        return (
          <div className="bg-white rounded-3xl shadow-xl p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Security</h2>
            <p className="text-gray-500 text-center py-12">
              Security page coming soon...
            </p>
          </div>
        );

      case "activity":
        return (
          <div className="bg-white rounded-3xl shadow-xl p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Activity Log
            </h2>
            <p className="text-gray-500 text-center py-12">
              Activity log coming soon...
            </p>
          </div>
        );

      default:
        return <AdminEditProfile />;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-blue-600"
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
          <p className="text-lg text-gray-700">
            Please log in to view your admin profile
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        showMobileMenu={true} // Enable hamburger menu on profile page
      />

      <div className="flex">
        {/* Sidebar */}
        <AdminSidebar
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          activeSection={section}
          setActiveSection={handleNavigation}
        />

        {/* Main Content */}
        <main className="flex-1 md:ml-64 lg:ml-72 pt-24 p-6">
          <div className="max-w-6xl mx-auto">{renderContent()}</div>
        </main>
      </div>
    </div>
  );
}
