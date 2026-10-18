import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  LogIn,
  ShoppingBag,
  ShieldCheck,
  Zap,
  Boxes,
  QrCode,
  DollarSign,
  User,
  Lock,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Alert } from '../components/common/LoadingSpinner';

export default function Login() {
  const [username, setUsername] = useState('cashier');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedDemo, setSelectedDemo] = useState('cashier');

  const { login, systemInitialized } = useAuth();
  const navigate = useNavigate();

  const handleSelectDemo = (role, userVal, passVal) => {
    setSelectedDemo(role);
    setUsername(userVal);
    setPassword(passVal);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#090d16',
        backgroundImage: `
          radial-gradient(circle at 15% 20%, rgba(37, 99, 235, 0.18) 0%, transparent 40%),
          radial-gradient(circle at 85% 80%, rgba(16, 185, 129, 0.15) 0%, transparent 40%)
        `,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '920px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          backgroundColor: '#0f172a',
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden'
        }}
      >
        {/* Left Side: System Highlights & Features */}
        <div
          style={{
            padding: '44px',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            borderRight: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #10b981 100%)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)'
                }}
              >
                <ShoppingBag size={22} />
              </div>
              <div>
                <h1 style={{ fontSize: '1.25rem', color: '#ffffff', letterSpacing: '-0.02em' }}>
                  Metro POS
                </h1>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Enterprise Supermarket System
                </span>
              </div>
            </div>

            <h2
              style={{
                fontSize: '1.5rem',
                color: '#f8fafc',
                lineHeight: 1.3,
                marginBottom: '16px'
              }}
            >
              Practical, secure retail checkout & smart stock control.
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: '28px' }}>
              Built with React 18, Node.js REST API, Prisma ORM, and Neon PostgreSQL database.
            </p>

            {/* Feature Highlights */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(59, 130, 246, 0.15)',
                    color: '#60a5fa',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <DollarSign size={16} />
                </div>
                <span style={{ fontSize: '0.825rem', color: '#cbd5e1' }}>
                  Dual-Currency checkout in <strong>USD ($)</strong> and <strong>KHR (៛)</strong>
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    color: '#34d399',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Boxes size={16} />
                </div>
                <span style={{ fontSize: '0.825rem', color: '#cbd5e1' }}>
                  FEFO Batch Inventory tracking to prevent shelf expiry
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    color: '#fbbf24',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <QrCode size={16} />
                </div>
                <span style={{ fontSize: '0.825rem', color: '#cbd5e1' }}>
                  Cambodian KHQR digital payment simulation
                </span>
              </div>
            </div>
          </div>

          <div style={{ fontSize: '0.725rem', color: '#64748b', marginTop: '30px' }}>
            © 2026 Metro Supermarket Systems • School Project Edition
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div
          style={{
            padding: '44px',
            backgroundColor: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}
        >
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a' }}>
              Welcome Back
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>
              Sign in to access your register or management tools
            </p>
          </div>

          {!systemInitialized && (
            <div
              style={{
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                padding: '12px 14px',
                borderRadius: '10px',
                marginBottom: '20px',
                display: 'flex',
                gap: '10px',
                alignItems: 'center'
              }}
            >
              <ShieldCheck size={20} color="#2563eb" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '0.85rem', color: '#1e40af' }}>
                First-time setup detected.{' '}
                <Link to="/setup" style={{ fontWeight: 600, color: '#2563eb', textDecoration: 'underline' }}>
                  Initialize Owner Account
                </Link>
              </div>
            </div>
          )}

          <Alert type="danger" message={error} onClose={() => setError('')} />

          {/* School Demo 1-Click Role Switcher */}
          <div
            style={{
              padding: '12px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              marginBottom: '22px'
            }}
          >
            <div
              style={{
                fontSize: '0.725rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: '#64748b',
                marginBottom: '8px'
              }}
            >
              School Demo Roles (1-Click Fill)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
              <button
                type="button"
                className={`btn btn-sm ${selectedDemo === 'owner' ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: '0.75rem', padding: '7px 4px' }}
                onClick={() => handleSelectDemo('owner', 'owner', 'password123')}
              >
                👑 Owner
              </button>
              <button
                type="button"
                className={`btn btn-sm ${selectedDemo === 'cashier' ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: '0.75rem', padding: '7px 4px' }}
                onClick={() => handleSelectDemo('cashier', 'cashier', 'password123')}
              >
                🛒 Cashier
              </button>
              <button
                type="button"
                className={`btn btn-sm ${selectedDemo === 'inventory' ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: '0.75rem', padding: '7px 4px' }}
                onClick={() => handleSelectDemo('inventory', 'inventory', 'password123')}
              >
                📦 Inventory
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={14} color="#64748b" /> Username
              </label>
              <input
                type="text"
                required
                className="form-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. owner or cashier"
              />
            </div>

            <div className="form-group" style={{ marginBottom: '26px' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={14} color="#64748b" /> Password
              </label>
              <input
                type="password"
                required
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '13px', fontSize: '0.95rem' }}
              disabled={loading}
            >
              {loading ? 'Authenticating...' : (
                <>
                  <LogIn size={18} /> Sign In to Terminal <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div
            style={{
              textAlign: 'center',
              marginTop: '20px',
              fontSize: '0.75rem',
              color: '#94a3b8'
            }}
          >
            Role-based token authentication with encrypted session state.
          </div>
        </div>
      </div>
    </div>
  );
}
