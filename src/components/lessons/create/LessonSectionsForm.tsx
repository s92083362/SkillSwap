"use client";

import React from "react";
import { Plus, Trash2, X } from "lucide-react";
import type { Section } from "./CreateLessonPage";
import type { MutableRefObject } from "react";

type Props = {
  sections: Section[];
  setSections: React.Dispatch<React.SetStateAction<Section[]>>;
  handleAddSection: () => void;
  handleRemoveSection: (idx: number) => void;
  handleVideoUpload: (file: File | undefined, idx: number) => void;
  handleRemoveVideo: (idx: number) => void;
  fileInputRefs: MutableRefObject<HTMLInputElement[]>;
  isPublic: boolean;
  setIsPublic: (v: boolean) => void;
  isPublishing: boolean;
  onCancel: () => void;
  onPublish: () => void;
};

export default function LessonSectionsForm({
  sections,
  setSections,
  handleAddSection,
  handleRemoveSection,
  handleVideoUpload,
  handleRemoveVideo,
  fileInputRefs,
  isPublic,
  setIsPublic,
  isPublishing,
  onCancel,
  onPublish,
}: Props) {
  return (
    <>
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 md:p-8 mb-6">
        <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
            Lesson Sections
          </h2>
          <button
            type="button"
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
            onClick={handleAddSection}
          >
            <Plus size={20} /> Add Section
          </button>
        </div>

        {sections.map((section, idx) => (
          <div
            className="border border-gray-200 rounded-lg p-4 sm:p-6 mb-8"
            key={idx}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                Section {idx + 1}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="p-1 hover:bg-gray-100 rounded"
                  onClick={() => handleRemoveSection(idx)}
                >
                  <Trash2 size={20} className="text-gray-400" />
                </button>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Section Title
              </label>
              <input
                type="text"
                value={section.title}
                onChange={(e) =>
                  setSections((secs) =>
                    secs.map((s, i) =>
                      i === idx ? { ...s, title: e.target.value } : s
                    )
                  )
                }
                placeholder="e.g. What are React Hooks?"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm md:text-base"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Section Content
              </label>
              <textarea
                value={section.content}
                onChange={(e) =>
                  setSections((secs) =>
                    secs.map((s, i) =>
                      i === idx ? { ...s, content: e.target.value } : s
                    )
                  )
                }
                placeholder="Add your detailed section content here..."
                rows={6}
                className="w-full px-4 py-3 outline-none resize-none border border-gray-300 rounded-lg text-sm md:text-base"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Section Video
              </label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <input
                  type="text"
                  placeholder="Or paste a video URL"
                  value={section.videoUrl}
                  onChange={(e) =>
                    setSections((secs) =>
                      secs.map((s, i) =>
                        i === idx
                          ? { ...s, videoUrl: e.target.value }
                          : s
                      )
                    )
                  }
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm md:text-base"
                  disabled={section.isUploading}
                />
                <span className="text-gray-500 text-center">or</span>
                <input
                  type="file"
                  ref={(el) => {
                    if (el) {
                      fileInputRefs.current[idx] = el;
                    }
                  }}
                  accept="video/*"
                  onChange={(e) =>
                    handleVideoUpload(e.target.files?.[0], idx)
                  }
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRefs.current[idx]?.click()}
                  disabled={section.isUploading}
                  className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700 disabled:opacity-50 text-sm md:text-base"
                >
                  {section.isUploading ? "Uploading..." : "Upload Video"}
                </button>
              </div>

              {section.videoFileName && section.isUploading && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">
                      {section.videoFileName}
                    </span>
                    <span className="text-sm text-gray-600">
                      {section.progress}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${section.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {section.error && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">✗ {section.error}</p>
                </div>
              )}

              {section.videoUrl &&
                !section.isUploading &&
                !section.error &&
                section.videoUrl.startsWith("http") && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-green-600">
                        ✓ Video uploaded successfully
                      </p>
                      <button
                        type="button"
                        onClick={() => handleRemoveVideo(idx)}
                        className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700"
                      >
                        <X size={18} />
                      </button>
                    </div>
                    <video
                      src={section.videoUrl}
                      controls
                      className="w-full max-w-xs sm:max-w-md md:max-w-lg rounded-lg border border-gray-200 mx-auto"
                    />
                  </div>
                )}
            </div>
          </div>
        ))}
      </div>

      <div className="mb-10 mt-8">
        <label className="block text-sm font-medium text-black mb-2">
          Lesson Visibility
        </label>
        <div className="flex items-center gap-4">
          <label className="flex items-center text-black gap-2">
            <input
              type="radio"
              name="visibility"
              checked={isPublic}
              onChange={() => setIsPublic(true)}
              className="accent-blue-600"
            />
            Public (anyone can view)
          </label>
          <label className="flex itemsCenter text-black gap-2">
            <input
              type="radio"
              name="visibility"
              checked={!isPublic}
              onChange={() => setIsPublic(false)}
              className="accent-blue-600"
            />
            Swap-only (requires accepted swap)
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end sm:gap-4">
        <button
          type="button"
          className="w-full sm:w-auto px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700"
          onClick={onCancel}
          disabled={isPublishing}
        >
          Cancel
        </button>
        <button
          type="button"
          className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={onPublish}
          disabled={isPublishing}
        >
          {isPublishing ? "Publishing..." : "Publish Lesson"}
        </button>
      </div>
    </>
  );
}
