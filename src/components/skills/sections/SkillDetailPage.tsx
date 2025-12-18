
"use client";

import React, { useState, useEffect } from "react";
import Header from "@/components/shared/header/Header";
import AccordionSection from "@/components/dashboard/AccordionSection";
import { notFound } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase/firebaseConfig";
import { doc, setDoc, getDoc, collection, getDocs } from "firebase/firestore";

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
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loadingEnroll, setLoadingEnroll] = useState(false);
  const [skills, setSkills] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

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
        {/* keep the rest of your JSX exactly as in your current SkillDetailPage */}
      </main>
    </div>
  );
}
