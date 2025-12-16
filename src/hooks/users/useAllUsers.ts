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

  useEffect(() => {
    async function fetchUsers() {
      try {
        const usersRef = collection(db, "users");
        const snapshot = await getDocs(usersRef);
        const users: UserDoc[] = snapshot.docs.map((doc) => ({
          uid: doc.id,
          ...(doc.data() as DocumentData),
        }));
        setAllUsers(users);
      } catch (err) {
        const e = err as Error;
        setError(e.message || "Error fetching users");
      }
    }

    fetchUsers();
  }, []);

  return { allUsers, error };
}
