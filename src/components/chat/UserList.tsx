"use client";

import React from "react";
import { getAvatarUrl, filterUsers, getUserById } from "@/utils/chat/chatUtils";
import type { ChatUser, ConversationMeta } from "@/utils/types/chat.types";

interface UserListProps {
  conversations: ConversationMeta[];
  unreadCounts: Record<string, number>;
  allUsers: ChatUser[];
  activeUsers: ChatUser[];
  selectedUser: ChatUser | null;
  search: string;
  onSearchChange: (value: string) => void;
  onSelectUser: (user: ChatUser) => void;
  usersError: string | null;
  isUserOnline: (userId: string) => boolean;
  currentUserId: string;
  isLoadingUsers: boolean;
}

export default function UserList({
  conversations,
  unreadCounts,
  allUsers,
  activeUsers,
  selectedUser,
  search,
  onSearchChange,
  onSelectUser,
  usersError,
  isUserOnline,
  currentUserId,
  isLoadingUsers,
}: UserListProps) {
  const [showEmptyState, setShowEmptyState] = React.useState(false);

  // After 30s, allow empty state to be shown (only for no-search state)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShowEmptyState(true);
    }, 30000);
    return () => clearTimeout(timer);
  }, []);

  // While users are loading, show sidebar spinner
  if (isLoadingUsers) {
    return (
      <div
        className={`${
          selectedUser ? "hidden" : "flex"
        } md:flex w-full md:w-80 lg:w-96 bg-white md:border-r shadow-sm flex-shrink-0 flex-col`}
      >
        <div className="p-3 sm:p-4 border-b bg-white">
          <div className="h-9 bg-gray-100 rounded-lg" />
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div
            className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"
            aria-label="Loading users"
          />
        </div>
      </div>
    );
  }

  const hasSearch = search.trim().length > 0;

  // Get users excluding current user
  const otherUsers = allUsers.filter((u) => u.uid !== currentUserId);

  // Separate users into two groups
  const conversationsWithMessages = conversations.filter(
    (conv) => conv.lastMessage && conv.lastMessage.trim() !== ""
  );

  const usersWithConversations: ChatUser[] = conversationsWithMessages
    .map((conv) => getUserById(conv.otherUserId, allUsers))
    .filter((u): u is ChatUser => !!u);

  const usersWithoutConversations: ChatUser[] = otherUsers.filter(
    (u) => !conversations.some((conv) => conv.otherUserId === u.uid)
  );

  if (hasSearch) {
    // SEARCH MODE: Show all matching users in one list
    const allMatchingUsers = filterUsers(otherUsers, search);

    return (
      <div
        className={`${
          selectedUser ? "hidden" : "flex"
        } md:flex w-full md:w-80 lg:w-96 bg-white md:border-r shadow-sm flex-shrink-0 flex-col`}
      >
        {/* Search Bar */}
        <div className="p-3 sm:p-4 border-b bg-white">
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="border px-3 py-2 rounded-lg w-full focus:outline-none focus:border-blue-500 text-sm sm:text-base"
            placeholder="Search users..."
          />
          {usersError && (
            <div className="text-red-500 mt-2 text-sm">{usersError}</div>
          )}
        </div>

        {/* Search Results */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          {allMatchingUsers.length === 0 ? (
            <div className="text-center text-gray-400 py-8 text-sm">
              No users found for "{search.trim()}"
            </div>
          ) : (
            <>
              <div className="text-xs font-semibold text-gray-500 mb-2 uppercase">
                {allMatchingUsers.length} {allMatchingUsers.length === 1 ? "User" : "Users"} Found
              </div>
              <ul className="flex flex-col gap-1">
                {allMatchingUsers.map((u) => {
                  const conv = conversations.find((c) => c.otherUserId === u.uid);
                  const unreadCount = unreadCounts[u.uid] || 0;
                  const avatarUrl = getAvatarUrl(u);
                  const hasConversation = usersWithConversations.some(
                    (user) => user.uid === u.uid
                  );

                  return (
                    <li
                      key={u.uid}
                      onClick={() => onSelectUser(u)}
                      className={`px-3 py-2 sm:py-3 rounded-lg cursor-pointer transition-all ${
                        selectedUser?.uid === u.uid
                          ? "bg-blue-500 text-white"
                          : unreadCount > 0
                          ? "bg-blue-50 hover:bg-blue-100"
                          : "hover:bg-gray-100"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative flex-shrink-0">
                          <img
                            src={avatarUrl}
                            alt={u.displayName || "User avatar"}
                            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover"
                          />
                          <span
                            className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                              isUserOnline(u.uid)
                                ? "bg-green-500"
                                : "bg-gray-400"
                            }`}
                          ></span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div
                            className={`font-medium truncate text-sm sm:text-base ${
                              selectedUser?.uid === u.uid
                                ? "text-white"
                                : "text-black"
                            } ${
                              unreadCount > 0 && selectedUser?.uid !== u.uid
                                ? "font-bold"
                                : ""
                            }`}
                          >
                            {u.displayName || "Anonymous"}
                          </div>
                          <div
                            className={`text-xs sm:text-sm truncate ${
                              selectedUser?.uid === u.uid
                                ? "text-blue-100"
                                : "text-gray-500"
                            }`}
                          >
                            {hasConversation
                              ? conv?.lastMessage || u.email
                              : u.email || "No email"}
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
            </>
          )}
        </div>
      </div>
    );
  }

  // BROWSE MODE: Show recent chats only (no search)
  return (
    <div
      className={`${
        selectedUser ? "hidden" : "flex"
      } md:flex w-full md:w-80 lg:w-96 bg-white md:border-r shadow-sm flex-shrink-0 flex-col`}
    >
      {/* Search Bar */}
      <div className="p-3 sm:p-4 border-b bg-white">
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="border px-3 py-2 rounded-lg w-full focus:outline-none focus:border-blue-500 text-sm sm:text-base"
          placeholder="Search users..."
        />
        {usersError && (
          <div className="text-red-500 mt-2 text-sm">{usersError}</div>
        )}
      </div>

      {/* Recent Chats */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4">
        {usersWithConversations.length > 0 ? (
          <div className="mb-4">
            <div className="text-xs font-semibold text-gray-500 mb-2 uppercase">
              Recent Chats
            </div>
            <ul className="flex flex-col gap-1">
              {usersWithConversations.map((u) => {
                const conv = conversations.find((c) => c.otherUserId === u.uid);
                const unreadCount = unreadCounts[u.uid] || 0;
                const avatarUrl = getAvatarUrl(u);

                return (
                  <li
                    key={u.uid}
                    onClick={() => onSelectUser(u)}
                    className={`px-3 py-2 sm:py-3 rounded-lg cursor-pointer transition-all ${
                      selectedUser?.uid === u.uid
                        ? "bg-blue-500 text-white"
                        : unreadCount > 0
                        ? "bg-blue-50 hover:bg-blue-100"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative flex-shrink-0">
                        <img
                          src={avatarUrl}
                          alt={u.displayName || "User avatar"}
                          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover"
                        />
                        <span
                          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                            isUserOnline(u.uid)
                              ? "bg-green-500"
                              : "bg-gray-400"
                          }`}
                        ></span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div
                          className={`font-medium truncate text-sm sm:text-base ${
                            selectedUser?.uid === u.uid
                              ? "text-white"
                              : "text-black"
                          } ${
                            unreadCount > 0 && selectedUser?.uid !== u.uid
                              ? "font-bold"
                              : ""
                          }`}
                        >
                          {u.displayName || "Anonymous"}
                        </div>
                        <div
                          className={`text-xs sm:text-sm truncate ${
                            selectedUser?.uid === u.uid
                              ? "text-blue-100"
                              : "text-gray-500"
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
        ) : showEmptyState ? (
          <div className="text-center text-gray-400 py-8 text-sm">
            No conversations yet. Search for users to start chatting!
          </div>
        ) : null}
      </div>
    </div>
  );
}