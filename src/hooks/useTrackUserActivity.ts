// src/hooks/useTrackUserActivity.ts

import { useEffect, useRef } from "react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase/firebaseConfig"; // adjust path if needed
import { useCurrentUser } from "@/hooks/useCurrentUser";

/**
 * Hooks to update user's lastActive in Firestore on mount (and optionally, on interval).
 * Call in pages/components for live presence.
 */
export function useTrackUserActivity(updateIntervalMs = 60000) { // default: update every minute
  const user = useCurrentUser();
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    async function updatePresence() {
      if (user) {
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
    }

    // Update presence once immediately
    updatePresence();

    // If you want to update repeatedly while user is on page (for better "online" tracking)
    if (user && updateIntervalMs > 0) {
      intervalRef.current = setInterval(updatePresence, updateIntervalMs);
    }

    // Cleanup
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user, updateIntervalMs]);
}
