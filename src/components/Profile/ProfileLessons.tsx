"use client";
import React from "react";
import { PlusCircle } from "lucide-react";

// Example lesson data. Replace with real data as needed.
const lessons = [
  {
    id: 1,
    title: "Introduction to React",
    uploaded: "3 months ago",
    status: "active", // You can use this for highlight
  },
  {
    id: 2,
    title: "Advanced JavaScript Techniques",
    uploaded: "2 months ago",
    status: "inactive",
  },
  {
    id: 3,
    title: "Building RESTful APIs",
    uploaded: "1 month ago",
    status: "inactive",
  },
];

export default function ProfileLessons() {
  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <h2 className="font-bold text-xl">My Lessons</h2>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium shadow hover:bg-blue-700 w-full sm:w-auto justify-center">
          <PlusCircle className="w-5 h-5" /> Upload New Lesson
        </button>
      </div>
      <ul className="space-y-3 mb-8">
        {lessons.map((lesson) => (
          <li
            key={lesson.id}
            className={
              lesson.status === "active"
                ? "border-2 border-purple-500 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between bg-purple-50"
                : "bg-white hover:bg-gray-50 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between"
            }
          >
            <div className="flex items-center gap-4 flex-1 min-w-0 mb-2 sm:mb-0">
              {/* Icon placeholder/block - replace as needed */}
              <div
                className={
                  lesson.status === "active"
                    ? "bg-amber-100 p-2 rounded"
                    : "bg-blue-100 p-2 rounded"
                }
              >
                <svg width="28" height="28" fill="none">
                  <rect width="28" height="28" rx="7" fill={lesson.status === "active" ? "#F7CA95" : "#CBD6F1"} />
                </svg>
              </div>
              <div className="truncate">
                <p className="font-semibold text-gray-800 truncate">{lesson.title}</p>
                <p className="text-gray-400 text-sm whitespace-nowrap">Uploaded {lesson.uploaded}</p>
              </div>
            </div>
            {/* Dots/menu icon placeholder */}
            <div className="text-gray-300 text-right sm:text-left">•••</div>
          </li>
        ))}
      </ul>
    </section>
  );
}
