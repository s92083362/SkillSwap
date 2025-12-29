// src/components/dashboard/AdminDashboard.tsx
"use client";

import React, { useState, useEffect } from "react";
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseConfig";
import Header from "../../shared/header/AdminHeader";
import AdminSkillList from "./AdminSkillList";
import { Skill } from "./AdminSkillCard";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";

type LessonFromFirestore = Skill & { id: string };

export default function AdminDashboard() {
  const { user } = useCurrentUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);

  // Set tab title for admin dashboard
  useEffect(() => {
    const prevTitle = document.title;
    document.title = "SkillSwap | Dashboard";

    return () => {
      document.title = prevTitle;
    };
  }, []); // runs once when component mounts[web:23][web:26][web:29][web:40]

  useEffect(() => {
    const lessonsRef = collection(db, "lessons");
    const unsubscribe = onSnapshot(lessonsRef, (snapshot) => {
      const firebaseLessons: LessonFromFirestore[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<LessonFromFirestore, "id">),
      }));
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

        {/* AdminSkillList handles everything: stats, search, filters, and grid */}
        <AdminSkillList
          skills={skills}
          onVisibilityChange={handleVisibilityChange}
          onRemove={handleRemove}
        />
      </main>
    </div>
  );
}
