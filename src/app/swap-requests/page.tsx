"use client";
import React, { useState, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../../lib/firebase/firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  addDoc,
} from "firebase/firestore";
import Header from "../../components/shared/header/Header";

export default function SwapRequestsPage() {
  const [user] = useAuthState(auth);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "accepted" | "rejected">("all");
  const [showChatDialog, setShowChatDialog] = useState(false);
  const [acceptedRequestData, setAcceptedRequestData] = useState<any>(null);

  const getAvatarUrl = (u: any) =>
    u?.photoURL || u?.photoUrl || "/default-avatar.png";

  useEffect(() => {
    if (!user) return;

    async function fetchSwapRequests() {
      try {
        const qRef = query(
          collection(db, "swapRequests"),
          where("creatorId", "==", user.uid)
        );
        const snapshot = await getDocs(qRef);

        const swapRequests: any[] = [];
        for (const d of snapshot.docs) {
          const data = d.data();
          const createdAt = data.createdAt?.toDate?.() || null;
          const updatedAt = data.updatedAt?.toDate?.() || null;

          let requesterAvatar: string | null = null;
          if (data.requesterId) {
            const requesterRef = doc(db, "users", data.requesterId);
            const requesterSnap = await getDoc(requesterRef);
            const requesterData = requesterSnap.data();
            requesterAvatar = getAvatarUrl(requesterData || null);
          }

          swapRequests.push({
            id: d.id,
            ...data,
            createdAt,
            updatedAt,
            requesterAvatar,
          });
        }

        swapRequests.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setRequests(swapRequests);
      } catch (error) {
        console.error("Error fetching swap requests:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchSwapRequests();
  }, [user]);

  async function handleUpdateStatus(requestId: string, newStatus: "accepted" | "rejected") {
    try {
      const requestRef = doc(db, "swapRequests", requestId);
      const requestSnap = await getDoc(requestRef);

      if (!requestSnap.exists()) {
        console.error("Request document does not exist:", requestId);
        alert("This request no longer exists.");
        setRequests((prev) => prev.filter((req) => req.id !== requestId));
        return;
      }
      const requestData = requestSnap.data() as any;

      if (requestData.creatorId !== user?.uid) {
        alert("You don't have permission to update this request.");
        return;
      }

      const now = new Date();

      await updateDoc(requestRef, {
        status: newStatus,
        updatedAt: now,
        requesterStatus: newStatus,
        requesterNotifiedAt: now,
      });

      await addDoc(collection(db, "notifications"), {
        userId: requestData.requesterId,
        type: newStatus === "accepted" ? "requestAccepted" : "requestRejected",
        requestId,
        courseTitle: requestData.requestedLessonTitle,
        ownerName: user.displayName || "Unknown",
        message: `Your request for "${requestData.requestedLessonTitle}" was ${newStatus}.`,
        createdAt: now,
        read: false,
      });

      await addDoc(collection(db, "notifications"), {
        userId: requestData.requesterId,
        type: "swap_request_update",
        status: newStatus,
        courseTitle: requestData.requestedLessonTitle,
        ownerName: user.displayName || user.email,
        requestId,
        isRead: false,
        createdAt: now,
      });

      setRequests((prev) =>
        prev.map((req) =>
          req.id === requestId
            ? { ...req, status: newStatus, updatedAt: now }
            : req
        )
      );

      if (newStatus === "accepted") {
        const currentRequest =
          requests.find((req) => req.id === requestId) || {
            id: requestId,
            ...requestData,
          };
        setAcceptedRequestData(currentRequest);
        setShowChatDialog(true);
      } else {
        alert(`Request ${newStatus} successfully!`);
      }
    } catch (error: any) {
      console.error("Error updating request:", error);
      alert(`Failed to update request: ${error.message}`);
    }
  }

  function handleGoToChat() {
    window.location.href = "/chat";
  }

  function handleChatLater() {
    setShowChatDialog(false);
    setAcceptedRequestData(null);
    alert("Request accepted successfully!");
  }

  const filteredRequests = requests.filter((req) => {
    const statusNormalized =
      typeof req.status === "string"
        ? req.status.trim().toLowerCase()
        : "";
    if (filter === "all") return true;
    return statusNormalized === filter;
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
        />
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-10">
          <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8 text-center">
            <p className="text-gray-600 text-base sm:text-lg">
              Please log in to view swap requests.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      {/* Chat Dialog Popup */}
      {showChatDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 sm:p-8 mx-4">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3">
              Request Accepted!
            </h3>
            <p className="text-sm sm:text-base text-gray-700 mb-6">
              Do you want to go to chat with{" "}
              {acceptedRequestData?.requesterName} now?
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleGoToChat}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded transition-colors text-sm sm:text-base"
              >
                Yes
              </button>
              <button
                onClick={handleChatLater}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded transition-colors text-sm sm:text-base"
              >
                Do it Later
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-10">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
            Skill Swap Requests
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Manage requests from users who want to exchange skills
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 sm:gap-2 mb-6 border-b border-gray-200 overflow-x-auto">
          {["all", "pending", "accepted", "rejected"].map((status) => (
            <button
              key={status}
              onClick={() =>
                setFilter(status as "all" | "pending" | "accepted" | "rejected")
              }
              className={`px-3 sm:px-4 py-2 font-medium capitalize transition-colors whitespace-nowrap text-sm sm:text-base ${
                filter === status
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {status}
              {status === "all" && ` (${requests.length})`}
              {status === "pending" &&
                ` (${requests.filter(
                  (r) =>
                    typeof r.status === "string" &&
                    r.status.trim().toLowerCase() === "pending"
                ).length})`}
              {status === "accepted" &&
                ` (${requests.filter(
                  (r) =>
                    typeof r.status === "string" &&
                    r.status.trim().toLowerCase() === "accepted"
                ).length})`}
              {status === "rejected" &&
                ` (${requests.filter(
                  (r) =>
                    typeof r.status === "string" &&
                    r.status.trim().toLowerCase() === "rejected"
                ).length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-sm sm:text-base">Loading requests...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8 text-center">
            <p className="text-gray-600 text-base sm:text-lg">
              {filter === "all"
                ? "No swap requests yet"
                : `No ${filter} requests`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request) => {
              const statusNormalized =
                typeof request.status === "string"
                  ? request.status.trim().toLowerCase()
                  : "";

              return (
                <div
                  key={request.id}
                  className="bg-white rounded-lg shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4">
                    {/* Left: requester avatar + basic info */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                        {request.requesterAvatar ? (
                          <img
                            src={request.requesterAvatar}
                            alt={request.requesterName || "Requester avatar"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-sm text-gray-500">U</span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1 break-words">
                          {request.requestedLessonTitle}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-500">
                          {request.createdAt?.toLocaleDateString()}{" "}
                          <span className="hidden xs:inline">at{" "}</span>
                          <span className="block xs:inline">
                            {request.createdAt?.toLocaleTimeString()}
                          </span>
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap self-start ${
                        statusNormalized === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : statusNormalized === "accepted"
                          ? "bg-green-100 text-green-800"
                          : statusNormalized === "rejected"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {statusNormalized
                        ? statusNormalized.charAt(0).toUpperCase() +
                          statusNormalized.slice(1)
                        : "Unknown"}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <p className="text-sm sm:text-base text-gray-700 break-words">
                      <span className="font-semibold">From:</span>{" "}
                      {request.requesterName} ({request.requesterEmail})
                    </p>
                    <p className="text-sm sm:text-base text-gray-700 break-words">
                      <span className="font-semibold">Offering:</span>{" "}
                      {request.offeredSkillTitle}
                    </p>

                    {/* Arrow link to offered skill */}
                    <div className="flex items-center gap-2 mt-2">
                      {request.offeredSkillId && (
                        <a
                          href={`/skills/${request.offeredSkillId}`}
                          className="text-black hover:text-blue-800 transition text-lg sm:text-xl"
                          aria-label="Go to offered skill"
                        >
                          ➔
                        </a>
                      )}
                    </div>

                    {request.message && (
                      <div className="mt-3 p-3 bg-gray-50 rounded">
                        <p className="text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                          Message:
                        </p>
                        <p className="text-sm sm:text-base text-gray-800 break-words">
                          {request.message}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Buttons / status blocks */}
                  {statusNormalized === "pending" && (
                    <div className="flex flex-col sm:flex-row gap-3 mt-4">
                      <button
                        onClick={() =>
                          handleUpdateStatus(request.id, "accepted")
                        }
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 sm:py-3 px-4 rounded transition-colors text-sm sm:text-base"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() =>
                          handleUpdateStatus(request.id, "rejected")
                        }
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 sm:py-3 px-4 rounded transition-colors text-sm sm:text-base"
                      >
                        Reject
                      </button>
                    </div>
                  )}

                  {statusNormalized === "accepted" && (
                    <div className="mt-4 p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-green-800 text-xs sm:text-sm break-words">
                        ✓ You accepted this request. You can now contact{" "}
                        {request.requesterName} at {request.requesterEmail}
                      </p>
                    </div>
                  )}

                  {statusNormalized === "rejected" && (
                    <div className="mt-4 p-3 sm:p-4 bg-red-50 rounded-lg border border-red-200">
                      <p className="text-red-800 text-xs sm:text-sm">
                        ✗ You rejected this request.
                      </p>
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