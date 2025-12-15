"use client";

import React, { useState, useEffect } from "react";
import Header from "../../../../components/shared/header/Header";
import AccordionSection from "../../../../components/dashboard/AccordionSection";
import { notFound } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../../../../lib/firebase/firebaseConfig";
import { doc, setDoc, getDoc, collection, getDocs } from "firebase/firestore";

type SkillDetailPageProps = {
  params: Promise<{
    skillId: string;
    sectionId: string;
  }>;
};

type LessonSection = {
  id: string;
  name: string;
  title: string;
  content: string;
  videoUrl?: string;
};

type Lesson = {
  id: string;
  title: string;
  description?: string;
  instructor?: string;
  image?: string;
  sections: LessonSection[];
};

export default function SkillDetailPage({ params }: SkillDetailPageProps) {
  const [skillId, setSkillId] = useState<string>("");
  const [sectionId, setSectionId] = useState<string>("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user] = useAuthState(auth);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loadingEnroll, setLoadingEnroll] = useState(false);
  const [skills, setSkills] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  // Unwrap params Promise
  useEffect(() => {
    params.then((resolvedParams) => {
      setSkillId(resolvedParams.skillId);
      setSectionId(resolvedParams.sectionId);
    });
  }, [params]);

  // Fetch Firebase lessons
  useEffect(() => {
    async function fetchLessons() {
      try {
        const lessonsSnapshot = await getDocs(collection(db, "lessons"));
        const firebaseLessons: Lesson[] = lessonsSnapshot.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            title: data.title,
            description: data.description,
            instructor: data.instructor,
            image: data.image,
            sections: [
              {
                id: "skill-overview",
                name: "Skill overview",
                title: "Skill overview",
                content: data.description || "No description available.",
              },
              ...(data.sections || []).map(
                (section: any, idx: number): LessonSection => ({
                  id: `section-${idx}`,
                  name: section.title,
                  title: section.title,
                  content: section.content,
                  videoUrl: section.videoUrl,
                })
              ),
            ],
          };
        });

        setSkills(firebaseLessons);
      } catch (error) {
        console.error("Error fetching lessons:", error);
      } finally {
        setLoading(false);
      }
    }

    void fetchLessons();
  }, []);

  const skill = skills.find((s) => s.id === skillId);

  // Check enrollment status
  useEffect(() => {
    if (!user || !skillId) {
      setIsEnrolled(false);
      return;
    }
    const ref = doc(db, "users", user.uid, "enrolledSkills", skillId);
    getDoc(ref).then((docSnap) => {
      setIsEnrolled(docSnap.exists());
    });
  }, [user, skillId]);

  // Enroll handler
  async function handleEnroll() {
    if (!user) return;
    setLoadingEnroll(true);
    try {
      const ref = doc(db, "users", user.uid, "enrolledSkills", skillId);
      await setDoc(ref, { enrolledAt: new Date() });
      setIsEnrolled(true);
    } catch (error) {
      console.error("Error enrolling:", error);
    } finally {
      setLoadingEnroll(false);
    }
  }

  if (loading || !skillId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500 text-lg">Loading lesson...</div>
      </div>
    );
  }

  if (!skill) return notFound();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="bg-gradient-to-r from-blue-100 to-blue-50 rounded-xl py-14 px-8 text-center mb-8">
          {skill.image && (
            <img
              src={skill.image}
              alt={skill.title}
              className="w-32 h-32 object-cover rounded-lg mx-auto mb-6"
            />
          )}
          <h1 className="text-5xl font-bold text-gray-900 mb-2">
            {skill.title}
          </h1>
          <p className="text-lg font-medium text-blue-900 mb-2">
            Instructor: {skill.instructor}
          </p>
          <p className="text-base text-blue-800">{skill.description}</p>

          {user && (
            <div className="mt-8 flex justify-center">
              {isEnrolled ? (
                <button
                  disabled
                  className="bg-green-200 text-green-700 px-5 py-2 rounded font-semibold opacity-70 cursor-not-allowed"
                >
                  Enrolled
                </button>
              ) : (
                <button
                  className="bg-blue-600 text-white rounded px-5 py-2 font-semibold hover:bg-blue-700 disabled:opacity-70"
                  onClick={handleEnroll}
                  disabled={loadingEnroll}
                >
                  {loadingEnroll ? "Enrolling..." : "Enroll"}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Show lessons only if enrolled */}
        {isEnrolled ? (
          <>
            {skill.sections.map((section, idx) => (
              <AccordionSection
                key={section.id || idx}
                title={section.name}
                defaultOpen={idx === 0}
              >
                <div className="space-y-4">
                  {typeof section.content === "string" ? (
                    <div className="prose max-w-none">
                      <p className="text-gray-900 leading-relaxed whitespace-pre-wrap">
                        {section.content}
                      </p>
                    </div>
                  ) : (
                    <div>{section.content}</div>
                  )}

                  {section.videoUrl && (
                    <div className="mt-6">
                      <h4 className="text-base font-semibold text-gray-900 mb-3">
                        📹 Video Lesson
                      </h4>
                      <div className="bg-black rounded-lg overflow-hidden shadow-lg">
                        <video
                          src={section.videoUrl}
                          controls
                          controlsList="nodownload"
                          className="w-full"
                          preload="metadata"
                        >
                          Your browser does not support the video tag.
                        </video>
                      </div>
                    </div>
                  )}
                </div>
              </AccordionSection>
            ))}
          </>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-gray-600 text-lg">
              Please enroll in this course to access the lessons.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}