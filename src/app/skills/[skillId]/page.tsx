"use client";
import React, { useState } from "react";
import Header from "../../../components/shared/header/Header";
import AccordionSection from "../../../components/dashboard/AccordionSection";
import Link from "next/link";
import { notFound } from "next/navigation";

const skills = [
  {
    id: "python-for-beginners",
    title: "Python for Beginners",
    description: "Learn Python basics with clear lessons and sample code.",
    instructor: "Alex Doe",
    sections: [
      {
        id: "skill-overview",
        name: "Skill overview",
        content: (
          <>
            <p className="text-gray-900 leading-relaxed">
              This is an easy-to-follow guide to the fundamentals of how software applications are created and maintained. You'll learn core concepts, modern techniques, and practical skills that apply to any programming language.
            </p>
            <p className="text-gray-900 leading-relaxed">
              We've condensed months of study into concise and informative lessons, designed for beginners but valuable for developing real world projects.
            </p>
          </>
        ),
      },
      {
        id: "computational-thinking-basics",
        name: "Computational thinking basics",
        content: (
          <div className="bg-blue-200 rounded-lg py-2 px-6 mb-2 flex items-center">
            <span className="font-bold mr-4 text-gray-900">1.1</span>
            <span className="text-gray-900">Computational thinking basics</span>
          </div>
        ),
      },
      {
        id: "what-is-python",
        name: "What is Python?",
        content: (
          <div className="bg-blue-100 rounded-lg py-2 px-6 mb-2 flex items-center">
            <span className="font-bold mr-4 text-gray-900">1.2</span>
            <span className="text-gray-900">What is Python?</span>
          </div>
        ),
      },
    ],
  },
  {
    id: "js-essentials",
    title: "JavaScript Essentials",
    description:
      "Master JavaScript for modern web development, including all the fundamental building blocks.",
    instructor: "Sam Smith",
    sections: [
      {
        id: "js-skill-overview",
        name: "Skill overview",
        content: (
          <>
            <p className="text-gray-900 leading-relaxed">
              This course covers the essential features of JavaScript for building interactive web apps.
            </p>
            <p className="text-gray-900 leading-relaxed">
              Each lesson includes hands-on examples and relevant explanations, suitable for both beginners and those coming from other languages.
            </p>
          </>
        ),
      },
      {
        id: "getting-started-with-js",
        name: "Getting Started with JavaScript",
        content: (
          <>
            <div className="bg-blue-200 rounded-lg py-2 px-6 mb-2 flex items-center">
              <span className="font-bold mr-4 text-gray-900">1.1</span>
              <span className="text-gray-900">History & Where JavaScript Runs</span>
            </div>
            <div className="bg-blue-100 rounded-lg py-2 px-6 mb-2 flex items-center">
              <span className="font-bold mr-4 text-gray-900">1.2</span>
              <span className="text-gray-900">Hello world in the Browser & Console</span>
            </div>
          </>
        ),
      },
    ],
  },
];

interface SkillDetailPageProps {
  params: Promise<{ skillId: string }>;
}

export default function SkillDetailPage({ params }: SkillDetailPageProps) {
  // ✅ Properly unwrap the params Promise
  const { skillId } = React.use(params);

  // ✅ Add header state to fix setMobileMenuOpen error
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const skill = skills.find((s) => s.id === skillId);
  if (!skill) return notFound();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />

      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="bg-gradient-to-r from-blue-100 to-blue-50 rounded-xl py-14 px-8 text-center mb-8">
          <h1 className="text-5xl font-bold text-gray-900 mb-2">{skill.title}</h1>
          <p className="text-lg font-medium text-blue-900 mb-2">
            Instructor: {skill.instructor}
          </p>
          <p className="text-base text-blue-800">{skill.description}</p>
        </div>

        {skill.sections.map((section, idx) => (
          <AccordionSection
            key={idx}
            title={
              ["skill-overview", "js-skill-overview"].includes(section.id)
                ? section.name
                : (
                    <Link
                      href={`/skills/${skill.id}/${section.id}`}
                      className="text-blue-800 hover:underline"
                    >
                      {section.name}
                    </Link>
                  )
            }
            defaultOpen={idx === 0}
          >
            {section.content}
          </AccordionSection>
        ))}
      </main>
    </div>
  );
}
