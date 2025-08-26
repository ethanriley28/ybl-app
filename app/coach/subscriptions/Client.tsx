// app/coach/subscriptions/Client.tsx
'use client';
import React from 'react';

type Athlete = { id: string; name: string };

export default function CoachSubsClient() {
  const [athletes, setAthletes] = React.useState<Athlete[]>([]);
  const [name, setName] = React.useState('');
  const [lookup, setLookup] = React.useState<null | boolean>(null);
  const [statusMsg, setStatusMsg] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  // Load all registered athletes for the dropdown
  // Load all registered athletes for the dropdown (alphabetical)
React.useEffect(() => {
  let active = true;
  (async () => {
    try {
      const res = await fetch('/api/athletes', { cache: 'no-store' });
      const json = await res.json();
      if (!active) return;

      if (json.ok) {
        const firstName = (s: string) => {
  const t = (s || '').trim();
  return (t.split(/\s+/)[0] || t).toLowerCase();
};

const list = (json.athletes || [])
  .slice()
  .sort((a: { name: string }, b: { name: string }) => {
    // primary: first-name A→Z
    const fa = firstName(a.name);
    const fb = firstName(b.name);
    if (fa !== fb) return fa.localeCompare(fb, 'en', { sensitivity: 'base' });
    // tie-breaker: full name A→Z
    return a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });
  });


        (list);
        setName(list[0]?.name || '');
      } else {
        setStatusMsg(json.error || 'Failed to load athletes');
      }
    } catch {
      if (active) setStatusMsg('Network error while loading athletes');
    } finally {
      if (active) setLoading(false);
    }
  })();
  return () => {
    active = false;
  };
}, []);


  async function fetchStatus(n: string) {
    if (!n) return;
    setLookup(null);
    try {
      const res = await fetch(`/api/approvals?athlete=${encodeURIComponent(n)}`, { cache: 'no-store' });
      const json = await res.json();
      setLookup(!!json.approved);
    } catch {
      setStatusMsg('Could not check status');
    }
  }

  async function setApproval(v: boolean) {
    if (!name.trim()) { setStatusMsg('Choose an athlete first.'); return; }
    setStatusMsg('Saving...');
    try {
      const res = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ athlete: name.trim(), approved: v }),
      });
      const json = await res.json();
      if (json.ok) {
        setStatusMsg(v ? 'Approved!' : 'Revoked.');
        fetchStatus(name.trim());
      } else {
        setStatusMsg(`Error: ${json.error || 'unknown'}`);
      }
    } catch {
      setStatusMsg('Network error while saving');
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: '40px auto', padding: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Coach — Subscriptions</h1>
      <p style={{ marginTop: 8, color: '#374151' }}>
        Choose a registered athlete, then approve or revoke. Parents will see metrics unlock automatically.
      </p>

      {loading ? (
        <div style={{ marginTop: 16 }}>Loading athletes…</div>
      ) : athletes.length === 0 ? (
        <div style={{ marginTop: 16 }}>
          No athletes registered yet. Ask a parent to{' '}
          <a href="/register">register their athlete</a> first.
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gap: 8, marginTop: 16, gridTemplateColumns: '1fr auto auto auto' }}>
            <select
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ padding: 8, borderRadius: 10, border: '1px solid #d1d5db' }}
            >
              {athletes.map((a) => (
                <option key={a.id} value={a.name}>
                  {a.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => name && fetchStatus(name)}
              style={{
                padding: '8px 12px',
                borderRadius: 10,
                border: '1px solid #d1d5db',
                background: '#fff',
                cursor: 'pointer',
              }}
            >
              Check
            </button>

            <button
              onClick={() => setApproval(true)}
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
              onClick={() => setApproval(false)}
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

          <div style={{ marginTop: 10, fontSize: 14, color: '#374151' }}>
            {lookup === null ? '—' : (
              <>
                Current status: <b>{lookup ? 'Approved' : 'Not approved'}</b>
              </>
            )}
            {statusMsg && <div style={{ marginTop: 6 }}>{statusMsg}</div>}
          </div>
        </>
      )}

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
    </main>
  );
}
