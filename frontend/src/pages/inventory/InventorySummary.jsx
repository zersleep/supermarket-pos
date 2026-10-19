import React, { useState, useEffect } from 'react';
import {
  Boxes,
  AlertTriangle,
  Clock,
  PlusCircle,
  MinusCircle,
  FileText,
  Trash2,
  RefreshCw,
  Search,
  X,
  CheckCircle2,
  RotateCcw,
  ArrowRight,
  DollarSign,
  Package,
  Tag,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner, Alert, StatCard } from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import { getProductImageUrl } from '../../utils/productImages';

export default function InventorySummary() {
  const [activeTab, setActiveTab] = useState('batches'); // 'batches' or 'movements'
  const [summary, setSummary] = useState({});
  const [batches, setBatches] = useState([]);
  const [movements, setMovements] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filtering for Batches
  const [batchSearch, setBatchSearch] = useState('');
  const [batchStatusFilter, setBatchStatusFilter] = useState('ALL'); // 'ALL', 'GOOD', 'EXPIRING', 'EXPIRED'

  // Filtering for Movements
  const [movementSearch, setMovementSearch] = useState('');
  const [movementTypeFilter, setMovementTypeFilter] = useState('ALL');

  // Adjustment Modal State
  const [adjModalOpen, setAdjModalOpen] = useState(false);
  const [adjData, setAdjData] = useState({
    productId: '',
    batchId: '',
    type: 'ADJUSTMENT_ADD',
    quantity: '',
    reason: '',
    expiryDate: ''
  });

  // Write-Off Modal State
  const [writeOffModalOpen, setWriteOffModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [writeOffMode, setWriteOffMode] = useState('full'); // 'full' or 'partial'
  const [writeOffQuantity, setWriteOffQuantity] = useState('');
  const [writeOffReason, setWriteOffReason] = useState('');
  const [writeOffType, setWriteOffType] = useState('WRITE_OFF_EXPIRED');

  const [actionLoading, setActionLoading] = useState(false);
  const { canManageInventory } = useAuth();

  // Auto-dismiss success notification after 3.5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess('');
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [sumRes, batchRes, movRes, prodRes] = await Promise.all([
        api.get('/inventory/summary'),
        api.get('/inventory/batches?status=active&limit=100'),
        api.get('/inventory/movements?limit=100'),
        api.get('/products?limit=100&status=active')
      ]);

      setSummary(sumRes.data || {});
      setBatches(batchRes.data || []);
      setMovements(movRes.data || []);
      setProducts(prodRes.data || []);

      if (prodRes.data?.length > 0 && !adjData.productId) {
        const firstProd = prodRes.data[0];
        setAdjData((prev) => ({
          ...prev,
          productId: firstProd.id,
          batchId: firstProd.batches?.[0]?.id || ''
        }));
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

  // When selected product in adjustment modal changes, update target batch
  const handleProductSelectChange = (productId) => {
    const prod = products.find((p) => p.id === productId);
    setAdjData({
      ...adjData,
      productId,
      batchId: prod?.batches?.[0]?.id || '',
      quantity: '',
      expiryDate: ''
    });
  };

  const openAdjustmentModal = (preselectedProduct = null, preselectedBatch = null) => {
    const prod = preselectedProduct || products[0];
    setAdjData({
      productId: prod?.id || '',
      batchId: preselectedBatch?.id || prod?.batches?.[0]?.id || '',
      type: 'ADJUSTMENT_ADD',
      quantity: '',
      reason: '',
      expiryDate: ''
    });
    setAdjModalOpen(true);
  };

  const handleAdjustmentSubmit = async (e) => {
    e.preventDefault();
    if (!adjData.reason.trim() || Number(adjData.quantity) <= 0) {
      alert('Please enter a valid quantity and audit reason.');
      return;
    }

    setActionLoading(true);
    try {
      await api.post('/inventory/adjust', {
        productId: adjData.productId,
        batchId: adjData.batchId || undefined,
        type: adjData.type,
        quantity: Number(adjData.quantity),
        reason: adjData.reason,
        expiryDate: adjData.expiryDate || undefined
      });
      setSuccess('Stock adjustment successfully applied and audited.');
      setAdjModalOpen(false);
      loadData();
    } catch (err) {
      alert(err.message || 'Adjustment failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const openWriteOffModal = (batch) => {
    setSelectedBatch(batch);
    setWriteOffMode('full');
    setWriteOffQuantity(Number(batch.currentQuantity));
    setWriteOffReason('');
    const isExpired = batch.expiryDate && new Date(batch.expiryDate) < new Date();
    setWriteOffType(isExpired ? 'WRITE_OFF_EXPIRED' : 'WRITE_OFF_DAMAGED');
    setWriteOffModalOpen(true);
  };

  const handleWriteOffSubmit = async (e) => {
    e.preventDefault();
    if (!writeOffReason.trim()) {
      alert('Please specify an audit reason for write-off.');
      return;
    }

    const qty = writeOffMode === 'full' ? Number(selectedBatch?.currentQuantity) : Number(writeOffQuantity);
    if (!qty || qty <= 0 || qty > Number(selectedBatch?.currentQuantity)) {
      alert(`Please enter a valid quantity between 1 and ${selectedBatch?.currentQuantity}.`);
      return;
    }

    setActionLoading(true);
    try {
      await api.post('/inventory/write-off', {
        batchId: selectedBatch.id,
        type: writeOffType,
        quantity: qty,
        reason: writeOffReason
      });
      setSuccess(`Batch ${selectedBatch.batchNumber} write-off completed (${qty} items removed).`);
      setWriteOffModalOpen(false);
      loadData();
    } catch (err) {
      alert(err.message || 'Write-off failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const getExpiryStatus = (expiryDate) => {
    if (!expiryDate) return { label: 'No Expiry', type: 'neutral', diffDays: null };
    const now = new Date();
    const exp = new Date(expiryDate);
    const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return { label: `EXPIRED (${Math.abs(diffDays)}d ago)`, type: 'expired', diffDays };
    }
    if (diffDays <= (summary.warningDays || 30)) {
      return { label: `Expiring in ${diffDays}d`, type: 'expiring', diffDays };
    }
    return { label: `Good (${diffDays}d)`, type: 'good', diffDays };
  };

  const getExpiryBadge = (expiryDate) => {
    const status = getExpiryStatus(expiryDate);
    if (status.type === 'expired') {
      return <span className="badge badge-danger">{status.label}</span>;
    }
    if (status.type === 'expiring') {
      return <span className="badge badge-warning">{status.label}</span>;
    }
    if (status.type === 'good') {
      return <span className="badge badge-success">{status.label}</span>;
    }
    return <span className="badge badge-neutral">No Expiry</span>;
  };

  // Filtered Batches
  const filteredBatches = batches.filter((b) => {
    const matchesSearch =
      batchSearch === '' ||
      b.batchNumber.toLowerCase().includes(batchSearch.toLowerCase()) ||
      b.product?.name.toLowerCase().includes(batchSearch.toLowerCase()) ||
      b.product?.sku.toLowerCase().includes(batchSearch.toLowerCase());

    if (!matchesSearch) return false;

    const status = getExpiryStatus(b.expiryDate).type;
    if (batchStatusFilter === 'GOOD') return status === 'good';
    if (batchStatusFilter === 'EXPIRING') return status === 'expiring';
    if (batchStatusFilter === 'EXPIRED') return status === 'expired';

    return true;
  });

  // Filtered Movements
  const filteredMovements = movements.filter((m) => {
    const matchesSearch =
      movementSearch === '' ||
      m.product?.name.toLowerCase().includes(movementSearch.toLowerCase()) ||
      (m.reason && m.reason.toLowerCase().includes(movementSearch.toLowerCase())) ||
      (m.batch?.batchNumber && m.batch.batchNumber.toLowerCase().includes(movementSearch.toLowerCase()));

    if (!matchesSearch) return false;

    if (movementTypeFilter !== 'ALL' && m.movementType !== movementTypeFilter) {
      return false;
    }

    return true;
  });

  // Current product for adjustment modal
  const currentAdjProduct = products.find((p) => p.id === adjData.productId);
  const currentAdjBatch = currentAdjProduct?.batches?.find((b) => b.id === adjData.batchId);
  const currentBatchQty = currentAdjBatch ? Number(currentAdjBatch.currentQuantity) : 0;
  const adjQtyNumber = Number(adjData.quantity) || 0;
  const projectedBatchQty =
    adjData.type === 'ADJUSTMENT_ADD'
      ? (adjData.batchId ? currentBatchQty + adjQtyNumber : adjQtyNumber)
      : Math.max(0, currentBatchQty - adjQtyNumber);

  return (
    <div>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Inventory & Batch Control</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            Batch expiration tracking (FEFO), stock adjustments, and authorized write-offs
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={loadData} className="btn btn-outline btn-sm">
            <RefreshCw size={14} /> Refresh
          </button>
          {canManageInventory && (
            <button onClick={() => openAdjustmentModal()} className="btn btn-primary">
              <PlusCircle size={16} /> Stock Adjustment
            </button>
          )}
        </div>
      </div>

      <Alert type="danger" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      {/* KPI Stat Cards */}
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
          subtitle={summary.expiredCount > 0 ? 'Requires immediate write-off' : 'Zero expired stock'}
          icon={AlertTriangle}
          color={summary.expiredCount > 0 ? '#ef4444' : '#10b981'}
        />
      </div>

      {/* Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '16px',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '8px'
        }}
      >
        <button
          className={`btn ${activeTab === 'batches' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('batches')}
        >
          Active Batches & FEFO Allocation ({filteredBatches.length})
        </button>
        <button
          className={`btn ${activeTab === 'movements' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('movements')}
        >
          Stock Movements Audit Trail ({filteredMovements.length})
        </button>
      </div>

      {/* TAB 1: BATCHES */}
      {activeTab === 'batches' && (
        <>
          {/* Batches Search & Status Filter Bar */}
          <div className="card" style={{ padding: '14px 20px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
                <Search
                  size={18}
                  style={{ position: 'absolute', left: '12px', top: '10px', color: '#64748b' }}
                />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '38px', paddingRight: batchSearch ? '36px' : '14px' }}
                  placeholder="Search by product name, SKU, or batch #..."
                  value={batchSearch}
                  onChange={(e) => setBatchSearch(e.target.value)}
                />
                {batchSearch && (
                  <button
                    type="button"
                    onClick={() => setBatchSearch('')}
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
                      padding: '4px'
                    }}
                    title="Clear search"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Status Filter Pills */}
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  className={`btn btn-sm ${batchStatusFilter === 'ALL' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setBatchStatusFilter('ALL')}
                >
                  All ({batches.length})
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${batchStatusFilter === 'GOOD' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setBatchStatusFilter('GOOD')}
                >
                  Good Stock
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${batchStatusFilter === 'EXPIRING' ? 'btn-primary' : 'btn-outline'}`}
                  style={batchStatusFilter === 'EXPIRING' ? { backgroundColor: '#f59e0b', borderColor: '#f59e0b' } : {}}
                  onClick={() => setBatchStatusFilter('EXPIRING')}
                >
                  ⚠️ Expiring Soon ({summary.expiringCount || 0})
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${batchStatusFilter === 'EXPIRED' ? 'btn-primary' : 'btn-outline'}`}
                  style={batchStatusFilter === 'EXPIRED' ? { backgroundColor: '#ef4444', borderColor: '#ef4444' } : {}}
                  onClick={() => setBatchStatusFilter('EXPIRED')}
                >
                  ⛔ Expired ({summary.expiredCount || 0})
                </button>
              </div>

              {(batchSearch || batchStatusFilter !== 'ALL') && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    setBatchSearch('');
                    setBatchStatusFilter('ALL');
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <RotateCcw size={12} /> Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Batches Table */}
          <div className="card">
            {loading ? (
              <LoadingSpinner text="Loading inventory batches..." />
            ) : filteredBatches.length === 0 ? (
              <div style={{ padding: '50px 20px', textAlign: 'center', color: '#94a3b8' }}>
                No inventory batches found matching your search.
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Batch #</th>
                      <th>Quantity Available</th>
                      <th>Unit Cost</th>
                      <th>Received Date</th>
                      <th>Expiry Date</th>
                      <th>Status (FEFO)</th>
                      {canManageInventory && <th style={{ textAlign: 'right' }}>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBatches.map((b) => {
                      const img = getProductImageUrl(b.product);
                      return (
                        <tr key={b.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <img
                                src={img}
                                alt={b.product.name}
                                style={{
                                  width: '38px',
                                  height: '38px',
                                  borderRadius: '8px',
                                  objectFit: 'cover',
                                  border: '1px solid #e2e8f0',
                                  backgroundColor: '#f8fafc',
                                  flexShrink: 0
                                }}
                                onError={(e) => {
                                  e.target.src = 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=500&auto=format&fit=crop&q=80';
                                }}
                              />
                              <div>
                                <div style={{ fontWeight: 600, color: '#0f172a' }}>{b.product.name}</div>
                                <div className="mono" style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                  {b.product.sku}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="mono" style={{ fontWeight: 600, color: '#1e40af' }}>
                            {b.batchNumber}
                          </td>
                          <td style={{ fontWeight: 700, fontSize: '0.95rem' }} className="mono">
                            <span style={{ color: Number(b.currentQuantity) <= 10 ? '#dc2626' : '#0f172a' }}>
                              {Number(b.currentQuantity)}
                            </span>{' '}
                            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>
                              {b.product.unit}s
                            </span>
                          </td>
                          <td className="mono">${Number(b.costPrice).toFixed(2)}</td>
                          <td style={{ fontSize: '0.85rem' }}>{new Date(b.receivedAt).toLocaleDateString()}</td>
                          <td style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                            {b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : '—'}
                          </td>
                          <td>{getExpiryBadge(b.expiryDate)}</td>
                          {canManageInventory && (
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '6px' }}>
                                <button
                                  className="btn btn-outline btn-sm"
                                  onClick={() => openAdjustmentModal(b.product, b)}
                                  title="Quick stock adjustment for this batch"
                                >
                                  Adjust
                                </button>
                                <button
                                  className="btn btn-outline btn-sm"
                                  style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                                  onClick={() => openWriteOffModal(b)}
                                  title="Write off damaged or expired stock"
                                >
                                  <Trash2 size={13} /> Write-Off
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* TAB 2: STOCK MOVEMENTS AUDIT */}
      {activeTab === 'movements' && (
        <>
          {/* Movement Filter Bar */}
          <div className="card" style={{ padding: '14px 20px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
                <Search
                  size={18}
                  style={{ position: 'absolute', left: '12px', top: '10px', color: '#64748b' }}
                />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '38px', paddingRight: movementSearch ? '36px' : '14px' }}
                  placeholder="Search movements by product, reason, or batch #..."
                  value={movementSearch}
                  onChange={(e) => setMovementSearch(e.target.value)}
                />
                {movementSearch && (
                  <button
                    type="button"
                    onClick={() => setMovementSearch('')}
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
                      padding: '4px'
                    }}
                    title="Clear search"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              <select
                className="form-select"
                style={{ width: '200px' }}
                value={movementTypeFilter}
                onChange={(e) => setMovementTypeFilter(e.target.value)}
              >
                <option value="ALL">All Movement Types</option>
                <option value="SALE">Cashier Sale (-)</option>
                <option value="ADJUSTMENT_ADD">Stock Adjustment (+)</option>
                <option value="ADJUSTMENT_SUBTRACT">Stock Adjustment (-)</option>
                <option value="WRITE_OFF_EXPIRED">Write-Off Expired (-)</option>
                <option value="WRITE_OFF_DAMAGED">Write-Off Damaged (-)</option>
                <option value="OPENING_STOCK">Opening Stock (+)</option>
                <option value="RECEIPT">Supplier Receipt (+)</option>
              </select>

              {(movementSearch || movementTypeFilter !== 'ALL') && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    setMovementSearch('');
                    setMovementTypeFilter('ALL');
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <RotateCcw size={12} /> Clear Filters
                </button>
              )}
            </div>
          </div>

          <div className="card">
            {loading ? (
              <LoadingSpinner text="Loading stock movements..." />
            ) : filteredMovements.length === 0 ? (
              <div style={{ padding: '50px 20px', textAlign: 'center', color: '#94a3b8' }}>
                No stock movement records found matching filters.
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Date & Time</th>
                      <th>Product</th>
                      <th>Movement Type</th>
                      <th>Quantity Change</th>
                      <th>Stock Transition</th>
                      <th>Target Batch</th>
                      <th>Audit Reason</th>
                      <th>Authorized By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMovements.map((m) => {
                      const isPositive = Number(m.quantity) > 0;
                      return (
                        <tr key={m.id}>
                          <td style={{ fontSize: '0.85rem' }}>{new Date(m.createdAt).toLocaleString()}</td>
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
                              {m.movementType.replace('_', ' ')}
                            </span>
                          </td>
                          <td
                            className="mono"
                            style={{
                              fontWeight: 700,
                              color: isPositive ? '#10b981' : '#dc2626',
                              fontSize: '0.95rem'
                            }}
                          >
                            {isPositive ? `+${Number(m.quantity)}` : Number(m.quantity)}
                          </td>
                          <td className="mono" style={{ color: '#64748b', fontSize: '0.85rem' }}>
                            {Number(m.previousStock)} → <strong>{Number(m.newStock)}</strong>
                          </td>
                          <td className="mono" style={{ fontSize: '0.8rem', color: '#2563eb' }}>
                            {m.batch?.batchNumber || '—'}
                          </td>
                          <td style={{ fontSize: '0.85rem', color: '#334155' }}>{m.reason || '—'}</td>
                          <td style={{ fontSize: '0.85rem' }}>{m.user?.fullName || 'System'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* MODAL 1: WIDENED & CRYSTAL-CLEAR STOCK ADJUSTMENT MODAL */}
      <Modal
        isOpen={adjModalOpen}
        onClose={() => setAdjModalOpen(false)}
        title="Authorized Stock Adjustment"
        maxWidth="760px"
      >
        <form onSubmit={handleAdjustmentSubmit}>
          {/* Context Banner */}
          <div
            style={{
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '0.85rem',
              color: '#1e40af'
            }}
          >
            <ShieldCheck size={20} color="#2563eb" style={{ flexShrink: 0 }} />
            <div>
              Authorized managers can adjust physical inventory counts. Select a target batch to ensure stock counts update accurately.
            </div>
          </div>

          {/* Step 1: Select Product */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px'
            }}
          >
            <label className="form-label" style={{ fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
              1. Select Product to Adjust *
            </label>
            <select
              className="form-select"
              value={adjData.productId}
              onChange={(e) => handleProductSelectChange(e.target.value)}
              style={{ fontSize: '0.95rem', padding: '10px 12px' }}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku}) — Current Total Stock: {p.currentStock || 0} {p.unit}s
                </option>
              ))}
            </select>

            {currentAdjProduct && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginTop: '12px',
                  padding: '10px 14px',
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0'
                }}
              >
                <img
                  src={getProductImageUrl(currentAdjProduct)}
                  alt={currentAdjProduct.name}
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '8px',
                    objectFit: 'cover',
                    border: '1px solid #cbd5e1'
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{currentAdjProduct.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    SKU: <span className="mono">{currentAdjProduct.sku}</span> • Total in Stock:{' '}
                    <strong>{currentAdjProduct.currentStock || 0} {currentAdjProduct.unit}s</strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Target Batch & Action Type */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px'
            }}
          >
            <label className="form-label" style={{ fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
              2. Target Batch & Adjustment Type
            </label>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Target Batch to Update</label>
                <select
                  className="form-select"
                  value={adjData.batchId}
                  onChange={(e) => setAdjData({ ...adjData, batchId: e.target.value })}
                >
                  {currentAdjProduct?.batches && currentAdjProduct.batches.length > 0 ? (
                    currentAdjProduct.batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.batchNumber} (Current: {Number(b.currentQuantity)} {currentAdjProduct.unit}s{b.expiryDate ? ` - Exp: ${new Date(b.expiryDate).toLocaleDateString()}` : ''})
                      </option>
                    ))
                  ) : null}
                  {adjData.type === 'ADJUSTMENT_ADD' && (
                    <option value="">+ Receive as New Batch</option>
                  )}
                </select>
                <span style={{ fontSize: '0.725rem', color: '#64748b', marginTop: '3px', display: 'block' }}>
                  {adjData.batchId ? 'Directly modifies the stock count of this active batch.' : 'Creates a new batch in inventory.'}
                </span>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Action</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    className={`btn ${adjData.type === 'ADJUSTMENT_ADD' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setAdjData({ ...adjData, type: 'ADJUSTMENT_ADD' })}
                    style={{ fontSize: '0.85rem', padding: '9px 12px' }}
                  >
                    <PlusCircle size={15} /> Add Stock (+)
                  </button>
                  <button
                    type="button"
                    className={`btn ${adjData.type === 'ADJUSTMENT_SUBTRACT' ? 'btn-primary' : 'btn-outline'}`}
                    style={adjData.type === 'ADJUSTMENT_SUBTRACT' ? { backgroundColor: '#ef4444', borderColor: '#ef4444' } : {}}
                    onClick={() => setAdjData({ ...adjData, type: 'ADJUSTMENT_SUBTRACT' })}
                  >
                    <MinusCircle size={15} /> Subtract (-)
                  </button>
                </div>
              </div>
            </div>

            {/* If New Batch Selected on Add */}
            {adjData.type === 'ADJUSTMENT_ADD' && !adjData.batchId && (
              <div className="form-group" style={{ marginTop: '8px', marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>New Batch Expiry Date (Optional)</label>
                <input
                  type="date"
                  className="form-input"
                  value={adjData.expiryDate}
                  onChange={(e) => setAdjData({ ...adjData, expiryDate: e.target.value })}
                />
              </div>
            )}
          </div>

          {/* Step 3: Quantity & Real-Time Calculation Preview */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px'
            }}
          >
            <label className="form-label" style={{ fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
              3. Quantity & Live Stock Calculation
            </label>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>
                Quantity to {adjData.type === 'ADJUSTMENT_ADD' ? 'Add' : 'Subtract'} *
              </label>
              <input
                type="number"
                step="any"
                min="0.01"
                required
                className="form-input mono"
                placeholder="e.g. 10"
                value={adjData.quantity}
                onChange={(e) => setAdjData({ ...adjData, quantity: e.target.value })}
                style={{ fontSize: '1.1rem', fontWeight: 700, padding: '10px 14px' }}
              />
            </div>

            {/* Real-time Calculation Box */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1.5px solid #bfdbfe',
                borderRadius: '10px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '10px'
              }}
            >
              <div>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Target Batch: </span>
                <span className="mono" style={{ fontWeight: 700, color: '#1e40af' }}>
                  {currentAdjBatch ? currentAdjBatch.batchNumber : 'New Batch'}
                </span>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                  Current Batch Stock: <strong>{currentBatchQty} {currentAdjProduct?.unit}s</strong>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Projected New Batch Quantity:</span>
                <div
                  className="mono"
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: adjData.type === 'ADJUSTMENT_ADD' ? '#16a34a' : '#dc2626'
                  }}
                >
                  {projectedBatchQty} {currentAdjProduct?.unit}s
                </div>
              </div>
            </div>
          </div>

          {/* Step 4: Audit Reason */}
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label" style={{ fontWeight: 700 }}>4. Audit Reason *</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. Physical inventory recount discrepancy, supplier shipment variance..."
              value={adjData.reason}
              onChange={(e) => setAdjData({ ...adjData, reason: e.target.value })}
            />

            {/* Quick Reason Chips */}
            <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.725rem', color: '#64748b', fontWeight: 600 }}>Quick Presets:</span>
              {[
                'Physical inventory recount',
                'Supplier delivery variance',
                'Found shelf stock',
                'Internal restocking adjustment',
                'Aisle damage during handling'
              ].map((reasonText) => (
                <button
                  key={reasonText}
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                  onClick={() => setAdjData({ ...adjData, reason: reasonText })}
                >
                  {reasonText}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn-outline" onClick={() => setAdjModalOpen(false)}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={actionLoading}
              style={{ minWidth: '160px' }}
            >
              {actionLoading ? 'Applying...' : 'Apply Stock Adjustment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: WIDENED & CRYSTAL-CLEAR WRITE-OFF MODAL */}
      <Modal
        isOpen={writeOffModalOpen}
        onClose={() => setWriteOffModalOpen(false)}
        title="Authorized Batch Write-Off"
        maxWidth="660px"
      >
        <form onSubmit={handleWriteOffSubmit}>
          {/* Explanation Alert */}
          <div
            style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '10px',
              padding: '12px 16px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: '#991b1b'
            }}
          >
            <Trash2 size={22} color="#dc2626" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '0.85rem', lineHeight: 1.4 }}>
              <strong>Permanent Write-Off:</strong> Removes spoiled, expired, or damaged products from inventory. This action permanently logs an audited inventory loss.
            </div>
          </div>

          {/* Selected Batch Summary Card */}
          {selectedBatch && (
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '16px',
                display: 'flex',
                gap: '16px',
                alignItems: 'center'
              }}
            >
              <img
                src={getProductImageUrl(selectedBatch.product)}
                alt={selectedBatch.product?.name}
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '10px',
                  objectFit: 'cover',
                  border: '1px solid #cbd5e1'
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                  {selectedBatch.product?.name}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                  Batch # <strong className="mono" style={{ color: '#1e40af' }}>{selectedBatch.batchNumber}</strong> • SKU: <span className="mono">{selectedBatch.product?.sku}</span>
                </div>
                <div style={{ display: 'flex', gap: '16px', marginTop: '6px', fontSize: '0.8rem' }}>
                  <span>
                    Available: <strong>{Number(selectedBatch.currentQuantity)} {selectedBatch.product?.unit}s</strong>
                  </span>
                  <span>
                    Unit Cost: <strong>${Number(selectedBatch.costPrice).toFixed(2)}</strong>
                  </span>
                  <span>
                    Expiry: <strong>{selectedBatch.expiryDate ? new Date(selectedBatch.expiryDate).toLocaleDateString() : 'N/A'}</strong>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Write-off Type & Mode */}
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Write-Off Type *</label>
              <select
                className="form-select"
                value={writeOffType}
                onChange={(e) => setWriteOffType(e.target.value)}
              >
                <option value="WRITE_OFF_EXPIRED">Expired Stock (Past expiration date)</option>
                <option value="WRITE_OFF_DAMAGED">Damaged / Broken / Leaking Goods</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Quantity to Write Off</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  className={`btn btn-sm ${writeOffMode === 'full' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => {
                    setWriteOffMode('full');
                    setWriteOffQuantity(Number(selectedBatch?.currentQuantity));
                  }}
                >
                  All ({Number(selectedBatch?.currentQuantity)})
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${writeOffMode === 'partial' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => {
                    setWriteOffMode('partial');
                    setWriteOffQuantity(1);
                  }}
                >
                  Partial Quantity
                </button>
              </div>
            </div>
          </div>

          {/* If Partial Quantity */}
          {writeOffMode === 'partial' && (
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Specify Quantity to Discard *</label>
              <input
                type="number"
                step="any"
                min="0.01"
                max={Number(selectedBatch?.currentQuantity)}
                required
                className="form-input mono"
                value={writeOffQuantity}
                onChange={(e) => setWriteOffQuantity(e.target.value)}
                placeholder="Number of units damaged..."
              />
            </div>
          )}

          {/* Estimated Financial Loss Card */}
          <div
            style={{
              backgroundColor: '#fff1f2',
              border: '1px solid #fecdd3',
              borderRadius: '10px',
              padding: '12px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}
          >
            <div>
              <span style={{ fontSize: '0.8rem', color: '#9f1239' }}>Estimated Financial Loss Value:</span>
              <div style={{ fontSize: '0.75rem', color: '#e11d48' }}>
                ({writeOffMode === 'full' ? Number(selectedBatch?.currentQuantity) : Number(writeOffQuantity) || 0} units × ${Number(selectedBatch?.costPrice || 0).toFixed(2)})
              </div>
            </div>
            <div className="mono" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#be123c' }}>
              -${((writeOffMode === 'full' ? Number(selectedBatch?.currentQuantity) : Number(writeOffQuantity) || 0) * Number(selectedBatch?.costPrice || 0)).toFixed(2)} USD
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Audit Reason *</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. Past expiration date, bottle ruptured in store..."
              value={writeOffReason}
              onChange={(e) => setWriteOffReason(e.target.value)}
            />

            <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.725rem', color: '#64748b', fontWeight: 600 }}>Quick Presets:</span>
              {[
                'Expired past shelf life',
                'Packaging ruptured or broken',
                'Cold chain temperature failure',
                'Spoiled or pest contamination'
              ].map((reasonText) => (
                <button
                  key={reasonText}
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                  onClick={() => setWriteOffReason(reasonText)}
                >
                  {reasonText}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn-outline" onClick={() => setWriteOffModalOpen(false)}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn"
              style={{ backgroundColor: '#dc2626', color: '#ffffff', minWidth: '150px' }}
              disabled={actionLoading}
            >
              {actionLoading ? 'Processing...' : 'Confirm Write-Off'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
