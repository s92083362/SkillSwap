"use client";
import React, { useState, useEffect } from "react";
import Header from "../../../components/shared/header/Header";
import AccordionSection from "../../../components/dashboard/AccordionSection";
import { notFound } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../../../lib/firebase/firebaseConfig";
import LessonNotes from "../../../components/lessons/LessonNotes";
import { doc, setDoc, getDoc, collection, deleteDoc, addDoc, serverTimestamp } from "firebase/firestore";

export default function SkillPage({ params }) {
  const { skillId } = React.use(params);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user] = useAuthState(auth);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loadingEnroll, setLoadingEnroll] = useState(false);
  const [skill, setSkill] = useState(null);
  const [loading, setLoading] = useState(true);

  // Swap Skill Popup State
  const [showExchange, setShowExchange] = useState(false);
  const [offeredSkillTitle, setOfferedSkillTitle] = useState("");
  const [swapMessage, setSwapMessage] = useState("");
  const [sendingSwap, setSendingSwap] = useState(false);
  const [agreed, setAgreed] = useState(false);

  // Fetch lesson from Firebase
  useEffect(() => {
    async function fetchLesson() {
      try {
        const lessonDoc = await getDoc(doc(db, "lessons", skillId));
        
        if (!lessonDoc.exists()) {
          setSkill(null);
          setLoading(false);
          return;
        }

        const data = lessonDoc.data();
        
        const fetchedSkill = {
          id: lessonDoc.id,
          title: data.title,
          description: data.description,
          instructor: data.instructor,
          image: data.image,
          creatorId: data.creatorId,
          sections: [
            {
              id: "skill-overview",
              name: "Skill overview",
              title: "Skill overview",
              content: data.description || "No description available.",
            },
            ...(data.sections || []).map((section, idx) => ({
              id: `section-${idx}`,
              name: section.title,
              title: section.title,
              content: section.content,
              videoUrl: section.videoUrl,
            })),
          ],
        };

        setSkill(fetchedSkill);
      } catch (error) {
        console.error("Error fetching lesson:", error);
        setSkill(null);
      } finally {
        setLoading(false);
      }
    }
    fetchLesson();
  }, [skillId]);

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

  // Toggle enroll/unenroll
  async function handleEnrollToggle() {
    if (!user) return;
    setLoadingEnroll(true);
    try {
      const ref = doc(db, "users", user.uid, "enrolledSkills", skillId);

      if (isEnrolled) {
        await deleteDoc(ref);
        setIsEnrolled(false);
      } else {
        await setDoc(ref, { enrolledAt: new Date() });
        setIsEnrolled(true);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoadingEnroll(false);
    }
  }

  // Handle swap request submission
  async function handleSwapSubmit() {
    if (!offeredSkillTitle.trim() || !agreed || !user || !skill) return;
    setSendingSwap(true);
    try {
      const authorId = skill.creatorId;

      if (!authorId) {
        alert("This lesson doesn't have creator information. Please contact support.");
        setSendingSwap(false);
        return;
      }

      // Don't allow swapping with yourself
      if (authorId === user.uid) {
        alert("You cannot send a swap request for your own lesson.");
        setSendingSwap(false);
        return;
      }

      // Create swap request document
      const swapRequestRef = doc(collection(db, "swapRequests"));
      
      await setDoc(swapRequestRef, {
        requesterId: user.uid,
        requesterName: user.displayName || user.email || "Anonymous",
        requesterEmail: user.email,
        creatorId: authorId,
        requestedLessonId: skillId,
        requestedLessonTitle: skill.title,
        offeredSkillTitle: offeredSkillTitle.trim(),
        message: swapMessage,
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const chatId = [user.uid, authorId].sort().join("_");

      // Add the swap message to the chat
      await addDoc(collection(db, "privateChats", chatId, "messages"), {
        senderId: user.uid,
        senderName: user.displayName || user.email || "Anonymous",
        content: swapMessage,
        timestamp: serverTimestamp(),
      });

      // Create notification for the author
      const notificationRef = doc(collection(db, "notifications"));
      await setDoc(notificationRef, {
        userId: authorId,
        type: "swap_request",
        title: "New Skill Swap Request",
        message: `${user.displayName || user.email || "Someone"} wants to exchange "${offeredSkillTitle.trim()}" for your "${skill.title}" lesson`,
        swapRequestId: swapRequestRef.id,
        senderId: user.uid,
        senderName: user.displayName || user.email || "Anonymous",
        senderEmail: user.email,
        timestamp: new Date(),
        read: false,
        actions: ["View"]
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
          
          {/* Enroll/Unenroll Button */}
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

        {/* Swap Skill Modal */}
        {showExchange && (
          <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-white/30">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl p-8 relative">
              <button
                onClick={() => setShowExchange(false)}
                className="absolute top-4 right-4 text-2xl text-gray-400 hover:text-blue-600 font-bold"
                aria-label="Close"
              >
                ×
              </button>
              <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Request an Exchange</h2>
              <p className="text-gray-600 mb-8">You are one step away from learning a new skill!</p>
              
              <div className="mb-6">
                <label className="block font-semibold text-gray-800 mb-2">Skill to offer in return</label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2 text-gray-900"
                  placeholder="e.g. Web Development, Graphic Design, Photography..."
                  value={offeredSkillTitle}
                  onChange={e => setOfferedSkillTitle(e.target.value)}
                />
                <p className="text-gray-500 text-sm mt-1">Enter the skill you can teach in exchange</p>
              </div>
              
              <div className="mb-6">
                <label className="block font-semibold text-gray-800 mb-2">
                  Add a message <span className="text-gray-500 font-normal">(optional)</span>
                </label>
                <textarea
                  className="w-full border rounded px-3 py-2 min-h-[80px] text-gray-900"
                  placeholder="Hi! I'd love to exchange my Web Development skills for your course."
                  value={swapMessage}
                  onChange={e => setSwapMessage(e.target.value)}
                />
              </div>
              
              <div className="flex items-center mb-8">
                <input
                  type="checkbox"
                  id="agree"
                  className="mr-2"
                  checked={agreed}
                  onChange={e => setAgreed(e.target.checked)}
                />
                <label htmlFor="agree" className="text-gray-700 text-sm">
                  I agree to the SkillSwap <a className="text-blue-600 underline" href="#">Terms</a> and{" "}
                  <a className="text-blue-600 underline" href="#">Conditions</a>.
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

        {/* Lesson Content - Show only if enrolled */}
        {isEnrolled ? (
          <>
            {skill.sections.map((section, idx) => (
              <AccordionSection
                key={idx}
                title={section.name || section.title}
                defaultOpen={idx === 0}
              >
                <div className="space-y-4">
                  {/* Text Content */}
                  {section.content && (
                    <div className="text-gray-900 leading-relaxed whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                      {section.content}
                    </div>
                  )}
                  
                  {/* Video Content */}
                  {section.videoUrl && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Video Lesson</h4>
                      <video
                        src={section.videoUrl}
                        controls
                        controlsList="nodownload"
                        className="w-full max-w-3xl rounded-lg border border-gray-200 shadow-sm"
                      >
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  )}

                  {/* Lesson Notes */}
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Your Notes</h4>
                    <LessonNotes 
                      skillId={skillId} 
                      sectionId={section.id} 
                    />
                  </div>

                  {/* Empty State */}
                  {!section.content && !section.videoUrl && (
                    <p className="text-gray-500 italic">No content available for this section.</p>
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