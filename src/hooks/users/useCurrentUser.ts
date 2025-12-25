// src/hooks/useCurrentUser.ts
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase/firebaseConfig";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

/**
 * Returns current Firebase user and role ("admin" | "user" | null).
 */
export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<"admin" | "user" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setRole(null);
        setLoading(false);
        return;
      }

      setUser(firebaseUser);

      // read role from Firestore: users/{uid}.role
      const snap = await getDoc(doc(db, "users", firebaseUser.uid));
      const data = snap.data();
      setRole((data?.role as "admin" | "user") || "user");

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, role, loading };
}
