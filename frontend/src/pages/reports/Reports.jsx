import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  DollarSign,
  TrendingUp,
  CreditCard,
  Package,
  Users
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
    
    // Create an authenticated blob download
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
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Analytics & Financial Reports</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            Calculated from real database records (Gross profit, sales by cashier, CSV export)
          </p>
        </div>
        <button onClick={handleExportCsv} className="btn btn-outline">
          <Download size={16} /> Export CSV
        </button>
      </div>

      <Alert type="danger" message={error} onClose={() => setError('')} />

      {/* Date Controls */}
      <div className="card" style={{ padding: '14px 20px', marginBottom: '20px' }}>
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
            <span>to</span>
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
        <LoadingSpinner text="Computing financial reports..." />
      ) : (
        <>
          {/* Key Financial Metrics */}
          <div className="grid-4" style={{ marginBottom: '24px' }}>
            <StatCard
              title="Total Revenue"
              value={`$${Number(summary.totalRevenue || 0).toFixed(2)}`}
              subtitle={`${summary.completedSalesCount || 0} completed transactions`}
              icon={DollarSign}
              color="#2563eb"
            />

            <StatCard
              title="Total Refunds"
              value={`$${Number(summary.totalRefundAmount || 0).toFixed(2)}`}
              subtitle="Returns & refunds processed"
              icon={TrendingUp}
              color="#ef4444"
            />

            <StatCard
              title="Net Revenue"
              value={`$${Number(summary.netRevenue || 0).toFixed(2)}`}
              subtitle="Total Revenue minus Refunds"
              icon={DollarSign}
              color="#10b981"
            />

            <StatCard
              title="Est. Gross Profit"
              value={`$${Number(summary.estimatedGrossProfit || 0).toFixed(2)}`}
              subtitle={`COGS: $${Number(summary.totalCostOfGoods || 0).toFixed(2)}`}
              icon={TrendingUp}
              color="#059669"
            />
          </div>

          <div className="grid-2" style={{ marginBottom: '24px' }}>
            {/* Payment Methods Breakdown */}
            <div className="card">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>
                Payment Method Breakdown
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <DollarSign color="#10b981" size={18} />
                    <span style={{ fontWeight: 500 }}>Cash Payments</span>
                  </div>
                  <span className="mono" style={{ fontWeight: 700 }}>
                    ${Number(salesReport.paymentMethods?.CASH || 0).toFixed(2)}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CreditCard color="#3b82f6" size={18} />
                    <span style={{ fontWeight: 500 }}>Scan QR Payments</span>
                  </div>
                  <span className="mono" style={{ fontWeight: 700 }}>
                    ${Number(salesReport.paymentMethods?.QR_PAYMENT || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Inventory Valuation */}
            <div className="card">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>
                Current Inventory Valuation
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Total Stocked Units:</span>
                  <span className="mono" style={{ fontWeight: 600 }}>
                    {inventoryReport.totalUnits || 0}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Inventory Asset Value (at cost):</span>
                  <span className="mono" style={{ fontWeight: 700 }}>
                    ${Number(inventoryReport.totalInventoryValue || 0).toFixed(2)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Potential Retail Value:</span>
                  <span className="mono" style={{ fontWeight: 700, color: '#2563eb' }}>
                    ${Number(inventoryReport.totalRetailValue || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Selling Products */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>
              Top Selling Products in Period
            </h3>
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
                      <th>Total Sales Volume ($)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesReport.topSellingProducts?.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600 }}>{item.name}</td>
                        <td className="mono">{item.totalQuantity}</td>
                        <td className="mono" style={{ fontWeight: 700 }}>
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
