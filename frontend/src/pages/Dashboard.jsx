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
  TrendingUp
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

  const { canOperatePos, canViewReports, canManageInventory } = useAuth();
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
          api.get('/sales?limit=5').catch(() => ({ data: [] }))
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Overview Dashboard</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            Live performance, inventory status, and pending approvals
          </p>
        </div>
        {canOperatePos && (
          <button onClick={() => navigate('/pos')} className="btn btn-primary btn-lg">
            <ShoppingCart size={18} /> Open POS Checkout
          </button>
        )}
      </div>

      <Alert type="danger" message={error} onClose={() => setError('')} />

      {/* Top Metrics Cards */}
      <div className="grid-4" style={{ marginBottom: '24px' }}>
        <StatCard
          title="Today's Sales"
          value={`$${Number(stats.todayRevenue).toFixed(2)}`}
          subtitle={`${stats.todaySalesCount} completed orders today`}
          icon={DollarSign}
          color="#10b981"
        />

        <StatCard
          title="Pending Payments"
          value={stats.pendingPaymentsCount}
          subtitle="QR transactions awaiting verification"
          icon={QrCode}
          color={stats.pendingPaymentsCount > 0 ? '#f59e0b' : '#64748b'}
        />

        <StatCard
          title="Low Stock Items"
          value={stats.lowStockCount}
          subtitle="Products below reorder threshold"
          icon={AlertTriangle}
          color={stats.lowStockCount > 0 ? '#ef4444' : '#10b981'}
        />

        <StatCard
          title="Expiring Batches"
          value={stats.expiringCount}
          subtitle={`${stats.expiredCount} already expired`}
          icon={Clock}
          color={stats.expiredCount > 0 ? '#dc2626' : '#3b82f6'}
        />
      </div>

      {/* Action Alerts Banner */}
      {(stats.pendingPaymentsCount > 0 || stats.expiredCount > 0 || stats.lowStockCount > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          {stats.pendingPaymentsCount > 0 && (
            <div
              style={{
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                padding: '14px 20px',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <QrCode color="#d97706" size={22} />
                <div>
                  <div style={{ fontWeight: 600, color: '#92400e' }}>
                    {stats.pendingPaymentsCount} Pending QR Payment(s)
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#b45309' }}>
                    Cashier submitted payments waiting for authorized verification.
                  </div>
                </div>
              </div>
              <button
                onClick={() => navigate('/pending-payments')}
                className="btn btn-sm"
                style={{ backgroundColor: '#f59e0b', color: 'white' }}
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
                padding: '14px 20px',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <AlertTriangle color="#dc2626" size={22} />
                <div>
                  <div style={{ fontWeight: 600, color: '#991b1b' }}>
                    {stats.expiredCount} Expired Batch(es) Detected
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#b91c1c' }}>
                    Expired batches are blocked from checkout and must be written off.
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

      {/* Recent Sales Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Recent Transactions</h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Latest checkouts across registers</p>
          </div>
          <button onClick={() => navigate('/sales')} className="btn btn-outline btn-sm">
            View All Sales <ArrowRight size={14} />
          </button>
        </div>

        {stats.recentSales.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
            No transactions recorded yet today. Complete your first checkout in POS!
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
                  <th>Grand Total</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentSales.map((sale) => (
                  <tr key={sale.id}>
                    <td style={{ fontWeight: 600 }} className="mono">
                      {sale.receiptNumber}
                    </td>
                    <td>{new Date(sale.createdAt).toLocaleTimeString()}</td>
                    <td>{sale.cashier?.fullName || 'N/A'}</td>
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
                    <td style={{ fontWeight: 600 }} className="mono">
                      ${Number(sale.grandTotal).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
