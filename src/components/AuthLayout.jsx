import { Link } from 'react-router-dom';

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px 16px', background: 'var(--paper)', boxSizing: 'border-box'
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 28, justifyContent: 'center' }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8, background: 'var(--red)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 900, fontSize: 14, flexShrink: 0
          }}>+</div>
          <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--ink)' }}>Emergency QR</span>
        </Link>
        <div style={{
          background: 'white', border: '1px solid var(--line)', borderRadius: 16,
          padding: '26px 22px', boxSizing: 'border-box'
        }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 6px' }}>{title}</h1>
          <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', margin: '0 0 22px', lineHeight: 1.5 }}>{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
