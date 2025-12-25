// src/hooks/users/useTrackUserActivity.ts
import { useEffect, useRef } from "react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseConfig";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";

/**
 * Hook to update user's lastActive in Firestore on mount (and optionally, on interval).
 * Call in pages/components for live presence.
 */
export function useTrackUserActivity(updateIntervalMs = 60000) {
  const { user } = useCurrentUser(); // Destructure to get just the user
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function updatePresence() {
      if (!user || !db) {
        return;
      }

      try {
        await setDoc(
          doc(db, "users", user.uid),
          {
            displayName: user.displayName || "Anonymous",
            email: user.email,
            lastActive: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (error) {
        console.error("Error updating presence:", error);
      }
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