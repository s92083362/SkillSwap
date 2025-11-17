"use client";
import React from "react";

interface CategoriesProps {
  categories: string[];
  selectedIdx: number | null;
  onSelect: (idx: number) => void;
}

const Categories: React.FC<CategoriesProps> = ({
    categories,
    selectedIdx,
    onSelect,
  }) => (
    <div className="mb-8 sm:mb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Categories</h2>
        <div className="flex flex-wrap gap-3 sm:gap-4">
          {categories.map((category, idx) => (
            <button
              key={idx}
              className={`px-5 py-2.5 sm:px-6 sm:py-3 rounded-full text-sm sm:text-base font-medium transition-all duration-200 border whitespace-nowrap
                ${
                  idx === selectedIdx
                    ? "bg-blue-500 text-white border-blue-500 shadow-md"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400"
                }
              `}
              onClick={() => onSelect(idx)}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
export default Categories;
