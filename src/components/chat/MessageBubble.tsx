"use client"

import React from "react";

interface MessageBubbleProps {
  content: string;
  isSender: boolean;
  timestamp?: string;
  senderName?: string;
}

export default function MessageBubble({ content, isSender, timestamp, senderName }: MessageBubbleProps) {
  return (
    <div className={`flex flex-col max-w-xs mb-2 ${isSender ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
      {/* For receiver, optionally show sender name */}
      {!isSender && senderName && (
        <span className="text-xs text-black mb-1">{senderName}</span>
      )}
      <div className={`px-4 py-2 rounded-lg font-medium shadow ${isSender ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}>{content}</div>
      {/* Timestamp */}
      {timestamp && (
        <span className="text-xs text-black mt-1">{timestamp}</span>
      )}
    </div>
  );
}
