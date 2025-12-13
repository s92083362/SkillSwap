'use client';

import React, { useState, useRef } from 'react';
import { ChevronUp, Trash2, Plus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { collection, addDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase/firebaseConfig';
import { useAuthState } from 'react-firebase-hooks/auth';
import type { User } from 'firebase/auth';

type Section = {
  title: string;
  content: string;
  videoUrl: string;
  videoFileName: string;
  isUploading: boolean;
  progress: number;
  error: string | null;
};

function initialSection(): Section {
  return {
    title: '',
    content: '',
    videoUrl: '',
    videoFileName: '',
    isUploading: false,
    progress: 0,
    error: null,
  };
}

export default function CreateLessonPage() {
  const router = useRouter();
  const [user] = useAuthState(auth as any as Parameters<typeof useAuthState>[0]); // keeps hook typing happy [web:32]

  // Meta fields
  const [lessonTitle, setLessonTitle] = useState<string>('');
  const [lessonDesc, setLessonDesc] = useState<string>('');
  const [skillCategory, setSkillCategory] = useState<string>('');
  const [instructor, setInstructor] = useState<string>('');
  const [lessonImage, setLessonImage] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const [imageProgress, setImageProgress] = useState<number>(0);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  // Lesson visibility
  const [isPublic, setIsPublic] = useState<boolean>(false);

  // Sections array
  const [sections, setSections] = useState<Section[]>([initialSection()]);
  const fileInputRefs = useRef<HTMLInputElement[]>([]); 

  const [isPublishing, setIsPublishing] = useState<boolean>(false);

  // Add a new section
  const handleAddSection = () =>
    setSections((secs) => [...secs, initialSection()]);

  // Remove a section
  const handleRemoveSection = (idx: number) =>
    setSections((secs) => secs.filter((_, i) => i !== idx));

  // Handle video upload
  const handleVideoUpload = async (file: File | undefined, idx: number) => {
    if (!file) return;
    setSections((secs) =>
      secs.map((s, i) =>
        i === idx
          ? {
              ...s,
              isUploading: true,
              videoFileName: file.name,
              progress: 0,
              error: null,
            }
          : s
      )
    );
    const formData = new FormData();
    formData.append('file', file);
    try {
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', (e: ProgressEvent<EventTarget>) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          setSections((secs) =>
            secs.map((s, i) =>
              i === idx ? { ...s, progress: percent } : s
            )
          );
        }
      });
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const res = JSON.parse(xhr.responseText) as { url: string };
          setSections((secs) =>
            secs.map((s, i) =>
              i === idx
                ? {
                    ...s,
                    isUploading: false,
                    videoUrl: res.url,
                    progress: 100,
                  }
                : s
            )
          );
        } else {
          setSections((secs) =>
            secs.map((s, i) =>
              i === idx
                ? { ...s, isUploading: false, error: 'Upload failed' }
                : s
            )
          );
        }
      });
      xhr.addEventListener('error', () => {
        setSections((secs) =>
          secs.map((s, i) =>
            i === idx
              ? { ...s, isUploading: false, error: 'Network error' }
              : s
          )
        );
      });
      xhr.open('POST', '/api/upload-video');
      xhr.send(formData);
    } catch {
      setSections((secs) =>
        secs.map((s, i) =>
          i === idx
            ? { ...s, isUploading: false, error: 'Client error' }
            : s
        )
      );
    }
  };

  const handleRemoveVideo = (idx: number) => {
    setSections((secs) =>
      secs.map((s, i) =>
        i === idx
          ? {
              ...s,
              videoUrl: '',
              videoFileName: '',
              progress: 0,
              error: null,
            }
          : s
      )
    );
    if (fileInputRefs.current[idx]) fileInputRefs.current[idx].value = '';
  };

  // Handle lesson image upload
  const handleImageUpload = async (file: File | undefined | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    setIsUploadingImage(true);
    setImageProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', (e: ProgressEvent<EventTarget>) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          setImageProgress(percent);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const res = JSON.parse(xhr.responseText) as { url: string };
          setLessonImage(res.url);
          setIsUploadingImage(false);
        } else {
          alert('Image upload failed');
          setIsUploadingImage(false);
        }
      });

      xhr.addEventListener('error', () => {
        alert('Network error during image upload');
        setIsUploadingImage(false);
      });

      xhr.open('POST', '/api/upload-image');
      xhr.send(formData);
    } catch (error) {
      console.error('Image upload error:', error);
      alert('Failed to upload image');
      setIsUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setLessonImage('');
    setImageProgress(0);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  // Handle lesson publish
  const handlePublishLesson = async () => {
    if (!lessonTitle.trim()) {
      alert('Please enter a lesson title');
      return;
    }
    if (!lessonDesc.trim()) {
      alert('Please enter a lesson description');
      return;
    }
    if (!skillCategory) {
      alert('Please select a skill category');
      return;
    }
    if (!instructor.trim()) {
      alert('Please enter an instructor name');
      return;
    }
    if (sections.some((s) => !s.title.trim())) {
      alert('Please fill in all section titles');
      return;
    }
    if (sections.some((s) => s.isUploading)) {
      alert('Please wait for all videos to finish uploading');
      return;
    }

    setIsPublishing(true);

    try {
      if (!user || !(user as User).uid) {
        alert('You must be logged in to publish a lesson.');
        setIsPublishing(false);
        return;
      }
      const payload = {
        title: lessonTitle,
        description: lessonDesc,
        skillCategory,
        instructor,
        image: lessonImage,
        sections: sections.map((s) => ({
          title: s.title,
          content: s.content,
          videoUrl: s.videoUrl,
        })),
        creatorId: (user as User).uid,
        visibility: isPublic ? 'public' : 'swap-only',
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'lessons'), payload);
      console.log('Lesson saved with ID:', docRef.id);
      alert('Lesson published successfully!');
      router.push('/profile?section=skills');
    } catch (error) {
      console.error('Error saving lesson:', error);
      alert('Failed to publish lesson. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 md:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Create a New Lesson
          </h1>
          <p className="text-gray-500 text-sm sm:text-base">
            Structure your lesson from title to videos/sections, all in one
            place.
          </p>
        </div>
        {/* Lesson Details Card */}
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

          {/* Lesson Image Upload */}
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
                {isUploadingImage ? 'Uploading...' : 'Upload Thumbnail'}
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

        {/* Lesson Content Card */}
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
                    {section.isUploading ? 'Uploading...' : 'Upload Video'}
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
                    <p className="text-sm text-red-600">
                      ✗ {section.error}
                    </p>
                  </div>
                )}
                {section.videoUrl &&
                  !section.isUploading &&
                  !section.error &&
                  section.videoUrl.startsWith('http') && (
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

        {/* Lesson Visibility Toggle */}
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
            <label className="flex items-center text-black gap-2">
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

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end sm:gap-4">
          <button
            type="button"
            className="w-full sm:w-auto px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700"
            onClick={() => router.push('/profile?section=skills')}
            disabled={isPublishing}
          >
            Cancel
          </button>
          <button
            type="button"
            className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handlePublishLesson}
            disabled={isPublishing}
          >
            {isPublishing ? 'Publishing...' : 'Publish Lesson'}
          </button>
        </div>
      </div>
    </div>
  );
}
