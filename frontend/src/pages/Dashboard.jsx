import React, { useState, useEffect, useCallback } from 'react';
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
  UserCheck,
  Truck,
  FileText,
  RefreshCw
} from 'lucide-react';
import api from '../api/client';
import { StatCard, LoadingSpinner, Alert } from '../components/common/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { usePos } from '../context/PosContext';
import { useLanguage } from '../context/LanguageContext';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    todayRevenue: 0,
    todaySalesCount: 0,
    totalProducts: 0,
    lowStockCount: 0,
    expiringCount: 0,
    expiredCount: 0,
    pendingPaymentsCount: 0,
    recentSales: []
  });

  const { user, activeShift, canOperatePos, canViewReports, canManageInventory } = useAuth();
  const navigate = useNavigate();

  const isInventoryManager = user?.role === 'INVENTORY_MANAGER';
  const isCashier = user?.role === 'CASHIER';

  const fetchDashboardData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      else setIsRefreshing(true);
      setError('');

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      // Fetch data based on role permissions
      const promises = [
        api.get('/inventory/summary').catch(() => ({ data: {} })),
        api.get('/sales?limit=8').catch(() => ({ data: [] }))
      ];

      // Financial & payment endpoints with local-day boundary
      if (canViewReports || canOperatePos) {
        promises.push(
          api.get(`/reports/sales?startDate=${encodeURIComponent(todayStart.toISOString())}&endDate=${encodeURIComponent(todayEnd.toISOString())}`).catch(() => ({ data: { summary: {} } }))
        );
      }

      if (canOperatePos) {
        promises.push(
          api.get('/payments/pending?limit=1').catch(() => ({ pagination: { total: 0 } }))
        );
      }

      const [invRes, recentSalesRes, salesRes, pendingRes] = await Promise.all(promises);

      const invSummary = invRes.data || {};
      const recent = recentSalesRes.data || [];
      const summary = salesRes?.data?.summary || {};
      const pendingCount = pendingRes?.pagination?.total || 0;

      setStats({
        todayRevenue: summary.totalRevenue || 0,
        todaySalesCount: summary.completedSalesCount || 0,
        totalProducts: invSummary.totalProducts || 0,
        lowStockCount: invSummary.lowStockCount || 0,
        expiringCount: invSummary.expiringCount || 0,
        expiredCount: invSummary.expiredCount || 0,
        pendingPaymentsCount: pendingCount,
        recentSales: recent
      });
      setLastUpdated(new Date());
    } catch (err) {
      if (!isSilent) {
        setError(err.message || 'Failed to load dashboard data.');
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [canOperatePos, canViewReports]);

  useEffect(() => {
    fetchDashboardData(false);

    // Auto-refresh when user focuses or returns to window
    const handleFocus = () => {
      fetchDashboardData(true);
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        fetchDashboardData(true);
      }
    });

    // Background polling every 15 seconds so new sales appear live
    const pollInterval = setInterval(() => {
      fetchDashboardData(true);
    }, 15000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(pollInterval);
    };
  }, [fetchDashboardData]);

  if (loading && !lastUpdated) {
    return <LoadingSpinner text="Loading real-time supermarket telemetry..." />;
  }

  const { primaryCurrency, exchangeRate } = usePos();
  const { t } = useLanguage();

  const khrExchangeRate = Number(exchangeRate) || 4100;
  const todayRevenueKhr = Math.round(Number(stats.todayRevenue) * khrExchangeRate);

  return (
    <div>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
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
            {lastUpdated && (
              <span
                style={{
                  fontSize: '0.75rem',
                  color: '#dbeafe',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontWeight: 600,
                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                  padding: '2px 8px',
                  borderRadius: '6px'
                }}
              >
                ● Live Sync: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
            Welcome back, {user?.fullName || user?.username}!
          </h1>
          <p style={{ color: '#dbeafe', fontSize: '0.875rem', marginTop: '4px' }}>
            {isInventoryManager
              ? 'Real-time catalog stock control, FEFO batch expiry monitoring, and purchase orders.'
              : 'Live point of sale status, multi-currency revenue, and batch inventory telemetry.'}
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => fetchDashboardData(false)}
            disabled={isRefreshing}
            className="btn btn-outline"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              color: '#ffffff',
              border: '1.5px solid rgba(255, 255, 255, 0.45)',
              fontWeight: 700,
              fontSize: '0.875rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: isRefreshing ? 'wait' : 'pointer',
              borderRadius: '8px',
              padding: '10px 16px',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
            }}
            onMouseEnter={(e) => {
              if (!isRefreshing) {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.32)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.8)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.45)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            title="Refresh sales and metrics now"
          >
            <RefreshCw
              size={16}
              color="#ffffff"
              style={{
                animation: isRefreshing ? 'spin 1s linear infinite' : 'none'
              }}
            />
            {isRefreshing ? 'Syncing...' : 'Refresh'}
          </button>
          {canOperatePos && (
            <button
              onClick={() => navigate('/pos')}
              className="btn btn-outline btn-lg"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.25)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                color: '#ffffff',
                border: '1.5px solid rgba(255, 255, 255, 0.5)',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
                fontWeight: 700,
                fontSize: '0.95rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                borderRadius: '8px',
                padding: '10px 20px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.38)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.85)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(0, 0, 0, 0.15)';
              }}
            >
              <ShoppingCart size={19} color="#ffffff" /> Open Checkout Register
            </button>
          )}
          {canManageInventory && (
            <>
              <button
                onClick={() => navigate('/inventory')}
                className="btn btn-outline"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  color: '#ffffff',
                  borderColor: 'rgba(255, 255, 255, 0.35)',
                  fontWeight: 700,
                  borderRadius: '8px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.28)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.6)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.35)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <Boxes size={18} /> Manage Inventory
              </button>
              <button
                onClick={() => navigate('/products')}
                className="btn btn-outline"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  color: '#ffffff',
                  borderColor: 'rgba(255, 255, 255, 0.35)',
                  fontWeight: 700,
                  borderRadius: '8px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.28)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.6)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.35)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <Package size={18} /> Products
              </button>
            </>
          )}
        </div>
      </div>

      <Alert type="danger" message={error} onClose={() => setError('')} />

      {/* Top Metrics Cards: Role-Specific */}
      {isInventoryManager ? (
        /* Inventory Manager Cards */
        <div className="grid-4" style={{ marginBottom: '28px' }}>
          <StatCard
            title="Active Products"
            value={stats.totalProducts}
            subtitle="Catalog SKUs tracked"
            icon={Package}
            color="#2563eb"
          />

          <StatCard
            title="Low Stock Items"
            value={stats.lowStockCount}
            subtitle="Below reorder threshold"
            icon={AlertTriangle}
            color={stats.lowStockCount > 0 ? '#ef4444' : '#10b981'}
          />

          <StatCard
            title="Expiring Batches"
            value={stats.expiringCount}
            subtitle="Expiring within 30 days"
            icon={Clock}
            color={stats.expiringCount > 0 ? '#f59e0b' : '#3b82f6'}
          />

          <StatCard
            title="Expired Batches"
            value={stats.expiredCount}
            subtitle="Write-off required"
            icon={AlertTriangle}
            color={stats.expiredCount > 0 ? '#dc2626' : '#10b981'}
          />
        </div>
      ) : (
        /* Owner / Admin / Cashier Cards */
        <div className="grid-4" style={{ marginBottom: '28px' }}>
          <StatCard
            title={t('dashboard.today_revenue', "Today's Revenue")}
            value={
              primaryCurrency === 'KHR'
                ? `${todayRevenueKhr.toLocaleString()} ៛`
                : `$${Number(stats.todayRevenue).toFixed(2)}`
            }
            subtitle={
              primaryCurrency === 'KHR'
                ? `≈ $${Number(stats.todayRevenue).toFixed(2)} USD`
                : `≈ ${todayRevenueKhr.toLocaleString()} ៛ KHR`
            }
            icon={DollarSign}
            color="#10b981"
          />

          <StatCard
            title={t('dashboard.today_sales', "Completed Orders")}
            value={stats.todaySalesCount}
            subtitle="Processed today"
            icon={ShoppingCart}
            color="#3b82f6"
          />

          <StatCard
            title="Active Products"
            value={stats.totalProducts}
            subtitle="Catalog items tracked"
            icon={Package}
            color="#2563eb"
          />

          <StatCard
            title="Low Stock & Expiry"
            value={stats.lowStockCount + stats.expiringCount}
            subtitle={`${stats.lowStockCount} low stock • ${stats.expiringCount} expiring`}
            icon={AlertTriangle}
            color={stats.lowStockCount > 0 || stats.expiringCount > 0 ? '#ef4444' : '#10b981'}
          />
        </div>
      )}

      {/* Action Alerts Banner: Role-Filtered */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
        {/* Cashier Shift Status Notice */}
        {canOperatePos && (
          !activeShift ? (
            <div
              style={{
                backgroundColor: '#eff6ff',
                border: '1.5px solid #bfdbfe',
                padding: '16px 22px',
                borderRadius: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.08)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <Clock color="#2563eb" size={24} />
                <div>
                  <div style={{ fontWeight: 700, color: '#1e40af', fontSize: '0.95rem' }}>
                    Register Shift Not Opened
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#3b82f6' }}>
                    Your cash drawer is not initialized. Open a shift to record your starting float and process sales.
                  </div>
                </div>
              </div>
              <button
                onClick={() => navigate('/shifts')}
                className="btn btn-sm btn-primary"
                style={{ padding: '6px 14px', fontSize: '0.8rem', fontWeight: 700 }}
              >
                Open Register Shift <ArrowRight size={14} />
              </button>
            </div>
          ) : (
            <div
              style={{
                backgroundColor: '#ecfdf5',
                border: '1.5px solid #a7f3d0',
                padding: '16px 22px',
                borderRadius: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 2px 6px rgba(16, 185, 129, 0.08)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <Store color="#059669" size={24} />
                <div>
                  <div style={{ fontWeight: 700, color: '#065f46', fontSize: '0.95rem' }}>
                    Register Shift Active • Opened {new Date(activeShift.openedAt).toLocaleTimeString()}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#047857' }}>
                    Starting Float: ${Number(activeShift.openingCash).toFixed(2)} • Expected in Drawer: ${Number(activeShift.expectedClosingCash).toFixed(2)}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => navigate('/shifts')}
                  className="btn btn-sm btn-outline"
                  style={{ padding: '6px 12px', fontSize: '0.8rem', borderColor: '#a7f3d0', color: '#065f46' }}
                >
                  Manage Shift
                </button>
                <button
                  onClick={() => navigate('/pos')}
                  className="btn btn-sm btn-success"
                  style={{ padding: '6px 14px', fontSize: '0.8rem', fontWeight: 700 }}
                >
                  <ShoppingCart size={14} /> Go to Checkout Register
                </button>
              </div>
            </div>
          )
        )}

        {/* Expired Batches Alert for Inventory Managers and Admins */}
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
                  These batches are quarantined by the FEFO engine and must be audited and written off.
                </div>
              </div>
            </div>
            <button
              onClick={() => navigate('/inventory')}
              className="btn btn-sm btn-danger"
            >
              Inspect & Write-Off <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* Low Stock Alert for Inventory Managers */}
        {isInventoryManager && stats.lowStockCount > 0 && (
          <div
            style={{
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              padding: '16px 22px',
              borderRadius: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.08)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <Truck color="#2563eb" size={24} />
              <div>
                <div style={{ fontWeight: 700, color: '#1e40af', fontSize: '0.95rem' }}>
                  {stats.lowStockCount} Product(s) Below Reorder Level
                </div>
                <div style={{ fontSize: '0.8rem', color: '#3b82f6' }}>
                  Stock quantities are low. Consider issuing a purchase order to your suppliers.
                </div>
              </div>
            </div>
            <button
              onClick={() => navigate('/purchasing')}
              className="btn btn-sm btn-primary"
            >
              Create Purchase Order <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>

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
                  {primaryCurrency === 'KHR' ? (
                    <>
                      <th>{t('dashboard.grand_total_khr', 'Grand Total (KHR)')}</th>
                      <th>{t('dashboard.grand_total_usd', 'Grand Total (USD)')}</th>
                    </>
                  ) : (
                    <>
                      <th>{t('dashboard.grand_total_usd', 'Grand Total (USD)')}</th>
                      <th>{t('dashboard.grand_total_khr', 'Grand Total (KHR)')}</th>
                    </>
                  )}
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
                      {primaryCurrency === 'KHR' ? (
                        <>
                          <td style={{ fontWeight: 700, color: '#059669' }} className="mono">
                            {saleKhr.toLocaleString()} ៛
                          </td>
                          <td style={{ color: '#64748b', fontWeight: 600 }} className="mono">
                            ${Number(sale.grandTotal).toFixed(2)}
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ fontWeight: 700, color: '#1e40af' }} className="mono">
                            ${Number(sale.grandTotal).toFixed(2)}
                          </td>
                          <td style={{ color: '#64748b', fontWeight: 600 }} className="mono">
                            {saleKhr.toLocaleString()} ៛
                          </td>
                        </>
                      )}
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
