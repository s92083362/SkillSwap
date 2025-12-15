"use client";

import React from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import type { IncomingCall } from '@/utils/types/chat.types';

interface IncomingCallOverlayProps {
  incomingCall: IncomingCall;
  onAnswer: () => void;
  onDecline: () => void;
}

export default function IncomingCallOverlay({
  incomingCall,
  onAnswer,
  onDecline,
}: IncomingCallOverlayProps) {
  const isAudio = incomingCall.callType === 'audio';

  return (
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
            onClick={onDecline}
            className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-2xl transition-transform hover:scale-110 active:scale-95"
            aria-label="Decline call"
          >
            <PhoneOff className="w-10 h-10 text-white" />
          </button>
          <button
            onClick={onAnswer}
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
  );
}