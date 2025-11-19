"use client";
import React, { useState, useEffect } from "react";
import SkillCard from "../dashboard/ SkillCard";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseConfig";

const hardcodedSkills = [
  {
    id: "python-for-beginners",
    title: "Python for Beginners",
    description: "Learn Python basics with clear lessons and sample code.",
    category: "Programming",
    instructor: "Alex Doe",
  },
  {
    id: "js-essentials",
    title: "JavaScript Essentials",
    description: "Master JavaScript for modern web development.",
    category: "Web Development",
    instructor: "Sam Smith",
  },
];

export default function SkillList() {
  const [skills, setSkills] = useState(hardcodedSkills);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLessons() {
      try {
        const lessonsSnapshot = await getDocs(collection(db, "lessons"));
        const firebaseLessons = lessonsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setSkills([...hardcodedSkills, ...firebaseLessons]);
      } catch (error) {
        console.error("Error fetching lessons:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchLessons();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading skills...</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {skills.map((skill) => (
        <SkillCard key={skill.id} skill={skill} />
      ))}
    </div>
  );
}