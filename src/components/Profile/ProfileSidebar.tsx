
"use client";
 
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { logout } from "../../lib/firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase/firebaseConfig";
import {
  LogOut,
  Home,
  Layers,
  MessageSquare,
  ArrowLeftRight,
  User,
  X,
} from "lucide-react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../../lib/firebase/firebaseConfig";
 
type SectionKey = "dashboard" | "skills" | "messages" | "swap" | "profile";
 
interface ProfileSidebarProps {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  setActiveSection: (section: SectionKey) => void;
  activeSection: SectionKey;
}
 
export default function ProfileSidebar({
  mobileMenuOpen,
  setMobileMenuOpen,
  setActiveSection,
  activeSection,
}: ProfileSidebarProps) {
  const router = useRouter();
  const [success, setSuccess] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [user, loading] = useAuthState(auth as any);
 
  const navItems: { key: SectionKey; icon: React.ReactNode; label: string }[] = [
    { key: "dashboard", icon: <Home className="w-5 h-5" />, label: "Dashboard" },
    { key: "skills", icon: <Layers className="w-5 h-5" />, label: "My Skills" },
    { key: "messages", icon: <MessageSquare className="w-5 h-5" />, label: "Messages" },
    { key: "swap", icon: <ArrowLeftRight className="w-5 h-5" />, label: "Accepted Swaps" },
    { key: "profile", icon: <User className="w-5 h-5" />, label: "Profile" },
  ];
 
  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleLogoutConfirm = async () => {
    try {
      // Mark user as offline before logging out
      if (user?.uid) {
        console.log("🔴 Marking user offline:", user.uid);
        await setDoc(
          doc(db, "users", user.uid),
          {
            lastActive: serverTimestamp(),
            isOnline: false,
          },
          { merge: true }
        );
        console.log("✅ User marked offline successfully");
       
        // Small delay to ensure Firestore write completes
        await new Promise(resolve => setTimeout(resolve, 500));
      }
 
      await logout();
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
    `flex items-center gap-3 py-2 px-4 rounded-lg w-full text-left transition ${
      activeSection === sectionKey
        ? "bg-blue-100 text-blue-700 font-semibold"
        : "text-gray-600 hover:bg-blue-50"
    }`;
 
  const avatarUrl = user?.photoURL
    ? user.photoURL
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(
        user?.displayName || "User"
      )}&background=F8D5CB&color=555`;
 
  const displayName = loading ? "Loading..." : user?.displayName || "User";
 
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
 
      <p className="font-bold text-base lg:text-lg mb-1 text-gray-900">
        {displayName}
      </p>
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
                setActiveSection(item.key);
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
        onClick={handleLogoutClick}
        className="w-full flex items-center gap-2 text-gray-500 hover:text-red-500 py-2 mt-7 lg:mt-9"
      >
        <LogOut className="w-5 h-5" /> Logout
      </button>
    </>
  );
 
  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-20 w-64 lg:w-72 h-[calc(100vh-5rem)] bg-white border-r px-4 lg:px-6 py-8 flex-col items-center overflow-y-auto z-40">
        {sidebarContent}
      </aside>
 
      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-black/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="w-72 h-full bg-white border-r px-6 py-8 flex flex-col items-center relative overflow-y-auto shadow-lg">
            <button
              className="absolute top-4 right-4"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X className="w-6 h-6 text-gray-700" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Logout Confirmation Modal - Fully Responsive */}
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