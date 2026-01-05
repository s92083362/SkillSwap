// src/components/profile/UserPublicProfile.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  doc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseConfig";
import { getSkillIcon } from "@/utils/skillicons/skillIcons";

type UserDoc = {
  displayName?: string;
  name?: string;
  username?: string;
  photoURL?: string;
  photoUrl?: string;
  avatar?: string;
  profilePicture?: string;
  email?: string;
  bio?: string;
  status?: string;
  availability?: string;
  verified?: boolean;
  skills?: string; // comma-separated
  skillsToLearn?: string; // comma-separated
};

type Lesson = {
  id: string;
  title: string;
  description?: string;
  skillCategory?: string;
  category?: string;
};

const getAvatarUrl = (userData?: UserDoc | null): string => {
  if (!userData) return "/default-avatar.png";
  return (
    userData.photoURL ||
    userData.photoUrl ||
    userData.avatar ||
    userData.profilePicture ||
    "/default-avatar.png"
  );
};

const getDisplayName = (userData?: UserDoc | null): string => {
  if (!userData) return "Unknown User";
  return (
    userData.displayName ||
    userData.name ||
    userData.username ||
    "Unknown User"
  );
};

const UserPublicProfile = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<UserDoc | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  // Update browser tab title when user changes
  useEffect(() => {
    if (!user) return;
    const name = getDisplayName(user);
    const prevTitle = document.title;
    document.title = `SkillSwap | ${name}`;
    return () => {
      document.title = prevTitle;
    };
  }, [user]);

  // Realtime user profile
  useEffect(() => {
    if (!params?.id) return;

    const userRef = doc(db, "users", params.id);

    const unsubscribe = onSnapshot(
      userRef,
      (snap) => {
        if (snap.exists()) {
          setUser(snap.data() as UserDoc);
        } else {
          setUser(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error listening to user profile:", error);
        setUser(null);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [params?.id]);

  // Lessons uploaded by this user
  useEffect(() => {
    const loadLessons = async () => {
      if (!params?.id) return;
      try {
        const lessonsRef = collection(db, "lessons");
        const q = query(lessonsRef, where("creatorId", "==", params.id));
        const lessonsSnap = await getDocs(q);

        const userLessons: Lesson[] = lessonsSnap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            title: data.title || "Untitled Lesson",
            description: data.description || "",
            skillCategory: data.skillCategory,
            category: data.category,
          };
        });

        setLessons(userLessons);
      } catch (err) {
        console.error("Error loading lessons:", err);
        setLessons([]);
      }
    };

    loadLessons();
  }, [params?.id]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#e7e9f0] px-4">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#e7e9f0] px-4">
        <div className="bg-white rounded-xl shadow-md px-6 py-4">
          <p className="text-gray-700 text-sm">User profile not found.</p>
        </div>
      </main>
    );
  }

  const avatarUrl = getAvatarUrl(user);
  const displayName = getDisplayName(user);
  const statusText =
    user.status || user.availability || "Available for new swaps";

  const skillsITeach = (user.skills || "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const skillsIWantToLearn = (user.skillsToLearn || "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return (
    <main className="min-h-screen bg-[#f3f5fb]">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8 lg:py-10 space-y-4 sm:space-y-5 md:space-y-6">
        {/* Profile header */}
        <section className="bg-white rounded-2xl sm:rounded-3xl shadow-md border border-gray-100 p-4 sm:p-6 md:p-7 lg:p-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 md:gap-6">
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center shadow">
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="flex-1 text-center sm:text-left w-full">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 mb-1">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold text-gray-900">
                  {displayName}
                </h1>
                {user.verified && (
                  <span className="inline-flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-blue-500 text-white text-[10px] sm:text-[11px] mt-0.5">
                    ✓
                  </span>
                )}
              </div>

              {(user.name || user.username) && (
                <p className="text-xs sm:text-sm text-gray-500 mb-2">
                  {user.name || user.username}
                </p>
              )}

              <div className="flex items-center justify-center sm:justify-start gap-2 text-xs sm:text-sm">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-gray-700">{statusText}</span>
              </div>
            </div>
          </div>
        </section>

        {/* About Me */}
        <section className="bg-white rounded-2xl sm:rounded-3xl shadow-md border border-gray-100 p-4 sm:p-6 md:p-7">
          <div className="flex items-center gap-2 sm:gap-3 mb-3">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl sm:rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500">
              <span className="text-base sm:text-lg">👤</span>
            </div>
            <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900">
              About Me
            </h2>
          </div>

          <p className="text-xs sm:text-sm md:text-base text-gray-600 leading-relaxed">
            {user.bio && user.bio.trim().length > 0
              ? user.bio
              : "No bio yet. Tell us about yourself!"}
          </p>
        </section>

        {/* Skills sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
          {/* Skills I Teach */}
          <section className="bg-white rounded-2xl sm:rounded-3xl shadow-md border border-gray-100 p-4 sm:p-6 md:p-7">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-xl sm:rounded-2xl bg-blue-50 flex items-center justify-center">
                <span className="text-lg sm:text-xl md:text-2xl">💡</span>
              </div>
              <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900">
                Skills I Teach
              </h2>
            </div>

            {skillsITeach.length === 0 ? (
              <p className="text-xs sm:text-sm text-gray-500">
                No skills added yet as a teacher.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {skillsITeach.map((skill) => {
                  const icon = getSkillIcon(skill);
                  return (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 md:px-4 rounded-lg sm:rounded-xl bg-blue-50 border border-blue-100 text-gray-800 text-xs sm:text-sm font-medium hover:bg-blue-100 transition-colors"
                    >
                      {icon.type === "url" ? (
                        <img
                          src={icon.value}
                          alt={skill}
                          className="w-4 h-4 sm:w-5 sm:h-5 object-contain flex-shrink-0"
                        />
                      ) : (
                        <span className="text-sm sm:text-base md:text-lg flex-shrink-0">
                          {icon.value}
                        </span>
                      )}
                      <span className="break-words">{skill}</span>
                    </span>
                  );
                })}
              </div>
            )}
          </section>

          {/* Skills I Want to Learn */}
          <section className="bg-white rounded-2xl sm:rounded-3xl shadow-md border border-gray-100 p-4 sm:p-6 md:p-7">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-xl sm:rounded-2xl bg-purple-50 flex items-center justify-center">
                <span className="text-lg sm:text-xl md:text-2xl">📘</span>
              </div>
              <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900">
                Skills I Want to Learn
              </h2>
            </div>

            {skillsIWantToLearn.length === 0 ? (
              <p className="text-xs sm:text-sm text-gray-500">
                No skills added yet as a learner.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {skillsIWantToLearn.map((skill) => {
                  const icon = getSkillIcon(skill);
                  return (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 md:px-4 rounded-lg sm:rounded-xl bg-purple-50 border border-purple-100 text-purple-700 text-xs sm:text-sm font-medium hover:bg-purple-100 transition-colors"
                    >
                      {icon.type === "url" ? (
                        <img
                          src={icon.value}
                          alt={skill}
                          className="w-4 h-4 sm:w-5 sm:h-5 object-contain flex-shrink-0"
                        />
                      ) : (
                        <span className="text-sm sm:text-base md:text-lg flex-shrink-0">
                          {icon.value}
                        </span>
                      )}
                      <span className="break-words">{skill}</span>
                    </span>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Lessons */}
        <section className="bg-white rounded-2xl sm:rounded-3xl shadow-md border border-gray-100 p-4 sm:p-6 md:p-7">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl sm:rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500">
              <span className="text-base sm:text-lg">📚</span>
            </div>
            <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900">
              Lessons uploaded by {displayName}
            </h2>
          </div>

          {lessons.length === 0 ? (
            <p className="text-xs sm:text-sm text-gray-500">
              This user has not uploaded any lessons yet.
            </p>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {lessons.map((lesson) => (
                <div
                  key={lesson.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 rounded-xl sm:rounded-2xl border border-gray-100 bg-gray-50 px-3 py-2.5 sm:px-4 sm:py-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">
                      {lesson.title}
                    </p>
                    {lesson.description && (
                      <p className="text-[10px] sm:text-xs text-gray-600 line-clamp-2 mt-0.5">
                        {lesson.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {lesson.skillCategory || lesson.category ? (
                      <span className="inline-flex items-center px-2 py-1 sm:px-3 sm:py-1 rounded-full bg-white text-gray-700 text-[10px] sm:text-xs border border-gray-200 whitespace-nowrap">
                        {lesson.skillCategory || lesson.category}
                      </span>
                    ) : null}
                    <button
                      onClick={() => router.push(`/skills/${lesson.id}`)}
                      className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-blue-500 text-white text-[10px] sm:text-xs font-semibold hover:bg-blue-600 transition-colors"
                    >
                      View Skill
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

export default UserPublicProfile;
