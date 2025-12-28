"use client";

import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase/firebaseConfig";
import {
  collection,
  addDoc,
  doc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  getDoc,
  query,
  where,
} from "firebase/firestore";
import { getLiveKitToken } from "@/lib/livekit/getLiveKitToken";
import {
  Room,
  RoomEvent,
  RemoteParticipant,
  RemoteTrackPublication,
  RemoteTrack,
  Track,
  LocalTrackPublication,
} from "livekit-client";
import { usePresenceAndChat } from "@/hooks/chat/usePresenceAndChat";

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
  // shared presence + chat + files + draggable UI
  const {
    chatId,
    isReceiverOnline,
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
    dragHandleRef,
    chatEndRef,
    fileInputRef,
    setShowChat,
    setChatInput,
    setUnreadCount,
    setShowAttachMenu,
    setFileCaption,
    setMinimized,
    setOffset,
    handleFileSelect,
    cancelFileUpload,
    sendFileMessage,
    sendChatMessage,
  } = usePresenceAndChat(
    currentUserId,
    currentUserName,
    otherUserId,
    otherUserName
  );

  // LiveKit / call state
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

  // media refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const screenShareRef = useRef<HTMLVideoElement>(null);
  const outgoingAudioRef = useRef<HTMLAudioElement | null>(null);
  const incomingAudioRef = useRef<HTMLAudioElement | null>(null);

  // signaling refs
  const callDocIdRef = useRef<string | null>(null);
  const hasEndedRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isOutgoingCallRef = useRef(false);

  // ✅ Store unsubscribe functions to prevent permission errors
  const unsubIncomingRef = useRef<(() => void) | null>(null);
  const unsubDisconnectRef = useRef<(() => void) | null>(null);

  // LiveKit room name = chatId
  const roomName = chatId;

  // ---------- Firestore helpers ----------

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

  // ---------- Firestore listeners ----------

  // ✅ FIXED: Better error handling with permission-denied handling
  const listenForCallDisconnect = () => {
    let intervalId: ReturnType<typeof setInterval> | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const attach = (callId: string) => {
      const callRef = doc(db, "calls", callId);
      const unsubscribe = onSnapshot(
        callRef,
        (snapshot) => {
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
        },
        (error) => {
          // Silently handle permission errors - they're expected when call doc is deleted
          if (error.code === 'permission-denied') {
            if (!hasEndedRef.current) {
              hasEndedRef.current = true;
              setTimeout(() => {
                cleanup(true);
                onClose();
              }, 100);
            }
          } else {
            console.error("Unexpected error listening to call:", error);
          }
        }
      );

      unsubDisconnectRef.current = unsubscribe;
      return unsubscribe;
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
      
      timeoutId = setTimeout(() => {
        if (intervalId) clearInterval(intervalId);
      }, 5000);
    }
    
    return () => {
      if (unsubDisconnectRef.current) {
        unsubDisconnectRef.current();
        unsubDisconnectRef.current = null;
      }
      if (intervalId) clearInterval(intervalId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  };

  // ✅ FIXED: Use query with proper filters instead of listening to all calls
  const listenForIncomingCalls = () => {
    const callsRef = collection(db, "calls");
    
    // Query only calls meant for current user
    const q = query(
      callsRef,
      where('to', '==', currentUserId),
      where('answered', '==', false),
      where('ended', '==', false)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const data = change.doc.data();
            
            // Additional filter: only from the specific user we're talking to
            if (data.from === otherUserId && data.callType !== 'audio') {
              setIsReceivingCall(true);
              isOutgoingCallRef.current = false;
              callDocIdRef.current = change.doc.id;
              setCallStatus(`Incoming call from ${otherUserName}...`);
              playIncomingRingtone();
            }
          }
        });
      },
      (error) => {
        console.error("Error listening for incoming calls:", error);
      }
    );

    unsubIncomingRef.current = unsubscribe;
    return unsubscribe;
  };

  // ✅ FIXED: Store unsubscribe functions in refs
  useEffect(() => {
    const unsubscribeIncoming = listenForIncomingCalls();

    return () => {
      unsubscribeIncoming?.();
      if (unsubDisconnectRef.current) {
        unsubDisconnectRef.current();
        unsubDisconnectRef.current = null;
      }
      cleanup(true);
    };
  }, [currentUserId, otherUserId]); // Added dependencies

  // auto-answer
  useEffect(() => {
    if (autoAnswer && isReceivingCall && callDocIdRef.current) {
      answerCall();
    }
  }, [autoAnswer, isReceivingCall]);

  // reflect presence in status for outgoing calls
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

  // local screen share preview
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

  // ---------- Ringtones ----------

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

  // ---------- LiveKit room setup ----------

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
          resolution: { width: 1280, height: 720 },
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

      // mark connected when remote joins
      newRoom.on(RoomEvent.ParticipantConnected, () => {
        setIsConnected(true);
        setCallStatus("Connected");
        stopOutgoingRingtone();
        stopIncomingRingtone();
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      });

      newRoom.on(RoomEvent.Connected, async () => {
        if (!isOutgoingCallRef.current) {
          stopIncomingRingtone();
        }
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

  // ---------- LiveKit event handlers ----------

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
    setIsConnected(true);
    setCallStatus("Connected");
    stopOutgoingRingtone();
    stopIncomingRingtone();
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
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

  // ---------- Call flow ----------

  const startCall = async () => {
    setIsCalling(true);
    isOutgoingCallRef.current = true;

    if (isReceiverOnline === true) {
      setCallStatus("Ringing...");
    } else {
      setCallStatus("Calling...");
    }

    playOutgoingRingtone();

    try {
      const callDoc = await addDoc(collection(db, "calls"), {
        from: currentUserId,
        fromName: currentUserName,
        to: otherUserId,
        toName: otherUserName,
        roomName,
        callType: "video",
        answered: false,
        ended: false,
        declined: false,
        timestamp: serverTimestamp(),
        calleeOnlineAtDial: isReceiverOnline === true,
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
      setIsConnected(true);
    } catch (error) {
      console.error("Error answering call:", error);
      setCallStatus("Failed to answer call");
    }
  };

  // ✅ FIXED: Unsubscribe before updating/deleting
  const declineCall = async () => {
    stopIncomingRingtone();

    // Unsubscribe BEFORE updating/deleting to prevent permission errors
    if (unsubDisconnectRef.current) {
      unsubDisconnectRef.current();
      unsubDisconnectRef.current = null;
    }

    if (callDocIdRef.current) {
      try {
        await safeUpdateCall(callDocIdRef.current, {
          ended: true,
          declined: true,
          declinedAt: serverTimestamp(),
          endedBy: currentUserId,
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

  // ✅ FIXED: Unsubscribe before updating/deleting
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

  // ---------- Controls ----------

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

  // ---------- Cleanup & permissions ----------

  const cleanup = (disconnectOnly = false) => {
    stopOutgoingRingtone();
    stopIncomingRingtone();

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (unsubDisconnectRef.current) {
      unsubDisconnectRef.current();
      unsubDisconnectRef.current = null;
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

  // ---------- Returned API ----------

  return {
    // call state
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

    // presence + chat
    isReceiverOnline,
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

    // actions
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