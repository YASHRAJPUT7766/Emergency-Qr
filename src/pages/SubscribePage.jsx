import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { subscribeContactDevice } from '../lib/notifications';

export default function SubscribePage() {
  const { userId } = useParams();
  const [searchParams] = useSearchParams();
  const contactName = searchParams.get('name') || 'there';

  const [ownerName, setOwnerName] = useState('');
  const [status, setStatus] = useState('loading'); // loading | ready | notfound
  const [subState, setSubState] = useState('idle'); // idle | working | done | error
  const [subError, setSubError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'profiles', userId));
        if (!snap.exists()) {
          setStatus('notfound');
          return;
        }
        setOwnerName(snap.data().name || 'Someone');
        setStatus('ready');
      } catch {
        setStatus('notfound');
      }
    })();
  }, [userId]);

  async function handleEnable() {
    setSubState('working');
    setSubError('');
    try {
      await subscribeContactDevice(userId);
      setSubState('done');
    } catch (err) {
      setSubError(err.message || 'Could not enable alerts on this device.');
      setSubState('error');
    }
  }

  if (status === 'loading') {
    return <Centered>Loading…</Centered>;
  }
  if (status === 'notfound') {
    return <Centered>This link is invalid or has expired.</Centered>;
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--paper)', padding: 24
    }}>
      <div style={{
        width: '100%', maxWidth: 420, background: 'white', borderRadius: 18,
        border: '1px solid var(--line)', padding: '32px 26px', textAlign: 'center'
      }}>
        <div style={{
          width: 60, height: 60, borderRadius: '50%', background: 'var(--red-tint)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 18px', fontSize: 26
        }}>🔔</div>

        <h1 style={{ fontSize: 19, fontWeight: 800, margin: '0 0 8px' }}>
          Hi {contactName}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.6, margin: '0 0 24px' }}>
          <strong>{ownerName}</strong> has added you as an emergency contact on Emergency QR.
          Enable alerts on this phone so that if their QR code is ever scanned, your phone
          rings with a loud alert — even if this page is closed.
        </p>

        {subState === 'done' ? (
          <div style={{
            padding: '14px', borderRadius: 10, fontSize: 14, fontWeight: 700,
            background: 'var(--green-tint, #E6F6EC)', color: 'var(--green, #1E8E4A)'
          }}>
            ✓ Alerts enabled on this phone
          </div>
        ) : (
          <button
            onClick={handleEnable}
            disabled={subState === 'working'}
            style={{
              width: '100%', padding: '15px', borderRadius: 12, border: 'none',
              background: 'var(--red)', color: 'white', fontWeight: 700, fontSize: 15
            }}
          >
            {subState === 'working' ? 'Enabling…' : 'Enable emergency alerts'}
          </button>
        )}
        {subState === 'error' && (
          <p style={{ fontSize: 12.5, color: 'var(--red)', marginTop: 12 }}>{subError}</p>
        )}

        <p style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 20, lineHeight: 1.5 }}>
          This only sends you alerts related to {ownerName}'s safety. You can turn it off
          anytime from your browser's site settings.
        </p>
      </div>
    </div>
  );
}

function Centered({ children }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--ink-soft)', fontSize: 15, padding: 24, textAlign: 'center'
    }}>
      {children}
    </div>
  );
}
