"use client";
import React, { useState, useEffect } from "react";
import Header from "../../../components/shared/header/Header";
import AccordionSection from "../../../components/dashboard/AccordionSection";
import { notFound } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../../../lib/firebase/firebaseConfig";
import LessonNotes from "../../../components/lessons/LessonNotes";
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
} from "firebase/firestore";

export default function SkillPage({ params }) {
  const { skillId } = React.use(params);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user] = useAuthState(auth);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loadingEnroll, setLoadingEnroll] = useState(false);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);

  // Swap Skill Popup State
  const [showExchange, setShowExchange] = useState(false);
  const [offeredSkillTitle, setOfferedSkillTitle] = useState("");
  const [swapMessage, setSwapMessage] = useState("");
  const [sendingSwap, setSendingSwap] = useState(false);
  const [agreed, setAgreed] = useState(false);

  // Sections unlocked for the user
  const [allowedSections, setAllowedSections] = useState<string[]>([]);

  // Fetch lessons
  useEffect(() => {
    async function fetchLessons() {
      try {
        const lessonsSnapshot = await getDocs(collection(db, "lessons"));
        const firebaseLessons = lessonsSnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title,
            description: data.description,
            instructor: data.instructor,
            creatorId: data.creatorId,
            image: data.image,
            sections: (data.sections || []).map((section, idx) => ({
              id: section.id || `section-${idx}`,
              name: section.title,
              title: section.title,
              content: section.content,
              videoUrl: section.videoUrl,
            })),
          };
        });

        setSkills(firebaseLessons);
      } catch (error) {
        console.error("Error fetching lessons:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchLessons();
  }, []);

  const skill = skills.find((s) => s.id === skillId);

  // Fetch enrollment & allowed sections
  useEffect(() => {
    if (!user || !skillId) return;

    const fetchEnrollment = async () => {
      const ref = doc(db, "users", user.uid, "enrolledSkills", skillId);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        setIsEnrolled(true);
        const data = snap.data();
        // Only allow first section initially
        setAllowedSections(data.allowedSections || [skill?.sections[0]?.id]);
      } else {
        setIsEnrolled(false);
        setAllowedSections([]);
      }
    };

    fetchEnrollment();
  }, [user, skillId, skill]);

  // Check if user has an accepted swap request for this skill
  useEffect(() => {
    if (!user || !skillId) return;

    const checkSwapRequest = async () => {
      try {
        const q = query(
          collection(db, "swapRequests"),
          where("requesterId", "==", user.uid),
          where("requestedLessonId", "==", skillId),
          where("status", "==", "accepted")
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const allSections = skill?.sections.map((sec) => sec.id) || [];
          setAllowedSections(allSections);

          // Persist allowed sections in Firestore
          const enrollmentRef = doc(db, "users", user.uid, "enrolledSkills", skillId);
          await setDoc(enrollmentRef, { allowedSections: allSections }, { merge: true });

          const swapData = snapshot.docs[0].data();

          const ownerId = swapData.creatorId; // Creator of THIS skill
          const offeredSkillId = swapData.offeredSkillId;

          // Fetch offered course sections
          const offeredLessonDoc = await getDoc(doc(db, "lessons", offeredSkillId));
          const offeredLesson = offeredLessonDoc.data();
          const offeredSections = offeredLesson.sections.map((s, i) => s.id || `section-${i}`);

          // Grant the owner access
          const ownerEnrollmentRef = doc(
            db,
            "users",
            ownerId,
            "enrolledSkills",
            offeredSkillId
          );

          await setDoc(
            ownerEnrollmentRef,
            { allowedSections: offeredSections },
            { merge: true }
          );
        }
      } catch (err) {
        console.error("Error checking swap request status:", err);
      }
    };

    checkSwapRequest();
  }, [user, skillId, skill]);

  // Enroll / Unenroll toggle
  async function handleEnrollToggle() {
    if (!user) return;
    setLoadingEnroll(true);
    try {
      const ref = doc(db, "users", user.uid, "enrolledSkills", skillId);

      if (isEnrolled) {
        await deleteDoc(ref);
        setIsEnrolled(false);
        setAllowedSections([]);
      } else {
        await setDoc(ref, {
          enrolledAt: new Date(),
          allowedSections: [skill?.sections[0]?.id], // Only first section
        });
        setIsEnrolled(true);
        setAllowedSections([skill?.sections[0]?.id]);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoadingEnroll(false);
    }
  }

  // Submit Swap Request
  async function handleSwapSubmit() {
    if (!offeredSkillTitle.trim() || !agreed || !user) return;
    setSendingSwap(true);
    try {
      // Get the author's user ID from the lesson
      const lessonDoc = await getDoc(doc(db, "lessons", skillId));

      if (!lessonDoc.exists()) {
        alert("Lesson not found in database.");
        setSendingSwap(false);
        return;
      }

      const lessonData = lessonDoc.data();

      // Get the creator ID from the lesson
      const authorId = lessonData.creatorId;

      if (authorId === user.uid) {
        alert("You cannot swap with yourself.");
        setSendingSwap(false);
        return;
      }

      // Find offered lesson
      const offeredLessonSnap = await getDocs(
        query(collection(db, "lessons"), where("title", "==", offeredSkillTitle.trim()))
      );

      if (offeredLessonSnap.empty) {
        alert("Your offered skill does not match any of your lessons.");
        setSendingSwap(false);
        return;
      }

      const offeredLessonDoc = offeredLessonSnap.docs[0];
      const offeredLessonData = offeredLessonDoc.data();

      // Create swap request
      const swapRequestRef = doc(collection(db, "swapRequests"));

      await setDoc(swapRequestRef, {
        requesterId: user.uid,
        requesterName: user.displayName || user.email || "Anonymous",
        requesterEmail: user.email,
        creatorId: authorId,
        requestedLessonId: skillId,
        requestedLessonTitle: skill.title,
        offeredSkillId: offeredLessonDoc.id,
        offeredSkillTitle: offeredLessonData.title,
        offeredSkillCreatorId: offeredLessonData.creatorId,
        message: swapMessage,
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const chatId = [user.uid, authorId].sort().join("_");

      // Add the swap message to the chat
      await addDoc(collection(db, "privateChats", chatId, "messages"), {
        senderId: user.uid,
        senderName: user.displayName || user.email || "Anonymous",
        content: swapMessage,
        timestamp: serverTimestamp(),
      });

      // Create notification for the author (FIXED!)
      const notificationRef = doc(collection(db, "notifications"));
      await setDoc(notificationRef, {
        userId: authorId,
        type: "swap_request",
        title: "New Skill Swap Request",
        message: `${user.displayName || user.email} wants to exchange "${offeredSkillTitle.trim()}" for your "${skill.title}"`,
        swapRequestId: swapRequestRef.id,
        senderId: user.uid,
        senderName: user.displayName || user.email,
        senderEmail: user.email,
        timestamp: new Date(),
        read: false,
        actions: ["View"],
      });

      console.log("✅ Swap request and notification created successfully");
      alert("Swap request sent successfully! The lesson author will be notified.");
      setShowExchange(false);
      setOfferedSkillTitle("");
      setSwapMessage("");
      setAgreed(false);
    } catch (error) {
      console.error("❌ Swap request error:", error);
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
      <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="bg-gradient-to-r from-blue-100 to-blue-50 rounded-xl py-14 px-8 text-center mb-8">
          {skill.image && (
            <img
              src={skill.image}
              alt={skill.title}
              className="w-32 h-32 object-cover rounded-lg mx-auto mb-6"
            />
          )}
          <h1 className="text-5xl font-bold text-gray-900 mb-2">{skill.title}</h1>
          <p className="text-lg font-medium text-blue-900 mb-2">
            Instructor: {skill.instructor}
          </p>
          <p className="text-base text-blue-800">{skill.description}</p>

          {/* Swap Skill Button */}
          {user && isEnrolled && (
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
          {user && (
            <div className="mt-8 flex justify-center">
              <button
                className={`px-5 py-2 rounded font-semibold transition-colors ${
                  isEnrolled
                    ? "bg-red-500 hover:bg-red-600 text-white cursor-pointer"
                    : "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                } ${loadingEnroll ? "opacity-70 cursor-wait" : ""}`}
                onClick={handleEnrollToggle}
                disabled={loadingEnroll}
              >
                {loadingEnroll
                  ? isEnrolled
                    ? "Unenrolling..."
                    : "Enrolling..."
                  : isEnrolled
                  ? "Unenroll"
                  : "Enroll"}
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
                  Add a message{" "}
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
                  I agree to the SkillSwap{" "}
                  <a className="text-blue-600 underline" href="#">
                    Terms
                  </a>{" "}
                  and{" "}
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
                {sendingSwap ? "Sending..." : "Skill Exchange Request"}
              </button>
            </div>
          </div>
        )}

        {/* Show lessons only if enrolled */}
        {isEnrolled ? (
          <>
            {skill.sections.map((section, idx) => {
              const sectionId = section.id || `section-${idx}`;
              const isAllowed = allowedSections.includes(sectionId);
              return (
                <AccordionSection
                  key={idx}
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
