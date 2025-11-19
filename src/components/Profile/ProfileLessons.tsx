"use client";
import React, { useState, useEffect } from "react";
import { PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../../lib/firebase/firebaseConfig";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";

export default function ProfileLessons() {
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

    const fetchLessons = async () => {
      setLoading(true);
      try {
        // Get enrolled skills
        const enrolledRef = collection(db, "users", user.uid, "enrolledSkills");
        const enrolledSnap = await getDocs(enrolledRef);

        // Fetch actual lesson data for each enrolled skill
        const lessonPromises = enrolledSnap.docs.map(async (enrollDoc) => {
          const lessonId = enrollDoc.id;
          const enrollData = enrollDoc.data();

          // Fetch the actual lesson from lessons collection
          const lessonRef = doc(db, "lessons", lessonId);
          const lessonSnap = await getDoc(lessonRef);

          // Calculate enrollment time
          const enrolledAt = enrollData.enrolledAt;
          let uploaded = "";
          if (enrolledAt && enrolledAt.toDate) {
            const now = new Date();
            const days = Math.floor((now - enrolledAt.toDate()) / (1000 * 60 * 60 * 24));
            uploaded = days === 0 ? "Today" : `${days} day${days > 1 ? "s" : ""} ago`;
          } else {
            uploaded = "Unknown";
          }

          if (lessonSnap.exists()) {
            const lessonData = lessonSnap.data();
            return {
              id: lessonId,
              title: lessonData.title || "Untitled Lesson",
              description: lessonData.description || "",
              instructor: lessonData.instructor || "",
              image: lessonData.image || "",
              uploaded,
              status: "active"
            };
          }

          // Lesson not found: show as inactive/placeholder
          return {
            id: lessonId,
            title: lessonId.replace(/-/g, " "),
            description: "",
            instructor: "",
            image: "",
            uploaded,
            status: "inactive"
          };
        });

        const resolvedLessons = await Promise.all(lessonPromises);
        setLessons(resolvedLessons); // show all, not just "active"
      } catch (error) {
        console.error("Error fetching enrolled lessons:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLessons();
  }, [user]);

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <h2 className="font-bold text-xl">My Lessons</h2>
        <button
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium shadow hover:bg-blue-700 w-full sm:w-auto justify-center"
          onClick={() => router.push("/lessons/create")}
        >
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
              className={`border-2 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between transition-colors cursor-pointer 
                ${
                  lesson.status === "inactive"
                    ? "border-gray-300 bg-gray-100 opacity-60 pointer-events-none"
                    : "border-purple-500 bg-purple-50 hover:bg-purple-100"
                }`}
              onClick={() => lesson.status === "active" && router.push(`/skills/${lesson.id}`)}
            >
              <div className="flex items-center gap-4 flex-1 min-w-0 mb-2 sm:mb-0">
                {/* Lesson Image or Icon */}
                <div className="flex-shrink-0">
                  {lesson.image ? (
                    <img 
                      src={lesson.image} 
                      alt={lesson.title}
                      className="w-14 h-14 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="bg-amber-100 p-2 rounded-lg">
                      <svg width="28" height="28" fill="none">
                        <rect width="28" height="28" rx="7" fill="#F7CA95" />
                      </svg>
                    </div>
                  )}
                </div>
                
                {/* Lesson Info */}
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-gray-800 truncate ${lesson.status === "inactive" && "line-through"}`}>
                    {lesson.title}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    {lesson.instructor && (
                      <span className="truncate">by {lesson.instructor}</span>
                    )}
                    {lesson.instructor && <span>•</span>}
                    <span className="whitespace-nowrap">Enrolled {lesson.uploaded}</span>
                  </div>
                  {lesson.status === "inactive" && (
                    <span className="text-xs text-red-500">Lesson not found</span>
                  )}
                </div>
              </div>
              
              {/* Action Button */}
              {lesson.status === "active" && (
                <button
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm sm:ml-4 mt-2 sm:mt-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/skills/${lesson.id}`);
                  }}
                >
                  Continue Learning →
                </button>
              )}
              {lesson.status === "inactive" && (
                <span className="text-xs text-gray-400 sm:ml-4 mt-2 sm:mt-0">Unavailable</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
