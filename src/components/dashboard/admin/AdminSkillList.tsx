// src/components/dashboard/AdminSkillList.tsx
"use client";

import React, { useState, useEffect } from "react";
import AdminSkillCard, { Skill } from "./AdminSkillCard";
import SearchBar from "../SearchBar";

// Debounce hook
function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debounced;
}

interface AdminSkillListProps {
  skills: Skill[];
  onVisibilityChange: (skillId: string, visible: boolean) => Promise<void>;
  onRemove: (skillId: string) => Promise<void>;
}

export default function AdminSkillList({
  skills,
  onVisibilityChange,
  onRemove,
}: AdminSkillListProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [filter, setFilter] = useState<"all" | "visible" | "hidden">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const debouncedSearch = useDebounce(searchQuery.trim(), 400);

  const categories: string[] = [
    "all",
    "Frontend",
    "Backend",
    "DevOps",
    "FullStack",
    "DataScience",
    "MachineLearning",
    "AI",
    "CyberSecurity",
    "CloudComputing",
    "MobileDevelopment",
    "SoftwareEngineering",
    "ComputerNetworks",
    "DatabaseManagement",
    "UIUXDesign",
    "Programming Languages",
    "Software Development",
    "IT Support",
    "Data Analysis",
    "Cybersecurity",
    "Cloud Computing",
  ];

  const formatCategoryLabel = (cat: string) => {
    if (cat === "all") return "All";
    switch (cat) {
      case "FullStack":
        return "Full Stack";
      case "DataScience":
        return "Data Science";
      case "MachineLearning":
        return "Machine Learning";
      case "AI":
        return "Artificial Intelligence";
      case "CyberSecurity":
        return "Cybersecurity";
      case "CloudComputing":
        return "Cloud Computing";
      case "MobileDevelopment":
        return "Mobile Development";
      case "SoftwareEngineering":
        return "Software Engineering";
      case "ComputerNetworks":
        return "Computer Networks";
      case "DatabaseManagement":
        return "Database Management";
      case "UIUXDesign":
        return "UI/UX Design";
      default:
        return cat;
    }
  };

  // Apply filters: visibility, category, and search
  const filteredSkills = skills.filter((skill) => {
    // Visibility filter
    let visibilityMatch = true;
    if (filter === "visible") visibilityMatch = skill.visibleOnHome !== false;
    if (filter === "hidden") visibilityMatch = skill.visibleOnHome === false;

    // Category filter
    const categoryMatch =
      selectedCategory === "all" ||
      (skill.skillCategory || skill.category) === selectedCategory;

    // Search filter
    if (!debouncedSearch) {
      return visibilityMatch && categoryMatch;
    }

    const search = debouncedSearch.toLowerCase();
    const rawSkillCategory = (skill.skillCategory || skill.category || "") as string;

    // Normalize: "Machine Learning" → "machinelearning"
    const normalizedSkillCategory = rawSkillCategory
      .toLowerCase()
      .replace(/[\s/-]+/g, "");
    const normalizedSearch = search.replace(/[\s/-]+/g, "");

    const categoryMatches = normalizedSkillCategory.includes(normalizedSearch);

    // Text search over title/description/instructor/category
    const haystack = `${skill.title} ${skill.description} ${
      skill.category || ""
    } ${rawSkillCategory} ${skill.instructor || ""}`.toLowerCase();

    const textMatches = haystack.includes(search);
    const searchMatch = textMatches || categoryMatches;

    return visibilityMatch && categoryMatch && searchMatch;
  });

  return (
    <>
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

      {/* Search Bar */}
      <div className="mb-6">
        <SearchBar
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search skills (e.g., Python, Backend, Machine Learning)..."
          onClear={() => setSearchQuery("")}
        />
      </div>

      {/* Visibility Filter */}
      <div className="mb-6 flex gap-2 flex-wrap">
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

      {/* Mobile Category Dropdown */}
      <div className="mb-4 sm:hidden">
        <label
          htmlFor="category-select"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Category
        </label>
        <select
          id="category-select"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {formatCategoryLabel(cat)}
            </option>
          ))}
        </select>
      </div>

      {/* Desktop Category Filter */}
      <div className="mb-6 overflow-x-auto hidden sm:block">
        <div className="flex gap-2 pb-2 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap font-medium text-sm transition ${
                selectedCategory === cat
                  ? "bg-blue-600 text-white shadow"
                  : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              {formatCategoryLabel(cat)}
            </button>
          ))}
        </div>
      </div>

      {/* Search Results Info */}
      {searchQuery.trim() && (
        <div className="mb-4 text-center text-gray-600">
          Found {filteredSkills.length} result
          {filteredSkills.length !== 1 ? "s" : ""} for &quot;{searchQuery}
          &quot;
        </div>
      )}

      {/* Skills Grid */}
      {filteredSkills.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredSkills.map((skill) => (
            <AdminSkillCard
              key={skill.id}
              skill={skill}
              onVisibilityChange={onVisibilityChange}
              onRemove={onRemove}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500 text-lg mb-2">
            {searchQuery.trim()
              ? `No skills found matching "${searchQuery}"`
              : "No skills found with the current filters."}
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
    </>
  );
}