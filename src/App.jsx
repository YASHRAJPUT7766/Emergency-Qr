import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import Signup from './pages/Signup';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EmergencyPage from './pages/EmergencyPage';
import SubscribePage from './pages/SubscribePage';
import Landing from './pages/Landing';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullscreenLoader />;
  return user ? children : <Navigate to="/login" replace />;
}

// If already logged in, never show Landing/Login/Signup again — go straight to Dashboard.
function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullscreenLoader />;
  return user ? <Navigate to="/dashboard" replace /> : children;
}

function FullscreenLoader() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', color: '#4A5568', fontFamily: 'Inter, sans-serif'
    }}>
      Loading…
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PublicOnlyRoute><Landing /></PublicOnlyRoute>} />
          <Route path="/signup" element={<PublicOnlyRoute><Signup /></PublicOnlyRoute>} />
          <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          {/* Public route — this is what the QR code points to. No login required. */}
          <Route path="/e/:userId" element={<EmergencyPage />} />
          {/* Public route — sent to each contact so they can enable siren alerts on their own phone. */}
          <Route path="/subscribe/:userId" element={<SubscribePage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
