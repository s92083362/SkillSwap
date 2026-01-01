"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  setDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseConfig";
import dynamic from "next/dynamic";

// Hooks
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useTrackUserActivity } from "@/hooks/users/useTrackUserActivity";
import { useAllUsers } from "@/hooks/users/useAllUsers";
import { useActiveUsers } from "@/hooks/users/useActiveUsers";
import { useConversations } from "@/hooks/chat/useConversations";
import { useIncomingCalls } from "@/hooks/chat/useIncomingCalls";

// Components - Eager load only critical components
import ChatHeader from "@/components/chat/ChatHeader";
import UserList from "@/components/chat/UserList";
import MessageInput from "@/components/chat/messages/MessageInput";
import MessageBubble from "@/components/chat/messages/MessageBubble";

// Lazy load heavy/conditional components
const FileUploadPreview = dynamic(() => import("@/components/chat/messages/FileUploadPreview"), {
  loading: () => <div className="h-24 bg-gray-100 animate-pulse" />,
  ssr: false,
});

const IncomingCallOverlay = dynamic(() => import("@/components/chat/calls/IncomingCallOverlay"), {
  loading: () => null,
  ssr: false,
});

const VideoCall = dynamic(() => import("@/components/chat/calls/VideoCall"), {
  loading: () => <div className="fixed inset-0 bg-black flex items-center justify-center"><div className="text-white">Loading video call...</div></div>,
  ssr: false,
});

const AudioCall = dynamic(() => import("@/components/chat/calls/AudioCall"), {
  loading: () => <div className="fixed inset-0 bg-black flex items-center justify-center"><div className="text-white">Loading audio call...</div></div>,
  ssr: false,
});

// Utils
import {
  createChatId,
  isUserOnline as checkUserOnline,
} from "@/utils/chat/chatUtils";
import {
  sendTextMessage,
  sendFileMessage,
  markMessagesAsRead,
} from "@/utils/chat/messageUtils";

// Types
import type {
  ChatUser,
  ChatMessage,
  ActiveCallState,
} from "@/utils/types/chat.types";

