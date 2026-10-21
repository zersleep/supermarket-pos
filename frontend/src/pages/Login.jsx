import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  LogIn,
  ShoppingCart,
  ShieldCheck,
  Boxes,
  QrCode,
  DollarSign,
  User,
  Lock,
  ArrowRight,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Alert } from '../components/common/LoadingSpinner';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, systemInitialized } = useAuth();
  const navigate = useNavigate();

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
        backgroundColor: '#f0f6fc',
        backgroundImage: `
          radial-gradient(circle at 10% 20%, rgba(37, 99, 235, 0.08) 0%, transparent 40%),
          radial-gradient(circle at 90% 80%, rgba(59, 130, 246, 0.08) 0%, transparent 40%)
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
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 25px 60px -15px rgba(37, 99, 235, 0.12)',
          overflow: 'hidden'
        }}
      >
        {/* Left Side: Modern Blue & White Feature Overview */}
        <div
          style={{
            padding: '44px',
            backgroundColor: '#f8fafc',
            borderRight: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  borderRadius: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)'
                }}
              >
                <ShoppingCart size={24} />
              </div>
              <div>
                <h1 style={{ fontSize: '1.35rem', color: '#0f172a', fontWeight: 800, letterSpacing: '-0.02em' }}>
                  Supermarket POS
                </h1>
                <span style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 600 }}>
                  Retail & Cloud Inventory
                </span>
              </div>
            </div>

            <h2
              style={{
                fontSize: '1.45rem',
                color: '#0f172a',
                lineHeight: 1.35,
                marginBottom: '14px',
                fontWeight: 700
              }}
            >
              Modern, fast retail checkout & batch inventory control.
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.6, marginBottom: '28px' }}>
              Built with React 18, Node.js REST API, Prisma ORM, and Neon PostgreSQL database.
            </p>

            {/* Feature Highlights */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '10px',
                    backgroundColor: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    color: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <DollarSign size={18} />
                </div>
                <span style={{ fontSize: '0.85rem', color: '#334155' }}>
                  Dual-Currency checkout in <strong>USD ($)</strong> and <strong>KHR (៛)</strong>
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '10px',
                    backgroundColor: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    color: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <Boxes size={18} />
                </div>
                <span style={{ fontSize: '0.85rem', color: '#334155' }}>
                  FEFO Batch Inventory tracking to prevent shelf expiry
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '10px',
                    backgroundColor: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    color: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <QrCode size={18} />
                </div>
                <span style={{ fontSize: '0.85rem', color: '#334155' }}>
                  Cambodian KHQR digital payment simulation
                </span>
              </div>
            </div>
          </div>

          <div style={{ fontSize: '0.725rem', color: '#94a3b8', marginTop: '30px' }}>
            © 2026 Supermarket POS Systems • Enterprise Edition
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

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={14} color="#2563eb" /> Username
              </label>
              <input
                type="text"
                required
                className="form-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username (e.g. cashier, owner)"
              />
            </div>

            <div className="form-group" style={{ marginBottom: '26px' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={14} color="#2563eb" /> Password
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="form-input"
                  style={{ paddingRight: '42px', width: '100%' }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#64748b',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '4px'
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '13px', fontSize: '0.95rem' }}
              disabled={loading}
            >
              {loading ? 'Authenticating...' : (
                <>
                  <LogIn size={18} /> Sign In <ArrowRight size={16} />
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
