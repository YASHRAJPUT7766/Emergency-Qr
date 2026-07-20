import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { QRCodeCanvas } from 'qrcode.react';
import { auth, db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';

const EMERGENCY_BASE_URL = window.location.origin; // change if hosted elsewhere

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState({ name: '', bloodGroup: '', note: '', contacts: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const snap = await getDoc(doc(db, 'profiles', user.uid));
      if (snap.exists()) {
        const data = snap.data();
        setProfile({
          name: data.name || '',
          bloodGroup: data.bloodGroup || '',
          note: data.note || '',
          contacts: data.contacts?.length ? data.contacts : [{ name: '', phone: '' }],
        });
      } else {
        setProfile(p => ({ ...p, contacts: [{ name: '', phone: '' }] }));
      }
      setLoading(false);
    })();
  }, [user]);

  function updateContact(i, field, value) {
    const contacts = [...profile.contacts];
    contacts[i] = { ...contacts[i], [field]: value };
    setProfile({ ...profile, contacts });
  }

  function addContact() {
    if (profile.contacts.length >= 3) return;
    setProfile({ ...profile, contacts: [...profile.contacts, { name: '', phone: '' }] });
  }

  function removeContact(i) {
    setProfile({ ...profile, contacts: profile.contacts.filter((_, idx) => idx !== i) });
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    const cleanContacts = profile.contacts
      .filter(c => c.name.trim() && c.phone.trim())
      .map(c => ({ name: c.name.trim(), phone: normalizePhone(c.phone.trim()) }));
    await setDoc(doc(db, 'profiles', user.uid), {
      ...profile,
      contacts: cleanContacts,
      email: user.email,
    }, { merge: true });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const emergencyUrl = `${EMERGENCY_BASE_URL}/e/${user?.uid}`;
  const readyForQR = profile.name.trim() && profile.contacts.some(c => c.name && c.phone);

  if (loading) return null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      <TopBar onLogout={() => { signOut(auth); navigate('/'); }} />

      <div style={{
        maxWidth: 920, margin: '0 auto', padding: '40px 24px',
        display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 28
      }}>
        <div>
          <SectionCard title="Your details" subtitle="Ye info emergency page pe finder ko dikhegi.">
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Row label="Full name">
                <input value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })}
                  placeholder="Yash Sharma" required style={inputStyle} />
              </Row>
              <Row label="Blood group">
                <select value={profile.bloodGroup} onChange={e => setProfile({ ...profile, bloodGroup: e.target.value })} style={inputStyle}>
                  <option value="">Select</option>
                  {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                </select>
              </Row>
              <Row label="Medical note (optional)">
                <input value={profile.note} onChange={e => setProfile({ ...profile, note: e.target.value })}
                  placeholder="e.g. Diabetic, allergic to penicillin" style={inputStyle} />
              </Row>

              <div style={{ marginTop: 6, borderTop: '1px solid var(--line)', paddingTop: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontWeight: 700, fontSize: 14.5 }}>Emergency contacts</span>
                  <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{profile.contacts.length}/3</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {profile.contacts.map((c, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8 }}>
                      <input value={c.name} onChange={e => updateContact(i, 'name', e.target.value)}
                        placeholder="Contact name" style={{ ...inputStyle, flex: 1 }} />
                      <input value={c.phone} onChange={e => updateContact(i, 'phone', e.target.value)}
                        placeholder="+91 98765 43210" style={{ ...inputStyle, flex: 1 }} />
                      {profile.contacts.length > 1 && (
                        <button type="button" onClick={() => removeContact(i)} style={removeBtnStyle}>✕</button>
                      )}
                    </div>
                  ))}
                </div>
                {profile.contacts.length < 3 && (
                  <button type="button" onClick={addContact} style={addBtnStyle}>+ Add another contact</button>
                )}
              </div>

              <button type="submit" disabled={saving} style={saveBtnStyle}>
                {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save details'}
              </button>
            </form>
          </SectionCard>
        </div>

        <div>
          <SectionCard title="Your QR code" subtitle="Print karke bike, bag, ya ID pe laga do.">
            {readyForQR ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  background: 'white', padding: 20, borderRadius: 12, border: '1px solid var(--line)',
                  display: 'inline-block'
                }}>
                  <QRCodeCanvas value={emergencyUrl} size={180} fgColor="#1A2332" level="H" />
                </div>
                <div style={{
                  marginTop: 14, fontFamily: 'var(--font-mono)', fontSize: 11.5,
                  color: 'var(--ink-soft)', wordBreak: 'break-all', padding: '0 8px'
                }}>{emergencyUrl}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'center' }}>
                  <button onClick={() => downloadQR(emergencyUrl)} style={ghostBtnStyle}>Download PNG</button>
                  <a href={emergencyUrl} target="_blank" rel="noreferrer" style={{ ...ghostBtnStyle, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>Preview page</a>
                </div>
              </div>
            ) : (
              <div style={{ padding: '30px 10px', textAlign: 'center', color: 'var(--ink-soft)', fontSize: 13.5 }}>
                Apna naam aur kam se kam ek emergency contact save karo, QR yaha automatically ban jayega.
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function TopBar({ onLogout }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '18px 24px', borderBottom: '1px solid var(--line)', background: 'white'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8, background: 'var(--red)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontWeight: 900, fontSize: 14
        }}>+</div>
        <span style={{ fontWeight: 800, fontSize: 15 }}>Emergency QR</span>
      </div>
      <button onClick={onLogout} style={{ background: 'none', border: 'none', fontSize: 14, fontWeight: 600, color: 'var(--ink-soft)' }}>
        Log out
      </button>
    </div>
  );
}

function SectionCard({ title, subtitle, children }) {
  return (
    <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 16, padding: 24 }}>
      <h2 style={{ fontSize: 17, fontWeight: 800, margin: '0 0 4px' }}>{title}</h2>
      <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', margin: '0 0 20px' }}>{subtitle}</p>
      {children}
    </div>
  );
}

function Row({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)' }}>{label}</span>
      {children}
    </label>
  );
}

function normalizePhone(phone) {
  // Keep it simple: strip spaces/dashes, keep leading +
  return phone.replace(/[\s-()]/g, '');
}

function downloadQR(url) {
  const canvas = document.querySelector('canvas');
  const link = document.createElement('a');
  link.download = 'emergency-qr.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

const inputStyle = {
  padding: '11px 13px', borderRadius: 8, border: '1.5px solid var(--line)',
  background: '#FBFBFA', fontSize: 14.5, color: 'var(--ink)',
};
const removeBtnStyle = {
  border: '1.5px solid var(--line)', background: 'white', borderRadius: 8,
  width: 40, color: 'var(--red)', fontSize: 14,
};
const addBtnStyle = {
  marginTop: 10, background: 'none', border: 'none', color: 'var(--red)',
  fontWeight: 600, fontSize: 13.5, padding: 0,
};
const saveBtnStyle = {
  marginTop: 8, padding: '13px', borderRadius: 9, border: 'none',
  background: 'var(--ink)', color: 'white', fontWeight: 700, fontSize: 15,
};
const ghostBtnStyle = {
  padding: '9px 14px', borderRadius: 8, border: '1.5px solid var(--line)',
  background: 'white', color: 'var(--ink)', fontWeight: 600, fontSize: 13,
};
