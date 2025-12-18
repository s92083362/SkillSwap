
'use client';

import React from 'react';
import type { Lesson } from '@/lib/firebase/lessonHelpers';

type SkillHeroProps = {
  skill: Lesson;
  children?: React.ReactNode;
};

export function SkillHero({ skill, children }: SkillHeroProps) {
  return (
    <div className="bg-gradient-to-r from-blue-100 to-blue-50 rounded-xl py-14 px-8 text-center mb-8">
      {skill.image && (
        <img
          src={skill.image}
          alt={skill.title}
          className="w-32 h-32 object-cover rounded-lg mx-auto mb-6"
        />
      )}
      <h1 className="text-5xl font-bold text-gray-900 mb-2">{skill.title}</h1>
      <p className="text-lg font-medium text-blue-900 mb-2">
        Instructor: {skill.instructor}
      </p>
      <p className="text-base text-blue-800">{skill.description}</p>
      {children}
    </div>
  );
}
