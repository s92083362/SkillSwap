'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  setDoc,
  doc,
  where,
  getDocs,
} from 'firebase/firestore';
import {
  collection as fsCollection,
  query as fsQuery,
  where as fsWhere,
  onSnapshot as fsOnSnapshot,
  updateDoc,
} from 'firebase/firestore';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { db } from '../../../lib/firebase/firebaseConfig';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useTrackUserActivity } from '@/hooks/useTrackUserActivity';
import { useAllUsers } from '@/hooks/useAllUsers';
import { useActiveUsers } from '@/hooks/useActiveUsers';
import MessageBubble from '../../../components/chat/MessageBubble';
import { uploadChatFileToCloudinary } from '@/lib/cloudinary/uploadChatFile';
import { PhotoIcon, VideoCameraIcon, PhoneIcon } from '@heroicons/react/24/solid';
import VideoCall from '../../../components/chat/VideoCall';
import AudioCall from '../../../components/chat/AudioCall';

type ChatUser = {
  uid: string;
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
  photoUrl?: string | null;
};

type ChatMessage = {
  id?: string;
  senderId: string;
  senderName: string;
  content: string;
  type: 'text' | 'image' | 'file';
  fileUrl: string | null;
  fileName?: string | null;
  timestamp: any;
};

type ConversationMeta = {
  chatId: string;
  otherUserId: string;
  lastMessage: string;
  lastUpdated: Date;
  unreadCount: number;
};

type ActiveCallState = {
  type: 'video' | 'audio';
  autoAnswer: boolean;
} | null;

type CallType = 'audio' | 'video';

interface IncomingCall {
  callId: string;
  callerName: string;
  callerId: string;
  callerPhoto?: string;
  callType: CallType;
}

