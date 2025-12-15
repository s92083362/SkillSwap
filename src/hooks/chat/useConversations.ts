

import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebaseConfig';
import type { ConversationMeta } from '@/utils/types/chat.types';

export function useConversations(userId: string | undefined) {
  const [conversations, setConversations] = useState<ConversationMeta[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    
    const fetchConversations = async () => {
      try {
        const chatsSnapshot = await getDocs(collection(db, 'privateChats'));
        const userChats: ConversationMeta[] = [];
        
        for (const chatDoc of chatsSnapshot.docs) {
          const chatData = chatDoc.data() as any;
          if (chatData.participants?.includes(userId)) {
            const chatId = chatDoc.id;
            const otherUserId = chatData.participants.find(
              (id: string) => id !== userId
            ) as string;
            
            const unreadQueryRef = query(
              collection(db, 'messages'),
              where('receiverId', '==', userId),
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
        }
        
        userChats.sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime());
        setConversations(userChats);
        
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

    void fetchConversations();
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, [userId]);

  return { conversations, unreadCounts, setUnreadCounts, loading };
}

