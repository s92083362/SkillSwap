"use client";
import React, { useState } from "react";
import Header from "../shared/header/Header";
import ProfileSidebar from "./ProfileSidebar";
import ProfileLessons from "./ProfileLessons";
import ProfileMessages from "./ProfileMessages";
import EditProfile from "./EditProfile";
import MySkills from "./MySkills"; 
import AcceptedSwapRequests from "./AcceptedSwapRequests";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../../lib/firebase/firebaseConfig";

export default function ProfilePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<"dashboard" | "skills" | "messages" | "swap" | "profile">("dashboard");
  const [user, loading, error] = useAuthState(auth);

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
              <h1 className="text-3xl font-bold mb-1">
                {loading ? "Loading..." : (
                  user && user.displayName ? (
                    <>
                      Welcome back, <span className="text-black">{user.displayName}</span>!
                    </>
                  ) : "Welcome!"
                )}
              </h1>
              <p className="text-gray-500 mb-6">
                Here's what's happening on SkillSwap today.
              </p>
              <ProfileLessons />
              <ProfileMessages />
            </>
          )}
          {activeSection === "skills" && <MySkills />}
          {activeSection === "messages" && <ProfileMessages />}
          {activeSection === "swap" && <AcceptedSwapRequests />}
          {activeSection === "profile" && <EditProfile />}
        </main>
      </div>
    </div>
  );
}