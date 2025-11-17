"use client";
import React, { useState, useEffect } from "react";
import { PlusCircle } from "lucide-react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../../lib/firebase/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";

export default function ProfileLessons() {
  const [user] = useAuthState(auth);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLessons([]);
      setLoading(false);
      return;
    }
    const fetchLessons = async () => {
      setLoading(true);
      // Fetch user's enrolled lessons/skills from Firestore
      const ref = collection(db, "users", user.uid, "enrolledSkills");
      const snap = await getDocs(ref);
      setLessons(
        snap.docs.map((doc) => {
          const enrolledAt = doc.data().enrolledAt;
          // Simple time formatter (days ago)
          let uploaded = "";
          if (enrolledAt && enrolledAt.toDate) {
            const now = new Date();
            const days = Math.floor((now - enrolledAt.toDate()) / (1000 * 60 * 60 * 24));
            uploaded = days === 0 ? "Today" : `${days} day${days > 1 ? "s" : ""} ago`;
          }
          return {
            id: doc.id,
            title: doc.id.replace(/-/g, " "), // fallback to ID as title
            uploaded,
            status: "active"
          };
        })
      );
      setLoading(false);
    };
    fetchLessons();
  }, [user]);

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <h2 className="font-bold text-xl">My Lessons</h2>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium shadow hover:bg-blue-700 w-full sm:w-auto justify-center">
          <PlusCircle className="w-5 h-5" /> Upload New Lesson
        </button>
      </div>
      {loading ? (
        <div className="text-gray-500 text-center py-8">Loading enrolled lessons...</div>
      ) : lessons.length === 0 ? (
        <div className="text-gray-500 text-center py-8">No enrolled lessons yet.</div>
      ) : (
        <ul className="space-y-3 mb-8">
          {lessons.map((lesson) => (
            <li
              key={lesson.id}
              className="border-2 border-purple-500 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between bg-purple-50"
            >
              <div className="flex items-center gap-4 flex-1 min-w-0 mb-2 sm:mb-0">
                <div className="bg-amber-100 p-2 rounded">
                  <svg width="28" height="28" fill="none">
                    <rect width="28" height="28" rx="7" fill="#F7CA95" />
                  </svg>
                </div>
                <div className="truncate">
                  <p className="font-semibold text-gray-800 truncate">{lesson.title}</p>
                  <p className="text-gray-400 text-sm whitespace-nowrap">Enrolled {lesson.uploaded}</p>
                </div>
              </div>
              <div className="text-gray-300 text-right sm:text-left">•••</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
