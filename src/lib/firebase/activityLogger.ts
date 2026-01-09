// lib/firebase/activityLogger.ts

import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebaseConfig";

export interface LogActivityParams {
  userId: string;
  action: string;
  description?: string; // Human-readable description for Recent Activity
  type?: "user" | "exchange" | "lesson" | "system" | "message" | "call"; // Category for color coding
  duration?: number; // in minutes
  metadata?: Record<string, any>; // additional data
}

/**
 * Logs user activity to Firestore activityLogs collection
 * This function never throws errors to avoid breaking the app
 */
export async function logActivity({
  userId,
  action,
  description,
  type = "system",
  duration = 0,
  metadata = {},
}: LogActivityParams): Promise<void> {
  try {
    await addDoc(collection(db, "activityLogs"), {
      userId,
      action,
      description: description || generateDescription(action, metadata),
      type,
      duration,
      metadata,
      timestamp: serverTimestamp(),
    });
    console.log(`✅ Logged activity: ${action} for user ${userId}`);
  } catch (error) {
    console.error("❌ Failed to log activity:", error);
    // Don't throw - logging should never break the app
  }
}

/**
 * Generate human-readable description from action
 */
function generateDescription(action: string, metadata: Record<string, any> = {}): string {
  const userName = metadata.userName || "User";
  
  switch (action) {
    case ActivityTypes.LOGIN:
      return `${userName} logged in`;
    case ActivityTypes.LOGOUT:
      return `${userName} logged out`;
    case ActivityTypes.PROFILE_UPDATE:
      return `${userName} updated profile information`;
    case ActivityTypes.PROFILE_VIEW:
      return `${userName} viewed a profile`;
    case ActivityTypes.SKILL_ENROLL:
      return `${userName} enrolled in ${metadata.skillName || "a skill"}`;
    case ActivityTypes.SKILL_VIEW:
      return `${userName} viewed ${metadata.skillName || "a skill"}`;
    case ActivityTypes.LESSON_CREATE:
      return `New lesson ${metadata.lessonName || ""} created by ${userName}`;
    case ActivityTypes.LESSON_VIEW:
      return `${userName} viewed lesson ${metadata.lessonName || ""}`;
    case ActivityTypes.LESSON_COMPLETE:
      return `${userName} completed lesson ${metadata.lessonName || ""}`;
    case ActivityTypes.MESSAGE_SEND:
      return `${userName} sent a message`;
    case ActivityTypes.MESSAGE_VIEW:
      return `${userName} viewed messages`;
    case ActivityTypes.CALL_START:
      return `${userName} started a call`;
    case ActivityTypes.CALL_END:
      return `${userName} ended a call (${metadata.duration || 0} min)`;
    case ActivityTypes.SWAP_REQUEST:
      return `${userName} created a swap request`;
    case ActivityTypes.SWAP_ACCEPTED:
      return `Swap request accepted by ${userName}`;
    case ActivityTypes.VERIFICATION_COMPLETE:
      return `New user ${userName} completed verification`;
    case ActivityTypes.EXCHANGE_PROCESS:
      return `New exchange ${metadata.cryptoType || "transaction"} processed`;
    case ActivityTypes.SESSION_END:
      return `${userName} session ended (${metadata.duration || 0} min)`;
    default:
      return `${userName} performed ${action}`;
  }
}

/**
 * Hook to track session duration
 */
export class SessionTracker {
  private startTime: number;
  private userId: string;
  private userName: string;

  constructor(userId: string, userName?: string) {
    this.userId = userId;
    this.userName = userName || "User";
    this.startTime = Date.now();
  }

  async endSession() {
    const durationMinutes = Math.round((Date.now() - this.startTime) / 60000);
    await logActivity({
      userId: this.userId,
      action: ActivityTypes.SESSION_END,
      type: "user",
      duration: durationMinutes,
      metadata: {
        userName: this.userName,
        duration: durationMinutes,
      },
    });
  }
}

// Common activity types for consistency
export const ActivityTypes = {
  // Auth
  LOGIN: "login",
  LOGOUT: "logout",
  SESSION_END: "session_end",
  VERIFICATION_COMPLETE: "verification_complete",
  
  // Profile
  PROFILE_UPDATE: "profile_update",
  PROFILE_VIEW: "profile_view",
  
  // Skills
  SKILL_ENROLL: "skill_enroll",
  SKILL_VIEW: "skill_view",
  
  // Lessons
  LESSON_CREATE: "lesson_create",
  LESSON_VIEW: "lesson_view",
  LESSON_COMPLETE: "lesson_complete",
  
  // Messages
  MESSAGE_SEND: "message_send",
  MESSAGE_VIEW: "message_view",
  
  // Calls
  CALL_START: "call_start",
  CALL_END: "call_end",
  
  // Swaps/Exchanges
  SWAP_REQUEST: "swap_request",
  SWAP_ACCEPTED: "swap_accepted",
  EXCHANGE_PROCESS: "exchange_process",
  
  // General
  PAGE_VIEW: "page_view",
} as const;

// Helper functions for common activities
export const ActivityHelpers = {
  /**
   * Log user login
   */
  logLogin: async (userId: string, userName: string) => {
    await logActivity({
      userId,
      action: ActivityTypes.LOGIN,
      type: "user",
      metadata: { userName },
    });
  },

  /**
   * Log user verification
   */
  logVerification: async (userId: string, userName: string) => {
    await logActivity({
      userId,
      action: ActivityTypes.VERIFICATION_COMPLETE,
      type: "user",
      metadata: { userName },
    });
  },

  /**
   * Log lesson completion
   */
  logLessonComplete: async (userId: string, userName: string, lessonName: string) => {
    await logActivity({
      userId,
      action: ActivityTypes.LESSON_COMPLETE,
      type: "lesson",
      metadata: { userName, lessonName },
    });
  },

  /**
   * Log exchange/swap
   */
  logExchange: async (userId: string, userName: string, cryptoType?: string) => {
    await logActivity({
      userId,
      action: ActivityTypes.EXCHANGE_PROCESS,
      type: "exchange",
      metadata: { userName, cryptoType },
    });
  },

  /**
   * Log swap request accepted
   */
  logSwapAccepted: async (userId: string, userName: string) => {
    await logActivity({
      userId,
      action: ActivityTypes.SWAP_ACCEPTED,
      type: "exchange",
      metadata: { userName },
    });
  },
};