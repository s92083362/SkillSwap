'use client';

import React, { useState, useEffect, use } from 'react';
import Header from '../../../components/shared/header/Header';
import AccordionSection from '../../../components/dashboard/AccordionSection';
import { notFound, useRouter } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../../../lib/firebase/firebaseConfig';
import LessonNotes from '../../../components/lessons/LessonNotes';
import {
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  deleteDoc,
  addDoc,
  serverTimestamp,
  query,
  where,
} from 'firebase/firestore';

type SkillPageProps = {
  params: Promise<{
    skillId: string;
  }>;
};

type LessonSection = {
  id: string;
  name: string;
  title: string;
  content: string;
  videoUrl: string;
};

type Lesson = {
  id: string;
  title: string;
  description: string;
  instructor: string;
  creatorId?: string;
  image?: string;
  visibility: 'public' | 'swap-only';
  sections: LessonSection[];
};

type UserRole = 'provider' | 'seeker';

export default function SkillPage({ params }: SkillPageProps) {
  // Unwrap the params Promise using React.use()
  const { skillId } = use(params);
  const router = useRouter();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user] = useAuthState(auth);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loadingEnroll, setLoadingEnroll] = useState(false);
  const [skills, setSkills] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  // Swap status
  const [hasSwapped, setHasSwapped] = useState(false);
  const [instructorId, setInstructorId] = useState('');
  const [instructorName, setInstructorName] = useState('');
  const [instructorAvatar, setInstructorAvatar] = useState('');
  const [userRole, setUserRole] = useState<UserRole>('seeker');
  const [isLessonOwner, setIsLessonOwner] = useState(false);

  // Swap Skill Popup State
  const [showExchange, setShowExchange] = useState(false);
  const [offeredSkillTitle, setOfferedSkillTitle] = useState('');
  const [swapMessage, setSwapMessage] = useState('');
  const [sendingSwap, setSendingSwap] = useState(false);
  const [agreed, setAgreed] = useState(false);

  // Sections unlocked for the user
  const [allowedSections, setAllowedSections] = useState<string[]>([]);

  const getAvatarUrl = (u: any) =>
    u?.photoURL || u?.photoUrl || '/default-avatar.png';

  // Fetch lessons
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
            creatorId: data.creatorId,
            image: data.image,
            visibility: (data.visibility as 'public' | 'swap-only') || 'swap-only',
            sections: (data.sections || []).map(
              (section: any, idx: number): LessonSection => ({
                id: section.id || `section-${idx}`,
                name: section.title,
                title: section.title,
                content: section.content,
                videoUrl: section.videoUrl,
              })
            ),
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

  const skill = skills.find((s) => s.id === skillId);

  // Check if current user is the lesson owner
  useEffect(() => {
    if (!user || !skill) return;
    setIsLessonOwner(skill.creatorId === user.uid);
  }, [user, skill]);

  // Fetch enrollment & allowed sections
  useEffect(() => {
    if (!user || !skillId || !skill) return;

    const fetchEnrollment = async () => {
      if (skill.creatorId === user.uid) {
        setIsEnrolled(true);
        const allSections = skill.sections?.map((sec) => sec.id) || [];
        setAllowedSections(allSections);
        return;
      }

      const ref = doc(db, 'users', user.uid, 'enrolledSkills', skillId);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        setIsEnrolled(true);
        const data = snap.data() as { allowedSections?: string[] };
        setAllowedSections(
          data.allowedSections || (skill.sections[0] ? [skill.sections[0].id] : [])
        );
      } else {
        setIsEnrolled(false);
        setAllowedSections([]);
      }
    };

    void fetchEnrollment();
  }, [user, skillId, skill]);

  // Check if user has swapped skills
  useEffect(() => {
    if (!user || !skillId || !skill) return;

    const checkSwapStatus = async () => {
      try {
        // requester side
        const qRequester = query(
          collection(db, 'swapRequests'),
          where('requesterId', '==', user.uid),
          where('requestedLessonId', '==', skillId),
          where('status', '==', 'accepted')
        );

        const snapshotRequester = await getDocs(qRequester);

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
          }
          return;
        }

        // creator side
        const qCreator = query(
          collection(db, 'swapRequests'),
          where('creatorId', '==', user.uid),
          where('requestedLessonId', '==', skillId),
          where('status', '==', 'accepted')
        );

        const snapshotCreator = await getDocs(qCreator);

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
          }
        } else {
          setHasSwapped(false);
        }
      } catch (err) {
        console.error('Error checking swap status:', err);
      }
    };

    void checkSwapStatus();
  }, [user, skillId, skill]);

  // Check access (public or swap)
  useEffect(() => {
    if (!user || !skillId || !skill) return;

    const checkAccess = async () => {
      try {
        const allSections = skill.sections?.map((sec) => sec.id) || [];

        if (skill.creatorId === user.uid) {
          setAllowedSections(allSections);
          return;
        }

        if (skill.visibility === 'public') {
          setAllowedSections(allSections);

          const enrollmentRef = doc(
            db,
            'users',
            user.uid,
            'enrolledSkills',
            skillId
          );
          await setDoc(
            enrollmentRef,
            { allowedSections: allSections },
            { merge: true }
          );
          return;
        }

        const q = query(
          collection(db, 'swapRequests'),
          where('requesterId', '==', user.uid),
          where('requestedLessonId', '==', skillId),
          where('status', '==', 'accepted')
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          setAllowedSections(allSections);

          const enrollmentRef = doc(
            db,
            'users',
            user.uid,
            'enrolledSkills',
            skillId
          );
          await setDoc(
            enrollmentRef,
            { allowedSections: allSections },
            { merge: true }
          );
        }
      } catch (err) {
        console.error('Error checking access:', err);
      }
    };

    void checkAccess();
  }, [user, skillId, skill]);

  // Enroll / Unenroll toggle
  async function handleEnrollToggle() {
    if (!user || !skill) return;
    setLoadingEnroll(true);
    try {
      const ref = doc(db, 'users', user.uid, 'enrolledSkills', skillId);

      if (isEnrolled) {
        await deleteDoc(ref);
        setIsEnrolled(false);
        setAllowedSections([]);
      } else {
        const firstSectionId = skill.sections[0]?.id;
        await setDoc(ref, {
          enrolledAt: new Date(),
          allowedSections: firstSectionId ? [firstSectionId] : [],
        });
        setIsEnrolled(true);
        setAllowedSections(firstSectionId ? [firstSectionId] : []);
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

  // Submit Swap Request
  async function handleSwapSubmit() {
    if (!offeredSkillTitle.trim() || !agreed || !user || !skill) return;
    setSendingSwap(true);
    try {
      const lessonDoc = await getDoc(doc(db, 'lessons', skillId));

      if (!lessonDoc.exists()) {
        alert('Lesson not found in database.');
        setSendingSwap(false);
        return;
      }

      const lessonData = lessonDoc.data() as any;
      const authorId = lessonData.creatorId as string | undefined;

      if (!authorId) {
        alert("This lesson doesn't have creator information.");
        setSendingSwap(false);
        return;
      }

      if (authorId === user.uid) {
        alert('You cannot send a swap request for your own lesson.');
        setSendingSwap(false);
        return;
      }

      const swapRequestRef = doc(collection(db, 'swapRequests'));

      await setDoc(swapRequestRef, {
        requesterId: user.uid,
        requesterName: user.displayName || user.email || 'Anonymous',
        requesterEmail: user.email,
        creatorId: authorId,
        requestedLessonId: skillId,
        requestedLessonTitle: skill.title,
        offeredSkillTitle: offeredSkillTitle.trim(),
        message: swapMessage,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const chatId = [user.uid, authorId].sort().join('_');

      await addDoc(collection(db, 'privateChats', chatId, 'messages'), {
        senderId: user.uid,
        senderName: user.displayName || user.email || 'Anonymous',
        content: swapMessage,
        timestamp: serverTimestamp(),
      });

      const notificationRef = doc(collection(db, 'notifications'));
      await setDoc(notificationRef, {
        userId: authorId,
        type: 'swap_request',
        title: 'New Skill Swap Request',
        message: `${
          user.displayName || user.email || 'Someone'
        } wants to exchange "${offeredSkillTitle.trim()}" for your "${
          skill.title
        }" lesson`,
        swapRequestId: swapRequestRef.id,
        senderId: user.uid,
        senderName: user.displayName || user.email || 'Anonymous',
        senderEmail: user.email,
        timestamp: new Date(),
        read: false,
        actions: ['View'],
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

          {/* contact card */}
          {user && hasSwapped && (
            <div className="mt-6 bg-white rounded-lg p-6 shadow-sm max-w-md mx-auto">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-blue-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                    {instructorAvatar ? (
                      <img
                        src={instructorAvatar}
                        alt={instructorName || 'Partner'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-base font-semibold text-blue-700">
                        {(instructorName || '?').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <p className="text-sm text-gray-500 mb-1">
                      {userRole === 'seeker'
                        ? 'Contact Skill Provider'
                        : 'Contact Skill Seeker'}
                    </p>
                    <p className="text-lg font-semibold text-gray-900 truncate">
                      {instructorName}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleChatWithInstructor}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded transition-colors flex-shrink-0"
                >
                  Chat
                </button>
              </div>
            </div>
          )}

          {/* Swap button */}
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

          {/* Edit button */}
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

          {/* Enroll / Unenroll */}
          {user && !isLessonOwner && (
            <div className="mt-8 flex justify-center">
              <button
                className={`px-5 py-2 rounded font-semibold transition-colors ${
                  isEnrolled
                    ? 'bg-red-500 hover:bg-red-600 text-white cursor-pointer'
                    : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                } ${loadingEnroll ? 'opacity-70 cursor-wait' : ''}`}
                onClick={handleEnrollToggle}
                disabled={loadingEnroll}
              >
                {loadingEnroll
                  ? isEnrolled
                    ? 'Unenrolling...'
                    : 'Enrolling...'
                  : isEnrolled
                  ? 'Unenroll'
                  : 'Enroll'}
              </button>
            </div>
          )}
        </div>

        {/* Swap Request Modal */}
        {showExchange && (
          <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-white/30">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl p-8 relative">
              <button
                onClick={() => setShowExchange(false)}
                className="absolute top-4 right-4 text-2xl text-gray-400 hover:text-blue-600 font-bold"
              >
                ×
              </button>
              <h2 className="text-2xl font-extrabold text-gray-900 mb-2">
                Request an Exchange
              </h2>
              <p className="text-gray-600 mb-8">
                You are one step away from learning a new skill!
              </p>
              <div className="mb-6">
                <label className="block font-semibold text-gray-800 mb-2">
                  Skill to offer in return
                </label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2 text-gray-900"
                  placeholder="e.g. Web Development, Graphic Design..."
                  value={offeredSkillTitle}
                  onChange={(e) => setOfferedSkillTitle(e.target.value)}
                />
              </div>
              <div className="mb-6">
                <label className="block font-semibold text-gray-800 mb-2">
                  Add a message{' '}
                  <span className="text-gray-500 font-normal">(optional)</span>
                </label>
                <textarea
                  className="w-full border rounded px-3 py-2 min-h-[80px] text-gray-900"
                  placeholder="Hi! I'd love to exchange my skills for your course."
                  value={swapMessage}
                  onChange={(e) => setSwapMessage(e.target.value)}
                />
              </div>
              <div className="flex items-center mb-8">
                <input
                  type="checkbox"
                  id="agree"
                  className="mr-2"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                />
                <label htmlFor="agree" className="text-gray-700 text-sm">
                  I agree to the SkillSwap{' '}
                  <a className="text-blue-600 underline" href="#">
                    Terms
                  </a>{' '}
                  and{' '}
                  <a className="text-blue-600 underline" href="#">
                    Conditions
                  </a>
                  .
                </label>
              </div>
              <button
                className="w-full bg-blue-900 hover:bg-blue-800 text-white text-lg font-semibold rounded py-3 mt-2 transition disabled:opacity-60"
                disabled={sendingSwap || !offeredSkillTitle.trim() || !agreed}
                onClick={handleSwapSubmit}
              >
                {sendingSwap ? 'Sending...' : 'Skill Exchange Request'}
              </button>
            </div>
          </div>
        )}

        {/* Lessons */}
        {isEnrolled ? (
          <>
            {skill.sections.map((section, idx) => {
              const sectionId = section.id || `section-${idx}`;
              const isAllowed = allowedSections.includes(sectionId);
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
                        This section is locked. Swap request approval will unlock it.
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