export default function ChatPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialUserId = searchParams.get("user");
  const autoAnswerCallId = searchParams.get("callId");
  const urlCallType = searchParams.get("callType");

  // Current user
  const { user, loading: userLoading } = useCurrentUser() as {
    user: ChatUser | null;
    loading: boolean;
  };

  // All users
  const {
    allUsers,
    error: usersError,
    loading: isLoadingUsers,
  } = useAllUsers() as {
    allUsers: ChatUser[];
    error: string | null;
    loading: boolean;
  };

  // Active users
  const activeUsers = useActiveUsers() as ChatUser[];

  // Conversations
  const {
    conversations,
    unreadCounts,
    setUnreadCounts,
    loading: isLoadingConversations,
  } = useConversations(user?.uid);

  // Incoming calls
  const { incomingCall, ringtoneRef, handleDeclineIncomingCall } =
    useIncomingCalls(user?.uid, pathname, allUsers);

  // Presence tracking
  useTrackUserActivity(60000);

  useEffect(() => {
    const prevTitle = document.title;
    document.title = "SkillSwap | Chat";
    return () => {
      document.title = prevTitle;
    };
  }, []);

  // Local UI state
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>("");
  const [showUserList, setShowUserList] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileCaption, setFileCaption] = useState<string>("");
  const [activeCall, setActiveCall] = useState<ActiveCallState>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const attachMenuRef = useRef<HTMLDivElement | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Close attach menu on outside click - memoized
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        attachMenuRef.current &&
        !attachMenuRef.current.contains(event.target as Node)
      ) {
        setShowAttachMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Memoized online check
  const isUserOnlineCheck = useCallback(
    (userId: string) => checkUserOnline(userId, activeUsers),
    [activeUsers]
  );

  // Optimized selectUser with cleanup
  const selectUser = useCallback(
    async (targetUser: ChatUser) => {
      if (!user) return;

      // Cleanup previous subscription
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }

      setSelectedUser(targetUser);
      setShowUserList(false);
      setMessages([]); // Clear messages immediately for better UX
      
      const chatId = createChatId(user.uid, targetUser.uid);

      try {
        // Mark as read and update unread counts
        await markMessagesAsRead(user.uid, targetUser.uid);
        setUnreadCounts((prev) => ({ ...prev, [targetUser.uid]: 0 }));

        // Update chat metadata
        await setDoc(
          doc(db, "privateChats", chatId),
          {
            participants: [user.uid, targetUser.uid],
            participantNames: {
              [user.uid]: user.displayName || user.email,
              [targetUser.uid]: targetUser.displayName || targetUser.email,
            },
            lastUpdated: serverTimestamp(),
          },
          { merge: true }
        );

        // Subscribe to messages
        const q = query(
          collection(db, "privateChats", chatId, "messages"),
          orderBy("timestamp")
        );
        
        const unsub = onSnapshot(q, (snapshot) => {
          setMessages(
            snapshot.docs.map(
              (d) =>
                ({
                  id: d.id,
                  ...(d.data() as Omit<ChatMessage, "id">),
                } as ChatMessage)
            )
          );
        });

        unsubscribeRef.current = unsub;
      } catch (error) {
        console.error("Error selecting user:", error);
      }
    },
    [user, setUnreadCounts]
  );

  // Auto-select user from URL + auto-answer
  useEffect(() => {
    if (!initialUserId || !user || allUsers.length === 0) return;

    const targetUser = allUsers.find((u) => u.uid === initialUserId);
    if (!targetUser) return;

    void selectUser(targetUser);

    if (autoAnswerCallId) {
      const typeFromUrl =
        urlCallType === "audio" || urlCallType === "video"
          ? urlCallType
          : "video";
      setActiveCall({ type: typeFromUrl, autoAnswer: true });
      const newUrl = window.location.pathname;
      window.history.replaceState({}, "", newUrl);
    }
  }, [initialUserId, autoAnswerCallId, urlCallType, allUsers, user, selectUser]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  // Optimized auto-scroll with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [messages.length]); // Only trigger on message count change

  // Memoized callbacks
  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
    setShowAttachMenu(false);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  }, []);

  const cancelFileUpload = useCallback(() => {
    setSelectedFile(null);
    setFilePreview(null);
    setFileCaption("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const startVideoCall = useCallback(() => {
    setActiveCall({ type: "video", autoAnswer: false });
  }, []);

  const startAudioCall = useCallback(() => {
    setActiveCall({ type: "audio", autoAnswer: false });
  }, []);

  const closeCall = useCallback(() => {
    setActiveCall(null);
  }, []);

  // Optimized message sending with debouncing
  const handleSendMessage = useCallback(async () => {
    if (!user || !input.trim() || !selectedUser) return;
    const chatId = createChatId(user.uid, selectedUser.uid);
    const text = input.trim();

    // Clear input immediately for better UX
    setInput("");

    try {
      await sendTextMessage(user as ChatUser, selectedUser, text, chatId);

      // Send email notification asynchronously without blocking
      if (selectedUser.email) {
        fetch("/api/send-chat-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: selectedUser.email,
            fromName: user.displayName || user.email || "SkillSwap user",
            previewText: text.length > 120 ? text.slice(0, 117) + "..." : text,
            chatId,
            otherUserId: selectedUser.uid,
          }),
        }).catch((err) => console.error("chat email error:", err));
      }
    } catch (error) {
      console.error("Error sending message:", error);
      // Restore input on error
      setInput(text);
    }
  }, [user, input, selectedUser]);

  const handleSendFileMessage = useCallback(async () => {
    if (!user || !selectedUser || !selectedFile) return;
    const chatId = createChatId(user.uid, selectedUser.uid);

    try {
      setUploading(true);
      setUploadError(null);
      await sendFileMessage(
        user as ChatUser,
        selectedUser,
        selectedFile,
        fileCaption,
        chatId
      );

      if (selectedUser.email) {
        fetch("/api/send-chat-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: selectedUser.email,
            fromName: user.displayName || user.email || "SkillSwap user",
            previewText:
              fileCaption ||
              "You received a new file in SkillSwap chat. Log in to view it.",
            chatId,
            otherUserId: selectedUser.uid,
          }),
        }).catch((err) => console.error("chat file email error:", err));
      }

      cancelFileUpload();
    } catch (error) {
      console.error("Error sending file:", error);
      setUploadError(
        error instanceof Error ? error.message : "Failed to upload file"
      );
      setTimeout(() => setUploadError(null), 5000);
    } finally {
      setUploading(false);
    }
  }, [user, selectedUser, selectedFile, fileCaption, cancelFileUpload]);

  const handleAnswerIncomingCall = useCallback(() => {
    if (!incomingCall || !user) return;
    const chatId = createChatId(user.uid, incomingCall.callerId);
    const url =
      `/chat/${chatId}` +
      `?user=${incomingCall.callerId}` +
      `&callId=${encodeURIComponent(incomingCall.callId)}` +
      `&callType=${incomingCall.callType}`;
    router.push(url);
  }, [incomingCall, user, router]);

  const handleBackToUserList = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    setSelectedUser(null);
    setShowUserList(true);
    setMessages([]);
  }, []);

  // Memoize total unread count
  const totalUnread = useMemo(
    () => Object.values(unreadCounts).reduce((sum, count) => sum + count, 0),
    [unreadCounts]
  );

  // Combined loading for whole page
  const actuallyLoading =
    userLoading || !user || isLoadingUsers || isLoadingConversations;

  if (actuallyLoading) {
    return (
      <main className="flex items-center justify-center h-screen bg-gray-50">
        <div className="h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (!user) return null;

  return (
    <main className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      <audio ref={ringtoneRef} src="/sounds/incoming-call.mp3" preload="none" />

      {incomingCall && (
        <Suspense fallback={null}>
          <IncomingCallOverlay
            incomingCall={incomingCall}
            onAnswer={handleAnswerIncomingCall}
            onDecline={handleDeclineIncomingCall}
          />
        </Suspense>
      )}

      {activeCall?.type === "video" && selectedUser && (
        <Suspense fallback={<div className="fixed inset-0 bg-black flex items-center justify-center"><div className="text-white">Loading video call...</div></div>}>
          <VideoCall
            currentUserId={user.uid}
            currentUserName={user.displayName || user.email || "Anonymous"}
            otherUserId={selectedUser.uid}
            otherUserName={
              selectedUser.displayName || selectedUser.email || "Unknown"
            }
            onClose={closeCall}
            autoAnswer={activeCall.autoAnswer}
          />
        </Suspense>
      )}

      {activeCall?.type === "audio" && selectedUser && (
        <Suspense fallback={<div className="fixed inset-0 bg-black flex items-center justify-center"><div className="text-white">Loading audio call...</div></div>}>
          <AudioCall
            currentUserId={user.uid}
            currentUserName={user.displayName || user.email || "Anonymous"}
            otherUserId={selectedUser.uid}
            otherUserName={
              selectedUser.displayName || selectedUser.email || "Unknown"
            }
            onClose={closeCall}
            autoAnswer={activeCall.autoAnswer}
          />
        </Suspense>
      )}

      <ChatHeader
        selectedUser={selectedUser}
        totalUnread={totalUnread}
        isUserOnline={
          selectedUser ? isUserOnlineCheck(selectedUser.uid) : false
        }
        onBack={handleBackToUserList}
        onStartAudioCall={startAudioCall}
        onStartVideoCall={startVideoCall}
      />

      {uploadError && (
        <div className="fixed top-16 sm:top-20 right-2 sm:right-4 bg-red-500 text-white px-3 sm:px-4 py-2 sm:py-3 rounded-lg shadow-lg z-50 max-w-[calc(100vw-1rem)] sm:max-w-sm">
          <div className="flex items-start gap-2">
            <span className="text-lg sm:text-xl flex-shrink-0">⚠️</span>
            <div className="min-w-0">
              <p className="font-semibold text-sm sm:text-base">
                Upload Failed
              </p>
              <p className="text-xs sm:text-sm break-words">{uploadError}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <UserList
          conversations={conversations}
          unreadCounts={unreadCounts}
          allUsers={allUsers}
          selectedUser={selectedUser}
          search={search}
          onSearchChange={setSearch}
          onSelectUser={selectUser}
          usersError={usersError}
          isUserOnline={isUserOnlineCheck}
          currentUserId={user.uid}
          isLoadingUsers={isLoadingUsers}
        />

        <div
          className={`${
            selectedUser ? "flex" : "hidden md:flex"
          } flex-1 flex-col min-w-0`}
        >
          {selectedUser ? (
            <>
              <div className="flex-1 overflow-y-auto p-2 sm:p-4">
                <div className="flex flex-col gap-2 max-w-4xl mx-auto">
                  {messages.length === 0 ? (
                    <div className="text-center text-gray-500 mt-8 px-4">
                      <p className="text-base sm:text-lg mb-2">
                        No messages yet
                      </p>
                      <p className="text-xs sm:text-sm">
                        Start the conversation with{" "}
                        {selectedUser.displayName || selectedUser.email}!
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <MessageBubble
                        key={msg.id}
                        content={msg.content}
                        isSender={msg.senderId === user.uid}
                        timestamp={msg.timestamp
                          ?.toDate?.()
                          ?.toLocaleTimeString?.([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        senderName={msg.senderName}
                        type={msg.type}
                        fileUrl={msg.fileUrl}
                        fileName={msg.fileName}
                      />
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {selectedFile && (
                <Suspense fallback={<div className="h-24 bg-gray-100 animate-pulse" />}>
                  <FileUploadPreview
                    selectedFile={selectedFile}
                    filePreview={filePreview}
                    fileCaption={fileCaption}
                    uploading={uploading}
                    onCaptionChange={setFileCaption}
                    onSend={handleSendFileMessage}
                    onCancel={cancelFileUpload}
                  />
                </Suspense>
              )}

              <MessageInput
                input={input}
                uploading={uploading}
                selectedFile={selectedFile}
                selectedUser={selectedUser}
                showAttachMenu={showAttachMenu}
                attachMenuRef={
                  attachMenuRef as React.RefObject<HTMLDivElement>
                }
                fileInputRef={
                  fileInputRef as React.RefObject<HTMLInputElement>
                }
                onInputChange={setInput}
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSendMessage();
                }}
                onToggleAttachMenu={() =>
                  setShowAttachMenu((prev) => !prev)
                }
                onFileSelect={handleFileSelect}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 p-4">
              <div className="text-center">
                <svg
                  className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                <p className="text-base sm:text-lg">
                  Select a user to start chatting
                </p>
                {totalUnread > 0 && (
                  <p className="text-xs sm:text-sm text-blue-600 mt-2">
                    You have {totalUnread} unread message
                    {totalUnread > 1 ? "s" : ""}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}