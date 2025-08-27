// app/coach/calendar/page.tsx
'use client';

import AuthGuard from '../../../components/AuthGuard';
import TopBar from '../../../components/TopBar';
import CoachCalendar from '../../../components/CoachCalendar';

export default function CoachCalendarPage() {
  return (
    <AuthGuard>
      <TopBar />
      <main style={{ maxWidth: 1100, margin: '24px auto', padding: 16 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Coach — Calendar</h1>
        <p style={{ color: '#374151', marginBottom: 12 }}>Full overview of all booked sessions.</p>
        <CoachCalendar />
      </main>
    </AuthGuard>
  );
}
