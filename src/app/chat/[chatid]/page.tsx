"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { db } from "../../../lib/firebase/firebaseConfig";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  setDoc,
  doc,
  where,
  getDocs
} from "firebase/firestore";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTrackUserActivity } from "@/hooks/useTrackUserActivity";
import { useAllUsers } from "@/hooks/useAllUsers";
import { useActiveUsers } from "@/hooks/useActiveUsers";
import MessageBubble from "../../../components/chat/MessageBubble";
import { useSearchParams } from 'next/navigation';

export default function ChatPage() {
  const router = useRouter();
  const user = useCurrentUser();
  const { allUsers, error: usersError } = useAllUsers();
  const activeUsers = useActiveUsers();
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [showUserList, setShowUserList] = useState(true);
  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const messagesEndRef = useRef(null);
  const searchParams = useSearchParams();
  const initialUserId = searchParams.get('user');

  useTrackUserActivity(60000);

  useEffect(() => {
    if (initialUserId && allUsers.length > 0 && user) {
      const targetUser = allUsers.find(u => u.uid === initialUserId);
      if (targetUser) {
        selectUser(targetUser);
      }
    }
  }, [initialUserId, allUsers, user]);

  // Fetch all conversations for the current user
  useEffect(() => {
    if (!user) return;

    const fetchConversations = async () => {
      try {
        const chatsSnapshot = await getDocs(collection(db, "privateChats"));
        const userChats = [];

        for (const chatDoc of chatsSnapshot.docs) {
          const chatData = chatDoc.data();
          if (chatData.participants?.includes(user.uid)) {
            const chatId = chatDoc.id;
            const otherUserId = chatData.participants.find(id => id !== user.uid);

            const unreadQuery = query(
              collection(db, "messages"),
              where("receiverId", "==", user.uid),
              where("senderId", "==", otherUserId),
              where("read", "==", false)
            );
            const unreadSnapshot = await getDocs(unreadQuery);
            const unreadCount = unreadSnapshot.size;

            userChats.push({
              chatId,
              otherUserId,
              lastMessage: chatData.lastMessage || "",
              lastUpdated: chatData.lastUpdated?.toDate() || new Date(0),
              unreadCount
            });
          }
        }

        userChats.sort((a, b) => b.lastUpdated - a.lastUpdated);
        setConversations(userChats);

        const counts = {};
        userChats.forEach(chat => {
          counts[chat.otherUserId] = chat.unreadCount;
        });
        setUnreadCounts(counts);
      } catch (error) {
        console.error("Error fetching conversations:", error);
      }
    };

    fetchConversations();

    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const isUserOnline = (userId) => {
    return activeUsers.some(u => u.uid === userId);
  };

  const getUserById = (userId) => {
    return allUsers.find(u => u.uid === userId);
  };

  const usersWithConversations = conversations
    .map(conv => getUserById(conv.otherUserId))
    .filter(Boolean);

  const usersWithoutConversations = allUsers
    .filter(u => u.uid !== user?.uid)
    .filter(u => !conversations.some(conv => conv.otherUserId === u.uid));

  const filterUsers = (users) => {
    if (!search.trim()) return users;
    return users.filter(u => {
      const name = (u.displayName || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      return name.includes(search.toLowerCase()) || email.includes(search.toLowerCase());
    });
  };

  const filteredUsersWithConv = filterUsers(usersWithConversations);
  const filteredUsersWithoutConv = filterUsers(usersWithoutConversations);

  const selectUser = async (targetUser) => {
    setSelectedUser(targetUser);
    setShowUserList(false);
    const chatId = [user.uid, targetUser.uid].sort().join("_");

    try {
      const unreadQuery = query(
        collection(db, "messages"),
        where("receiverId", "==", user.uid),
        where("senderId", "==", targetUser.uid),
        where("read", "==", false)
      );
      const unreadSnapshot = await getDocs(unreadQuery);

      const updatePromises = unreadSnapshot.docs.map(msgDoc => 
        setDoc(doc(db, "messages", msgDoc.id), { read: true }, { merge: true })
      );
      await Promise.all(updatePromises);

      setUnreadCounts(prev => ({ ...prev, [targetUser.uid]: 0 }));
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }

    await setDoc(
      doc(db, "privateChats", chatId),
      {
        participants: [user.uid, targetUser.uid],
        participantNames: {
          [user.uid]: user.displayName || user.email,
          [targetUser.uid]: targetUser.displayName || targetUser.email
        },
        lastUpdated: serverTimestamp(),
      },
      { merge: true }
    );

    const q = query(
      collection(db, "privateChats", chatId, "messages"),
      orderBy("timestamp")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!user || !input.trim() || !selectedUser) return;
    const chatId = [user.uid, selectedUser.uid].sort().join("_");
    try {
      await addDoc(collection(db, "privateChats", chatId, "messages"), {
        senderId: user.uid,
        senderName: user.displayName || "Anonymous",
        content: input,
        timestamp: serverTimestamp(),
      });
      await addDoc(collection(db, "messages"), {
        senderId: user.uid,
        senderName: user.displayName || "Anonymous",
        receiverId: selectedUser.uid,
        content: input,
        conversationId: chatId,
        timestamp: serverTimestamp(),
        read: false,
      });
      await addDoc(collection(db, "notifications"), {
        userId: selectedUser.uid,
        type: "chat",
        title: "New Message",
        message: `${user.displayName || "Someone"} sent you a message: "${input.substring(0, 50)}${input.length > 50 ? '...' : ''}"`,
        chatId,
        senderId: user.uid,
        senderName: user.displayName || user.email || "Anonymous",
        senderEmail: user.email,
        timestamp: serverTimestamp(),
        read: false,
        actions: ["View"]
      });
      await setDoc(
        doc(db, "privateChats", chatId),
        {
          lastMessage: input,
          lastUpdated: serverTimestamp(),
        },
        { merge: true }
      );
      setInput("");
    } catch (error) {
      console.error("❌ Error sending message:", error);
    }
  }

  if (!user) return null;

  const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-white px-4 py-4 shadow flex items-center justify-between">
        <div className="flex items-center gap-3">
          {selectedUser && (
            <button
              onClick={() => {
                setSelectedUser(null);
                setShowUserList(true);
                setMessages([]);
              }}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              ← Back
            </button>
          )}
          <div>
            <h1 className="text-xl font-bold text-blue-900">
              {selectedUser 
                ? `Chat with ${selectedUser.displayName || selectedUser.email}` 
                : "Messages"}
            </h1>
            {selectedUser && (
              <div className="flex items-center gap-2 mt-1">
                <span className={`w-2 h-2 rounded-full ${
                  isUserOnline(selectedUser.uid) ? 'bg-green-500' : 'bg-gray-400'
                }`}></span>
                <span className="text-sm text-black">
                  {isUserOnline(selectedUser.uid) ? 'Online' : 'Offline'}
                </span>
              </div>
            )}
          </div>
        </div>
        {totalUnread > 0 && !selectedUser && (
          <div className="bg-blue-600 text-black px-3 py-1 rounded-full text-sm font-semibold">
            {totalUnread} unread
          </div>
        )}
      </header>
      
      <div className="flex-1 overflow-hidden flex">
        {/* Sidebar: Searchable user list */}
        {showUserList && (
          <div className="w-80 bg-white border-r shadow-sm overflow-y-auto">
            <div className="p-4">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="border px-3 py-2 rounded-lg w-full mb-4 focus:outline-none focus:border-blue-500"
                placeholder="Search users..."
              />
              
              {usersError && <div className="text-red-500 mb-3">{usersError}</div>}
              
              {/* Users with conversations (sorted by recent) */}
              {filteredUsersWithConv.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs font-semibold text-gray-500 mb-2 uppercase">Recent Chats</div>
                  <ul className="flex flex-col gap-1">
                    {filteredUsersWithConv.map(u => {
                      const conv = conversations.find(c => c.otherUserId === u.uid);
                      const unreadCount = unreadCounts[u.uid] || 0;
                      
                      return (
                        <li
                          key={u.uid}
                          onClick={() => selectUser(u)}
                          className={`px-3 py-3 rounded-lg cursor-pointer transition-all ${
                            selectedUser?.uid === u.uid
                              ? "bg-blue-500 text-white"
                              : unreadCount > 0
                              ? "bg-blue-50 hover:bg-blue-100"
                              : "hover:bg-gray-100"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className={`font-medium truncate text-black ${unreadCount > 0 && selectedUser?.uid !== u.uid ? 'font-bold' : ''}`}>
                                {u.displayName || "Anonymous"}
                              </div>
                              <div className={`text-sm truncate ${
                                selectedUser?.uid === u.uid ? "text-blue-100" : "text-gray-500"
                              }`}>
                                {conv?.lastMessage || u.email}
                              </div>
                            </div>
                            {unreadCount > 0 && (
                              <div className="bg-green-500 text-black rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold ml-2 flex-shrink-0">
                                {unreadCount}
                              </div>
                            )}
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 self-center ml-2 ${
                              isUserOnline(u.uid) ? "bg-green-500" : "bg-gray-400"
                            }`}></span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              
              {/* Users without conversations */}
              {filteredUsersWithoutConv.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 mb-2 uppercase">All Users</div>
                  <ul className="flex flex-col gap-1">
                    {filteredUsersWithoutConv.map(u => (
                      <li
                        key={u.uid}
                        onClick={() => selectUser(u)}
                        className={`px-3 py-3 rounded-lg cursor-pointer transition-all ${
                          selectedUser?.uid === u.uid
                            ? "bg-blue-500 text-black"
                            : "hover:bg-gray-100"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate text-black">{u.displayName || "Anonymous"}</div>
                            <div className={`text-sm truncate ${
                              selectedUser?.uid === u.uid ? "text-black" : "text-black"
                            }`}>
                              {u.email || "No email"}
                            </div>
                          </div>
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            isUserOnline(u.uid) ? "bg-green-500" : "bg-gray-400"
                          }`}></span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {filteredUsersWithConv.length === 0 && filteredUsersWithoutConv.length === 0 && (
                <div className="text-center text-gray-400 py-8">
                  {search ? "No users found" : "No users available"}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedUser ? (
            <>
              <div className="flex-1 overflow-y-auto p-4 pb-32">
                <div className="flex flex-col gap-2 max-w-4xl mx-auto">
                  {messages.length === 0 ? (
                    <div className="text-center text-gray-500 mt-8">
                      <p className="text-lg mb-2">No messages yet</p>
                      <p className="text-sm">
                        Start the conversation with {selectedUser.displayName || selectedUser.email}!
                      </p>
                    </div>
                  ) : (
                    messages.map(msg => (
                      <MessageBubble
                        key={msg.id}
                        content={msg.content}
                        isSender={msg.senderId === user.uid}
                        timestamp={
                          msg.timestamp?.toDate?.()?.toLocaleTimeString?.([], {
                            hour: "2-digit", minute: "2-digit"
                          })
                        }
                        senderName={msg.senderName}
                      />
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>
              
              {/* Input Area */}
              <form
                onSubmit={e => {
                  e.preventDefault();
                  sendMessage();
                }}
                className="bg-white border-t p-4"
              >
                <div className="max-w-4xl mx-auto flex items-center gap-2">
                  <input
                    type="text"
                    className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                    placeholder={`Message ${selectedUser.displayName || selectedUser.email}...`}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    required
                  />
                  <button
                    type="submit"
                    className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-2 rounded-lg transition-all"
                  >
                    Send
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                <p className="text-lg">Select a user to start chatting</p>
                {totalUnread > 0 && (
                  <p className="text-sm text-blue-600 mt-2">You have {totalUnread} unread message{totalUnread > 1 ? 's' : ''}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
