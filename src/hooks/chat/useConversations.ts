import { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseConfig";
import type { ConversationMeta } from "@/utils/types/chat.types";

export function useConversations(userId: string | undefined) {
  const [conversations, setConversations] = useState<ConversationMeta[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      setConversations([]);
      setUnreadCounts({});
      return;
    }

    const currentUserId = userId;
    let isMounted = true;
    let hasDoneInitialFetch = false;

    const fetchConversations = async () => {
      if (!currentUserId || !isMounted) return;

      // Only show loading spinner on very first fetch
      if (!hasDoneInitialFetch) {
        setLoading(true);
      }

      try {
        const chatsQuery = query(
          collection(db, "privateChats"),
          where("participants", "array-contains", currentUserId)
        );

        const chatsSnapshot = await getDocs(chatsQuery);
        if (!isMounted) return;

        const userChats: ConversationMeta[] = [];

        for (const chatDoc of chatsSnapshot.docs) {
          const chatData = chatDoc.data() as any;
          const chatId = chatDoc.id;
          const otherUserId = chatData.participants.find(
            (id: string) => id !== currentUserId
          ) as string;

          if (!otherUserId) continue;

          const unreadQueryRef = query(
            collection(db, "messages"),
            where("receiverId", "==", currentUserId),
            where("senderId", "==", otherUserId),
            where("read", "==", false)
          );
          const unreadSnapshot = await getDocs(unreadQueryRef);
          if (!isMounted) return;

          const unreadCount = unreadSnapshot.size;

          userChats.push({
            chatId,
            otherUserId,
            lastMessage: chatData.lastMessage || "",
            lastUpdated: chatData.lastUpdated?.toDate() || new Date(0),
            unreadCount,
          });
        }

        userChats.sort(
          (a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime()
        );
        setConversations(userChats);

        const counts: Record<string, number> = {};
        userChats.forEach((chat) => {
          counts[chat.otherUserId] = chat.unreadCount;
        });
        setUnreadCounts(counts);
      } catch (error) {
        console.error("Error fetching conversations:", error);
      } finally {
        if (!isMounted) return;
        setLoading(false);         // spinner ends as soon as first fetch finishes
        hasDoneInitialFetch = true;
      }
    };

    // Initial fetch
    fetchConversations().catch((err) => {
      console.error("Error in fetchConversations:", err);
    });

    // Periodic refresh every 10s without blocking UI spinner
    const interval = setInterval(() => {
      if (currentUserId) {
        fetchConversations().catch((err) => {
          console.error("Error in fetchConversations interval:", err);
        });
      }
    }, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [userId]);

  return { conversations, unreadCounts, setUnreadCounts, loading };
}
