import { useEffect, useState } from "react";
import { db } from "@/lib/firebase/firebaseConfig";
import { collection, onSnapshot } from "firebase/firestore";

/**
 * Returns an array of users who have been active within the last 2 minutes.
 * Each user object includes uid, displayName, email, lastActive, isOnline.
 * Updates in real-time as users come online/offline.
 */
export function useActiveUsers() {
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
 
  useEffect(() => {
    console.log("🔄 Setting up active users listener...");
    const usersRef = collection(db, "users");
    
    // Subscribe to ALL users
    const unsub = onSnapshot(
      usersRef,
      (snapshot) => {
        const now = Date.now();
        const twoMinutesAgo = now - 2 * 60 * 1000; // 120 seconds
        
        console.log("📊 Total users in database:", snapshot.size);
        
        const users = snapshot.docs
          .map(doc => {
            const data = doc.data();
            const lastActiveDate = data.lastActive?.toDate();
            
            console.log("👤 User:", doc.id, {
              displayName: data.displayName,
              lastActive: lastActiveDate,
              isOnline: data.isOnline
            });
            
            return {
              uid: doc.id,
              displayName: data.displayName,
              email: data.email,
              lastActive: data.lastActive,
              isOnline: data.isOnline,
              lastActiveDate: lastActiveDate,
            };
          })
          .filter(user => {
            // Check if user is active
            const lastActiveMs = user.lastActiveDate?.getTime() || 0;
            const isRecentlyActive = lastActiveMs >= twoMinutesAgo;
            const isExplicitlyOnline = user.isOnline === true;
            
            const isActive = isRecentlyActive || isExplicitlyOnline;
            
            if (isActive) {
              console.log("✅ Active user:", user.displayName || user.uid);
            }
            
            return isActive;
          });
        console.log(`✅ Found ${users.length} active users out of ${snapshot.size} total`);
        setActiveUsers(users);
      },
      (err) => {
        console.error("❌ Error fetching active users:", err);
        setError(err.message || "Error fetching users");
      }
    );
    // Re-filter every 10 seconds to remove users who've become inactive
    const intervalId = setInterval(() => {
      console.log("🔄 Re-filtering active users...");
      setActiveUsers(prev => {
        const now = Date.now();
        const twoMinutesAgo = now - 2 * 60 * 1000;
        
        const filtered = prev.filter(user => {
          const lastActiveMs = user.lastActiveDate?.getTime() || 0;
          const isRecentlyActive = lastActiveMs >= twoMinutesAgo;
          const isExplicitlyOnline = user.isOnline === true;
          
          return isRecentlyActive || isExplicitlyOnline;
        });
        
        const prevLength = prev?.length || 0;
        const filteredLength = filtered?.length || 0;
        
        if (filteredLength !== prevLength) {
          console.log(`⚠️ Removed ${prevLength - filteredLength} inactive users`);
        }
        
        return filtered;
      });
    }, 10000); // Check every 10 seconds
    return () => {
      console.log("🛑 Cleaning up active users listener");
      unsub();
      clearInterval(intervalId);
    };
  }, []);
 
  return activeUsers;
}
 