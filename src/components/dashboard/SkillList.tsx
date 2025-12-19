"use client";

import React, { useState, useEffect, useCallback } from "react";
import SkillCard, { Skill } from "./SkillCard";
import SearchBar from "./SearchBar";
import { collection, getDocs } from "firebase/firestore";
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

type LessonFromFirestore = Skill & { id: string };

export default function SkillsListPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
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

        // Load all lessons from Firestore
        const snapshot = await getDocs(collRef);
        const lessonsFromFirestore: LessonFromFirestore[] = snapshot.docs.map(
          (doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<LessonFromFirestore, "id">),
          })
        );

        // Filter on client
        const filtered: Skill[] = lessonsFromFirestore.filter((skill) => {
          // Category tab filter
          if (
            category !== "all" &&
            skill.category !== category &&
            (skill as any).skillCategory !== category
          ) {
            return false;
          }

          if (!search) return true;

          const s = search.toLowerCase();

          // Actual stored category value
          const rawSkillCategory = ((skill as any).skillCategory ||
            skill.category ||
            "") as string;

          // Normalize: "Machine Learning" → "machinelearning"
          const normalizedSkillCategory = rawSkillCategory
            .toLowerCase()
            .replace(/[\s/-]+/g, "");
          const normalizedSearch = s.replace(/[\s/-]+/g, "");

          const categoryMatches = normalizedSkillCategory.includes(
            normalizedSearch
          );

          // Text search over title/description/instructor/category
          const haystack = `${skill.title} ${skill.description} ${
            skill.category || ""
          } ${rawSkillCategory} ${skill.instructor || ""}`.toLowerCase();

          const textMatches = haystack.includes(s);

          return textMatches || categoryMatches;
        });

        setSkills(filtered);
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
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-black mb-2 text-center">
            Explore Skills
          </h1>
          <p className="text-gray-800 text-base sm:text-lg text-center">
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

        {/* Category Filter - dropdown on mobile, buttons on larger screens */}
        {/* Mobile dropdown */}
        <div className="mb-4 sm:hidden">
          <label
            htmlFor="category-select"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Category
          </label>
          <select
            id="category-select"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === "all" ? "All" : cat}
              </option>
            ))}
          </select>
        </div>

        {/* Tablet / Desktop buttons */}
        <div className="mb-8 hidden sm:flex flex-wrap gap-2 justify-center">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
