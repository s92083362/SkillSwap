"use client";

import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase/firebaseConfig";
import {
  collection,
  addDoc,
  doc,
  onSnapshot,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { uploadChatFileToCloudinary } from "@/lib/cloudinary/uploadChatFile";

/** Presence hook: reads /status/{uid}.state === "online" */
function useUserOnline(userId: string) {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  useEffect(() => {
    if (!userId) return;

    const ref = doc(db, "status", userId);
    const unsub = onSnapshot(ref, (snap) => {
      const data = snap.data() as any;
      setIsOnline(data?.state === "online");
    });

    return () => unsub();
  }, [userId]);

  return isOnline;
}

/**
 * Shared presence + chat + file-upload + draggable UI logic
 * Can be reused by both audio and video call hooks.
 */
export function usePresenceAndChat(
  currentUserId: string,
  currentUserName: string,
  otherUserId: string,
  otherUserName: string
) {
  // unified chat id
  const chatId = [currentUserId, otherUserId].sort().join("_");

  // presence
  const isReceiverOnline = useUserOnline(otherUserId);

  // chat state
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  // file upload state
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileCaption, setFileCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // draggable / minimize UI
  const [minimized, setMinimized] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // refs
  const dragHandleRef = useRef<HTMLDivElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ----- Firestore chat listener -----

  useEffect(() => {
    const messagesRef = collection(db, "privateChats", chatId, "messages");
    const q = query(messagesRef, orderBy("timestamp"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages: any[] = [];
      snapshot.forEach((d) => {
        messages.push({ id: d.id, ...(d.data() as any) });
      });
      setChatMessages(messages);

      if (!showChat) {
        const newUnread = messages.filter(
          (msg) =>
            msg.senderId !== currentUserId &&
            msg.timestamp?.toMillis &&
            msg.timestamp.toMillis() > Date.now() - 5000
        ).length;
        setUnreadCount(newUnread);
      }
    });

    return () => unsubscribe();
  }, [chatId, showChat, currentUserId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  useEffect(() => {
    if (showChat) setUnreadCount(0);
  }, [showChat]);

  // ----- Draggable logic -----

  useEffect(() => {
    if (!minimized) return;

    let isDragging = false;
    let startX = 0;
    let startY = 0;

    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true;
      startX = e.clientX - offset.x;
      startY = e.clientY - offset.y;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setOffset({
        x: e.clientX - startX,
        y: e.clientY - startY,
      });
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    const el = dragHandleRef.current;
    el?.addEventListener("mousedown", handleMouseDown as any);
    window.addEventListener("mousemove", handleMouseMove as any);
    window.addEventListener("mouseup", handleMouseUp as any);

    return () => {
      el?.removeEventListener("mousedown", handleMouseDown as any);
      window.removeEventListener("mousemove", handleMouseMove as any);
      window.removeEventListener("mouseup", handleMouseUp as any);
    };
  }, [minimized, offset.x, offset.y]);

  // ----- Chat send -----

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    const text = chatInput.trim();

    try {
      await addDoc(collection(db, "privateChats", chatId, "messages"), {
        senderId: currentUserId,
        senderName: currentUserName,
        content: text,
        type: "text",
        fileUrl: null,
        fileName: null,
        timestamp: serverTimestamp(),
      });

      await addDoc(collection(db, "messages"), {
        senderId: currentUserId,
        senderName: currentUserName,
        receiverId: otherUserId,
        content: text,
        type: "text",
        fileUrl: null,
        conversationId: chatId,
        timestamp: serverTimestamp(),
        read: false,
      });

      await updateDoc(doc(db, "privateChats", chatId), {
        lastMessage: text,
        lastUpdated: serverTimestamp(),
      });

      setChatInput("");
    } catch (error) {
      console.error("Error sending chat message:", error);
    }
  };

  // ----- File helpers -----

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

  const sendFileMessage = async () => {
    if (!selectedFile) return;

    const file = selectedFile;
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setUploadError("File size must be less than 10MB");
      setTimeout(() => setUploadError(null), 5000);
      return;
    }

    try {
      setUploading(true);
      setUploadError(null);

      const { url, resourceType } = await uploadChatFileToCloudinary(file);
      const isImage = resourceType === "image" && file.type.startsWith("image/");
      const displayContent = fileCaption || (isImage ? "" : file.name);
      const type = isImage ? "image" : "file";

      await addDoc(collection(db, "privateChats", chatId, "messages"), {
        senderId: currentUserId,
        senderName: currentUserName,
        content: displayContent,
        type,
        fileUrl: url,
        fileName: file.name,
        timestamp: serverTimestamp(),
      });

      await addDoc(collection(db, "messages"), {
        senderId: currentUserId,
        senderName: currentUserName,
        receiverId: otherUserId,
        content: displayContent,
        type,
        fileUrl: url,
        conversationId: chatId,
        timestamp: serverTimestamp(),
        read: false,
      });

      await updateDoc(doc(db, "privateChats", chatId), {
        lastMessage: isImage ? "📷 Photo" : `📎 ${file.name}`,
        lastUpdated: serverTimestamp(),
      });

      cancelFileUpload();
    } catch (error: any) {
      console.error("Error sending file message:", error);
      setUploadError(
        error instanceof Error ? error.message : "Failed to upload file"
      );
      setTimeout(() => setUploadError(null), 5000);
    } finally {
      setUploading(false);
    }
  };

  return {
    chatId,

    // presence
    isReceiverOnline,

    // chat
    showChat,
    chatMessages,
    chatInput,
    unreadCount,
    setShowChat,
    setChatInput,
    setUnreadCount,
    sendChatMessage,

    // files
    showAttachMenu,
    selectedFile,
    filePreview,
    fileCaption,
    uploading,
    uploadError,
    setShowAttachMenu,
    setFileCaption,
    handleFileSelect,
    cancelFileUpload,
    sendFileMessage,

    // layout
    minimized,
    offset,
    setMinimized,
    setOffset,

    // refs
    dragHandleRef,
    chatEndRef,
    fileInputRef,
  };
}
