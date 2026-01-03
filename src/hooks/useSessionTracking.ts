// hooks/useSessionTracking.ts


import { useEffect, useRef } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase/firebaseConfig";
import { logActivity, ActivityTypes } from "@/lib/firebase/activityLogger";

export function useSessionTracking() {
  const [user] = useAuthState(auth as any);
  const sessionStartRef = useRef<number | null>(null);
  const activityCountRef = useRef(0);
  const lastActivityRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!user?.uid) return;

    // Start session tracking
    sessionStartRef.current = Date.now();
    console.log("📊 Session tracking started for user:", user.uid);

    // Log periodic activity (every 5 minutes while active)
    const activityInterval = setInterval(() => {
      if (sessionStartRef.current) {
        const durationMinutes = Math.round(
          (Date.now() - sessionStartRef.current) / 60000
        );

        // Only log if user has been active in last 10 minutes
        const timeSinceLastActivity = Date.now() - lastActivityRef.current;
        if (timeSinceLastActivity < 10 * 60 * 1000) {
          logActivity({
            userId: user.uid,
            action: "active_session",
            duration: durationMinutes,
            metadata: {
              activityCount: activityCountRef.current,
              sessionDuration: durationMinutes,
            },
          });
          console.log(`📊 Logged active session: ${durationMinutes}m`);
        }
      }
    }, 5 * 60 * 1000); // 5 minutes

    // Track page visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden && sessionStartRef.current) {
        // User left the page
        const durationMinutes = Math.round(
          (Date.now() - sessionStartRef.current) / 60000
        );

        logActivity({
          userId: user.uid,
          action: "session_pause",
          duration: durationMinutes,
          metadata: {
            reason: "tab_hidden",
            activityCount: activityCountRef.current,
          },
        });
        console.log(`⏸️ Session paused: ${durationMinutes}m`);
      } else if (!document.hidden) {
        // User returned to the page
        sessionStartRef.current = Date.now();
        lastActivityRef.current = Date.now();
        console.log("▶️ Session resumed");
      }
    };

    // Track user interactions to measure engagement
    const trackInteraction = () => {
      activityCountRef.current++;
      lastActivityRef.current = Date.now();
    };

    // Attach event listeners
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("click", trackInteraction);
    document.addEventListener("keydown", trackInteraction);
    document.addEventListener("scroll", trackInteraction);

    // Cleanup function
    return () => {
      clearInterval(activityInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("click", trackInteraction);
      document.removeEventListener("keydown", trackInteraction);
      document.removeEventListener("scroll", trackInteraction);

      // Log final session data
      if (sessionStartRef.current) {
        const durationMinutes = Math.round(
          (Date.now() - sessionStartRef.current) / 60000
        );

        logActivity({
          userId: user.uid,
          action: ActivityTypes.SESSION_END,
          duration: durationMinutes,
          metadata: {
            totalActions: activityCountRef.current,
            sessionDuration: durationMinutes,
          },
        });
        console.log(`🏁 Session ended: ${durationMinutes}m, ${activityCountRef.current} actions`);
      }
    };
  }, [user?.uid]);
}

// Bonus: Hook to manually track specific actions
export function useActivityTracker() {
  const [user] = useAuthState(auth as any);

  const trackAction = async (
    action: string,
    metadata?: Record<string, any>
  ) => {
    if (!user?.uid) {
      console.warn("⚠️ Cannot track action: User not logged in");
      return;
    }

    await logActivity({
      userId: user.uid,
      action,
      metadata,
    });
    console.log(`✅ Tracked action: ${action}`, metadata);
  };

  return { trackAction };
}