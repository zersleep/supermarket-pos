import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  DollarSign,
  TrendingUp,
  CreditCard,
  Package,
  Users,
  Percent,
  Tag,
  ShoppingBag,
  Award,
  ArrowUpRight
} from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner, Alert, StatCard } from '../../components/common/LoadingSpinner';

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [salesReport, setSalesReport] = useState({
    summary: {},
    paymentMethods: {},
    cashierPerformance: [],
    topSellingProducts: []
  });
  const [inventoryReport, setInventoryReport] = useState({});

  // Preset Date range
  const [datePreset, setDatePreset] = useState('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { canViewReports } = useAuth();

  const handleDatePreset = (preset) => {
    setDatePreset(preset);
    const now = new Date();
    if (preset === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setStartDate(today.toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
    } else if (preset === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(now.getDate() - 7);
      setStartDate(weekAgo.toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
    } else if (preset === 'month') {
      const monthAgo = new Date();
      monthAgo.setDate(now.getDate() - 30);
      setStartDate(monthAgo.toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
    }
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError('');

      let url = '/reports/sales';
      if (startDate || endDate) {
        url += `?startDate=${startDate}&endDate=${endDate}`;
      }

      const [salesRes, invRes] = await Promise.all([
        api.get(url),
        api.get('/reports/inventory')
      ]);

      setSalesReport(salesRes.data || {});
      setInventoryReport(invRes.data || {});
    } catch (err) {
      setError(err.message || 'Failed to generate reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleDatePreset('today');
  }, []);

  useEffect(() => {
    if (startDate) {
      fetchReports();
    }
  }, [startDate, endDate]);

  const handleExportCsv = () => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
    const token = localStorage.getItem('pos_token');
    const url = `${apiBase}/reports/export-sales-csv?startDate=${startDate}&endDate=${endDate}`;

    fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then((res) => res.blob())
      .then((blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `sales-report-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch((err) => alert('CSV download failed: ' + err.message));
  };

  const summary = salesReport.summary || {};

  return (
    <div style={{ paddingBottom: '30px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
              Analytics & Financial Reports
            </h1>
            <span
              style={{
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '8px',
                border: '1px solid #bfdbfe'
              }}
            >
              Executive Insights
            </span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>
            Accurate profit margins, promotional discounts given, cashier performance, and inventory health
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="btn btn-outline"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Download size={16} color="#2563eb" /> Export Sales CSV
        </button>
      </div>

      <Alert type="danger" message={error} onClose={() => setError('')} />

      {/* Date Controls */}
      <div className="card" style={{ padding: '14px 20px', marginBottom: '22px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className={`btn btn-sm ${datePreset === 'today' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => handleDatePreset('today')}
            >
              Today
            </button>
            <button
              className={`btn btn-sm ${datePreset === 'week' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => handleDatePreset('week')}
            >
              Last 7 Days
            </button>
            <button
              className={`btn btn-sm ${datePreset === 'month' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => handleDatePreset('month')}
            >
              Last 30 Days
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={16} color="#64748b" />
            <input
              type="date"
              className="form-input"
              style={{ width: '150px', padding: '6px 10px' }}
              value={startDate}
              onChange={(e) => {
                setDatePreset('custom');
                setStartDate(e.target.value);
              }}
            />
            <span style={{ color: '#64748b', fontSize: '0.85rem' }}>to</span>
            <input
              type="date"
              className="form-input"
              style={{ width: '150px', padding: '6px 10px' }}
              value={endDate}
              onChange={(e) => {
                setDatePreset('custom');
                setEndDate(e.target.value);
              }}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner text="Computing store financial reports..." />
      ) : (
        <>
          {/* Key Executive Financial Metrics Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
              marginBottom: '24px'
            }}
          >
            {/* Net Revenue */}
            <StatCard
              title="Net Revenue"
              value={`$${Number(summary.netRevenue || 0).toFixed(2)}`}
              subtitle={`Gross: $${Number(summary.totalRevenue || 0).toFixed(2)} (${summary.completedSalesCount || 0} sales)`}
              icon={DollarSign}
              color="#2563eb"
            />

            {/* Est. Gross Profit */}
            <StatCard
              title="Est. Gross Profit"
              value={`$${Number(summary.estimatedGrossProfit || 0).toFixed(2)}`}
              subtitle={`COGS: $${Number(summary.totalCostOfGoods || 0).toFixed(2)}`}
              icon={TrendingUp}
              color="#059669"
            />

            {/* Profit Margin % */}
            <StatCard
              title="Gross Profit Margin"
              value={`${Number(summary.grossMarginPercent || 0).toFixed(1)}%`}
              subtitle="Profit margin on net sales"
              icon={Percent}
              color="#7c3aed"
            />

            {/* Discounts Given */}
            <StatCard
              title="Discounts Granted"
              value={`$${Number(summary.totalDiscountsGiven || 0).toFixed(2)}`}
              subtitle="Promotions & item deals saved"
              icon={Tag}
              color="#d97706"
            />

            {/* Total Refunds */}
            <StatCard
              title="Total Refunds"
              value={`$${Number(summary.totalRefundAmount || 0).toFixed(2)}`}
              subtitle="Returns & refunds processed"
              icon={ArrowUpRight}
              color="#ef4444"
            />
          </div>

          {/* Middle Row: Payment Methods & Inventory Health */}
          <div className="grid-2" style={{ marginBottom: '24px' }}>
            {/* Payment Methods Breakdown */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <CreditCard size={18} color="#2563eb" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                  Payment Method Breakdown
                </h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <DollarSign size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0f172a' }}>Cash Payments</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>USD Cash & KHR Riel at register</div>
                    </div>
                  </div>
                  <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>
                    ${Number(salesReport.paymentMethods?.CASH || 0).toFixed(2)}
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CreditCard size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0f172a' }}>KHQR Digital Payments</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Mobile banking QR transactions</div>
                    </div>
                  </div>
                  <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#2563eb' }}>
                    ${Number(salesReport.paymentMethods?.QR_PAYMENT || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Inventory Valuation */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Package size={18} color="#10b981" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                  Current Inventory Valuation
                </h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Total Active Stock Units:</span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>
                    {inventoryReport.totalUnits || 0} units
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Inventory Asset Cost:</span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>
                    ${Number(inventoryReport.totalInventoryValue || 0).toFixed(2)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                  <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Potential Retail Value:</span>
                  <span style={{ fontWeight: 800, color: '#2563eb', fontSize: '1.05rem' }}>
                    ${Number(inventoryReport.totalRetailValue || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Cashier Performance Leaderboard */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Award size={18} color="#f59e0b" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                Cashier Performance & Register Activity
              </h3>
            </div>

            {salesReport.cashierPerformance?.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                No cashier transactions logged for this period.
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Cashier Name</th>
                      <th>Transactions Completed</th>
                      <th>Total Sales Volume</th>
                      <th>Avg. Ticket Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesReport.cashierPerformance?.map((cp, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 700, color: '#0f172a' }}>
                          {cp.cashier}
                        </td>
                        <td>
                          <span style={{ fontWeight: 600 }}>{cp.salesCount}</span> tickets
                        </td>
                        <td style={{ fontWeight: 700, color: '#2563eb' }}>
                          ${Number(cp.totalSales || 0).toFixed(2)}
                        </td>
                        <td style={{ fontWeight: 600, color: '#059669' }}>
                          ${Number(cp.averageTicket || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Top Selling Products */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <BarChart3 size={18} color="#2563eb" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                Top Selling Products in Selected Period
              </h3>
            </div>

            {salesReport.topSellingProducts?.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                No product sales recorded in this date range.
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Product Name</th>
                      <th>Units Sold</th>
                      <th>Total Sales Revenue ($)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesReport.topSellingProducts?.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600, color: '#0f172a' }}>{item.name}</td>
                        <td style={{ fontWeight: 600 }}>{item.totalQuantity} units</td>
                        <td style={{ fontWeight: 700, color: '#2563eb' }}>
                          ${Number(item.totalSales).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
