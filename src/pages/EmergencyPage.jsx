import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { subscribeContactDevice } from '../lib/notifications';

function cleanPhone(phone) {
  return (phone || '').replace(/[^\d+]/g, '');
}

function buildMessage(profile, mapsUrl, userId, contactName) {
  const base = `EMERGENCY ALERT: ${profile.name} may need urgent help. This number is saved as an emergency contact on their Emergency QR profile. Please try to reach them or send help immediately.`;
  const locationLine = mapsUrl ? `\nCurrent location: ${mapsUrl}` : '';
  const replyLine = `\nLet ${profile.name} know you're on it: ${window.location.origin}/api/mark-responded?userId=${userId}&contact=${encodeURIComponent(contactName)}`;
  return `${base}${locationLine}${replyLine}`;
}

// Try to get the finder's current location (best-effort, non-blocking).
function getLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(`https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`),
      () => resolve(null),
      { timeout: 5000 }
    );
  });
}

export default function EmergencyPage() {
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | notfound
  const [activeContact, setActiveContact] = useState(null);
  const [mapsUrl, setMapsUrl] = useState(null);
  const [sendingSiren, setSendingSiren] = useState(false);
  const [sirenResult, setSirenResult] = useState(null); // 'sent' | 'none' | 'error'
  const [subscribeState, setSubscribeState] = useState('idle'); // idle | working | done | error
  const [subscribeError, setSubscribeError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'profiles', userId));
        if (!snap.exists() || !snap.data().contacts?.length) {
          setStatus('notfound');
          return;
        }
        setProfile(snap.data());
        setStatus('ready');

        // Log the scan (best-effort, never blocks the page)
        fetch('/api/log-scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        }).catch(() => {});
      } catch {
        setStatus('notfound');
      }
    })();

    getLocation().then(setMapsUrl);
  }, [userId]);

  async function handleAlertClick(contact) {
    setActiveContact(contact);
    setSirenResult(null);
    // Fire the siren push notification immediately in the background,
    // while the finder picks WhatsApp/SMS in the sheet below.
    setSendingSiren(true);
    try {
      const res = await fetch('/api/send-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          finderMessage: `${profile.name} may need urgent help.`,
          mapsUrl,
        }),
      });
      const data = await res.json();
      setSirenResult(data.sent > 0 ? 'sent' : 'none');
    } catch {
      setSirenResult('error');
    } finally {
      setSendingSiren(false);
    }
  }

  function openWhatsApp(contact) {
    const phone = cleanPhone(contact.phone).replace(/^\+/, '');
    const text = encodeURIComponent(buildMessage(profile, mapsUrl, userId, contact.name));
    window.location.href = `https://wa.me/${phone}?text=${text}`;
    setActiveContact(null);
  }

  function openSms(contact) {
    const phone = cleanPhone(contact.phone);
    const text = encodeURIComponent(buildMessage(profile, mapsUrl, userId, contact.name));
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const sep = isIOS ? '&' : '?';
    window.location.href = `sms:${phone}${sep}body=${text}`;
    setActiveContact(null);
  }

  function callContact(contact) {
    window.location.href = `tel:${cleanPhone(contact.phone)}`;
  }

  async function handleSubscribe() {
    setSubscribeState('working');
    setSubscribeError('');
    try {
      await subscribeContactDevice(userId);
      setSubscribeState('done');
    } catch (err) {
      setSubscribeError(err.message || 'Could not enable alerts on this device.');
      setSubscribeState('error');
    }
  }

  if (status === 'loading') {
    return <CenteredMessage>Loading…</CenteredMessage>;
  }

  if (status === 'notfound') {
    return (
      <CenteredMessage>
        This emergency profile could not be found or is incomplete.
      </CenteredMessage>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        background: 'var(--red)', color: 'white', textAlign: 'center',
        padding: '10px 16px', fontWeight: 700, fontSize: 13, letterSpacing: '0.02em'
      }}>
        EMERGENCY CONTACT CARD
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <div style={{
          width: '100%', maxWidth: 420, background: 'white', borderRadius: 18,
          overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.35)'
        }}>
          <div style={{ padding: '28px 24px 20px', textAlign: 'center', borderBottom: '1px solid var(--line)' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', background: 'var(--red-tint)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 14px', fontSize: 26, fontWeight: 900, color: 'var(--red)'
            }}>
              {profile.bloodGroup || '?'}
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px' }}>{profile.name}</h1>
            {profile.note && (
              <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', margin: '0 0 6px' }}>{profile.note}</p>
            )}
            {(profile.allergies || profile.conditions || profile.medications) && (
              <div style={{ marginTop: 10, textAlign: 'left', background: '#FBFBFA', border: '1px solid var(--line)', borderRadius: 10, padding: '10px 12px' }}>
                {profile.allergies && <MedicalRow label="Allergies" value={profile.allergies} />}
                {profile.conditions && <MedicalRow label="Conditions" value={profile.conditions} />}
                {profile.medications && <MedicalRow label="Medications" value={profile.medications} />}
              </div>
            )}
          </div>

          <div style={{ padding: '18px 24px' }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Emergency contacts</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 6 }}>
              {profile.contacts.map((c, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
                  padding: '10px 12px', background: '#FBFBFA', borderRadius: 9, border: '1px solid var(--line)'
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--ink-soft)' }}>{c.phone}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => callContact(c)}
                      title="Call"
                      style={{
                        width: 38, height: 38, borderRadius: 9, border: '1.5px solid var(--line)',
                        background: 'white', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                    >
                      📞
                    </button>
                    <button
                      onClick={() => handleAlertClick(c)}
                      style={{
                        padding: '9px 14px', borderRadius: 9, border: 'none',
                        background: 'var(--red)', color: 'white', fontWeight: 700, fontSize: 13
                      }}
                    >
                      🚨 Alert
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 11.5, color: 'var(--ink-soft)', textAlign: 'center', marginTop: 14, lineHeight: 1.5 }}>
              Tap Alert, then choose WhatsApp or SMS — a pre-filled emergency message
              (with your current location, if shared) will open in that contact's number. Just hit Send.
              {mapsUrl ? '' : ' Location access was not available.'}
            </p>

            <div style={{ marginTop: 16, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
              <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: '0 0 10px', lineHeight: 1.5 }}>
                <strong>Are you one of {profile.name}'s emergency contacts?</strong> Enable this once on your
                own phone so it rings with a loud siren whenever an alert is sent to you — even if this
                page or app is closed.
              </p>
              {subscribeState === 'done' ? (
                <div style={{
                  textAlign: 'center', padding: '10px', borderRadius: 8, fontSize: 13,
                  background: 'var(--green-tint, #E6F6EC)', color: 'var(--green, #1E8E4A)', fontWeight: 600
                }}>
                  ✓ Siren alerts enabled on this device
                </div>
              ) : (
                <button
                  onClick={handleSubscribe}
                  disabled={subscribeState === 'working'}
                  style={{
                    width: '100%', padding: '12px', borderRadius: 9, border: '1.5px solid var(--line)',
                    background: 'white', color: 'var(--ink)', fontWeight: 700, fontSize: 13.5
                  }}
                >
                  {subscribeState === 'working' ? 'Enabling…' : '🔔 Enable siren alerts on this phone'}
                </button>
              )}
              {subscribeState === 'error' && (
                <p style={{ fontSize: 11.5, color: 'var(--red)', textAlign: 'center', marginTop: 8 }}>
                  {subscribeError}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', padding: '16px', color: 'rgba(255,255,255,0.4)', fontSize: 11.5 }}>
        Powered by Emergency QR
      </div>

      {activeContact && (
        <div
          onClick={() => setActiveContact(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 420, background: 'white',
              borderRadius: '18px 18px 0 0', padding: '20px 20px 28px'
            }}
          >
            <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 15, marginBottom: 2 }}>
              Alert {activeContact.name}
            </div>
            <div style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 10 }}>
              {activeContact.phone}
            </div>

            <div style={{
              textAlign: 'center', fontSize: 12, marginBottom: 16, padding: '6px 10px',
              borderRadius: 8, background: sirenResult === 'sent' ? 'var(--green-tint, #E6F6EC)' : '#F3F3F1',
              color: sirenResult === 'sent' ? 'var(--green, #1E8E4A)' : 'var(--ink-soft)'
            }}>
              {sendingSiren && '🔔 Sending siren push notification…'}
              {!sendingSiren && sirenResult === 'sent' && '✓ Siren alert sent to their phone'}
              {!sendingSiren && sirenResult === 'none' && 'ℹ️ This contact has not enabled push alerts yet — WhatsApp/SMS will still reach them'}
              {!sendingSiren && sirenResult === 'error' && '⚠️ Could not send push alert — WhatsApp/SMS will still reach them'}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={() => openWhatsApp(activeContact)}
                style={{
                  padding: '15px', borderRadius: 12, border: 'none',
                  background: '#25D366', color: 'white', fontWeight: 700, fontSize: 15
                }}
              >
                Send via WhatsApp
              </button>
              <button
                onClick={() => openSms(activeContact)}
                style={{
                  padding: '15px', borderRadius: 12, border: 'none',
                  background: 'var(--ink)', color: 'white', fontWeight: 700, fontSize: 15
                }}
              >
                Send via SMS
              </button>
              <button
                onClick={() => callContact(activeContact)}
                style={{
                  padding: '15px', borderRadius: 12, border: '1.5px solid var(--line)',
                  background: 'white', color: 'var(--ink)', fontWeight: 700, fontSize: 15
                }}
              >
                📞 Call instead
              </button>
              <button
                onClick={() => setActiveContact(null)}
                style={{
                  padding: '13px', borderRadius: 12, border: '1px solid var(--line)',
                  background: 'transparent', color: 'var(--ink-soft)', fontWeight: 600, fontSize: 14
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MedicalRow({ label, value }) {
  return (
    <div style={{ fontSize: 12.5, marginBottom: 4, display: 'flex', gap: 6 }}>
      <span style={{ fontWeight: 700, color: 'var(--ink)', flexShrink: 0 }}>{label}:</span>
      <span style={{ color: 'var(--ink-soft)' }}>{value}</span>
    </div>
  );
}

function CenteredMessage({ children }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--ink-soft)', fontSize: 15, padding: 24, textAlign: 'center'
    }}>
      {children}
    </div>
  );
}
