import React, { useState, useEffect } from 'react';
import { LogOut, User as UserIcon, Clock, Store, Globe, DollarSign } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { usePos } from '../../context/PosContext';
import { useNavigate } from 'react-router-dom';

export default function TopBar() {
  const { user, activeShift, logout } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const { primaryCurrency, togglePrimaryCurrency, exchangeRate } = usePos();
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
      case 'ADMIN':
        return 'badge-danger';
      case 'INVENTORY_MANAGER':
        return 'badge-warning';
      default:
        return 'badge-success';
    }
  };

  const getRoleDisplay = (role) => {
    if (role === 'OWNER' || role === 'ADMIN') return t('role.owner', 'Store Owner');
    if (role === 'INVENTORY_MANAGER') return t('role.inventory_manager', 'Inventory Manager');
    return t('role.cashier', 'Cashier');
  };

  return (
    <header className="topbar">
      {/* Left: Store identity & Shift indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Store size={20} color="#2563eb" />
          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
            {t('brand.title', 'Supermarket POS')}
          </span>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>• {t('topbar.register', 'Register #01')}</span>
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
            {t('topbar.shift_open', 'Shift Open')} ({primaryCurrency === 'KHR' ? `${Math.round(Number(activeShift.openingCash) * (exchangeRate || 4100)).toLocaleString()} ៛` : `$${Number(activeShift.openingCash).toFixed(2)}`})
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
            {t('topbar.no_shift', 'No Open Shift')}
          </div>
        )}
      </div>

      {/* Right: Currency Toggle, Language Switcher, Live Clock, User Profile & Logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Primary Currency Switcher Chip */}
        <button
          type="button"
          onClick={togglePrimaryCurrency}
          className="btn btn-sm"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            fontSize: '0.75rem',
            fontWeight: 700,
            borderRadius: '8px',
            backgroundColor: primaryCurrency === 'KHR' ? '#ecfdf5' : '#eff6ff',
            color: primaryCurrency === 'KHR' ? '#047857' : '#1d4ed8',
            border: primaryCurrency === 'KHR' ? '1px solid #a7f3d0' : '1px solid #bfdbfe',
            cursor: 'pointer'
          }}
          title="Click to toggle primary currency between USD ($) and Cambodian Riel (៛)"
        >
          <span style={{ fontSize: '0.85rem' }}>{primaryCurrency === 'KHR' ? '៛' : '$'}</span>
          <span>{primaryCurrency === 'KHR' ? 'KHR (៛)' : 'USD ($)'}</span>
        </button>

        {/* Language Switcher Toggle */}
        <button
          type="button"
          onClick={toggleLanguage}
          className="btn btn-sm"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            fontSize: '0.75rem',
            fontWeight: 700,
            borderRadius: '8px',
            backgroundColor: '#ffffff',
            color: '#334155',
            border: '1px solid #cbd5e1',
            cursor: 'pointer'
          }}
          title={language === 'en' ? 'ប្តូរទៅភាសាខ្មែរ (Switch to Khmer)' : 'Switch to English'}
        >
          <Globe size={13} color="#2563eb" />
          <span>{language === 'en' ? '🇰🇭 ភាសាខ្មែរ' : '🇺🇸 English'}</span>
        </button>

        <div style={{ width: '1px', height: '26px', backgroundColor: '#e2e8f0' }} />

        {/* Live Clock */}
        <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={15} color="#64748b" />
          <div>
            <div className="mono" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0f172a' }}>
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
              {time.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </div>

        <div style={{ width: '1px', height: '26px', backgroundColor: '#e2e8f0' }} />

        {/* User Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
              border: '1px solid #bfdbfe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563eb'
            }}
          >
            <UserIcon size={16} />
          </div>
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0f172a' }}>
              {user?.fullName || user?.username}
            </div>
            <span className={`badge ${getRoleBadgeClass(user?.role)}`} style={{ fontSize: '0.62rem' }}>
              {getRoleDisplay(user?.role)}
            </span>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="btn btn-outline btn-sm"
          style={{ color: '#ef4444', borderColor: '#fecaca', gap: '5px', padding: '4px 8px' }}
          title="Sign out of system"
        >
          <LogOut size={13} />
          <span style={{ fontSize: '0.75rem' }}>{t('nav.exit', 'Exit')}</span>
        </button>
      </div>
    </header>
  );
}
