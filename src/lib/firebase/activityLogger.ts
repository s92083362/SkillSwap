// lib/firebase/activityLogger.ts


import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebaseConfig";

export interface LogActivityParams {
  userId: string;
  action: string;
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
  duration = 0,
  metadata = {},
}: LogActivityParams): Promise<void> {
  try {
    await addDoc(collection(db, "activityLogs"), {
      userId,
      action,
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
 * Hook to track session duration
 */
export class SessionTracker {
  private startTime: number;
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
    this.startTime = Date.now();
  }

  async endSession() {
    const durationMinutes = Math.round((Date.now() - this.startTime) / 60000);
    await logActivity({
      userId: this.userId,
      action: "session_end",
      duration: durationMinutes,
    });
  }
}

// Common activity types for consistency
export const ActivityTypes = {
  LOGIN: "login",
  LOGOUT: "logout",
  SESSION_END: "session_end",
  PROFILE_UPDATE: "profile_update",
  PROFILE_VIEW: "profile_view",
  SKILL_ENROLL: "skill_enroll",
  SKILL_VIEW: "skill_view",
  LESSON_CREATE: "lesson_create",
  LESSON_VIEW: "lesson_view",
  MESSAGE_SEND: "message_send",
  MESSAGE_VIEW: "message_view",
  CALL_START: "call_start",
  CALL_END: "call_end",
  SWAP_REQUEST: "swap_request",
  PAGE_VIEW: "page_view",
} as const;