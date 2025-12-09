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
  const [lessons, setLessons] = useState<any[]>([]);
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
        const enrolledRef = collection(db, "users", user.uid, "enrolledSkills");
        const enrolledSnap = await getDocs(enrolledRef);
 
        const lessonPromises = enrolledSnap.docs.map(async (enrollDoc) => {
          const lessonId = enrollDoc.id;
          const enrollData = enrollDoc.data();
 
          const lessonRef = doc(db, "lessons", lessonId);
          const lessonSnap = await getDoc(lessonRef);
 
          const enrolledAt = enrollData.enrolledAt;
          let uploaded = "";
          if (enrolledAt && enrolledAt.toDate) {
            const now = new Date();
            const days = Math.floor(
              (now.getTime() - enrolledAt.toDate().getTime()) /
                (1000 * 60 * 60 * 24)
            );
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
              status: "active",
            };
          }
          return {
            id: lessonId,
            title: lessonId.replace(/-/g, " "),
            description: "",
            instructor: "",
            image: "",
            uploaded,
            status: "inactive",
          };
        });
 
        const resolvedLessons = await Promise.all(lessonPromises);
        setLessons(resolvedLessons);
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
        <h2 className="font-bold text-base sm:text-lg text-black">My Lessons</h2>
        {/* <button
          className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-medium shadow hover:bg-blue-700 w-full sm:w-auto justify-center"
          onClick={() => router.push("/lessons/create")}
        >
          <PlusCircle className="w-4 h-4" /> Upload New Lesson
        </button> */}
      </div>
 
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="relative flex justify-center items-center">
            <div className="w-12 h-12 relative">
              <div className="absolute inset-0 flex justify-center items-center">
                <div
                  className="w-2.5 h-2.5 bg-blue-600 rounded-full absolute animate-pulse"
                  style={{
                    top: "0%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    animationDelay: "0s",
                  }}
                ></div>
                <div
                  className="w-2.5 h-2.5 bg-blue-600 rounded-full absolute animate-pulse"
                  style={{
                    top: "14.6%",
                    left: "85.4%",
                    transform: "translate(-50%, -50%)",
                    animationDelay: "0.1s",
                  }}
                ></div>
                <div
                  className="w-2.5 h-2.5 bg-blue-500 rounded-full absolute animate-pulse"
                  style={{
                    top: "50%",
                    left: "100%",
                    transform: "translate(-50%, -50%)",
                    animationDelay: "0.2s",
                  }}
                ></div>
                <div
                  className="w-2.5 h-2.5 bg-blue-400 rounded-full absolute animate-pulse"
                  style={{
                    top: "85.4%",
                    left: "85.4%",
                    transform: "translate(-50%, -50%)",
                    animationDelay: "0.3s",
                  }}
                ></div>
                <div
                  className="w-2.5 h-2.5 bg-blue-300 rounded-full absolute animate-pulse"
                  style={{
                    top: "100%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    animationDelay: "0.4s",
                  }}
                ></div>
                <div
                  className="w-2.5 h-2.5 bg-blue-200 rounded-full absolute animate-pulse"
                  style={{
                    top: "85.4%",
                    left: "14.6%",
                    transform: "translate(-50%, -50%)",
                    animationDelay: "0.5s",
                  }}
                ></div>
                <div
                  className="w-2.5 h-2.5 bg-blue-200 rounded-full absolute animate-pulse"
                  style={{
                    top: "50%",
                    left: "0%",
                    transform: "translate(-50%, -50%)",
                    animationDelay: "0.6s",
                  }}
                ></div>
                <div
                  className="w-2.5 h-2.5 bg-blue-300 rounded-full absolute animate-pulse"
                  style={{
                    top: "14.6%",
                    left: "14.6%",
                    transform: "translate(-50%, -50%)",
                    animationDelay: "0.7s",
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      ) : lessons.length === 0 ? (
        <div className="text-gray-500 text-center py-8 text-sm">
          No enrolled lessons yet.
        </div>
      ) : (
        <ul className="space-y-2 mb-8">
          {lessons.map((lesson) => (
            <li
              key={lesson.id}
              className={`border-2 rounded-lg p-2 flex flex-row items-center justify-between transition-colors cursor-pointer
                ${
                  lesson.status === "inactive"
                    ? "border-gray-300 bg-gray-100 opacity-60 cursor-default pointer-events-none"
                    : "border-purple-500 bg-purple-50 hover:bg-purple-100"
                }`}
              onClick={() =>
                lesson.status === "active" && router.push(`/skills/${lesson.id}`)
              }
              style={{ minHeight: "56px" }}
            >
              <div className="flex-shrink-0 mr-3">
                {lesson.image ? (
                  <img
                    src={lesson.image}
                    alt={lesson.title}
                    className="w-10 h-10 object-cover rounded-lg"
                  />
                ) : (
                  <div className="bg-amber-100 p-1 rounded-lg">
                    <svg width="22" height="22" fill="none">
                      <rect width="22" height="22" rx="5" fill="#F7CA95" />
                    </svg>
                  </div>
                )}
              </div>
 
              <div className="flex-1 min-w-0">
                <p
                  className={`font-semibold text-gray-800 text-sm truncate ${
                    lesson.status === "inactive" && "line-through"
                  }`}
                >
                  {lesson.title}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                  {lesson.instructor && (
                    <span className="truncate">by {lesson.instructor}</span>
                  )}
                  {lesson.instructor && <span>•</span>}
                  <span className="whitespace-nowrap">
                    Enrolled {lesson.uploaded}
                  </span>
                </div>
                {lesson.status === "inactive" && (
                  <span className="block text-xs text-red-500">
                    Lesson not found
                  </span>
                )}
              </div>
 
              <div>
                {lesson.status === "active" && (
                  <button
                    className="text-blue-600 hover:text-blue-700 font-medium text-xs sm:ml-4"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/skills/${lesson.id}`);
                    }}
                  >
                    Continue →
                  </button>
                )}
                {lesson.status === "inactive" && (
                  <span className="text-xs text-gray-400 sm:ml-4">
                    Unavailable
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}