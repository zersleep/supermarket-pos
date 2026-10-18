import React, { useState, useEffect } from 'react';
import {
  Boxes,
  AlertTriangle,
  Clock,
  PlusCircle,
  MinusCircle,
  FileText,
  Trash2,
  RefreshCw
} from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner, Alert, StatCard } from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';

export default function InventorySummary() {
  const [activeTab, setActiveTab] = useState('batches'); // 'batches' or 'movements'
  const [summary, setSummary] = useState({});
  const [batches, setBatches] = useState([]);
  const [movements, setMovements] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Adjustment Modal
  const [adjModalOpen, setAdjModalOpen] = useState(false);
  const [adjData, setAdjData] = useState({
    productId: '',
    type: 'ADJUSTMENT_ADD',
    quantity: '',
    reason: ''
  });

  // Write-Off Modal
  const [writeOffModalOpen, setWriteOffModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [writeOffReason, setWriteOffReason] = useState('');
  const [writeOffType, setWriteOffType] = useState('WRITE_OFF_EXPIRED');

  const [actionLoading, setActionLoading] = useState(false);

  const { canManageInventory } = useAuth();

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [sumRes, batchRes, movRes, prodRes] = await Promise.all([
        api.get('/inventory/summary'),
        api.get('/inventory/batches?status=active&limit=50'),
        api.get('/inventory/movements?limit=50'),
        api.get('/products?limit=100&status=active')
      ]);

      setSummary(sumRes.data || {});
      setBatches(batchRes.data || []);
      setMovements(movRes.data || []);
      setProducts(prodRes.data || []);
      if (prodRes.data?.length > 0) {
        setAdjData((prev) => ({ ...prev, productId: prodRes.data[0].id }));
      }
    } catch (err) {
      setError(err.message || 'Failed to load inventory data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAdjustmentSubmit = async (e) => {
    e.preventDefault();
    if (!adjData.reason.trim() || Number(adjData.quantity) <= 0) {
      alert('Please fill in a valid quantity and audit reason.');
      return;
    }

    setActionLoading(true);
    try {
      await api.post('/inventory/adjust', {
        productId: adjData.productId,
        type: adjData.type,
        quantity: Number(adjData.quantity),
        reason: adjData.reason
      });
      setSuccess('Stock adjustment successfully applied and audited.');
      setAdjModalOpen(false);
      setAdjData({ productId: products[0]?.id || '', type: 'ADJUSTMENT_ADD', quantity: '', reason: '' });
      loadData();
    } catch (err) {
      alert(err.message || 'Adjustment failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleWriteOffSubmit = async (e) => {
    e.preventDefault();
    if (!writeOffReason.trim()) {
      alert('Please specify a reason for write-off.');
      return;
    }

    setActionLoading(true);
    try {
      await api.post('/inventory/write-off', {
        batchId: selectedBatch.id,
        type: writeOffType,
        reason: writeOffReason
      });
      setSuccess(`Batch ${selectedBatch.batchNumber} written off.`);
      setWriteOffModalOpen(false);
      loadData();
    } catch (err) {
      alert(err.message || 'Write-off failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const getExpiryBadge = (expiryDate) => {
    if (!expiryDate) return <span className="badge badge-neutral">No Expiry</span>;
    const now = new Date();
    const exp = new Date(expiryDate);
    const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return <span className="badge badge-danger">EXPIRED ({Math.abs(diffDays)}d ago)</span>;
    }
    if (diffDays <= (summary.warningDays || 30)) {
      return <span className="badge badge-warning">Expiring in {diffDays}d</span>;
    }
    return <span className="badge badge-success">Good ({diffDays}d)</span>;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Inventory, Batches & FEFO Tracking</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            Traceable stock movements, lot expiry dates, and authorized adjustments
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={loadData} className="btn btn-outline btn-sm">
            <RefreshCw size={14} /> Refresh
          </button>
          {canManageInventory && (
            <button onClick={() => setAdjModalOpen(true)} className="btn btn-primary">
              <PlusCircle size={16} /> Stock Adjustment
            </button>
          )}
        </div>
      </div>

      <Alert type="danger" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      {/* KPI Cards */}
      <div className="grid-3" style={{ marginBottom: '20px' }}>
        <StatCard
          title="Active Products"
          value={summary.totalProducts || 0}
          subtitle={`${summary.lowStockCount || 0} items low on stock`}
          icon={Boxes}
          color="#2563eb"
        />

        <StatCard
          title="Expiring Soon"
          value={summary.expiringCount || 0}
          subtitle={`Batches expiring within ${summary.warningDays || 30} days`}
          icon={Clock}
          color="#f59e0b"
        />

        <StatCard
          title="Expired Batches"
          value={summary.expiredCount || 0}
          subtitle="Blocked from sales. Action required."
          icon={AlertTriangle}
          color={summary.expiredCount > 0 ? '#ef4444' : '#10b981'}
        />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
        <button
          className={`btn ${activeTab === 'batches' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('batches')}
        >
          Active Batches & FEFO Allocation ({batches.length})
        </button>
        <button
          className={`btn ${activeTab === 'movements' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('movements')}
        >
          Stock Movements Audit Trail ({movements.length})
        </button>
      </div>

      {/* Tab 1: Batches */}
      {activeTab === 'batches' && (
        <div className="card">
          {loading ? (
            <LoadingSpinner text="Loading inventory batches..." />
          ) : batches.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
              No inventory batches found. Receive goods or add opening stock to populate batches.
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Batch #</th>
                    <th>Product Name</th>
                    <th>SKU</th>
                    <th>Quantity Available</th>
                    <th>Cost ($)</th>
                    <th>Received Date</th>
                    <th>Expiry Date</th>
                    <th>Status</th>
                    {canManageInventory && <th style={{ textAlign: 'right' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {batches.map((b) => (
                    <tr key={b.id}>
                      <td className="mono" style={{ fontWeight: 600 }}>
                        {b.batchNumber}
                      </td>
                      <td style={{ fontWeight: 600 }}>{b.product.name}</td>
                      <td className="mono" style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        {b.product.sku}
                      </td>
                      <td style={{ fontWeight: 700 }} className="mono">
                        {Number(b.currentQuantity)} {b.product.unit}s
                      </td>
                      <td className="mono">${Number(b.costPrice).toFixed(2)}</td>
                      <td>{new Date(b.receivedAt).toLocaleDateString()}</td>
                      <td>{b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : '—'}</td>
                      <td>{getExpiryBadge(b.expiryDate)}</td>
                      {canManageInventory && (
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                            onClick={() => {
                              setSelectedBatch(b);
                              setWriteOffModalOpen(true);
                            }}
                            title="Write off damaged or expired stock"
                          >
                            <Trash2 size={14} /> Write-Off
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Stock Movements Audit */}
      {activeTab === 'movements' && (
        <div className="card">
          {loading ? (
            <LoadingSpinner text="Loading stock movements..." />
          ) : movements.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
              No stock movements recorded yet.
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Product</th>
                    <th>Type</th>
                    <th>Quantity Change</th>
                    <th>Previous → New Stock</th>
                    <th>Reason / Reference</th>
                    <th>User</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => {
                    const isPositive = Number(m.quantity) > 0;
                    return (
                      <tr key={m.id}>
                        <td>{new Date(m.createdAt).toLocaleString()}</td>
                        <td style={{ fontWeight: 600 }}>{m.product.name}</td>
                        <td>
                          <span
                            className={`badge ${
                              m.movementType === 'RECEIPT' || m.movementType === 'OPENING_STOCK'
                                ? 'badge-success'
                                : m.movementType === 'SALE'
                                ? 'badge-primary'
                                : m.movementType.includes('WRITE_OFF')
                                ? 'badge-danger'
                                : 'badge-warning'
                            }`}
                          >
                            {m.movementType}
                          </span>
                        </td>
                        <td
                          className="mono"
                          style={{
                            fontWeight: 700,
                            color: isPositive ? '#10b981' : '#dc2626'
                          }}
                        >
                          {isPositive ? `+${Number(m.quantity)}` : Number(m.quantity)}
                        </td>
                        <td className="mono" style={{ color: '#64748b', fontSize: '0.8rem' }}>
                          {Number(m.previousStock)} → {Number(m.newStock)}
                        </td>
                        <td style={{ fontSize: '0.8rem' }}>{m.reason || '—'}</td>
                        <td>{m.user?.fullName || 'System'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Manual Stock Adjustment Modal */}
      <Modal
        isOpen={adjModalOpen}
        onClose={() => setAdjModalOpen(false)}
        title="Authorized Stock Adjustment"
        maxWidth="500px"
      >
        <form onSubmit={handleAdjustmentSubmit}>
          <div className="form-group">
            <label className="form-label">Target Product *</label>
            <select
              className="form-select"
              value={adjData.productId}
              onChange={(e) => setAdjData({ ...adjData, productId: e.target.value })}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku}) — Available: {p.currentStock} {p.unit}s
                </option>
              ))}
            </select>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Adjustment Type *</label>
              <select
                className="form-select"
                value={adjData.type}
                onChange={(e) => setAdjData({ ...adjData, type: e.target.value })}
              >
                <option value="ADJUSTMENT_ADD">Add Stock (+)</option>
                <option value="ADJUSTMENT_SUBTRACT">Subtract Stock (-)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Quantity *</label>
              <input
                type="number"
                step="any"
                min="0.01"
                required
                className="form-input mono"
                placeholder="0"
                value={adjData.quantity}
                onChange={(e) => setAdjData({ ...adjData, quantity: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Audit Reason *</label>
            <textarea
              required
              rows="3"
              className="form-textarea"
              placeholder="e.g. Physical inventory count discrepancy, stock audit reconciliation..."
              value={adjData.reason}
              onChange={(e) => setAdjData({ ...adjData, reason: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn-outline" onClick={() => setAdjModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={actionLoading}>
              {actionLoading ? 'Applying...' : 'Apply Stock Adjustment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Write-Off Batch Modal */}
      <Modal
        isOpen={writeOffModalOpen}
        onClose={() => setWriteOffModalOpen(false)}
        title={`Write-Off Batch (${selectedBatch?.batchNumber})`}
        maxWidth="480px"
      >
        <form onSubmit={handleWriteOffSubmit}>
          <div style={{ marginBottom: '14px', backgroundColor: '#fef2f2', padding: '12px', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.85rem', color: '#991b1b', fontWeight: 600 }}>
              Batch: {selectedBatch?.batchNumber} — {selectedBatch?.product?.name}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#b91c1c', marginTop: '2px' }}>
              Remaining Quantity to Write-Off: <strong>{Number(selectedBatch?.currentQuantity)} {selectedBatch?.product?.unit}s</strong>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Write-Off Type *</label>
            <select
              className="form-select"
              value={writeOffType}
              onChange={(e) => setWriteOffType(e.target.value)}
            >
              <option value="WRITE_OFF_EXPIRED">Expired Stock</option>
              <option value="WRITE_OFF_DAMAGED">Damaged / Broken Goods</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Write-Off Reason *</label>
            <textarea
              required
              rows="3"
              className="form-textarea"
              placeholder="e.g. Past expiration date, packaging ruptured during transit..."
              value={writeOffReason}
              onChange={(e) => setWriteOffReason(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn-outline" onClick={() => setWriteOffModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-danger" disabled={actionLoading}>
              {actionLoading ? 'Processing...' : 'Confirm Write-Off'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
