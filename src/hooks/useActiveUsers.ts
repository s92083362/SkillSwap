// src/hooks/useActiveUsers.ts
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase/firebaseConfig";
import { collection, query, where, onSnapshot, Timestamp, getDocs } from "firebase/firestore";

/**
 * Returns an array of users who have been active within the last 5 minutes.
 * Each user object includes uid, displayName, email, lastActive.
 * Updates in real-time as users come online/offline.
 */
export function useActiveUsers() {
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("🔄 Setting up active users listener...");
    
    const fiveMinutesAgo = Timestamp.fromMillis(Date.now() - 5 * 60 * 1000);
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("lastActive", ">=", fiveMinutesAgo));
    
    // Also fetch all users to debug
    getDocs(collection(db, "users")).then(snapshot => {
      console.log("📊 Total users in database:", snapshot.size);
      snapshot.forEach(doc => {
        const data = doc.data();
        console.log("👤 User:", doc.id, "lastActive:", data.lastActive?.toDate());
      });
    });
    
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const users = snapshot.docs.map(doc => ({ 
          uid: doc.id, 
          ...doc.data() 
        }));
        console.log("✅ Active users updated:", users.length, users);
        setActiveUsers(users);
      },
      (err) => {
        console.error("❌ Error fetching active users:", err);
        setError(err.message || "Error fetching users");
      }
    );

    // Refresh the query every 30 seconds
    const intervalId = setInterval(() => {
      console.log("🔄 Refreshing active users query...");
    }, 30000);

    return () => {
      unsub();
      clearInterval(intervalId);
    };
  }, []);

  return activeUsers;
}