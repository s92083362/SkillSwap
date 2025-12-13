// components/chat/VideoCall.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { db } from "../../lib/firebase/firebaseConfig";
import {
  collection,
  addDoc,
  doc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  getDoc,
} from "firebase/firestore";
import {
  VideoCameraIcon,
  PhoneXMarkIcon,
  MicrophoneIcon,
  VideoCameraSlashIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ExclamationTriangleIcon,
  ChatBubbleLeftIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  PhotoIcon,
  ArrowsPointingOutIcon,
  ComputerDesktopIcon,
} from "@heroicons/react/24/solid";
import { uploadChatFileToCloudinary } from "@/lib/cloudinary/uploadChatFile";
import { getLiveKitToken } from "@/app/actions/getLiveKitToken";
import {
  Room,
  RoomEvent,
  RemoteParticipant,
  RemoteTrackPublication,
  RemoteTrack,
  Track,
} from "livekit-client";

interface VideoCallProps {
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
}

export default function VideoCall({
  currentUserId,
  currentUserName,
  otherUserId,
  otherUserName,
  onClose,
  autoAnswer = false,
}: VideoCallProps) {
  const [room, setRoom] = useState<Room | null>(null);
  const [isCalling, setIsCalling] = useState(false);
  const [isReceivingCall, setIsReceivingCall] = useState(false);
  const [callStatus, setCallStatus] = useState<string>("Initializing...");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerOff, setIsSpeakerOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [showPermissionGuide, setShowPermissionGuide] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // NEW: remote screen‑share state
  const [remoteScreenSharing, setRemoteScreenSharing] = useState(false);

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

  // Draggable / minimize
  const [minimized, setMinimized] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragHandleRef = useRef<HTMLDivElement | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const screenShareRef = useRef<HTMLVideoElement>(null);
  const callDocIdRef = useRef<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const outgoingAudioRef = useRef<HTMLAudioElement | null>(null);
  const incomingAudioRef = useRef<HTMLAudioElement | null>(null);

  const hasEndedRef = useRef(false); // prevent double end

  // Unified chatId / roomName
  const chatId = [currentUserId, otherUserId].sort().join("_");
  const roomName = chatId;

  // ----- Helpers for safe call doc updates -----

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

  // save video call message into chat history
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
        type: "video-call",
        fileUrl: null,
        fileName: null,
        callStatus: status,
        callDuration: durationSec,
        callDirection: direction,
        timestamp: serverTimestamp(),
      });

      await updateDoc(doc(db, "privateChats", chatId), {
        lastMessage: status === "missed" ? "Missed video call" : "Video call",
        lastUpdated: serverTimestamp(),
      });
    } catch (e) {
      console.error("Failed to save video call message:", e);
    }
  };

  // ----- Effects -----

  useEffect(() => {
    const unsubscribeIncoming = listenForIncomingCalls();
    const unsubscribeCallStatus = listenForCallDisconnect();

    return () => {
      unsubscribeIncoming?.();
      unsubscribeCallStatus?.();
      cleanup(true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (autoAnswer && isReceivingCall && callDocIdRef.current) {
      answerCall();
    }
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

  // drag only when minimized
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

  // ----- Call disconnect listener (other side ended) -----

  const listenForCallDisconnect = () => {
    if (!callDocIdRef.current) return;

    const callRef = doc(db, "calls", callDocIdRef.current);
    const unsubscribe = onSnapshot(callRef, (snapshot) => {
      const data = snapshot.data();
      if (!snapshot.exists() || data?.ended) {
        if (!hasEndedRef.current) {
          setCallStatus("Call ended");
          hasEndedRef.current = true;
          saveCallMessage(isConnected ? "completed" : "missed");
          setTimeout(() => {
            cleanup(true);
            onClose();
          }, 1200);
        }
      }
    });

    return unsubscribe;
  };

  // ----- Ringtones -----

  const playOutgoingRingtone = () => {
    try {
      outgoingAudioRef.current?.play().catch(() => {});
    } catch {}
  };

  const stopOutgoingRingtone = () => {
    if (outgoingAudioRef.current) {
      outgoingAudioRef.current.pause();
      outgoingAudioRef.current.currentTime = 0;
    }
  };

  const playIncomingRingtone = () => {
    try {
      incomingAudioRef.current?.play().catch(() => {});
    } catch {}
  };

  const stopIncomingRingtone = () => {
    if (incomingAudioRef.current) {
      incomingAudioRef.current.pause();
      incomingAudioRef.current.currentTime = 0;
    }
  };

  // ----- LiveKit Room Setup -----

  const setupLiveKitRoom = async () => {
    try {
      const token = await getLiveKitToken(
        roomName,
        currentUserName,
        currentUserId
      );

      const newRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: {
          resolution: {
            width: 1280,
            height: 720,
          },
        },
      });

      newRoom.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      newRoom.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
      newRoom.on(RoomEvent.ParticipantConnected, handleParticipantConnected);
      newRoom.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
      newRoom.on(RoomEvent.Disconnected, handleDisconnected);
      newRoom.on(RoomEvent.Connected, () => {
        setIsConnected(true);
        setCallStatus("Connected");
        stopOutgoingRingtone();
        stopIncomingRingtone();
      });

      const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
      console.log("LiveKit wsUrl =", wsUrl);
      if (!wsUrl) throw new Error("Missing NEXT_PUBLIC_LIVEKIT_URL");

      await newRoom.connect(wsUrl, token); // must be wss://...

      await newRoom.localParticipant.enableCameraAndMicrophone();

      const videoPubs = Array.from(
        newRoom.localParticipant.videoTrackPublications.values()
      );
      if (localVideoRef.current && videoPubs.length > 0) {
        const videoTrack = videoPubs[0];
        if (videoTrack.track) {
          videoTrack.track.attach(localVideoRef.current);
        }
      }

      setRoom(newRoom);
      setCallStatus("Connected");
      return newRoom;
    } catch (error: any) {
      console.error("Error setting up LiveKit room:", error);
      if (
        error?.name === "NotAllowedError" ||
        error?.name === "NotFoundError" ||
        error?.message?.toLowerCase().includes("permission")
      ) {
        setPermissionError(
          "Camera or microphone access was blocked. Please allow access in your browser and try again."
        );
        setShowPermissionGuide(true);
      } else {
        setCallStatus("Failed to connect");
      }
      throw error;
    }
  };

  // ----- LiveKit Event Handlers (UPDATED) -----

  const handleTrackSubscribed = (
    track: RemoteTrack,
    _publication: RemoteTrackPublication,
    _participant: RemoteParticipant
  ) => {
    if (track.kind === Track.Kind.Video) {
      if (track.source === Track.Source.ScreenShare) {
        if (screenShareRef.current) {
          track.attach(screenShareRef.current);
        } else {
          track.attach();
        }
        setRemoteScreenSharing(true);
      } else {
        if (remoteVideoRef.current) {
          track.attach(remoteVideoRef.current);
        } else {
          track.attach();
        }
      }
    } else if (track.kind === Track.Kind.Audio) {
      track.attach();
    }
  };

  const handleTrackUnsubscribed = (
    track: RemoteTrack,
    _publication: RemoteTrackPublication,
    _participant: RemoteParticipant
  ) => {
    track.detach();
    if (
      track.kind === Track.Kind.Video &&
      track.source === Track.Source.ScreenShare
    ) {
      setRemoteScreenSharing(false);
    }
  };

  const handleParticipantConnected = (participant: RemoteParticipant) => {
    console.log("Participant connected:", participant.identity);
    setCallStatus("Connected");
  };

  const handleParticipantDisconnected = (participant: RemoteParticipant) => {
    console.log("Participant disconnected:", participant.identity);
  };

  const handleDisconnected = () => {
    console.log("Disconnected from room");
    if (!hasEndedRef.current) {
      setCallStatus("Call ended");
      hasEndedRef.current = true;
      saveCallMessage(isConnected ? "completed" : "missed");
      setTimeout(() => {
        cleanup(true);
        onClose();
      }, 1200);
    }
  };

  // ----- Listen for incoming calls (for this 1:1 chat) -----

  const listenForIncomingCalls = () => {
    const callsRef = collection(db, "calls");
    const unsubscribe = onSnapshot(callsRef, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          if (
            data.to === currentUserId &&
            data.from === otherUserId &&
            !data.answered &&
            !data.ended
          ) {
            setIsReceivingCall(true);
            callDocIdRef.current = change.doc.id;
            setCallStatus(`Incoming call from ${otherUserName}...`);
            playIncomingRingtone();
          }
        }
      });
    });

    return unsubscribe;
  };

  // ----- Call flow -----

  const startCall = async () => {
    setIsCalling(true);
    setCallStatus("Calling...");
    playOutgoingRingtone();

    try {
      const callDoc = await addDoc(collection(db, "calls"), {
        from: currentUserId,
        fromName: currentUserName,
        to: otherUserId,
        toName: otherUserName,
        roomName: roomName,
        answered: false,
        ended: false,
        declined: false,
        timestamp: serverTimestamp(),
      });

      callDocIdRef.current = callDoc.id;
      hasEndedRef.current = false;

      await setupLiveKitRoom();

      await addDoc(collection(db, "notifications"), {
        userId: otherUserId,
        type: "video_call",
        title: "Incoming Video Call",
        message: `${currentUserName} is calling you`,
        callId: callDoc.id,
        senderId: currentUserId,
        senderName: currentUserName,
        timestamp: serverTimestamp(),
        read: false,
        actions: ["Answer", "Decline"],
      });

      setCallStatus("Ringing...");
    } catch (error) {
      console.error("Error starting call:", error);
      setCallStatus("Failed to start call");
      stopOutgoingRingtone();
      setIsCalling(false);
    }
  };

  const answerCall = async () => {
    if (!callDocIdRef.current) {
      setCallStatus("Call information not found");
      return;
    }

    setCallStatus("Connecting...");
    stopIncomingRingtone();
    setIsReceivingCall(false);
    hasEndedRef.current = false;

    try {
      await safeUpdateCall(callDocIdRef.current, {
        answered: true,
        answeredAt: serverTimestamp(),
      });

      await setupLiveKitRoom();
      setCallStatus("Connected");
    } catch (error) {
      console.error("Error answering call:", error);
      setCallStatus("Failed to answer call");
    }
  };

  const declineCall = async () => {
    stopIncomingRingtone();

    if (callDocIdRef.current) {
      try {
        await safeUpdateCall(callDocIdRef.current, {
          ended: true,
          declined: true,
          declinedAt: serverTimestamp(),
        });

        await saveCallMessage("rejected");

        setTimeout(async () => {
          if (callDocIdRef.current) {
            await safeDeleteCall(callDocIdRef.current);
          }
        }, 500);
      } catch (error) {
        console.error("Error declining call:", error);
      }
    }

    hasEndedRef.current = true;
    cleanup(true);
    onClose();
  };

  // ----- Controls -----

  const toggleMute = async () => {
    if (room) {
      const enabled = !room.localParticipant.isMicrophoneEnabled;
      await room.localParticipant.setMicrophoneEnabled(enabled);
      setIsMuted(!enabled);
    }
  };

  const toggleVideo = async () => {
    if (room) {
      const enabled = !room.localParticipant.isCameraEnabled;
      await room.localParticipant.setCameraEnabled(enabled);
      setIsVideoOff(!enabled);
    }
  };

  const toggleSpeaker = () => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = !remoteVideoRef.current.muted;
    }
    setIsSpeakerOff((v) => !v);
  };

  const toggleScreenShare = async () => {
    if (!room) return;

    try {
      if (isScreenSharing) {
        await room.localParticipant.setScreenShareEnabled(false);
        setIsScreenSharing(false);
      } else {
        await room.localParticipant.setScreenShareEnabled(true);
        setIsScreenSharing(true);
      }
    } catch (error) {
      console.error("Error toggling screen share:", error);
      alert("Failed to share screen. Please try again.");
    }
  };

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

  // ----- End call / cleanup -----

  const endCall = async () => {
    if (hasEndedRef.current) {
      cleanup(true);
      onClose();
      return;
    }

    hasEndedRef.current = true;

    if (callDocIdRef.current) {
      try {
        await safeUpdateCall(callDocIdRef.current, {
          ended: true,
          endedBy: currentUserId,
          endedAt: serverTimestamp(),
        });

        await saveCallMessage(isConnected ? "completed" : "cancelled");

        setTimeout(async () => {
          if (callDocIdRef.current) {
            await safeDeleteCall(callDocIdRef.current);
          }
        }, 500);
      } catch (error) {
        console.error("Error ending call:", error);
      }
    }

    cleanup(true);
    onClose();
  };

  const cleanup = (disconnectOnly = false) => {
    stopOutgoingRingtone();
    stopIncomingRingtone();

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
    setIsScreenSharing(false);
    setRemoteScreenSharing(false);
  };

  // ----- Permission instructions -----

  const getBrowserInstructions = () => {
    const userAgent =
      typeof navigator !== "undefined" ? navigator.userAgent.toLowerCase() : "";

    if (userAgent.includes("chrome")) {
      return "Chrome: Click the camera icon in the address bar or go to Settings > Privacy and security > Site settings > Camera/Microphone";
    } else if (userAgent.includes("firefox")) {
      return "Firefox: Click the permissions icon in the address bar or go to Settings > Privacy & Security > Permissions";
    } else if (userAgent.includes("safari")) {
      return "Safari: Go to Safari > Settings for This Website > Camera/Microphone";
    } else if (userAgent.includes("edge")) {
      return "Edge: Click the lock icon in the address bar or go to Settings > Cookies and site permissions";
    }

    return "Check your browser settings to allow camera and microphone access for this website";
  };

  const retryPermissions = () => {
    setPermissionError(null);
    setShowPermissionGuide(false);
    if (!room && (isCalling || isReceivingCall || isConnected)) {
      setupLiveKitRoom().catch(() => {});
    }
  };

  // ----- Render -----

  if (permissionError) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
            <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
          </div>

          <h2 className="text-xl font-bold text-center mb-2">
            Permission Required
          </h2>
          <p className="text-gray-600 text-center mb-4">{permissionError}</p>

          {showPermissionGuide && (
            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-700 font-semibold mb-2">
                How to enable:
              </p>
              <p className="text-sm text-gray-600">{getBrowserInstructions()}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={retryPermissions}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg"
            >
              Try Again
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-4 py-2 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  const minimizedStyle = minimized
    ? ({
        right: 16 + offset.x,
        bottom: 80 + offset.y,
        width: 280,
        height: 64,
      } as React.CSSProperties)
    : ({} as React.CSSProperties);

  return (
    <div
      className={`fixed z-50 flex flex-col ${
        minimized ? "bg-gray-900 rounded-lg shadow-2xl" : "inset-0 bg-black"
      }`}
      style={minimizedStyle}
    >
      {/* Header / drag handle */}
      <div
        ref={dragHandleRef}
        className={`flex items-center justify-between px-3 py-2 bg-gray-900 text-white ${
          minimized ? "cursor-move rounded-t-lg" : "cursor-default"
        }`}
      >
        <span className="text-xs sm:text-sm truncate">
          Video call with {otherUserName}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMinimized((v) => !v)}
            className="text-xs px-2 py-1 bg-gray-700 rounded flex items-center gap-1"
          >
            <ArrowsPointingOutIcon className="w-3 h-3" />
            {minimized ? "Maximize" : "Minimize"}
          </button>
          <button
            onClick={endCall}
            className="w-6 h-6 flex items-center justify-center bg-red-600 rounded-full"
          >
            <PhoneXMarkIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          <audio ref={outgoingAudioRef} src="/sounds/outgoing-call.mp3" loop />
          <audio ref={incomingAudioRef} src="/sounds/incoming-call.mp3" loop />

          <div className="flex-1 relative">
            {/* Main remote video */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />

            {/* Screen share display (remote) */}
            <video
              ref={screenShareRef}
              autoPlay
              playsInline
              className={
                remoteScreenSharing
                  ? "absolute inset-0 w-full h-full object-contain bg-black"
                  : "hidden"
              }
            />

            {isScreenSharing && (
              <div className="absolute top-20 left-4 bg-blue-500 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                <ComputerDesktopIcon className="w-3 h-3" />
                <span>You are sharing your screen</span>
              </div>
            )}

            {/* Local PiP */}
            <div className="absolute top-4 right-4 w-32 h-40 sm:w-48 sm:h-60 bg-gray-800 rounded-lg overflow-hidden shadow-2xl">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>

            {/* Call status */}
            <div className="absolute top-4 left-4 bg-black bg-opacity-60 px-4 py-2 rounded-lg">
              <p className="text-white text-sm font-medium">{callStatus}</p>
              <p className="text-gray-300 text-xs">{otherUserName}</p>
            </div>

            {uploadError && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500 text-white px-3 py-2 rounded shadow text-xs max-w-xs">
                {uploadError}
              </div>
            )}

            {/* Incoming call overlay (for receiver) */}
            {isReceivingCall && !isConnected && (
              <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center">
                <div className="bg-gray-900 text-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                  <p className="text-sm text-gray-300 mb-1">Incoming call</p>
                  <h2 className="text-xl font-semibold mb-4">
                    {otherUserName}
                  </h2>
                  <p className="text-xs text-gray-400 mb-6">{callStatus}</p>
                  <div className="flex items-center justify-center gap-6">
                    <button
                      onClick={answerCall}
                      className="flex flex-col items-center justify-center"
                    >
                      <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center mb-1">
                        <VideoCameraIcon className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-xs">Answer</span>
                    </button>
                    <button
                      onClick={declineCall}
                      className="flex flex-col items-center justify-center"
                    >
                      <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center mb-1">
                        <PhoneXMarkIcon className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-xs">Decline</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Chat Panel */}
            {showChat && (
              <div className="absolute right-4 top-20 bottom-24 w-80 bg-white rounded-lg shadow-2xl flex flex-col max-h-[calc(100vh-200px)]">
                <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
                  <h3 className="font-semibold text-gray-800">
                    Chat with {otherUserName}
                  </h3>
                  <button
                    onClick={() => setShowChat(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {chatMessages.length === 0 ? (
                    <p className="text-center text-gray-500 text-sm">
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
                          className={`max-w-[70%] rounded-lg px-3 py-2 ${
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
                          {msg.content && (
                            <p className="text-sm whitespace-pre-wrap break-words">
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
                  <div className="border-t p-3 bg-gray-50 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-600 truncate">
                        Selected: {selectedFile.name}
                      </p>
                      <button
                        onClick={cancelFileUpload}
                        className="text-xs text-red-500"
                      >
                        Remove
                      </button>
                    </div>
                    {filePreview && (
                      <img
                        src={filePreview}
                        alt="Preview"
                        className="max-h-32 rounded object-cover"
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
                      className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded disabled:opacity-60"
                    >
                      {uploading ? "Uploading..." : "Send"}
                    </button>
                  </div>
                )}

                {/* Chat input */}
                <div className="border-t p-3 flex items-center gap-2 flex-shrink-0">
                  <div className="relative">
                    <button
                      onClick={() => setShowAttachMenu((v) => !v)}
                      className="p-1.5 rounded-full hover:bg-gray-100 text-gray-600"
                    >
                      <PhotoIcon className="w-5 h-5" />
                    </button>
                    {showAttachMenu && (
                      <div className="absolute bottom-9 left-0 bg-white rounded shadow-lg border text-xs z-10">
                        <button
                          className="px-3 py-2 hover:bg-gray-100 w-full text-left"
                          onClick={() => {
                            fileInputRef.current?.click();
                          }}
                        >
                          Upload from device
                        </button>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(file);
                      }}
                    />
                  </div>

                  <input
                    type="text"
                    className="flex-1 border rounded-full px-3 py-1.5 text-sm"
                    placeholder="Type a message..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") sendChatMessage();
                    }}
                  />
                  <button
                    onClick={sendChatMessage}
                    className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-1.5"
                  >
                    <PaperAirplaneIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Bottom controls */}
            <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-3">
              {!isConnected && isCalling && (
                <p className="text-xs text-gray-300 mb-1">
                  Ringing {otherUserName}...
                </p>
              )}

              <div className="flex items-center justify-center gap-4 bg-black bg-opacity-40 rounded-full px-4 py-2">
                {/* Mute */}
                <button
                  onClick={toggleMute}
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isMuted ? "bg-red-600" : "bg-gray-800"
                  } text-white`}
                >
                  <MicrophoneIcon className="w-5 h-5" />
                </button>

                {/* Video */}
                <button
                  onClick={toggleVideo}
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isVideoOff ? "bg-red-600" : "bg-gray-800"
                  } text-white`}
                >
                  {isVideoOff ? (
                    <VideoCameraSlashIcon className="w-5 h-5" />
                  ) : (
                    <VideoCameraIcon className="w-5 h-5" />
                  )}
                </button>

                {/* Screen share */}
                <button
                  onClick={toggleScreenShare}
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isScreenSharing ? "bg-blue-600" : "bg-gray-800"
                  } text-white`}
                >
                  <ComputerDesktopIcon className="w-5 h-5" />
                </button>

                {/* Speaker */}
                <button
                  onClick={toggleSpeaker}
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isSpeakerOff ? "bg-red-600" : "bg-gray-800"
                  } text-white`}
                >
                  {isSpeakerOff ? (
                    <SpeakerXMarkIcon className="w-5 h-5" />
                  ) : (
                    <SpeakerWaveIcon className="w-5 h-5" />
                  )}
                </button>

                {/* Chat */}
                <button
                  onClick={() => setShowChat((v) => !v)}
                  className="relative w-10 h-10 rounded-full flex items-center justify-center bg-gray-800 text-white"
                >
                  <ChatBubbleLeftIcon className="w-5 h-5" />
                  {unreadCount > 0 && !showChat && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-[10px] text-white rounded-full px-1">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Start call (if not already) */}
                {!isConnected && !isCalling && !isReceivingCall && (
                  <button
                    onClick={startCall}
                    className="px-4 py-2 rounded-full bg-green-600 hover:bg-green-700 text-white text-sm font-semibold flex items-center gap-2"
                  >
                    <VideoCameraIcon className="w-4 h-4" />
                    Start Call
                  </button>
                )}

                {/* End call */}
                <button
                  onClick={endCall}
                  className="w-12 h-12 rounded-full flex items-center justify-center bg-red-600 text-white"
                >
                  <PhoneXMarkIcon className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
