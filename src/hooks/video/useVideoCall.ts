"use client";

import { useState, useEffect, useRef } from "react";
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
import { uploadChatFileToCloudinary } from "@/lib/cloudinary/uploadChatFile";
import { getLiveKitToken } from "@/app/actions/getLiveKitToken";
import {
  Room,
  RoomEvent,
  RemoteParticipant,
  RemoteTrackPublication,
  RemoteTrack,
  Track,
  LocalTrackPublication,
} from "livekit-client";

export interface VideoCallHookArgs {
  currentUserId: string;
  currentUserName: string;
  otherUserId: string;
  otherUserName: string;
  onClose: () => void;
  autoAnswer?: boolean;
}

export function useVideoCall({
  currentUserId,
  currentUserName,
  otherUserId,
  otherUserName,
  onClose,
  autoAnswer = false,
}: VideoCallHookArgs) {
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
  const [remoteScreenSharing, setRemoteScreenSharing] = useState(false);
  const [remoteScreenSharerName, setRemoteScreenSharerName] =
    useState<string | null>(null);

  // Chat state
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
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

  const hasEndedRef = useRef(false);
  const callStatusUnsubscribeRef = useRef<(() => void) | null>(null);

  // Unified chatId / roomName
  const chatId = [currentUserId, otherUserId].sort().join("_");
  const roomName = chatId;

  // ----- Helpers for safe call doc updates -----

  const safeUpdateCall = async (callId: string, data: any) => {
    try {
      const ref = doc(db, "calls", callId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      await updateDoc(ref, data);
    } catch (error) {
      console.error("Error updating call doc:", error);
    }
  };

  const safeDeleteCall = async (callId: string) => {
    try {
      const ref = doc(db, "calls", callId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      await deleteDoc(ref);
    } catch (error) {
      console.error("Error deleting call doc:", error);
    }
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

  // ----- Listen for call disconnect (other side ends) -----
  const listenForCallDisconnect = () => {
    if (!callDocIdRef.current) return;

    const callRef = doc(db, "calls", callDocIdRef.current);
    const unsubscribe = onSnapshot(callRef, (snapshot) => {
      const data = snapshot.data();

      if (!snapshot.exists() || data?.ended) {
        if (!hasEndedRef.current) {
          hasEndedRef.current = true;
          setCallStatus("Call ended");

          saveCallMessage(isConnected ? "completed" : "missed");

          setTimeout(() => {
            cleanup(true);
            onClose();
          }, 1500);
        }
      }
    });

    callStatusUnsubscribeRef.current = unsubscribe;
    return unsubscribe;
  };

  // ----- Listen for incoming calls -----

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

  // ----- Effects -----

  useEffect(() => {
    const unsubscribeIncoming = listenForIncomingCalls();

    return () => {
      unsubscribeIncoming?.();
      if (callStatusUnsubscribeRef.current) {
        callStatusUnsubscribeRef.current();
      }
      cleanup(true);
    };
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

  // ----- Local screen share view (attach local screen track) -----

  useEffect(() => {
    if (!room) return;

    const updateLocalScreenShareView = (
      _pub?: LocalTrackPublication | RemoteTrackPublication
    ) => {
      const screenPub = Array.from(
        room.localParticipant.videoTrackPublications.values()
      ).find((pub) => pub.source === Track.Source.ScreenShare);

      if (screenShareRef.current && screenPub?.track) {
        screenPub.track.attach(screenShareRef.current);
      }
    };

    updateLocalScreenShareView();

    room.localParticipant.on(
      RoomEvent.LocalTrackPublished,
      updateLocalScreenShareView as any
    );
    room.localParticipant.on(
      RoomEvent.LocalTrackUnpublished,
      updateLocalScreenShareView as any
    );

    return () => {
      room.localParticipant.off(
        RoomEvent.LocalTrackPublished,
        updateLocalScreenShareView as any
      );
      room.localParticipant.off(
        RoomEvent.LocalTrackUnpublished,
        updateLocalScreenShareView as any
      );
    };
  }, [room, isScreenSharing]);

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
      newRoom.on(
        RoomEvent.ParticipantDisconnected,
        handleParticipantDisconnected
      );
      newRoom.on(RoomEvent.Disconnected, handleDisconnected);
      newRoom.on(RoomEvent.Connected, () => {
        setIsConnected(true);
        setCallStatus("Connected");
        stopOutgoingRingtone();
        stopIncomingRingtone();
      });

      const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
      if (!wsUrl) throw new Error("Missing NEXT_PUBLIC_LIVEKIT_URL");

      await newRoom.connect(wsUrl, token);
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

      listenForCallDisconnect();

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

  // ----- LiveKit Event Handlers -----

  const handleTrackSubscribed = (
    track: RemoteTrack,
    _publication: RemoteTrackPublication,
    participant: RemoteParticipant
  ) => {
    if (track.kind === Track.Kind.Video) {
      if (track.source === Track.Source.ScreenShare) {
        if (screenShareRef.current) {
          track.attach(screenShareRef.current);
        } else {
          track.attach();
        }
        setRemoteScreenSharing(true);
        setRemoteScreenSharerName(participant.name || participant.identity);

        addDoc(collection(db, "privateChats", chatId, "messages"), {
          senderId: participant.identity,
          senderName: participant.name || otherUserName,
          content: `${
            participant.name || otherUserName
          } started sharing the screen`,
          type: "system",
          timestamp: serverTimestamp(),
        }).catch(() => {});
      } else {
        if (!remoteScreenSharing && remoteVideoRef.current) {
          track.attach(remoteVideoRef.current);
        } else if (!remoteScreenSharing) {
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
    participant: RemoteParticipant
  ) => {
    track.detach();
    if (
      track.kind === Track.Kind.Video &&
      track.source === Track.Source.ScreenShare
    ) {
      setRemoteScreenSharing(false);

      addDoc(collection(db, "privateChats", chatId, "messages"), {
        senderId: participant.identity,
        senderName: participant.name || otherUserName,
        content: `${
          participant.name || otherUserName
        } stopped sharing the screen`,
        type: "system",
        timestamp: serverTimestamp(),
      }).catch(() => {});
    }
  };

  const handleParticipantConnected = (participant: RemoteParticipant) => {
    console.log("Participant connected:", participant.identity);
    setCallStatus("Connected");
  };

  const handleParticipantDisconnected = (participant: RemoteParticipant) => {
    console.log("Participant disconnected:", participant.identity);

    if (!hasEndedRef.current) {
      hasEndedRef.current = true;
      setCallStatus("Call ended");
      saveCallMessage(isConnected ? "completed" : "missed");

      setTimeout(() => {
        cleanup(true);
        onClose();
      }, 1500);
    }
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

        await addDoc(collection(db, "privateChats", chatId, "messages"), {
          senderId: currentUserId,
          senderName: currentUserName,
          content: `${currentUserName} stopped sharing the screen`,
          type: "system",
          timestamp: serverTimestamp(),
        });
      } else {
        await room.localParticipant.setScreenShareEnabled(true);
        setIsScreenSharing(true);

        await addDoc(collection(db, "privateChats", chatId, "messages"), {
          senderId: currentUserId,
          senderName: currentUserName,
          content: `${currentUserName} started sharing the screen`,
          type: "system",
          timestamp: serverTimestamp(),
        });
      }
    } catch (error: any) {
      console.error("Error toggling screen share:", error);

      let message = "Failed to share screen. Please try again.";
      if (error?.name === "NotAllowedError") {
        message =
          "Screen share was blocked by the browser. Please allow screen sharing and try again.";
      } else if (error?.name === "NotFoundError") {
        message =
          "No screen/window was selected. Please select a screen or window and try again.";
      } else if (
        typeof window !== "undefined" &&
        window.location.protocol !== "https:"
      ) {
        message =
          "Screen sharing requires HTTPS (or http://localhost). Please run the app over HTTPS.";
      }

      alert(message);
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
        }, 1000);
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

    if (callStatusUnsubscribeRef.current) {
      callStatusUnsubscribeRef.current();
      callStatusUnsubscribeRef.current = null;
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

  // ----- Return all data for JSX -----

  return {
    // state
    isCalling,
    isReceivingCall,
    callStatus,
    isMuted,
    isVideoOff,
    isSpeakerOff,
    isScreenSharing,
    permissionError,
    showPermissionGuide,
    isConnected,
    remoteScreenSharing,
    remoteScreenSharerName,
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
    minimized,
    offset,

    // refs
    dragHandleRef,
    localVideoRef,
    remoteVideoRef,
    screenShareRef,
    chatEndRef,
    fileInputRef,
    outgoingAudioRef,
    incomingAudioRef,

    // actions / helpers
    setShowChat,
    setUnreadCount,
    setShowAttachMenu,
    setFileCaption,
    setChatInput,
    setMinimized,
    setOffset,
    retryPermissions,
    toggleMute,
    toggleVideo,
    toggleSpeaker,
    toggleScreenShare,
    sendChatMessage,
    handleFileSelect,
    cancelFileUpload,
    sendFileMessage,
    startCall,
    answerCall,
    declineCall,
    endCall,
    getBrowserInstructions,
  };
}
