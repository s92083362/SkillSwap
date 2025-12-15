import { 
    addDoc, 
    collection, 
    setDoc, 
    doc, 
    serverTimestamp,
    query,
    where,
    getDocs
  } from 'firebase/firestore';
  import { db } from '@/lib/firebase/firebaseConfig';
  import type { ChatUser } from '@/utils/types/chat.types';
  import { uploadChatFileToCloudinary } from '@/lib/cloudinary/uploadChatFile';
  
  export async function sendTextMessage(
    user: ChatUser,
    selectedUser: ChatUser,
    text: string,
    chatId: string
  ): Promise<void> {
    try {
      await addDoc(collection(db, 'privateChats', chatId, 'messages'), {
        senderId: user.uid,
        senderName: user.displayName || 'Anonymous',
        content: text,
        type: 'text',
        fileUrl: null,
        fileName: null,
        timestamp: serverTimestamp(),
      });
  
      await addDoc(collection(db, 'messages'), {
        senderId: user.uid,
        senderName: user.displayName || 'Anonymous',
        receiverId: selectedUser.uid,
        content: text,
        type: 'text',
        fileUrl: null,
        conversationId: chatId,
        timestamp: serverTimestamp(),
        read: false,
      });
  
      await addDoc(collection(db, 'notifications'), {
        userId: selectedUser.uid,
        type: 'chat',
        title: 'New Message',
        message: `${user.displayName || 'Someone'} sent you a message: "${text.substring(
          0,
          50
        )}${text.length > 50 ? '...' : ''}"`,
        chatId,
        senderId: user.uid,
        senderName: user.displayName || user.email || 'Anonymous',
        senderEmail: user.email,
        timestamp: serverTimestamp(),
        read: false,
        actions: ['View'],
      });
  
      await setDoc(
        doc(db, 'privateChats', chatId),
        {
          lastMessage: text,
          lastUpdated: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error('❌ Error sending message:', error);
      throw error;
    }
  }
  
  export async function sendFileMessage(
    user: ChatUser,
    selectedUser: ChatUser,
    file: File,
    caption: string,
    chatId: string
  ): Promise<void> {
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error('File size must be less than 10MB');
    }
  
    try {
      const { url, resourceType } = await uploadChatFileToCloudinary(file);
      const isImage = resourceType === 'image' && file.type.startsWith('image/');
      const displayContent = caption || (isImage ? '' : file.name);
      const type: 'image' | 'file' = isImage ? 'image' : 'file';
  
      await addDoc(collection(db, 'privateChats', chatId, 'messages'), {
        senderId: user.uid,
        senderName: user.displayName || 'Anonymous',
        content: displayContent,
        type,
        fileUrl: url,
        fileName: file.name,
        timestamp: serverTimestamp(),
      });
  
      await addDoc(collection(db, 'messages'), {
        senderId: user.uid,
        senderName: user.displayName || 'Anonymous',
        receiverId: selectedUser.uid,
        content: displayContent,
        type,
        fileUrl: url,
        conversationId: chatId,
        timestamp: serverTimestamp(),
        read: false,
      });
  
      await addDoc(collection(db, 'notifications'), {
        userId: selectedUser.uid,
        type: 'chat',
        title: isImage ? 'New Photo' : 'New File',
        message: `${user.displayName || 'Someone'} sent you a ${
          isImage ? 'photo' : 'file'
        }.`,
        chatId,
        senderId: user.uid,
        senderName: user.displayName || user.email || 'Anonymous',
        senderEmail: user.email,
        timestamp: serverTimestamp(),
        read: false,
        actions: ['View'],
      });
  
      await setDoc(
        doc(db, 'privateChats', chatId),
        {
          lastMessage: isImage ? '📷 Photo' : `📎 ${file.name}`,
          lastUpdated: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error('❌ Error sending file message:', error);
      throw error;
    }
  }
  
  export async function markMessagesAsRead(
    userId: string,
    otherUserId: string
  ): Promise<void> {
    try {
      const unreadQueryRef = query(
        collection(db, 'messages'),
        where('receiverId', '==', userId),
        where('senderId', '==', otherUserId),
        where('read', '==', false)
      );
      const unreadSnapshot = await getDocs(unreadQueryRef);
      const updatePromises = unreadSnapshot.docs.map((msgDoc) =>
        setDoc(
          doc(db, 'messages', msgDoc.id),
          { read: true },
          { merge: true }
        )
      );
      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  }