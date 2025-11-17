"use client";
import React from "react";
import SkillCard from "./ SkillCard";

interface Skill {
  title: string;
  description: string;
  category: string;
}

interface SkillListProps {
  skills: Skill[];
  onView: (skill: Skill) => void;
}

const SkillList: React.FC<SkillListProps> = ({ skills, onView }) => (
  <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
    {skills.map((skill, idx) => (
      <SkillCard key={idx} skill={skill} onView={onView} />
    ))}
  </div>
);

export default SkillList;
