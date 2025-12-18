"use client";

import React from "react";
import { X } from "lucide-react";

type Props = {
  lessonTitle: string;
  setLessonTitle: (v: string) => void;
  lessonDesc: string;
  setLessonDesc: (v: string) => void;
  skillCategory: string;
  setSkillCategory: (v: string) => void;
  instructor: string;
  setInstructor: (v: string) => void;
  lessonImage: string;
  handleImageUpload: (file: File | undefined | null) => void;
  handleRemoveImage: () => void;
  isUploadingImage: boolean;
  imageProgress: number;
  imageInputRef: React.RefObject<HTMLInputElement>;
};

export default function LessonDetailsForm({
  lessonTitle,
  setLessonTitle,
  lessonDesc,
  setLessonDesc,
  skillCategory,
  setSkillCategory,
  instructor,
  setInstructor,
  lessonImage,
  handleImageUpload,
  handleRemoveImage,
  isUploadingImage,
  imageProgress,
  imageInputRef,
}: Props) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 md:p-8 mb-6">
      <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-6">
        Lesson Details
      </h2>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Lesson Title
        </label>
        <input
          type="text"
          value={lessonTitle}
          onChange={(e) => setLessonTitle(e.target.value)}
          placeholder="e.g. Introduction to React Hooks"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm md:text-base"
        />
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Lesson Description
        </label>
        <textarea
          value={lessonDesc}
          onChange={(e) => setLessonDesc(e.target.value)}
          placeholder="Describe what your lesson is about..."
          rows={5}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none text-sm md:text-base"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Skill Category
          </label>
          <select
            value={skillCategory}
            onChange={(e) => setSkillCategory(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none bg-white text-sm md:text-base"
          >
            <option value="">Select a category</option>
            <option value="Frontend">Frontend</option>
            <option value="Backend">Backend</option>
            <option value="DevOps">DevOps</option>
            <option value="FullStack">Full Stack</option>
            <option value="DataScience">Data Science</option>
            <option value="MachineLearning">Machine Learning</option>
            <option value="AI">Artificial Intelligence</option>
            <option value="CyberSecurity">Cybersecurity</option>
            <option value="CloudComputing">Cloud Computing</option>
            <option value="MobileDevelopment">Mobile Development</option>
            <option value="SoftwareEngineering">Software Engineering</option>
            <option value="ComputerNetworks">Computer Networks</option>
            <option value="DatabaseManagement">Database Management</option>
            <option value="UIUXDesign">UI/UX Design</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Instructor Name
          </label>
          <input
            type="text"
            value={instructor}
            onChange={(e) => setInstructor(e.target.value)}
            placeholder="Your name"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm md:text-base"
          />
        </div>
      </div>

      <div className="mt-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Lesson Thumbnail Image
        </label>
        <div className="flex flex-col gap-4">
          <input
            type="file"
            ref={imageInputRef}
            accept="image/*"
            onChange={(e) =>
              handleImageUpload(e.target.files?.[0] ?? null)
            }
            className="hidden"
          />
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            disabled={isUploadingImage}
            className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700 disabled:opacity-50 text-sm md:text-base"
          >
            {isUploadingImage ? "Uploading..." : "Upload Thumbnail"}
          </button>

          {isUploadingImage && (
            <div className="w-full">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">
                  Uploading image...
                </span>
                <span className="text-sm text-gray-600">
                  {imageProgress}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${imageProgress}%` }}
                />
              </div>
            </div>
          )}

          {lessonImage && !isUploadingImage && (
            <div className="relative w-20 h-20">
              <img
                src={lessonImage}
                alt="Lesson thumbnail"
                className="w-20 h-20 object-cover rounded-lg border border-gray-200"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full"
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
