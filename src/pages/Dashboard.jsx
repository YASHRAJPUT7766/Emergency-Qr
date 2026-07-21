import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { QRCodeCanvas } from 'qrcode.react';
import { auth, db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';

const BASE_URL = window.location.origin;

const emptyProfile = {
  name: '', bloodGroup: '', note: '',
  allergies: '', conditions: '', medications: '',
  contacts: [], contactTokens: [], scanCount: 0, responses: [],
};

const TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'contacts', label: 'Contacts' },
  { id: 'qr', label: 'QR Code' },
  { id: 'activity', label: 'Activity' },
];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('profile');
  const [linkPromptFor, setLinkPromptFor] = useState(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const snap = await getDoc(doc(db, 'profiles', user.uid));
      if (snap.exists()) {
        const data = snap.data();
        setProfile({
          ...emptyProfile,
          ...data,
          contacts: data.contacts?.length ? data.contacts : [],
        });
      }
      setLoading(false);
    })();
  }, [user]);

  async function saveProfile(patch) {
    const next = { ...profile, ...patch };
    setProfile(next);
    await setDoc(doc(db, 'profiles', user.uid), { ...patch, email: user.email }, { merge: true });
    return next;
  }

  const emergencyUrl = `${BASE_URL}/e/${user?.uid}`;
  const readyForQR = profile.name.trim() && profile.contacts.some(c => c.name && c.phone);
  const responses = [...(profile.responses || [])].sort((a, b) => new Date(b.respondedAt) - new Date(a.respondedAt));

  if (loading) return <FullscreenLoader />;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)', width: '100%', boxSizing: 'border-box' }}>
      <TopBar onLogout={() => { signOut(auth); navigate('/'); }} />

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 16px', boxSizing: 'border-box' }}>
        <TabBar tab={tab} setTab={setTab} />
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '18px 16px 60px', boxSizing: 'border-box' }}>
        {tab === 'profile' && <ProfileTab profile={profile} onSave={saveProfile} />}
        {tab === 'contacts' && (
          <ContactsTab profile={profile} onSave={saveProfile} userId={user.uid} onSendSetupLink={setLinkPromptFor} />
        )}
        {tab === 'qr' && <QrTab emergencyUrl={emergencyUrl} readyForQR={readyForQR} />}
        {tab === 'activity' && <ActivityTab profile={profile} responses={responses} />}
      </div>

      {linkPromptFor && (
        <SetupLinkSheet
          contact={linkPromptFor}
          userId={user.uid}
          ownerName={profile.name}
          onClose={() => setLinkPromptFor(null)}
        />
      )}
    </div>
  );
}

function FullscreenLoader() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-soft)' }}>
      Loading…
    </div>
  );
}

/* ---------------- Profile Tab ---------------- */

function ProfileTab({ profile, onSave }) {
  const [form, setForm] = useState(profile);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => setForm(profile), [profile]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    await onSave({
      name: form.name,
      bloodGroup: form.bloodGroup,
      note: form.note,
      allergies: form.allergies,
      conditions: form.conditions,
      medications: form.medications,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <SectionCard title="Your details" subtitle="Shown to whoever scans your QR code.">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Row label="Full name">
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="Your name" required style={inputStyle} />
        </Row>
        <Row label="Blood group">
          <select value={form.bloodGroup} onChange={e => setForm({ ...form, bloodGroup: e.target.value })} style={inputStyle}>
            <option value="">Select</option>
            {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
          </select>
        </Row>
        <Row label="Medical note (optional)">
          <input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })}
            placeholder="e.g. Diabetic, allergic to penicillin" style={inputStyle} />
        </Row>
        <Row label="Allergies (optional)">
          <input value={form.allergies} onChange={e => setForm({ ...form, allergies: e.target.value })}
            placeholder="e.g. Peanuts, Penicillin" style={inputStyle} />
        </Row>
        <Row label="Existing conditions (optional)">
          <input value={form.conditions} onChange={e => setForm({ ...form, conditions: e.target.value })}
            placeholder="e.g. Asthma, Diabetes, Epilepsy" style={inputStyle} />
        </Row>
        <Row label="Current medications (optional)">
          <input value={form.medications} onChange={e => setForm({ ...form, medications: e.target.value })}
            placeholder="e.g. Insulin, Blood thinners" style={inputStyle} />
        </Row>
        <button type="submit" disabled={saving} style={saveBtnStyle}>
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save details'}
        </button>
      </form>
    </SectionCard>
  );
}

/* ---------------- Contacts Tab ---------------- */

