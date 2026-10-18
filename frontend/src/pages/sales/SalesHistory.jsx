import React, { useState, useEffect } from 'react';
import { Search, Eye, RotateCcw, Calendar, Filter, X } from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner, Alert } from '../../components/common/LoadingSpinner';
import ReceiptModal from '../../components/receipt/ReceiptModal';
import Modal from '../../components/common/Modal';

export default function SalesHistory() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Receipt Modal State
  const [selectedSale, setSelectedSale] = useState(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  // Refund Modal State
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundSale, setRefundSale] = useState(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundItems, setRefundItems] = useState([]);
  const [refundLoading, setRefundLoading] = useState(false);

  const { isOwner, isAdmin } = useAuth();
  const canRefund = isOwner || isAdmin;

  const fetchSales = async (query = search) => {
    try {
      setLoading(true);
      setError('');
      let url = `/sales?search=${encodeURIComponent(query)}&status=${statusFilter}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;

      const res = await api.get(url);
      setSales(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load sales history.');
    } finally {
      setLoading(false);
    }
  };

  // Automatically fetch on filter change or debounced search typing
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSales(search);
    }, 280);
    return () => clearTimeout(timer);
  }, [search, statusFilter, startDate, endDate]);

  const handleClearSearch = () => {
    setSearch('');
  };

  const openReceipt = async (saleId) => {
    try {
      const res = await api.get(`/sales/${saleId}`);
      setSelectedSale(res.data.sale);
      setReceiptOpen(true);
    } catch (err) {
      setError(err.message || 'Failed to load receipt details.');
    }
  };

  const openRefundModal = async (saleId) => {
    try {
      const res = await api.get(`/sales/${saleId}`);
      const sale = res.data.sale;
      setRefundSale(sale);
      setRefundReason('');

      // Initialize refund item rows
      const items = sale.items.map((si) => ({
        saleItemId: si.id,
        name: si.productNameSnapshot,
        unitPrice: Number(si.unitPriceSnapshot),
        originalQty: Number(si.quantity),
        quantityToRefund: 0,
        refundAmount: 0,
        restock: true,
        condition: 'GOOD'
      }));
      setRefundItems(items);
      setRefundModalOpen(true);
    } catch (err) {
      setError(err.message || 'Failed to prepare refund.');
    }
  };

  const handleItemRefundChange = (index, field, value) => {
    const updated = [...refundItems];
    updated[index][field] = value;

    if (field === 'quantityToRefund') {
      const qty = Number(value) || 0;
      updated[index].refundAmount = Math.round(qty * updated[index].unitPrice * 100) / 100;
    }

    setRefundItems(updated);
  };

  const handleProcessRefund = async (e) => {
    e.preventDefault();
    if (!refundReason.trim()) {
      alert('Please provide a reason for the refund.');
      return;
    }

    const itemsToSubmit = refundItems
      .filter((i) => Number(i.quantityToRefund) > 0)
      .map((i) => ({
        saleItemId: i.saleItemId,
        quantity: Number(i.quantityToRefund),
        refundAmount: Number(i.refundAmount),
        restock: i.restock,
        condition: i.condition
      }));

    if (itemsToSubmit.length === 0) {
      alert('Please select at least one item to refund with quantity > 0.');
      return;
    }

    setRefundLoading(true);
    try {
      await api.post('/sales/refund', {
        saleId: refundSale.id,
        reason: refundReason,
        items: itemsToSubmit
      });

      setRefundModalOpen(false);
      fetchSales();
    } catch (err) {
      alert(err.message || 'Failed to process refund.');
    } finally {
      setRefundLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Sales History & Receipts</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            Historical transactions, receipt inspection, and authorized returns
          </p>
        </div>
      </div>

      <Alert type="danger" message={error} onClose={() => setError('')} />

      {/* Filter Bar */}
      <div className="card" style={{ padding: '14px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search
              size={18}
              style={{ position: 'absolute', left: '12px', top: '10px', color: '#64748b' }}
            />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '38px', paddingRight: search ? '36px' : '14px' }}
              placeholder="Search receipt # or sale #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={handleClearSearch}
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
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="PENDING">Pending</option>
            <option value="PARTIALLY_REFUNDED">Partially Refunded</option>
            <option value="REFUNDED">Fully Refunded</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <input
            type="date"
            className="form-input"
            style={{ width: '150px' }}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            title="Start Date"
          />

          <input
            type="date"
            className="form-input"
            style={{ width: '150px' }}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            title="End Date"
          />

          {(search || statusFilter || startDate || endDate) && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setSearch('');
                setStatusFilter('');
                setStartDate('');
                setEndDate('');
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              title="Reset all filters"
            >
              <RotateCcw size={14} /> Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Sales Table */}
      <div className="card">
        {loading ? (
          <LoadingSpinner text="Loading sales records..." />
        ) : sales.length === 0 ? (
          <div style={{ padding: '50px 20px', textAlign: 'center', color: '#94a3b8' }}>
            No sales records found matching filters.
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Receipt #</th>
                  <th>Date & Time</th>
                  <th>Cashier</th>
                  <th>Payment Method</th>
                  <th>Status</th>
                  <th>Total (USD)</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id}>
                    <td style={{ fontWeight: 600 }} className="mono">
                      {sale.receiptNumber}
                    </td>
                    <td>{new Date(sale.createdAt).toLocaleString()}</td>
                    <td>{sale.cashier?.fullName || 'N/A'}</td>
                    <td>{sale.payments?.map((p) => (p.method === 'QR_PAYMENT' ? 'Scan QR' : (p.method === 'CASH' ? 'Cash' : p.method))).join(', ') || 'N/A'}</td>
                    <td>
                      <span
                        className={`badge ${
                          sale.paymentStatus === 'COMPLETED'
                            ? 'badge-success'
                            : sale.paymentStatus === 'PENDING'
                            ? 'badge-warning'
                            : sale.paymentStatus.includes('REFUNDED')
                            ? 'badge-neutral'
                            : 'badge-danger'
                        }`}
                      >
                        {sale.paymentStatus}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }} className="mono">
                      ${Number(sale.grandTotal).toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => openReceipt(sale.id)}
                          title="View Printable Receipt"
                        >
                          <Eye size={14} /> Receipt
                        </button>
                        {canRefund && ['COMPLETED', 'PARTIALLY_REFUNDED'].includes(sale.paymentStatus) && (
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                            onClick={() => openRefundModal(sale.id)}
                            title="Process Return or Refund"
                          >
                            <RotateCcw size={14} /> Refund
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Printable Receipt Modal */}
      <ReceiptModal
        isOpen={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        saleData={selectedSale}
      />

      {/* Authorized Refund Modal */}
      <Modal
        isOpen={refundModalOpen}
        onClose={() => setRefundModalOpen(false)}
        title={`Process Return / Refund (${refundSale?.receiptNumber})`}
        maxWidth="650px"
      >
        <form onSubmit={handleProcessRefund}>
          <div className="form-group">
            <label className="form-label">Refund Reason *</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. Customer returned damaged goods, wrong size, or expired"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label className="form-label">Select Items to Refund</label>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Bought</th>
                    <th>Refund Qty</th>
                    <th>Refund $</th>
                    <th>Restock?</th>
                  </tr>
                </thead>
                <tbody>
                  {refundItems.map((item, idx) => (
                    <tr key={item.saleItemId}>
                      <td style={{ fontWeight: 600 }}>{item.name}</td>
                      <td>{item.originalQty}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          max={item.originalQty}
                          step="1"
                          className="form-input mono"
                          style={{ width: '70px', padding: '4px 6px' }}
                          value={item.quantityToRefund}
                          onChange={(e) => handleItemRefundChange(idx, 'quantityToRefund', e.target.value)}
                        />
                      </td>
                      <td className="mono">${item.refundAmount.toFixed(2)}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input
                            type="checkbox"
                            checked={item.restock}
                            onChange={(e) => handleItemRefundChange(idx, 'restock', e.target.checked)}
                          />
                          {item.restock && (
                            <select
                              className="form-select"
                              style={{ width: '90px', padding: '2px 4px', fontSize: '0.75rem' }}
                              value={item.condition}
                              onChange={(e) => handleItemRefundChange(idx, 'condition', e.target.value)}
                            >
                              <option value="GOOD">Good</option>
                              <option value="DAMAGED">Damaged</option>
                            </select>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px', display: 'block' }}>
              Note: Restocking only adds items back to available inventory if condition is set to "Good".
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setRefundModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-danger" disabled={refundLoading}>
              {refundLoading ? 'Processing...' : 'Authorize Refund'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