export default function ChatPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialUserId = searchParams.get('user');
  const autoAnswerCallId = searchParams.get('callId');
  const urlCallType = searchParams.get('callType'); // "audio" | "video" | null

  const user = useCurrentUser() as ChatUser | null;
  const { allUsers, error: usersError } = useAllUsers() as {
    allUsers: ChatUser[];
    error: string | null;
  };
  const activeUsers = useActiveUsers() as ChatUser[];

  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [showUserList, setShowUserList] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [conversations, setConversations] = useState<ConversationMeta[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileCaption, setFileCaption] = useState<string>('');

  const [activeCall, setActiveCall] = useState<ActiveCallState>(null);

  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const attachMenuRef = useRef<HTMLDivElement | null>(null);

  const isAudio = incomingCall?.callType === 'audio';

  useTrackUserActivity(60000);

  // click outside attach menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        attachMenuRef.current &&
        !attachMenuRef.current.contains(event.target as Node)
      ) {
        setShowAttachMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-select user from URL + auto-answer
  useEffect(() => {
    if (autoAnswerCallId && initialUserId && allUsers.length > 0 && user) {
      const targetUser = allUsers.find((u) => u.uid === initialUserId);
      if (targetUser) {
        void selectUser(targetUser);

        const typeFromUrl =
          urlCallType === 'audio' || urlCallType === 'video'
            ? (urlCallType as 'audio' | 'video')
            : 'video';

        setActiveCall({ type: typeFromUrl, autoAnswer: true });

        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    } else if (initialUserId && allUsers.length > 0 && user) {
      const targetUser = allUsers.find((u) => u.uid === initialUserId);
      if (targetUser) {
        void selectUser(targetUser);
      }
    }
  }, [initialUserId, autoAnswerCallId, urlCallType, allUsers, user]);

  // Load conversations + unread
  useEffect(() => {
    if (!user) return;

    const fetchConversations = async () => {
      try {
        const chatsSnapshot = await getDocs(collection(db, 'privateChats'));
        const userChats: ConversationMeta[] = [];

        for (const chatDoc of chatsSnapshot.docs) {
          const chatData = chatDoc.data() as any;
          if (chatData.participants?.includes(user.uid)) {
            const chatId = chatDoc.id;
            const otherUserId = chatData.participants.find(
              (id: string) => id !== user.uid
            ) as string;

            const unreadQueryRef = query(
              collection(db, 'messages'),
              where('receiverId', '==', user.uid),
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
      } catch (error) {
        console.error('Error fetching conversations:', error);
      }
    };

    void fetchConversations();
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const isUserOnline = (userId: string) =>
    activeUsers.some((u) => u.uid === userId);

  const getUserById = (userId: string) =>
    allUsers.find((u) => u.uid === userId) || null;

  const usersWithConversations: ChatUser[] = conversations
    .map((conv) => getUserById(conv.otherUserId))
    .filter((u): u is ChatUser => !!u);

  const usersWithoutConversations: ChatUser[] = allUsers
    .filter((u) => u.uid !== user?.uid)
    .filter((u) => !conversations.some((conv) => conv.otherUserId === u.uid));

  const filterUsers = (users: ChatUser[]): ChatUser[] => {
    if (!search.trim()) return users;
    const term = search.toLowerCase();
    return users.filter((u) => {
      const name = (u.displayName || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      return name.includes(term) || email.includes(term);
    });
  };

  const filteredUsersWithConv = filterUsers(usersWithConversations);
  const filteredUsersWithoutConv = filterUsers(usersWithoutConversations);

  const selectUser = async (targetUser: ChatUser) => {
    if (!user) return;
    setSelectedUser(targetUser);
    setShowUserList(false);
    const chatId = [user.uid, targetUser.uid].sort().join('_');

    try {
      const unreadQueryRef = query(
        collection(db, 'messages'),
        where('receiverId', '==', user.uid),
        where('senderId', '==', targetUser.uid),
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

      setUnreadCounts((prev) => ({ ...prev, [targetUser.uid]: 0 }));
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }

    await setDoc(
      doc(db, 'privateChats', chatId),
      {
        participants: [user.uid, targetUser.uid],
        participantNames: {
          [user.uid]: user.displayName || user.email,
          [targetUser.uid]: targetUser.displayName || targetUser.email,
        },
        lastUpdated: serverTimestamp(),
      },
      { merge: true }
    );

    const q = query(
      collection(db, 'privateChats', chatId, 'messages'),
      orderBy('timestamp')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setMessages(
        snapshot.docs.map(
          (d) =>
            ({
              id: d.id,
              ...(d.data() as Omit<ChatMessage, 'id'>),
            } as ChatMessage)
        )
      );
    });
    return () => unsub();
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setShowAttachMenu(false);

    if (file.type.startsWith('image/')) {
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
    setFileCaption('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const startVideoCall = () => {
    setActiveCall({ type: 'video', autoAnswer: false });
  };

  const startAudioCall = () => {
    setActiveCall({ type: 'audio', autoAnswer: false });
  };

  const closeCall = () => {
    setActiveCall(null);
  };

  async function sendMessage() {
    if (!user || !input.trim() || !selectedUser) return;
    const chatId = [user.uid, selectedUser.uid].sort().join('_');
    const text = input.trim();

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

      setInput('');
    } catch (error) {
      console.error('❌ Error sending message:', error);
    }
  }

  async function sendFileMessage() {
    if (!user || !selectedUser || !selectedFile) return;
    const chatId = [user.uid, selectedUser.uid].sort().join('_');
    const file = selectedFile;

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadError('File size must be less than 10MB');
      setTimeout(() => setUploadError(null), 5000);
      return;
    }

    try {
      setUploading(true);
      setUploadError(null);

      const { url, resourceType } = await uploadChatFileToCloudinary(file);
      const isImage =
        resourceType === 'image' && file.type.startsWith('image/');

      const displayContent = fileCaption || (isImage ? '' : file.name);
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

      cancelFileUpload();
    } catch (error) {
      console.error('❌ Error sending file message:', error);
      setUploadError(
        error instanceof Error ? error.message : 'Failed to upload file'
      );
      setTimeout(() => setUploadError(null), 5000);
    } finally {
      setUploading(false);
    }
  }

  // Ringtone helpers and incoming call handlers
  const playRingtone = () => {
    if (ringtoneRef.current) {
      ringtoneRef.current.loop = true;
      ringtoneRef.current.play().catch(() => {});
    }
  };

  const stopRingtone = () => {
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
  };

  const handleAnswerIncomingCall = () => {
    if (!incomingCall || !user) return;

    stopRingtone();

    const chatId = [user.uid, incomingCall.callerId].sort().join('_');

    const url =
      `/chat/${chatId}` +
      `?user=${incomingCall.callerId}` +
      `&callId=${encodeURIComponent(incomingCall.callId)}` +
      `&callType=${incomingCall.callType}`;

    router.push(url);
    setIncomingCall(null);
  };

  const handleDeclineIncomingCall = async () => {
    if (!incomingCall) return;

    stopRingtone();

    try {
      const callRef = doc(db, 'calls', incomingCall.callId);
      await updateDoc(callRef, {
        ended: true,
        declined: true,
        declinedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error declining call:', error);
    }

    setIncomingCall(null);
  };

  // Listen for incoming calls (same logic as Header, scoped to /chat)
  useEffect(() => {
    if (!user) return;
    if (!pathname?.startsWith('/chat')) return;

    const callsRef = fsCollection(db, 'calls');
    const q = fsQuery(
      callsRef,
      fsWhere('to', '==', user.uid),
      fsWhere('answered', '==', false),
      fsWhere('ended', '==', false)
    );

    const unsub = fsOnSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const callData = change.doc.data() as any;

        if (change.type === 'added') {
          const callType = (callData.callType || 'video') as CallType;

          const callerUser =
            allUsers.find((u) => u.uid === callData.from) || null;
          if (callerUser) {
            setSelectedUser(callerUser);
          }

          setIncomingCall({
            callId: change.doc.id,
            callerName: callData.fromName || 'Unknown',
            callerId: callData.from,
            callerPhoto: callData.fromPhoto,
            callType,
          });
          playRingtone();
        } else if (change.type === 'modified') {
          if (callData.answered || callData.ended) {
            setIncomingCall(null);
            stopRingtone();
          }
        } else if (change.type === 'removed') {
          setIncomingCall(null);
          stopRingtone();
        }
      });
    });

    return () => {
      unsub();
      stopRingtone();
    };
  }, [user, pathname, allUsers]);

  if (!user) return null;

  const totalUnread = Object.values(unreadCounts).reduce(
    (sum, count) => sum + count,
    0
  );

  const getAvatarUrl = (u: ChatUser | null) =>
    u?.photoURL || u?.photoUrl || '/default-avatar.png';

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* Ringtone Audio */}
      <audio ref={ringtoneRef} src="/sounds/incoming-call.mp3" />

      {/* Incoming Call Full Screen Overlay */}
      {incomingCall && (
        <div className="fixed inset-0 bg-gradient-to-b from-blue-600 to-blue-800 z-[9999] flex flex-col items-center justify-center animate-pulse-slow">
          <div className="text-center px-4">
            <div className="mb-6">
              {incomingCall.callerPhoto ? (
                <img
                  src={incomingCall.callerPhoto}
                  alt={incomingCall.callerName}
                  className="w-32 h-32 rounded-full mx-auto border-4 border-white shadow-2xl object-cover"
                />
              ) : (
                <div className="w-32 h-32 rounded-full mx-auto border-4 border-white shadow-2xl bg-white flex items-center justify-center">
                  <span className="text-5xl font-bold text-blue-600">
                    {incomingCall.callerName[0]?.toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2">
              {incomingCall.callerName}
            </h2>

            <p className="text-xl text-blue-100 mb-2">
              {isAudio ? 'Incoming audio call...' : 'Incoming video call...'}
            </p>

            <div className="relative w-20 h-20 mx-auto mb-12">
              <div className="absolute inset-0 rounded-full bg-white opacity-20 animate-ping" />
              <div className="absolute inset-0 rounded-full bg-white opacity-40 animate-pulse" />
              {isAudio ? (
                <Phone className="absolute inset-0 m-auto w-10 h-10 text-white" />
              ) : (
                <Video className="absolute inset-0 m-auto w-10 h-10 text-white" />
              )}
            </div>

            <div className="flex gap-8 justify-center items-center mt-8">
              <button
                onClick={handleDeclineIncomingCall}
                className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-2xl transition-transform hover:scale-110 active:scale-95"
                aria-label="Decline call"
              >
                <PhoneOff className="w-10 h-10 text-white" />
              </button>

              <button
                onClick={handleAnswerIncomingCall}
                className="w-20 h-20 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center shadow-2xl transition-transform hover:scale-110 active:scale-95 animate-bounce"
                aria-label="Answer call"
              >
                <Phone className="w-10 h-10 text-white" />
              </button>
            </div>

            <div className="flex gap-8 justify-center items-center mt-4">
              <span className="text-white font-semibold w-20 text-center">
                Decline
              </span>
              <span className="text-white font-semibold w-20 text-center">
                Answer
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Call overlays */}
      {activeCall?.type === 'video' && selectedUser && (
        <VideoCall
          currentUserId={user.uid}
          currentUserName={user.displayName || user.email || 'Anonymous'}
          otherUserId={selectedUser.uid}
          otherUserName={
            selectedUser.displayName || selectedUser.email || 'Unknown'
          }
          onClose={closeCall}
          autoAnswer={activeCall.autoAnswer}
        />
      )}

      {activeCall?.type === 'audio' && selectedUser && (
        <AudioCall
          currentUserId={user.uid}
          currentUserName={user.displayName || user.email || 'Anonymous'}
          otherUserId={selectedUser.uid}
          otherUserName={
            selectedUser.displayName || selectedUser.email || 'Unknown'
          }
          onClose={closeCall}
          autoAnswer={activeCall.autoAnswer}
        />
      )}

      {/* Header */}
      <header className="bg-white px-3 sm:px-4 py-3 sm:py-4 shadow flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {selectedUser && (
            <button
              onClick={() => {
                setSelectedUser(null);
                setShowUserList(true);
                setMessages([]);
              }}
              className="text-blue-600 hover:text-blue-800 font-medium text-sm sm:text-base flex-shrink-0"
            >
              ← Back
            </button>
          )}

          {selectedUser && (
            <img
              src={getAvatarUrl(selectedUser)}
              alt={selectedUser.displayName || 'User avatar'}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover flex-shrink-0"
            />
          )}

          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-bold text-blue-900 truncate">
              {selectedUser
                ? selectedUser.displayName || selectedUser.email
                : 'Messages'}
            </h1>
            {selectedUser && (
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isUserOnline(selectedUser.uid)
                      ? 'bg-green-500'
                      : 'bg-gray-400'
                  }`}
                ></span>
                <span className="text-xs sm:text-sm text-gray-600">
                  {isUserOnline(selectedUser.uid) ? 'Online' : 'Offline'}
                </span>
              </div>
            )}
          </div>
        </div>

        {selectedUser && (
          <div className="flex items-center gap-2 ml-2">
            <button
              onClick={startAudioCall}
              className="bg-green-500 hover:bg-green-600 text-white p-2 sm:p-2.5 rounded-full transition-all flex-shrink-0"
              title="Start Audio Call"
            >
              <PhoneIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <button
              onClick={startVideoCall}
              className="bg-blue-500 hover:bg-blue-600 text-white p-2 sm:p-2.5 rounded-full transition-all flex-shrink-0"
              title="Start Video Call"
            >
              <VideoCameraIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        )}

        {totalUnread > 0 && !selectedUser && (
          <div className="bg-blue-600 text-white px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold flex-shrink-0">
            {totalUnread}
          </div>
        )}
      </header>

      {uploadError && (
        <div className="fixed top-16 sm:top-20 right-2 sm:right-4 bg-red-500 text-white px-3 sm:px-4 py-2 sm:py-3 rounded-lg shadow-lg z-50 max-w-[calc(100vw-1rem)] sm:max-w-sm">
          <div className="flex items-start gap-2">
            <span className="text-lg sm:text-xl flex-shrink-0">⚠️</span>
            <div className="min-w-0">
              <p className="font-semibold text-sm sm:text-base">
                Upload Failed
              </p>
              <p className="text-xs sm:text-sm break-words">{uploadError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: user list */}
        <div
          className={`${
            selectedUser ? 'hidden' : 'flex'
          } md:flex w-full md:w-80 lg:w-96 bg-white md:border-r shadow-sm overflow-y-auto flex-shrink-0`}
        >
          <div className="p-3 sm:p-4 w-full">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border px-3 py-2 rounded-lg w-full mb-3 sm:mb-4 focus:outline-none focus:border-blue-500 text-sm sm:text-base"
              placeholder="Search users..."
            />

            {usersError && (
              <div className="text-red-500 mb-3 text-sm">{usersError}</div>
            )}

            {/* Recent chats with avatar */}
            {filteredUsersWithConv.length > 0 && (
              <div className="mb-4">
                <div className="text-xs font-semibold text-gray-500 mb-2 uppercase">
                  Recent Chats
                </div>
                <ul className="flex flex-col gap-1">
                  {filteredUsersWithConv.map((u) => {
                    const conv = conversations.find(
                      (c) => c.otherUserId === u.uid
                    );
                    const unreadCount = unreadCounts[u.uid] || 0;
                    const avatarUrl = getAvatarUrl(u);

                    return (
                      <li
                        key={u.uid}
                        onClick={() => void selectUser(u)}
                        className={`px-3 py-2 sm:py-3 rounded-lg cursor-pointer transition-all ${
                          selectedUser?.uid === u.uid
                            ? 'bg-blue-500 text-white'
                            : unreadCount > 0
                            ? 'bg-blue-50 hover:bg-blue-100'
                            : 'hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative flex-shrink-0">
                            <img
                              src={avatarUrl}
                              alt={u.displayName || 'User avatar'}
                              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover"
                            />
                            <span
                              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                                isUserOnline(u.uid)
                                  ? 'bg-green-500'
                                  : 'bg-gray-400'
                              }`}
                            ></span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div
                              className={`font-medium truncate text-sm sm:text-base ${
                                selectedUser?.uid === u.uid
                                  ? 'text-white'
                                  : 'text-black'
                              } ${
                                unreadCount > 0 &&
                                selectedUser?.uid !== u.uid
                                  ? 'font-bold'
                                  : ''
                              }`}
                            >
                              {u.displayName || 'Anonymous'}
                            </div>
                            <div
                              className={`text-xs sm:text-sm truncate ${
                                selectedUser?.uid === u.uid
                                  ? 'text-blue-100'
                                  : 'text-gray-500'
                              }`}
                            >
                              {conv?.lastMessage || u.email}
                            </div>
                          </div>

                          {unreadCount > 0 && (
                            <div className="bg-green-500 text-white rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {unreadCount}
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* All users with avatar */}
            {filteredUsersWithoutConv.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-gray-500 mb-2 uppercase">
                  All Users
                </div>
                <ul className="flex flex-col gap-1">
                  {filteredUsersWithoutConv.map((u) => {
                    const avatarUrl = getAvatarUrl(u);
                    return (
                      <li
                        key={u.uid}
                        onClick={() => void selectUser(u)}
                        className={`px-3 py-2 sm:py-3 rounded-lg cursor-pointer transition-all ${
                          selectedUser?.uid === u.uid
                            ? 'bg-blue-500 text-white'
                            : 'hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative flex-shrink-0">
                            <img
                              src={avatarUrl}
                              alt={u.displayName || 'User avatar'}
                              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover"
                            />
                            <span
                              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                                isUserOnline(u.uid)
                                  ? 'bg-green-500'
                                  : 'bg-gray-400'
                              }`}
                            ></span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div
                              className={`font-medium truncate text-sm sm:text-base ${
                                selectedUser?.uid === u.uid
                                  ? 'text-white'
                                  : 'text-black'
                              }`}
                            >
                              {u.displayName || 'Anonymous'}
                            </div>
                            <div
                              className={`text-xs sm:text-sm truncate ${
                                selectedUser?.uid === u.uid
                                  ? 'text-blue-100'
                                  : 'text-gray-500'
                              }`}
                            >
                              {u.email || 'No email'}
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {filteredUsersWithConv.length === 0 &&
              filteredUsersWithoutConv.length === 0 && (
                <div className="text-center text-gray-400 py-8 text-sm">
                  {search ? 'No users found' : 'No users available'}
                </div>
              )}
          </div>
        </div>

        {/* Right: chat area */}
        <div
          className={`${
            selectedUser ? 'flex' : 'hidden md:flex'
          } flex-1 flex-col min-w-0`}
        >
          {selectedUser ? (
            <>
              <div className="flex-1 overflow-y-auto p-2 sm:p-4">
                <div className="flex flex-col gap-2 max-w-4xl mx-auto">
                  {messages.length === 0 ? (
                    <div className="text-center text-gray-500 mt-8 px-4">
                      <p className="text-base sm:text-lg mb-2">
                        No messages yet
                      </p>
                      <p className="text-xs sm:text-sm">
                        Start the conversation with{' '}
                        {selectedUser.displayName || selectedUser.email}!
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <MessageBubble
                        key={msg.id}
                        content={msg.content}
                        isSender={msg.senderId === user.uid}
                        timestamp={msg.timestamp
                          ?.toDate?.()
                          ?.toLocaleTimeString?.([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        senderName={msg.senderName}
                        type={msg.type}
                        fileUrl={msg.fileUrl}
                        fileName={msg.fileName}
                      />
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {selectedFile && (
                <div className="bg-gray-50 border-t p-2 sm:p-4 flex-shrink-0">
                  <div className="max-w-4xl mx-auto">
                    <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm">
                      <div className="flex items-start gap-2 sm:gap-4">
                        {filePreview ? (
                          <img
                            src={filePreview}
                            alt="Preview"
                            className="w-16 h-16 sm:w-24 sm:h-24 object-cover rounded flex-shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                            <span className="text-2xl sm:text-4xl">📄</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2 truncate">
                            {selectedFile.name}
                          </p>
                          <p className="text-xs text-gray-500 mb-2 sm:mb-3">
                            {(selectedFile.size / 1024).toFixed(2)} KB
                          </p>
                          <input
                            type="text"
                            placeholder="Add a caption..."
                            value={fileCaption}
                            onChange={(e) => setFileCaption(e.target.value)}
                            className="w-full border rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <button
                          onClick={cancelFileUpload}
                          className="text-gray-400 hover:text-gray-600 flex-shrink-0 text-lg sm:text-xl"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="flex gap-2 mt-3 sm:mt-4">
                        <button
                          onClick={sendFileMessage}
                          disabled={uploading}
                          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                        >
                          {uploading ? 'Sending...' : 'Send'}
                        </button>
                        <button
                          onClick={cancelFileUpload}
                          className="px-3 sm:px-4 py-1.5 sm:py-2 border rounded-lg hover:bg-gray-50 text-sm sm:text-base"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void sendMessage();
                }}
                className="bg-white border-t p-2 sm:p-4 flex-shrink-0"
              >
                <div className="max-w-4xl mx-auto flex items-center gap-1.5 sm:gap-2">
                  <div className="relative" ref={attachMenuRef}>
                    <button
                      type="button"
                      onClick={() => setShowAttachMenu(!showAttachMenu)}
                      disabled={uploading || !!selectedFile}
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                    >
                      <span className="text-xl sm:text-2xl">+</span>
                    </button>

                    {showAttachMenu && (
                      <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-lg border py-2 w-48 sm:w-56 z-10">
                        <button
                          type="button"
                          onClick={() => {
                            if (fileInputRef.current) {
                              fileInputRef.current.removeAttribute('accept');
                            }
                            fileInputRef.current?.click();
                            setShowAttachMenu(false);
                          }}
                          className="w-full px-3 sm:px-4 py-2 sm:py-3 hover:bg-gray-50 flex items-center gap-2 sm:gap-3 text-left"
                        >
                          <span className="text-xl sm:text-2xl">📁</span>
                          <span className="font-medium text-black text-sm sm:text-base">
                            File
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            fileInputRef.current?.setAttribute(
                              'accept',
                              'image/*,video/*'
                            );
                            fileInputRef.current?.click();
                            setShowAttachMenu(false);
                          }}
                          className="w-full px-3 sm:px-4 py-2 sm:py-3 hover:bg-gray-50 flex items-center gap-2 sm:gap-3 text-left"
                        >
                          <span className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400">
                            <PhotoIcon />
                          </span>
                          <span className="font-medium text-black text-sm sm:text-base">
                            Photos & Videos
                          </span>
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
                          e.target.value = '';
                        }
                      }}
                    />
                  </div>

                  <input
                    type="text"
                    className="flex-1 min-w-0 border rounded-lg px-2 sm:px-4 py-1.5 sm:py-2 focus:outline-none focus:border-blue-500 text-sm sm:text-base"
                    placeholder={`Message ${
                      selectedUser.displayName || selectedUser.email
                    }...`}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={uploading || !!selectedFile}
                  />
                  <button
                    type="submit"
                    className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base flex-shrink-0"
                    disabled={uploading || !input.trim() || !!selectedFile}
                  >
                    Send
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 p-4">
              <div className="text-center">
                <svg
                  className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                <p className="text-base sm:text-lg">
                  Select a user to start chatting
                </p>
                {totalUnread > 0 && (
                  <p className="text-xs sm:text-sm text-blue-600 mt-2">
                    You have {totalUnread} unread message
                    {totalUnread > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse-slow {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.95;
          }
        }
        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
