"use client";

import React, { useState, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRouter } from "next/navigation";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  limit,
  doc,
  getDoc,
  DocumentData,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase/firebaseConfig";

// Types
type FirestoreTimestamp = {
  toDate: () => Date;
};

type Message = {
  id: string;
  senderId?: string;
  senderName?: string;
  senderAvatar?: string | null;
  senderEmail?: string;
  receiverId?: string;
  content?: string;
  text?: string;
  timestamp?: FirestoreTimestamp | Date | number | null;
  read?: boolean;
  [key: string]: any;
};

type UserDoc = {
  displayName?: string;
  name?: string;
  username?: string;
  photoURL?: string;
  photoUrl?: string;
  avatar?: string;
  profilePicture?: string;
  email?: string;
};

// Helper to format Firestore Timestamp to "x min/hours ago"
function formatTime(timestamp: Message["timestamp"]): string {
  if (!timestamp) return "";
  let date: Date;
  try {
    date =
      typeof (timestamp as FirestoreTimestamp).toDate === "function"
        ? (timestamp as FirestoreTimestamp).toDate()
        : new Date(timestamp as any);
  } catch {
    date = new Date(timestamp as any);
  }
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// Helper to get avatar URL
const getAvatarUrl = (userData?: UserDoc | null): string | null => {
  if (!userData) return null;
  return (
    userData.photoURL ||
    userData.photoUrl ||
    userData.avatar ||
    userData.profilePicture ||
    null
  );
};

// Helper to get display name
const getDisplayName = (userData?: UserDoc | null): string => {
  if (!userData) return "Unknown User";
  return (
    userData.displayName ||
    userData.name ||
    userData.username ||
    "Unknown User"
  );
};

export default function ProfileMessages() {
  const [user] = useAuthState(auth as any);
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !user.uid) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Query for UNREAD messages only
    const q = query(
      collection(db, "messages"),
      where("receiverId", "==", user.uid),
      where("read", "==", false), // Only fetch unread messages
      orderBy("timestamp", "desc"),
      limit(5)
    );

    const unsub = onSnapshot(q, async (snapshot) => {
      const msgs: Message[] = [];

      for (const docSnap of snapshot.docs as QueryDocumentSnapshot<DocumentData>[]) {
        const raw = docSnap.data() as DocumentData;
        const msgData: Message = {
          id: docSnap.id,
          ...raw,
        };

        if (msgData.senderId) {
          try {
            const senderRef = doc(db, "users", msgData.senderId);
            const senderSnap = await getDoc(senderRef);

            if (senderSnap.exists()) {
              const senderData = senderSnap.data() as UserDoc;
              msgData.senderAvatar = getAvatarUrl(senderData);
              msgData.senderName = getDisplayName(senderData);
              msgData.senderEmail = senderData.email || "";
            }
          } catch (error) {
            console.error("Error fetching sender profile:", error);
            if (!msgData.senderName) msgData.senderName = "Unknown User";
          }
        } else {
          if (!msgData.senderName) msgData.senderName = "Unknown User";
        }

        msgs.push(msgData);
      }

      setMessages(msgs);
      setTotalUnreadCount(msgs.length); // All messages are unread now
      setLoading(false);
    });

    return unsub;
  }, [user]);

  const handleViewAll = () => {
    router.push("/chat/messages");
  };

  const handleMessageClick = (msg: Message) => {
    if (msg.senderId) {
      router.push(`/chat/messages?user=${msg.senderId}`);
    } else {
      router.push("/chat/messages");
    }
  };

  const handleGoToChats = () => {
    router.push("/chat/messages");
  };

  //  useEffect(() => {
  //           const prevTitle = document.title;
  //           document.title = "SkillSwap | Messages";
        
  //           return () => {
  //             document.title = prevTitle;
  //           };
  //         }, []);
  

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="font-bold text-xl text-black">Recent Messages</h2>
          {totalUnreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              {totalUnreadCount}
            </span>
          )}
        </div>
        <button
          onClick={handleViewAll}
          className="text-blue-600 hover:text-blue-800 font-semibold text-sm transition-colors"
        >
          View All →
        </button>
      </div>

      {/* Go to Chats Button - Right side below Recent Messages */}
      <div className="flex justify-end mb-4">
        <button
          onClick={handleGoToChats}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border-2 border-blue-500 text-blue-600 rounded-lg hover:bg-blue-100 hover:border-blue-600 transition-all duration-200 font-semibold text-sm"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          Go to Chats
        </button>
      </div>

      <ul className="space-y-3">
        {loading ? (
          <li className="flex justify-center items-center py-12">
            <div className="relative flex justify-center items-center">
              <div className="w-12 h-12 relative">
                <div className="absolute inset-0 flex justify-center items-center">
                  <div
                    className="w-2.5 h-2.5 bg-blue-600 rounded-full absolute animate-pulse"
                    style={{
                      top: "0%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      animationDelay: "0s",
                    }}
                  ></div>
                  <div
                    className="w-2.5 h-2.5 bg-blue-600 rounded-full absolute animate-pulse"
                    style={{
                      top: "14.6%",
                      left: "85.4%",
                      transform: "translate(-50%, -50%)",
                      animationDelay: "0.1s",
                    }}
                  ></div>
                  <div
                    className="w-2.5 h-2.5 bg-blue-500 rounded-full absolute animate-pulse"
                    style={{
                      top: "50%",
                      left: "100%",
                      transform: "translate(-50%, -50%)",
                      animationDelay: "0.2s",
                    }}
                  ></div>
                  <div
                    className="w-2.5 h-2.5 bg-blue-400 rounded-full absolute animate-pulse"
                    style={{
                      top: "85.4%",
                      left: "85.4%",
                      transform: "translate(-50%, -50%)",
                      animationDelay: "0.3s",
                    }}
                  ></div>
                  <div
                    className="w-2.5 h-2.5 bg-blue-300 rounded-full absolute animate-pulse"
                    style={{
                      top: "100%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      animationDelay: "0.4s",
                    }}
                  ></div>
                  <div
                    className="w-2.5 h-2.5 bg-blue-200 rounded-full absolute animate-pulse"
                    style={{
                      top: "85.4%",
                      left: "14.6%",
                      transform: "translate(-50%, -50%)",
                      animationDelay: "0.5s",
                    }}
                  ></div>
                  <div
                    className="w-2.5 h-2.5 bg-blue-200 rounded-full absolute animate-pulse"
                    style={{
                      top: "50%",
                      left: "0%",
                      transform: "translate(-50%, -50%)",
                      animationDelay: "0.6s",
                    }}
                  ></div>
                  <div
                    className="w-2.5 h-2.5 bg-blue-300 rounded-full absolute animate-pulse"
                    style={{
                      top: "14.6%",
                      left: "14.6%",
                      transform: "translate(-50%, -50%)",
                      animationDelay: "0.7s",
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </li>
        ) : messages.length === 0 ? (
          <li className="text-gray-500 text-center py-8">No unread messages.</li>
        ) : (
          messages.map((msg) => (
            <li
              key={msg.id}
              onClick={() => handleMessageClick(msg)}
              className="bg-white p-3 rounded-lg flex flex-col sm:flex-row items-start sm:items-center gap-3 cursor-pointer hover:bg-blue-50 hover:shadow-md transition-all duration-200 border-l-4 border-blue-500"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-blue-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                {msg.senderAvatar ? (
                  <img
                    src={msg.senderAvatar}
                    alt={msg.senderName || "User"}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.style.display = "none";
                      if (target.parentElement) {
                        target.parentElement.innerHTML = `<span class="text-sm font-semibold text-blue-700">${(
                          msg.senderName || "?"
                        )
                          .charAt(0)
                          .toUpperCase()}</span>`;
                      }
                    }}
                  />
                ) : (
                  <span className="text-sm font-semibold text-blue-700">
                    {(msg.senderName || "?").charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 text-base sm:text-lg truncate">
                  {msg.senderName || "Unknown"}
                </p>
                <p className="font-semibold text-gray-700 text-sm sm:text-base truncate">
                  {msg.content || msg.text || ""}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {formatTime(msg.timestamp)}
                </span>
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              </div>
            </li>
          ))
        )}
      </ul>

      {messages.length > 0 && (
        <>
          <div className="mt-4 text-center">
            <button
              onClick={handleViewAll}
              className="text-blue-600 hover:text-blue-800 font-semibold text-sm underline transition-colors"
            >
              View All Messages in Chat
            </button>
          </div>
          <p className="text-right text-gray-400 text-xs mt-4">
            Last updated: {formatTime(messages[0].timestamp)}
          </p>
        </>
      )}
    </section>
  );
}