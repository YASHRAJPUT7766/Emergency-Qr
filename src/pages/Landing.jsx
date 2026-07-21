import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--paper)' }}>
      <header style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 20px', borderBottom: '1px solid var(--line)', background: 'white'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8, background: 'var(--red)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 900, fontSize: 15, flexShrink: 0
          }}>+</div>
          <span style={{ fontWeight: 800, fontSize: 15 }}>Emergency QR</span>
        </div>
        <Link to="/login" style={{
          padding: '8px 14px', fontWeight: 600, fontSize: 13.5,
          textDecoration: 'none', color: 'var(--ink)'
        }}>Log in</Link>
      </header>

      <main style={{ flex: 1, padding: '36px 20px 48px' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <div className="eyebrow" style={{ marginBottom: 14, color: 'var(--red)', textAlign: 'center' }}>
            IN CASE OF ACCIDENT
          </div>
          <h1 style={{
            fontSize: 'clamp(28px, 8vw, 38px)', fontWeight: 900, lineHeight: 1.12,
            letterSpacing: '-0.02em', margin: '0 0 14px', textAlign: 'center'
          }}>
            One scan. Your people know in seconds.
          </h1>
          <p style={{
            fontSize: 15, color: 'var(--ink-soft)', lineHeight: 1.6,
            textAlign: 'center', margin: '0 0 28px'
          }}>
            Add your emergency contacts, get a QR code, stick it on your bike, bag, or ID.
            Anyone who finds you can alert your contacts instantly — no app, no login, just one tap.
          </p>

          <Link to="/signup" style={{
            display: 'block', textAlign: 'center', padding: '16px', fontWeight: 700, fontSize: 16,
            textDecoration: 'none', color: 'white', background: 'var(--red)', borderRadius: 12,
            marginBottom: 36
          }}>
            Create your QR code →
          </Link>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { n: '01', t: 'Add your details', d: 'Name, blood group, and up to 3 emergency contacts.' },
              { n: '02', t: 'Get your QR', d: 'Print it, stick it on anything you carry.' },
              { n: '03', t: 'Scanned = alerted', d: 'Finder taps one button — contacts get SMS, WhatsApp, and a loud siren alert instantly.' },
            ].map(s => (
              <div key={s.n} style={{
                display: 'flex', gap: 14, padding: 16, background: 'white',
                borderRadius: 12, border: '1px solid var(--line)', alignItems: 'flex-start'
              }}>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--red)',
                  fontWeight: 700, flexShrink: 0, marginTop: 2
                }}>{s.n}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 4 }}>{s.t}</div>
                  <div style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.5 }}>{s.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
