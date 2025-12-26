import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebaseConfig';
import type { ConversationMeta } from '@/utils/types/chat.types';

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

    // Capture userId in closure to prevent stale reference issues
    const currentUserId = userId;
    
    const fetchConversations = async () => {
      // Double-check userId is still valid
      if (!currentUserId) return;
      
      try {
        // FIXED: Use a proper query with array-contains instead of fetching all chats
        const chatsQuery = query(
          collection(db, 'privateChats'),
          where('participants', 'array-contains', currentUserId)
        );
        
        const chatsSnapshot = await getDocs(chatsQuery);
        const userChats: ConversationMeta[] = [];
        
        for (const chatDoc of chatsSnapshot.docs) {
          const chatData = chatDoc.data() as any;
          const chatId = chatDoc.id;
          const otherUserId = chatData.participants.find(
            (id: string) => id !== currentUserId
          ) as string;
          
          // Skip if no other user found
          if (!otherUserId) continue;
          
          // Query unread messages from the other user
          const unreadQueryRef = query(
            collection(db, 'messages'),
            where('receiverId', '==', currentUserId),
            where('senderId', '==', otherUserId),
            where('read', '==', false)
          );
          const unreadSnapshot = await getDocs(unreadQueryRef);
          const unreadCount = unreadSnapshot.size;
          
          userChats.push({
            chatId,
            otherUserId,
            lastMessage: chatData.lastMessage || '',
            lastUpdated: chatData.lastUpdated?.toDate() || new Date(0),
            unreadCount,
          });
        }
        
        // Sort by most recent first
        userChats.sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime());
        setConversations(userChats);
        
        // Build unread counts map
        const counts: Record<string, number> = {};
        userChats.forEach((chat) => {
          counts[chat.otherUserId] = chat.unreadCount;
        });
        setUnreadCounts(counts);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching conversations:', error);
        setLoading(false);
      }
    };

    // Initial fetch
    fetchConversations().catch(err => {
      console.error('Error in fetchConversations:', err);
    });
    
    // Set up interval for periodic fetching
    const interval = setInterval(() => {
      // Check if userId is still valid before fetching
      if (currentUserId) {
        fetchConversations().catch(err => {
          console.error('Error in fetchConversations interval:', err);
        });
      }
    }, 10000);
    
    return () => clearInterval(interval);
  }, [userId]);

  return { conversations, unreadCounts, setUnreadCounts, loading };
}