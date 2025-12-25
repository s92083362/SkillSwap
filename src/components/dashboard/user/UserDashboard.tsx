// src/components/dashboard/UserDashboard.tsx
"use client";

import React, { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseConfig";
import Header from "../../shared/header/Header";
import SkillList from "./UserSkillList";
import type { Skill } from "./UserSkillCard";

type LessonFromFirestore = Skill & { id: string };

export default function UserDashboard() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const categories: string[] = [
    "all",
    "Programming Languages",
    "Software Development",
    "IT Support",
    "Data Analysis",
    "Cybersecurity",
    "Cloud Computing",
    "Frontend",
    "Backend",
    "DevOps",
  ];

  useEffect(() => {
    const lessonsRef = collection(db, "lessons");

    const unsubscribe = onSnapshot(lessonsRef, (snapshot) => {
      const firebaseLessons: LessonFromFirestore[] = snapshot.docs
        .map((d) => ({
          id: d.id,
          ...(d.data() as Omit<LessonFromFirestore, "id">),
        }))
        .filter((lesson) => {
          // Only show skills that are NOT explicitly hidden
          return lesson.visibleOnHome !== false;
        });

      setSkills(firebaseLessons);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredSkills =
    selectedCategory === "all"
      ? skills
      : skills.filter(
          (skill) =>
            (skill.skillCategory || skill.category) === selectedCategory
        );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#e7e9f0]">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#e7e9f0]">
      <Header
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        <div className="text-center mb-16 mt-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Explore Skills
          </h1>
          <p className="text-gray-600 text-lg sm:text-xl">
            Discover and learn new skills to advance your career
          </p>
        </div>

        {/* The SkillList component already handles its own data fetching and filtering.
            We can remove the props being passed to it from UserDashboard. */}
        <SkillList />
      </main>
    </div>
  );
}