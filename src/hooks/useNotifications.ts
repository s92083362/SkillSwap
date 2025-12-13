import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
  DocumentData,
} from "firebase/firestore";
import { db } from "../lib/firebase/firebaseConfig";

// Shared Notification type used by Header + NotificationList
export interface Notification {
  id: string;                 // Firestore doc id
  type?: string;              // "swap_request" | "chat" | "message" | "video_call" | ...
  title?: string;             // notification title
  message: string;            // main message text
  actions?: string[];         // e.g. ["View"], ["Approve", "Reject"]
  senderId?: string;
  senderName?: string;
  senderEmail?: string;
  userId?: string;            // target user
  swapRequestId?: string;
  chatId?: string;
  callId?: string;            // used for video/audio call notifications
  timestamp?: Timestamp;      // createdAt / timestamp field
  read?: boolean;
}

/**
 * Real‑time notifications hook for a single user.
 * Returns [notifications, setNotifications].
 */
export function useNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      return;
    }

    // Query unread notifications for this user
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      where("read", "==", false)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const newNotifs: Notification[] = [];

        snapshot.forEach((docSnap) => {
          const m = docSnap.data() as DocumentData;

          newNotifs.push({
            id: docSnap.id,
            type: m.type,
            title: m.title,
            message: m.message ?? "",
            actions:
              m.actions ||
              (m.type === "swap_request"
                ? ["View"]
                : ["View"]),
            senderId: m.senderId || "",
            senderName: m.senderName || "",
            senderEmail: m.senderEmail || "",
            userId: m.userId || "",
            swapRequestId: m.swapRequestId || "",
            chatId: m.chatId || "",
            callId: m.callId || "",
            timestamp: (m.timestamp || m.createdAt) as Timestamp | undefined,
            read: m.read ?? false,
          });
        });

        // Sort newest first by timestamp
        newNotifs.sort((a, b) => {
          const timeA = a.timestamp?.toMillis?.() ?? 0;
          const timeB = b.timestamp?.toMillis?.() ?? 0;
          return timeB - timeA;
        });

        setNotifications(newNotifs);
      },
      (error) => {
        console.error("❌ Error listening to notifications:", error);
        setNotifications([]);
      }
    );

    return unsubscribe;
  }, [userId]);

  // Tuple return so TS knows shape: [Notification[], React.Dispatch<...>]
  return [notifications, setNotifications] as const;
}
