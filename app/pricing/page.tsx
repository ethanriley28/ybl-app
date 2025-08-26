'use client';

export default function PricingPage() {
  return (
    <main style={{ maxWidth: 720, margin: '40px auto', padding: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Ethan Riley Training — Pricing</h1>
      <p style={{ marginTop: 8 }}>Lessons are <b>30 mins for $30 and 60 mins for $45 </b>. If you play with the <b>Birmingham Giants</b> let me know once you book.  Player metrics are a paid add-on.</p>
      <ul style={{ marginTop: 16, lineHeight: 1.7 }}>
        <li>Metrics Subscription: <b>$5/month</b></li>
        <li>Cash App: <b>$ethanriley28</b></li>
        <li>Venmo: <b>@ethanriley8</b></li>
        <li>Cash accepted in person</li>
      </ul>
      <a href="/scheduler" style={{ display: 'inline-block', marginTop: 24, padding: '10px 14px', border: '1px solid #111', borderRadius: 10 }}>
        Go to Scheduler
      </a>
    </main>
  );
}
