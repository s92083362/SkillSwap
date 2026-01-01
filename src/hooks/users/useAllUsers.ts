import { useEffect, useState } from "react";
import { db } from "@/lib/firebase/firebaseConfig";
import { collection, getDocs, DocumentData } from "firebase/firestore";

// Define a minimal user shape (uid + Firestore data)
type UserDoc = {
  uid: string;
} & DocumentData;

// Loads all registered users
export function useAllUsers() {
  const [allUsers, setAllUsers] = useState<UserDoc[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchUsers() {
      try {
        setLoading(true);

        const usersRef = collection(db, "users");
        const snapshot = await getDocs(usersRef);
        if (!isMounted) return;

        const users: UserDoc[] = snapshot.docs.map((doc) => ({
          uid: doc.id,
          ...(doc.data() as DocumentData),
        }));

        setAllUsers(users);
        setError(null);
      } catch (err) {
        if (!isMounted) return;
        const e = err as Error;
        console.error("❌ useAllUsers: Error fetching users:", e);
        setError(e.message || "Error fetching users");
      } finally {
        if (!isMounted) return;
        setLoading(false); // ✅ no timeout, no extra delay
      }
    }

    fetchUsers();

    return () => {
      isMounted = false;
    };
  }, []);

  // Optional debug logging
  useEffect(() => {
    console.log("📊 useAllUsers state:", {
      loading,
      usersCount: allUsers.length,
      error,
    });
  }, [loading, allUsers.length, error]);

  return { allUsers, error, loading };
}
