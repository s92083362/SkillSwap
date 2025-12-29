'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Header from '@/components/shared/header/UserHeader';
import AccordionSection from '@/components/dashboard/AccordionSection';
import LessonNotes from '@/components/lessons/LessonNotes';
import { useRouter } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase/firebaseConfig';
import {
  Lesson,
  LessonSection,
  UserRole,
  fetchAllLessons,
  getAvatarUrl,
  getEnrollmentDoc,
  setEnrollment,
  deleteEnrollment,
  fetchSwapForCreator,
  fetchSwapForRequester,
  createSwapRequestAndSideEffects,
} from '@/lib/firebase/lessonHelpers';
import { SkillHero } from './SkillHero';
import { ContactCard } from './ContactCard';
import { EnrollButton } from './EnrollButton';
import { SwapModal } from './SwapModal';
import { doc, getDoc } from 'firebase/firestore';

type SkillPageProps = {
  skillId: string;
};

export default function SkillPage({ skillId }: SkillPageProps) {
  const router = useRouter();
  const [user] = useAuthState(auth);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [skills, setSkills] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loadingEnroll, setLoadingEnroll] = useState(false);

  const [hasSwapped, setHasSwapped] = useState(false);
  const [instructorId, setInstructorId] = useState('');
  const [instructorName, setInstructorName] = useState('');
  const [instructorAvatar, setInstructorAvatar] = useState('');
  const [userRole, setUserRole] = useState<UserRole>('seeker');
  const [isLessonOwner, setIsLessonOwner] = useState(false);

  const [showExchange, setShowExchange] = useState(false);
  const [offeredSkillTitle, setOfferedSkillTitle] = useState('');
  const [swapMessage, setSwapMessage] = useState('');
  const [sendingSwap, setSendingSwap] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const [allowedSections, setAllowedSections] = useState<string[]>([]);

  // fetch lessons
  useEffect(() => {
    async function run() {
      try {
        const firebaseLessons = await fetchAllLessons();
        setSkills(firebaseLessons);
      } catch (err) {
        console.error('Error fetching lessons:', err);
      } finally {
        setLoading(false);
      }
    }
    void run();
  }, []);

  const skill = useMemo(
    () => skills.find((s) => s.id === skillId),
    [skills, skillId]
  );

  // tab title: SkillSwap – <lesson title>
  useEffect(() => {
    if (!skill) return;
    const prevTitle = document.title;
    document.title = `SkillSwap | ${skill.title}`;
    return () => {
      document.title = prevTitle;
    };
  }, [skill]); // updates when lesson changes[web:23][web:29][web:40]

  // check owner
  useEffect(() => {
    if (!user || !skill) return;
    setIsLessonOwner(skill.creatorId === user.uid);
  }, [user, skill]);

  // enrollment + allowed sections (from Firestore)
  useEffect(() => {
    if (!user || !skillId || !skill) return;

    const fetchEnrollment = async () => {
      // owner: always treated as enrolled with full access
      if (skill.creatorId === user.uid) {
        setIsEnrolled(true);
        const allSections = skill.sections?.map((sec) => sec.id) || [];
        setAllowedSections(allSections);
        return;
      }

      const snap = await getEnrollmentDoc(user.uid, skillId);

      if (snap.exists()) {
        setIsEnrolled(true);
        const data = snap.data() as { allowedSections?: string[] };
        setAllowedSections(data.allowedSections || []);
      } else {
        setIsEnrolled(false);
        setAllowedSections([]);
      }
    };

    void fetchEnrollment();
  }, [user, skillId, skill]);

  // swap status + avatar
  useEffect(() => {
    if (!user || !skillId || !skill) return;

    const checkSwapStatus = async () => {
      try {
        // requester side
        const snapshotRequester = await fetchSwapForRequester(user.uid, skillId);

        if (!snapshotRequester.empty) {
          setHasSwapped(true);
          setUserRole('seeker');
          const swapData = snapshotRequester.docs[0].data() as any;
          const creatorId = swapData.creatorId as string;
          setInstructorId(creatorId);
          setInstructorName(skill.instructor);

          const creatorRef = doc(db, 'users', creatorId);
          const creatorSnap = await getDoc(creatorRef);
          if (creatorSnap.exists()) {
            const creatorData = creatorSnap.data();
            setInstructorAvatar(getAvatarUrl(creatorData));
          } else {
            setInstructorAvatar('');
          }
          return;
        }

        // creator side
        const snapshotCreator = await fetchSwapForCreator(user.uid, skillId);

        if (!snapshotCreator.empty) {
          setHasSwapped(true);
          setUserRole('provider');
          const swapData = snapshotCreator.docs[0].data() as any;
          const requesterId = swapData.requesterId as string;
          setInstructorId(requesterId);
          setInstructorName(
            (swapData.requesterName as string) || 'Swap Partner'
          );

          const requesterRef = doc(db, 'users', requesterId);
          const requesterSnap = await getDoc(requesterRef);
          if (requesterSnap.exists()) {
            const requesterData = requesterSnap.data();
            setInstructorAvatar(getAvatarUrl(requesterData));
          } else {
            setInstructorAvatar('');
          }
        } else {
          setHasSwapped(false);
          setInstructorAvatar('');
        }
      } catch (err) {
        console.error('Error checking swap status:', err);
      }
    };

    void checkSwapStatus();
  }, [user, skillId, skill]);

  // access upgrades (swap → full access)
  useEffect(() => {
    if (!user || !skillId || !skill) return;

    const checkAccess = async () => {
      try {
        const allSections = skill.sections?.map((sec) => sec.id) || [];

        // owner: full access already handled above
        if (skill.creatorId === user.uid) {
          setAllowedSections(allSections);
          return;
        }

        // public lessons: enrollment already unlocks all
        if (skill.visibility === 'public') {
          return;
        }

        // private (swap-only) lessons: only accepted swap unlocks all
        const [snapshotRequester, snapshotCreator] = await Promise.all([
          fetchSwapForRequester(user.uid, skillId),
          fetchSwapForCreator(user.uid, skillId),
        ]);

        const hasAcceptedSwap =
          !snapshotRequester.empty || !snapshotCreator.empty;

        if (hasAcceptedSwap) {
          setAllowedSections(allSections);
          if (isEnrolled) {
            await setEnrollment(user.uid, skillId, allSections);
          }
        }
      } catch (err) {
        console.error('Error checking access:', err);
      }
    };

    void checkAccess();
  }, [user, skillId, skill, isEnrolled]);

  // enroll / unenroll
  async function handleEnrollToggle() {
    if (!user || !skill) return;
    setLoadingEnroll(true);
    try {
      if (isEnrolled) {
        // Unenroll
        await deleteEnrollment(user.uid, skillId);
        setIsEnrolled(false);
        setAllowedSections([]);
      } else {
        // Enroll: visibility decides initial allowed sections
        const allSections = skill.sections?.map((sec) => sec.id) || [];

        let allowed: string[] = [];

        if (skill.visibility === 'public') {
          // Public lessons: unlock all sections immediately after enrollment
          allowed = allSections;
        } else {
          // Private (swap-only) lessons: no sections unlocked until swap is approved
          allowed = [];
        }

        await setEnrollment(user.uid, skillId, allowed);
        setIsEnrolled(true);
        setAllowedSections(allowed);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoadingEnroll(false);
    }
  }

  function handleChatWithInstructor() {
    if (!instructorId || !user) return;
    router.push(`/chat/messages?user=${instructorId}`);
  }

  function handleEditLesson() {
    router.push(`/lessons/manage/${skillId}`);
  }

  // swap submit
  async function handleSwapSubmit() {
    if (!offeredSkillTitle.trim() || !agreed || !user || !skill) return;
    setSendingSwap(true);
    try {
      await createSwapRequestAndSideEffects({
        user,
        skillId,
        skillTitle: skill.title,
        offeredSkillTitle,
        swapMessage,
      });

      alert(
        'Swap request sent successfully! The lesson author will be notified.'
      );
      setShowExchange(false);
      setOfferedSkillTitle('');
      setSwapMessage('');
      setAgreed(false);
    } catch (error: any) {
      console.error('❌ Swap request error:', error);
      alert(`Failed to send swap request: ${error.message}`);
    } finally {
      setSendingSwap(false);
    }
  }

  if (loading) {
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />
      <main className="max-w-5xl mx_auto px-4 py-10">
        <SkillHero skill={skill}>
          {user && hasSwapped && (
            <ContactCard
              instructorAvatar={instructorAvatar}
              instructorName={instructorName}
              userRole={userRole}
              onChat={handleChatWithInstructor}
            />
          )}

          {user && isEnrolled && !hasSwapped && !isLessonOwner && (
            <div className="mt-4 flex justify-center">
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded text-base"
                onClick={() => setShowExchange(true)}
                disabled={sendingSwap}
                type="button"
              >
                Swap Skill
              </button>
            </div>
          )}

          {user && isLessonOwner && (
            <div className="mt-4 flex justify-center">
              <button
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded text-base"
                onClick={handleEditLesson}
                type="button"
              >
                Edit Lesson
              </button>
            </div>
          )}

          {user && !isLessonOwner && (
            <EnrollButton
              isEnrolled={isEnrolled}
              loading={loadingEnroll}
              onToggle={handleEnrollToggle}
            />
          )}
        </SkillHero>

        <SwapModal
          show={showExchange}
          offeredSkillTitle={offeredSkillTitle}
          swapMessage={swapMessage}
          agreed={agreed}
          sending={sendingSwap}
          onClose={() => setShowExchange(false)}
          onChangeOffered={setOfferedSkillTitle}
          onChangeMessage={setSwapMessage}
          onChangeAgreed={setAgreed}
          onSubmit={handleSwapSubmit}
        />

        {isEnrolled ? (
          <>
            {skill.sections.map((section: LessonSection, idx: number) => {
              const sectionId = section.id || `section-${idx}`;
              const isPrivate = skill.visibility === 'swap-only';

              const isAllowed = isPrivate
                ? allowedSections.includes(sectionId)
                : allowedSections.includes(sectionId);

              return (
                <AccordionSection
                  key={sectionId}
                  title={section.title || section.name}
                  defaultOpen={idx === 0}
                >
                  {isAllowed ? (
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
                      {sectionId && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">
                            Your Notes
                          </h4>
                          <LessonNotes skillId={skillId} sectionId={sectionId} />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-6 rounded-lg text-center">
                      <p className="text-gray-600">
                        This section is locked. Complete a skill swap to unlock
                        all sections.
                      </p>
                    </div>
                  )}
                </AccordionSection>
              );
            })}
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
