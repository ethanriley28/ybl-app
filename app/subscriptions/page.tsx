// app/coach/subscriptions/page.tsx
'use client';

export default function CoachSubscriptionsPage() {
  const key = 'ert_sub_v1';
  const approved =
    typeof window !== 'undefined' && localStorage.getItem(key) === 'true';

  const set = (v: boolean) => {
    localStorage.setItem(key, String(v));
    location.reload();
  };

  return (
    <main style={{ maxWidth: 720, margin: '40px auto', padding: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Coach — Subscriptions</h1>
      <p style={{ marginTop: 8, color: '#374151' }}>
        Toggle the same “metrics unlocked” flag the app reads.
      </p>

      <div style={{ marginTop: 16 }}>
        <div>
          Status:{' '}
          <b>{approved ? 'Approved (metrics unlocked)' : 'Not approved'}</b>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button
            onClick={() => set(true)}
            style={{
              padding: '8px 12px',
              borderRadius: 10,
              border: '1px solid #111',
              background: '#111',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Approve
          </button>
          <button
            onClick={() => set(false)}
            style={{
              padding: '8px 12px',
              borderRadius: 10,
              border: '1px solid #d1d5db',
              background: '#fff',
              cursor: 'pointer',
            }}
          >
            Revoke
          </button>
        </div>

        <a
          href="/scheduler"
          style={{
            display: 'inline-block',
            marginTop: 24,
            padding: '10px 14px',
            border: '1px solid #111',
            borderRadius: 10,
            textDecoration: 'none',
            color: '#111',
          }}
        >
          Back to Scheduler
        </a>
      </div>
    </main>
  );
}
