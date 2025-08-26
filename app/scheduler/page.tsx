'use client';
import AuthGuard from '@/components/AuthGuard';
import TopBar from '@/components/TopBar';
import BaseballLessonsApp from '@/components/BaseballLessonsApp'; // adjust path if needed

export default function SchedulerPage() {
  return (
    <AuthGuard>
      <TopBar />
      <BaseballLessonsApp />
    </AuthGuard>
  );
}
