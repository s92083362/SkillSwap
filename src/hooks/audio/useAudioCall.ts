"use client";

import { useEffect, useRef, useState } from "react";
import { db } from "@/lib/firebase/firebaseConfig";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  query,
  orderBy,
  where,
} from "firebase/firestore";
import { getLiveKitToken } from "@/lib/livekit/getLiveKitToken";
import { uploadChatFileToCloudinary } from "@/lib/cloudinary/uploadChatFile";
import {
  Room,
  RoomEvent,
  RemoteParticipant,
  RemoteTrack,
  RemoteTrackPublication,
  Track,
} from "livekit-client";

export interface AudioCallProps {
  currentUserId: string;
  currentUserName: string;
  otherUserId: string;
  otherUserName: string;
  onClose: () => void;
  autoAnswer?: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  type: string;
  timestamp: any;
  fileUrl?: string | null;
  fileName?: string | null;
  callStatus?: "completed" | "missed" | "rejected" | "cancelled";
  callDuration?: number | null;
  callDirection?: "incoming" | "outgoing";
}

/** Presence hook: reads /status/{uid}.state === "online" */
function useUserOnline(userId: string) {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  useEffect(() => {
    if (!userId) return;
    const ref = doc(db, "status", userId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data = snap.data() as any;
        setIsOnline(data?.state === "online");
      },
      (error) => {
        console.error("Error listening to user status:", error);
        setIsOnline(null);
      }
    );
    return () => unsub();
  }, [userId]);

  return isOnline;
}

