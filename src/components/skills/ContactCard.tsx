'use client';

import React from 'react';
import type { UserRole } from '@/lib/firebase/lessonHelpers';

type ContactCardProps = {
  instructorAvatar: string | null | undefined;
  instructorName: string;
  userRole: UserRole;
  onChat: () => void;
};

export function ContactCard({
  instructorAvatar,
  instructorName,
  userRole,
  onChat,
}: ContactCardProps) {
  const avatarToShow = instructorAvatar || '/default-avatar.png';

  return (
    <div className="mt-6 bg-white rounded-lg p-6 shadow-sm max-w-md mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-12 h-12 rounded-full bg-blue-100 overflow-hidden flex items-center justify-center flex-shrink-0">
            {avatarToShow ? (
              <img
                src={avatarToShow}
                alt={instructorName || 'Partner'}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-base font-semibold text-blue-700">
                {(instructorName || '?').charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="text-left flex-1 min-w-0">
            <p className="text-sm text-gray-500 mb-1">
              {userRole === 'seeker'
                ? 'Contact Skill Provider'
                : 'Contact Skill Seeker'}
            </p>
            <p className="text-lg font-semibold text-gray-900 truncate">
              {instructorName}
            </p>
          </div>
        </div>
        <button
          onClick={onChat}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded transition-colors flex-shrink-0"
          type="button"
        >
          Chat
        </button>
      </div>
    </div>
  );
}
