'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Header from '@/components/shared/header/Header';
import AccordionSection from '@/components/dashboard/AccordionSection';
import LessonNotes from '@/components/lessons/LessonNotes';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase/firebaseConfig';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from 'firebase/firestore';

type SkillDetailPageProps = {
  initialSkillId: string;
  initialSectionId: string;
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

export default function SkillDetailPage({
  initialSkillId,
  initialSectionId,
}: SkillDetailPageProps) {
  const [skillId] = useState(initialSkillId);
  const [sectionId] = useState(initialSectionId);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user] = useAuthState(auth);

  const [skills, setSkills] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loadingEnroll, setLoadingEnroll] = useState(false);

  // Fetch lessons once
  useEffect(() => {
    async function fetchLessons() {
      try {
        const lessonsSnapshot = await getDocs(collection(db, 'lessons'));
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
                id: 'skill-overview',
                name: 'Skill overview',
                title: 'Skill overview',
                content: data.description || 'No description available.',
              },
              ...(data.sections || []).map(
                (section: any, idx: number): LessonSection => ({
                  id: section.id || `section-${idx}`,
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
        console.error('Error fetching lessons:', error);
      } finally {
        setLoading(false);
      }
    }

    void fetchLessons();
  }, []);

  const skill = useMemo(
    () => skills.find((s) => s.id === skillId),
    [skills, skillId]
  );

  // Check enrollment for this skill
  useEffect(() => {
    if (!user || !skillId) {
      setIsEnrolled(false);
      return;
    }

    const ref = doc(db, 'users', user.uid, 'enrolledSkills', skillId);
    getDoc(ref).then((docSnap) => {
      setIsEnrolled(docSnap.exists());
    });
  }, [user, skillId]);

  // Enroll handler
  async function handleEnroll() {
    if (!user) return;
    setLoadingEnroll(true);
    try {
      const ref = doc(db, 'users', user.uid, 'enrolledSkills', skillId);
      await setDoc(ref, {
        enrolledAt: new Date(),
      });
      setIsEnrolled(true);
    } catch (error) {
      console.error('Error enrolling:', error);
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

  if (!skill) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500 text-lg">Lesson not found.</div>
      </div>
    );
  }

  const sectionToOpenId =
    sectionId && skill.sections.some((s) => s.id === sectionId)
      ? sectionId
      : skill.sections[0]?.id;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      <main className="max-w-5xl mx-auto px-4 py-10">
        {/* Lesson hero */}
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
          {skill.instructor && (
            <p className="text-lg font-medium text-blue-900 mb-2">
              Instructor: {skill.instructor}
            </p>
          )}
          {skill.description && (
            <p className="text-base text-blue-800">{skill.description}</p>
          )}

          {/* Only enroll button before access; no swap or other actions */}
          {user && !isEnrolled && (
            <div className="mt-6 flex justify-center">
              <button
                className={`px-5 py-2 rounded font-semibold transition-colors bg-blue-600 hover:bg-blue-700 text-white ${
                  loadingEnroll ? 'opacity-70 cursor-wait' : ''
                }`}
                onClick={handleEnroll}
                disabled={loadingEnroll}
                type="button"
              >
                {loadingEnroll ? 'Enrolling...' : 'Enroll to access content'}
              </button>
            </div>
          )}
        </div>

        {/* Sections: only visible after enroll */}
        {isEnrolled ? (
          <>
            {skill.sections.map((section, idx) => {
              const currentId = section.id || `section-${idx}`;
              const defaultOpen = currentId === sectionToOpenId;

              return (
                <AccordionSection
                  key={currentId}
                  title={section.title || section.name}
                  defaultOpen={defaultOpen}
                >
                  <div className="space-y-4">
                    {section.content && (
                      <div className="text-gray-900 leading-relaxed whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                        {section.content}
                      </div>
                    )}

                    {section.videoUrl && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">
                          Video Lesson
                        </h4>
                        <video
                          src={section.videoUrl}
                          controls
                          controlsList="nodownload"
                          className="w-full max-w-3xl rounded-lg border border-gray-200 shadow-sm"
                        />
                      </div>
                    )}

                    {currentId && currentId !== 'skill-overview' && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">
                          Your Notes
                        </h4>
                        <LessonNotes
                          skillId={skillId}
                          sectionId={currentId}
                        />
                      </div>
                    )}
                  </div>
                </AccordionSection>
              );
            })}
          </>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-gray-600 text-lg">
              Please enroll in this course to access the lesson content.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
