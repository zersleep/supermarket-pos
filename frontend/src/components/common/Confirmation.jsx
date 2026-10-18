import React from 'react';
import Modal from './Modal';
import { AlertTriangle } from 'lucide-react';

export default function Confirmation({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDanger = false,
  loading = false
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="420px">
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', margin: '8px 0 24px 0' }}>
        <div
          style={{
            color: isDanger ? '#ef4444' : '#f59e0b',
            background: isDanger ? '#fee2e2' : '#fef3c7',
            padding: '10px',
            borderRadius: '50%',
            display: 'flex'
          }}
        >
          <AlertTriangle size={24} />
        </div>
        <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.5 }}>{message}</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        <button className="btn btn-outline" onClick={onClose} disabled={loading}>
          {cancelText}
        </button>
        <button
          className={`btn ${isDanger ? 'btn-danger' : 'btn-primary'}`}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? 'Processing...' : confirmText}
        </button>
      </div>
    </Modal>
  );
}
