import React, { useState, useEffect } from 'react';
import { Plus, FileText, CheckCircle2, PackageCheck, Eye, Truck } from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner, Alert } from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';

export default function PurchaseOrders() {
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create PO Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [poItems, setPoItems] = useState([
    { productId: '', quantityOrdered: 10, unitCost: 1.00 }
  ]);
  const [actionLoading, setActionLoading] = useState(false);

  // View PO & Goods Receiving Modal
  const [viewPo, setViewPo] = useState(null);
  const [receivingModalOpen, setReceivingModalOpen] = useState(false);
  const [receiptItems, setReceiptItems] = useState([]);
  const [receiptNotes, setReceiptNotes] = useState('');

  const { canManageInventory } = useAuth();

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [poRes, supRes, prodRes] = await Promise.all([
        api.get('/purchasing/orders'),
        api.get('/suppliers'),
        api.get('/products?limit=100&status=active')
      ]);
      setOrders(poRes.data || []);
      setSuppliers(supRes.data || []);
      setProducts(prodRes.data || []);

      if (supRes.data?.length > 0) setSupplierId(supRes.data[0].id);
      if (prodRes.data?.length > 0) {
        setPoItems([{ productId: prodRes.data[0].id, quantityOrdered: 10, unitCost: Number(prodRes.data[0].costPrice) }]);
      }
    } catch (err) {
      setError(err.message || 'Failed to load purchase orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddItemRow = () => {
    if (products.length > 0) {
      setPoItems([
        ...poItems,
        { productId: products[0].id, quantityOrdered: 10, unitCost: Number(products[0].costPrice) }
      ]);
    }
  };

  const handleRemoveItemRow = (index) => {
    setPoItems(poItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...poItems];
    updated[index][field] = value;
    if (field === 'productId') {
      const p = products.find((prod) => prod.id === value);
      if (p) updated[index].unitCost = Number(p.costPrice);
    }
    setPoItems(updated);
  };

  const handleCreatePo = async (e) => {
    e.preventDefault();
    if (!supplierId || poItems.length === 0) {
      alert('Please select a supplier and at least one item.');
      return;
    }

    setActionLoading(true);
    try {
      await api.post('/purchasing/orders', {
        supplierId,
        expectedDate: expectedDate || undefined,
        notes: notes || undefined,
        items: poItems.map((i) => ({
          productId: i.productId,
          quantityOrdered: Number(i.quantityOrdered),
          unitCost: Number(i.unitCost)
        }))
      });

      setSuccess('Purchase order created in Draft status.');
      setCreateModalOpen(false);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to create purchase order.');
    } finally {
      setActionLoading(false);
    }
  };

  const updateStatus = async (poId, newStatus) => {
    try {
      await api.patch(`/purchasing/orders/${poId}/status`, { status: newStatus });
      setSuccess(`PO status updated to ${newStatus}.`);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to update status.');
    }
  };

  const openReceivingModal = async (poId) => {
    try {
      const res = await api.get(`/purchasing/orders/${poId}`);
      const po = res.data;
      setViewPo(po);

      // Pre-fill receiving items with remaining quantities
      const itemsToReceive = po.items.map((item) => {
        const remaining = Math.max(0, Number(item.quantityOrdered) - Number(item.quantityReceived));
        const defaultExpiry = new Date();
        defaultExpiry.setDate(defaultExpiry.getDate() + 90);
        return {
          poItemId: item.id,
          productId: item.productId,
          productName: item.product.name,
          quantityOrdered: Number(item.quantityOrdered),
          quantityReceivedAlready: Number(item.quantityReceived),
          quantityReceivingNow: remaining,
          unitCost: Number(item.unitCost),
          batchNumber: `BATCH-${Date.now().toString().slice(-6)}`,
          expiryDate: defaultExpiry.toISOString().slice(0, 10)
        };
      });

      setReceiptItems(itemsToReceive);
      setReceiptNotes('');
      setReceivingModalOpen(true);
    } catch (err) {
      alert(err.message || 'Failed to open receiving wizard.');
    }
  };

  const handleReceivingSubmit = async (e) => {
    e.preventDefault();
    const itemsToSubmit = receiptItems
      .filter((i) => Number(i.quantityReceivingNow) > 0)
      .map((i) => ({
        poItemId: i.poItemId,
        productId: i.productId,
        quantityReceived: Number(i.quantityReceivingNow),
        unitCost: Number(i.unitCost),
        batchNumber: i.batchNumber.trim(),
        expiryDate: i.expiryDate || undefined
      }));

    if (itemsToSubmit.length === 0) {
      alert('Please enter a receiving quantity > 0 for at least one item.');
      return;
    }

    setActionLoading(true);
    try {
      await api.post('/purchasing/receiving', {
        poId: viewPo.id,
        notes: receiptNotes || undefined,
        items: itemsToSubmit
      });

      setSuccess('Goods received successfully! Stock batches and movements have been updated.');
      setReceivingModalOpen(false);
      loadData();
    } catch (err) {
      alert(err.message || 'Goods receiving failed.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Purchase Orders & Goods Receiving</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            Lifecycle: Draft → Submitted → Approved → Goods Receipt (Inventory Added)
          </p>
        </div>
        {canManageInventory && (
          <button onClick={() => setCreateModalOpen(true)} className="btn btn-primary">
            <Plus size={16} /> Create Purchase Order
          </button>
        )}
      </div>

      <Alert type="danger" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      {/* PO Table */}
      <div className="card">
        {loading ? (
          <LoadingSpinner text="Loading purchase orders..." />
        ) : orders.length === 0 ? (
          <div style={{ padding: '50px', textAlign: 'center', color: '#94a3b8' }}>
            No purchase orders created yet.
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>PO #</th>
                  <th>Supplier</th>
                  <th>Order Date</th>
                  <th>Expected Date</th>
                  <th>Total Cost ($)</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((po) => (
                  <tr key={po.id}>
                    <td className="mono" style={{ fontWeight: 600 }}>
                      {po.poNumber}
                    </td>
                    <td style={{ fontWeight: 600 }}>{po.supplier.name}</td>
                    <td>{new Date(po.orderDate).toLocaleDateString()}</td>
                    <td>{po.expectedDate ? new Date(po.expectedDate).toLocaleDateString() : '—'}</td>
                    <td className="mono" style={{ fontWeight: 700 }}>
                      ${Number(po.totalCost).toFixed(2)}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          po.status === 'FULLY_RECEIVED'
                            ? 'badge-success'
                            : po.status === 'PARTIALLY_RECEIVED'
                            ? 'badge-warning'
                            : po.status === 'APPROVED'
                            ? 'badge-primary'
                            : po.status === 'CANCELLED'
                            ? 'badge-danger'
                            : 'badge-neutral'
                        }`}
                      >
                        {po.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        {po.status === 'DRAFT' && (
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => updateStatus(po.id, 'SUBMITTED')}
                          >
                            Submit
                          </button>
                        )}
                        {po.status === 'SUBMITTED' && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => updateStatus(po.id, 'APPROVED')}
                          >
                            Approve
                          </button>
                        )}
                        {(po.status === 'APPROVED' || po.status === 'PARTIALLY_RECEIVED') && (
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => openReceivingModal(po.id)}
                          >
                            <PackageCheck size={14} /> Receive Goods
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

      {/* Create Purchase Order Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New Purchase Order"
        maxWidth="650px"
      >
        <form onSubmit={handleCreatePo}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Supplier *</label>
              <select
                className="form-select"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                required
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Expected Delivery Date</label>
              <input
                type="date"
                className="form-input"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Ordered Items</label>
              <button type="button" className="btn btn-outline btn-sm" onClick={handleAddItemRow}>
                <Plus size={14} /> Add Item
              </button>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Unit Cost ($)</th>
                    <th>Line Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {poItems.map((item, idx) => (
                    <tr key={idx}>
                      <td>
                        <select
                          className="form-select"
                          style={{ padding: '4px 6px', fontSize: '0.85rem' }}
                          value={item.productId}
                          onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.sku})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          className="form-input mono"
                          style={{ width: '70px', padding: '4px 6px' }}
                          value={item.quantityOrdered}
                          onChange={(e) => handleItemChange(idx, 'quantityOrdered', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="form-input mono"
                          style={{ width: '80px', padding: '4px 6px' }}
                          value={item.unitCost}
                          onChange={(e) => handleItemChange(idx, 'unitCost', e.target.value)}
                        />
                      </td>
                      <td className="mono" style={{ fontWeight: 600 }}>
                        ${(Number(item.quantityOrdered) * Number(item.unitCost)).toFixed(2)}
                      </td>
                      <td>
                        {poItems.length > 1 && (
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            style={{ color: '#ef4444', border: 'none' }}
                            onClick={() => handleRemoveItemRow(idx)}
                          >
                            ✕
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea
              rows="2"
              className="form-textarea"
              placeholder="Delivery instructions or purchasing notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn-outline" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={actionLoading}>
              {actionLoading ? 'Creating...' : 'Create Draft PO'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Receive Goods Modal (Phase 7: Goods Receiving) */}
      <Modal
        isOpen={receivingModalOpen}
        onClose={() => setReceivingModalOpen(false)}
        title={`Receive Goods against PO (${viewPo?.poNumber})`}
        maxWidth="750px"
      >
        <form onSubmit={handleReceivingSubmit}>
          <div style={{ marginBottom: '14px', backgroundColor: '#ecfdf5', padding: '12px', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.85rem', color: '#065f46', fontWeight: 600 }}>
              Supplier: {viewPo?.supplier?.name}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#047857' }}>
              Confirm received quantities, assign batch numbers, and input expiry dates. Stock will be immediately updated.
            </div>
          </div>

          <div className="table-container" style={{ marginBottom: '16px' }}>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Ordered</th>
                  <th>Received Qty *</th>
                  <th>Batch Number *</th>
                  <th>Expiry Date</th>
                </tr>
              </thead>
              <tbody>
                {receiptItems.map((item, idx) => (
                  <tr key={item.poItemId}>
                    <td style={{ fontWeight: 600, fontSize: '0.85rem' }}>{item.productName}</td>
                    <td className="mono" style={{ fontSize: '0.85rem' }}>
                      {item.quantityOrdered} ({item.quantityReceivedAlready} done)
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        className="form-input mono"
                        style={{ width: '80px', padding: '4px 6px' }}
                        value={item.quantityReceivingNow}
                        onChange={(e) => {
                          const updated = [...receiptItems];
                          updated[idx].quantityReceivingNow = e.target.value;
                          setReceiptItems(updated);
                        }}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        required
                        className="form-input mono"
                        style={{ width: '130px', padding: '4px 6px' }}
                        value={item.batchNumber}
                        onChange={(e) => {
                          const updated = [...receiptItems];
                          updated[idx].batchNumber = e.target.value;
                          setReceiptItems(updated);
                        }}
                      />
                    </td>
                    <td>
                      <input
                        type="date"
                        className="form-input"
                        style={{ width: '130px', padding: '4px 6px' }}
                        value={item.expiryDate}
                        onChange={(e) => {
                          const updated = [...receiptItems];
                          updated[idx].expiryDate = e.target.value;
                          setReceiptItems(updated);
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="form-group">
            <label className="form-label">Receiving Inspection Notes</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Delivery arrived in good condition, seal intact"
              value={receiptNotes}
              onChange={(e) => setReceiptNotes(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn-outline" onClick={() => setReceivingModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-success" disabled={actionLoading}>
              {actionLoading ? 'Recording Receipt...' : 'Confirm Goods Receipt & Add Stock'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
