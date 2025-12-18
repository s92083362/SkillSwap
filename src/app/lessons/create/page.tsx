// src/app/lessons/create/page.tsx
import CreateLessonPage from "@/components/lessons/create/CreateLessonPage";

export default function Page() {
  // This is a Server Component by default, and that is fine.
  // CreateLessonPage itself will be marked `"use client"` at the top of its file.
  return <CreateLessonPage />;
}