function ContactsTab({ profile, onSave, userId, onSendSetupLink }) {
  const [contacts, setContacts] = useState(profile.contacts.length ? profile.contacts : [{ name: '', phone: '' }]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setContacts(profile.contacts.length ? profile.contacts : [{ name: '', phone: '' }]);
  }, [profile.contacts]);

  function updateContact(i, field, value) {
    const next = [...contacts];
    next[i] = { ...next[i], [field]: value };
    setContacts(next);
  }

  function addContact() {
    if (contacts.length >= 3) return;
    setContacts([...contacts, { name: '', phone: '' }]);
  }

  function removeContact(i) {
    setContacts(contacts.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    const cleanContacts = contacts
      .filter(c => c.name.trim() && c.phone.trim())
      .map(c => ({ name: c.name.trim(), phone: normalizePhone(c.phone.trim()) }));

    const previousPhones = new Set((profile.contacts || []).map(c => c.phone));
    const newlyAdded = cleanContacts.filter(c => !previousPhones.has(c.phone));

    await onSave({ contacts: cleanContacts });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);

    if (newlyAdded.length) {
      onSendSetupLink(newlyAdded[0]);
    }
  }

  const tokenCount = (profile.contactTokens || []).length;

  return (
    <SectionCard title="Emergency contacts" subtitle="Up to 3 people. Each needs to enable alerts once on their own phone.">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {contacts.map((c, i) => (
          <div key={i} style={{
            display: 'flex', flexDirection: 'column', gap: 8,
            padding: 12, background: '#FBFBFA', border: '1px solid var(--line)', borderRadius: 10
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)' }}>Contact {i + 1}</span>
              {contacts.length > 1 && (
                <button type="button" onClick={() => removeContact(i)} style={removeBtnStyle}>Remove</button>
              )}
            </div>
            <input value={c.name} onChange={e => updateContact(i, 'name', e.target.value)}
              placeholder="Contact name" style={inputStyle} />
            <input value={c.phone} onChange={e => updateContact(i, 'phone', e.target.value)}
              placeholder="+91 98765 43210" inputMode="tel" style={inputStyle} />
          </div>
        ))}
        {contacts.length < 3 && (
          <button type="button" onClick={addContact} style={addBtnStyle}>+ Add another contact</button>
        )}
        <button type="submit" disabled={saving} style={saveBtnStyle}>
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save contacts'}
        </button>
      </form>

      {profile.contacts.length > 0 && (
        <div style={{ marginTop: 20, borderTop: '1px solid var(--line)', paddingTop: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Siren alert setup</div>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 12 }}>
            {tokenCount === 0 && 'No one has enabled alerts yet.'}
            {tokenCount > 0 && tokenCount < profile.contacts.length && `${tokenCount} of ${profile.contacts.length} contacts have enabled alerts.`}
            {tokenCount >= profile.contacts.length && 'All contacts have enabled alerts. ✓'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {profile.contacts.map((c, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
                padding: '10px 12px', background: '#FBFBFA', border: '1px solid var(--line)', borderRadius: 9
              }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-soft)' }}>{c.phone}</div>
                </div>
                <button type="button" onClick={() => onSendSetupLink(c)} style={ghostBtnStyle}>
                  Send link
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

function SetupLinkSheet({ contact, userId, ownerName, onClose }) {
  const setupUrl = `${BASE_URL}/subscribe/${userId}?name=${encodeURIComponent(contact.name)}`;
  const message = `Hi ${contact.name}, ${ownerName || 'I'} added you as an emergency contact on Emergency QR. Please tap this link once to enable emergency alerts on your phone: ${setupUrl}`;

  function openWhatsApp() {
    const phone = contact.phone.replace(/[^\d+]/g, '').replace(/^\+/, '');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    onClose();
  }

  function openSms() {
    const phone = contact.phone.replace(/[^\d+]/g, '');
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const sep = isIOS ? '&' : '?';
    window.open(`sms:${phone}${sep}body=${encodeURIComponent(message)}`, '_blank');
    onClose();
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 480, background: 'white', borderRadius: '18px 18px 0 0',
        padding: '20px 20px 28px', boxSizing: 'border-box'
      }}>
        <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 15, marginBottom: 2 }}>
          Send setup link to {contact.name}
        </div>
        <div style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 18 }}>
          {contact.phone}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={openWhatsApp} style={{ padding: '15px', borderRadius: 12, border: 'none', background: '#25D366', color: 'white', fontWeight: 700, fontSize: 15 }}>
            Send via WhatsApp
          </button>
          <button onClick={openSms} style={{ padding: '15px', borderRadius: 12, border: 'none', background: 'var(--ink)', color: 'white', fontWeight: 700, fontSize: 15 }}>
            Send via SMS
          </button>
          <button onClick={onClose} style={{ padding: '13px', borderRadius: 12, border: '1px solid var(--line)', background: 'transparent', color: 'var(--ink-soft)', fontWeight: 600, fontSize: 14 }}>
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- QR Tab ---------------- */

function QrTab({ emergencyUrl, readyForQR }) {
  return (
    <SectionCard title="Your QR code" subtitle="Print it and stick it on your bike, bag, or ID.">
      {readyForQR ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{ background: 'white', padding: 16, borderRadius: 12, border: '1px solid var(--line)', display: 'inline-block' }}>
            <QRCodeCanvas value={emergencyUrl} size={180} fgColor="#1A2332" level="H" />
          </div>
          <div style={{ marginTop: 14, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-soft)', wordBreak: 'break-all', padding: '0 4px' }}>
            {emergencyUrl}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
            <button onClick={() => downloadQR()} style={{ ...ghostBtnStyle, width: '100%', padding: '12px', fontSize: 13.5 }}>Download PNG</button>
            <a href={emergencyUrl} target="_blank" rel="noreferrer" style={{ ...ghostBtnStyle, width: '100%', padding: '12px', fontSize: 13.5, textDecoration: 'none', textAlign: 'center', boxSizing: 'border-box' }}>Preview page</a>
          </div>
        </div>
      ) : (
        <div style={{ padding: '30px 10px', textAlign: 'center', color: 'var(--ink-soft)', fontSize: 13.5 }}>
          Fill in your name (Profile tab) and at least one emergency contact (Contacts tab) —
          your QR code will appear here automatically.
        </div>
      )}
    </SectionCard>
  );
}

/* ---------------- Activity Tab ---------------- */

function ActivityTab({ profile, responses }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionCard title="Scan activity" subtitle="How many times your emergency page has been opened.">
        <div style={{ textAlign: 'center', padding: '6px 0' }}>
          <div style={{ fontSize: 34, fontWeight: 900 }}>{profile.scanCount || 0}</div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
            total scans{profile.lastScanAt ? ` · last on ${new Date(profile.lastScanAt).toLocaleString()}` : ''}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Contact responses" subtitle="When a contact taps “I'm on it” after an alert, it shows up here.">
        {responses.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--ink-soft)', fontSize: 13, padding: '6px 0' }}>
            No responses yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {responses.map((r, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', fontSize: 13,
                padding: '9px 12px', background: 'var(--green-tint, #E6F6EC)', borderRadius: 8, gap: 8
              }}>
                <span style={{ fontWeight: 600 }}>✓ {r.contact} is on it</span>
                <span style={{ color: 'var(--ink-soft)', flexShrink: 0 }}>{new Date(r.respondedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

/* ---------------- Shared bits ---------------- */

function TopBar({ onLogout }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '14px 16px', borderBottom: '1px solid var(--line)', background: 'white',
      boxSizing: 'border-box'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 7, background: 'var(--red)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontWeight: 900, fontSize: 13, flexShrink: 0
        }}>+</div>
        <span style={{ fontWeight: 800, fontSize: 14.5 }}>Emergency QR</span>
      </div>
      <button onClick={onLogout} style={{ background: 'none', border: 'none', fontSize: 13.5, fontWeight: 600, color: 'var(--ink-soft)', padding: 4 }}>
        Log out
      </button>
    </div>
  );
}

function TabBar({ tab, setTab }) {
  return (
    <div style={{ display: 'flex', gap: 2, marginTop: 14, borderBottom: '1px solid var(--line)', overflowX: 'auto' }}>
      {TABS.map(t => (
        <button
          key={t.id}
          onClick={() => setTab(t.id)}
          style={{
            padding: '9px 12px', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 700, flexShrink: 0,
            color: tab === t.id ? 'var(--ink)' : 'var(--ink-soft)',
            borderBottom: tab === t.id ? '2px solid var(--red)' : '2px solid transparent',
            marginBottom: -1,
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function SectionCard({ title, subtitle, children }) {
  return (
    <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 14, padding: '18px 16px', boxSizing: 'border-box' }}>
      <h2 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 4px' }}>{title}</h2>
      <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', margin: '0 0 16px', lineHeight: 1.4 }}>{subtitle}</p>
      {children}
    </div>
  );
}

function Row({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-soft)' }}>{label}</span>
      {children}
    </label>
  );
}

function normalizePhone(phone) {
  return phone.replace(/[\s-()]/g, '');
}

function downloadQR() {
  const canvas = document.querySelector('canvas');
  if (!canvas) return;
  const link = document.createElement('a');
  link.download = 'emergency-qr.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  padding: '11px 12px', borderRadius: 8, border: '1.5px solid var(--line)',
  background: 'white', fontSize: 14.5, color: 'var(--ink)',
};
const removeBtnStyle = {
  border: 'none', background: 'none', color: 'var(--red)', fontSize: 12, fontWeight: 600, padding: 2,
};
const addBtnStyle = {
  background: 'none', border: 'none', color: 'var(--red)',
  fontWeight: 600, fontSize: 13.5, padding: 0, textAlign: 'left',
};
const saveBtnStyle = {
  width: '100%', boxSizing: 'border-box',
  padding: '13px', borderRadius: 9, border: 'none',
  background: 'var(--ink)', color: 'white', fontWeight: 700, fontSize: 15,
};
const ghostBtnStyle = {
  padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--line)',
  background: 'white', color: 'var(--ink)', fontWeight: 600, fontSize: 12.5,
  whiteSpace: 'nowrap', flexShrink: 0, boxSizing: 'border-box',
};
