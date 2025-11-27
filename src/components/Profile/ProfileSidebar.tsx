"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { logout } from "../../lib/firebase/auth";
import { LogOut, Home, Layers, MessageSquare, ArrowLeftRight, User, X } from "lucide-react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../../lib/firebase/firebaseConfig";

interface ProfileSidebarProps {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  setActiveSection: (section: "dashboard" | "skills" | "messages" | "swap" | "profile") => void;
  activeSection: string;
}

export default function ProfileSidebar({
  mobileMenuOpen,
  setMobileMenuOpen,
  setActiveSection,
  activeSection,
}: ProfileSidebarProps) {
  const router = useRouter();
  const [success, setSuccess] = useState("");

  // Get auth user info
  const [user, loading, error] = useAuthState(auth);

  const navItems: { key: typeof activeSection; icon: React.ReactNode; label: string }[] = [
    { key: "dashboard", icon: <Home className="w-5 h-5" />, label: "Dashboard" },
    { key: "skills", icon: <Layers className="w-5 h-5" />, label: "My Skills" },
    { key: "messages", icon: <MessageSquare className="w-5 h-5" />, label: "Messages" },
    { key: "swap", icon: <ArrowLeftRight className="w-5 h-5" />, label: "Accepted Swaps" }, // Updated label
    { key: "profile", icon: <User className="w-5 h-5" />, label: "Profile" },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      setSuccess("You have successfully logged out");
      setTimeout(() => {
        setSuccess("");
        router.push("/auth/login-and-signup");
        setMobileMenuOpen(false);
      }, 1500);
    } catch (err) {
      alert("Logout failed: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const getButtonClasses = (sectionKey: string) =>
    `flex items-center gap-3 py-2 px-4 rounded-lg w-full text-left transition
    ${
      activeSection === sectionKey
        ? "bg-blue-100 text-blue-700 font-semibold"
        : "text-gray-600 hover:bg-blue-50"
    }`;

  // Use user's photoURL or fallback to avatar with initials
  const avatarUrl = user?.photoURL
    ? user.photoURL
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || "User")}&background=F8D5CB&color=555`;

  const displayName = loading ? "Loading..." : user?.displayName || "User";

  // Sidebar for desktop
  const sidebarContent = (
    <>
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded mb-2 text-center font-semibold absolute top-5 left-5 right-5 z-50">
          {success}
        </div>
      )}
      <img
        src={avatarUrl}
        alt="Profile"
        className="w-16 h-16 lg:w-20 lg:h-20 rounded-full object-cover mb-3 lg:mb-4"
      />
      <p className="font-bold text-base lg:text-lg mb-1 text-gray-900">{displayName}</p>
      <p className="text-purple-600 text-xs lg:text-sm font-medium mb-5 lg:mb-7 bg-purple-100 px-2 py-1 rounded">
        Standard Member
      </p>
      <ul className="w-full flex-1 space-y-1 mb-0">
        {navItems.map((item) => (
          <li key={item.key}>
            <button
              type="button"
              className={getButtonClasses(item.key)}
              onClick={() => {
                setActiveSection(item.key as ProfileSidebarProps["setActiveSection"]);
                // Close mobile menu when navigating
                if (mobileMenuOpen) {
                  setMobileMenuOpen(false);
                }
              }}
            >
              {item.icon} {item.label}
            </button>
          </li>
        ))}
      </ul>
      <button
        onClick={handleLogout}
        className="w-full flex items-center gap-2 text-gray-500 hover:text-red-500 py-2 mt-7 lg:mt-9"
      >
        <LogOut className="w-5 h-5" /> Logout
      </button>
    </>
  );

  // Sidebar for mobile (drawer)
  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 lg:w-72 min-h-screen bg-white border-r px-4 lg:px-6 py-8 flex-col items-center relative">
        {sidebarContent}
      </aside>
      {/* Mobile Drawer Sidebar */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="flex-1 bg-black/40" onClick={() => setMobileMenuOpen(false)} />
          {/* Drawer content */}
          <aside className="w-72 min-h-full bg-white border-r px-6 py-8 flex flex-col items-center relative transition-transform duration-300 shadow-lg">
            <button className="absolute top-4 right-4" onClick={() => setMobileMenuOpen(false)}>
              <X className="w-6 h-6 text-gray-700" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}