import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Edit,
  UserCheck,
  Shield,
  Lock,
  Search,
  Filter,
  Users,
  ShoppingBag,
  Boxes,
  Crown,
  CheckCircle2,
  AlertCircle,
  Clock
} from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner, Alert } from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    email: '',
    phone: '',
    role: 'CASHIER',
    isActive: true
  });
  const [actionLoading, setActionLoading] = useState(false);

  const { isOwner, user: currentUser } = useAuth();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/users?limit=100');
      setUsers(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 3500);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Role Statistics Calculation
  const stats = useMemo(() => {
    const total = users.length;
    const owners = users.filter((u) => u.role === 'OWNER' || u.role === 'ADMIN').length;
    const inventory = users.filter((u) => u.role === 'INVENTORY_MANAGER').length;
    const cashiers = users.filter((u) => u.role === 'CASHIER').length;
    const activeShifts = users.filter((u) => u.shifts && u.shifts.length > 0).length;
    return { total, owners, inventory, cashiers, activeShifts };
  }, [users]);

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Role Filter (Map ADMIN to OWNER for consistent 3-role view)
      if (roleFilter === 'OWNER' && u.role !== 'OWNER' && u.role !== 'ADMIN') return false;
      if (roleFilter === 'INVENTORY_MANAGER' && u.role !== 'INVENTORY_MANAGER') return false;
      if (roleFilter === 'CASHIER' && u.role !== 'CASHIER') return false;

      // Status Filter
      if (statusFilter === 'ACTIVE' && !u.isActive) return false;
      if (statusFilter === 'INACTIVE' && u.isActive) return false;

      // Search Query
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = u.fullName?.toLowerCase().includes(query);
        const matchesUsername = u.username?.toLowerCase().includes(query);
        const matchesEmail = u.email?.toLowerCase().includes(query);
        const matchesPhone = u.phone?.toLowerCase().includes(query);
        if (!matchesName && !matchesUsername && !matchesEmail && !matchesPhone) return false;
      }

      return true;
    });
  }, [users, roleFilter, statusFilter, searchTerm]);

  const openCreateModal = () => {
    setIsEditing(false);
    setEditId(null);
    setFormData({
      username: '',
      password: '',
      fullName: '',
      email: '',
      phone: '',
      role: 'CASHIER',
      isActive: true
    });
    setModalOpen(true);
  };

  const openEditModal = (u) => {
    setIsEditing(true);
    setEditId(u.id);
    setFormData({
      username: u.username,
      password: '',
      fullName: u.fullName,
      email: u.email || '',
      phone: u.phone || '',
      // If legacy ADMIN, map to OWNER in edit modal
      role: u.role === 'ADMIN' ? 'OWNER' : u.role,
      isActive: u.isActive
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError('');

    try {
      if (isEditing) {
        await api.put(`/users/${editId}`, {
          fullName: formData.fullName,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
          role: formData.role,
          isActive: formData.isActive,
          ...(formData.password ? { password: formData.password } : {})
        });
        setSuccess('User updated successfully.');
      } else {
        if (!formData.password || formData.password.length < 8) {
          alert('Password must be at least 8 characters long.');
          setActionLoading(false);
          return;
        }
        await api.post('/users', formData);
        setSuccess('User account created successfully.');
      }
      setModalOpen(false);
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Failed to save user.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={{ paddingBottom: '30px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
              Staff & Role Management
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
              3 System Roles
            </span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>
            Manage store owners, inventory warehouse staff, and register cashiers
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px' }}
        >
          <Plus size={16} /> Add Staff Account
        </button>
      </div>

      <Alert type="danger" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      {/* Role Metrics Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '14px',
          marginBottom: '22px'
        }}
      >
        {/* Total Accounts */}
        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: '#f1f5f9',
              color: '#334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Total Staff
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
              {stats.total}
            </div>
          </div>
        </div>

        {/* Owners */}
        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: '#f5f3ff',
              color: '#7c3aed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Crown size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#7c3aed', textTransform: 'uppercase' }}>
              Store Owners
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
              {stats.owners}
            </div>
          </div>
        </div>

        {/* Inventory Managers */}
        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: '#fffbeb',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Boxes size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#d97706', textTransform: 'uppercase' }}>
              Inventory Managers
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
              {stats.inventory}
            </div>
          </div>
        </div>

        {/* Cashiers & Active Shifts */}
        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: '#ecfdf5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <ShoppingBag size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#059669', textTransform: 'uppercase' }}>
              Cashiers ({stats.activeShifts} On Duty)
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
              {stats.cashiers}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '14px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: '1', minWidth: '240px', maxWidth: '420px' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search by name, username, or contact..."
              className="form-input"
              style={{ paddingLeft: '36px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Role & Status Filter Dropdowns */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={15} color="#64748b" />
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Role:</span>
              <select
                className="form-select"
                style={{ width: 'auto', padding: '6px 12px', fontSize: '0.85rem' }}
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="ALL">All Roles (3)</option>
                <option value="OWNER">Store Owner</option>
                <option value="INVENTORY_MANAGER">Inventory Manager</option>
                <option value="CASHIER">Cashier</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Status:</span>
              <select
                className="form-select"
                style={{ width: 'auto', padding: '6px 12px', fontSize: '0.85rem' }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active Only</option>
                <option value="INACTIVE">Disabled</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card">
        {loading ? (
          <LoadingSpinner text="Loading users..." />
        ) : filteredUsers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
            <Users size={36} color="#cbd5e1" style={{ margin: '0 auto 10px auto' }} />
            <div style={{ fontWeight: 600, color: '#334155' }}>No staff members match the current filter.</div>
            <div style={{ fontSize: '0.82rem', marginTop: '4px' }}>Try resetting your search query or role filter.</div>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Username</th>
                  <th>System Role (3)</th>
                  <th>Shift Status</th>
                  <th>Activity Record</th>
                  <th>Account Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const isCurrent = currentUser?.id === u.id;
                  const hasOpenShift = u.shifts && u.shifts.length > 0;
                  const displayRole = (u.role === 'OWNER' || u.role === 'ADMIN') ? 'OWNER' : u.role;

                  return (
                    <tr key={u.id}>
                      {/* Name & Contact */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '10px',
                              backgroundColor: displayRole === 'OWNER' ? '#f5f3ff' : displayRole === 'INVENTORY_MANAGER' ? '#fffbeb' : '#ecfdf5',
                              color: displayRole === 'OWNER' ? '#7c3aed' : displayRole === 'INVENTORY_MANAGER' ? '#d97706' : '#059669',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.9rem'
                            }}
                          >
                            {u.fullName?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>
                              {u.fullName} {isCurrent && <span style={{ fontSize: '0.72rem', color: '#2563eb' }}>(You)</span>}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {u.email || u.phone || 'No direct contact'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Username */}
                      <td style={{ color: '#475569', fontWeight: 600 }}>
                        @{u.username}
                      </td>

                      {/* Role Badge */}
                      <td>
                        {displayRole === 'OWNER' ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              backgroundColor: '#f5f3ff',
                              color: '#7c3aed',
                              padding: '4px 10px',
                              borderRadius: '8px',
                              fontWeight: 700,
                              fontSize: '0.78rem',
                              border: '1px solid #ddd6fe'
                            }}
                          >
                            <Crown size={13} /> Owner
                          </span>
                        ) : displayRole === 'INVENTORY_MANAGER' ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              backgroundColor: '#fffbeb',
                              color: '#b45309',
                              padding: '4px 10px',
                              borderRadius: '8px',
                              fontWeight: 700,
                              fontSize: '0.78rem',
                              border: '1px solid #fde68a'
                            }}
                          >
                            <Boxes size={13} /> Inventory Manager
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              backgroundColor: '#ecfdf5',
                              color: '#047857',
                              padding: '4px 10px',
                              borderRadius: '8px',
                              fontWeight: 700,
                              fontSize: '0.78rem',
                              border: '1px solid #a7f3d0'
                            }}
                          >
                            <ShoppingBag size={13} /> Cashier
                          </span>
                        )}
                      </td>

                      {/* Shift Status */}
                      <td>
                        {hasOpenShift ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              backgroundColor: '#dcfce7',
                              color: '#15803d',
                              padding: '3px 9px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 700
                            }}
                          >
                            <span
                              style={{
                                width: '7px',
                                height: '7px',
                                borderRadius: '50%',
                                backgroundColor: '#22c55e',
                                animation: 'pulse 1.8s infinite'
                              }}
                            />
                            On Duty (Shift Open)
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                            Off Duty
                          </span>
                        )}
                      </td>

                      {/* Activity Record */}
                      <td style={{ fontSize: '0.78rem', color: '#475569' }}>
                        <div>{u._count?.sales || 0} sales completed</div>
                        <div style={{ color: '#94a3b8' }}>{u._count?.shifts || 0} shifts logged</div>
                      </td>

                      {/* Status */}
                      <td>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            backgroundColor: u.isActive ? '#eff6ff' : '#f1f5f9',
                            color: u.isActive ? '#1d4ed8' : '#64748b',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}
                        >
                          {u.isActive ? (
                            <>
                              <CheckCircle2 size={12} color="#2563eb" /> Active
                            </>
                          ) : (
                            'Disabled'
                          )}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => openEditModal(u)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                        >
                          <Edit size={13} /> Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={isEditing ? `Edit Staff Account (@${formData.username})` : 'Create New Staff Account'}
        maxWidth="520px"
      >
        <form onSubmit={handleSubmit}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input
                type="text"
                required
                className="form-input"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="e.g. Sokha Chan"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Username *</label>
              <input
                type="text"
                required
                disabled={isEditing}
                className="form-input"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                placeholder="e.g. sokha123"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              {isEditing ? 'New Password (Leave blank to keep current)' : 'Password * (Min 8 chars)'}
            </label>
            <input
              type="password"
              className="form-input"
              placeholder={isEditing ? '••••••••' : 'Enter strong password'}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          {/* 3 Clear Roles Dropdown */}
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">System Role (3 Roles) *</label>
              <select
                className="form-select"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <option value="CASHIER">1. Cashier (POS Terminal & Shifts)</option>
                <option value="INVENTORY_MANAGER">2. Inventory Manager (Stock & Batches)</option>
                <option value="OWNER">3. Store Owner (Full Business Control)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Account Status</label>
              <select
                className="form-select"
                value={formData.isActive ? 'true' : 'false'}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })}
              >
                <option value="true">Active (Can log in)</option>
                <option value="false">Disabled (Access blocked)</option>
              </select>
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                placeholder="staff@supermarket.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="text"
                className="form-input"
                placeholder="+855 12 345 678"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={actionLoading}>
              {actionLoading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Account'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
