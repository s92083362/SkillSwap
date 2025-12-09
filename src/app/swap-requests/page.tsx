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
  addDoc
} from "firebase/firestore";
import Header from "../../components/shared/header/Header";

export default function SwapRequestsPage() {
  const [user] = useAuthState(auth);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, pending, accepted, rejected
  const [showChatDialog, setShowChatDialog] = useState(false);
  const [acceptedRequestData, setAcceptedRequestData] = useState(null);

  useEffect(() => {
    if (!user) return;

    async function fetchSwapRequests() {
      try {
        const q = query(
          collection(db, "swapRequests"),
          where("creatorId", "==", user.uid)
        );
        const snapshot = await getDocs(q);
        const swapRequests = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate()
        }));
        swapRequests.sort((a, b) => b.createdAt - a.createdAt);
        setRequests(swapRequests);
      } catch (error) {
        console.error("Error fetching swap requests:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchSwapRequests();
  }, [user]);

  // Only update status, don't delete document
  async function handleUpdateStatus(requestId, newStatus) {
    try {
      const requestRef = doc(db, "swapRequests", requestId);
      const requestSnap = await getDoc(requestRef);

      if (!requestSnap.exists()) {
        console.error("Request document does not exist:", requestId);
        alert("This request no longer exists.");
        setRequests(prev => prev.filter(req => req.id !== requestId));
        return;
      }
      const requestData = requestSnap.data();

      // Permission check
      if (requestData.creatorId !== user.uid) {
        alert("You don't have permission to update this request.");
        return;
      }

      await updateDoc(requestRef, {
        status: newStatus,
        updatedAt: new Date(),
        // Notify requester about the owner's decision
        requesterStatus: newStatus,
        requesterNotifiedAt: new Date()
      });
      
      await addDoc(collection(db, "notifications"), {
        userId: requestData.requesterId, // requester
        type: newStatus === "accepted" ? "requestAccepted" : "requestRejected",
        requestId: requestId,
        courseTitle: requestData.requestedLessonTitle,
        ownerName: user.displayName || "Unknown",
        message: `Your request for "${requestData.requestedLessonTitle}" was ${newStatus}.`,
        createdAt: new Date(),
        read: false,
      });

      await addDoc(collection(db, "notifications"), {
        userId: requestData.requesterId,  // requester receives the notification
        type: "swap_request_update",
        status: newStatus,                // accepted or rejected
        courseTitle: requestData.requestedLessonTitle,
        ownerName: user.displayName || user.email,
        requestId: requestId,
        isRead: false,
        createdAt: new Date()
      });


      setRequests(prev =>
        prev.map(req =>
          req.id === requestId
            ? { ...req, status: newStatus, updatedAt: new Date() }
            : req
        )
      );

      // If accepted, show chat dialog
      if (newStatus === "accepted") {
        const currentRequest = requests.find(req => req.id === requestId);
        setAcceptedRequestData(currentRequest);
        setShowChatDialog(true);
      } else {
        alert(`Request ${newStatus} successfully!`);
      }
    } catch (error) {
      console.error("Error updating request:", error);
      alert(`Failed to update request: ${error.message}`);
    }
  }

  function handleGoToChat() {
    // Navigate to the chat page using Next.js router
    window.location.href = "/chat/[chatId]";
  }

  function handleChatLater() {
    setShowChatDialog(false);
    setAcceptedRequestData(null);
    alert("Request accepted successfully!");
  }

  const filteredRequests = requests.filter(req => {
    // Normalize status for filtering
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
        <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
        <main className="max-w-5xl mx-auto px-4 py-10">
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-gray-600 text-lg">Please log in to view swap requests.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
      
      {/* Chat Dialog Popup */}
      {showChatDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-3">Request Accepted!</h3>
            <p className="text-gray-700 mb-6">
              Do you want to go to chat with {acceptedRequestData?.requesterName} now?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleGoToChat}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded transition-colors"
              >
                Yes
              </button>
              <button
                onClick={handleChatLater}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded transition-colors"
              >
                Do it Later
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Skill Swap Requests</h1>
          <p className="text-gray-600">Manage requests from users who want to exchange skills</p>
        </div>
        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {["all", "pending", "accepted", "rejected"].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 font-medium capitalize transition-colors ${
                filter === status
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {status}
              {status === "all" && ` (${requests.length})`}
              {status === "pending" && ` (${requests.filter(r => (typeof r.status === "string" && r.status.trim().toLowerCase() === "pending")).length})`}
              {status === "accepted" && ` (${requests.filter(r => (typeof r.status === "string" && r.status.trim().toLowerCase() === "accepted")).length})`}
              {status === "rejected" && ` (${requests.filter(r => (typeof r.status === "string" && r.status.trim().toLowerCase() === "rejected")).length})`}
            </button>
          ))}
        </div>
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading requests...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-gray-600 text-lg">
              {filter === "all" 
                ? "No swap requests yet" 
                : `No ${filter} requests`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map(request => {
              const statusNormalized =
                typeof request.status === "string"
                  ? request.status.trim().toLowerCase()
                  : "";

              return (
                <div key={request.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-1">
                        {request.requestedLessonTitle}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {request.createdAt?.toLocaleDateString()} at {request.createdAt?.toLocaleTimeString()}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        statusNormalized === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : statusNormalized === "accepted"
                          ? "bg-green-100 text-green-800"
                          : statusNormalized === "rejected"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {statusNormalized.charAt(0).toUpperCase() + statusNormalized.slice(1)}
                    </span>
                  </div>
                  <div className="space-y-2 mb-4">
                    <p className="text-gray-700">
                      <span className="font-semibold">From:</span> {request.requesterName} ({request.requesterEmail})
                    </p>
                    <p className="text-gray-700">
                      <span className="font-semibold">Offering:</span> {request.offeredSkillTitle}
                    </p>
                    {/* Arrow link to offered skill */}
                    <div className="flex items-center gap-2 mt-2">
                      {request.offeredSkillId && (
                        <a
                          href={`/skills/${request.offeredSkillId}`}
                          className="text-black hover:text-blue-800 transition text-lg"
                          aria-label="Go to offered skill"
                        >
                          ➔
                        </a>
                      )}
                    </div>
                    {request.message && (
                      <div className="mt-3 p-3 bg-gray-50 rounded">
                        <p className="text-sm font-semibold text-gray-700 mb-1">Message:</p>
                        <p className="text-gray-800">{request.message}</p>
                      </div>
                    )}
                  </div>

                  {/* Show Accept/Reject buttons for pending requests */}
                  {statusNormalized === "pending" && (
                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={() => handleUpdateStatus(request.id, "accepted")}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-black font-semibold py-2 px-4 rounded transition-colors"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(request.id, "rejected")}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-black font-semibold py-2 px-4 rounded transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  )}

                  {/* Show accepted message */}
                  {statusNormalized === "accepted" && (
                    <div className="mt-4 p-3 bg-green-50 rounded border border-green-200">
                      <p className="text-sm text-green-800">
                        ✓ You accepted this request. You can now contact {request.requesterName} at {request.requesterEmail}
                      </p>
                    </div>
                  )}

                  {/* Show rejected message */}
                  {statusNormalized === "rejected" && (
                    <div className="mt-4 p-3 bg-red-50 rounded border border-red-200">
                      <p className="text-sm text-red-800">
                        ✗ You rejected this request
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