import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import AuthLayout from '../components/AuthLayout';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password kam se kam 6 characters ka hona chahiye.');
      return;
    }
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      // Create an empty profile doc for this user right away
      await setDoc(doc(db, 'profiles', cred.user.uid), {
        email,
        name: '',
        bloodGroup: '',
        note: '',
        contacts: [],
        createdAt: serverTimestamp(),
      });
      navigate('/dashboard');
    } catch (err) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Create your account" subtitle="Apna emergency profile banane ke liye signup karo.">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Email">
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com" style={inputStyle} />
        </Field>
        <Field label="Password">
          <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Kam se kam 6 characters" style={inputStyle} />
        </Field>
        {error && <div style={errorStyle}>{error}</div>}
        <button disabled={loading} type="submit" style={submitStyle}>
          {loading ? 'Creating…' : 'Create account'}
        </button>
      </form>
      <p style={{ marginTop: 18, fontSize: 14, color: 'var(--ink-soft)', textAlign: 'center' }}>
        Already have an account? <Link to="/login" style={{ color: 'var(--red)', fontWeight: 600 }}>Log in</Link>
      </p>
    </AuthLayout>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)' }}>{label}</span>
      {children}
    </label>
  );
}

function friendlyError(code) {
  const map = {
    'auth/email-already-in-use': 'Ye email pehle se registered hai. Login try karo.',
    'auth/invalid-email': 'Email address sahi format me nahi hai.',
    'auth/weak-password': 'Password bahut weak hai.',
  };
  return map[code] || 'Kuch galat ho gaya. Dobara try karo.';
}

export const inputStyle = {
  padding: '12px 14px', borderRadius: 9, border: '1.5px solid var(--line)',
  background: 'white', fontSize: 15, color: 'var(--ink)',
};

export const submitStyle = {
  marginTop: 6, padding: '13px', borderRadius: 9, border: 'none',
  background: 'var(--ink)', color: 'white', fontWeight: 700, fontSize: 15,
};

export const errorStyle = {
  background: 'var(--red-tint)', color: 'var(--red-dark)', padding: '10px 12px',
  borderRadius: 8, fontSize: 13.5, fontWeight: 500,
};
