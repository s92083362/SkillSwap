"use client";
import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Header from "../shared/header/Header";
import ProfileSidebar from "./ProfileSidebar";
import ProfileLessons from "./ProfileLessons";
import ProfileMessages from "./ProfileMessages";
import EditProfile from "./EditProfile";
import MySkills from "./MySkills";
import AcceptedSwapRequests from "./AcceptedSwapRequests";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../../lib/firebase/firebaseConfig";
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

  // Handle Accept (with notifications)
  const handleAccept = async (requestId: string) => {
    try {
      const requestRef = doc(db, "swapRequests", requestId);
      const requestSnap = await getDoc(requestRef);

      if (!requestSnap.exists()) return;

      const requestData = requestSnap.data();

      // update request
      await updateDoc(requestRef, {
        status: "accepted",
        updatedAt: new Date(),
      });

      // notify requester
      await addDoc(collection(db, "notifications"), {
        userId: requestData.requesterId,
        type: "requestAccepted",
        requestId: requestId,
        courseTitle: requestData.requestedLessonTitle,
        ownerName: user?.displayName || "Unknown",
        message: `Your request for "${requestData.requestedLessonTitle}" was accepted.`,
        createdAt: new Date(),
        read: false,
      });

      // remove from UI
      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err) {
      console.error("Accept error:", err);
      alert("Failed to accept request.");
    }
  };

  // Handle Decline (with notifications)
  const handleDecline = async (requestId: string) => {
    try {
      const requestRef = doc(db, "swapRequests", requestId);
      const requestSnap = await getDoc(requestRef);

      if (!requestSnap.exists()) return;

      const requestData = requestSnap.data();

      // update request
      await updateDoc(requestRef, {
        status: "rejected",
        updatedAt: new Date(),
      });

      // notify requester
      await addDoc(collection(db, "notifications"), {
        userId: requestData.requesterId,
        type: "requestRejected",
        requestId: requestId,
        courseTitle: requestData.requestedLessonTitle,
        ownerName: user?.displayName || "Unknown",
        message: `Your request for "${requestData.requestedLessonTitle}" was rejected.`,
        createdAt: new Date(),
        read: false,
      });

      // remove from UI
      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err) {
      console.error("Decline error:", err);
      alert("Failed to decline request.");
    }
  };

  // Detect URL section
  useEffect(() => {
    const section = searchParams.get("section");
    if (section === "skills") {
      setActiveSection("skills");
    }
    else if (section === "swap") {
      setActiveSection("swap");
    }
    else if (section === "dashboard") {
      setActiveSection("dashboard");
    }
  }, [searchParams]);

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
              } catch {}
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
    <div className="mt-8 mb-3">
      <h2 className="text-xl font-semibold mb-4">Pending Swap Requests</h2>

      {loadingRequests && (
        <p className="text-gray-500 text-sm mb-3">Loading requests...</p>
      )}

      {!loadingRequests && pendingRequests.length === 0 && (
        <p className="text-gray-500 text-sm mb-3">No pending requests</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {pendingRequests.map((req) => (
          <div
            key={req.id}
            className="border rounded-xl p-3 shadow-sm bg-white flex flex-col items-center text-center"
          >
            <img
              src={req.requesterPhoto}
              alt={req.requesterName}
              className="w-12 h-12 rounded-full object-cover mb-2"
            />

            <p className="font-semibold text-sm text-purple-700 truncate w-full">
              {req.requesterName}
            </p>

            <div className="mt-1 text-xs w-full">
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
                className="px-3 py-1 text-xs rounded-lg bg-green-600 text-white hover:bg-green-700"
              >
                Accept
              </button>

              <button
                onClick={() => handleDecline(req.id)}
                className="px-3 py-1 text-xs rounded-lg bg-red-500 text-white hover:bg-red-600"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );


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
              <PendingRequestsSection />
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