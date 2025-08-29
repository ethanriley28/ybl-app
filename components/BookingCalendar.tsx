'use client';

import React, { useEffect, useMemo, useState } from 'react';

type Props = {
  /** 30 or 60 — used for how long a booking is when the user taps a slot */
  slotMinutes: number;
  /** bump this number to force a re-fetch from parent (optional) */
  refreshKey?: number;
  /** called when user taps a green slot */
  onPickSlot?: (startLocal: Date) => void;
};

type RawOcc = {
  start?: string;
  end?: string;
  start_ts?: string;
  end_ts?: string;
};

type Busy = { start: Date; end: Date };

function toUTCISO(local: Date) {
  return new Date(local.getTime() - local.getTimezoneOffset() * 60000).toISOString();
}

function toLocal(d: string | Date) {
  const dt = typeof d === 'string' ? new Date(d) : d;
  return new Date(dt.getTime() + new Date().getTimezoneOffset() * 60000);
}

function startOfWeekMonday(d: Date) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // 0 = Monday
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addMinutes(d: Date, n: number) {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() + n);
  return x;
}

function formatDow(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: 'short' }); // Mon
}
function formatMonthDay(d: Date) {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); // Aug 30
}
function formatTimeLabel(d: Date) {
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function BookingCalendar({ slotMinutes, refreshKey = 0, onPickSlot }: Props) {
  // Week = Monday..Friday view
  const [anchor, setAnchor] = useState<Date>(() => startOfWeekMonday(new Date()));
  const weekDays = useMemo(() => {
    return Array.from({ length: 5 }).map((_, i) => addMinutes(addMinutes(anchor, i * 24 * 60), 0));
  }, [anchor]);

  // Times shown down the left (every 30 min from 5:00pm → 8:00pm)
  const timeLabels = useMemo(() => {
    const labels: Date[] = [];
    const base = new Date(anchor);
    base.setHours(17, 0, 0, 0); // 5:00pm
    const end = new Date(anchor);
    end.setHours(20, 0, 0, 0); // 8:00pm
    let cur = new Date(base);
    while (cur < end) {
      labels.push(new Date(cur));
      cur = addMinutes(cur, 30);
    }
    return labels;
  }, [anchor]);

  // Occupied slots for the whole week
  const [busy, setBusy] = useState<Busy[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let on = true;
    (async () => {
      setLoading(true);
      try {
        const weekStartLocal = startOfWeekMonday(new Date(anchor));
        const weekEndLocal = new Date(weekStartLocal);
        weekEndLocal.setDate(weekEndLocal.getDate() + 7);

        const qs = `start=${encodeURIComponent(toUTCISO(weekStartLocal))}&end=${encodeURIComponent(
          toUTCISO(weekEndLocal)
        )}`;

        // This endpoint should already exist from earlier steps.
        const r = await fetch(`/api/bookings/occupied?${qs}`);
        const j = await r.json().catch(() => ({} as any));

        // Accept shapes: {occupied:[{start,end}]} OR plain array OR {data:[...]}
        const arr: RawOcc[] = Array.isArray(j)
          ? j
          : Array.isArray(j?.occupied)
          ? j.occupied
          : Array.isArray(j?.data)
          ? j.data
          : [];

        const rows: Busy[] = arr
          .map((o) => {
            const s = o.start_ts || o.start;
            const e = o.end_ts || o.end;
            if (!s || !e) return null;
            // convert to LOCAL for overlap checks
            return { start: toLocal(s), end: toLocal(e) };
          })
          .filter(Boolean) as Busy[];

        if (on) setBusy(rows);
      } catch {
        if (on) setBusy([]);
      } finally {
        if (on) setLoading(false);
      }
    })();
    return () => {
      on = false;
    };
  }, [anchor, refreshKey]);

  function isBusy(cellStart: Date, cellEnd: Date) {
    return busy.some((b) => b.start < cellEnd && b.end > cellStart);
  }

  return (
    <div className="bk-root">
      {/* Header: days */}
      <div className="bk-head">
        <div className="bk-timecol">&nbsp;</div>
        {weekDays.map((d, idx) => (
          <div className="bk-dayhead" key={idx}>
            <div className="dow">{formatDow(d)}</div>
            <div className="md">{formatMonthDay(d)}</div>
          </div>
        ))}
      </div>

      {/* Scrollable grid */}
      <div className="bk-viewport">
        <div className="bk-grid">
          {/* time labels column */}
          <div className="bk-timecol">
            {timeLabels.map((t, i) => (
              <div className="bk-time" key={i}>
                {formatTimeLabel(t)}
              </div>
            ))}
          </div>

          {/* 5 day columns */}
          {weekDays.map((day, di) => {
            return (
              <div className="bk-daycol" key={di}>
                {timeLabels.map((label, ri) => {
                  const cellStart = new Date(
                    day.getFullYear(),
                    day.getMonth(),
                    day.getDate(),
                    label.getHours(),
                    label.getMinutes(),
                    0,
                    0
                  );
                  // each visual cell = 30 min
                  const cellEnd = addMinutes(cellStart, 30);
                  const taken = isBusy(cellStart, cellEnd);

                  return (
                    <button
                      key={ri}
                      className={`bk-cell ${taken ? 'busy' : 'open'}`}
                      type="button"
                      disabled={taken}
                      onClick={() => {
                        if (taken) return;
                        // When user taps a 30-min cell, we pass the START time.
                        // Parent will combine with slotMinutes to create the booking.
                        onPickSlot?.(cellStart);
                      }}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {loading && <div className="bk-loading">Loading…</div>}
    </div>
  );
}
