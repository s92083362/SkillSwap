"use client";

import React, { useState, useEffect, useCallback } from "react";
import SkillCard, { Skill } from "./SkillCard";
import SearchBar from "./SearchBar";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  startAt,
  endAt,
  DocumentData,
  Query as FirestoreQuery,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseConfig";

// Debounce hook
function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debounced;
}

const hardcodedSkills: Skill[] = [
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
    description:
      "Master JavaScript for modern web development, including all the fundamental building blocks.",
    category: "Web Development",
    instructor: "Sam Smith",
  },
];

type LessonFromFirestore = Skill & { id: string };

export default function SkillsListPage() {
  const [skills, setSkills] = useState<Skill[]>(hardcodedSkills);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const debouncedSearch = useDebounce(searchQuery.trim(), 400);

  const categories: string[] = [
    "all",
    "Programming",
    "Web Development",
    "Frontend",
    "Backend",
    "DevOps",
  ];

  const fetchFilteredLessons = useCallback(
    async (category: string, searchRaw: string) => {
      setLoading(true);

      try {
        const search = searchRaw.toLowerCase();
        const collRef = collection(db, "lessons");
        let q: FirestoreQuery<DocumentData> = collRef;

        // Filter by category for lessons in Firestore (skillCategory field)
        if (category && category !== "all") {
          q = query(q, where("skillCategory", "==", category));
        }

        // Optional: simple prefix search on a lowercased title field (recommended)
        if (search) {
          // This assumes you store a "titleLower" field in Firestore for efficient search.
          const end =
            search.slice(0, -1) +
            String.fromCharCode(search.charCodeAt(search.length - 1) + 1);

          q = query(
            q,
            orderBy("titleLower" as any),
            startAt(search),
            endAt(end)
          );
        }

        const snapshot = await getDocs(q);
        const lessonsFromFirestore: LessonFromFirestore[] = snapshot.docs.map(
          (doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<LessonFromFirestore, "id">),
          })
        );

        const merged: Skill[] = [...hardcodedSkills, ...lessonsFromFirestore].filter(
          (skill) => {
            // 1) Category tab filter
            if (
              category !== "all" &&
              skill.category !== category &&
              (skill as any).skillCategory !== category
            ) {
              return false;
            }

            // 2) No search text -> keep after category filter
            if (!search) return true;

            const s = search.toLowerCase();

            // Actual stored category value in DB
            const rawSkillCategory = ((skill as any).skillCategory ||
              skill.category ||
              "") as string;

            // Normalize to allow "Machine Learning" → "MachineLearning"
            const normalizedSkillCategory = rawSkillCategory
              .toLowerCase()
              .replace(/[\s/-]+/g, "");

            const normalizedSearch = s.replace(/[\s/-]+/g, "");

            const categoryMatches = normalizedSkillCategory.includes(
              normalizedSearch
            );

            // Text search across title/description/instructor/category text
            const haystack = `${skill.title} ${skill.description} ${
              skill.category || ""
            } ${rawSkillCategory} ${skill.instructor || ""}`.toLowerCase();

            const textMatches = haystack.includes(s);

            return textMatches || categoryMatches;
          }
        );

        setSkills(merged);
      } catch (err) {
        console.error("Failed to fetch filtered lessons:", err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchFilteredLessons(filter, debouncedSearch);
  }, [filter, debouncedSearch, fetchFilteredLessons]);

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2 text-center">
            Explore Skills
          </h1>
          <p className="text-gray-600 text-base sm:text-lg text-center">
            Browse and learn from our collection of courses
          </p>
        </div>

        {/* Search Bar */}
        <SearchBar
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search skills (e.g., Python, Backend, Machine Learning)..."
          onClear={() => setSearchQuery("")}
        />

        {/* Category Filter */}
        <div className="mb-8 flex flex-wrap gap-2 justify-center">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                filter === cat
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              {cat === "all" ? "All" : cat}
            </button>
          ))}
        </div>

        {/* Search Results Info */}
        {searchQuery.trim() && !loading && (
          <div className="mb-4 text-center text-gray-600">
            Found {skills.length} result
            {skills.length !== 1 ? "s" : ""} for &quot;
            {searchQuery}
            &quot;
          </div>
        )}

        {/* Skills Grid */}
        {loading ? (
          <div className="text-center text-gray-500 text-lg">
            Loading skills...
          </div>
        ) : skills.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {skills.map((skill) => (
              <SkillCard key={skill.id ?? skill.title} skill={skill} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-2">
              {searchQuery.trim()
                ? `No skills found matching "${searchQuery}"`
                : "No skills found in this category."}
            </p>
            {searchQuery.trim() && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}