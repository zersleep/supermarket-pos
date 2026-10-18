import React from 'react';
import { AlertCircle, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export function LoadingSpinner({ text = 'Loading...' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0' }}>
      <div
        style={{
          width: '42px',
          height: '42px',
          border: '3px solid #e2e8f0',
          borderTopColor: '#2563eb',
          borderRadius: '50%',
          animation: 'modernSpin 0.75s cubic-bezier(0.68, -0.55, 0.27, 1.55) infinite'
        }}
      />
      {text && (
        <span style={{ marginTop: '16px', fontSize: '0.875rem', fontWeight: 500, color: '#64748b' }}>
          {text}
        </span>
      )}
      <style>{`
        @keyframes modernSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export function Alert({ type = 'info', message, onClose }) {
  if (!message) return null;

  const config = {
    info: {
      bg: '#eff6ff',
      border: '#bfdbfe',
      text: '#1e40af',
      icon: Info
    },
    success: {
      bg: '#ecfdf5',
      border: '#a7f3d0',
      text: '#065f46',
      icon: CheckCircle2
    },
    warning: {
      bg: '#fffbeb',
      border: '#fde68a',
      text: '#92400e',
      icon: AlertTriangle
    },
    danger: {
      bg: '#fef2f2',
      border: '#fecaca',
      text: '#991b1b',
      icon: AlertCircle
    }
  }[type] || {
    bg: '#f1f5f9',
    border: '#cbd5e1',
    text: '#334155',
    icon: Info
  };

  const IconComponent = config.icon;

  return (
    <div
      style={{
        backgroundColor: config.bg,
        border: `1px solid ${config.border}`,
        color: config.text,
        padding: '12px 18px',
        borderRadius: '12px',
        marginBottom: '18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.875rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <IconComponent size={18} style={{ flexShrink: 0 }} />
        <span>{message}</span>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'inherit',
            opacity: 0.7,
            display: 'flex',
            alignItems: 'center',
            padding: '2px'
          }}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

export function StatCard({ title, value, subtitle, icon: Icon, color = '#2563eb' }) {
  return (
    <div
      className="card"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '18px',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Decorative top accent line */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: color
        }}
      />

      {Icon && (
        <div
          style={{
            width: '54px',
            height: '54px',
            borderRadius: '14px',
            backgroundColor: `${color}18`,
            color: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            border: `1px solid ${color}30`
          }}
        >
          <Icon size={26} />
        </div>
      )}
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: '0.75rem',
            color: '#64748b',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}
        >
          {title}
        </div>
        <div
          className="mono"
          style={{
            fontSize: '1.75rem',
            fontWeight: 700,
            margin: '2px 0',
            color: '#0f172a',
            letterSpacing: '-0.02em'
          }}
        >
          {value}
        </div>
        {subtitle && (
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}
