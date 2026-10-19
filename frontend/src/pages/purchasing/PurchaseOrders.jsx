import React, { useState, useEffect } from 'react';
import {
  Plus,
  FileText,
  CheckCircle2,
  PackageCheck,
  Eye,
  Truck,
  Search,
  X,
  RotateCcw,
  Building2,
  Calendar,
  Clock,
  AlertTriangle,
  ArrowRight,
  Boxes,
  DollarSign,
  User,
  Phone,
  Mail,
  Trash2,
  Tag,
  Filter
} from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner, Alert, StatCard } from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import { getProductImageUrl } from '../../utils/productImages';

export default function PurchaseOrders() {
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filtering & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Create PO Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [poItems, setPoItems] = useState([
    { productId: '', quantityOrdered: 10, unitCost: 1.0 }
  ]);
  const [actionLoading, setActionLoading] = useState(false);

  // View PO Details Modal
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedPoDetails, setSelectedPoDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Goods Receiving Modal
  const [viewPo, setViewPo] = useState(null);
  const [receivingModalOpen, setReceivingModalOpen] = useState(false);
  const [receiptItems, setReceiptItems] = useState([]);
  const [receiptNotes, setReceiptNotes] = useState('');

  const { canManageInventory } = useAuth();

  // Auto-dismiss success notification
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 3500);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [poRes, supRes, prodRes] = await Promise.all([
        api.get('/purchasing/orders?limit=100'),
        api.get('/suppliers?status=all&limit=100'),
        api.get('/products?limit=150&status=active')
      ]);
      setOrders(poRes.data || []);
      setSuppliers(supRes.data || []);
      setProducts(prodRes.data || []);

      if (supRes.data?.length > 0 && !supplierId) {
        setSupplierId(supRes.data[0].id);
      }
      if (prodRes.data?.length > 0 && poItems.length === 1 && !poItems[0].productId) {
        setPoItems([
          {
            productId: prodRes.data[0].id,
            quantityOrdered: 10,
            unitCost: Number(prodRes.data[0].costPrice) || 1.0
          }
        ]);
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

  const openCreateModal = () => {
    const activeSuppliers = suppliers.filter((s) => s.isActive);
    const defaultSupplier = activeSuppliers[0]?.id || suppliers[0]?.id || '';
    setSupplierId(defaultSupplier);
    setShowAllProducts(false);
    setExpectedDate('');
    setNotes('');

    const linkedProds = products.filter(
      (p) => p.preferredSupplierId === defaultSupplier || p.preferredSupplier?.id === defaultSupplier
    );
    const defaultProduct = linkedProds[0] || products[0];

    setPoItems([
      {
        productId: defaultProduct?.id || '',
        quantityOrdered: 10,
        unitCost: Number(defaultProduct?.costPrice) || 1.0
      }
    ]);
    setCreateModalOpen(true);
  };

  const handleAddItemRow = () => {
    const linked = products.filter(
      (p) => p.preferredSupplierId === supplierId || p.preferredSupplier?.id === supplierId
    );
    const pool = !showAllProducts && linked.length > 0 ? linked : products;
    if (pool.length > 0) {
      const defaultProduct = pool[0];
      setPoItems([
        ...poItems,
        {
          productId: defaultProduct.id,
          quantityOrdered: 10,
          unitCost: Number(defaultProduct.costPrice) || 1.0
        }
      ]);
    }
  };

  const handleRemoveItemRow = (index) => {
    if (poItems.length > 1) {
      setPoItems(poItems.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...poItems];
    updated[index][field] = value;
    if (field === 'productId') {
      const p = products.find((prod) => prod.id === value);
      if (p) {
        updated[index].unitCost = Number(p.costPrice) || 0;
      }
    }
    setPoItems(updated);
  };

  const handleCreatePo = async (e) => {
    e.preventDefault();
    if (!supplierId || poItems.length === 0) {
      alert('Please select a supplier and at least one product.');
      return;
    }

    for (const item of poItems) {
      if (!item.productId) {
        alert('Please ensure every line item has a selected product.');
        return;
      }
      if (Number(item.quantityOrdered) <= 0) {
        alert('Quantity must be at least 1 unit.');
        return;
      }
    }

    setActionLoading(true);
    try {
      await api.post('/purchasing/orders', {
        supplierId,
        expectedDate: expectedDate || undefined,
        notes: notes || undefined,
        items: poItems.map((i) => ({
          productId: i.productId,
          quantityOrdered: Math.max(1, Math.round(Number(i.quantityOrdered))),
          unitCost: Math.max(0, Number(i.unitCost))
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
      setSuccess(`PO status updated to ${newStatus.replace('_', ' ')}.`);
      if (detailsModalOpen && selectedPoDetails?.id === poId) {
        fetchPoDetails(poId);
      }
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to update status.');
    }
  };

  // View PO Details Modal
  const fetchPoDetails = async (poId) => {
    try {
      setDetailsLoading(true);
      const res = await api.get(`/purchasing/orders/${poId}`);
      setSelectedPoDetails(res.data);
      setDetailsModalOpen(true);
    } catch (err) {
      alert(err.message || 'Failed to fetch purchase order details.');
    } finally {
      setDetailsLoading(false);
    }
  };

  // Open Receiving Wizard
  const openReceivingModal = async (poId) => {
    try {
      const res = await api.get(`/purchasing/orders/${poId}`);
      const po = res.data;
      setViewPo(po);

      const itemsToReceive = po.items.map((item) => {
        const remaining = Math.max(0, Number(item.quantityOrdered) - Number(item.quantityReceived));
        const defaultExpiry = new Date();
        defaultExpiry.setDate(defaultExpiry.getDate() + 180); // Default 6 months
        const dateStamp = new Date().toISOString().slice(2, 10).replace(/-/g, '');
        return {
          poItemId: item.id,
          productId: item.productId,
          product: item.product,
          productName: item.product.name,
          sku: item.product.sku,
          unit: item.product.unit || 'piece',
          trackExpiry: item.product.trackExpiry,
          quantityOrdered: Number(item.quantityOrdered),
          quantityReceivedAlready: Number(item.quantityReceived),
          quantityReceivingNow: remaining,
          unitCost: Number(item.unitCost),
          batchNumber: `BAT-${dateStamp}-${Math.floor(1000 + Math.random() * 9000)}`,
          expiryDate: item.product.trackExpiry ? defaultExpiry.toISOString().slice(0, 10) : ''
        };
      });

      setReceiptItems(itemsToReceive);
      setReceiptNotes('');
      setReceivingModalOpen(true);
      if (detailsModalOpen) setDetailsModalOpen(false);
    } catch (err) {
      alert(err.message || 'Failed to open goods receiving wizard.');
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
      alert('Please enter a receiving quantity of at least 1 unit for at least one item.');
      return;
    }

    setActionLoading(true);
    try {
      await api.post('/purchasing/receiving', {
        poId: viewPo.id,
        notes: receiptNotes || undefined,
        items: itemsToSubmit
      });

      setSuccess('Goods received successfully! Stock batches and movement audits have been updated.');
      setReceivingModalOpen(false);
      loadData();
    } catch (err) {
      alert(err.message || 'Goods receiving failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // Quick Date Shortcut Helper
  const setQuickExpectedDate = (daysAhead) => {
    const target = new Date();
    target.setDate(target.getDate() + daysAhead);
    setExpectedDate(target.toISOString().slice(0, 10));
  };

  // Helper for quick expiry in receiving
  const setItemExpiryShortcut = (idx, monthsAhead) => {
    const updated = [...receiptItems];
    if (monthsAhead === 0) {
      updated[idx].expiryDate = '';
    } else {
      const exp = new Date();
      exp.setMonth(exp.getMonth() + monthsAhead);
      updated[idx].expiryDate = exp.toISOString().slice(0, 10);
    }
    setReceiptItems(updated);
  };

  // Status Badge Component
  const getStatusBadge = (status) => {
    const statusMap = {
      DRAFT: { label: 'Draft Order', bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
      SUBMITTED: { label: 'Submitted (Awaiting Approval)', bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
      APPROVED: { label: 'Approved (Ready to Receive)', bg: '#f5f3ff', text: '#6d28d9', border: '#ddd6fe' },
      PARTIALLY_RECEIVED: { label: 'Partially Received', bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
      FULLY_RECEIVED: { label: 'Fully Received & Stocked', bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' },
      CANCELLED: { label: 'Cancelled', bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' }
    };

    const cfg = statusMap[status] || { label: status, bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          borderRadius: '20px',
          fontSize: '0.75rem',
          fontWeight: 700,
          backgroundColor: cfg.bg,
          color: cfg.text,
          border: `1px solid ${cfg.border}`,
          whiteSpace: 'nowrap'
        }}
      >
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: cfg.text
          }}
        />
        {cfg.label}
      </span>
    );
  };

  // Filtered Purchase Orders
  const filteredOrders = orders.filter((po) => {
    const matchesSearch =
      search === '' ||
      po.poNumber.toLowerCase().includes(search.toLowerCase()) ||
      po.supplier?.name.toLowerCase().includes(search.toLowerCase()) ||
      (po.notes && po.notes.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === 'DRAFT') return po.status === 'DRAFT';
    if (statusFilter === 'SUBMITTED') return po.status === 'SUBMITTED';
    if (statusFilter === 'APPROVED') return po.status === 'APPROVED';
    if (statusFilter === 'PARTIALLY_RECEIVED') return po.status === 'PARTIALLY_RECEIVED';
    if (statusFilter === 'FULLY_RECEIVED') return po.status === 'FULLY_RECEIVED';
    if (statusFilter === 'CANCELLED') return po.status === 'CANCELLED';

    return true;
  });

  // KPI Calculations
  const draftCount = orders.filter((o) => o.status === 'DRAFT').length;
  const submittedCount = orders.filter((o) => o.status === 'SUBMITTED').length;
  const readyReceiveCount = orders.filter(
    (o) => o.status === 'APPROVED' || o.status === 'PARTIALLY_RECEIVED'
  ).length;
  const completedCount = orders.filter((o) => o.status === 'FULLY_RECEIVED').length;
  const totalProcurementSpend = orders
    .filter((o) => o.status !== 'CANCELLED')
    .reduce((sum, o) => sum + Number(o.totalCost || 0), 0);

  // Selected supplier in Create PO modal
  const selectedSupplierObj = suppliers.find((s) => s.id === supplierId);

  // Products linked to selected supplier
  const supplierProducts = products.filter(
    (p) => p.preferredSupplierId === supplierId || p.preferredSupplier?.id === supplierId
  );
  const selectableProducts =
    !showAllProducts && supplierProducts.length > 0 ? supplierProducts : products;

  // Create PO total calculation
  const createPoTotalCost = poItems.reduce(
    (sum, item) => sum + (Number(item.quantityOrdered) || 0) * (Number(item.unitCost) || 0),
    0
  );
  const createPoTotalUnits = poItems.reduce(
    (sum, item) => sum + (Number(item.quantityOrdered) || 0),
    0
  );

  return (
    <div>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Purchase Orders & Goods Receiving</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            Supplier order management, delivery tracking, and automated inventory stocking
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={loadData} className="btn btn-outline btn-sm">
            <RotateCcw size={14} /> Refresh
          </button>
          {canManageInventory && (
            <button onClick={openCreateModal} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={16} /> Create Purchase Order
            </button>
          )}
        </div>
      </div>

      <Alert type="danger" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      {/* Clear 4-Step Procurement Lifecycle Guide */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          marginBottom: '20px',
          backgroundColor: '#ffffff',
          border: '1.5px solid #e2e8f0'
        }}
      >
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Truck size={16} /> Purchase Order Process & Workflow
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '10px 12px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#e2e8f0', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>
              1
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>Draft Order</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                Select supplier & products. Review quantities and wholesale prices.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '10px 12px', backgroundColor: '#eff6ff', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#2563eb', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>
              2
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e40af' }}>Submit Order</div>
              <div style={{ fontSize: '0.75rem', color: '#3b82f6', marginTop: '2px' }}>
                Sent to supplier for quote confirmation and order review.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '10px 12px', backgroundColor: '#f5f3ff', borderRadius: '10px', border: '1px solid #ddd6fe' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#7c3aed', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>
              3
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#6d28d9' }}>Approve Order</div>
              <div style={{ fontSize: '0.75rem', color: '#8b5cf6', marginTop: '2px' }}>
                Manager authorizes purchase. PO is locked and ready for delivery.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '10px 12px', backgroundColor: '#ecfdf5', borderRadius: '10px', border: '1px solid #a7f3d0' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#10b981', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>
              4
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#047857' }}>Receive Goods</div>
              <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: '2px' }}>
                Inspect delivery, assign batch & expiry. Stock auto-added to inventory.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid-3" style={{ marginBottom: '20px' }}>
        <StatCard
          title="Total Orders"
          value={orders.length}
          subtitle={`Total Procurement: $${totalProcurementSpend.toFixed(2)}`}
          icon={FileText}
          color="#2563eb"
        />

        <StatCard
          title="Ready to Receive"
          value={readyReceiveCount}
          subtitle={`${readyReceiveCount} order(s) awaiting goods delivery`}
          icon={PackageCheck}
          color="#8b5cf6"
        />

        <StatCard
          title="Stocked & Completed"
          value={completedCount}
          subtitle={`${completedCount} orders fully received into inventory`}
          icon={CheckCircle2}
          color="#10b981"
        />
      </div>

      {/* Search & Filter Bar with Clear X */}
      <div className="card" style={{ padding: '14px 20px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
            <Search
              size={18}
              style={{ position: 'absolute', left: '12px', top: '10px', color: '#64748b' }}
            />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '38px', paddingRight: search ? '36px' : '14px' }}
              placeholder="Search by PO # (e.g. PO-2026-0001), supplier, or notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
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

          {/* Status Filter Buttons */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`btn btn-sm ${statusFilter === 'ALL' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setStatusFilter('ALL')}
            >
              All ({orders.length})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${statusFilter === 'DRAFT' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setStatusFilter('DRAFT')}
            >
              Draft ({draftCount})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${statusFilter === 'SUBMITTED' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setStatusFilter('SUBMITTED')}
            >
              Submitted ({submittedCount})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${statusFilter === 'APPROVED' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setStatusFilter('APPROVED')}
            >
              Approved ({orders.filter((o) => o.status === 'APPROVED').length})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${statusFilter === 'PARTIALLY_RECEIVED' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setStatusFilter('PARTIALLY_RECEIVED')}
            >
              Partial ({orders.filter((o) => o.status === 'PARTIALLY_RECEIVED').length})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${statusFilter === 'FULLY_RECEIVED' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setStatusFilter('FULLY_RECEIVED')}
            >
              Stocked ({completedCount})
            </button>
          </div>

          {(search || statusFilter !== 'ALL') && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => {
                setSearch('');
                setStatusFilter('ALL');
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <RotateCcw size={12} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Purchase Orders Table */}
      <div className="card">
        {loading ? (
          <LoadingSpinner text="Loading purchase orders..." />
        ) : filteredOrders.length === 0 ? (
          <div style={{ padding: '50px 20px', textAlign: 'center', color: '#94a3b8' }}>
            <FileText size={42} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#475569' }}>
              No purchase orders found matching your filters.
            </div>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>
              Click "Create Purchase Order" above to draft a new wholesale order.
            </div>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>PO Number & Date</th>
                  <th>Wholesale Supplier</th>
                  <th>Expected Delivery</th>
                  <th>Items Ordered</th>
                  <th>Total Cost ($)</th>
                  <th>Current Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((po) => {
                  const initialLetter = po.supplier?.name?.charAt(0).toUpperCase() || 'S';
                  return (
                    <tr key={po.id}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span className="mono" style={{ fontWeight: 700, color: '#1e40af' }}>
                            {po.poNumber}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {new Date(po.createdAt || po.orderDate).toLocaleDateString()}
                          </span>
                        </div>
                      </td>

                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              backgroundColor: '#eff6ff',
                              color: '#2563eb',
                              border: '1px solid #bfdbfe',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              flexShrink: 0
                            }}
                          >
                            {initialLetter}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>{po.supplier.name}</div>
                            {po.notes && (
                              <div style={{ fontSize: '0.75rem', color: '#64748b', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {po.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td>
                        {po.expectedDate ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem' }}>
                            <Calendar size={13} color="#64748b" />
                            <span>{new Date(po.expectedDate).toLocaleDateString()}</span>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Not scheduled</span>
                        )}
                      </td>

                      <td>
                        <span className="badge badge-neutral" style={{ fontWeight: 600 }}>
                          {po._count?.items || 0} product(s)
                        </span>
                      </td>

                      <td className="mono" style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                        ${Number(po.totalCost).toFixed(2)}
                      </td>

                      <td>{getStatusBadge(po.status)}</td>

                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                          {/* Dedicated View Details Button */}
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => fetchPoDetails(po.id)}
                            title="View PO Details & Items"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Eye size={13} /> View
                          </button>

                          {/* Contextual Action Buttons */}
                          {canManageInventory && (
                            <>
                              {po.status === 'DRAFT' && (
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={() => updateStatus(po.id, 'SUBMITTED')}
                                  title="Submit order to supplier"
                                >
                                  Submit
                                </button>
                              )}
                              {po.status === 'SUBMITTED' && (
                                <button
                                  className="btn btn-sm"
                                  style={{ backgroundColor: '#7c3aed', color: '#ffffff' }}
                                  onClick={() => updateStatus(po.id, 'APPROVED')}
                                  title="Approve purchase order for receiving"
                                >
                                  Approve
                                </button>
                              )}
                              {(po.status === 'APPROVED' || po.status === 'PARTIALLY_RECEIVED') && (
                                <button
                                  className="btn btn-success btn-sm"
                                  onClick={() => openReceivingModal(po.id)}
                                  title="Receive physical goods and create inventory batches"
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                >
                                  <PackageCheck size={14} /> Receive Goods
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* WIDENED & CRYSTAL-CLEAR CREATE PURCHASE ORDER MODAL (maxWidth="920px")   */}
      {/* ========================================================================= */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New Purchase Order"
        maxWidth="920px"
      >
        <form onSubmit={handleCreatePo}>
          {/* Step 1: Supplier & Delivery Schedule */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px 18px',
              marginBottom: '16px'
            }}
          >
            <div
              style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#2563eb',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Building2 size={16} /> 1. Supplier Selection & Delivery Schedule
            </div>

            <div className="grid-2">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Wholesale Supplier *</label>
                <select
                  className="form-select"
                  value={supplierId}
                  onChange={(e) => {
                    const newSupId = e.target.value;
                    setSupplierId(newSupId);
                    const linked = products.filter(
                      (p) => p.preferredSupplierId === newSupId || p.preferredSupplier?.id === newSupId
                    );
                    if (linked.length > 0) {
                      setPoItems([
                        {
                          productId: linked[0].id,
                          quantityOrdered: 10,
                          unitCost: Number(linked[0].costPrice) || 1.0
                        }
                      ]);
                    }
                  }}
                  required
                  style={{ fontSize: '0.95rem', fontWeight: 600 }}
                >
                  {suppliers.filter((s) => s.isActive).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.contactPerson ? `— Contact: ${s.contactPerson}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Expected Delivery Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                />
                {/* Quick Date Presets */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Shortcuts:</span>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                    onClick={() => setQuickExpectedDate(3)}
                  >
                    +3 Days
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                    onClick={() => setQuickExpectedDate(7)}
                  >
                    +1 Week
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                    onClick={() => setQuickExpectedDate(14)}
                  >
                    +2 Weeks
                  </button>
                </div>
              </div>
            </div>

            {/* Selected Supplier Highlight Card */}
            {selectedSupplierObj && (
              <div
                style={{
                  marginTop: '12px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  fontSize: '0.8rem',
                  flexWrap: 'wrap'
                }}
              >
                <div>
                  <span style={{ color: '#64748b' }}>Vendor: </span>
                  <strong style={{ color: '#0f172a' }}>{selectedSupplierObj.name}</strong>
                  {selectedSupplierObj.contactPerson && (
                    <span style={{ marginLeft: '8px', color: '#475569' }}>
                      (Attn: {selectedSupplierObj.contactPerson})
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '14px', color: '#64748b' }}>
                  {selectedSupplierObj.phone && (
                    <span>Phone: <strong className="mono">{selectedSupplierObj.phone}</strong></span>
                  )}
                  {selectedSupplierObj.email && (
                    <span>Email: <strong>{selectedSupplierObj.email}</strong></span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Ordered Items Table (Wider, Spacious, Integer Steppers) */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px 18px',
              marginBottom: '16px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: '#2563eb',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Boxes size={16} /> 2. Ordered Product Items ({poItems.length} lines)
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={handleAddItemRow}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#ffffff' }}
              >
                <Plus size={14} /> Add Product Line
              </button>
            </div>

            {/* Supplier Product Filter Banner */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                backgroundColor: supplierProducts.length > 0 ? '#eff6ff' : '#fef3c7',
                border: `1px solid ${supplierProducts.length > 0 ? '#bfdbfe' : '#fde68a'}`,
                borderRadius: '8px',
                marginBottom: '14px',
                fontSize: '0.825rem',
                gap: '12px',
                flexWrap: 'wrap'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: supplierProducts.length > 0 ? '#1e40af' : '#92400e' }}>
                <Filter size={15} />
                {supplierProducts.length > 0 ? (
                  <span>
                    Showing <strong>{showAllProducts ? products.length : supplierProducts.length}</strong> product{supplierProducts.length === 1 ? '' : 's'}
                    {!showAllProducts && (
                      <> supplied by <strong>{selectedSupplierObj?.name || 'this vendor'}</strong></>
                    )}
                  </span>
                ) : (
                  <span>
                    No specific products are linked to <strong>{selectedSupplierObj?.name}</strong> yet. Showing all catalog products. (You can set primary suppliers in the Product Catalog).
                  </span>
                )}
              </div>

              {supplierProducts.length > 0 && (
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: '#334155', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={showAllProducts}
                    onChange={(e) => setShowAllProducts(e.target.checked)}
                    style={{ width: '15px', height: '15px', cursor: 'pointer' }}
                  />
                  Show all catalog products ({products.length})
                </label>
              )}
            </div>

            <div className="table-container" style={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '42%' }}>Product & SKU</th>
                    <th style={{ width: '22%' }}>Order Quantity</th>
                    <th style={{ width: '18%' }}>Unit Cost ($)</th>
                    <th style={{ width: '14%' }}>Line Subtotal</th>
                    <th style={{ width: '4%' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {poItems.map((item, idx) => {
                    const matchedProd = products.find((p) => p.id === item.productId);
                    const lineSubtotal = (Number(item.quantityOrdered) || 0) * (Number(item.unitCost) || 0);

                    // Ensure currently selected product is available in options even if filter toggles
                    const optionsToRender = selectableProducts.some((p) => p.id === item.productId)
                      ? selectableProducts
                      : (matchedProd ? [matchedProd, ...selectableProducts] : selectableProducts);

                    return (
                      <tr key={idx}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {matchedProd && (
                              <img
                                src={getProductImageUrl(matchedProd)}
                                alt={matchedProd.name}
                                style={{
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '6px',
                                  objectFit: 'cover',
                                  border: '1px solid #cbd5e1',
                                  flexShrink: 0
                                }}
                              />
                            )}
                            <div style={{ flex: 1 }}>
                              <select
                                className="form-select"
                                style={{ fontSize: '0.875rem', fontWeight: 600, padding: '7px 10px' }}
                                value={item.productId}
                                onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                              >
                                {optionsToRender.map((p) => {
                                  const isLinked = p.preferredSupplierId === supplierId || p.preferredSupplier?.id === supplierId;
                                  return (
                                    <option key={p.id} value={p.id}>
                                      {isLinked ? '⭐ ' : ''}{p.name} ({p.sku}) — In Stock: {p.currentStock || 0} {p.unit}s{isLinked ? ' [Preferred Vendor]' : ''}
                                    </option>
                                  );
                                })}
                              </select>
                              {matchedProd && (
                                <div style={{ fontSize: '0.725rem', color: '#64748b', marginTop: '2px' }}>
                                  Unit: <strong>{matchedProd.unit || 'piece'}</strong> • Current Stock: <strong>{matchedProd.currentStock || 0}</strong>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td>
                          <div>
                            <input
                              type="number"
                              step="1"
                              min="1"
                              required
                              className="form-input mono"
                              style={{ width: '100%', padding: '6px 10px', fontWeight: 700, fontSize: '0.95rem' }}
                              value={item.quantityOrdered}
                              onChange={(e) => handleItemChange(idx, 'quantityOrdered', e.target.value)}
                            />
                            {/* Quick steppers */}
                            <div style={{ display: 'flex', gap: '3px', marginTop: '4px' }}>
                              {[5, 10, 25, 50, 100].map((stepVal) => (
                                <button
                                  key={stepVal}
                                  type="button"
                                  className="btn btn-outline btn-sm"
                                  style={{ fontSize: '0.65rem', padding: '1px 5px', minWidth: 'auto' }}
                                  onClick={() => handleItemChange(idx, 'quantityOrdered', Number(item.quantityOrdered || 0) + stepVal)}
                                  title={`Add ${stepVal} units`}
                                >
                                  +{stepVal}
                                </button>
                              ))}
                            </div>
                          </div>
                        </td>

                        <td>
                          <div>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              required
                              className="form-input mono"
                              style={{ width: '100%', padding: '6px 10px', fontWeight: 700 }}
                              value={item.unitCost}
                              onChange={(e) => handleItemChange(idx, 'unitCost', e.target.value)}
                            />
                            <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px', display: 'block' }}>
                              Per {matchedProd?.unit || 'unit'}
                            </span>
                          </div>
                        </td>

                        <td>
                          <div className="mono" style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>
                            ${lineSubtotal.toFixed(2)}
                          </div>
                        </td>

                        <td>
                          {poItems.length > 1 && (
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              style={{ color: '#ef4444', borderColor: '#fca5a5', padding: '6px' }}
                              onClick={() => handleRemoveItemRow(idx)}
                              title="Remove item line"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Step 3: Order Cost Summary Box */}
            <div
              style={{
                marginTop: '14px',
                backgroundColor: '#ffffff',
                border: '1.5px solid #bfdbfe',
                borderRadius: '10px',
                padding: '12px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}
            >
              <div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Total Order Quantity:</div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1e40af' }}>
                  {createPoTotalUnits} units across {poItems.length} product line(s)
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Estimated PO Grand Total:</div>
                <div className="mono" style={{ fontSize: '1.45rem', fontWeight: 800, color: '#1e40af' }}>
                  ${createPoTotalCost.toFixed(2)} USD
                </div>
              </div>
            </div>
          </div>

          {/* Step 4: Special Instructions / Notes */}
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Delivery & Vendor Instructions (Optional)</label>
            <textarea
              rows="2"
              className="form-input"
              placeholder="e.g. Deliver to loading dock B between 8:00 AM - 11:00 AM, palletized and shrink-wrapped..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Modal Footer Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn-outline" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={actionLoading}
              style={{ minWidth: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <Plus size={16} />
              {actionLoading ? 'Creating PO...' : `Create Draft PO ($${createPoTotalCost.toFixed(2)})`}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* WIDENED & CRYSTAL-CLEAR GOODS RECEIVING MODAL (maxWidth="920px")          */}
      {/* ========================================================================= */}
      <Modal
        isOpen={receivingModalOpen}
        onClose={() => setReceivingModalOpen(false)}
        title={`Receive Goods against PO: ${viewPo?.poNumber}`}
        maxWidth="920px"
      >
        <form onSubmit={handleReceivingSubmit}>
          {/* Explanation Alert */}
          <div
            style={{
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: '10px',
              padding: '12px 16px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: '#065f46'
            }}
          >
            <PackageCheck size={22} color="#059669" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '0.85rem', lineHeight: 1.4 }}>
              <strong>Physical Goods Receiving:</strong> Verify quantities received, inspect packaging, and input batch numbers & expiration dates. Items will be automatically credited to active inventory immediately upon confirmation.
            </div>
          </div>

          {/* Supplier & PO Context Bar */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '12px 16px',
              marginBottom: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.85rem'
            }}
          >
            <div>
              <span style={{ color: '#64748b' }}>Wholesale Supplier: </span>
              <strong style={{ color: '#0f172a' }}>{viewPo?.supplier?.name}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Order Status: </span>
              {viewPo && getStatusBadge(viewPo.status)}
            </div>
          </div>

          {/* Receiving Items Table */}
          <div className="table-container" style={{ marginBottom: '16px' }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: '30%' }}>Product</th>
                  <th style={{ width: '16%' }}>Ordered vs Done</th>
                  <th style={{ width: '18%' }}>Receiving Now *</th>
                  <th style={{ width: '18%' }}>Batch # *</th>
                  <th style={{ width: '18%' }}>Expiry Date</th>
                </tr>
              </thead>
              <tbody>
                {receiptItems.map((item, idx) => {
                  const remaining = Math.max(0, item.quantityOrdered - item.quantityReceivedAlready);
                  return (
                    <tr key={item.poItemId}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {item.product && (
                            <img
                              src={getProductImageUrl(item.product)}
                              alt={item.productName}
                              style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover' }}
                            />
                          )}
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{item.productName}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>SKU: <span className="mono">{item.sku}</span></div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div style={{ fontSize: '0.85rem' }}>
                          <strong>{item.quantityOrdered}</strong> {item.unit}s ordered
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                          Already received: <strong>{item.quantityReceivedAlready}</strong>
                        </div>
                      </td>

                      <td>
                        <div>
                          <input
                            type="number"
                            min="0"
                            max={remaining}
                            step="1"
                            className="form-input mono"
                            style={{ width: '100%', padding: '6px 8px', fontWeight: 700 }}
                            value={item.quantityReceivingNow}
                            onChange={(e) => {
                              const updated = [...receiptItems];
                              updated[idx].quantityReceivingNow = e.target.value;
                              setReceiptItems(updated);
                            }}
                          />
                          {remaining > 0 && (
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              style={{ fontSize: '0.65rem', padding: '1px 6px', marginTop: '3px' }}
                              onClick={() => {
                                const updated = [...receiptItems];
                                updated[idx].quantityReceivingNow = remaining;
                                setReceiptItems(updated);
                              }}
                            >
                              Receive All ({remaining})
                            </button>
                          )}
                        </div>
                      </td>

                      <td>
                        <input
                          type="text"
                          required
                          className="form-input mono"
                          style={{ width: '100%', padding: '6px 8px', fontSize: '0.85rem', fontWeight: 600 }}
                          value={item.batchNumber}
                          onChange={(e) => {
                            const updated = [...receiptItems];
                            updated[idx].batchNumber = e.target.value;
                            setReceiptItems(updated);
                          }}
                        />
                      </td>

                      <td>
                        <div>
                          <input
                            type="date"
                            className="form-input"
                            style={{ width: '100%', padding: '6px 8px', fontSize: '0.8rem' }}
                            value={item.expiryDate}
                            onChange={(e) => {
                              const updated = [...receiptItems];
                              updated[idx].expiryDate = e.target.value;
                              setReceiptItems(updated);
                            }}
                          />
                          <div style={{ display: 'flex', gap: '2px', marginTop: '3px' }}>
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              style={{ fontSize: '0.65rem', padding: '1px 4px' }}
                              onClick={() => setItemExpiryShortcut(idx, 6)}
                              title="+6 Months"
                            >
                              +6M
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              style={{ fontSize: '0.65rem', padding: '1px 4px' }}
                              onClick={() => setItemExpiryShortcut(idx, 12)}
                              title="+1 Year"
                            >
                              +1Y
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              style={{ fontSize: '0.65rem', padding: '1px 4px' }}
                              onClick={() => setItemExpiryShortcut(idx, 0)}
                              title="Clear Expiry"
                            >
                              None
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Inspection & Delivery Notes</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Delivery arrived in good condition, seal intact, cold chain verified..."
              value={receiptNotes}
              onChange={(e) => setReceiptNotes(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn-outline" onClick={() => setReceivingModalOpen(false)}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-success"
              disabled={actionLoading}
              style={{ minWidth: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <PackageCheck size={16} />
              {actionLoading ? 'Recording Receipt...' : 'Confirm Goods Receipt & Add Stock'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* FULL PURCHASE ORDER DETAILS MODAL (maxWidth="850px")                      */}
      {/* ========================================================================= */}
      <Modal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        title={`Purchase Order: ${selectedPoDetails?.poNumber || ''}`}
        maxWidth="850px"
      >
        {detailsLoading || !selectedPoDetails ? (
          <LoadingSpinner text="Loading PO details..." />
        ) : (
          <div>
            {/* Header Status & Dates */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px 20px',
                marginBottom: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
              }}
            >
              <div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Order Number</div>
                <div className="mono" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e40af' }}>
                  {selectedPoDetails.poNumber}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                  Created on {new Date(selectedPoDetails.createdAt || selectedPoDetails.orderDate).toLocaleDateString()}
                  {selectedPoDetails.createdByUser && ` by ${selectedPoDetails.createdByUser.fullName}`}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>Lifecycle Status</div>
                {getStatusBadge(selectedPoDetails.status)}
              </div>
            </div>

            {/* Supplier Information Card */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '16px'
              }}
            >
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Building2 size={16} /> Supplier & Contact Information
              </div>
              <div className="grid-2">
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                    {selectedPoDetails.supplier?.name}
                  </div>
                  {selectedPoDetails.supplier?.contactPerson && (
                    <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '2px' }}>
                      Contact: <strong>{selectedPoDetails.supplier.contactPerson}</strong>
                    </div>
                  )}
                  {selectedPoDetails.supplier?.address && (
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                      {selectedPoDetails.supplier.address}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem' }}>
                  {selectedPoDetails.supplier?.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Phone size={14} color="#64748b" />
                      <span className="mono">{selectedPoDetails.supplier.phone}</span>
                    </div>
                  )}
                  {selectedPoDetails.supplier?.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Mail size={14} color="#64748b" />
                      <span>{selectedPoDetails.supplier.email}</span>
                    </div>
                  )}
                  {selectedPoDetails.expectedDate && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1e40af', fontWeight: 600 }}>
                      <Calendar size={14} />
                      <span>Expected: {new Date(selectedPoDetails.expectedDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Ordered Items Table */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
                Ordered Products & Receiving Fulfillment
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Quantity Ordered</th>
                      <th>Quantity Received</th>
                      <th>Wholesale Cost</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPoDetails.items?.map((item) => {
                      const pct = Math.min(100, Math.round((Number(item.quantityReceived) / Number(item.quantityOrdered)) * 100)) || 0;
                      return (
                        <tr key={item.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {item.product && (
                                <img
                                  src={getProductImageUrl(item.product)}
                                  alt={item.product.name}
                                  style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover' }}
                                />
                              )}
                              <div>
                                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{item.product?.name}</div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                  SKU: <span className="mono">{item.product?.sku}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="mono" style={{ fontWeight: 600 }}>
                            {Number(item.quantityOrdered)} {item.product?.unit || 'units'}
                          </td>

                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className="mono" style={{ fontWeight: 700, color: pct === 100 ? '#10b981' : '#b45309' }}>
                                {Number(item.quantityReceived)}
                              </span>
                              <div style={{ flex: 1, minWidth: '60px', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                                <div
                                  style={{
                                    width: `${pct}%`,
                                    height: '100%',
                                    backgroundColor: pct === 100 ? '#10b981' : '#f59e0b',
                                    borderRadius: '3px'
                                  }}
                                />
                              </div>
                              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{pct}%</span>
                            </div>
                          </td>

                          <td className="mono">${Number(item.unitCost).toFixed(2)}</td>

                          <td className="mono" style={{ fontWeight: 700 }}>
                            ${(Number(item.quantityOrdered) * Number(item.unitCost)).toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Total Cost Banner */}
            <div
              style={{
                backgroundColor: '#eff6ff',
                border: '1.5px solid #bfdbfe',
                borderRadius: '10px',
                padding: '12px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px'
              }}
            >
              <div style={{ fontSize: '0.9rem', color: '#1e40af', fontWeight: 600 }}>
                Total Purchase Order Value:
              </div>
              <div className="mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e40af' }}>
                ${Number(selectedPoDetails.totalCost).toFixed(2)} USD
              </div>
            </div>

            {/* Previous Goods Receipts (if any) */}
            {selectedPoDetails.receipts && selectedPoDetails.receipts.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#047857', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <PackageCheck size={16} /> Delivery Receipts Logged ({selectedPoDetails.receipts.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedPoDetails.receipts.map((rcpt) => (
                    <div
                      key={rcpt.id}
                      style={{
                        backgroundColor: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        fontSize: '0.8rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          Receipt # <strong className="mono" style={{ color: '#047857' }}>{rcpt.receiptNumber}</strong>
                          <span style={{ color: '#64748b', marginLeft: '8px' }}>
                            on {new Date(rcpt.receivedAt).toLocaleString()}
                          </span>
                        </div>
                        {rcpt.receivedByUser && (
                          <div style={{ color: '#64748b' }}>
                            Received by: <strong>{rcpt.receivedByUser.fullName}</strong>
                          </div>
                        )}
                      </div>
                      {rcpt.notes && (
                        <div style={{ color: '#475569', marginTop: '4px', fontStyle: 'italic' }}>
                          "{rcpt.notes}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons Inside Details Modal */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button type="button" className="btn btn-outline" onClick={() => setDetailsModalOpen(false)}>
                Close
              </button>
              {canManageInventory && (
                <>
                  {selectedPoDetails.status === 'DRAFT' && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => updateStatus(selectedPoDetails.id, 'SUBMITTED')}
                    >
                      Submit Order
                    </button>
                  )}
                  {selectedPoDetails.status === 'SUBMITTED' && (
                    <button
                      type="button"
                      className="btn"
                      style={{ backgroundColor: '#7c3aed', color: '#ffffff' }}
                      onClick={() => updateStatus(selectedPoDetails.id, 'APPROVED')}
                    >
                      Approve Order
                    </button>
                  )}
                  {(selectedPoDetails.status === 'APPROVED' || selectedPoDetails.status === 'PARTIALLY_RECEIVED') && (
                    <button
                      type="button"
                      className="btn btn-success"
                      onClick={() => openReceivingModal(selectedPoDetails.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <PackageCheck size={16} /> Receive Goods
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
