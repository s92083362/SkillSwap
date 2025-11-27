"use client";
import React, { useState, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRouter } from "next/navigation";
import { collection, query, where, orderBy, onSnapshot, limit } from "firebase/firestore";
import { db, auth } from "../../lib/firebase/firebaseConfig";

// Helper to format Firestore Timestamp to "x min/hours ago"
function formatTime(timestamp) {
  if (!timestamp) return "";
  let date;
  try {
    // Firestore Timestamp object has a .toDate() method
    date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  } catch {
    date = new Date(timestamp);
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

export default function ProfileMessages() {
  const [user] = useAuthState(auth);
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setMessages([]);
      return;
    }

    // Query Firestore for messages sent to the current user (limited to 5 recent)
    const q = query(
      collection(db, "messages"),
      where("receiverId", "==", user.uid),
      orderBy("timestamp", "desc"),
      limit(5) // Only show 5 most recent messages
    );
    
    const unsub = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMessages(msgs);
      
      // Count unread messages
      const unreadCount = msgs.filter(msg => msg.read === false).length;
      setTotalUnreadCount(unreadCount);
    });
    
    return unsub;
  }, [user]);

  const handleViewAll = () => {
    router.push("/chat/[chatid]"); 
  };

  const handleMessageClick = (msg) => {
    // Navigate to chat with the sender
    if (msg.senderId) {
      const userInfo = encodeURIComponent(JSON.stringify({
        uid: msg.senderId,
        displayName: msg.senderName || "User",
        email: msg.senderEmail || ""
      }));
      router.push(`/chat?selectUser=${userInfo}`); // Uses base chat page with query params
    } else {
      router.push("/chat");
    }
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="font-bold text-xl">Recent Messages</h2>
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
      
      <ul className="space-y-3">
        {messages.length === 0 && (
          <li className="text-gray-500 text-center py-8">
            No messages yet.
          </li>
        )}
        {messages.map((msg) => (
          <li
            key={msg.id}
            onClick={() => handleMessageClick(msg)}
            className={`bg-white p-3 rounded-lg flex flex-col sm:flex-row items-start sm:items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors ${
              msg.read === false ? "border-l-4 border-blue-500" : ""
            }`}
          >
            <img
              src={
                msg.senderAvatar
                  ? msg.senderAvatar
                  : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      msg.senderName || "User"
                    )}&background=F8D5CB&color=555`
              }
              alt={msg.senderName || "User"}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className={`font-semibold text-gray-800 text-base sm:text-lg truncate ${
                msg.read === false ? "font-bold" : ""
              }`}>
                {msg.senderName || "Unknown"}
              </p>
              <p className={`text-gray-500 text-sm sm:text-base truncate ${
                msg.read === false ? "font-semibold text-gray-700" : ""
              }`}>
                {msg.content || msg.text || ""}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs text-gray-400 whitespace-nowrap">
                {formatTime(msg.timestamp)}
              </span>
              {msg.read === false && (
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              )}
            </div>
          </li>
        ))}
      </ul>
      
      {/* Show View All button again at bottom if there are messages */}
      {messages.length > 0 && (
        <div className="mt-4 text-center">
          <button
            onClick={handleViewAll}
            className="text-blue-600 hover:text-blue-800 font-semibold text-sm underline transition-colors"
          >
            View All Messages in Chat
          </button>
        </div>
      )}
      
      {/* Footer timestamp (optional) */}
      {messages.length > 0 && (
        <p className="text-right text-gray-400 text-xs mt-4">
          Last updated: {formatTime(messages[0].timestamp)}
        </p>
      )}
    </section>
  );
}