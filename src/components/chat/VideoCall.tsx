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
} from "@heroicons/react/24/solid";
import { uploadChatFileToCloudinary } from "@/lib/cloudinary/uploadChatFile";

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
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isCalling, setIsCalling] = useState(false);
  const [isReceivingCall, setIsReceivingCall] = useState(false);
  const [callStatus, setCallStatus] = useState<string>("Initializing...");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerOff, setIsSpeakerOff] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [showPermissionGuide, setShowPermissionGuide] = useState(false);

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
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const callDocRef = useRef<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const outgoingAudioRef = useRef<HTMLAudioElement | null>(null);
  const incomingAudioRef = useRef<HTMLAudioElement | null>(null);

  const servers: RTCConfiguration = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
    ],
  };

  // Unified chatId
  const chatId = [currentUserId, otherUserId].sort().join("_");

  // ----- Effects -----

  useEffect(() => {
    setupMediaStream();
    const unsubscribeIncoming = listenForIncomingCalls();
    const unsubscribeCallStatus = listenForCallDisconnect();

    return () => {
      unsubscribeIncoming?.();
      unsubscribeCallStatus?.();
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (autoAnswer && isReceivingCall && localStream && callDocRef.current) {
      answerCall();
    }
  }, [autoAnswer, isReceivingCall, localStream]);

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

  // ----- Call disconnect listener -----

  const listenForCallDisconnect = () => {
    if (!callDocRef.current) return;

    const callDocRefLocal = doc(db, "calls", callDocRef.current);
    const unsubscribe = onSnapshot(callDocRefLocal, (snapshot) => {
      const data = snapshot.data();

      if (!snapshot.exists() || data?.ended) {
        setCallStatus("Call ended by other user");
        setTimeout(() => {
          cleanup();
          onClose();
        }, 1500);
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

  // ----- Media -----

  const setupMediaStream = async () => {
    try {
      setCallStatus("Requesting camera and microphone access...");

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Your browser doesn't support video calling");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      setCallStatus("Ready to call");
      setPermissionError(null);
    } catch (error: any) {
      console.error("Error accessing media devices:", error);

      let errorMessage = "Failed to access camera/microphone";

      if (
        error.name === "NotAllowedError" ||
        error.name === "PermissionDeniedError"
      ) {
        errorMessage =
          "Camera/microphone access denied. Please allow permissions in your browser settings.";
        setShowPermissionGuide(true);
      } else if (
        error.name === "NotFoundError" ||
        error.name === "DevicesNotFoundError"
      ) {
        errorMessage = "No camera or microphone found on your device";
      } else if (
        error.name === "NotReadableError" ||
        error.name === "TrackStartError"
      ) {
        errorMessage =
          "Camera/microphone is already in use by another application";
      } else if (error.name === "OverconstrainedError") {
        errorMessage = "Camera doesn't support the requested settings";
      } else if (error.name === "SecurityError") {
        errorMessage = "Video calling requires a secure connection (HTTPS)";
      } else if (error.message) {
        errorMessage = error.message;
      }

      setPermissionError(errorMessage);
      setCallStatus(errorMessage);
    }
  };

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
            callDocRef.current = change.doc.id;
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
    if (!localStream) {
      setCallStatus("Please allow camera/microphone access first");
      return;
    }

    setIsCalling(true);
    setCallStatus("Calling...");
    playOutgoingRingtone();

    try {
      const peerConnection = new RTCPeerConnection(servers);
      peerConnectionRef.current = peerConnection;

      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
      });

      peerConnection.ontrack = (event) => {
        const remote = event.streams[0];
        setRemoteStream(remote);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remote;
        }
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remote;
          remoteAudioRef.current.play().catch(() => {});
        }
        setCallStatus("Connected");
        stopOutgoingRingtone();
      };

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      const callDoc = await addDoc(collection(db, "calls"), {
        from: currentUserId,
        fromName: currentUserName,
        to: otherUserId,
        toName: otherUserName,
        offer: {
          type: offer.type,
          sdp: offer.sdp,
        },
        answered: false,
        ended: false,
        timestamp: serverTimestamp(),
      });

      callDocRef.current = callDoc.id;

      onSnapshot(doc(db, "calls", callDoc.id), async (snapshot) => {
        const data = snapshot.data();
        if (!snapshot.exists() || data?.ended) {
          setCallStatus("Call ended");
          setTimeout(() => {
            cleanup();
            onClose();
          }, 1500);
          return;
        }

        if (data?.answer && !peerConnection.currentRemoteDescription) {
          const answer = new RTCSessionDescription(data.answer);
          await peerConnection.setRemoteDescription(answer);
        }

        if (data?.answered) {
          setCallStatus("Call connected");
          stopOutgoingRingtone();
        }
      });

      const candidatesRef = collection(db, "calls", callDoc.id, "candidates");
      onSnapshot(candidatesRef, (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === "added") {
            const candidate = new RTCIceCandidate(change.doc.data());
            await peerConnection.addIceCandidate(candidate);
          }
        });
      });

      peerConnection.onicecandidate = async (event) => {
        if (event.candidate) {
          await addDoc(candidatesRef, event.candidate.toJSON());
        }
      };

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
    } catch (error) {
      console.error("Error starting call:", error);
      setCallStatus("Failed to start call");
      stopOutgoingRingtone();
    }
  };

  const answerCall = async () => {
    if (!localStream || !callDocRef.current) {
      setCallStatus("Please allow camera/microphone access first");
      return;
    }

    setCallStatus("Connecting...");
    stopIncomingRingtone();

    try {
      const peerConnection = new RTCPeerConnection(servers);
      peerConnectionRef.current = peerConnection;

      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
      });

      peerConnection.ontrack = (event) => {
        const remote = event.streams[0];
        setRemoteStream(remote);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remote;
        }
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remote;
          remoteAudioRef.current.play().catch(() => {});
        }
        setCallStatus("Connected");
      };

      const callDocRefLocal = doc(db, "calls", callDocRef.current);

      onSnapshot(callDocRefLocal, async (snapshot) => {
        const data = snapshot.data();
        if (!snapshot.exists() || data?.ended) {
          setCallStatus("Call ended");
          setTimeout(() => {
            cleanup();
            onClose();
          }, 1500);
          return;
        }

        if (!data || !data.offer) return;

        if (!peerConnection.currentRemoteDescription) {
          await peerConnection.setRemoteDescription(
            new RTCSessionDescription(data.offer)
          );

          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);

          await updateDoc(callDocRefLocal, {
            answer: {
              type: answer.type,
              sdp: answer.sdp,
            },
            answered: true,
          });
        }
      });

      const candidatesRef = collection(
        db,
        "calls",
        callDocRef.current!,
        "candidates"
      );
      onSnapshot(candidatesRef, (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === "added") {
            const candidate = new RTCIceCandidate(change.doc.data());
            await peerConnection.addIceCandidate(candidate);
          }
        });
      });

      peerConnection.onicecandidate = async (event) => {
        if (event.candidate) {
          await addDoc(candidatesRef, event.candidate.toJSON());
        }
      };

      setIsReceivingCall(false);
    } catch (error) {
      console.error("Error answering call:", error);
      setCallStatus("Failed to answer call");
    }
  };

  // ----- Controls -----

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted((v) => !v);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff((v) => !v);
    }
  };

  const toggleSpeaker = () => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = !remoteVideoRef.current.muted;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !remoteAudioRef.current.muted;
    }
    setIsSpeakerOff((v) => !v);
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
    if (callDocRef.current) {
      try {
        await updateDoc(doc(db, "calls", callDocRef.current), {
          ended: true,
        });

        setTimeout(async () => {
          try {
            await deleteDoc(doc(db, "calls", callDocRef.current!));
          } catch (error) {
            console.error("Error deleting call document:", error);
          }
        }, 500);
      } catch (error) {
        console.error("Error ending call:", error);
      }
    }
    cleanup();
    onClose();
  };

  const cleanup = () => {
    stopOutgoingRingtone();
    stopIncomingRingtone();
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setIsCalling(false);
    setIsReceivingCall(false);
    setRemoteStream(null);
  };

  // ----- Permission instructions -----

  const getBrowserInstructions = () => {
    const userAgent = navigator.userAgent.toLowerCase();

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
              <p className="text-sm text-gray-600">
                {getBrowserInstructions()}
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => {
                setPermissionError(null);
                setShowPermissionGuide(false);
                setupMediaStream();
              }}
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
            className="text-xs px-2 py-1 bg-gray-700 rounded"
          >
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
          <audio ref={remoteAudioRef} autoPlay />

          <div className="flex-1 relative">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />

            <div className="absolute top-4 right-4 w-32 h-40 sm:w-48 sm:h-60 bg-gray-800 rounded-lg overflow-hidden shadow-2xl">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>

            <div className="absolute top-4 left-4 bg-black bg-opacity-60 px-4 py-2 rounded-lg">
              <p className="text-white text-sm font-medium">{callStatus}</p>
              <p className="text-gray-300 text-xs">{otherUserName}</p>
            </div>

            {uploadError && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500 text-white px-3 py-2 rounded shadow text-xs max-w-xs">
                {uploadError}
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
                              className="text-xs underline block mb-1"
                            >
                              📎 {msg.fileName || "File"}
                            </a>
                          )}
                          {msg.content && (
                            <p className="text-sm break-words">
                              {msg.content}
                            </p>
                          )}
                          {msg.timestamp && (
                            <p className="text-xs opacity-70 mt-1">
                              {msg.timestamp.toDate?.()?.toLocaleTimeString?.(
                                [],
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div className="p-4 border-t flex-shrink-0">
                  {selectedFile && (
                    <div className="mb-3 bg-gray-50 border rounded-lg p-3 text-xs">
                      <div className="flex gap-2">
                        {filePreview ? (
                          <img
                            src={filePreview}
                            alt="Preview"
                            className="w-12 h-12 object-cover rounded flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                            <span>📄</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {selectedFile.name}
                          </p>
                          <p className="text-gray-500 mt-1">
                            {(selectedFile.size / 1024).toFixed(1)} KB
                          </p>
                          <input
                            type="text"
                            placeholder="Add a caption..."
                            value={fileCaption}
                            onChange={(e) => setFileCaption(e.target.value)}
                            className="mt-1 w-full border rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={cancelFileUpload}
                          className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <button
                          type="button"
                          onClick={sendFileMessage}
                          disabled={uploading}
                          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded text-xs disabled:opacity-50"
                        >
                          {uploading ? "Sending..." : "Send file"}
                        </button>
                        <button
                          type="button"
                          onClick={cancelFileUpload}
                          className="px-3 py-1.5 border rounded text-xs hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      sendChatMessage();
                    }}
                    className="flex gap-2"
                  >
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowAttachMenu((v) => !v)}
                        disabled={uploading || !!selectedFile}
                        className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 text-lg disabled:opacity-50"
                      >
                        +
                      </button>
                      {showAttachMenu && (
                        <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-lg border py-2 w-40 z-10">
                          <button
                            type="button"
                            onClick={() => {
                              fileInputRef.current?.setAttribute(
                                "accept",
                                "*/*"
                              );
                              fileInputRef.current?.click();
                              setShowAttachMenu(false);
                            }}
                            className="w-full px-3 py-2 hover:bg-gray-50 flex items-center gap-2 text-left text-xs"
                          >
                            <span>📁</span>
                            <span>File</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              fileInputRef.current?.setAttribute(
                                "accept",
                                "image/*,video/*"
                              );
                              fileInputRef.current?.click();
                              setShowAttachMenu(false);
                            }}
                            className="w-full px-3 py-2 hover:bg-gray-50 flex items-center gap-2 text-left text-xs"
                          >
                            <span className="w-4 h-4 text-blue-400">
                              <PhotoIcon />
                            </span>
                            <span>Photos & Videos</span>
                          </button>
                        </div>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileSelect(file);
                            e.target.value = "";
                          }
                        }}
                      />
                    </div>

                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Type a message..."
                      disabled={uploading || !!selectedFile}
                      className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500 text-sm text-gray-800"
                    />
                    <button
                      type="submit"
                      disabled={!chatInput.trim() || uploading || !!selectedFile}
                      className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white p-2 rounded-lg"
                    >
                      <PaperAirplaneIcon className="w-5 h-5" />
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Incoming overlay */}
            {isReceivingCall && (
              <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 rounded-full bg-blue-500 mx-auto mb-4 flex items-center justify-center">
                    <VideoCameraIcon className="w-12 h-12 text-white" />
                  </div>
                  <h2 className="text-white text-2xl font-bold mb-2">
                    Incoming Call
                  </h2>
                  <p className="text-gray-300 mb-6">{otherUserName}</p>
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={answerCall}
                      className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-full font-semibold flex items-center gap-2"
                    >
                      <VideoCameraIcon className="w-6 h-6" />
                      Answer
                    </button>
                    <button
                      onClick={endCall}
                      className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-full font-semibold flex items-center gap-2"
                    >
                      <PhoneXMarkIcon className="w-6 h-6" />
                      Decline
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom controls */}
          <div className="bg-gray-900 p-4 sm:p-6">
            <div className="max-w-4xl mx-auto flex justify-center items-center gap-4">
              <button
                onClick={toggleMute}
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all ${
                  isMuted
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-gray-700 hover:bg-gray-600"
                }`}
              >
                <MicrophoneIcon
                  className={`w-6 h-6 ${
                    isMuted ? "text-white line-through" : "text-white"
                  }`}
                />
              </button>

              <button
                onClick={toggleVideo}
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all ${
                  isVideoOff
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-gray-700 hover:bg-gray-600"
                }`}
              >
                {isVideoOff ? (
                  <VideoCameraSlashIcon className="w-6 h-6 text-white" />
                ) : (
                  <VideoCameraIcon className="w-6 h-6 text-white" />
                )}
              </button>

              {(remoteStream || isCalling) && (
                <button
                  onClick={() => setShowChat((v) => !v)}
                  className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-all"
                >
                  <ChatBubbleLeftIcon className="w-6 h-6 text-white" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                      {unreadCount}
                    </span>
                  )}
                </button>
              )}

              {!isCalling && !isReceivingCall && localStream && (
                <button
                  onClick={startCall}
                  className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-full font-semibold flex items-center gap-2"
                >
                  <VideoCameraIcon className="w-6 h-6" />
                  Call
                </button>
              )}

              {(isCalling || remoteStream) && !isReceivingCall && (
                <button
                  onClick={endCall}
                  className="bg-red-500 hover:bg-red-600 text-white w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all"
                >
                  <PhoneXMarkIcon className="w-6 h-6" />
                </button>
              )}

              <button
                onClick={toggleSpeaker}
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all ${
                  isSpeakerOff
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-gray-700 hover:bg-gray-600"
                }`}
              >
                {isSpeakerOff ? (
                  <SpeakerXMarkIcon className="w-6 h-6 text-white" />
                ) : (
                  <SpeakerWaveIcon className="w-6 h-6 text-white" />
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
