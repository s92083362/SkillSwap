"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseConfig";
import Header from "../shared/header/Header";
import SkillList from "./SkillList";
import type { Skill } from "./SkillCard";

const hardcodedSkills: Skill[] = [
  {
    id: "python-for-beginners",
    title: "Python for Beginners",
    description: "Learn Python basics with clear lessons and sample code.",
    category: "Programming Languages",
    instructor: "Alex Doe",
  },
  {
    id: "js-essentials",
    title: "JavaScript Essentials",
    description: "Master JavaScript for modern web development.",
    category: "Software Development",
    instructor: "Sam Smith",
  },
];

type LessonFromFirestore = Skill & { id: string };

export default function Dashboard() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [skills, setSkills] = useState<Skill[]>(hardcodedSkills);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

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

  const router = useRouter();

  useEffect(() => {
    const lessonsRef = collection(db, "lessons");
    const unsubscribe = onSnapshot(lessonsRef, (snapshot) => {
      const firebaseLessons: LessonFromFirestore[] = snapshot.docs.map(
        (doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<LessonFromFirestore, "id">),
        })
      );

      setSkills([...hardcodedSkills, ...firebaseLessons]);
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

  const handleViewSkill = (skill: Skill) => {
    if (skill.id) {
      router.push(`/skills/${skill.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8" />

        {filteredSkills.length > 0 ? (
          <SkillList />
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              No skills found in this category.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}