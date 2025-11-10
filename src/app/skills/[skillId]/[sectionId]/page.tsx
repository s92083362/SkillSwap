"use client";
import React, { useState } from "react";
import Header from "../../../../components/shared/header/Header";
import { notFound } from "next/navigation";

// Example skill data with sections including their own unique ids
const skills = [
  {
    id: "python-for-beginners",
    title: "Python for Beginners",
    sections: [
      {
        id: "computational-thinking-basics",
        name: "Computational thinking basics",
        videoUrl:
          "https://res.cloudinary.com/drw4jufk2/video/upload/Lpage_remtex.mp4",
        resources: [
          "https://realresource.com/1",
          "https://realresource.com/2"
        ],
        content: (
          <>
            <p className="text-gray-900 mb-2">
              Learn the foundational principles of computational thinking including decomposition, pattern recognition, and abstraction.
            </p>
            <ul className="text-gray-800 list-disc pl-5 mb-2">
              <li>What is computational thinking?</li>
              <li>Why is it important in programming?</li>
              <li>Examples in Python</li>
            </ul>
          </>
        )
      }
    ]
  }
];

export default function SectionDetailPage({ params }) {
  const { skillId, sectionId } = React.use(params);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showExchange, setShowExchange] = useState(false);

  const skill = skills.find((s) => s.id === skillId);
  if (!skill) return notFound();
  const section = skill.sections.find((sec) => sec.id === sectionId);
  if (!section) return notFound();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      {/* Partner Info + Swap Skill Button */}
      <div className="flex items-center justify-between bg-white rounded-xl shadow p-5 mt-6 mb-8">
        <div className="flex items-center gap-4">
          <img
            src="https://ui-avatars.com/api/?name=Sophia+Bennett&background=F8D5CB&color=555"
            alt="Partner"
            className="w-16 h-16 rounded-full object-cover bg-[#F8D5CB]"
          />
          <div>
            <div className="text-lg font-semibold text-gray-900">Sophia Bennett</div>
            <div className="text-sm text-gray-500">Software Engineer</div>
          </div>
        </div>
        <button
          onClick={() => setShowExchange(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded text-base"
          type="button"
        >
          Swap Skill
        </button>
      </div>

      <main className="max-w-4xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold text-blue-900 mb-4">{section.name}</h1>

        {/* Video Area */}
        <div className="w-full h-64 bg-gray-200 rounded flex items-center justify-center mb-8">
          <video
            src={section.videoUrl}
            controls
            className="w-full h-full object-contain rounded"
          >
            Your browser does not support the video tag.
          </video>
        </div>

        {/* Lesson Content */}
        <div className="bg-white rounded shadow p-6 mb-8">{section.content}</div>

        {/* Resources & Personal Notes */}
        <div className="bg-blue-50 rounded p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Lesson Resources</h2>
          <ul className="mb-4">
            {section.resources?.map((url, idx) => (
              <li key={idx}>
                <a
                  href={url}
                  className="text-blue-700 underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Resource {idx + 1}
                </a>
              </li>
            ))}
          </ul>

          <h3 className="font-medium mb-2">Your Personal Notes</h3>
          <textarea
            className="w-full border rounded mb-2 p-2 min-h-[100px]"
            placeholder="Start typing your notes here..."
          />
          <button className="bg-blue-600 text-white px-4 py-2 rounded">Save Notes</button>
        </div>
      </main>

      {/* Swap Skill Modal */}
      {showExchange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl p-8 relative">
            <button
              onClick={() => setShowExchange(false)}
              className="absolute top-4 right-4 text-2xl text-gray-400 hover:text-blue-600 font-bold"
              aria-label="Close"
            >
              ×
            </button>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Request an Exchange</h2>
            <p className="text-gray-600 mb-8">You are one step away from learning a new skill!</p>
            <div className="mb-6">
              <label className="block font-semibold text-gray-800 mb-2">Skill to offer in return</label>
              <select className="w-full border rounded px-3 py-2 text-gray-900 bg-white">
                <option value="">Select a skill you’ve uploaded</option>
                <option>Web Development</option>
                <option>UI/UX Design</option>
                {/* Add more options as needed */}
              </select>
            </div>
            <div className="mb-6">
              <label className="block font-semibold text-gray-800 mb-2">Add a message <span className="text-gray-500 font-normal">(optional)</span></label>
              <textarea
                className="w-full border rounded px-3 py-2 min-h-[80px] text-gray-900"
                placeholder="Hi! I’d love to exchange my Web Development skills for your Python course. I think we could both learn a lot!"
              />
            </div>
            <div className="flex items-center mb-8">
              <input type="checkbox" id="agree" className="mr-2" />
              <label htmlFor="agree" className="text-gray-700 text-sm">
                I agree to the SkillSwap <a className="text-blue-600 underline" href="#">Term</a> and <a className="text-blue-600 underline" href="#">Conditions</a>.
              </label>
            </div>
            <button
              className="w-full bg-blue-900 hover:bg-blue-800 text-white text-lg font-semibold rounded py-3 mt-2 transition"
            >
              Skill Exchange Request
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
