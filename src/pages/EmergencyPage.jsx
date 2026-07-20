import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

// Digits + leading + only, jaisa wa.me aur sms: links expect karte hain
function cleanPhone(phone) {
  return (phone || '').replace(/[^\d+]/g, '');
}

function buildMessage(profile) {
  return `EMERGENCY ALERT: ${profile.name} ko accident hua hai aur unhe madad chahiye. Ye number unke Emergency QR profile se emergency contact ke roop me diya gaya hai. Kripya foran contact karein ya madad bhejein.`;
}

export default function EmergencyPage() {
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | notfound
  const [activeContact, setActiveContact] = useState(null); // contact whose choice-sheet is open

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
      } catch {
        setStatus('notfound');
      }
    })();
  }, [userId]);

  function openWhatsApp(contact) {
    const phone = cleanPhone(contact.phone).replace(/^\+/, '');
    const text = encodeURIComponent(buildMessage(profile));
    window.location.href = `https://wa.me/${phone}?text=${text}`;
    setActiveContact(null);
  }

  function openSms(contact) {
    const phone = cleanPhone(contact.phone);
    const text = encodeURIComponent(buildMessage(profile));
    // iOS aur Android alag separator use karte hain (& vs ?)
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const sep = isIOS ? '&' : '?';
    window.location.href = `sms:${phone}${sep}body=${text}`;
    setActiveContact(null);
  }

  if (status === 'loading') {
    return <CenteredMessage>Loading…</CenteredMessage>;
  }

  if (status === 'notfound') {
    return (
      <CenteredMessage>
        Ye emergency profile nahi mila ya incomplete hai.
      </CenteredMessage>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)', display: 'flex', flexDirection: 'column' }}>
      {/* Urgent header strip */}
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
          {/* ID card header */}
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
              <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', margin: 0 }}>{profile.note}</p>
            )}
          </div>

          {/* Contacts list */}
          <div style={{ padding: '18px 24px' }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Emergency contacts</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 6 }}>
              {profile.contacts.map((c, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
                  padding: '10px 12px', background: '#FBFBFA', borderRadius: 9, border: '1px solid var(--line)'
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--ink-soft)' }}>{c.phone}</div>
                  </div>
                  <button
                    onClick={() => setActiveContact(c)}
                    style={{
                      flexShrink: 0, padding: '9px 14px', borderRadius: 9, border: 'none',
                      background: 'var(--red)', color: 'white', fontWeight: 700, fontSize: 13
                    }}
                  >
                    🚨 Alert
                  </button>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 11.5, color: 'var(--ink-soft)', textAlign: 'center', marginTop: 14, lineHeight: 1.5 }}>
              Alert dabao, phir WhatsApp ya SMS chuno — us contact ke number pe
              pehle se likha hua emergency message khul jayega, bas Send dabana hai.
            </p>
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', padding: '16px', color: 'rgba(255,255,255,0.4)', fontSize: 11.5 }}>
        Powered by Emergency QR
      </div>

      {/* WhatsApp / SMS choice sheet */}
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
              {activeContact.name} ko alert bhejo
            </div>
            <div style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 18 }}>
              {activeContact.phone}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={() => openWhatsApp(activeContact)}
                style={{
                  padding: '15px', borderRadius: 12, border: 'none',
                  background: '#25D366', color: 'white', fontWeight: 700, fontSize: 15
                }}
              >
                WhatsApp se bhejo
              </button>
              <button
                onClick={() => openSms(activeContact)}
                style={{
                  padding: '15px', borderRadius: 12, border: 'none',
                  background: 'var(--ink)', color: 'white', fontWeight: 700, fontSize: 15
                }}
              >
                SMS se bhejo
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
