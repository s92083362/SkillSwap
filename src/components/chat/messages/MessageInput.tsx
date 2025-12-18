"use client";

import React from "react";
import { PhotoIcon } from "@heroicons/react/24/solid";
import type { ChatUser } from "@/utils/types/chat.types";

interface MessageInputProps {
  input: string;
  uploading: boolean;
  selectedFile: File | null;
  selectedUser: ChatUser | null; // allow null for safety
  showAttachMenu: boolean;
  attachMenuRef: React.RefObject<HTMLDivElement>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onToggleAttachMenu: () => void;
  onFileSelect: (file: File) => void;
}

export default function MessageInput({
  input,
  uploading,
  selectedFile,
  selectedUser,
  showAttachMenu,
  attachMenuRef,
  fileInputRef,
  onInputChange,
  onSubmit,
  onToggleAttachMenu,
  onFileSelect,
}: MessageInputProps) {
  const disabled = uploading || !!selectedFile || !selectedUser;

  return (
    <form
      onSubmit={onSubmit}
      className="bg-white border-t p-2 sm:p-4 flex-shrink-0"
    >
      <div className="max-w-4xl mx-auto flex items-center gap-1.5 sm:gap-2">
        <div className="relative" ref={attachMenuRef}>
          <button
            type="button"
            onClick={onToggleAttachMenu}
            disabled={disabled}
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
                    fileInputRef.current.removeAttribute("accept");
                    fileInputRef.current.click();
                  }
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
                  if (fileInputRef.current) {
                    fileInputRef.current.setAttribute(
                      "accept",
                      "image/*,video/*"
                    );
                    fileInputRef.current.click();
                  }
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
                onFileSelect(file);
                e.target.value = "";
              }
            }}
          />
        </div>

        <input
          type="text"
          className="flex-1 min-w-0 border rounded-lg px-2 sm:px-4 py-1.5 sm:py-2 focus:outline-none focus:border-blue-500 text-sm sm:text-base"
          placeholder={
            selectedUser
              ? `Message ${selectedUser.displayName || selectedUser.email}...`
              : "Select a user to start chatting"
          }
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          disabled={disabled}
        />

        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base flex-shrink-0"
          disabled={uploading || !input.trim() || !!selectedFile || !selectedUser}
        >
          Send
        </button>
      </div>
    </form>
  );
}
