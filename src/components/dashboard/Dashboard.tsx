"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseConfig";
import Header from "../shared/header/Header";
// import Categories from "./ Categories"
import SkillList from "./  SkillList";

// Hardcoded skills for backward compatibility
const hardcodedSkills = [
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

export default function Dashboard() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [skills, setSkills] = useState(hardcodedSkills);
  const [selectedCategory, setSelectedCategory] = useState("all");

  const categories = [
    "all",
    "Programming Languages",
    "Software Development",
    "IT Support",
    "Data Analysis",
    "Cybersecurity",
    "Cloud Computing",
    "Frontend",
    "Backend",
    "DevOps"
  ];

  const router = useRouter();

  // Real-time listener for lessons collection
  useEffect(() => {
    const lessonsRef = collection(db, "lessons");
    const unsubscribe = onSnapshot(lessonsRef, (snapshot) => {
      const firebaseLessons = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Merge hardcoded skills with Firebase lessons
      setSkills([...hardcodedSkills, ...firebaseLessons]);
    });
    
    return () => unsubscribe();
  }, []);

  // Apply category filter
  const filteredSkills = selectedCategory === "all" 
    ? skills 
    : skills.filter(skill => 
        (skill.skillCategory || skill.category) === selectedCategory
      );

  const handleViewSkill = (skill: any) => {
    router.push(`/skills/${skill.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="text-center mb-8">
          {/* <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            Explore Skills
          </h1>
          <p className="text-gray-600 text-base sm:text-lg">
            Browse and learn from our collection of courses
          </p> */}
        </div>

        {/* Categories */}
        {/* <Categories
          categories={categories}
          selectedCategory={selectedCategory}
          onSelect={setSelectedCategory}
        /> */}

        {/* Skills Grid */}
        {filteredSkills.length > 0 ? (
          <SkillList skills={filteredSkills} onView={handleViewSkill} />
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