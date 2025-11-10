"use client";
import React, { useState } from "react";
import Header from "../shared/header/Header";
import ProfileSidebar from "./ProfileSidebar";
import ProfileLessons from "./ProfileLessons";
import ProfileMessages from "./ProfileMessages";
import EditProfile from "./EditProfile"; // <-- import your EditProfile component

export default function ProfilePage() {
  // State for mobile drawer sidebar menu
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // State for "tab"/panel navigation
  const [activeSection, setActiveSection] = useState<"dashboard" | "skills" | "messages" | "explore" | "profile">("dashboard");

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
      <div className="flex flex-1">
        <ProfileSidebar
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          setActiveSection={setActiveSection}
          activeSection={activeSection}
        />
        <main className="flex-1 px-4 sm:px-10 py-8">
          {activeSection === "dashboard" && (
            <>
              <h1 className="text-3xl font-bold mb-1">Welcome back, Sophia!</h1>
              <p className="text-gray-500 mb-6">
                Here's what's happening on SkillSwap today.
              </p>
              <ProfileLessons />
              <ProfileMessages />
            </>
          )}
          {activeSection === "skills" && (
            <div>
              <h1 className="text-2xl font-semibold mb-4">My Skills</h1>
              {/* Insert your Skills code or component here */}
            </div>
          )}
          {activeSection === "messages" && (
            <ProfileMessages />
          )}
          {activeSection === "explore" && (
            <div>
              <h1 className="text-2xl font-semibold mb-4">Explore</h1>
              {/* Insert your explore code or component here */}
            </div>
          )}
          {activeSection === "profile" && (
            <EditProfile />
          )}
        </main>
      </div>
    </div>
  );
}
