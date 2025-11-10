"use client";
import React from "react";

interface Skill {
  title: string;
  description: string;
  category: string;
}

interface SkillCardProps {
  skill: Skill;
  onView: (skill: Skill) => void;
}

const SkillCard: React.FC<SkillCardProps> = ({ skill, onView }) => (
  <div className="bg-white rounded-2xl shadow hover:shadow-xl transition-shadow 
                  flex flex-col h-full border border-gray-100
                  ">
    {/* Optional cover block or icon */}
    <div className="h-24 flex items-center justify-center bg-gradient-to-b from-gray-50 to-white rounded-t-2xl">
      <span className="text-xs text-blue-500 font-semibold tracking-wide">
        {skill.category}
      </span>
    </div>
    <div className="flex flex-col flex-1 p-5 sm:p-6">
      <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1 truncate">{skill.title}</h3>
      <p className="text-gray-600 text-sm sm:text-base flex-1 mb-4 line-clamp-2">{skill.description}</p>
      <button
        className="mt-auto w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 rounded-lg transition-colors text-sm sm:text-base"
        onClick={() => onView(skill)}
      >
        View Skill
      </button>
    </div>
  </div>
);

export default SkillCard;