export function useAudioCall({
  currentUserId,
  currentUserName,
  otherUserId,
  otherUserName,
  onClose,
  autoAnswer = false,
}: AudioCallProps) {
  const [room, setRoom] = useState<Room | null>(null);
  const [callStatus, setCallStatus] = useState("Initializing...");
  const [isCalling, setIsCalling] = useState(false);
  const [isReceivingCall, setIsReceivingCall] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOff, setIsSpeakerOff] = useState(false);

  const isReceiverOnline = useUserOnline(otherUserId);

  // Chat state
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  // File upload state
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileCaption, setFileCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [audioBlocked, setAudioBlocked] = useState(false);

  const callDocIdRef = useRef<string | null>(null);
  const hasEndedRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const incomingAudioRef = useRef<HTMLAudioElement | null>(null);
  const outgoingAudioRef = useRef<HTMLAudioElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // NEW: Track if we're the caller (outgoing) vs receiver (incoming)
  const isOutgoingCallRef = useRef(false);

  const chatId = [currentUserId, otherUserId].sort().join("_");
  const roomName = chatId;

  const safeUpdateCall = async (callId: string, data: any) => {
    try {
      const ref = doc(db, "calls", callId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      await updateDoc(ref, data);
    } catch (error) {
      console.error("Error updating call:", error);
    }
  };

  const safeDeleteCall = async (callId: string) => {
    try {
      const ref = doc(db, "calls", callId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      await deleteDoc(ref);
    } catch (error) {
      console.error("Error deleting call:", error);
    }
  };

  const saveCallMessage = async (
    status: "completed" | "missed" | "rejected" | "cancelled"
  ) => {
    try {
      const callId = callDocIdRef.current;
      let durationSec: number | null = null;

      if (callId) {
        const callRef = doc(db, "calls", callId);
        const snap = await getDoc(callRef);
        if (snap.exists()) {
          const data: any = snap.data();
          const started = data?.answeredAt || data?.timestamp;
          const ended = data?.endedAt;
          if (started?.toMillis && ended?.toMillis) {
            durationSec = Math.max(
              0,
              Math.round((ended.toMillis() - started.toMillis()) / 1000)
            );
          }
        }
      }

      const direction: "incoming" | "outgoing" =
        isReceivingCall && !isCalling ? "incoming" : "outgoing";

      await addDoc(collection(db, "privateChats", chatId, "messages"), {
        senderId: currentUserId,
        senderName: currentUserName,
        content: "",
        type: "audio-call",
        fileUrl: null,
        fileName: null,
        callStatus: status,
        callDuration: durationSec,
        callDirection: direction,
        timestamp: serverTimestamp(),
      });

      await updateDoc(doc(db, "privateChats", chatId), {
        lastMessage: status === "missed" ? "Missed audio call" : "Audio call",
        lastUpdated: serverTimestamp(),
      });
    } catch (e) {
      console.error("Failed to save call message:", e);
    }
  };

  // ✅ FIXED: Use proper query filters instead of listening to all calls
  const listenForIncomingCalls = () => {
    const callsRef = collection(db, "calls");
    
    // Query only calls meant for current user
    const q = query(
      callsRef,
      where('to', '==', currentUserId),
      where('answered', '==', false),
      where('ended', '==', false)
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type !== "added") return;
          const data = change.doc.data() as any;
          
          // Additional filter: only from the specific user we're talking to
          if (
            data.callType !== "audio" ||
            data.from !== otherUserId
          ) {
            return;
          }
          
          callDocIdRef.current = change.doc.id;
          isOutgoingCallRef.current = false; // incoming
          setIsReceivingCall(true);
          setCallStatus(`Incoming audio call from ${otherUserName}`);
          playIncoming();
        });
      },
      (error) => {
        console.error("Error listening for incoming calls:", error);
      }
    );

    return unsub;
  };

  // ✅ FIXED: Better error handling for call disconnect listener
  const listenForCallDisconnect = () => {
    let unsub: (() => void) | undefined;
    let intervalId: ReturnType<typeof setInterval> | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const attach = (callId: string) => {
      const ref = doc(db, "calls", callId);
      unsub = onSnapshot(
        ref,
        (snap) => {
          if (!snap.exists()) {
            if (!hasEndedRef.current) {
              hasEndedRef.current = true;
              setCallStatus("Call ended");
              saveCallMessage(isConnected ? "completed" : "missed");
              setTimeout(() => {
                cleanup(true);
                onClose();
              }, 1200);
            }
            return;
          }
          const data = snap.data() as any;
          if (data?.ended && !hasEndedRef.current) {
            hasEndedRef.current = true;
            const endedByOther = data.endedBy && data.endedBy !== currentUserId;
            setCallStatus(
              endedByOther ? "Call ended by other user" : "Call ended"
            );
            saveCallMessage(isConnected ? "completed" : "missed");
            setTimeout(() => {
              cleanup(true);
              onClose();
            }, 1200);
          }
        },
        (error) => {
          // Silently handle permission errors - they're expected when call doc is deleted
          if (error.code === 'permission-denied') {
            // Document was deleted or we lost access - treat as call ended
            if (!hasEndedRef.current) {
              hasEndedRef.current = true;
              // Don't show error status, just end gracefully
              setTimeout(() => {
                cleanup(true);
                onClose();
              }, 100);
            }
          } else {
            // Log other unexpected errors
            console.error("Unexpected error listening to call:", error);
          }
        }
      );
    };

    if (callDocIdRef.current) {
      attach(callDocIdRef.current);
    } else {
      intervalId = setInterval(() => {
        if (callDocIdRef.current) {
          attach(callDocIdRef.current);
          if (intervalId) clearInterval(intervalId);
        }
      }, 200);
      
      // Cleanup interval after 5 seconds if call ID is never set
      timeoutId = setTimeout(() => {
        if (intervalId) clearInterval(intervalId);
      }, 5000);
    }
    
    return () => {
      if (unsub) unsub();
      if (intervalId) clearInterval(intervalId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  };

  const playIncoming = () => {
    const el = incomingAudioRef.current;
    if (!el) return;
    const p = el.play();
    if (p && typeof p.then === "function") {
      p.catch((err) => {
        console.warn("Incoming ring play blocked:", err);
      });
    }
  };

  const stopIncoming = () => {
    if (!incomingAudioRef.current) return;
    incomingAudioRef.current.pause();
    incomingAudioRef.current.currentTime = 0;
  };

  const playOutgoing = () => {
    const el = outgoingAudioRef.current;
    if (!el) return;
    const p = el.play();
    if (p && typeof p.then === "function") {
      p.catch((err) => {
        console.warn("Outgoing ring play blocked:", err);
      });
    }
  };

  const stopOutgoing = () => {
    if (!outgoingAudioRef.current) return;
    outgoingAudioRef.current.pause();
    outgoingAudioRef.current.currentTime = 0;
  };

  const handleTrackSubscribed = (
    track: RemoteTrack,
    _pub: RemoteTrackPublication,
    _p: RemoteParticipant
  ) => {
    if (track.kind === Track.Kind.Audio) {
      if (remoteAudioRef.current) {
        track.attach(remoteAudioRef.current);
        const p = remoteAudioRef.current.play();
        if (p && typeof p.then === "function") {
          p.catch((err) => {
            console.warn("Remote audio play blocked:", err);
            setAudioBlocked(true);
          });
        }
      } else {
        track.attach();
      }
    }
    if (track.kind === Track.Kind.Video) {
      console.log("Ignoring video track in audio-only call");
      track.detach();
    }
  };

  const handleTrackUnsubscribed = (track: RemoteTrack) => {
    track.detach();
  };

  const setupAudioRoom = async () => {
    const token = await getLiveKitToken(
      roomName,
      currentUserName,
      currentUserId
    );
    const newRoom = new Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: {
        resolution: { width: 0, height: 0 },
      },
    });

    newRoom.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    newRoom.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);

    // Remote participant joins = call is now truly connected on caller side
    newRoom.on(RoomEvent.ParticipantConnected, () => {
      setIsConnected(true);
      setCallStatus("Connected");
      stopIncoming();
      stopOutgoing();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    });

    // Local connect: DON'T stop outgoing ringtone here for outgoing calls
    newRoom.on(RoomEvent.Connected, async () => {
      // Only stop incoming ringtone if we're receiving
      if (!isOutgoingCallRef.current) {
        stopIncoming();
      }
      try {
        await newRoom.localParticipant.setCameraEnabled(false);
      } catch (e) {
        console.error("Error disabling camera on connect:", e);
      }
    });

    newRoom.on(RoomEvent.Disconnected, () => {
      if (!hasEndedRef.current) {
        hasEndedRef.current = true;
        setCallStatus("Call ended");
        saveCallMessage(isConnected ? "completed" : "missed");
        setTimeout(() => {
          cleanup(true);
          onClose();
        }, 1200);
      }
    });

    const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
    if (!wsUrl) throw new Error("Missing LiveKit URL");

    await newRoom.connect(wsUrl, token);
    await newRoom.localParticipant.setCameraEnabled(false);
    await newRoom.localParticipant.setMicrophoneEnabled(true);

    setRoom(newRoom);
    return newRoom;
  };

  const startCall = async () => {
    setIsCalling(true);
    isOutgoingCallRef.current = true; // outgoing

    if (isReceiverOnline === true) {
      setCallStatus("Ringing...");
    } else {
      setCallStatus("Calling...");
    }

    playOutgoing();

    try {
      const callDoc = await addDoc(collection(db, "calls"), {
        from: currentUserId,
        fromName: currentUserName,
        to: otherUserId,
        toName: otherUserName,
        roomName,
        callType: "audio",
        answered: false,
        ended: false,
        declined: false,
        timestamp: serverTimestamp(),
        calleeOnlineAtDial: isReceiverOnline === true,
      });
      callDocIdRef.current = callDoc.id;
      hasEndedRef.current = false;
      await setupAudioRoom();
    } catch (e) {
      console.error("Failed to start call:", e);
      setCallStatus("Failed to start call");
      stopOutgoing();
      setIsCalling(false);
    }
  };

  // UPDATED: receiver sees "Connected" immediately after answering
  const answerCall = async () => {
    if (!callDocIdRef.current) return;

    setCallStatus("Connecting...");
    stopIncoming();
    setIsReceivingCall(false);
    hasEndedRef.current = false;

    try {
      await safeUpdateCall(callDocIdRef.current, {
        answered: true,
        answeredAt: serverTimestamp(),
      });

      // Mark receiver as connected right after answering
      setIsConnected(true);
      setCallStatus("Connected");

      await setupAudioRoom();
    } catch (e) {
      console.error("Failed to answer call:", e);
      setCallStatus("Failed to answer call");
      setIsConnected(false);
    }
  };

  const declineCall = async () => {
    stopIncoming();
    
    // Unsubscribe BEFORE updating/deleting to prevent permission errors
    if (unsubDisconnectRef.current) {
      unsubDisconnectRef.current();
      unsubDisconnectRef.current = null;
    }
    
    if (callDocIdRef.current) {
      await safeUpdateCall(callDocIdRef.current, {
        ended: true,
        declined: true,
        declinedAt: serverTimestamp(),
        endedBy: currentUserId,
      });
      await saveCallMessage("rejected");
      setTimeout(async () => {
        if (callDocIdRef.current) await safeDeleteCall(callDocIdRef.current);
      }, 400);
    }
    hasEndedRef.current = true;
    cleanup(true);
    onClose();
  };

  const endCall = async () => {
    if (hasEndedRef.current) {
      cleanup(true);
      onClose();
      return;
    }
    hasEndedRef.current = true;
    
    // Unsubscribe BEFORE updating/deleting to prevent permission errors
    if (unsubDisconnectRef.current) {
      unsubDisconnectRef.current();
      unsubDisconnectRef.current = null;
    }
    
    if (callDocIdRef.current) {
      await safeUpdateCall(callDocIdRef.current, {
        ended: true,
        endedBy: currentUserId,
        endedAt: serverTimestamp(),
      });
      await saveCallMessage(isConnected ? "completed" : "cancelled");
      setTimeout(async () => {
        if (callDocIdRef.current) await safeDeleteCall(callDocIdRef.current);
      }, 400);
    }
    cleanup(true);
    onClose();
  };

  const cleanup = (disconnectOnly = false) => {
    stopIncoming();
    stopOutgoing();
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (room) {
      room.disconnect();
      setRoom(null);
    }
    if (!disconnectOnly) {
      callDocIdRef.current = null;
    }
    setIsCalling(false);
    setIsReceivingCall(false);
    setIsConnected(false);
  };

  const toggleMute = async () => {
    if (!room) return;
    const enabled = !room.localParticipant.isMicrophoneEnabled;
    await room.localParticipant.setMicrophoneEnabled(enabled);
    setIsMuted(!enabled);
  };

  const toggleSpeaker = () => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !remoteAudioRef.current.muted;
      setIsSpeakerOff(remoteAudioRef.current.muted);
    }
  };

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
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadError("File size must be less than 10MB");
      setTimeout(() => setUploadError(null), 5000);
      return;
    }
    try {
      setUploading(true);
      setUploadError(null);
      const { url, resourceType } = await uploadChatFileToCloudinary(file);
      const isImage =
        resourceType === "image" && file.type.startsWith("image/");
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

  // Store unsubscribe functions in refs so we can call them before deleting
  const unsubIncomingRef = useRef<(() => void) | null>(null);
  const unsubDisconnectRef = useRef<(() => void) | null>(null);

  // ----- Effects wiring -----

  useEffect(() => {
    const unsubIncoming = listenForIncomingCalls();
    const unsubDisconnect = listenForCallDisconnect();
    
    // Store in refs
    unsubIncomingRef.current = unsubIncoming;
    unsubDisconnectRef.current = unsubDisconnect;
    
    return () => {
      unsubIncoming?.();
      unsubDisconnect?.();
      cleanup(true);
    };
  }, [currentUserId, otherUserId]); // ✅ Added dependencies

  useEffect(() => {
    if (autoAnswer && isReceivingCall && callDocIdRef.current) {
      answerCall();
    }
  }, [autoAnswer, isReceivingCall]);

  // Monitor receiver's online status and update call status accordingly (for outgoing calls)
  useEffect(() => {
    if (isCalling && !isConnected && isOutgoingCallRef.current) {
      if (isReceiverOnline === true) {
        setCallStatus("Ringing...");
      } else if (isReceiverOnline === false) {
        setCallStatus("Calling...");
      }
    }
  }, [isReceiverOnline, isCalling, isConnected]);

  // 30s timeout
  useEffect(() => {
    const shouldStartTimer =
      (isCalling || isReceivingCall) && !isConnected && !hasEndedRef.current;

    if (!shouldStartTimer) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    timeoutRef.current = setTimeout(async () => {
      if (hasEndedRef.current || isConnected) return;

      if (callDocIdRef.current) {
        await safeUpdateCall(callDocIdRef.current, {
          ended: true,
          endedBy: currentUserId,
          endedAt: serverTimestamp(),
          timeout: true,
        });
        await saveCallMessage("missed");
        setTimeout(async () => {
          if (callDocIdRef.current) await safeDeleteCall(callDocIdRef.current);
        }, 400);
      }

      setCallStatus("No answer");
      hasEndedRef.current = true;
      cleanup(true);

      setTimeout(() => {
        onClose();
      }, 1500);
    }, 30_000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [isCalling, isReceivingCall, isConnected, currentUserId, onClose]);

  useEffect(() => {
    const messagesRef = collection(db, "privateChats", chatId, "messages");
    const q = query(messagesRef, orderBy("timestamp"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const messages: ChatMessage[] = [];
        snapshot.forEach((d) => {
          messages.push({ id: d.id, ...(d.data() as any) } as ChatMessage);
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
      },
      (error) => {
        console.error("Error listening to chat messages:", error);
      }
    );
    return () => unsubscribe();
  }, [chatId, showChat, currentUserId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  useEffect(() => {
    if (showChat) setUnreadCount(0);
  }, [showChat]);

  useEffect(() => {
    if (room && isConnected) {
      const interval = setInterval(async () => {
        try {
          if (room.localParticipant.isCameraEnabled) {
            await room.localParticipant.setCameraEnabled(false);
          }
        } catch (e) {
          console.error("Error disabling camera:", e);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [room, isConnected]);

  const tryEnableRemoteAudio = () => {
    const el = remoteAudioRef.current;
    if (!el) return;
    el
      .play()
      .then(() => setAudioBlocked(false))
      .catch(() => setAudioBlocked(true));
  };

  // ----- Return values for UI -----

  return {
    // state
    callStatus,
    isCalling,
    isReceivingCall,
    isConnected,
    isMuted,
    isSpeakerOff,
    showChat,
    chatMessages,
    chatInput,
    unreadCount,
    showAttachMenu,
    selectedFile,
    filePreview,
    fileCaption,
    uploading,
    uploadError,
    isReceiverOnline,
    audioBlocked,

    // refs
    incomingAudioRef,
    outgoingAudioRef,
    remoteAudioRef,
    chatEndRef,
    fileInputRef,

    // setters / actions
    setShowChat,
    setChatInput,
    setShowAttachMenu,
    setFileCaption,
    setUnreadCount,

    // call controls
    startCall,
    answerCall,
    declineCall,
    endCall,
    toggleMute,
    toggleSpeaker,
    tryEnableRemoteAudio,

    // chat / file
    sendChatMessage,
    handleFileSelect,
    cancelFileUpload,
    sendFileMessage,
  };
}