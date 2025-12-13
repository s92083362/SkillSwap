"use client";
import React, { useEffect, useRef, useState } from "react";
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
import {
  PhoneIcon,
  PhoneXMarkIcon,
  MicrophoneIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ChatBubbleLeftIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  PhotoIcon,
} from "@heroicons/react/24/solid";
import { getLiveKitToken } from "@/app/actions/getLiveKitToken";
import { uploadChatFileToCloudinary } from "@/lib/cloudinary/uploadChatFile";
import {
  Room,
  RoomEvent,
  RemoteParticipant,
  RemoteTrack,
  RemoteTrackPublication,
  Track,
} from "livekit-client";

interface AudioCallProps {
  currentUserId: string;
  currentUserName: string;
  otherUserId: string;
  otherUserName: string;
  onClose: () => void;
  autoAnswer?: boolean;
}

interface ChatMessage {
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

export default function AudioCall({
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

  // helper: write call log message into chat history
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
        lastMessage:
          status === "missed" ? "Missed audio call" : "Audio call",
        lastUpdated: serverTimestamp(),
      });
    } catch (e) {
      console.error("Failed to save call message:", e);
    }
  };

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

  // Listen for chat messages
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

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Reset unread when chat opens
  useEffect(() => {
    if (showChat) setUnreadCount(0);
  }, [showChat]);

  // Monitor room to ensure camera stays disabled
  useEffect(() => {
    if (room && isConnected) {
      const interval = setInterval(async () => {
        try {
          if (room.localParticipant.isCameraEnabled) {
            await room.localParticipant.setCameraEnabled(false);
            console.log("Force disabled camera in audio call");
          }
        } catch (e) {
          console.error("Error disabling camera:", e);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [room, isConnected]);

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
    // attach per-call listener once call id is known
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
          const endedByOther =
            data.endedBy && data.endedBy !== currentUserId;
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

    // if already have id, attach now; otherwise wait until it is set
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

  const setupAudioRoom = async () => {
    const token = await getLiveKitToken(roomName, currentUserName, currentUserId);
    const newRoom = new Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: {
        resolution: {
          width: 0,
          height: 0,
        },
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
      return;
    }
  };

  const handleTrackUnsubscribed = (track: RemoteTrack) => {
    track.detach();
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

  // Chat functions
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

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-2 sm:p-4">
      <audio ref={incomingAudioRef} src="/sounds/incoming-call.mp3" loop />
      <audio ref={outgoingAudioRef} src="/sounds/outgoing-call.mp3" loop />
      <audio ref={remoteAudioRef} autoPlay playsInline />

      <div className="relative flex flex-col lg:flex-row gap-2 sm:gap-4 items-stretch lg:items-start w-full max-w-6xl h-full lg:h-auto">
        {/* Main call interface */}
        <div className="bg-gray-900 text-white rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 w-full lg:max-w-sm flex flex-col items-center gap-3 sm:gap-4 shadow-2xl flex-shrink-0">
          <p className="text-xs sm:text-sm text-gray-300 text-center">
            {isConnected ? "Connected" : callStatus}
          </p>
          <h2 className="text-xl sm:text-2xl font-semibold text-center">
            {otherUserName}
          </h2>

          {!isConnected && isCalling && (
            <p className="text-xs text-gray-400">Ringing...</p>
          )}
          {!isConnected && isReceivingCall && (
            <p className="text-xs text-gray-400">Incoming audio call...</p>
          )}

          {uploadError && (
            <div className="bg-red-500 text-white px-3 py-2 rounded text-xs max-w-xs text-center">
              {uploadError}
            </div>
          )}

          <div className="mt-4 sm:mt-6 flex items-center justify-center gap-3 sm:gap-4 lg:gap-6 flex-wrap">
            <button
              onClick={toggleMute}
              disabled={!isConnected}
              className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-colors ${
                isMuted ? "bg-red-600" : "bg-gray-700"
              } ${!isConnected ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <MicrophoneIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            <button
              onClick={toggleSpeaker}
              disabled={!isConnected}
              className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-colors ${
                isSpeakerOff ? "bg-red-600" : "bg-gray-700"
              } ${!isConnected ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {isSpeakerOff ? (
                <SpeakerXMarkIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              ) : (
                <SpeakerWaveIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              )}
            </button>

            <button
              onClick={() => setShowChat((v) => !v)}
              className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-gray-700 transition-colors"
            >
              <ChatBubbleLeftIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              {unreadCount > 0 && !showChat && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-[10px] text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={endCall}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-red-600 hover:bg-red-700 transition-colors"
            >
              <PhoneXMarkIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          {isReceivingCall && !isConnected && (
            <div className="mt-4 sm:mt-6 flex gap-6 sm:gap-8">
              <button
                onClick={declineCall}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors"
              >
                <PhoneXMarkIcon className="w-6 h-6 sm:w-7 sm:h-7" />
              </button>
              <button
                onClick={answerCall}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center transition-colors"
              >
                <PhoneIcon className="w-6 h-6 sm:w-7 sm:h-7" />
              </button>
            </div>
          )}

          {!isCalling && !isReceivingCall && !isConnected && (
            <button
              onClick={startCall}
              className="mt-4 px-4 sm:px-6 py-2 rounded-full bg-green-600 hover:bg-green-700 flex items-center gap-2 text-xs sm:text-sm font-semibold transition-colors"
            >
              <PhoneIcon className="w-4 h-4" />
              Start Audio Call
            </button>
          )}
        </div>

        {/* Chat Panel - Responsive */}
        {showChat && (
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full lg:w-96 flex flex-col flex-1 lg:flex-initial lg:h-[600px] min-h-0">
            <div className="flex items-center justify-between p-3 sm:p-4 border-b flex-shrink-0">
              <h3 className="font-semibold text-gray-800 text-sm sm:text-base truncate">
                Chat with {otherUserName}
              </h3>
              <button
                onClick={() => setShowChat(false)}
                className="text-gray-500 hover:text-gray-700 flex-shrink-0 ml-2"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 min-h-0">
              {chatMessages.length === 0 ? (
                <p className="text-center text-gray-500 text-xs sm:text-sm">
                  No messages yet
                </p>
              ) : (
                chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.senderId === currentUserId
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[70%] rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 ${
                        msg.senderId === currentUserId
                          ? "bg-blue-500 text-white"
                          : "bg-gray-200 text-gray-800"
                      }`}
                    >
                      {msg.type === "image" && msg.fileUrl && (
                        <img
                          src={msg.fileUrl}
                          alt="Shared image"
                          className="max-w-full rounded mb-1"
                        />
                      )}
                      {msg.type === "file" && msg.fileUrl && (
                        <a
                          href={msg.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs underline break-all"
                        >
                          {msg.fileName || "Download file"}
                        </a>
                      )}
                      {msg.type === "audio-call" && (
                        <p className="text-xs sm:text-sm italic">
                          {msg.callStatus === "completed" && "Audio call"}
                          {msg.callStatus === "missed" &&
                            "Missed audio call"}
                          {msg.callStatus === "rejected" &&
                            "Rejected audio call"}
                          {msg.callStatus === "cancelled" &&
                            "Cancelled audio call"}
                          {typeof msg.callDuration === "number" &&
                            msg.callDuration > 0 &&
                            ` • ${Math.floor(
                              msg.callDuration / 60
                            )}m ${msg.callDuration % 60}s`}
                        </p>
                      )}
                      {msg.content && msg.type !== "audio-call" && (
                        <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">
                          {msg.content}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            {/* File preview */}
            {selectedFile && (
              <div className="border-t p-2 sm:p-3 bg-gray-50 flex flex-col gap-2 flex-shrink-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-gray-600 truncate flex-1">
                    Selected: {selectedFile.name}
                  </p>
                  <button
                    onClick={cancelFileUpload}
                    className="text-xs text-red-500 flex-shrink-0"
                  >
                    Remove
                  </button>
                </div>
                {filePreview && (
                  <img
                    src={filePreview}
                    alt="Preview"
                    className="max-h-24 sm:max-h-32 rounded object-cover"
                  />
                )}
                <input
                  type="text"
                  value={fileCaption}
                  onChange={(e) => setFileCaption(e.target.value)}
                  placeholder="Add a caption (optional)"
                  className="text-xs border rounded px-2 py-1"
                />
                <button
                  disabled={uploading}
                  onClick={sendFileMessage}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded px-3 py-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {uploading ? "Sending..." : "Send file"}
                </button>
              </div>
            )}

            {/* Chat input */}
            <div className="border-t p-2 sm:p-3 flex items-center gap-2 flex-shrink-0">
              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />

              {/* Attach button */}
              <div className="relative">
                <button
                  onClick={() =>
                    setShowAttachMenu((prev) => !prev)
                  }
                  className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200"
                >
                  <PhotoIcon className="w-4 h-4 text-gray-600" />
                </button>

                {showAttachMenu && (
                  <div className="absolute bottom-10 left-0 bg-white border rounded shadow-lg text-xs sm:text-sm z-10">
                    <button
                      onClick={() => {
                        setShowAttachMenu(false);
                        fileInputRef.current?.click();
                      }}
                      className="px-3 py-2 hover:bg-gray-100 w-full text-left"
                    >
                      Upload photo or file
                    </button>
                  </div>
                )}
              </div>

              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a message"
                className="flex-1 text-xs sm:text-sm border rounded-full px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendChatMessage();
                  }
                }}
              />

              <button
                onClick={sendChatMessage}
                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                <PaperAirplaneIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
