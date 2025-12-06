"use client";
import React, { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase/firebaseConfig";
import { useAuthState } from "react-firebase-hooks/auth";
import { collection, query, where, onSnapshot, doc, getDoc } from "firebase/firestore";
import Header from "@/components/shared/header/Header";
import Link from "next/link";

export default function MyRequestsPage() {
  const [user] = useAuthState(auth);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all"); // all | pending | accepted | rejected

  // Fetch swap requests SENT by the user
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "swapRequests"), where("requesterId", "==", user.uid));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const data = [];

      for (const docSnap of snapshot.docs) {
        const req = { id: docSnap.id, ...docSnap.data() };
        const created = req.createdAt?.toDate?.() || null;

        let ownerName = req.ownerName;
        if (!ownerName && req.creatorId) {
          const ownerRef = doc(db, "users", req.creatorId);
          const ownerSnap = await getDoc(ownerRef);
          ownerName = ownerSnap.data()?.name || ownerSnap.data()?.displayName || "Unknown";
        }

        data.push({
          ...req,
          createdAt: created,
          ownerName,
        });
      }

      data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      setRequests(data);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
        <main className="max-w-4xl mx-auto p-10">
          <p className="text-gray-600 text-lg">Please log in to view your requests.</p>
        </main>
      </div>
    );
  }

  // Filter logic
  const filteredRequests =
    activeTab === "all" ? requests : requests.filter((r) => r.status === activeTab);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />

      <main className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Sent Requests</h1>
        <p className="text-gray-600 mb-6">
          These are the swap requests you have sent to other course owners.
        </p>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-gray-200 mb-6">
          {["all", "pending", "accepted", "rejected"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium capitalize transition-colors ${
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
          <p className="text-gray-500">Loading...</p>
        ) : filteredRequests.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-600">
            No {activeTab} requests.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((req) => {
              // Safe fields
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
                  className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition"
                >
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-1">{title}</h3>
                      <p className="text-sm text-gray-500">
                        {createdDate} {createdTime && `at ${createdTime}`}
                      </p>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold capitalize ${
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

                  {/* Details */}

                  <div className="flex items-center gap-2 mt-2">
                        {req.requestedLessonId && (
                            <Link
                            href={`/skills/${req.requestedLessonId}`}
                            className="text-black hover:text-blue-800 transition text-lg"
                            aria-label={`Go to requested lesson`}
                            >
                            ➔
                            </Link>
                        )}
                   </div>

                  <p className="text-gray-700">
                    <span className="font-semibold">Owner:</span> {owner}
                  </p>

                  <p className="text-gray-700">
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
                      <p className="text-sm font-semibold text-gray-700 mb-1">Message:</p>
                      <p className="text-gray-800">{req.message}</p>
                    </div>
                  )}

                  {/* Status Messages */}
                  {req.status === "accepted" && (
                    <div className="mt-4 p-3 bg-green-50 rounded border border-green-200 text-green-800">
                      ✓ Your request is accepted — you can now access this course.
                    </div>
                  )}

                  {req.status === "rejected" && (
                    <div className="mt-4 p-3 bg-red-50 rounded border border-red-200 text-red-800">
                      ✗ This request was rejected.
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