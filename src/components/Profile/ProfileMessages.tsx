"use client";
import React, { useState, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRouter } from "next/navigation";
import { collection, query, where, orderBy, onSnapshot, limit, doc, getDoc } from "firebase/firestore";
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

// Helper to get avatar URL
const getAvatarUrl = (userData) => {
  if (!userData) return null;
  return userData.photoURL || userData.photoUrl || userData.avatar || userData.profilePicture || null;
};

// Helper to get display name
const getDisplayName = (userData) => {
  if (!userData) return "Unknown User";
  return userData.displayName || userData.name || userData.username || "Unknown User";
};
 
export default function ProfileMessages() {
  const [user] = useAuthState(auth);
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
 
  useEffect(() => {
    if (!user) {
      setMessages([]);
      setLoading(false);
      return;
    }
 
    setLoading(true);
    
    // Query Firestore for messages sent to the current user (limited to 5 recent)
    const q = query(
      collection(db, "messages"),
      where("receiverId", "==", user.uid),
      orderBy("timestamp", "desc"),
      limit(5) // Only show 5 most recent messages
    );
    
    const unsub = onSnapshot(q, async (snapshot) => {
      const msgs = [];
      
      for (const docSnap of snapshot.docs) {
        const msgData = { id: docSnap.id, ...docSnap.data() };
        
        // Fetch sender profile data if senderId exists
        if (msgData.senderId) {
          try {
            const senderRef = doc(db, "users", msgData.senderId);
            const senderSnap = await getDoc(senderRef);
            
            if (senderSnap.exists()) {
              const senderData = senderSnap.data();
              
              // Override with fresh data from users collection
              msgData.senderAvatar = getAvatarUrl(senderData);
              msgData.senderName = getDisplayName(senderData);
              msgData.senderEmail = senderData.email || "";
            }
          } catch (error) {
            console.error("Error fetching sender profile:", error);
            // Keep existing data if fetch fails
            if (!msgData.senderName) msgData.senderName = "Unknown User";
          }
        } else {
          // No senderId found
          if (!msgData.senderName) msgData.senderName = "Unknown User";
        }
        
        msgs.push(msgData);
      }
      
      setMessages(msgs);
      
      // Count unread messages
      const unreadCount = msgs.filter(msg => msg.read === false).length;
      setTotalUnreadCount(unreadCount);
      setLoading(false);
    });
    
    return unsub;
  }, [user]);
 
  const handleViewAll = () => {
    router.push("/chat/messages");
  };
 
  const handleMessageClick = (msg) => {
    // Navigate to chat with the sender
    if (msg.senderId) {
      router.push(`/chat/messages?user=${msg.senderId}`);
    } else {
      router.push("/chat/messages");
    }
  };
 
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
      
      <ul className="space-y-3">
        {loading ? (
          <li className="flex justify-center items-center py-12">
            <div className="relative flex justify-center items-center">
              <div className="w-12 h-12 relative">
                <div className="absolute inset-0 flex justify-center items-center">
                  <div className="w-2.5 h-2.5 bg-blue-600 rounded-full absolute animate-pulse" style={{top: '0%', left: '50%', transform: 'translate(-50%, -50%)', animationDelay: '0s'}}></div>
                  <div className="w-2.5 h-2.5 bg-blue-600 rounded-full absolute animate-pulse" style={{top: '14.6%', left: '85.4%', transform: 'translate(-50%, -50%)', animationDelay: '0.1s'}}></div>
                  <div className="w-2.5 h-2.5 bg-blue-500 rounded-full absolute animate-pulse" style={{top: '50%', left: '100%', transform: 'translate(-50%, -50%)', animationDelay: '0.2s'}}></div>
                  <div className="w-2.5 h-2.5 bg-blue-400 rounded-full absolute animate-pulse" style={{top: '85.4%', left: '85.4%', transform: 'translate(-50%, -50%)', animationDelay: '0.3s'}}></div>
                  <div className="w-2.5 h-2.5 bg-blue-300 rounded-full absolute animate-pulse" style={{top: '100%', left: '50%', transform: 'translate(-50%, -50%)', animationDelay: '0.4s'}}></div>
                  <div className="w-2.5 h-2.5 bg-blue-200 rounded-full absolute animate-pulse" style={{top: '85.4%', left: '14.6%', transform: 'translate(-50%, -50%)', animationDelay: '0.5s'}}></div>
                  <div className="w-2.5 h-2.5 bg-blue-200 rounded-full absolute animate-pulse" style={{top: '50%', left: '0%', transform: 'translate(-50%, -50%)', animationDelay: '0.6s'}}></div>
                  <div className="w-2.5 h-2.5 bg-blue-300 rounded-full absolute animate-pulse" style={{top: '14.6%', left: '14.6%', transform: 'translate(-50%, -50%)', animationDelay: '0.7s'}}></div>
                </div>
              </div>
            </div>
          </li>
        ) : messages.length === 0 ? (
          <li className="text-gray-500 text-center py-8">
            No messages yet.
          </li>
        ) : (
          messages.map((msg) => (
          <li
            key={msg.id}
            onClick={() => handleMessageClick(msg)}
            className={`bg-white p-3 rounded-lg flex flex-col sm:flex-row items-start sm:items-center gap-3 cursor-pointer hover:bg-blue-50 hover:shadow-md transition-all duration-200 ${
              msg.read === false ? "border-l-4 border-blue-500 bg-blue-50/30" : ""
            }`}
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-blue-100 overflow-hidden flex items-center justify-center flex-shrink-0">
              {msg.senderAvatar ? (
                <img
                  src={msg.senderAvatar}
                  alt={msg.senderName || "User"}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to generated avatar if image fails to load
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = `<span class="text-sm font-semibold text-blue-700">${(msg.senderName || "?").charAt(0).toUpperCase()}</span>`;
                  }}
                />
              ) : (
                <span className="text-sm font-semibold text-blue-700">
                  {(msg.senderName || "?").charAt(0).toUpperCase()}
                </span>
              )}
            </div>
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
        ))
        )}
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