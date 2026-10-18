import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, ShoppingBag, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Alert } from '../components/common/LoadingSpinner';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
        backgroundColor: '#0f172a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '36px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              background: 'linear-gradient(135deg, #3b82f6, #10b981)',
              borderRadius: '14px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              marginBottom: '12px'
            }}
          >
            <ShoppingBag size={28} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>Metro Supermarket</h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '4px' }}>
            Point of Sale & Inventory Management
          </p>
        </div>

        {!systemInitialized && (
          <div
            style={{
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              padding: '12px 14px',
              borderRadius: '8px',
              marginBottom: '20px',
              display: 'flex',
              gap: '10px',
              alignItems: 'center'
            }}
          >
            <ShieldCheck size={20} color="#2563eb" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '0.85rem', color: '#1e40af' }}>
              First time setup detected.{' '}
              <Link to="/setup" style={{ fontWeight: 600, color: '#2563eb', textDecoration: 'underline' }}>
                Initialize Owner Account
              </Link>
            </div>
          </div>
        )}

        <Alert type="danger" message={error} onClose={() => setError('')} />

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              required
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. owner or cashier1"
              autoFocus
            />
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label">Password</label>
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
            style={{ width: '100%', padding: '12px', fontSize: '0.95rem' }}
            disabled={loading}
          >
            {loading ? 'Signing in...' : (
              <>
                <LogIn size={18} /> Sign In
              </>
            )}
          </button>
        </form>

        {/* School Demo Quick Selector */}
        <div
          style={{
            marginTop: '24px',
            padding: '14px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px'
          }}
        >
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#64748b',
              marginBottom: '8px',
              textAlign: 'center'
            }}
          >
            Demo Accounts (1-Click Fill)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
            <button
              type="button"
              className="btn btn-outline"
              style={{ fontSize: '0.75rem', padding: '6px 4px', justifyContent: 'center' }}
              onClick={() => {
                setUsername('owner');
                setPassword('password123');
              }}
            >
              👑 Owner
            </button>
            <button
              type="button"
              className="btn btn-outline"
              style={{ fontSize: '0.75rem', padding: '6px 4px', justifyContent: 'center' }}
              onClick={() => {
                setUsername('cashier');
                setPassword('password123');
              }}
            >
              🛒 Cashier
            </button>
            <button
              type="button"
              className="btn btn-outline"
              style={{ fontSize: '0.75rem', padding: '6px 4px', justifyContent: 'center' }}
              onClick={() => {
                setUsername('inventory');
                setPassword('password123');
              }}
            >
              📦 Inventory
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.775rem', color: '#94a3b8' }}>
          Protected by role-based access control & token authentication.
        </div>
      </div>
    </div>
  );
}
