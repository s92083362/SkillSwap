"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase/firebaseConfig";
import { useAuthState } from "react-firebase-hooks/auth";
import type { User } from "firebase/auth";
import type { RefObject, MutableRefObject } from "react";
import LessonDetailsForm from "./LessonDetailsForm";
import LessonSectionsForm from "./LessonSectionsForm";

export type Section = {
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
    title: "",
    content: "",
    videoUrl: "",
    videoFileName: "",
    isUploading: false,
    progress: 0,
    error: null,
  };
}

export default function CreateLessonPage() {
  const router = useRouter();
  const [user] = useAuthState(auth as any as Parameters<typeof useAuthState>[0]);

  // meta
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonDesc, setLessonDesc] = useState("");
  const [skillCategory, setSkillCategory] = useState("");
  const [instructor, setInstructor] = useState("");
  const [lessonImage, setLessonImage] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageProgress, setImageProgress] = useState(0);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  // content
  const [sections, setSections] = useState<Section[]>([initialSection()]);
  const fileInputRefs = useRef<HTMLInputElement[]>([]);

  // visibility / publishing
  const [isPublic, setIsPublic] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const handleAddSection = () =>
    setSections((secs) => [...secs, initialSection()]);

  const handleRemoveSection = (idx: number) =>
    setSections((secs) => secs.filter((_, i) => i !== idx));

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
    formData.append("file", file);

    try {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e: ProgressEvent<EventTarget>) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          setSections((secs) =>
            secs.map((s, i) =>
              i === idx ? { ...s, progress: percent } : s
            )
          );
        }
      });

      xhr.addEventListener("load", () => {
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
                ? { ...s, isUploading: false, error: "Upload failed" }
                : s
            )
          );
        }
      });

      xhr.addEventListener("error", () => {
        setSections((secs) =>
          secs.map((s, i) =>
            i === idx
              ? { ...s, isUploading: false, error: "Network error" }
              : s
          )
        );
      });

      xhr.open("POST", "/api/upload/video");
      xhr.send(formData);
    } catch {
      setSections((secs) =>
        secs.map((s, i) =>
          i === idx
            ? { ...s, isUploading: false, error: "Client error" }
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
              videoUrl: "",
              videoFileName: "",
              progress: 0,
              error: null,
            }
          : s
      )
    );
    if (fileInputRefs.current[idx]) fileInputRefs.current[idx].value = "";
  };

  const handleImageUpload = async (file: File | undefined | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      return;
    }

    setIsUploadingImage(true);
    setImageProgress(0);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e: ProgressEvent<EventTarget>) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          setImageProgress(percent);
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status === 200) {
          const res = JSON.parse(xhr.responseText) as { url: string };
          setLessonImage(res.url);
          setIsUploadingImage(false);
        } else {
          alert("Image upload failed");
          setIsUploadingImage(false);
        }
      });

      xhr.addEventListener("error", () => {
        alert("Network error during image upload");
        setIsUploadingImage(false);
      });

      xhr.open("POST", "/api/upload/image");
      xhr.send(formData);
    } catch (error) {
      console.error("Image upload error:", error);
      alert("Failed to upload image");
      setIsUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setLessonImage("");
    setImageProgress(0);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const handlePublishLesson = async () => {
    if (!lessonTitle.trim()) {
      alert("Please enter a lesson title");
      return;
    }
    if (!lessonDesc.trim()) {
      alert("Please enter a lesson description");
      return;
    }
    if (!skillCategory) {
      alert("Please select a skill category");
      return;
    }
    if (!instructor.trim()) {
      alert("Please enter an instructor name");
      return;
    }
    if (sections.some((s) => !s.title.trim())) {
      alert("Please fill in all section titles");
      return;
    }
    if (sections.some((s) => s.isUploading)) {
      alert("Please wait for all videos to finish uploading");
      return;
    }

    setIsPublishing(true);

    try {
      if (!user || !(user as User).uid) {
        alert("You must be logged in to publish a lesson.");
        setIsPublishing(false);
        return;
      }

      const payload = {
        title: lessonTitle,
        titleLower: lessonTitle.toLowerCase(),
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
        visibility: isPublic ? "public" : "swap-only",
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, "lessons"), payload);
      alert("Lesson published successfully!");
      router.push("/profile?section=skills");
    } catch (error) {
      console.error("Error saving lesson:", error);
      alert("Failed to publish lesson. Please try again.");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 md:p-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Create a New Lesson
          </h1>
          <p className="text-gray-500 text-sm sm:text-base">
            Structure your lesson from title to videos/sections, all in one place.
          </p>
        </div>

        <LessonDetailsForm
          lessonTitle={lessonTitle}
          setLessonTitle={setLessonTitle}
          lessonDesc={lessonDesc}
          setLessonDesc={setLessonDesc}
          skillCategory={skillCategory}
          setSkillCategory={setSkillCategory}
          instructor={instructor}
          setInstructor={setInstructor}
          lessonImage={lessonImage}
          handleImageUpload={handleImageUpload}
          handleRemoveImage={handleRemoveImage}
          isUploadingImage={isUploadingImage}
          imageProgress={imageProgress}
          imageInputRef={imageInputRef}
        />

        <LessonSectionsForm
          sections={sections}
          setSections={setSections}
          handleAddSection={handleAddSection}
          handleRemoveSection={handleRemoveSection}
          handleVideoUpload={handleVideoUpload}
          handleRemoveVideo={handleRemoveVideo}
          fileInputRefs={fileInputRefs}
          isPublic={isPublic}
          setIsPublic={setIsPublic}
          isPublishing={isPublishing}
          onCancel={() => router.push("/profile?section=skills")}
          onPublish={handlePublishLesson}
        />
      </div>
    </div>
  );
}
