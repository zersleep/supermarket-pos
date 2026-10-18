import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign,
  ShoppingCart,
  AlertTriangle,
  Clock,
  ArrowRight,
  Package,
  QrCode,
  TrendingUp,
  Boxes,
  Store,
  UserCheck
} from 'lucide-react';
import api from '../api/client';
import { StatCard, LoadingSpinner, Alert } from '../components/common/LoadingSpinner';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    todayRevenue: 0,
    todaySalesCount: 0,
    lowStockCount: 0,
    expiringCount: 0,
    expiredCount: 0,
    pendingPaymentsCount: 0,
    recentSales: []
  });

  const { user, canOperatePos, canViewReports, canManageInventory } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        setError('');

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        // Fetch parallel data from real backend endpoints
        const [salesRes, inventoryRes, pendingRes, recentSalesRes] = await Promise.all([
          api.get(`/reports/sales?startDate=${todayStart.toISOString()}`).catch(() => ({ data: { summary: {} } })),
          api.get('/inventory/summary').catch(() => ({ data: {} })),
          api.get('/payments/pending?limit=1').catch(() => ({ pagination: { total: 0 } })),
          api.get('/sales?limit=6').catch(() => ({ data: [] }))
        ]);

        const summary = salesRes.data?.summary || {};
        const invSummary = inventoryRes.data || {};
        const pendingCount = pendingRes.pagination?.total || 0;
        const recent = recentSalesRes.data || [];

        setStats({
          todayRevenue: summary.totalRevenue || 0,
          todaySalesCount: summary.completedSalesCount || 0,
          lowStockCount: invSummary.lowStockCount || 0,
          expiringCount: invSummary.expiringCount || 0,
          expiredCount: invSummary.expiredCount || 0,
          pendingPaymentsCount: pendingCount,
          recentSales: recent
        });
      } catch (err) {
        setError(err.message || 'Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  if (loading) {
    return <LoadingSpinner text="Loading dashboard metrics..." />;
  }

  const khrExchangeRate = 4100;
  const todayRevenueKhr = Math.round(Number(stats.todayRevenue) * khrExchangeRate);

  return (
    <div>
      {/* Hero Welcome Banner */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 60%, #3b82f6 100%)',
          border: '1px solid #60a5fa',
          color: '#ffffff',
          marginBottom: '28px',
          padding: '28px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.3)'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span
              className="badge"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.3)'
              }}
            >
              <Store size={12} /> Supermarket Terminal #01
            </span>
            <span
              className="badge"
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.25)',
                color: '#6ee7b7',
                border: '1px solid rgba(16, 185, 129, 0.4)'
              }}
            >
              <UserCheck size={12} /> {user?.role?.replace('_', ' ')}
            </span>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
            Welcome back, {user?.fullName || user?.username}!
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '4px' }}>
            Live point of sale status, multi-currency revenue, and batch inventory telemetry.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          {canOperatePos && (
            <button
              onClick={() => navigate('/pos')}
              className="btn btn-primary btn-lg"
              style={{ boxShadow: '0 4px 14px rgba(37, 99, 235, 0.5)' }}
            >
              <ShoppingCart size={20} /> Open POS Checkout
            </button>
          )}
          {canManageInventory && (
            <button
              onClick={() => navigate('/inventory')}
              className="btn btn-outline"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: '#ffffff',
                borderColor: 'rgba(255, 255, 255, 0.2)'
              }}
            >
              <Boxes size={18} /> Manage Inventory
            </button>
          )}
        </div>
      </div>

      <Alert type="danger" message={error} onClose={() => setError('')} />

      {/* Top Metrics Cards */}
      <div className="grid-4" style={{ marginBottom: '28px' }}>
        <StatCard
          title="Today's Revenue"
          value={`$${Number(stats.todayRevenue).toFixed(2)}`}
          subtitle={`≈ ៛${todayRevenueKhr.toLocaleString()} KHR`}
          icon={DollarSign}
          color="#10b981"
        />

        <StatCard
          title="Completed Orders"
          value={stats.todaySalesCount}
          subtitle="Processed today"
          icon={ShoppingCart}
          color="#3b82f6"
        />

        <StatCard
          title="Pending QR Payments"
          value={stats.pendingPaymentsCount}
          subtitle="Awaiting cashier approval"
          icon={QrCode}
          color={stats.pendingPaymentsCount > 0 ? '#f59e0b' : '#64748b'}
        />

        <StatCard
          title="Low Stock & Expiry"
          value={stats.lowStockCount + stats.expiringCount}
          subtitle={`${stats.lowStockCount} low stock • ${stats.expiringCount} expiring`}
          icon={AlertTriangle}
          color={stats.lowStockCount > 0 || stats.expiringCount > 0 ? '#ef4444' : '#10b981'}
        />
      </div>

      {/* Action Alerts Banner */}
      {(stats.pendingPaymentsCount > 0 || stats.expiredCount > 0 || stats.lowStockCount > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
          {stats.pendingPaymentsCount > 0 && (
            <div
              style={{
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                padding: '16px 22px',
                borderRadius: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 2px 6px rgba(245, 158, 11, 0.08)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <QrCode color="#d97706" size={24} />
                <div>
                  <div style={{ fontWeight: 700, color: '#92400e', fontSize: '0.95rem' }}>
                    {stats.pendingPaymentsCount} Pending QR Payment(s)
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#b45309' }}>
                    Customer transactions submitted via Bakong / KHQR awaiting verification.
                  </div>
                </div>
              </div>
              <button
                onClick={() => navigate('/pending-payments')}
                className="btn btn-sm"
                style={{ backgroundColor: '#f59e0b', color: 'white', fontWeight: 700 }}
              >
                Verify Payments <ArrowRight size={14} />
              </button>
            </div>
          )}

          {stats.expiredCount > 0 && canManageInventory && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                padding: '16px 22px',
                borderRadius: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 2px 6px rgba(239, 68, 68, 0.08)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <AlertTriangle color="#dc2626" size={24} />
                <div>
                  <div style={{ fontWeight: 700, color: '#991b1b', fontSize: '0.95rem' }}>
                    {stats.expiredCount} Expired Batch(es) Detected
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#b91c1c' }}>
                    These batches are automatically quarantined by FEFO and cannot be checked out.
                  </div>
                </div>
              </div>
              <button
                onClick={() => navigate('/inventory')}
                className="btn btn-sm btn-danger"
              >
                Inspect Batches <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Recent Transactions Table Card */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Recent Transactions</h3>
            <p className="card-subtitle">Real-time sale records across all cashier registers</p>
          </div>
          <button onClick={() => navigate('/sales')} className="btn btn-outline btn-sm">
            View Sales History <ArrowRight size={14} />
          </button>
        </div>

        {stats.recentSales.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
            <ShoppingCart size={36} color="#cbd5e1" style={{ marginBottom: '10px' }} />
            <div>No transactions recorded yet today. Complete your first checkout in POS!</div>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Receipt #</th>
                  <th>Date & Time</th>
                  <th>Cashier</th>
                  <th>Status</th>
                  <th>Grand Total (USD)</th>
                  <th>Grand Total (KHR)</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentSales.map((sale) => {
                  const saleKhr = Math.round(Number(sale.grandTotal) * khrExchangeRate);
                  return (
                    <tr key={sale.id}>
                      <td style={{ fontWeight: 700, color: '#2563eb' }} className="mono">
                        {sale.receiptNumber}
                      </td>
                      <td style={{ color: '#64748b' }}>
                        {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ fontWeight: 500 }}>
                        {sale.cashier?.fullName || sale.cashier?.username || 'Cashier'}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            sale.paymentStatus === 'COMPLETED'
                              ? 'badge-success'
                              : sale.paymentStatus === 'PENDING'
                              ? 'badge-warning'
                              : 'badge-danger'
                          }`}
                        >
                          {sale.paymentStatus}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700 }} className="mono">
                        ${Number(sale.grandTotal).toFixed(2)}
                      </td>
                      <td style={{ color: '#64748b', fontWeight: 600 }} className="mono">
                        ៛{saleKhr.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
