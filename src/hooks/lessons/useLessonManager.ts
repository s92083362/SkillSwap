'use client';

import { useState, useEffect, useRef } from 'react';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebaseConfig';

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
    title: '',
    content: '',
    videoUrl: '',
    videoFileName: '',
    isUploading: false,
    progress: 0,
    error: null,
  };
}

export function useLessonManager(lessonId: string | undefined) {
  const [mode, setMode] = useState<'preview' | 'edit'>('preview');
  const [isPublic, setIsPublic] = useState(false);

  // meta
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDesc, setLessonDesc] = useState('');
  const [skillCategory, setSkillCategory] = useState('');
  const [instructor, setInstructor] = useState('');
  const [lessonImage, setLessonImage] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageProgress, setImageProgress] = useState(0);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  // sections
  const [sections, setSections] = useState<Section[]>([initialSection()]);
  const fileInputRefs = useRef<HTMLInputElement[]>([]);

  // loading
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // fetch lesson
  useEffect(() => {
    async function fetchLesson() {
      if (!lessonId) {
        setIsLoading(false);
        return;
      }

      try {
        const docRef = doc(db, 'lessons', lessonId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as any;

          setLessonTitle(data.title || '');
          setLessonDesc(data.description || '');
          setSkillCategory(data.skillCategory || '');
          setInstructor(data.instructor || '');
          setLessonImage(data.image || '');
          setSections(
            (data.sections || []).map(
              (s: any): Section => ({
                title: s.title || '',
                content: s.content || '',
                videoUrl: s.videoUrl || '',
                videoFileName: '',
                isUploading: false,
                progress: 0,
                error: null,
              })
            ) || [initialSection()]
          );
          setIsPublic(!!data.isPublic);
        }
      } catch (err) {
        console.error('Error fetching lesson', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLesson();
  }, [lessonId]);

  // add/remove section
  const handleAddSection = () => {
    setSections((secs) => [...secs, initialSection()]);
  };

  const handleRemoveSection = (idx: number) => {
    setSections((secs) => secs.filter((_, i) => i !== idx));
  };

  // video upload
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

      xhr.open('POST', '/api/upload/video');
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
    if (fileInputRefs.current[idx]) {
      fileInputRefs.current[idx].value = '';
    }
  };

  // image upload
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
        } else {
          alert('Image upload failed');
        }
        setIsUploadingImage(false);
      });

      xhr.addEventListener('error', () => {
        alert('Network error during image upload');
        setIsUploadingImage(false);
      });

      xhr.open('POST', '/api/upload/image');
      xhr.send(formData);
    } catch {
      alert('Failed to upload image');
      setIsUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setLessonImage('');
    setImageProgress(0);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  // delete
  const handleDeleteLesson = async () => {
    const confirmDelete = window.confirm(
      'Are you sure you want to permanently delete this lesson? This action cannot be undone.'
    );
    if (!confirmDelete) return false;

    setIsDeleting(true);
    try {
      if (!lessonId) throw new Error('No lesson ID');
      const docRef = doc(db, 'lessons', lessonId);
      await deleteDoc(docRef);
      alert('Lesson deleted successfully!');
      return true;
    } catch {
      alert('Failed to delete lesson. Please try again.');
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  // save
  const handleSaveChanges = async () => {
    if (!lessonTitle.trim()) {
      alert('Please enter a lesson title');
      return false;
    }
    if (!lessonDesc.trim()) {
      alert('Please enter a lesson description');
      return false;
    }
    if (!skillCategory) {
      alert('Please select a skill category');
      return false;
    }
    if (!instructor.trim()) {
      alert('Please enter an instructor name');
      return false;
    }
    if (sections.some((s) => !s.title.trim())) {
      alert('Please fill in all section titles');
      return false;
    }
    if (sections.some((s) => s.isUploading)) {
      alert('Please wait for all videos to finish uploading');
      return false;
    }

    setIsSaving(true);
    try {
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
        isPublic,
        updatedAt: new Date().toISOString(),
      };

      if (!lessonId) throw new Error('No lesson ID');
      const docRef = doc(db, 'lessons', lessonId);
      await updateDoc(docRef, payload);

      alert('Lesson updated successfully!');
      setMode('preview');
      return true;
    } catch {
      alert('Failed to update lesson. Please try again.');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    // state
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
    // actions
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
  };
}
