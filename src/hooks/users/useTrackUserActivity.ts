// src/hooks/useTrackUserActivity.ts

import { useEffect, useRef } from "react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseConfig";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";

// If you have a specific user type from useCurrentUser, use that instead
type CurrentUser = {
  uid: string;
  displayName?: string | null;
  email?: string | null;
} | null;

/**
 * Hook to update user's lastActive in Firestore on mount (and optionally, on interval).
 * Call in pages/components for live presence.
 */
export function useTrackUserActivity(updateIntervalMs = 60000) {
  const user = useCurrentUser() as CurrentUser;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function updatePresence() {
      if (!user) return;

      await setDoc(
        doc(db, "users", user.uid),
        {
          displayName: user.displayName || "Anonymous",
          email: user.email,
          lastActive: serverTimestamp(),
        },
        { merge: true }
      );
    }

    // Update presence once immediately
    void updatePresence();

    // Optionally update repeatedly
    if (user && updateIntervalMs > 0) {
      intervalRef.current = setInterval(updatePresence, updateIntervalMs);
    }

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [user, updateIntervalMs]);
}
