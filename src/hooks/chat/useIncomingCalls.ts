
import { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  updateDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase/firebaseConfig';
import type { IncomingCall, ChatUser, CallType } from '@/utils/types/chat.types';

export function useIncomingCalls(
  userId: string | undefined,
  pathname: string | null,
  allUsers: ChatUser[]
) {
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);

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

  // Listen for incoming calls
  useEffect(() => {
    if (!userId) return;
    if (!pathname?.startsWith('/chat')) return;

    const callsRef = collection(db, 'calls');
    const q = query(
      callsRef,
      where('to', '==', userId),
      where('answered', '==', false),
      where('ended', '==', false)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const callData = change.doc.data() as any;
        
        if (change.type === 'added') {
          const callType = (callData.callType || 'video') as CallType;
          
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
  }, [userId, pathname, allUsers]);

  return {
    incomingCall,
    ringtoneRef,
    handleDeclineIncomingCall,
    playRingtone,
    stopRingtone,
  };
}