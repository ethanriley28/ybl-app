'use client';

import React, { useMemo } from 'react';

type Props = {
  /** slot length in minutes (e.g. 30 or 60) */
  slotMinutes: number;
  /** optional, safe to pass and ignore for now */
  athleteId?: string | null;
  /** optional, if you want to force a refresh when parent changes this */
  refreshKey?: number;
  /** when a user clicks a slot in the calendar */
  onPickSlot?: (start: Date) => void;
};

// Week = Mon–Fri, hours 17:00–20:00 (5–8 PM)
const START_HOUR = 17;
const END_HOUR = 20; // exclusive

function startOfWeekMonday(d = new Date()) {
  const dt = new Date(d);
  const day = dt.getDay(); // 0 Sun, 1 Mon, ... 6 Sat
  const diff = (day === 0 ? -6 : 1 - day); // move to Monday
  dt.setDate(dt.getDate() + diff);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function timeSlots(slotMinutes: number) {
  const slots: { h: number; m: number; label: string }[] = [];
  for (let h = START_HOUR; h < END_HOUR; h++) {
    for (let m = 0; m < 60; m += slotMinutes) {
      const hh = ((h + 11) % 12) + 1;
      const ampm = h >= 12 ? 'PM' : 'AM';
      const mm = String(m).padStart(2, '0');
      slots.push({ h, m, label: `${hh}:${mm} ${ampm}` });
    }
  }
  return slots;
}

export default function BookingCalendar({
  slotMinutes,
  athleteId,   // intentionally unused but accepted to satisfy callers
  refreshKey,  // can be used later for refetching occupancy
  onPickSlot,
}: Props) {
  // Compute current Monday..Friday and the list of time rows
  const { weekDays, rows } = useMemo(() => {
    const monday = startOfWeekMonday(new Date());
    const days = Array.from({ length: 5 }).map((_, i) => addDays(monday, i));
    const trows = timeSlots(slotMinutes);
    return { weekDays: days, rows: trows };
  }, [slotMinutes, refreshKey]);

  // Compose styles (desktop first; still readable on mobile)
  const gridWrapper: React.CSSProperties = {
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    overflow: 'hidden',
    background: '#fff',
  };

  const headerRow: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '110px repeat(5, 1fr)',
    borderBottom: '1px solid #e5e7eb',
    background: '#0ea5e9', // teal/blue header like your “green” theme
    color: '#fff',
  };

  const headerCell: React.CSSProperties = {
    padding: '10px 12px',
    textAlign: 'center',
    borderLeft: '1px solid rgba(255,255,255,0.2)',
  };

  const timeColCell: React.CSSProperties = {
    padding: '8px 10px',
    borderRight: '1px solid #e5e7eb',
    fontSize: 13,
    color: '#64748b',
    whiteSpace: 'nowrap',
  };

  const rowGrid: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '110px repeat(5, 1fr)',
    borderTop: '1px solid #e5e7eb',
  };

  const slotBtn: React.CSSProperties = {
    width: '100%',
    height: 40,
    border: '1px solid #e5e7eb',
    background: '#10b98122', // light green “Available”
    borderRadius: 6,
    cursor: onPickSlot ? 'pointer' : 'default',
  };

  const slotCell: React.CSSProperties = {
    padding: 6,
    borderLeft: '1px solid #f1f5f9',
    display: 'flex',
    alignItems: 'center',
  };

  const dayTitleTop: React.CSSProperties = {
    fontWeight: 700,
    fontSize: 13,
    lineHeight: 1.1,
  };

  const dayTitleBottom: React.CSSProperties = {
    fontSize: 12,
    opacity: 0.95,
  };

  return (
    <div style={gridWrapper}>
      {/* Header */}
      <div style={headerRow}>
        <div style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'left' }}>
          Time
        </div>
        {weekDays.map((d, idx) => {
          const dayName = d.toLocaleDateString(undefined, { weekday: 'short' }); // Mon
          const month = d.toLocaleDateString(undefined, { month: 'short' });     // Aug
          const dayNum = d.getDate();
          return (
            <div key={idx} style={headerCell}>
              <div style={dayTitleTop}>{dayName}</div>
              <div style={dayTitleBottom}>{month} {dayNum}</div>
            </div>
          );
        })}
      </div>

      {/* Rows */}
      {rows.map(({ h, m, label }, rIdx) => (
        <div key={rIdx} style={rowGrid}>
          {/* Time column */}
          <div style={timeColCell}>{label}</div>

          {/* 5 day columns */}
          {weekDays.map((d, cIdx) => {
            const start = new Date(d);
            start.setHours(h, m, 0, 0);
            return (
              <div key={`${rIdx}-${cIdx}`} style={slotCell}>
                <button
                  type="button"
                  style={slotBtn}
                  onClick={() => onPickSlot?.(start)}
                  aria-label={`Pick ${start.toString()}`}
                />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
