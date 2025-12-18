"use client";
import React, { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase/firebaseConfig";
import { useAuthState } from "react-firebase-hooks/auth";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  deleteDoc,
  addDoc,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import Header from "@/components/shared/header/Header";
import Link from "next/link";
 
export default function MyRequestsPage() {
  const [user] = useAuthState(auth);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "accepted" | "rejected">("all");
 
  // same helper as chat page
  const getAvatarUrl = (u: any) =>
    u?.photoURL || u?.photoUrl || "/default-avatar.png";
 
  const buildRequest = async (docSnap: QueryDocumentSnapshot<DocumentData>) => {
    const req: any = { id: docSnap.id, ...docSnap.data() };
    const created = req.createdAt?.toDate?.() || null;
 
    // owner name
    let ownerName = req.ownerName;
    if (!ownerName && req.creatorId) {
      const ownerRef = doc(db, "users", req.creatorId);
      const ownerSnap = await getDoc(ownerRef);
      const ownerData = ownerSnap.data();
      ownerName =
        ownerData?.name ||
        ownerData?.displayName ||
        "Unknown";
    }
 
    // requester avatar (sender of this request)
    let requesterAvatar: string | null = null;
    if (req.requesterId) {
      const requesterRef = doc(db, "users", req.requesterId);
      const requesterSnap = await getDoc(requesterRef);
      const requesterData = requesterSnap.data();
      requesterAvatar = getAvatarUrl(requesterData || null);
    }
 
    return {
      ...req,
      createdAt: created,
      ownerName,
      requesterAvatar,
    };
  };
 
  // Fetch swap requests SENT by the user, with incremental updates
  useEffect(() => {
    if (!user) return;
 
    const qRef = query(
      collection(db, "swapRequests"),
      where("requesterId", "==", user.uid)
    );
 
    const unsubscribe = onSnapshot(qRef, (snapshot) => {
      const changes = snapshot.docChanges();
 
      // Use functional update so we can await inside
      setRequests((prevState) => {
        // Wrap in async handler, but return a promise-resolved state
        const run = async () => {
          let current = [...prevState];
 
          const builtChanges = await Promise.all(
            changes.map(async (change) => {
              const built = await buildRequest(change.doc);
              return { type: change.type, built };
            })
          );
 
          for (const { type, built } of builtChanges) {
            if (type === "added") {
              if (!current.find((r) => r.id === built.id)) {
                current.push(built);
              }
            } else if (type === "modified") {
              current = current.map((r) => (r.id === built.id ? built : r));
            } else if (type === "removed") {
              current = current.filter((r) => r.id !== built.id);
            }
          }
 
          current.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          return current;
        };
 
        // React state update cannot be async, so we just kick off the async
        // computation and return the old state immediately, then manually set.
        // To keep it simple, compute synchronously here by ignoring async in setter:
        // We instead rebuild from snapshot.docs if you prefer purely sync logic.
        // For now, we do not await here; we'll update inside a separate setState.
        run().then((next) => {
          setRequests(next);
        });
 
        return prevState;
      });
 
      setLoading(false);
    });
 
    return unsubscribe;
  }, [user]);
 
  // Delete request
  const handleDelete = async (requestId: string) => {
    if (!confirm("Are you sure you want to delete this request?")) return;
 
    try {
      await deleteDoc(doc(db, "swapRequests", requestId));
 
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
 
      alert("Request deleted successfully.");
    } catch (err) {
      console.error("Error deleting request:", err);
      alert("Failed to delete request.");
    }
  };
 
  // Ping owner
  const handlePing = async (request: any) => {
    try {
      if (!request.creatorId) return;
 
      await addDoc(collection(db, "notifications"), {
        userId: request.creatorId,
        type: "ping",
        requestId: request.id,
        message: `You have been pinged about the swap request for "${request.requestedLessonTitle}".`,
        createdAt: new Date(),
        read: false,
      });
 
      alert("Owner has been pinged!");
    } catch (err) {
      console.error("Error pinging owner:", err);
      alert("Failed to ping owner.");
    }
  };
 
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
        />
        <main className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 pt-20 sm:pt-24 pb-6 sm:pb-10">
          <p className="text-gray-600 text-base sm:text-lg">
            Please log in to view your requests.
          </p>
        </main>
      </div>
    );
  }
 
  // Filter logic
  const filteredRequests =
    activeTab === "all"
      ? requests
      : requests.filter((r) => r.status === activeTab);
 
  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />
 
      <main className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 pt-20 sm:pt-24 md:pt-28 pb-6 sm:pb-10">
        {/* Page Header */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
          Sent Requests
        </h1>
        <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
          These are the swap requests you have sent to other course owners.
        </p>
 
        {/* Tabs - Scrollable on mobile */}
        <div className="flex gap-2 sm:gap-4 border-b border-gray-200 mb-4 sm:mb-6 overflow-x-auto pb-1">
          {["all", "pending", "accepted", "rejected"].map((tab) => (
            <button
              key={tab}
              onClick={() =>
                setActiveTab(tab as "all" | "pending" | "accepted" | "rejected")
              }
              className={`px-3 sm:px-4 py-2 font-medium capitalize transition-colors whitespace-nowrap text-sm sm:text-base ${
                activeTab === tab
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab} (
              {tab === "all"
                ? requests.length
                : requests.filter((r) => r.status === tab).length}
              )
            </button>
          ))}
        </div>
 
        {/* Requests */}
        {loading ? (
          <p className="text-gray-500 text-sm sm:text-base">Loading...</p>
        ) : filteredRequests.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8 text-center text-gray-600 text-sm sm:text-base">
            No {activeTab} requests.
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {filteredRequests.map((req) => {
              const title = req.requestedLessonTitle || "Untitled Lesson";
              const owner = req.ownerName || "Unknown Owner";
              const offered = req.offeredSkillTitle || "Unknown Skill";
              const offeredId = req.offeredLessonId;
              const createdDate = req.createdAt
                ? req.createdAt.toLocaleDateString()
                : "Unknown date";
              const createdTime = req.createdAt
                ? req.createdAt.toLocaleTimeString()
                : "";
 
              return (
                <div
                  key={req.id}
                  className="bg-white rounded-lg shadow-sm p-4 sm:p-6 hover:shadow-md transition"
                >
                  {/* Header with requester avatar */}
                  <div className="flex justify-between items-start mb-3 sm:mb-4 gap-3">
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                        {req.requesterAvatar ? (
                          <img
                            src={req.requesterAvatar}
                            alt="Your avatar"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xs sm:text-sm text-gray-500">U</span>
                        )}
                      </div>
 
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-1 truncate">
                          {title}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-500">
                          {createdDate} {createdTime && (
                            <span className="hidden sm:inline">at {createdTime}</span>
                          )}
                        </p>
                      </div>
                    </div>
 
                    <span
                      className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold capitalize flex-shrink-0 ${
                        req.status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : req.status === "accepted"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>
 
                  {/* Arrow link to requested lesson */}
                  <div className="flex items-center gap-2 mt-2">
                    {req.requestedLessonId && (
                      <Link
                        href={`/skills/${req.requestedLessonId}`}
                        className="text-black hover:text-blue-800 transition text-base sm:text-lg"
                        aria-label={`Go to requested lesson`}
                      >
                        ➔
                      </Link>
                    )}
                  </div>
 
                  <p className="text-sm sm:text-base text-gray-700 mt-2">
                    <span className="font-semibold">Owner:</span> {owner}
                  </p>
 
                  <p className="text-sm sm:text-base text-gray-700 break-words">
                    <span className="font-semibold">Offering:</span>{" "}
                    {offeredId ? (
                      <Link
                        href={`/skills/${offeredId}`}
                        className="text-blue-600 underline hover:text-blue-800"
                      >
                        {offered}
                      </Link>
                    ) : (
                      offered
                    )}
                  </p>
 
                  {/* Message */}
                  {req.message && (
                    <div className="mt-3 p-3 bg-gray-50 rounded">
                      <p className="text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                        Message:
                      </p>
                      <p className="text-xs sm:text-sm md:text-base text-gray-800 break-words">
                        {req.message}
                      </p>
                    </div>
                  )}
 
                  {/* Status Messages */}
                  {req.status === "accepted" && (
                    <div className="mt-4 p-3 bg-green-50 rounded border border-green-200 text-green-800 text-xs sm:text-sm">
                      ✓ Your request is accepted — you can now access this
                      course.
                    </div>
                  )}
 
                  {req.status === "rejected" && (
                    <div className="mt-4 p-3 bg-red-50 rounded border border-red-200 text-red-800 text-xs sm:text-sm">
                      ✗ This request was rejected.
                    </div>
                  )}
 
                  {/* Ping & Delete Buttons */}
                  {req.status !== "accepted" && (
                    <div className="flex flex-wrap gap-3 sm:gap-4 mt-4">
                      {req.status === "pending" && (
                        <button
                          onClick={() => handlePing(req)}
                          className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 transition font-medium"
                        >
                          Ping Owner
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(req.id)}
                        className="text-xs sm:text-sm text-red-600 hover:text-red-800 transition font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}