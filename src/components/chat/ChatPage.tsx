"use client";

import React, { useState, useEffect, useRef } from "react";
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

// Hooks
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useTrackUserActivity } from "@/hooks/users/useTrackUserActivity";
import { useAllUsers } from "@/hooks/users/useAllUsers";
import { useActiveUsers } from "@/hooks/users/useActiveUsers";
import { useConversations } from "@/hooks/chat/useConversations";
import { useIncomingCalls } from "@/hooks/chat/useIncomingCalls";

// Components
import ChatHeader from "@/components/chat/ChatHeader";
import UserList from "@/components/chat/UserList";
import FileUploadPreview from "@/components/chat/messages/FileUploadPreview";
import IncomingCallOverlay from "@/components/chat/calls/IncomingCallOverlay";
import MessageInput from "@/components/chat/messages/MessageInput";
import MessageBubble from "@/components/chat/messages/MessageBubble";
import VideoCall from "@/components/chat/calls/VideoCall";
import AudioCall from "@/components/chat/calls/AudioCall";

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

  // Custom hooks
  const { user } = useCurrentUser();
  const { allUsers, error: usersError } = useAllUsers() as {
    allUsers: ChatUser[];
    error: string | null;
  };
  const activeUsers = useActiveUsers() as ChatUser[];
  const { conversations, unreadCounts, setUnreadCounts } = useConversations(
    user?.uid
  );
  const { incomingCall, ringtoneRef, handleDeclineIncomingCall } =
    useIncomingCalls(user?.uid, pathname, allUsers);

  useTrackUserActivity(60000);
  useEffect(() => {
    const prevTitle = document.title;
    document.title = "SkillSwap | Chat";

    return () => {
      document.title = prevTitle;
    };
  }, []);


  // Local state
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

  // Click outside attach menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        attachMenuRef.current &&
        !attachMenuRef.current.contains(event.target as Node)
      ) {
        setShowAttachMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-select user from URL + auto-answer
  useEffect(() => {
    if (autoAnswerCallId && initialUserId && allUsers.length > 0 && user) {
      const targetUser = allUsers.find((u) => u.uid === initialUserId);
      if (targetUser) {
        void selectUser(targetUser);
        const typeFromUrl =
          urlCallType === "audio" || urlCallType === "video"
            ? urlCallType
            : "video";
        setActiveCall({ type: typeFromUrl, autoAnswer: true });
        const newUrl = window.location.pathname;
        window.history.replaceState({}, "", newUrl);
      }
    } else if (initialUserId && allUsers.length > 0 && user) {
      const targetUser = allUsers.find((u) => u.uid === initialUserId);
      if (targetUser) {
        void selectUser(targetUser);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUserId, autoAnswerCallId, urlCallType, allUsers, user]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isUserOnlineCheck = (userId: string) =>
    checkUserOnline(userId, activeUsers);

  const selectUser = async (targetUser: ChatUser) => {
    if (!user) return;
    setSelectedUser(targetUser);
    setShowUserList(false);
    const chatId = createChatId(user.uid, targetUser.uid);

    try {
      await markMessagesAsRead(user.uid, targetUser.uid);
      setUnreadCounts((prev) => ({ ...prev, [targetUser.uid]: 0 }));
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }

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

    return () => unsub();
  };

  const handleFileSelect = (file: File) => {
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
  };

  const cancelFileUpload = () => {
    setSelectedFile(null);
    setFilePreview(null);
    setFileCaption("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const startVideoCall = () => {
    setActiveCall({ type: "video", autoAnswer: false });
  };

  const startAudioCall = () => {
    setActiveCall({ type: "audio", autoAnswer: false });
  };

  const closeCall = () => {
    setActiveCall(null);
  };

  // TEXT MESSAGE + EMAIL
  async function handleSendMessage() {
    if (!user || !input.trim() || !selectedUser) return;
    const chatId = createChatId(user.uid, selectedUser.uid);
    const text = input.trim();

    try {
      await sendTextMessage(user as ChatUser, selectedUser, text, chatId);
      setInput("");

      // send email notification to receiver
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
    }
  }

  // FILE MESSAGE + EMAIL
  async function handleSendFileMessage() {
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

      // send email notification to receiver
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
  }

  const handleAnswerIncomingCall = () => {
    if (!incomingCall || !user) return;
    const chatId = createChatId(user.uid, incomingCall.callerId);
    const url =
      `/chat/${chatId}` +
      `?user=${incomingCall.callerId}` +
      `&callId=${encodeURIComponent(incomingCall.callId)}` +
      `&callType=${incomingCall.callType}`;
    router.push(url);
  };

  if (!user) return null;

  const totalUnread = Object.values(unreadCounts).reduce(
    (sum, count) => sum + count,
    0
  );

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      <audio ref={ringtoneRef} src="/sounds/incoming-call.mp3" />

      {incomingCall && (
        <IncomingCallOverlay
          incomingCall={incomingCall}
          onAnswer={handleAnswerIncomingCall}
          onDecline={handleDeclineIncomingCall}
        />
      )}

      {activeCall?.type === "video" && selectedUser && (
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
      )}

      {activeCall?.type === "audio" && selectedUser && (
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
      )}

      <ChatHeader
        selectedUser={selectedUser}
        totalUnread={totalUnread}
        isUserOnline={
          selectedUser ? isUserOnlineCheck(selectedUser.uid) : false
        }
        onBack={() => {
          setSelectedUser(null);
          setShowUserList(true);
          setMessages([]);
        }}
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
          activeUsers={activeUsers}
          selectedUser={selectedUser}
          search={search}
          onSearchChange={setSearch}
          onSelectUser={selectUser}
          usersError={usersError}
          isUserOnline={isUserOnlineCheck}
          currentUserId={user.uid}
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
                <FileUploadPreview
                  selectedFile={selectedFile}
                  filePreview={filePreview}
                  fileCaption={fileCaption}
                  uploading={uploading}
                  onCaptionChange={setFileCaption}
                  onSend={handleSendFileMessage}
                  onCancel={cancelFileUpload}
                />
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
    </div>
  );
}
