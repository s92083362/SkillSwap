
"use client";
import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Home, BookOpen, Users, Layers } from "lucide-react";
import Header from "../../shared/header/Header";
import ProfileSidebar from "./ProfileSidebar";
import ProfileLessons from "./ProfileLessons";
import ProfileMessages from "./ProfileMessages";
import EditProfile from "./EditProfile";
import MySkills from "./MySkills";
import AcceptedSwapRequests from "./AcceptedSwapRequests";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../../../lib/firebase/firebaseConfig";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDoc,
  doc,
  updateDoc,
  addDoc,
} from "firebase/firestore";

export default function ProfilePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<
    "dashboard" | "skills" | "messages" | "swap" | "profile"
  >("dashboard");

  const [user, loading] = useAuthState(auth);
  const searchParams = useSearchParams();

  // Pending Requests
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  // Detect URL section
  useEffect(() => {
    const section = searchParams.get("section");
    if (section === "skills") {
      setActiveSection("skills");
    } else if (section === "swap") {
      setActiveSection("swap");
    } else if (section === "messages") {
      setActiveSection("messages");
    } else if (section === "profile") {
      setActiveSection("profile");
    } else {
      setActiveSection("dashboard");
    }
  }, [searchParams]);

  // Handle Accept (with notifications)
  const handleAccept = async (requestId: string) => {
    try {
      const requestRef = doc(db, "swapRequests", requestId);
      const requestSnap = await getDoc(requestRef);

      if (!requestSnap.exists()) {
        alert("Request not found.");
        return;
      }

      const requestData = requestSnap.data();

      await updateDoc(requestRef, {
        status: "accepted",
        updatedAt: new Date(),
      });

      await addDoc(collection(db, "notifications"), {
        userId: requestData.requesterId,
        type: "requestAccepted",
        requestId: requestId,
        courseTitle: requestData.requestedLessonTitle,
        ownerName: user?.displayName || "Unknown",
        message: `Your request for "${requestData.requestedLessonTitle}" has been accepted by ${user?.displayName || "the owner"}.`,
        createdAt: new Date(),
        read: false,
      });

      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
      
      // Success message
      alert("Request accepted successfully! The user has been notified.");
    } catch (err) {
      console.error("Accept error:", err);
      alert("Failed to accept request. Please try again.");
    }
  };

  // Handle Decline (with notifications)
  const handleDecline = async (requestId: string) => {
    try {
      const requestRef = doc(db, "swapRequests", requestId);
      const requestSnap = await getDoc(requestRef);

      if (!requestSnap.exists()) {
        alert("Request not found.");
        return;
      }

      const requestData = requestSnap.data();

      await updateDoc(requestRef, {
        status: "rejected",
        updatedAt: new Date(),
      });

      await addDoc(collection(db, "notifications"), {
        userId: requestData.requesterId,
        type: "requestRejected",
        requestId: requestId,
        courseTitle: requestData.requestedLessonTitle,
        ownerName: user?.displayName || "Unknown",
        message: `Your request for "${requestData.requestedLessonTitle}" was rejected by ${user?.displayName || "the owner"}.`,
        createdAt: new Date(),
        read: false,
      });

      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
      
      // Success message
      alert("Request rejected successfully. The user has been notified.");
    } catch (err) {
      console.error("Decline error:", err);
      alert("Failed to reject request. Please try again.");
    }
  };

  // Real-time Pending Requests Fetch
  useEffect(() => {
    if (!user) {
      setPendingRequests([]);
      setLoadingRequests(false);
      return;
    }

    setLoadingRequests(true);

    const reqRef = collection(db, "swapRequests");
    const q = query(
      reqRef,
      where("creatorId", "==", user.uid),
      where("status", "==", "pending")
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const docs = snapshot.docs;
        const temp: any[] = [];

        await Promise.all(
          docs.map(async (d) => {
            const data = d.data();
            const requesterId = data.requesterId;

            let requesterProfile: any = null;

            if (requesterId) {
              try {
                const userDoc = await getDoc(doc(db, "users", requesterId));
                if (userDoc.exists()) requesterProfile = userDoc.data();
              } catch {
                // ignore
              }
            }

            temp.push({
              id: d.id,
              requesterId,
              requesterName:
                requesterProfile?.name ||
                requesterProfile?.displayName ||
                data.requesterName ||
                "Anonymous",
              requesterPhoto:
                requesterProfile?.photoUrl ||
                requesterProfile?.photoURL ||
                data.requesterPhoto ||
                "/default-avatar.png",
              requestedLessonTitle:
                data.requestedLessonTitle || data.requestedLesson || "",
              offeredSkillTitle:
                data.offeredSkillTitle || data.offeredSkill || "",
            });
          })
        );

        setPendingRequests(temp);
        setLoadingRequests(false);
      },
      (error) => {
        console.error("Snapshot error:", error);
        setLoadingRequests(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Pending Requests Cards
  const PendingRequestsSection = () => (
    <div className="mt-4 sm:mt-6 md:mt-8 mb-3">
      <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">
        Pending Swap Requests
      </h2>

      {loadingRequests && (
        <p className="text-gray-500 text-sm mb-3">Loading requests...</p>
      )}

      {!loadingRequests && pendingRequests.length === 0 && (
        <p className="text-gray-500 text-sm mb-3">No pending requests</p>
      )}

      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
        {pendingRequests.map((req) => (
          <div
            key={req.id}
            className="border rounded-xl p-3 sm:p-4 shadow-sm bg-white flex flex-col items-center text-center hover:shadow-md transition-shadow"
          >
            <img
              src={req.requesterPhoto}
              alt={req.requesterName}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover mb-2"
            />

            <p className="font-semibold text-xs sm:text-sm text-purple-700 truncate w-full px-1">
              {req.requesterName}
            </p>

            <div className="mt-1 text-xs w-full px-1">
              <p className="text-gray-600 truncate">
                wants:{" "}
                <span className="font-medium">
                  {req.requestedLessonTitle}
                </span>
              </p>

              <p className="text-gray-600 truncate">
                offering:{" "}
                <span className="font-medium">
                  {req.offeredSkillTitle}
                </span>
              </p>
            </div>

            <div className="flex gap-2 mt-3 w-full justify-center">
              <button
                onClick={() => handleAccept(req.id)}
                className="px-2.5 sm:px-3 py-1 text-xs rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
              >
                Accept
              </button>

              <button
                onClick={() => handleDecline(req.id)}
                className="px-2.5 sm:px-3 py-1 text-xs rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Bottom Navigation with global links (old hamburger items)
  const BottomNavigation = () => {
    const menuItems = [
      {
        key: "home",
        label: "Home",
        path: "/dash-board",
        icon: <Home className="w-5 h-5" />,
      },
      {
        key: "skills",
        label: "My Skills",
        path: "/profile?section=skills",
        icon: <Layers className="w-5 h-5" />,
      },
      {
        key: "learn",
        label: "Learn",
        path: "/my-requests",
        icon: <BookOpen className="w-5 h-5" />,
      },
      {
        key: "teach",
        label: "Teach",
        path: "/swap-requests",
        icon: <Users className="w-5 h-5" />,
      },
    ];

    return (
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg md:hidden">
        <div className="flex items-stretch h-16">
          {menuItems.map((item) => (
            <a
              key={item.key}
              href={item.path}
              className="flex-1 flex flex-col items-center justify-center gap-1 text-gray-500 hover:text-gray-700"
            >
              {item.icon}
              <span className="text-xs font-medium">{item.label}</span>
            </a>
          ))}
        </div>
      </nav>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header should include the hamburger icon that toggles mobileMenuOpen */}
      <Header
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      {/* Sidebar (desktop fixed + mobile drawer via hamburger) */}
      <ProfileSidebar
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        setActiveSection={setActiveSection}
        activeSection={activeSection}
      />

      {/* Main content area */}
      <main className="min-h-screen pt-20 sm:pt-24 md:pt-28 pb-20 md:pb-10 md:ml-64 lg:ml-72">
        <div className="px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 max-w-7xl mx-auto w-full">
          {activeSection === "dashboard" && (
            <>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 sm:mb-3">
                {loading ? (
                  "Loading..."
                ) : user && user.displayName ? (
                  <>
                    Welcome back,{" "}
                    <span className="text-black">{user.displayName}</span>!
                  </>
                ) : (
                  "Welcome!"
                )}
              </h1>
              <p className="text-gray-500 mb-6 sm:mb-8 md:mb-10 text-xs sm:text-sm md:text-base">
                Here&apos;s what&apos;s happening on SkillSwap today.
              </p>
              <PendingRequestsSection />
              <div className="mt-6 sm:mt-8">
                <ProfileLessons />
              </div>
              <div className="mt-6 sm:mt-8">
                <ProfileMessages />
              </div>
            </>
          )}
          {activeSection === "skills" && <MySkills />}
          {activeSection === "messages" && <ProfileMessages />}
          {activeSection === "swap" && <AcceptedSwapRequests />}
          {activeSection === "profile" && <EditProfile />}
        </div>
      </main>

      {/* Bottom Tab Navigation - Mobile Only */}
      <BottomNavigation />
    </div>
  );
}