"use client";
import React, { useState, useEffect } from "react";
import Header from "../../../components/shared/header/Header";
import AccordionSection from "../../../components/dashboard/AccordionSection";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../../../lib/firebase/firebaseConfig";
import { doc, setDoc, getDoc, collection, getDocs } from "firebase/firestore";

const hardcodedSkills = [
  {
    id: "python-for-beginners",
    title: "Python for Beginners",
    description: "Learn Python basics with clear lessons and sample code.",
    instructor: "Alex Doe",
    sections: [
      {
        id: "skill-overview",
        name: "Skill overview",
        content: (
          <>
            <p className="text-gray-900 leading-relaxed">
              This is an easy-to-follow guide to the fundamentals of how software applications are created and maintained. You'll learn core concepts, modern techniques, and practical skills that apply to any programming language.
            </p>
            <p className="text-gray-900 leading-relaxed">
              We've condensed months of study into concise and informative lessons, designed for beginners but valuable for developing real world projects.
            </p>
          </>
        ),
      },
      {
        id: "computational-thinking-basics",
        name: "Computational thinking basics",
        content: (
          <div className="bg-blue-200 rounded-lg py-2 px-6 mb-2 flex items-center">
            <span className="font-bold mr-4 text-gray-900">1.1</span>
            <span className="text-gray-900">Computational thinking basics</span>
          </div>
        ),
      },
      {
        id: "what-is-python",
        name: "What is Python?",
        content: (
          <div className="bg-blue-100 rounded-lg py-2 px-6 mb-2 flex items-center">
            <span className="font-bold mr-4 text-gray-900">1.2</span>
            <span className="text-gray-900">What is Python?</span>
          </div>
        ),
      },
    ],
  },
  {
    id: "js-essentials",
    title: "JavaScript Essentials",
    description:
      "Master JavaScript for modern web development, including all the fundamental building blocks.",
    instructor: "Sam Smith",
    sections: [
      {
        id: "js-skill-overview",
        name: "Skill overview",
        content: (
          <>
            <p className="text-gray-900 leading-relaxed">
              This course covers the essential features of JavaScript for building interactive web apps.
            </p>
            <p className="text-gray-900 leading-relaxed">
              Each lesson includes hands-on examples and relevant explanations, suitable for both beginners and those coming from other languages.
            </p>
          </>
        ),
      },
      {
        id: "getting-started-with-js",
        name: "Getting Started with JavaScript",
        content: (
          <>
            <div className="bg-blue-200 rounded-lg py-2 px-6 mb-2 flex items-center">
              <span className="font-bold mr-4 text-gray-900">1.1</span>
              <span className="text-gray-900">History & Where JavaScript Runs</span>
            </div>
            <div className="bg-blue-100 rounded-lg py-2 px-6 mb-2 flex items-center">
              <span className="font-bold mr-4 text-gray-900">1.2</span>
              <span className="text-gray-900">Hello world in the Browser & Console</span>
            </div>
          </>
        ),
      },
    ],
  },
];

export default function SkillPage({ params }) {
  const { skillId } = React.use(params);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user] = useAuthState(auth);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loadingEnroll, setLoadingEnroll] = useState(false);
  const [skills, setSkills] = useState(hardcodedSkills);
  const [loading, setLoading] = useState(true);

  // Fetch Firebase lessons and merge with hardcoded skills
  useEffect(() => {
    async function fetchLessons() {
      try {
        const lessonsSnapshot = await getDocs(collection(db, "lessons"));
        const firebaseLessons = lessonsSnapshot.docs.map(doc => {
          const data = doc.data();
          console.log('Firebase lesson data:', data); // Debug log
          
          return {
            id: doc.id,
            title: data.title,
            description: data.description,
            instructor: data.instructor,
            image: data.image,
            sections: [
              {
                id: "skill-overview",
                name: "Skill overview",
                title: "Skill overview",
                content: (
                  <p className="text-gray-900 leading-relaxed">
                    {data.description}
                  </p>
                ),
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
        });

        console.log('All skills (merged):', [...hardcodedSkills, ...firebaseLessons]); // Debug log
        setSkills([...hardcodedSkills, ...firebaseLessons]);
      } catch (error) {
        console.error("Error fetching lessons:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchLessons();
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
    const ref = doc(db, "users", user.uid, "enrolledSkills", skillId);
    await setDoc(ref, { enrolledAt: new Date() });
    setIsEnrolled(true);
    setLoadingEnroll(false);
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
                key={idx}
                title={section.name || section.title}
                defaultOpen={idx === 0}
              >
                {typeof section.content === 'string' ? (
                  <div className="space-y-4">
                    {/* Text Content */}
                    {section.content && (
                      <div className="text-gray-900 leading-relaxed whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                        {section.content}
                      </div>
                    )}
                    
                    {/* Video Player */}
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
                    
                    {/* Empty State */}
                    {!section.content && !section.videoUrl && (
                      <p className="text-gray-500 italic">No content available for this section.</p>
                    )}
                  </div>
                ) : (
                  // For hardcoded sections (Python, JS)
                  section.content
                )}
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