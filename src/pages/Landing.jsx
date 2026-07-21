import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '24px 32px', borderBottom: '1px solid var(--line)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9, background: 'var(--red)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 900, fontSize: 16
          }}>+</div>
          <span style={{ fontWeight: 800, fontSize: 17 }}>Emergency QR</span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link to="/login" style={{
            padding: '10px 18px', fontWeight: 600, fontSize: 14,
            textDecoration: 'none', color: 'var(--ink)'
          }}>Log in</Link>
          <Link to="/signup" style={{
            padding: '10px 18px', fontWeight: 700, fontSize: 14,
            textDecoration: 'none', color: 'white', background: 'var(--ink)',
            borderRadius: 8
          }}>Get your QR</Link>
        </div>
      </header>

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 24px' }}>
        <div style={{ maxWidth: 640, textAlign: 'center' }}>
          <div className="eyebrow" style={{ marginBottom: 18, color: 'var(--red)' }}>
            IN CASE OF ACCIDENT
          </div>
          <h1 style={{
            fontSize: 'clamp(36px, 6vw, 58px)', fontWeight: 900, lineHeight: 1.05,
            letterSpacing: '-0.02em', margin: '0 0 20px'
          }}>
            One scan.<br />
            Your people know<br />
            <span style={{ color: 'var(--red)' }}>in seconds.</span>
          </h1>
          <p style={{ fontSize: 17, color: 'var(--ink-soft)', lineHeight: 1.6, maxWidth: 480, margin: '0 auto 36px' }}>
            Add your emergency contacts, get a QR code, stick it on your bike,
            bag, or ID. Anyone who finds you can alert your contacts instantly —
            no app, no login, just one tap.
          </p>
          <Link to="/signup" style={{
            display: 'inline-block', padding: '16px 32px', fontWeight: 700, fontSize: 16,
            textDecoration: 'none', color: 'white', background: 'var(--red)', borderRadius: 10
          }}>
            Create your QR code →
          </Link>

          <div style={{
            marginTop: 64, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 20, textAlign: 'left'
          }}>
            {[
              { n: '01', t: 'Add your details', d: 'Name, blood group, and 2–3 emergency contacts.' },
              { n: '02', t: 'Get your QR', d: 'Print it, stick it on anything you carry.' },
              { n: '03', t: 'Scanned = alerted', d: 'Finder taps one button — contacts get SMS, WhatsApp, and a loud siren push alert instantly.' },
            ].map(s => (
              <div key={s.n} style={{
                padding: 20, background: 'white', borderRadius: 12, border: '1px solid var(--line)'
              }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--red)', fontWeight: 700, marginBottom: 8 }}>{s.n}</div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{s.t}</div>
                <div style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.5 }}>{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
