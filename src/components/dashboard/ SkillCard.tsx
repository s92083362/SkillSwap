"use client";
import React from "react";
import { useRouter } from "next/navigation";

interface Skill {
  id?: string;
  title: string;
  description: string;
  category?: string;
  skillCategory?: string;
  image?: string;
  instructor?: string;
}

interface SkillCardProps {
  skill: Skill;
  onView?: (skill: Skill) => void;
}

const SkillCard: React.FC<SkillCardProps> = ({ skill, onView }) => {
  const router = useRouter();

  const handleViewClick = () => {
    // If custom onView handler is provided, use it
    if (onView) {
      onView(skill);
    } else if (skill.id) {
      // Navigate to skill detail page using the lesson ID
      router.push(`/skills/${skill.id}`);
    }
  };

  // Use skillCategory or category (for backward compatibility)
  const category = skill.skillCategory || skill.category || "General";

  return (
    <div
      className="
        bg-white 
        rounded-lg 
        shadow 
        transition-shadow 
        flex flex-col 
        h-full 
        border border-gray-100 
        w-[240px] min-w-[180px] max-w-[260px] 
      "
    >
      {/* Thumbnail or Category Header */}
      {skill.image ? (
        <div className="w-full h-[68px] rounded-t-lg overflow-hidden">
          <img
            // src={skill.image}
            alt={skill.title}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="h-16 flex items-center justify-center bg-gradient-to-b from-gray-50 to-white rounded-t-lg">
          <span className="text-xs text-blue-500 font-semibold tracking-wide">
            {category}
          </span>
        </div>
      )}

      <div className="flex flex-col flex-1 p-3">
        <h3 className="text-base font-bold text-gray-900 mb-1 truncate">{skill.title}</h3>
        {skill.instructor && (
          <p className="text-xs text-gray-500 mb-2">by {skill.instructor}</p>
        )}
        <p className="text-gray-600 text-xs mb-3 line-clamp-2">
          {skill.description}
        </p>
        <button
          className="
            mt-auto w-full 
            bg-blue-500 hover:bg-blue-600 
            text-white font-semibold 
            py-2 rounded-lg 
            transition-colors 
            text-xs
          "
          onClick={handleViewClick}
        >
          View Skill
        </button>
      </div>
    </div>
  );
};

export default SkillCard;
