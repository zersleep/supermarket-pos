import React, { useState, useEffect } from 'react';
import { LogOut, User as UserIcon, Clock, Store, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function TopBar() {
  const { user, activeShift, logout } = useAuth();
  const navigate = useNavigate();

  // Live Digital Clock
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'OWNER':
        return 'badge-danger';
      case 'ADMIN':
        return 'badge-primary';
      case 'INVENTORY_MANAGER':
        return 'badge-warning';
      default:
        return 'badge-success';
    }
  };

  return (
    <header className="topbar">
      {/* Left: Store identity & Shift indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Store size={20} color="#2563eb" />
          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
            Metro Supermarket
          </span>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>• Register #01</span>
        </div>

        {activeShift ? (
          <div
            onClick={() => navigate('/shifts')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '9999px',
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#065f46'
            }}
            title="Active cashier shift is open. Click to manage."
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: '#10b981',
                boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.35)',
                display: 'inline-block'
              }}
            />
            Shift Open (${Number(activeShift.openingCash).toFixed(2)})
          </div>
        ) : (
          <div
            onClick={() => navigate('/shifts')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '9999px',
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#92400e'
            }}
            title="No shift currently open. Click to open."
          >
            <Clock size={12} />
            No Open Shift
          </div>
        )}
      </div>

      {/* Right: Live Clock, User Profile & Logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {/* Live Clock */}
        <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={15} color="#64748b" />
          <div>
            <div className="mono" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
              {time.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </div>

        <div style={{ width: '1px', height: '28px', backgroundColor: '#e2e8f0' }} />

        {/* User Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
              border: '1px solid #bfdbfe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563eb'
            }}
          >
            <UserIcon size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>
              {user?.fullName || user?.username}
            </div>
            <span className={`badge ${getRoleBadgeClass(user?.role)}`} style={{ fontSize: '0.65rem' }}>
              {user?.role?.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="btn btn-outline btn-sm"
          style={{ color: '#ef4444', borderColor: '#fecaca', gap: '6px' }}
          title="Sign out of system"
        >
          <LogOut size={14} />
          <span>Exit</span>
        </button>
      </div>
    </header>
  );
}
