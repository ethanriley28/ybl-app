'use client';

import React, { useState } from 'react';
import BookingCalendar from '@/components/BookingCalendar';

export default function CoachCalendarPage() {
  // lets you force the calendar to refetch after changes if needed
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <main style={{ maxWidth: 1100, margin: '24px auto', padding: '0 16px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
        Coach — Full Calendar
      </h1>

      <div
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          padding: 8,
          background: '#fff',
          overflow: 'hidden',
        }}
      >
        {/* Read-only coach view of bookings. Adjust slotMinutes if you prefer 60. */}
        <BookingCalendar slotMinutes={30} refreshKey={refreshKey} />
      </div>
    </main>
  );
}
