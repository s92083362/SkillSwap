
export type ChatUser = {
    uid: string;
    displayName?: string | null;
    email?: string | null;
    photoURL?: string | null;
    photoUrl?: string | null;
  };
  
  export type ChatMessage = {
    id?: string;
    senderId: string;
    senderName: string;
    content: string;
    type: 'text' | 'image' | 'file';
    fileUrl: string | null;
    fileName?: string | null;
    timestamp: any;
  };
  
  export type ConversationMeta = {
    chatId: string;
    otherUserId: string;
    lastMessage: string;
    lastUpdated: Date;
    unreadCount: number;
  };
  
  export type ActiveCallState = {
    type: 'video' | 'audio';
    autoAnswer: boolean;
  } | null;
  
  export type CallType = 'audio' | 'video';
  
  export interface IncomingCall {
    callId: string;
    callerName: string;
    callerId: string;
    callerPhoto?: string;
    callType: CallType;
  }
