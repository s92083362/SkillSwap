// src/components/dashboard/AdminDashboard.tsx
"use client";

import React, { useState, useEffect } from "react";
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseConfig";
import Header from "../shared/header/Header";
import AdminSkillCard, { Skill } from "./AdminSkillCard"; // Renamed for clarity
import { useCurrentUser } from "@/hooks/users/useCurrentUser";

type LessonFromFirestore = Skill & { id: string };

export default function AdminDashboard() {
  const { user } = useCurrentUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [filter, setFilter] = useState<"all" | "visible" | "hidden">("all");
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
      const firebaseLessons: LessonFromFirestore[] = snapshot.docs.map(
        (doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<LessonFromFirestore, "id">),
        })
      );
      setSkills(firebaseLessons);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleVisibilityChange = async (skillId: string, visible: boolean) => {
    try {
      const skillRef = doc(db, "lessons", skillId);
      await updateDoc(skillRef, { visibleOnHome: visible });
    } catch (error) {
      console.error("Error updating visibility:", error);
      throw error;
    }
  };

  const handleRemove = async (skillId: string) => {
    try {
      await deleteDoc(doc(db, "lessons", skillId));
    } catch (error) {
      console.error("Error removing skill:", error);
      throw error;
    }
  };

  // Apply both category and visibility filters
  const filteredSkills = skills.filter((skill) => {
    // Category filter
    const categoryMatch =
      selectedCategory === "all" ||
      (skill.skillCategory || skill.category) === selectedCategory;

    // Visibility filter
    let visibilityMatch = true;
    if (filter === "visible") visibilityMatch = skill.visibleOnHome !== false;
    if (filter === "hidden") visibilityMatch = skill.visibleOnHome === false;

    return categoryMatch && visibilityMatch;
  });

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
        {/* Admin Badge */}
        <div className="mb-8 mt-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold text-sm shadow-md">
              👑 Admin Dashboard
            </span>
            <span className="text-sm text-gray-600">{user?.email}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600">Total Skills</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">
              {skills.length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600">Visible on Home</div>
            <div className="text-3xl font-bold text-green-600 mt-2">
              {skills.filter((s) => s.visibleOnHome !== false).length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600">Hidden</div>
            <div className="text-3xl font-bold text-red-600 mt-2">
              {skills.filter((s) => s.visibleOnHome === false).length}
            </div>
          </div>
        </div>

        {/* Visibility Filter */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === "all"
                ? "bg-blue-500 text-white shadow"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            All ({skills.length})
          </button>
          <button
            onClick={() => setFilter("visible")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === "visible"
                ? "bg-green-500 text-white shadow"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            Visible ({skills.filter((s) => s.visibleOnHome !== false).length})
          </button>
          <button
            onClick={() => setFilter("hidden")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === "hidden"
                ? "bg-red-500 text-white shadow"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            Hidden ({skills.filter((s) => s.visibleOnHome === false).length})
          </button>
        </div>

        {/* Category Filter */}
        <div className="mb-6 overflow-x-auto">
          <div className="flex gap-2 pb-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap font-medium transition ${
                  selectedCategory === cat
                    ? "bg-white text-blue-600 shadow"
                    : "bg-white/50 text-gray-700 hover:bg-white"
                }`}
              >
                {cat === "all" ? "All Categories" : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Skills Grid */}
        {filteredSkills.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredSkills.map((skill) => (
              <AdminSkillCard
                key={skill.id}
                skill={skill}
                onVisibilityChange={handleVisibilityChange}
                onRemove={handleRemove}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500 text-lg">
              No skills found with the current filters.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}