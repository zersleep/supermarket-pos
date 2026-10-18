import React, { useState, useEffect } from 'react';
import { QrCode, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import api from '../../api/client';
import { LoadingSpinner, Alert } from '../../components/common/LoadingSpinner';
import Confirmation from '../../components/common/Confirmation';

export default function PendingPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Confirmation modals
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  const fetchPendingPayments = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/payments/pending');
      setPayments(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load pending payments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingPayments();
  }, []);

  const handleConfirm = async () => {
    if (!selectedPayment) return;
    setActionLoading(true);
    try {
      await api.post(`/payments/${selectedPayment.id}/confirm`);
      setSuccess(`Payment for receipt ${selectedPayment.sale.receiptNumber} successfully verified and confirmed!`);
      setConfirmModalOpen(false);
      fetchPendingPayments();
    } catch (err) {
      setError(err.message || 'Failed to confirm payment.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!selectedPayment) return;
    setActionLoading(true);
    try {
      await api.post(`/payments/${selectedPayment.id}/cancel`, {
        reason: 'Customer cancelled or transaction expired'
      });
      setSuccess(`Pending payment cancelled and reserved stock restored.`);
      setCancelModalOpen(false);
      fetchPendingPayments();
    } catch (err) {
      setError(err.message || 'Failed to cancel payment.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Pending Scan QR Payments</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            Verify customer merchant app payments and manually confirm orders
          </p>
        </div>
        <button onClick={fetchPendingPayments} className="btn btn-outline btn-sm">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <Alert type="danger" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      <div className="card">
        {loading ? (
          <LoadingSpinner text="Checking for pending payments..." />
        ) : payments.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
            <CheckCircle2 size={48} color="#10b981" style={{ margin: '0 auto 12px auto' }} />
            <h3 style={{ color: '#0f172a', fontWeight: 600 }}>All Caught Up!</h3>
            <p style={{ fontSize: '0.875rem', marginTop: '4px' }}>
              No Scan QR transactions are currently awaiting confirmation.
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Receipt #</th>
                  <th>Time Created</th>
                  <th>Cashier</th>
                  <th>Reference</th>
                  <th>Amount (USD)</th>
                  <th>Items</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }} className="mono">
                      {p.sale.receiptNumber}
                    </td>
                    <td>{new Date(p.createdAt).toLocaleTimeString()}</td>
                    <td>{p.sale.cashier?.fullName || 'N/A'}</td>
                    <td className="mono" style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      {p.transactionRef}
                    </td>
                    <td style={{ fontWeight: 700, color: '#2563eb' }} className="mono">
                      ${Number(p.amount).toFixed(2)}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#475569' }}>
                      {p.sale.items.map((i) => `${Number(i.quantity)}x ${i.productNameSnapshot}`).join(', ')}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => {
                            setSelectedPayment(p);
                            setConfirmModalOpen(true);
                          }}
                        >
                          <CheckCircle2 size={14} /> Confirm
                        </button>
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ color: '#ef4444' }}
                          onClick={() => {
                            setSelectedPayment(p);
                            setCancelModalOpen(true);
                          }}
                        >
                          <XCircle size={14} /> Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <Confirmation
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={handleConfirm}
        title="Confirm Payment Receipt"
        message={`Have you verified the incoming payment of $${Number(selectedPayment?.amount).toFixed(2)} in your bank/e-wallet app for receipt ${selectedPayment?.sale?.receiptNumber}?`}
        confirmText="Confirm Payment"
        loading={actionLoading}
      />

      {/* Cancellation Modal */}
      <Confirmation
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={handleCancel}
        title="Cancel Pending Payment"
        message={`Are you sure you want to cancel this pending payment? The reserved inventory stock will be immediately returned to sellable stock.`}
        confirmText="Cancel Payment & Release Stock"
        isDanger={true}
        loading={actionLoading}
      />
    </div>
  );
}
