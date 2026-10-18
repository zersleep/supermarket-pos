import React from 'react';

export function LoadingSpinner({ text = 'Loading...' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
      <div
        style={{
          width: '36px',
          height: '36px',
          border: '3px solid #e2e8f0',
          borderTopColor: '#2563eb',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }}
      />
      {text && <span style={{ marginTop: '12px', fontSize: '0.875rem', color: '#64748b' }}>{text}</span>}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export function Alert({ type = 'info', message, onClose }) {
  if (!message) return null;

  const styles = {
    info: { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af' },
    success: { bg: '#ecfdf5', border: '#a7f3d0', text: '#065f46' },
    warning: { bg: '#fffbeb', border: '#fde68a', text: '#92400e' },
    danger: { bg: '#fef2f2', border: '#fecaca', text: '#991b1b' }
  }[type] || { bg: '#f1f5f9', border: '#cbd5e1', text: '#334155' };

  return (
    <div
      style={{
        backgroundColor: styles.bg,
        border: `1px solid ${styles.border}`,
        color: styles.text,
        padding: '12px 16px',
        borderRadius: '8px',
        marginBottom: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.875rem'
      }}
    >
      <span>{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 'bold' }}
        >
          ✕
        </button>
      )}
    </div>
  );
}

export function StatCard({ title, value, subtitle, icon: Icon, color = '#2563eb' }) {
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      {Icon && (
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '10px',
            backgroundColor: `${color}15`,
            color: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <Icon size={24} />
        </div>
      )}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500, textTransform: 'uppercase' }}>
          {title}
        </div>
        <div style={{ fontSize: '1.5rem', fontWeight: 700, margin: '2px 0', color: '#0f172a' }}>
          {value}
        </div>
        {subtitle && <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{subtitle}</div>}
      </div>
    </div>
  );
}
