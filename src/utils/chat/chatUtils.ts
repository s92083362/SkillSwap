import type { ChatUser } from '@/utils/types/chat.types';

  // Get user avatar or fallback to default image
export const getAvatarUrl = (u: ChatUser | null): string => {
  return u?.photoURL || u?.photoUrl || '/default-avatar.png';
};

// Generate a unique chat ID for two users
export const createChatId = (userId1: string, userId2: string): string => {
  return [userId1, userId2].sort().join('_');
};

// Check if a user is online
export const isUserOnline = (userId: string, activeUsers: ChatUser[]): boolean => {
  return activeUsers.some((u) => u.uid === userId);
};

// Filter users by name or email using search text
export const filterUsers = (users: ChatUser[], searchTerm: string): ChatUser[] => {
  if (!searchTerm.trim()) return users;
  const term = searchTerm.toLowerCase();
  return users.filter((u) => {
    const name = (u.displayName || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    return name.includes(term) || email.includes(term);
  });
};

// Find and return a user by their ID
export const getUserById = (userId: string, allUsers: ChatUser[]): ChatUser | null => {
  return allUsers.find((u) => u.uid === userId) || null;
};