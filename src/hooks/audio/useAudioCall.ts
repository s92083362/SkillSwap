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

  const callDocIdRef = useRef<string | null>(null);
  const hasEndedRef = useRef(false);
  const incomingAudioRef = useRef<HTMLAudioElement | null>(null);
  const outgoingAudioRef = useRef<HTMLAudioElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const chatId = [currentUserId, otherUserId].sort().join("_");
  const roomName = chatId;

  const safeUpdateCall = async (callId: string, data: any) => {
    const ref = doc(db, "calls", callId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    await updateDoc(ref, data);
  };

  const safeDeleteCall = async (callId: string) => {
    const ref = doc(db, "calls", callId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    await deleteDoc(ref);
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

  const listenForIncomingCalls = () => {
    const callsRef = collection(db, "calls");
    const unsub = onSnapshot(callsRef, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type !== "added") return;
        const data = change.doc.data();
        if (
          data.callType !== "audio" ||
          data.to !== currentUserId ||
          data.from !== otherUserId ||
          data.answered ||
          data.ended
        ) {
          return;
        }
        callDocIdRef.current = change.doc.id;
        setIsReceivingCall(true);
        setCallStatus(`Incoming audio call from ${otherUserName}`);
        playIncoming();
      });
    });
    return unsub;
  };

  const listenForCallDisconnect = () => {
    let unsub: (() => void) | undefined;

    const attach = (callId: string) => {
      const ref = doc(db, "calls", callId);
      unsub = onSnapshot(ref, (snap) => {
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
        const data = snap.data();
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
      });
    };

    if (callDocIdRef.current) {
      attach(callDocIdRef.current);
    } else {
      const interval = setInterval(() => {
        if (callDocIdRef.current) {
          attach(callDocIdRef.current);
          clearInterval(interval);
        }
      }, 200);
    }
    return () => {
      if (unsub) unsub();
    };
  };

  const playIncoming = () => {
    try {
      incomingAudioRef.current?.play().catch(() => {});
    } catch {}
  };

  const stopIncoming = () => {
    if (!incomingAudioRef.current) return;
    incomingAudioRef.current.pause();
    incomingAudioRef.current.currentTime = 0;
  };

  const playOutgoing = () => {
    try {
      outgoingAudioRef.current?.play().catch(() => {});
    } catch {}
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
    const token = await getLiveKitToken(roomName, currentUserName, currentUserId);
    const newRoom = new Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: {
        resolution: { width: 0, height: 0 },
      },
    });

    newRoom.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    newRoom.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
    newRoom.on(RoomEvent.ParticipantConnected, () => {
      setCallStatus("Connected");
    });

    newRoom.on(RoomEvent.Connected, async () => {
      setIsConnected(true);
      setCallStatus("Connected");
      stopIncoming();
      stopOutgoing();
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
    setCallStatus("Calling...");
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
      });
      callDocIdRef.current = callDoc.id;
      hasEndedRef.current = false;
      await setupAudioRoom();
      setCallStatus("Ringing...");
    } catch (e) {
      console.error("Failed to start call:", e);
      setCallStatus("Failed to start call");
      stopOutgoing();
      setIsCalling(false);
    }
  };

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
      await setupAudioRoom();
    } catch (e) {
      console.error("Failed to answer call:", e);
      setCallStatus("Failed to answer call");
    }
  };

  const declineCall = async () => {
    stopIncoming();
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

  // ----- Effects wiring -----

  useEffect(() => {
    const unsubIncoming = listenForIncomingCalls();
    const unsubDisconnect = listenForCallDisconnect();
    return () => {
      unsubIncoming?.();
      unsubDisconnect?.();
      cleanup(true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (autoAnswer && isReceivingCall && callDocIdRef.current) {
      answerCall();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAnswer, isReceivingCall]);

  useEffect(() => {
    const messagesRef = collection(db, "privateChats", chatId, "messages");
    const q = query(messagesRef, orderBy("timestamp"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
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
    });
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

    // chat / file
    sendChatMessage,
    handleFileSelect,
    cancelFileUpload,
    sendFileMessage,
  };
}
