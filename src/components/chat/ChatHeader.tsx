"use client";

import React from 'react';
import { PhoneIcon, VideoCameraIcon } from '@heroicons/react/24/solid';
import { getAvatarUrl } from '@/utils/chat/chatUtils';
import type { ChatUser } from '@/utils/types/chat.types';

interface ChatHeaderProps {
  selectedUser: ChatUser | null;
  totalUnread: number;
  isUserOnline: boolean;
  onBack: () => void;
  onStartAudioCall: () => void;
  onStartVideoCall: () => void;
}

export default function ChatHeader({
  selectedUser,
  totalUnread,
  isUserOnline,
  onBack,
  onStartAudioCall,
  onStartVideoCall,
}: ChatHeaderProps) {
  return (
    <header className="bg-white px-3 sm:px-4 py-3 sm:py-4 shadow flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        {selectedUser && (
          <button
            onClick={onBack}
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
                  isUserOnline ? 'bg-green-500' : 'bg-gray-400'
                }`}
              ></span>
              <span className="text-xs sm:text-sm text-gray-600">
                {isUserOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          )}
        </div>
      </div>
      {selectedUser && (
        <div className="flex items-center gap-2 ml-2">
          <button
            onClick={onStartAudioCall}
            className="bg-green-500 hover:bg-green-600 text-white p-2 sm:p-2.5 rounded-full transition-all flex-shrink-0"
            title="Start Audio Call"
          >
            <PhoneIcon className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <button
            onClick={onStartVideoCall}
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
  );
}
