import React from 'react';
import { LogOut, User as UserIcon, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function TopBar() {
  const { user, activeShift, logout } = useAuth();
  const navigate = useNavigate();

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
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Supermarket Point of Sale</h2>
        {activeShift ? (
          <span
            className="badge badge-success"
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            onClick={() => navigate('/shifts')}
            title="Active cashier shift open"
          >
            <Clock size={12} /> Shift Open (${Number(activeShift.openingCash).toFixed(2)})
          </span>
        ) : (
          <span
            className="badge badge-warning"
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            onClick={() => navigate('/shifts')}
            title="No active shift open"
          >
            <Clock size={12} /> No Open Shift
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#475569'
            }}
          >
            <UserIcon size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{user?.fullName || user?.username}</div>
            <span className={`badge ${getRoleBadgeClass(user?.role)}`}>
              {user?.role?.replace('_', ' ')}
            </span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="btn btn-outline btn-sm"
          style={{ color: '#ef4444', borderColor: '#fecaca' }}
          title="Sign out of POS"
        >
          <LogOut size={14} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
}
