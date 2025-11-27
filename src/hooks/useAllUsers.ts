import { useEffect, useState } from "react";
import { db } from "@/lib/firebase/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";

// Loads all registered users
export function useAllUsers() {
  const [allUsers, setAllUsers] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const usersRef = collection(db, "users");
        const snapshot = await getDocs(usersRef);
        setAllUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })));
      } catch (err) {
        setError(err.message || "Error fetching users");
      }
    }
    fetchUsers();
  }, []);

  return { allUsers, error };
}
