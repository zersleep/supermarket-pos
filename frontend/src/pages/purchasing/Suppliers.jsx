import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit,
  Truck,
  Phone,
  Mail,
  MapPin,
  Search,
  X,
  RotateCcw,
  Building2,
  User,
  FileText,
  CheckCircle2,
  Clock,
  Trash2,
  Ban
} from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner, Alert, StatCard } from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL', 'ACTIVE', 'INACTIVE'

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    isActive: true
  });
  const [actionLoading, setActionLoading] = useState(false);

  const { canManageInventory } = useAuth();

  // Auto-dismiss success notification
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess('');
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      setError('');
      // Fetch all suppliers regardless of status so managers can manage active & inactive
      const res = await api.get('/suppliers?status=all&limit=100');
      setSuppliers(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load suppliers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const openCreateModal = () => {
    setIsEditing(false);
    setEditId(null);
    setFormData({
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      notes: '',
      isActive: true
    });
    setModalOpen(true);
  };

  const openEditModal = (sup) => {
    setIsEditing(true);
    setEditId(sup.id);
    setFormData({
      name: sup.name,
      contactPerson: sup.contactPerson || '',
      phone: sup.phone || '',
      email: sup.email || '',
      address: sup.address || '',
      notes: sup.notes || '',
      isActive: sup.isActive !== undefined ? sup.isActive : true
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Please enter a supplier or company name.');
      return;
    }

    setActionLoading(true);
    try {
      if (isEditing) {
        await api.put(`/suppliers/${editId}`, formData);
        setSuccess(`Supplier "${formData.name.trim()}" updated successfully.`);
      } else {
        await api.post('/suppliers', formData);
        setSuccess(`Supplier "${formData.name.trim()}" created successfully.`);
      }
      setModalOpen(false);
      fetchSuppliers();
    } catch (err) {
      alert(err.message || 'Action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (supplier) => {
    const nextStatus = !supplier.isActive;
    const actionWord = nextStatus ? 'activate' : 'block / deactivate';
    if (!window.confirm(`Are you sure you want to ${actionWord} supplier "${supplier.name}"?`)) {
      return;
    }
    try {
      await api.put(`/suppliers/${supplier.id}`, { isActive: nextStatus });
      setSuccess(`Supplier "${supplier.name}" is now ${nextStatus ? 'Active' : 'Blocked / Inactive'}.`);
      fetchSuppliers();
    } catch (err) {
      alert(err.message || 'Failed to update supplier status.');
    }
  };

  const handleDeleteSupplier = async (supplier) => {
    const poCount = supplier._count?.purchaseOrders || 0;
    const promptMsg =
      poCount > 0
        ? `Supplier "${supplier.name}" has ${poCount} historical purchase order(s). To preserve accounting records, they will be marked Inactive and blocked from future orders. Continue?`
        : `Are you sure you want to permanently delete supplier "${supplier.name}"?`;

    if (!window.confirm(promptMsg)) return;

    try {
      const res = await api.delete(`/suppliers/${supplier.id}`);
      setSuccess(res.message || `Supplier "${supplier.name}" processed.`);
      fetchSuppliers();
    } catch (err) {
      alert(err.message || 'Failed to delete supplier.');
    }
  };

  // Filtered Suppliers
  const filteredSuppliers = suppliers.filter((s) => {
    const matchesSearch =
      search === '' ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.contactPerson && s.contactPerson.toLowerCase().includes(search.toLowerCase())) ||
      (s.phone && s.phone.toLowerCase().includes(search.toLowerCase())) ||
      (s.email && s.email.toLowerCase().includes(search.toLowerCase())) ||
      (s.address && s.address.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === 'ACTIVE') return s.isActive;
    if (statusFilter === 'INACTIVE') return !s.isActive;

    return true;
  });

  const activeCount = suppliers.filter((s) => s.isActive).length;
  const inactiveCount = suppliers.filter((s) => !s.isActive).length;
  const totalPOs = suppliers.reduce((acc, s) => acc + (s._count?.purchaseOrders || 0), 0);

  return (
    <div>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Supplier Management</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            Wholesale vendors, distributors, and delivery contact information
          </p>
        </div>
        {canManageInventory && (
          <button onClick={openCreateModal} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={16} /> Add Supplier
          </button>
        )}
      </div>

      <Alert type="danger" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      {/* KPI Stat Cards */}
      <div className="grid-3" style={{ marginBottom: '20px' }}>
        <StatCard
          title="Total Vendors"
          value={suppliers.length}
          subtitle={`${activeCount} active wholesale suppliers`}
          icon={Building2}
          color="#2563eb"
        />

        <StatCard
          title="Active Partners"
          value={activeCount}
          subtitle={inactiveCount > 0 ? `${inactiveCount} inactive supplier account(s)` : 'All suppliers active'}
          icon={Truck}
          color="#10b981"
        />

        <StatCard
          title="Purchase Orders"
          value={totalPOs}
          subtitle="Orders placed with suppliers"
          icon={FileText}
          color="#8b5cf6"
        />
      </div>

      {/* Search & Filter Bar with Clear X */}
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
              style={{ paddingLeft: '38px', paddingRight: search ? '36px' : '14px' }}
              placeholder="Search by company name, contact person, phone, or email..."
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
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              className={`btn btn-sm ${statusFilter === 'ALL' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setStatusFilter('ALL')}
            >
              All ({suppliers.length})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${statusFilter === 'ACTIVE' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setStatusFilter('ACTIVE')}
            >
              Active ({activeCount})
            </button>
            {inactiveCount > 0 && (
              <button
                type="button"
                className={`btn btn-sm ${statusFilter === 'INACTIVE' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setStatusFilter('INACTIVE')}
              >
                Inactive ({inactiveCount})
              </button>
            )}
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
              <RotateCcw size={12} /> Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="card">
        {loading ? (
          <LoadingSpinner text="Loading suppliers..." />
        ) : filteredSuppliers.length === 0 ? (
          <div style={{ padding: '50px 20px', textAlign: 'center', color: '#94a3b8' }}>
            <Building2 size={40} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#475569' }}>
              No suppliers found matching your search.
            </div>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>
              Try searching with another keyword or clearing current filters.
            </div>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Supplier / Company</th>
                  <th>Contact Person</th>
                  <th>Phone & Email</th>
                  <th>Location / Address</th>
                  <th>Orders (POs)</th>
                  <th>Status</th>
                  {canManageInventory && <th style={{ textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.map((s) => {
                  const initialLetter = s.name.charAt(0).toUpperCase() || 'S';
                  return (
                    <tr key={s.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '10px',
                              backgroundColor: '#eff6ff',
                              color: '#2563eb',
                              border: '1.5px solid #bfdbfe',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '1rem',
                              flexShrink: 0
                            }}
                          >
                            {initialLetter}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>{s.name}</div>
                            {s.notes && (
                              <div style={{ fontSize: '0.75rem', color: '#64748b', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {s.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td>
                        {s.contactPerson ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem' }}>
                            <User size={14} color="#64748b" />
                            <span>{s.contactPerson}</span>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>—</span>
                        )}
                      </td>

                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          {s.phone ? (
                            <a
                              href={`tel:${s.phone}`}
                              style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: '#2563eb', textDecoration: 'none' }}
                            >
                              <Phone size={12} />
                              <span className="mono">{s.phone}</span>
                            </a>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>No phone</span>
                          )}
                          {s.email && (
                            <a
                              href={`mailto:${s.email}`}
                              style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: '#64748b', textDecoration: 'none' }}
                            >
                              <Mail size={12} />
                              <span>{s.email}</span>
                            </a>
                          )}
                        </div>
                      </td>

                      <td>
                        {s.address ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: '#475569' }}>
                            <MapPin size={13} color="#94a3b8" style={{ flexShrink: 0 }} />
                            <span>{s.address}</span>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>—</span>
                        )}
                      </td>

                      <td>
                        <span
                          className="mono"
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            backgroundColor: '#f1f5f9',
                            fontWeight: 600,
                            fontSize: '0.85rem'
                          }}
                        >
                          {s._count?.purchaseOrders || 0} POs
                        </span>
                      </td>

                      <td>
                        <span className={`badge ${s.isActive ? 'badge-success' : 'badge-neutral'}`}>
                          {s.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {canManageInventory && (
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => openEditModal(s)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              title="Edit supplier details"
                            >
                              <Edit size={13} /> Edit
                            </button>
                            <button
                              className="btn btn-outline btn-sm"
                              style={{
                                color: s.isActive ? '#b45309' : '#047857',
                                borderColor: s.isActive ? '#fde68a' : '#a7f3d0'
                              }}
                              onClick={() => handleToggleStatus(s)}
                              title={s.isActive ? 'Block/Deactivate this supplier from future orders' : 'Reactivate supplier'}
                            >
                              {s.isActive ? 'Block' : 'Activate'}
                            </button>
                            <button
                              className="btn btn-outline btn-sm"
                              style={{ color: '#ef4444', borderColor: '#fca5a5', padding: '6px' }}
                              onClick={() => handleDeleteSupplier(s)}
                              title="Delete or Deactivate Supplier"
                            >
                              <Trash2 size={13} />
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

      {/* WIDENED & STRUCTURED SUPPLIER MODAL (maxWidth="760px") */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={isEditing ? `Edit Supplier: ${formData.name || 'Vendor'}` : 'Add New Wholesale Supplier'}
        maxWidth="760px"
      >
        <form onSubmit={handleSubmit}>
          {/* Section 1: Company Profile */}
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
              <Building2 size={16} /> 1. Supplier / Company Information
            </div>

            <div className="grid-2">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>
                  Company / Supplier Name *
                </label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. Coca-Cola Bottling Ltd, Nestlé Wholesale"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>
                  Contact Representative Person
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Sok Piseth (Sales Rep)"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Contact Communication */}
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
              <Phone size={16} /> 2. Contact Details & Reach
            </div>

            <div className="grid-2">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>
                  Phone / Hotline Number
                </label>
                <input
                  type="text"
                  className="form-input mono"
                  placeholder="e.g. +855 12 345 678"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>
                  Email Address
                </label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="e.g. orders@supplier.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Physical Location & Warehouse */}
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
              <MapPin size={16} /> 3. Address & Warehouse Location
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 600 }}>Physical Address / Delivery Hub</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Building 45, Street 271, Sangkat Boeung Tumpun, Phnom Penh"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
          </div>

          {/* Section 4: Notes & Terms */}
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
              <FileText size={16} /> 4. Supply Terms & Internal Notes
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 600 }}>Notes / Credit Terms / Delivery Schedule</label>
              <textarea
                className="form-input"
                rows="2"
                placeholder="e.g. Net 30 payment terms, weekly delivery every Tuesday morning, minimum order quantity 10 cartons."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                style={{ resize: 'vertical' }}
              />
            </div>

            {/* Active Status Checkbox */}
            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="checkbox"
                id="supplierActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#2563eb' }}
              />
              <label htmlFor="supplierActive" style={{ fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', color: '#1e293b' }}>
                Active Supplier (eligible for creating new Purchase Orders)
              </label>
            </div>
          </div>

          {/* Modal Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={actionLoading}
              style={{ minWidth: '150px' }}
            >
              {actionLoading ? 'Saving...' : isEditing ? 'Update Supplier' : 'Save Supplier'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
