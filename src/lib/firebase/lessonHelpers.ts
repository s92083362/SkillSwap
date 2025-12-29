// src/lib/firestore/lessonHelpers.ts
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/firebaseConfig';

export type LessonSection = {
  id: string;
  name: string;
  title: string;
  content: string;
  videoUrl: string;
};

export type Lesson = {
  id: string;
  title: string;
  description: string;
  instructor: string;
  creatorId?: string;
  image?: string;
  visibility: 'public' | 'swap-only';
  sections: LessonSection[];
};

export type UserRole = 'provider' | 'seeker';

export const getAvatarUrl = (u: any) =>
  u?.photoURL || u?.photoUrl || '/default-avatar.png';

// ---- Email notification helper ----
async function sendSwapEmail(params: {
  to: string;
  type: 'created' | 'accepted' | 'rejected';
  lessonTitle: string;
  otherUserName: string;
}) {
  try {
    const response = await fetch('/api/send-swap-status-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      console.error('Failed to send email notification');
    }
  } catch (error) {
    console.error('Error sending email notification:', error);
    // Don't throw - email failure shouldn't block the swap request
  }
}

// ---- fetch lessons ----
export async function fetchAllLessons(): Promise<Lesson[]> {
  const lessonsSnapshot = await getDocs(collection(db, 'lessons'));
  return lessonsSnapshot.docs.map((d) => {
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
}

// ---- enrollment helpers ----
export async function getEnrollmentDoc(userId: string, skillId: string) {
  const ref = doc(db, 'users', userId, 'enrolledSkills', skillId);
  return getDoc(ref);
}

export async function setEnrollment(
  userId: string,
  skillId: string,
  allowedSections: string[]
) {
  const ref = doc(db, 'users', userId, 'enrolledSkills', skillId);
  await setDoc(
    ref,
    {
      enrolledAt: new Date(),
      allowedSections,
    },
    { merge: true }
  );
}

export async function deleteEnrollment(userId: string, skillId: string) {
  const ref = doc(db, 'users', userId, 'enrolledSkills', skillId);
  await deleteDoc(ref);
}

// ---- swap helpers ----
export async function fetchSwapForRequester(userId: string, skillId: string) {
  const qRequester = query(
    collection(db, 'swapRequests'),
    where('requesterId', '==', userId),
    where('requestedLessonId', '==', skillId),
    where('status', '==', 'accepted')
  );
  return getDocs(qRequester);
}

export async function fetchSwapForCreator(userId: string, skillId: string) {
  const qCreator = query(
    collection(db, 'swapRequests'),
    where('creatorId', '==', userId),
    where('requestedLessonId', '==', skillId),
    where('status', '==', 'accepted')
  );
  return getDocs(qCreator);
}

export async function createSwapRequestAndSideEffects(params: {
  user: any;
  skillId: string;
  skillTitle: string;
  offeredSkillTitle: string;
  swapMessage: string;
}) {
  const { user, skillId, skillTitle, offeredSkillTitle, swapMessage } = params;

  const lessonDoc = await getDoc(doc(db, 'lessons', skillId));
  if (!lessonDoc.exists()) {
    throw new Error('Lesson not found in database.');
  }

  const lessonData = lessonDoc.data() as any;
  const authorId = lessonData.creatorId as string | undefined;
  if (!authorId) {
    throw new Error("This lesson doesn't have creator information.");
  }
  if (authorId === user.uid) {
    throw new Error('You cannot send a swap request for your own lesson.');
  }

  // Get creator's email from users collection
  let creatorEmail = '';
  try {
    const creatorDoc = await getDoc(doc(db, 'users', authorId));
    if (creatorDoc.exists()) {
      creatorEmail = creatorDoc.data()?.email || '';
    }
  } catch (error) {
    console.error('Error fetching creator email:', error);
  }

  const swapRequestRef = doc(collection(db, 'swapRequests'));

  await setDoc(swapRequestRef, {
    requesterId: user.uid,
    requesterName: user.displayName || user.email || 'Anonymous',
    requesterEmail: user.email,
    creatorId: authorId,
    requestedLessonId: skillId,
    requestedLessonTitle: skillTitle,
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
    } wants to exchange "${offeredSkillTitle.trim()}" for your "${skillTitle}" lesson`,
    swapRequestId: swapRequestRef.id,
    senderId: user.uid,
    senderName: user.displayName || user.email || 'Anonymous',
    senderEmail: user.email,
    timestamp: new Date(),
    read: false,
    actions: ['View'],
  });

  // Send email notification to the lesson creator
  if (creatorEmail) {
    await sendSwapEmail({
      to: creatorEmail,
      type: 'created',
      lessonTitle: skillTitle,
      otherUserName: user.displayName || user.email || 'A user',
    });
  }
}