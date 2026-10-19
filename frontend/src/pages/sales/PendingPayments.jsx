import React, { useState, useEffect } from 'react';
import { QrCode, CheckCircle2, XCircle, RefreshCw, Eye, Clock, Check } from 'lucide-react';
import api from '../../api/client';
import { LoadingSpinner, Alert } from '../../components/common/LoadingSpinner';
import Confirmation from '../../components/common/Confirmation';
import Modal from '../../components/common/Modal';
import { playCashChime, playScannerBeep } from '../../utils/productImages';

export default function PendingPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Auto-refresh state
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [countdown, setCountdown] = useState(5);

  // Modals
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  const khrExchangeRate = 4100;

  const fetchPendingPayments = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      setError('');
      const res = await api.get('/payments/pending');
      const newPayments = res.data || [];
      setPayments(newPayments);
    } catch (err) {
      if (!isBackground) setError(err.message || 'Failed to load pending payments.');
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingPayments();
  }, []);

  // Auto-refresh timer every 5 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchPendingPayments(true);
          return 5;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRefresh]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 3500);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const handleConfirm = async () => {
    if (!selectedPayment) return;
    setActionLoading(true);
    try {
      await api.post(`/payments/${selectedPayment.id}/confirm`);
      playCashChime();
      setSuccess(`Payment for receipt ${selectedPayment.sale.receiptNumber} verified and confirmed!`);
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
            Pending Scan QR Payments
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '2px' }}>
            Live verification for incoming Bakong / KHQR mobile banking customer payments
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Auto-Refresh Toggle */}
          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="btn btn-outline btn-sm"
            style={{
              borderColor: autoRefresh ? '#a7f3d0' : '#cbd5e1',
              backgroundColor: autoRefresh ? '#ecfdf5' : '#ffffff',
              color: autoRefresh ? '#065f46' : '#64748b',
              fontSize: '0.775rem'
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: autoRefresh ? '#10b981' : '#94a3b8',
                display: 'inline-block'
              }}
            />
            {autoRefresh ? `Auto-Refresh (${countdown}s)` : 'Auto-Refresh: Off'}
          </button>

          <button onClick={() => fetchPendingPayments(false)} className="btn btn-outline btn-sm">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <Alert type="danger" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      <div className="card" style={{ padding: '20px' }}>
        {loading ? (
          <LoadingSpinner text="Checking for pending payments..." />
        ) : payments.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
            <CheckCircle2 size={48} color="#10b981" style={{ margin: '0 auto 12px auto' }} />
            <h3 style={{ color: '#0f172a', fontWeight: 700 }}>All Caught Up!</h3>
            <p style={{ fontSize: '0.875rem', marginTop: '4px' }}>
              No KHQR transactions are currently awaiting confirmation.
            </p>
            {autoRefresh && (
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '10px' }}>
                Auto-checking every 5 seconds for new scans...
              </div>
            )}
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
                  <th>Amount (USD & KHR)</th>
                  <th>Items Summary</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const amtUSD = Number(p.amount);
                  const amtKHR = Math.round(amtUSD * khrExchangeRate);

                  return (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 700, color: '#0f172a' }} className="mono">
                        {p.sale.receiptNumber}
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>{new Date(p.createdAt).toLocaleTimeString()}</td>
                      <td style={{ fontSize: '0.8rem' }}>{p.sale.cashier?.fullName || 'Cashier'}</td>
                      <td className="mono" style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        {p.transactionRef}
                      </td>
                      <td className="mono">
                        <div style={{ fontWeight: 800, color: '#2563eb', fontSize: '0.95rem' }}>
                          ${amtUSD.toFixed(2)}
                        </div>
                        <div style={{ fontSize: '0.725rem', color: '#e11d48', fontWeight: 700 }}>
                          {amtKHR.toLocaleString()} ៛
                        </div>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: '#475569', maxWidth: '240px' }}>
                        <span style={{ display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '220px' }}>
                          {p.sale.items.map((i) => `${Number(i.quantity)}x ${i.productNameSnapshot}`).join(', ')}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                            onClick={() => {
                              setSelectedPayment(p);
                              setDetailsModalOpen(true);
                            }}
                          >
                            <Eye size={13} /> View Items
                          </button>
                          <button
                            className="btn btn-success btn-sm"
                            style={{ padding: '3px 10px', fontSize: '0.75rem', fontWeight: 700 }}
                            onClick={() => {
                              setSelectedPayment(p);
                              setConfirmModalOpen(true);
                            }}
                          >
                            <CheckCircle2 size={14} /> Confirm Payment
                          </button>
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ color: '#ef4444', borderColor: '#fecaca', padding: '3px 8px', fontSize: '0.75rem' }}
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: View Order Items */}
      <Modal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        title={`Pending Order Items: ${selectedPayment?.sale?.receiptNumber || ''}`}
        maxWidth="500px"
      >
        {selectedPayment && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#64748b', marginBottom: '8px' }}>
                ITEMS IN THIS ORDER ({selectedPayment.sale.items.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedPayment.sale.items.map((it, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '10px 12px',
                      backgroundColor: '#f8fafc',
                      borderRadius: '8px',
                      border: '1px solid #f1f5f9',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>
                        {it.productNameSnapshot}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Quantity: {Number(it.quantity)} x ${Number(it.unitPriceSnapshot).toFixed(2)}
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, color: '#2563eb' }} className="mono">
                      ${Number(it.lineTotal).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Total Amount:</span>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontWeight: 800, fontSize: '1.25rem', color: '#0f172a' }} className="mono">
                  ${Number(selectedPayment.amount).toFixed(2)}
                </span>
                <div style={{ fontSize: '0.8rem', color: '#e11d48', fontWeight: 700 }}>
                  {(Number(selectedPayment.amount) * khrExchangeRate).toLocaleString()} ៛ KHR
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button type="button" onClick={() => setDetailsModalOpen(false)} className="btn btn-outline">
                Close
              </button>
              <button
                type="button"
                className="btn btn-success"
                onClick={() => {
                  setDetailsModalOpen(false);
                  setConfirmModalOpen(true);
                }}
              >
                <CheckCircle2 size={16} /> Confirm Payment
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirmation Modal */}
      <Confirmation
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={handleConfirm}
        title="Confirm Customer Payment Receipt"
        message={`Have you verified the incoming payment of $${Number(selectedPayment?.amount).toFixed(2)} (≈ ${(Number(selectedPayment?.amount || 0) * khrExchangeRate).toLocaleString()} ៛) in your Bakong / bank app for receipt ${selectedPayment?.sale?.receiptNumber}?`}
        confirmText="Confirm Payment"
        loading={actionLoading}
      />

      {/* Cancellation Modal */}
      <Confirmation
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={handleCancel}
        title="Cancel Pending Payment"
        message={`Are you sure you want to cancel this pending payment? The reserved inventory stock will be immediately returned to available shelf stock.`}
        confirmText="Cancel Payment & Release Stock"
        isDanger={true}
        loading={actionLoading}
      />
    </div>
  );
}
