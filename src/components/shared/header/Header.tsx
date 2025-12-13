"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Bell, Menu, X, Phone, PhoneOff, Video } from "lucide-react";
import {
  useNotifications,
  Notification,
} from "../../../hooks/useNotifications";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../../../lib/firebase/firebaseConfig";
import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  serverTimestamp,
  collection,
  query as fsQuery,
  where,
  onSnapshot as fsOnSnapshot,
} from "firebase/firestore";
import NotificationList from "./NotificationList";
import { useTrackUserActivity } from "@/hooks/useTrackUserActivity";

interface HeaderProps {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

interface IncomingCall {
  callId: string;
  callerName: string;
  callerId: string;
  callerPhoto?: string;
  callType: "audio" | "video";
}

const Header: React.FC<HeaderProps> = ({
  mobileMenuOpen,
  setMobileMenuOpen,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const [user] = useAuthState(auth);
  const userId = user?.uid;
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useNotifications(userId);

  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);

  useTrackUserActivity(60000);

  // Helper function to check if a path is active
  const isActivePath = (path: string) => {
    if (path === "/dash-board") {
      return pathname === "/dash-board" || pathname === "/";
    }
    return pathname?.startsWith(path);
  };

  // Listen for incoming audio/video calls for this user
  useEffect(() => {
    if (!userId) return;

    const callsRef = collection(db, "calls");
    const q = fsQuery(
      callsRef,
      where("to", "==", userId),
      where("answered", "==", false),
      where("ended", "==", false)
    );

    const unsub = fsOnSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const callData = change.doc.data();

        if (change.type === "added") {
          const callType = (callData.callType || "video") as "audio" | "video";

          setIncomingCall({
            callId: change.doc.id,
            callerName: callData.fromName || "Unknown",
            callerId: callData.from,
            callerPhoto: callData.fromPhoto,
            callType,
          });
          playRingtone();
        } else if (change.type === "modified") {
          if (callData.answered || callData.ended) {
            setIncomingCall(null);
            stopRingtone();
          }
        } else if (change.type === "removed") {
          setIncomingCall(null);
          stopRingtone();
        }
      });
    });

    return () => {
      unsub();
      stopRingtone();
    };
  }, [userId]);

  const playRingtone = () => {
    if (ringtoneRef.current) {
      ringtoneRef.current.loop = true;
      ringtoneRef.current.play().catch(() => {});
    }
  };

  const stopRingtone = () => {
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
  };

  const handleAnswerCall = () => {
    if (!incomingCall || !user) return;

    stopRingtone();

    const chatId = [user.uid, incomingCall.callerId].sort().join("_");

    const url =
      `/chat/${chatId}` +
      `?user=${incomingCall.callerId}` +
      `&callId=${encodeURIComponent(incomingCall.callId)}` +
      `&callType=${incomingCall.callType}`;

    router.push(url);
    setIncomingCall(null);
  };

  const handleDeclineCall = async () => {
    if (!incomingCall) return;

    stopRingtone();

    try {
      const callRef = doc(db, "calls", incomingCall.callId);
      await updateDoc(callRef, {
        ended: true,
        declined: true,
        declinedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error declining call:", error);
    }

    setIncomingCall(null);
  };

  // Ensure user document exists
  useEffect(() => {
    async function ensureUserDocument() {
      if (!user) return;

      try {
        await setDoc(
          doc(db, "users", user.uid),
          {
            displayName:
              user.displayName || user.email?.split("@")[0] || "Anonymous",
            email: user.email || "",
            photoURL: user.photoURL || "",
            lastActive: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (error) {
        console.error("❌ Error ensuring user document:", error);
      }
    }

    ensureUserDocument();
  }, [user]);

  const dismissNotification = async (notifId: string | number) => {
    try {
      const notifRef = doc(db, "notifications", String(notifId));
      const snap = await getDoc(notifRef);
      if (snap.exists()) {
        await updateDoc(notifRef, {
          read: true,
          readAt: new Date(),
        });
        setNotifications((prev) => prev.filter((n) => n.id !== notifId));
      }
    } catch (error) {
      console.error("Error dismissing notification:", error);
    }
  };

  const handleNotificationAction = async (
    notifId: string | number,
    action: string,
    notif: Notification
  ) => {
    await dismissNotification(notifId);

    if (notif.type === "swap_request" && action === "View") {
      router.push("/swap-requests");
      setNotificationsOpen(false);
      return;
    }

    if (notif.type === "ping" && action === "View") {
      router.push("/swap-requests");
      setNotificationsOpen(false);
      return;
    }

    if (
      (notif.type === "requestAccepted" || notif.type === "requestRejected") &&
      action === "View"
    ) {
      router.push("/my-requests");
      setNotificationsOpen(false);
      return;
    }

    if (notif.type === "video_call" && action === "Answer") {
      if (!user) {
        alert("You must be logged in to answer the call.");
        return;
      }
      if (!notif.senderId) {
        alert("Missing caller information for this call.");
        return;
      }

      const chatId = [user.uid, notif.senderId].sort().join("_");
      const url =
        `/chat/${chatId}` +
        `?user=${notif.senderId}` +
        `&callId=${encodeURIComponent(notif.callId || "")}` +
        `&callType=video`;

      router.push(url);
      setNotificationsOpen(false);
      return;
    }

    if (
      (notif.type === "chat" || notif.type === "message") &&
      action === "View"
    ) {
      if (notif.chatId) {
        router.push(`/chat/${notif.chatId}`);
      } else if (notif.senderId && notif.senderName) {
        const userInfo = encodeURIComponent(
          JSON.stringify({
            uid: notif.senderId,
            displayName: notif.senderName,
            email: notif.senderEmail || "",
          })
        );
        router.push(`/chat?selectUser=${userInfo}`);
      } else {
        alert("Unable to open chat. Missing chat information.");
      }
      setNotificationsOpen(false);
      return;
    }

    if (action === "Open" || action === "View") {
      setNotificationsOpen(false);
    }
  };

  const isAudio = incomingCall?.callType === "audio";

  return (
    <>
      {/* Ringtone Audio */}
      <audio ref={ringtoneRef} src="/sounds/incoming-call.mp3" />

      {/* Incoming Call Full Screen Overlay */}
      {incomingCall && (
        <div className="fixed inset-0 bg-gradient-to-b from-blue-600 to-blue-800 z-[9999] flex flex-col items-center justify-center animate-pulse-slow">
          <div className="text-center px-4">
            {/* Caller Photo/Avatar */}
            <div className="mb-6">
              {incomingCall.callerPhoto ? (
                <img
                  src={incomingCall.callerPhoto}
                  alt={incomingCall.callerName}
                  className="w-32 h-32 rounded-full mx-auto border-4 border-white shadow-2xl object-cover"
                />
              ) : (
                <div className="w-32 h-32 rounded-full mx-auto border-4 border-white shadow-2xl bg-white flex items-center justify-center">
                  <span className="text-5xl font-bold text-blue-600">
                    {incomingCall.callerName[0]?.toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Caller Name */}
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2">
              {incomingCall.callerName}
            </h2>

            {/* Call Status */}
            <p className="text-xl text-blue-100 mb-2">
              {isAudio ? "Incoming audio call..." : "Incoming video call..."}
            </p>

            {/* Animated Icon */}
            <div className="relative w-20 h-20 mx-auto mb-12">
              <div className="absolute inset-0 rounded-full bg-white opacity-20 animate-ping" />
              <div className="absolute inset-0 rounded-full bg-white opacity-40 animate-pulse" />
              {isAudio ? (
                <Phone className="absolute inset-0 m-auto w-10 h-10 text-white" />
              ) : (
                <Video className="absolute inset-0 m-auto w-10 h-10 text-white" />
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-8 justify-center items-center mt-8">
              {/* Decline */}
              <button
                onClick={handleDeclineCall}
                className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-2xl transition-transform hover:scale-110 active:scale-95"
                aria-label="Decline call"
              >
                <PhoneOff className="w-10 h-10 text-white" />
              </button>

              {/* Answer */}
              <button
                onClick={handleAnswerCall}
                className="w-20 h-20 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center shadow-2xl transition-transform hover:scale-110 active:scale-95 animate-bounce"
                aria-label="Answer call"
              >
                <Phone className="w-10 h-10 text-white" />
              </button>
            </div>

            <div className="flex gap-8 justify-center items-center mt-4">
              <span className="text-white font-semibold w-20 text-center">
                Decline
              </span>
              <span className="text-white font-semibold w-20 text-center">
                Answer
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Header Component */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo Section */}
            <div className="flex items-center gap-2">
              <a href="/dash-board">
                <img
                  src="https://i.ibb.co/FkBjK1WD/logo-removebg-preview.png"
                  alt="Company Logo"
                  className="w-20 h-10 sm:w-25 sm:h-10"
                />
              </a>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-8">
              <a
                href="/dash-board"
                className={`relative text-gray-700 hover:text-gray-900 font-medium pb-1 transition-colors ${
                  isActivePath("/dash-board") ? "text-cyan-500" : ""
                }`}
              >
                Home
                {isActivePath("/dash-board") && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500"></span>
                )}
              </a>
              <a
                href="/profile?section=skills"
                className={`relative text-gray-700 hover:text-gray-900 font-medium pb-1 transition-colors ${
                  isActivePath("/profile") ? "text-cyan-500" : ""
                }`}
              >
                My Skills
                {isActivePath("/profile") && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500"></span>
                )}
              </a>
              <a
                href="/my-requests"
                className={`relative text-gray-700 hover:text-gray-900 font-medium pb-1 transition-colors ${
                  isActivePath("/my-requests") ? "text-cyan-500" : ""
                }`}
              >
                Learn
                {isActivePath("/my-requests") && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500"></span>
                )}
              </a>
              <a
                href="/swap-requests"
                className={`relative text-gray-700 hover:text-gray-900 font-medium pb-1 transition-colors ${
                  isActivePath("/swap-requests") ? "text-cyan-500" : ""
                }`}
              >
                Teach
                {isActivePath("/swap-requests") && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500"></span>
                )}
              </a>
            </nav>

            <div className="flex items-center gap-2 sm:gap-4">
              {/* Notifications Dropdown */}
              <div className="relative">
                <button
                  className="p-2 hover:bg-gray-100 rounded-lg relative"
                  onClick={() => setNotificationsOpen((v) => !v)}
                  aria-label="Show notifications"
                >
                  <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full px-2 text-xs">
                      {notifications.length}
                    </span>
                  )}
                </button>
                {notificationsOpen && (
                  <NotificationList
                    notifications={notifications}
                    onClose={() => setNotificationsOpen(false)}
                    onActionClick={handleNotificationAction}
                    onDismiss={dismissNotification}
                    onClearAll={async () => {
                      await Promise.all(
                        notifications.map((n) => dismissNotification(n.id))
                      );
                    }}
                  />
                )}
              </div>

              {/* Profile Image Button */}
              <button
                onClick={() => router.push("/profile")}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-200 overflow-hidden border-2 border-orange-400 hover:ring-2 hover:ring-orange-400 transition flex items-center justify-center"
                aria-label="Go to Profile"
                title="Profile"
                type="button"
              >
                {user && user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || "Profile"}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <span className="w-full h-full flex items-center justify-center text-lg font-bold text-gray-700">
                    {user?.displayName
                      ? user.displayName[0].toUpperCase()
                      : "?"}
                  </span>
                )}
              </button>

              {/* Mobile Menu Button */}
              <button
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5 text-gray-600" />
                ) : (
                  <Menu className="w-5 h-5 text-gray-600" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <nav className="lg:hidden flex flex-col gap-4 mt-4 pb-4 border-t border-gray-200 pt-4">
              <a
                href="/dash-board"
                className={`relative inline-block text-gray-700 hover:text-gray-900 font-medium pb-1 ${
                  isActivePath("/dash-board") ? "text-cyan-500" : ""
                }`}
              >
                Home
                {isActivePath("/dash-board") && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-cyan-500"></span>
                )}
              </a>
              <a
                href="/profile?section=skills"
                className={`relative inline-block text-gray-700 hover:text-gray-900 font-medium pb-1 ${
                  isActivePath("/profile") ? "text-cyan-500" : ""
                }`}
              >
                My Skills
                {isActivePath("/profile") && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-cyan-500"></span>
                )}
              </a>
              <a
                href="/my-requests"
                className={`relative inline-block text-gray-700 hover:text-gray-900 font-medium pb-1 ${
                  isActivePath("/my-requests") ? "text-cyan-500" : ""
                }`}
              >
                Learn
                {isActivePath("/my-requests") && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-cyan-500"></span>
                )}
              </a>
              <a
                href="/swap-requests"
                className={`relative inline-block text-gray-700 hover:text-gray-900 font-medium pb-1 ${
                  isActivePath("/swap-requests") ? "text-cyan-500" : ""
                }`}
              >
                Teach
                {isActivePath("/swap-requests") && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-cyan-500"></span>
                )}
              </a>
            </nav>
          )}
        </div>
      </header>

      <style jsx>{`
        @keyframes pulse-slow {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.95;
          }
        }
        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }
      `}</style>
    </>
  );
};

export default Header;