"use client";
import React, { useEffect, useState } from "react";
import { PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db, auth } from "@/lib/firebase/firebaseConfig";
import { useAuthState } from "react-firebase-hooks/auth";

export default function MyLessonsPage() {
  const router = useRouter();
  const [user] = useAuthState(auth);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLessons([]);
      setLoading(false);
      return;
    }
    async function fetchLessons() {
      setLoading(true);
      try {
        // Only fetch lessons created by the current user
        const lessonsQuery = query(
          collection(db, "lessons"),
          where("creatorId", "==", user.uid)
        );
        const snapshot = await getDocs(lessonsQuery);
        const lessonList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setLessons(lessonList);
      } catch (error) {
        console.error("Could not fetch lessons:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchLessons();
  }, [user]);

  const handleManage = (lessonId) => {
    router.push(`/lessons/manage/${lessonId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900">
            My Uploaded Lessons {loading ? "" : `(${lessons.length})`}
          </h1>
          <button
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium shadow hover:bg-blue-700"
            onClick={() => router.push("/lessons/create")}
          >
            <PlusCircle className="w-5 h-5" /> Upload New Lesson
          </button>
        </div>

        {loading ? (
          <div className="text-gray-500 text-center">Loading...</div>
        ) : lessons.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {lessons.map((lesson) => (
              <div
                key={lesson.id}
                className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm flex items-center gap-6"
              >
                <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center text-4xl overflow-hidden">
                  {lesson.image && lesson.image.startsWith("http") ? (
                    <img
                      src={lesson.image}
                      alt={lesson.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>🎬</span>
                  )}
                </div>
                <div className="flex-grow">
                  <div className="font-bold text-gray-900 text-[20px] mb-2">
                    {lesson.title}
                  </div>
                  <button
                    onClick={() => handleManage(lesson.id)}
                    className="text-blue-600 hover:text-blue-700 font-medium text-base"
                  >
                    Manage
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-500 text-center py-10">
            You have not yet uploaded any lessons.
          </div>
        )}
      </div>
    </div>
  );
}
