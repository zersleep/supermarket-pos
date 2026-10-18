import React, { useState, useEffect } from 'react';
import { Clock, DollarSign, ArrowDownRight, ArrowUpRight, CheckCircle2, Lock } from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner, Alert, StatCard } from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';

export default function CashierShifts() {
  const { user, activeShift, setActiveShift, hasRole } = useAuth();

  const [shiftHistory, setShiftHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals
  const [openModalVisible, setOpenModalVisible] = useState(false);
  const [openingCashInput, setOpeningCashInput] = useState('50.00');

  const [closeModalVisible, setCloseModalVisible] = useState(false);
  const [actualCashInput, setActualCashInput] = useState('');
  const [closingNotes, setClosingNotes] = useState('');

  const [movementModalVisible, setMovementModalVisible] = useState(false);
  const [movementType, setMovementType] = useState('CASH_IN');
  const [movementAmount, setMovementAmount] = useState('');
  const [movementReason, setMovementReason] = useState('');

  const [actionLoading, setActionLoading] = useState(false);

  const loadShiftData = async () => {
    try {
      setLoading(true);
      setError('');
      const [currentRes, histRes] = await Promise.all([
        api.get('/shifts/current'),
        api.get('/shifts/history?limit=30')
      ]);
      setActiveShift(currentRes.data || null);
      setShiftHistory(histRes.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load shift records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShiftData();
  }, []);

  const handleOpenShift = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await api.post('/shifts/open', {
        openingCash: Number(openingCashInput)
      });
      setActiveShift(res.data);
      setSuccess('Cashier shift opened successfully. POS is ready for sales.');
      setOpenModalVisible(false);
      loadShiftData();
    } catch (err) {
      alert(err.message || 'Failed to open shift.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCashMovement = async (e) => {
    e.preventDefault();
    if (!movementReason.trim() || Number(movementAmount) <= 0) {
      alert('Please enter a valid amount and audit reason.');
      return;
    }

    setActionLoading(true);
    try {
      await api.post('/shifts/cash-movement', {
        shiftId: activeShift.id,
        type: movementType,
        amount: Number(movementAmount),
        reason: movementReason
      });
      setSuccess('Cash movement recorded.');
      setMovementModalVisible(false);
      setMovementAmount('');
      setMovementReason('');
      loadShiftData();
    } catch (err) {
      alert(err.message || 'Cash movement failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseShift = async (e) => {
    e.preventDefault();
    if (actualCashInput === '') {
      alert('Please enter actual counted cash in drawer.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.post(`/shifts/${activeShift.id}/close`, {
        actualClosingCash: Number(actualCashInput),
        notes: closingNotes
      });
      setActiveShift(null);
      setSuccess(
        `Shift closed. Difference: $${Number(res.data.difference).toFixed(2)} (${
          Number(res.data.difference) === 0 ? 'Balanced' : Number(res.data.difference) > 0 ? 'Surplus' : 'Shortage'
        })`
      );
      setCloseModalVisible(false);
      loadShiftData();
    } catch (err) {
      alert(err.message || 'Failed to close shift.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Cashier Shift & Register Management</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            Cash drawer tracking, opening floats, cash-in/out, and end-of-day reconciliation
          </p>
        </div>
        {!activeShift ? (
          <button onClick={() => setOpenModalVisible(true)} className="btn btn-primary">
            <Clock size={16} /> Open New Shift
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setMovementModalVisible(true)} className="btn btn-outline">
              <DollarSign size={16} /> Cash In / Cash Out
            </button>
            <button onClick={() => setCloseModalVisible(true)} className="btn btn-danger">
              <Lock size={16} /> Close Shift & Reconcile
            </button>
          </div>
        )}
      </div>

      <Alert type="danger" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      {/* Active Shift Summary Panel */}
      {activeShift ? (
        <div className="card" style={{ marginBottom: '24px', borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <span className="badge badge-success">ACTIVE SHIFT OPEN</span>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '4px' }}>
                Cashier: {user.fullName} (Opened: {new Date(activeShift.openedAt).toLocaleTimeString()})
              </div>
            </div>
          </div>

          <div className="grid-4">
            <StatCard
              title="Opening Cash"
              value={`$${Number(activeShift.openingCash).toFixed(2)}`}
              subtitle="Starting cash drawer float"
              icon={DollarSign}
              color="#3b82f6"
            />
            <StatCard
              title="Cash Sales"
              value={`$${Number(activeShift.cashSalesTotal).toFixed(2)}`}
              subtitle="Received from completed sales"
              icon={ArrowDownRight}
              color="#10b981"
            />
            <StatCard
              title="Cash Movements"
              value={`+$${Number(activeShift.cashInTotal).toFixed(2)} / -$${Number(activeShift.cashOutTotal).toFixed(2)}`}
              subtitle="Float additions & petty cash drops"
              icon={ArrowUpRight}
              color="#f59e0b"
            />
            <StatCard
              title="Expected in Drawer"
              value={`$${Number(activeShift.expectedClosingCash).toFixed(2)}`}
              subtitle="System expected closing cash"
              icon={CheckCircle2}
              color="#0f172a"
            />
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: '30px', textAlign: 'center', marginBottom: '24px', backgroundColor: '#fffbeb' }}>
          <Clock size={40} color="#d97706" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ color: '#92400e', fontWeight: 600 }}>No Active Cashier Shift</h3>
          <p style={{ color: '#b45309', fontSize: '0.875rem', marginTop: '4px', marginBottom: '16px' }}>
            Open a shift and record your starting float before completing sales at the register.
          </p>
          <button onClick={() => setOpenModalVisible(true)} className="btn btn-primary">
            Open Shift Now
          </button>
        </div>
      )}

      {/* Shift History Table */}
      <div className="card">
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>Shift History & Reconciliations</h3>
        {loading ? (
          <LoadingSpinner text="Loading shifts history..." />
        ) : shiftHistory.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
            No closed shifts in record.
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Cashier</th>
                  <th>Opened At</th>
                  <th>Closed At</th>
                  <th>Opening Float</th>
                  <th>Cash Sales</th>
                  <th>Expected Cash</th>
                  <th>Actual Cash</th>
                  <th>Difference</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {shiftHistory.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.cashier?.fullName || 'Cashier'}</td>
                    <td>{new Date(s.openedAt).toLocaleString()}</td>
                    <td>{s.closedAt ? new Date(s.closedAt).toLocaleString() : '—'}</td>
                    <td className="mono">${Number(s.openingCash).toFixed(2)}</td>
                    <td className="mono">${Number(s.cashSalesTotal).toFixed(2)}</td>
                    <td className="mono">${Number(s.expectedClosingCash).toFixed(2)}</td>
                    <td className="mono">
                      {s.actualClosingCash !== null ? `$${Number(s.actualClosingCash).toFixed(2)}` : '—'}
                    </td>
                    <td
                      className="mono"
                      style={{
                        fontWeight: 600,
                        color:
                          s.difference === null
                            ? 'inherit'
                            : Number(s.difference) === 0
                            ? '#10b981'
                            : Number(s.difference) > 0
                            ? '#2563eb'
                            : '#ef4444'
                      }}
                    >
                      {s.difference !== null
                        ? `${Number(s.difference) >= 0 ? '+' : ''}$${Number(s.difference).toFixed(2)}`
                        : '—'}
                    </td>
                    <td>
                      <span className={`badge ${s.status === 'OPEN' ? 'badge-success' : 'badge-neutral'}`}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Open Shift Modal */}
      <Modal
        isOpen={openModalVisible}
        onClose={() => setOpenModalVisible(false)}
        title="Open Cashier Shift"
        maxWidth="420px"
      >
        <form onSubmit={handleOpenShift}>
          <div className="form-group">
            <label className="form-label">Starting Cash Float in Drawer ($) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              className="form-input mono"
              style={{ fontSize: '1.2rem', fontWeight: 600 }}
              value={openingCashInput}
              onChange={(e) => setOpeningCashInput(e.target.value)}
            />
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Count coins and notes in the cash drawer before starting sales.
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" className="btn btn-outline" onClick={() => setOpenModalVisible(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={actionLoading}>
              {actionLoading ? 'Opening...' : 'Confirm & Open Shift'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Cash Movement Modal */}
      <Modal
        isOpen={movementModalVisible}
        onClose={() => setMovementModalVisible(false)}
        title="Record Cash Movement"
        maxWidth="450px"
      >
        <form onSubmit={handleCashMovement}>
          <div className="form-group">
            <label className="form-label">Movement Type *</label>
            <select
              className="form-select"
              value={movementType}
              onChange={(e) => setMovementType(e.target.value)}
            >
              <option value="CASH_IN">Cash In (Add float to drawer)</option>
              <option value="CASH_OUT">Cash Out (Petty cash drop / payout)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Amount ($) *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              className="form-input mono"
              placeholder="0.00"
              value={movementAmount}
              onChange={(e) => setMovementAmount(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Audit Reason *</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. Added change, mid-day vault drop..."
              value={movementReason}
              onChange={(e) => setMovementReason(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" className="btn btn-outline" onClick={() => setMovementModalVisible(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={actionLoading}>
              {actionLoading ? 'Recording...' : 'Record Cash Movement'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Close Shift Modal */}
      <Modal
        isOpen={closeModalVisible}
        onClose={() => setCloseModalVisible(false)}
        title="Close Shift & Cash Reconciliation"
        maxWidth="480px"
      >
        <form onSubmit={handleCloseShift}>
          <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>Expected Cash in Drawer:</span>
              <span className="mono" style={{ fontWeight: 700 }}>
                ${Number(activeShift?.expectedClosingCash).toFixed(2)}
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Includes opening float (${Number(activeShift?.openingCash).toFixed(2)}) + cash sales ($
              {Number(activeShift?.cashSalesTotal).toFixed(2)}) ± cash movements.
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Actual Counted Cash in Drawer ($) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              className="form-input mono"
              style={{ fontSize: '1.2rem', fontWeight: 700 }}
              placeholder="0.00"
              value={actualCashInput}
              onChange={(e) => setActualCashInput(e.target.value)}
            />
          </div>

          {actualCashInput !== '' && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                marginBottom: '16px',
                backgroundColor:
                  Number(actualCashInput) === Number(activeShift?.expectedClosingCash)
                    ? '#ecfdf5'
                    : Number(actualCashInput) > Number(activeShift?.expectedClosingCash)
                    ? '#eff6ff'
                    : '#fef2f2',
                color:
                  Number(actualCashInput) === Number(activeShift?.expectedClosingCash)
                    ? '#065f46'
                    : Number(actualCashInput) > Number(activeShift?.expectedClosingCash)
                    ? '#1e40af'
                    : '#991b1b',
                fontWeight: 600,
                fontSize: '0.9rem'
              }}
            >
              Difference:{' '}
              {Number(actualCashInput) - Number(activeShift?.expectedClosingCash) >= 0 ? '+' : ''}$
              {(Number(actualCashInput) - Number(activeShift?.expectedClosingCash)).toFixed(2)} (
              {Number(actualCashInput) === Number(activeShift?.expectedClosingCash)
                ? 'Balanced'
                : Number(actualCashInput) > Number(activeShift?.expectedClosingCash)
                ? 'Surplus'
                : 'Shortage'}
              )
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Closing Notes (Optional)</label>
            <textarea
              rows="2"
              className="form-textarea"
              placeholder="Explanation for any discrepancy or handover notes..."
              value={closingNotes}
              onChange={(e) => setClosingNotes(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn-outline" onClick={() => setCloseModalVisible(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-danger" disabled={actionLoading}>
              {actionLoading ? 'Closing...' : 'Close Shift & Finalize'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
