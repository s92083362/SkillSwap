// src/hooks/useCurrentUser.ts
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase/firebaseConfig"; // adjust path as needed
import { onAuthStateChanged, User } from "firebase/auth";

/**
 * Returns the currently authenticated Firebase user, or null if not logged in.
 */
export function useCurrentUser(): User | null {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  return user;
}
