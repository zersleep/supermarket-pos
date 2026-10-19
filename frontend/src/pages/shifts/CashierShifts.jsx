import React, { useState, useEffect } from 'react';
import {
  Clock,
  DollarSign,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Lock,
  Printer,
  Calculator,
  FileText,
  AlertCircle,
  Eye,
  RefreshCw,
  Search,
  X,
  RotateCcw,
  ShieldCheck,
  ArrowRight,
  ShoppingCart,
  Plus
} from 'lucide-react';
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

  // Shift History Filters
  const [shiftSearch, setShiftSearch] = useState('');
  const [shiftStatusFilter, setShiftStatusFilter] = useState('ALL');

  // Modals
  const [openModalVisible, setOpenModalVisible] = useState(false);
  const [openingCashInput, setOpeningCashInput] = useState('50.00');

  const [closeModalVisible, setCloseModalVisible] = useState(false);
  const [actualCashInput, setActualCashInput] = useState('');
  const [closingNotes, setClosingNotes] = useState('');

  // Bill Counter State for Close Shift & Open Shift
  const [showBillCounter, setShowBillCounter] = useState(false);
  const [bills, setBills] = useState({
    b100: '',
    b50: '',
    b20: '',
    b10: '',
    b5: '',
    b1: '',
    coins: ''
  });

  const [movementModalVisible, setMovementModalVisible] = useState(false);
  const [movementType, setMovementType] = useState('CASH_IN');
  const [movementAmount, setMovementAmount] = useState('');
  const [movementReason, setMovementReason] = useState('');

  // Printable Z-Report Modal
  const [selectedZReportShift, setSelectedZReportShift] = useState(null);
  const [zReportModalVisible, setZReportModalVisible] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);

  // Auto-dismiss success message
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 3500);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Auto-calculate counted total from bills
  const countedTotalFromBills = (
    (Number(bills.b100) || 0) * 100 +
    (Number(bills.b50) || 0) * 50 +
    (Number(bills.b20) || 0) * 20 +
    (Number(bills.b10) || 0) * 10 +
    (Number(bills.b5) || 0) * 5 +
    (Number(bills.b1) || 0) * 1 +
    (Number(bills.coins) || 0)
  );

  const applyBillCount = () => {
    setActualCashInput(countedTotalFromBills.toFixed(2));
    setShowBillCounter(false);
  };

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
      setSuccess('Cashier shift opened successfully. Register drawer is ready for sales.');
      setOpenModalVisible(false);
      loadShiftData();
    } catch (err) {
      setError(err.message || 'Failed to open shift.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCashMovement = async (e) => {
    e.preventDefault();
    if (!movementReason.trim() || Number(movementAmount) <= 0) {
      setError('Please enter a valid amount and audit reason.');
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
      setSuccess('Cash movement recorded successfully.');
      setMovementModalVisible(false);
      setMovementAmount('');
      setMovementReason('');
      loadShiftData();
    } catch (err) {
      setError(err.message || 'Cash movement failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseShift = async (e) => {
    e.preventDefault();
    if (actualCashInput === '') {
      setError('Please enter actual counted cash in drawer.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.post(`/shifts/${activeShift.id}/close`, {
        actualClosingCash: Number(actualCashInput),
        notes: closingNotes
      });
      const closed = res.data;
      setActiveShift(null);
      setSuccess(
        `Shift closed. Variance: $${Number(closed.difference).toFixed(2)} (${
          Number(closed.difference) === 0 ? 'Balanced' : Number(closed.difference) > 0 ? 'Surplus' : 'Shortage'
        })`
      );
      setCloseModalVisible(false);
      // Automatically open Z-Report preview
      setSelectedZReportShift(closed);
      setZReportModalVisible(true);
      loadShiftData();
    } catch (err) {
      setError(err.message || 'Failed to close shift.');
    } finally {
      setActionLoading(false);
    }
  };

  const openZReport = (shift) => {
    setSelectedZReportShift(shift);
    setZReportModalVisible(true);
  };

  const khrExchangeRate = 4100;

  // Filtered shift history
  const filteredShiftHistory = shiftHistory.filter((s) => {
    const cashierName = s.cashier?.fullName || s.cashier?.username || '';
    const matchesSearch =
      shiftSearch === '' ||
      cashierName.toLowerCase().includes(shiftSearch.toLowerCase()) ||
      s.id.toLowerCase().includes(shiftSearch.toLowerCase());

    if (!matchesSearch) return false;
    if (shiftStatusFilter === 'OPEN') return s.status === 'OPEN';
    if (shiftStatusFilter === 'CLOSED') return s.status === 'CLOSED';
    return true;
  });

  return (
    <div>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
            Cashier Shift & Register Management
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '2px' }}>
            Drawer float tracking, opening balances, cash-in/out audit logs, and Z-Report closing reconciliation
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={loadShiftData} className="btn btn-outline btn-sm">
            <RefreshCw size={14} /> Refresh
          </button>

          {!activeShift && (
            <button onClick={() => setOpenModalVisible(true)} className="btn btn-primary">
              <Clock size={16} /> Open New Shift
            </button>
          )}
        </div>
      </div>

      <Alert type="danger" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      {/* Sleek Shift Lifecycle Guide */}
      <div
        className="card"
        style={{
          padding: '14px 20px',
          marginBottom: '20px',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          boxShadow: 'var(--shadow-xs)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={14} color="#2563eb" /> Cashier Shift & Drawer Balancing Procedure
          </div>
          <span style={{ fontSize: '0.725rem', color: '#64748b' }}>4-Step Standard Procedure</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
          <div style={{ padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#2563eb', marginBottom: '2px' }}>STEP 1 • OPEN REGISTER</div>
            <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#0f172a' }}>Declare Float ($50)</div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>Starting drawer balance</div>
          </div>

          <div style={{ padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#2563eb', marginBottom: '2px' }}>STEP 2 • LIVE SALES</div>
            <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#0f172a' }}>Process Checkout</div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>Cash & QR auto-audited</div>
          </div>

          <div style={{ padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#d97706', marginBottom: '2px' }}>STEP 3 • END OF SHIFT</div>
            <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#0f172a' }}>Physical Cash Count</div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>Count drawer bills & coins</div>
          </div>

          <div style={{ padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#059669', marginBottom: '2px' }}>STEP 4 • CLOSE & AUDIT</div>
            <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#0f172a' }}>Print Z-Report</div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>Auto variance reconciliation</div>
          </div>
        </div>
      </div>

      {/* Active Shift Summary Panel */}
      {activeShift ? (
        <div
          className="card"
          style={{
            marginBottom: '26px',
            backgroundColor: '#ffffff',
            border: '1.5px solid #bfdbfe',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 8px 25px -4px rgba(37, 99, 235, 0.08)'
          }}
        >
          {/* Top Status & Cashier Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '4px 14px',
                    borderRadius: '9999px',
                    backgroundColor: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    color: '#1d4ed8',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    letterSpacing: '0.04em'
                  }}
                >
                  <span style={{ position: 'relative', display: 'flex', height: '8px', width: '8px' }}>
                    <span style={{ position: 'absolute', display: 'inline-flex', height: '100%', width: '100%', borderRadius: '50%', backgroundColor: '#22c55e', opacity: 0.75, animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite' }} />
                    <span style={{ position: 'relative', display: 'inline-flex', borderRadius: '50%', height: '8px', width: '8px', backgroundColor: '#16a34a' }} />
                  </span>
                  ACTIVE REGISTER SHIFT #01
                </div>

                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                  POS Terminal #01
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    backgroundColor: '#eff6ff',
                    color: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid #bfdbfe',
                    fontWeight: 800,
                    fontSize: '0.9rem'
                  }}
                >
                  {(user.fullName || user.username || 'C').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                    Cashier: {user.fullName || user.username}
                  </div>
                  <div style={{ fontSize: '0.775rem', color: '#64748b', marginTop: '3px' }}>
                    Shift started on {new Date(activeShift.openedAt).toLocaleDateString()} at {new Date(activeShift.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Shift Actions */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => openZReport(activeShift)}
                className="btn btn-outline btn-sm"
                style={{ padding: '7px 14px', fontSize: '0.8rem', fontWeight: 700, borderColor: '#bfdbfe', color: '#1d4ed8' }}
              >
                <FileText size={15} /> X-Report Preview
              </button>
              <button
                type="button"
                onClick={() => setMovementModalVisible(true)}
                className="btn btn-outline btn-sm"
                style={{ padding: '7px 14px', fontSize: '0.8rem', fontWeight: 700 }}
              >
                <DollarSign size={15} /> Cash In / Out
              </button>
              <button
                type="button"
                onClick={() => setCloseModalVisible(true)}
                className="btn btn-danger btn-sm"
                style={{ padding: '7px 16px', fontSize: '0.8rem', fontWeight: 700 }}
              >
                <Lock size={15} /> Close & Balance Drawer
              </button>
            </div>
          </div>

          {/* 4 Sleek Drawer Metrics Tiles */}
          <div className="grid-4" style={{ gap: '14px' }}>
            {/* 1. Opening Cash Float */}
            <div
              style={{
                backgroundColor: '#f8faff',
                border: '1px solid #bfdbfe',
                borderRadius: '12px',
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Opening Cash Float
                </span>
                <div style={{ width: '28px', height: '28px', borderRadius: '7px', backgroundColor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1d4ed8' }}>
                  <DollarSign size={16} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#1e40af', lineHeight: 1 }} className="currency-amount">
                  ${Number(activeShift.openingCash).toFixed(2)}
                </div>
                <div style={{ fontSize: '0.725rem', fontWeight: 600, color: '#64748b', marginTop: '4px' }} className="currency-amount">
                  ≈ {(Number(activeShift.openingCash) * khrExchangeRate).toLocaleString()} ៛ KHR
                </div>
              </div>
            </div>

            {/* 2. Cash Sales Collected */}
            <div
              style={{
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '12px',
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Cash Sales Collected
                </span>
                <div style={{ width: '28px', height: '28px', borderRadius: '7px', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
                  <ArrowDownRight size={16} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#15803d', lineHeight: 1 }} className="currency-amount">
                  ${Number(activeShift.cashSalesTotal).toFixed(2)}
                </div>
                <div style={{ fontSize: '0.725rem', fontWeight: 600, color: '#15803d', marginTop: '4px' }}>
                  {activeShift._count?.sales || 0} sales processed
                </div>
              </div>
            </div>

            {/* 3. Cash In / Out Drops */}
            <div
              style={{
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '12px',
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Drawer In / Out Drops
                </span>
                <div style={{ width: '28px', height: '28px', borderRadius: '7px', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
                  <ArrowUpRight size={16} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#b45309', lineHeight: 1 }} className="currency-amount">
                  +${Number(activeShift.cashInTotal).toFixed(2)} / -${Number(activeShift.cashOutTotal).toFixed(2)}
                </div>
                <div style={{ fontSize: '0.725rem', fontWeight: 600, color: '#92400e', marginTop: '4px' }}>
                  Audited register drops
                </div>
              </div>
            </div>

            {/* 4. Expected In Drawer - Hero Card */}
            <div
              style={{
                background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
                border: '1px solid #60a5fa',
                borderRadius: '12px',
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                color: '#ffffff',
                boxShadow: '0 6px 16px -2px rgba(37, 99, 235, 0.35)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#bfdbfe', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Expected In Drawer
                </span>
                <div style={{ width: '28px', height: '28px', borderRadius: '7px', backgroundColor: 'rgba(255, 255, 255, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
                  <CheckCircle2 size={16} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff', lineHeight: 1, letterSpacing: '-0.02em' }} className="currency-amount">
                  ${Number(activeShift.expectedClosingCash).toFixed(2)}
                </div>
                <div style={{ fontSize: '0.775rem', fontWeight: 700, color: '#dbeafe', marginTop: '4px' }} className="currency-amount">
                  ≈ {(Number(activeShift.expectedClosingCash) * khrExchangeRate).toLocaleString()} ៛ KHR
                </div>
              </div>
            </div>
          </div>

          {/* Audited Drawer Cash Movements Log */}
          <div style={{ marginTop: '22px', paddingTop: '18px', borderTop: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#0f172a' }}>
                  Audited Drawer Cash Movements ({activeShift.cashMovements?.length || 0})
                </span>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                  Float additions, mid-day safe drops, and petty cash logs for Register Terminal #01
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMovementModalVisible(true)}
                className="btn btn-outline btn-sm"
                style={{ fontSize: '0.75rem', padding: '5px 12px', color: '#1d4ed8', borderColor: '#bfdbfe', fontWeight: 700 }}
              >
                <Plus size={13} /> Record Cash In / Out
              </button>
            </div>

            {(!activeShift.cashMovements || activeShift.cashMovements.length === 0) ? (
              <div
                style={{
                  padding: '16px',
                  backgroundColor: '#f8fafc',
                  border: '1px dashed #cbd5e1',
                  borderRadius: '10px',
                  fontSize: '0.8rem',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <Clock size={16} color="#94a3b8" />
                <span>No cash movements recorded yet in this shift. Cash drawer is currently balancing directly from starting float (${Number(activeShift.openingCash).toFixed(2)}) and checkout sales.</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {activeShift.cashMovements.map((m) => {
                  const isIn = m.type === 'CASH_IN';
                  return (
                    <div
                      key={m.id}
                      style={{
                        padding: '11px 16px',
                        backgroundColor: isIn ? '#f0fdf4' : '#fffbeb',
                        border: `1px solid ${isIn ? '#bbf7d0' : '#fde68a'}`,
                        borderRadius: '10px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span
                          className={`badge ${isIn ? 'badge-success' : 'badge-warning'}`}
                          style={{ fontSize: '0.7rem', padding: '3px 8px', fontWeight: 800 }}
                        >
                          {isIn ? '+ CASH IN (Add Float)' : '- CASH OUT (Safe Drop)'}
                        </span>
                        <div>
                          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>
                            {m.reason}
                          </div>
                          <div style={{ fontSize: '0.725rem', color: '#64748b', marginTop: '2px' }}>
                            Recorded at {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} by {m.user?.fullName || m.user?.username || 'Cashier'}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div
                          className="currency-amount"
                          style={{
                            fontSize: '1.05rem',
                            fontWeight: 800,
                            color: isIn ? '#15803d' : '#b45309'
                          }}
                        >
                          {isIn ? '+' : '-'}${Number(m.amount).toFixed(2)}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }} className="currency-amount">
                          {Math.round(Number(m.amount) * khrExchangeRate).toLocaleString()} ៛ KHR
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div
          className="card"
          style={{
            padding: '36px 20px',
            textAlign: 'center',
            marginBottom: '26px',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px auto',
              border: '1px solid #bfdbfe'
            }}
          >
            <Clock size={28} />
          </div>
          <h3 style={{ color: '#0f172a', fontWeight: 800, fontSize: '1.2rem' }}>No Active Register Shift</h3>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px', marginBottom: '18px', maxWidth: '500px', margin: '4px auto 18px auto' }}>
            Open a cashier shift to record your starting drawer float. All completed sales and cash movements will be automatically reconciled.
          </p>
          <button onClick={() => setOpenModalVisible(true)} className="btn btn-primary" style={{ padding: '10px 24px', fontWeight: 700 }}>
            <Clock size={16} /> Open Shift Now
          </button>
        </div>
      )}

      {/* Shift History Table */}
      <div className="card" style={{ padding: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
              Shift History & Reconciliation Records
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '2px' }}>
              Audit-trail of all register sessions, cash drawers, and end-of-shift variances
            </p>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Showing <strong>{filteredShiftHistory.length}</strong> of {shiftHistory.length} shifts
          </div>
        </div>

        {/* Filter Bar for Shift History */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '18px' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search
              size={18}
              style={{ position: 'absolute', left: '12px', top: '10px', color: '#64748b' }}
            />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '38px', paddingRight: shiftSearch ? '36px' : '14px' }}
              placeholder="Search by cashier name or shift ID..."
              value={shiftSearch}
              onChange={(e) => setShiftSearch(e.target.value)}
            />
            {shiftSearch && (
              <button
                type="button"
                onClick={() => setShiftSearch('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px',
                  borderRadius: '50%'
                }}
                title="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <select
            className="form-select"
            style={{ width: '160px' }}
            value={shiftStatusFilter}
            onChange={(e) => setShiftStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open Shifts</option>
            <option value="CLOSED">Closed Shifts</option>
          </select>

          {(shiftSearch || shiftStatusFilter !== 'ALL') && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setShiftSearch('');
                setShiftStatusFilter('ALL');
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              title="Reset filters"
            >
              <RotateCcw size={14} /> Clear
            </button>
          )}
        </div>

        {loading ? (
          <LoadingSpinner text="Loading shifts history..." />
        ) : filteredShiftHistory.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
            No shift history records match the selected filter.
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
                  <th>Variance</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredShiftHistory.map((s) => {
                  const diff = s.difference !== null ? Number(s.difference) : null;
                  const isBalanced = diff === 0;
                  const isSurplus = diff > 0;
                  const isShortage = diff < 0;

                  return (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>
                        {s.cashier?.fullName || s.cashier?.username || 'Cashier'}
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>{new Date(s.openedAt).toLocaleString()}</td>
                      <td style={{ fontSize: '0.8rem' }}>{s.closedAt ? new Date(s.closedAt).toLocaleString() : '—'}</td>
                      <td className="mono">${Number(s.openingCash).toFixed(2)}</td>
                      <td className="mono" style={{ color: '#10b981', fontWeight: 700 }}>
                        ${Number(s.cashSalesTotal).toFixed(2)}
                      </td>
                      <td className="mono" style={{ fontWeight: 700 }}>
                        ${Number(s.expectedClosingCash).toFixed(2)}
                      </td>
                      <td className="mono" style={{ fontWeight: 700 }}>
                        {s.actualClosingCash !== null ? `$${Number(s.actualClosingCash).toFixed(2)}` : '—'}
                      </td>
                      <td className="mono" style={{ fontWeight: 700 }}>
                        {diff !== null ? (
                          <span
                            style={{
                              color: isBalanced ? '#10b981' : isSurplus ? '#2563eb' : '#ef4444',
                              backgroundColor: isBalanced ? '#ecfdf5' : isSurplus ? '#eff6ff' : '#fef2f2',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.75rem'
                            }}
                          >
                            {diff >= 0 ? '+' : ''}${diff.toFixed(2)} ({isBalanced ? 'Balanced' : isSurplus ? 'Surplus' : 'Shortage'})
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        <span className={`badge ${s.status === 'OPEN' ? 'badge-success' : 'badge-neutral'}`}>
                          {s.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => openZReport(s)}
                          className="btn btn-outline btn-sm"
                          style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                          title="View Z-Report Shift Summary"
                        >
                          <Eye size={13} /> Report
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Open Shift */}
      <Modal
        isOpen={openModalVisible}
        onClose={() => setOpenModalVisible(false)}
        title="Open Cashier Shift & Register Drawer"
        maxWidth="480px"
      >
        <form onSubmit={handleOpenShift}>
          <div style={{ backgroundColor: '#eff6ff', padding: '12px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.825rem', color: '#1e40af' }}>
            Opening a shift initializes drawer float tracking. Enter the physical starting cash counted in the drawer.
          </div>

          <div className="form-group">
            <label className="form-label">Starting Cash Float ($ USD) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              className="form-input mono"
              style={{ fontSize: '1.35rem', fontWeight: 800, padding: '8px 14px' }}
              value={openingCashInput}
              onChange={(e) => setOpeningCashInput(e.target.value)}
              autoFocus
            />
            {/* Quick preset float buttons */}
            <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
              {[20, 50, 100, 200].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  className="btn btn-outline btn-sm mono"
                  style={{ flex: 1, padding: '4px 0', fontSize: '0.75rem' }}
                  onClick={() => setOpeningCashInput(String(amt) + '.00')}
                >
                  ${amt}
                </button>
              ))}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>
              Equivalent: <strong>≈ {(Number(openingCashInput || 0) * khrExchangeRate).toLocaleString()} ៛ KHR</strong>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
            <button type="button" className="btn btn-outline" onClick={() => setOpenModalVisible(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={actionLoading}>
              {actionLoading ? 'Opening...' : 'Confirm & Open Shift'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Cash Movement (In / Out) */}
      <Modal
        isOpen={movementModalVisible}
        onClose={() => setMovementModalVisible(false)}
        title="Record Cash Movement (Cash-In / Cash-Out)"
        maxWidth="500px"
      >
        <form onSubmit={handleCashMovement}>
          <div className="form-group">
            <label className="form-label">Movement Type *</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                className={`btn ${movementType === 'CASH_IN' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setMovementType('CASH_IN')}
                style={{ padding: '10px', fontSize: '0.85rem', fontWeight: 700 }}
              >
                <ArrowDownRight size={16} /> Cash In (Add Money)
              </button>
              <button
                type="button"
                className={`btn ${movementType === 'CASH_OUT' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setMovementType('CASH_OUT')}
                style={{ padding: '10px', fontSize: '0.85rem', fontWeight: 700 }}
              >
                <ArrowUpRight size={16} /> Cash Out (Take Out)
              </button>
            </div>

            {/* Clear Explanation of Cash In vs Cash Out */}
            {movementType === 'CASH_IN' ? (
              <div
                style={{
                  marginTop: '10px',
                  padding: '10px 14px',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  color: '#166534',
                  lineHeight: 1.4
                }}
              >
                <strong>📥 Cash In (Adding Money to Drawer):</strong> Use this when you add more small bills for change or top up your starting drawer float. The expected drawer total will <strong>increase</strong>.
              </div>
            ) : (
              <div
                style={{
                  marginTop: '10px',
                  padding: '10px 14px',
                  backgroundColor: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  color: '#92400e',
                  lineHeight: 1.4
                }}
              >
                <strong>📤 Cash Out (Removing Money from Drawer):</strong> Use this when you drop excess large bills into the store safe (safe drop), pay for store supplies, or give a payout. The expected drawer total will <strong>decrease</strong>.
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Amount ($ USD) *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              className="form-input mono"
              placeholder="0.00"
              style={{ fontSize: '1.25rem', fontWeight: 800 }}
              value={movementAmount}
              onChange={(e) => setMovementAmount(e.target.value)}
              />
            {activeShift && (
              <div
                style={{
                  marginTop: '10px',
                  padding: '10px 14px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.725rem', color: '#64748b' }}>Current Drawer Expected:</div>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>${Number(activeShift.expectedClosingCash).toFixed(2)}</div>
                </div>
                <div style={{ fontSize: '1rem', color: '#94a3b8' }}>➔</div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.725rem', color: '#64748b' }}>New Drawer Expected Total:</div>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', color: movementType === 'CASH_IN' ? '#16a34a' : '#d97706' }}>
                    ${Math.max(0, Number(activeShift.expectedClosingCash) + (movementType === 'CASH_IN' ? (Number(movementAmount) || 0) : -(Number(movementAmount) || 0))).toFixed(2)}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Preset Audit Reason:</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
              {[
                'Change / Petty Cash',
                'Drawer Float Top-up',
                'Mid-day Safe Drop',
                'Store Expense / Supplies',
                'Cashier Payout'
              ].map((r) => (
                <button
                  key={r}
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: '0.7rem', padding: '3px 8px' }}
                  onClick={() => setMovementReason(r)}
                >
                  {r}
                </button>
              ))}
            </div>
            <input
              type="text"
              required
              className="form-input"
              placeholder="Describe reason for audit logs..."
              value={movementReason}
              onChange={(e) => setMovementReason(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '22px' }}>
            <button type="button" className="btn btn-outline" onClick={() => setMovementModalVisible(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={actionLoading}>
              {actionLoading ? 'Recording...' : 'Record Cash Movement'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Close Shift & Reconciliation */}
      <Modal
        isOpen={closeModalVisible}
        onClose={() => setCloseModalVisible(false)}
        title="Close Register Shift & Final Reconciliation"
        maxWidth="540px"
      >
        <form onSubmit={handleCloseShift}>
          {/* Expected Cash Drawer Callout */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              padding: '14px 16px',
              borderRadius: '10px',
              marginBottom: '16px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Expected Cash in Drawer:</span>
              <span className="mono" style={{ fontWeight: 800, fontSize: '1.35rem', color: '#0f172a' }}>
                ${Number(activeShift?.expectedClosingCash).toFixed(2)}
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Formula: Opening Float (${Number(activeShift?.openingCash).toFixed(2)}) + Cash Sales ($
              {Number(activeShift?.cashSalesTotal).toFixed(2)}) + Cash In (${Number(activeShift?.cashInTotal).toFixed(2)}) - Cash Out (${Number(activeShift?.cashOutTotal).toFixed(2)})
            </div>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Actual Counted Cash in Drawer ($) *</label>
              <button
                type="button"
                onClick={() => setShowBillCounter(!showBillCounter)}
                className="btn btn-outline btn-sm"
                style={{ fontSize: '0.725rem', padding: '2px 8px', color: '#2563eb', borderColor: '#bfdbfe' }}
              >
                <Calculator size={13} /> {showBillCounter ? 'Hide Bill Counter' : 'Open Bill Counter'}
              </button>
            </div>

            <input
              type="number"
              step="0.01"
              min="0"
              required
              className="form-input mono"
              style={{ fontSize: '1.35rem', fontWeight: 800, padding: '8px 14px' }}
              placeholder="0.00"
              value={actualCashInput}
              onChange={(e) => setActualCashInput(e.target.value)}
              autoFocus={!showBillCounter}
            />
          </div>

          {/* Interactive Denomination Bill Counter */}
          {showBillCounter && (
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1.5px solid #bfdbfe',
                padding: '14px',
                borderRadius: '10px',
                marginBottom: '16px'
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#1e40af', marginBottom: '10px' }}>
                💵 Count Bills & Coins:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {[
                  { label: '$100 Bills', key: 'b100' },
                  { label: '$50 Bills', key: 'b50' },
                  { label: '$20 Bills', key: 'b20' },
                  { label: '$10 Bills', key: 'b10' },
                  { label: '$5 Bills', key: 'b5' },
                  { label: '$1 Bills', key: 'b1' }
                ].map((den) => (
                  <div key={den.key}>
                    <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#475569' }}>{den.label}</label>
                    <input
                      type="number"
                      min="0"
                      className="form-input mono"
                      style={{ padding: '4px 6px', fontSize: '0.8rem' }}
                      value={bills[den.key]}
                      onChange={(e) => setBills({ ...bills, [den.key]: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '0.85rem' }}>
                  Counted: <strong className="mono" style={{ color: '#2563eb' }}>${countedTotalFromBills.toFixed(2)}</strong>
                </div>
                <button
                  type="button"
                  onClick={applyBillCount}
                  className="btn btn-primary btn-sm"
                  style={{ fontSize: '0.75rem', padding: '4px 12px' }}
                >
                  Apply Total (${countedTotalFromBills.toFixed(2)})
                </button>
              </div>
            </div>
          )}

          {/* Variance Preview */}
          {actualCashInput !== '' && (
            <div
              style={{
                padding: '12px 16px',
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
                fontWeight: 700,
                fontSize: '0.95rem',
                border: '1px solid',
                borderColor:
                  Number(actualCashInput) === Number(activeShift?.expectedClosingCash)
                    ? '#a7f3d0'
                    : Number(actualCashInput) > Number(activeShift?.expectedClosingCash)
                    ? '#bfdbfe'
                    : '#fecaca'
              }}
            >
              Reconciliation Variance:{' '}
              {Number(actualCashInput) - Number(activeShift?.expectedClosingCash) >= 0 ? '+' : ''}$
              {(Number(actualCashInput) - Number(activeShift?.expectedClosingCash)).toFixed(2)} USD (
              {Number(actualCashInput) === Number(activeShift?.expectedClosingCash)
                ? 'Balanced ✓'
                : Number(actualCashInput) > Number(activeShift?.expectedClosingCash)
                ? 'Surplus (Excess Cash)'
                : 'Shortage (Missing Cash)'}
              )
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Closing Notes / Discrepancy Reason (Optional)</label>
            <textarea
              rows="2"
              className="form-textarea"
              placeholder="e.g., Drawer balanced, handover to evening shift cashier..."
              value={closingNotes}
              onChange={(e) => setClosingNotes(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" className="btn btn-outline" onClick={() => setCloseModalVisible(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-danger" disabled={actionLoading}>
              {actionLoading ? 'Closing Shift...' : 'Close Shift & Finalize'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Printable Shift Z-Report / X-Report */}
      <Modal
        isOpen={zReportModalVisible}
        onClose={() => setZReportModalVisible(false)}
        title={selectedZReportShift?.status === 'OPEN' ? 'Shift X-Reading Report' : 'Shift Z-Reading Final Report'}
        maxWidth="460px"
      >
        {selectedZReportShift && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
              <button onClick={() => window.print()} className="btn btn-primary btn-sm">
                <Printer size={15} /> Print Shift Summary
              </button>
            </div>

            <div
              className="printable-receipt"
              style={{
                backgroundColor: '#ffffff',
                border: '1.5px dashed #cbd5e1',
                padding: '24px 20px',
                borderRadius: '8px',
                fontFamily: 'Courier New, Courier, monospace',
                fontSize: '0.8rem',
                color: '#0f172a'
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 900 }}>SUPERMARKET POS</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, marginTop: '4px' }}>
                  {selectedZReportShift.status === 'OPEN' ? 'REGISTER X-REPORT (INTERIM)' : 'REGISTER Z-REPORT (FINAL)'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                  Register Terminal #01
                </div>
              </div>

              <div style={{ borderBottom: '1.5px solid #0f172a', margin: '8px 0' }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Cashier:</span>
                  <strong>{selectedZReportShift.cashier?.fullName || selectedZReportShift.cashier?.username || user?.fullName}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Opened At:</span>
                  <span>{new Date(selectedZReportShift.openedAt).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Closed At:</span>
                  <span>{selectedZReportShift.closedAt ? new Date(selectedZReportShift.closedAt).toLocaleString() : 'STILL OPEN'}</span>
                </div>
              </div>

              <div style={{ borderBottom: '1px dashed #94a3b8', margin: '10px 0' }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Opening Cash Float:</span>
                  <span className="mono">${Number(selectedZReportShift.openingCash).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Cash Sales Total:</span>
                  <span className="mono" style={{ color: '#10b981', fontWeight: 700 }}>
                    +${Number(selectedZReportShift.cashSalesTotal).toFixed(2)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Cash-In Movements:</span>
                  <span className="mono">+${Number(selectedZReportShift.cashInTotal || 0).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Cash-Out Movements:</span>
                  <span className="mono">-${Number(selectedZReportShift.cashOutTotal || 0).toFixed(2)}</span>
                </div>

                <div style={{ borderTop: '1px solid #0f172a', paddingTop: '6px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                  <span>Expected in Drawer:</span>
                  <span className="mono">${Number(selectedZReportShift.expectedClosingCash).toFixed(2)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                  <span>Actual Cash Counted:</span>
                  <span className="mono">
                    {selectedZReportShift.actualClosingCash !== null
                      ? `$${Number(selectedZReportShift.actualClosingCash).toFixed(2)}`
                      : '—'}
                  </span>
                </div>

                {selectedZReportShift.difference !== null && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, marginTop: '4px' }}>
                    <span>Variance (Difference):</span>
                    <span className="mono" style={{ color: Number(selectedZReportShift.difference) === 0 ? '#10b981' : Number(selectedZReportShift.difference) > 0 ? '#2563eb' : '#dc2626' }}>
                      {Number(selectedZReportShift.difference) >= 0 ? '+' : ''}${Number(selectedZReportShift.difference).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              <div style={{ borderBottom: '1px dashed #94a3b8', margin: '14px 0' }} />

              {/* Signatures */}
              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ textAlign: 'center', width: '45%' }}>
                  <div style={{ borderBottom: '1px solid #0f172a', height: '30px' }} />
                  <div style={{ fontSize: '0.7rem', marginTop: '4px' }}>Cashier Signature</div>
                </div>
                <div style={{ textAlign: 'center', width: '45%' }}>
                  <div style={{ borderBottom: '1px solid #0f172a', height: '30px' }} />
                  <div style={{ fontSize: '0.7rem', marginTop: '4px' }}>Manager Signature</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
