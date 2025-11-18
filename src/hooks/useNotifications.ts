import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "../lib/firebase/firebaseConfig";

export interface Notification {
  id: string | number;
  message: string;
  actions?: string[];
  senderId?: string;
  chatId?: string;
  timestamp?: Timestamp;
}

export function useNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      return;
    }

    const q = query(
      collection(db, "messages"),
      where("receiverId", "==", userId),
      where("read", "==", false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newNotifs: Notification[] = [];
      snapshot.forEach(doc => {
        const m = doc.data();
        newNotifs.push({
          id: doc.id,
          message: `New message from ${m.senderName || m.senderId || 'Someone'}: ${(m.content || m.text || '').substring(0, 50)}${(m.content || m.text || '').length > 50 ? '...' : ''}`,
          actions: ["View"],
          senderId: m.senderId || m.sender || "",
          chatId: m.conversationId || m.chatId || "",
          timestamp: m.timestamp
        });
      });
      setNotifications(newNotifs);
    }, (error) => {
      console.error("❌ Error listening to notifications:", error);
    });
    return unsubscribe;
  }, [userId]);

  return [notifications, setNotifications] as const;
}
