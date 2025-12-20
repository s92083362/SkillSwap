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

  // pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 4; // 4 lessons per page

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
          let enrolledAtDate: Date | null = null;

          if (enrolledAt && enrolledAt.toDate) {
            enrolledAtDate = enrolledAt.toDate();
            const now = new Date();
            const days = Math.floor(
              (now.getTime() - enrolledAtDate.getTime()) /
                (1000 * 60 * 60 * 24)
            );
            uploaded =
              days === 0 ? "Today" : `${days} day${days > 1 ? "s" : ""} ago`;
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
              enrolledAtDate,
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
            enrolledAtDate,
          };
        });

        const resolved = await Promise.all(lessonPromises);

        // sort by enrolledAtDate desc (latest first)
        resolved.sort((a, b) => {
          const aTime = a.enrolledAtDate
            ? a.enrolledAtDate.getTime()
            : 0;
          const bTime = b.enrolledAtDate
            ? b.enrolledAtDate.getTime()
            : 0;
          return bTime - aTime;
        });

        setLessons(resolved);
        setCurrentPage(1); // always show first page (latest)
      } catch (error) {
        console.error("Error fetching enrolled lessons:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLessons();
  }, [user]);

  // pagination calculations
  const totalPages = Math.ceil(lessons.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedLessons = lessons.slice(startIndex, endIndex);

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage((p) => p + 1);
  };

  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage((p) => p - 1);
  };

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <h2 className="font-bold text-base sm:text-lg text-black">My Lessons</h2>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          {/* loader unchanged */}
          <div className="relative flex justify-center items-center">
            <div className="w-12 h-12 relative">
              <div className="absolute inset-0 flex justify-center items-center">
                {/* your dots here */}
              </div>
            </div>
          </div>
        </div>
      ) : lessons.length === 0 ? (
        <div className="text-gray-500 text-center py-8 text-sm">
          No enrolled lessons yet.
        </div>
      ) : (
        <>
          <ul className="space-y-2 mb-4">
            {paginatedLessons.map((lesson) => (
              <li
                key={lesson.id}
                className={`border-2 rounded-lg p-2 flex flex-row items-center justify-between transition-colors cursor-pointer
                  ${
                    lesson.status === "inactive"
                      ? "border-gray-300 bg-gray-100 opacity-60 cursor-default pointer-events-none"
                      : "border-purple-500 bg-purple-50 hover:bg-purple-100"
                  }`}
                onClick={() =>
                  lesson.status === "active" &&
                  router.push(`/skills/${lesson.id}`)
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
                  {lesson.status === "active" ? (
                    <button
                      className="text-blue-600 hover:text-blue-700 font-medium text-xs sm:ml-4"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/skills/${lesson.id}`);
                      }}
                    >
                      Continue →
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400 sm:ml-4">
                      Unavailable
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {/* pagination controls, only if more than 4 lessons */}
          {lessons.length > pageSize && (
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={handlePrev}
                disabled={currentPage === 1}
                className="px-3 py-1 text-xs font-semibold text-blue-600 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                ← Prev
              </button>
              <span className="text-xs text-gray-500">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={handleNext}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-xs font-semibold text-blue-600 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
