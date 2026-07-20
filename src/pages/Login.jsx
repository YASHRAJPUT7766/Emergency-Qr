import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import AuthLayout from '../components/AuthLayout';
import { inputStyle, submitStyle, errorStyle } from './Signup';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/dashboard');
    } catch {
      setError('Email ya password galat hai.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Apne emergency profile me login karo.">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)' }}>Email</span>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)' }}>Password</span>
          <input type="password" required value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />
        </label>
        {error && <div style={errorStyle}>{error}</div>}
        <button disabled={loading} type="submit" style={submitStyle}>
          {loading ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      <p style={{ marginTop: 18, fontSize: 14, color: 'var(--ink-soft)', textAlign: 'center' }}>
        No account yet? <Link to="/signup" style={{ color: 'var(--red)', fontWeight: 600 }}>Sign up</Link>
      </p>
    </AuthLayout>
  );
}
