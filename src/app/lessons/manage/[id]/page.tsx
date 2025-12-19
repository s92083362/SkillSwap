'use client';

import { useParams } from 'next/navigation';
import ManageLessonPage from '@/components/lessons/manage/ManageLessonPage';

export default function ManageLessonRoute() {
  const params = useParams<{ id: string }>();
  const lessonId = params?.id;

  return <ManageLessonPage lessonId={lessonId} />;
}
