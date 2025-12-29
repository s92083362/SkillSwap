'use client';

import { ArrowLeft, Trash2, Plus, X, Eye, Edit } from 'lucide-react';
import React, { useEffect } from "react";
import { useRouter } from 'next/navigation';
import { useLessonManager } from '@/hooks/lessons/useLessonManager';

type Props = {
  lessonId?: string;
};

export default function ManageLessonPage({ lessonId }: Props) {
  const router = useRouter();

  const {
    mode,
    isPublic,
    lessonTitle,
    lessonDesc,
    skillCategory,
    instructor,
    lessonImage,
    isUploadingImage,
    imageProgress,
    sections,
    isLoading,
    isSaving,
    isDeleting,
    imageInputRef,
    fileInputRefs,
    setMode,
    setIsPublic,
    setLessonTitle,
    setLessonDesc,
    setSkillCategory,
    setInstructor,
    setSections,
    handleAddSection,
    handleRemoveSection,
    handleVideoUpload,
    handleRemoveVideo,
    handleImageUpload,
    handleRemoveImage,
    handleDeleteLesson,
    handleSaveChanges,
  } = useLessonManager(lessonId);


  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500 text-lg">Loading lesson...</div>
      </div>
    );
  }

  const onDeleteClick = async () => {
    const ok = await handleDeleteLesson();
    if (ok) router.push('/profile');
  };

  const onSaveClick = async () => {
    const ok = await handleSaveChanges();
    if (ok) router.push('/profile');
  };
  useEffect(() => {
    const prevTitle = document.title;
    document.title = "SkillSwap | ManageLesson";

    return () => {
      document.title = prevTitle;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 md:p-8">
        {/* Header */}
        <div className="mb-8 relative">
          <button
            onClick={() => router.push('/profile')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft size={20} />
            Back to My Lessons
          </button>

          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                {mode === 'preview' ? 'Lesson Preview' : 'Edit Lesson'}
              </h1>
              <p className="text-gray-500 text-sm sm:text-base">
                {mode === 'preview'
                  ? 'Review your lesson details'
                  : 'Make changes to your lesson'}
              </p>
            </div>

            <button
              onClick={() =>
                setMode((prev) => (prev === 'preview' ? 'edit' : 'preview'))
              }
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
            >
              {mode === 'preview' ? (
                <>
                  <Edit size={18} />
                  Edit Lesson
                </>
              ) : (
                <>
                  <Eye size={18} />
                  Preview Mode
                </>
              )}
            </button>
          </div>

          {/* Delete Button */}
          <div className="mt-4 sm:mt-0 sm:absolute sm:top-0 sm:right-0">
            <button
              onClick={onDeleteClick}
              disabled={isDeleting}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
            >
              <Trash2 size={18} />
              {isDeleting ? 'Deleting...' : 'Delete Lesson'}
            </button>
          </div>
        </div>

        {/* Preview Mode */}
        {mode === 'preview' && (
          <>
            {/* Lesson Details Card */}
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 md:p-8 mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-6">
                Lesson Details
              </h2>

              {lessonImage && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lesson Thumbnail
                  </label>
                  <img
                    src={lessonImage}
                    alt={lessonTitle}
                    className="w-48 h-48 object-cover rounded-lg border border-gray-200"
                  />
                </div>
              )}

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lesson Title
                </label>
                <div className="text-gray-900 text-base md:text-lg">
                  {lessonTitle}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lesson Description
                </label>
                <div className="text-gray-700 text-sm md:text-base whitespace-pre-wrap">
                  {lessonDesc}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Skill Category
                  </label>
                  <div className="text-gray-900">{skillCategory}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Instructor Name
                  </label>
                  <div className="text-gray-900">{instructor}</div>
                </div>
              </div>
            </div>

            {/* Lesson Sections */}
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 md:p-8 mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-6">
                Lesson Sections
              </h2>

              {sections.map((section, idx) => (
                <div
                  className="border border-gray-200 rounded-lg p-4 sm:p-6 mb-6"
                  key={idx}
                >
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
                    Section {idx + 1}: {section.title}
                  </h3>

                  {section.content && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Content
                      </label>
                      <div className="text-gray-700 text-sm md:text-base whitespace-pre-wrap">
                        {section.content}
                      </div>
                    </div>
                  )}

                  {section.videoUrl && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Video
                      </label>
                      <video
                        src={section.videoUrl}
                        controls
                        className="w-full max-w-2xl rounded-lg border border-gray-200"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Edit Mode */}
        {mode === 'edit' && (
          <>
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

              {/* Lesson Image Upload in Edit Mode */}
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
                    <div className="relative w-full max-w-xs">
                      <img
                        src={lessonImage}
                        alt="Lesson thumbnail"
                        className="w-full h-48 object-cover rounded-lg border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute top-2 right-2 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full"
                      >
                        <X size={18} />
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
                onClick={() => setMode('preview')}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={onSaveClick}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
