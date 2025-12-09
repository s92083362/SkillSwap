import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
  DocumentData,
  orderBy,
} from "firebase/firestore";
import { db } from "../lib/firebase/firebaseConfig";

// Notification object interface
export interface Notification {
  id: string;
  type?: string;           // e.g., "swap_request", "chat", etc.
  title?: string;          // notification title
  message: string;         // notification message
  actions?: string[];      // e.g., ["View", "Dismiss"]
  senderId?: string;
  senderName?: string;     // Added
  senderEmail?: string;    // Added
  swapRequestId?: string;
  chatId?: string;
  timestamp?: Timestamp;   // Firestore timestamp (use createdAt or custom)
  read?: boolean;
}

// Hook to get real-time notifications for one user
export function useNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      return;
    }

    console.log("🔔 Setting up notifications listener for user:", userId);

    // Query for unread notifications on this user
    // Note: Removed orderBy to avoid index requirement
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      where("read", "==", false)
    );

    // Live snapshot listener
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newNotifs: Notification[] = [];
      snapshot.forEach((doc) => {
        const m = doc.data() as DocumentData;
        newNotifs.push({
          id: doc.id,
          type: m.type,
          title: m.title,
          message: m.message,
          actions: m.actions || (m.type === "swap_request" ? ["View"] : ["View"]),
          senderId: m.senderId || "",
          senderName: m.senderName || "",
          senderEmail: m.senderEmail || "",
          swapRequestId: m.swapRequestId || "",
          chatId: m.chatId || "",
          timestamp: m.timestamp || m.createdAt,
          read: m.read ?? false,
        });
      });
      
      // Sort in memory by timestamp (newest first)
      newNotifs.sort((a, b) => {
        const timeA = a.timestamp?.toMillis?.() || 0;
        const timeB = b.timestamp?.toMillis?.() || 0;
        return timeB - timeA;
      });
      
      console.log("🔔 Notifications updated:", newNotifs.length, newNotifs);
      setNotifications(newNotifs);
    }, (error) => {
      console.error("❌ Error listening to notifications:", error);
      setNotifications([]);
    });

    return unsubscribe;
  }, [userId]);

  return [notifications, setNotifications] as const;
}