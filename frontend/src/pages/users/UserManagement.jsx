import React, { useState, useEffect } from 'react';
import { Plus, Edit, UserCheck, Shield, Lock } from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner, Alert } from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

  const { isOwner } = useAuth();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/users');
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
      role: u.role,
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
        setSuccess('User created successfully.');
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
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>User & Role Management</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            System accounts, role-based access control, and cashier credentials
          </p>
        </div>
        <button onClick={openCreateModal} className="btn btn-primary">
          <Plus size={16} /> Add User
        </button>
      </div>

      <Alert type="danger" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      <div className="card">
        {loading ? (
          <LoadingSpinner text="Loading users..." />
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Full Name</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Email & Phone</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.fullName}</td>
                    <td className="mono" style={{ color: '#64748b' }}>
                      {u.username}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          u.role === 'OWNER'
                            ? 'badge-danger'
                            : u.role === 'ADMIN'
                            ? 'badge-primary'
                            : u.role === 'INVENTORY_MANAGER'
                            ? 'badge-warning'
                            : 'badge-success'
                        }`}
                      >
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>
                      {u.email || u.phone ? `${u.email || ''} ${u.phone ? `(${u.phone})` : ''}` : '—'}
                    </td>
                    <td>
                      <span className={`badge ${u.isActive ? 'badge-success' : 'badge-neutral'}`}>
                        {u.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-outline btn-sm" onClick={() => openEditModal(u)}>
                        <Edit size={14} /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={isEditing ? `Edit User (${formData.username})` : 'Create User Account'}
        maxWidth="500px"
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
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              {isEditing ? 'New Password (Leave blank to keep unchanged)' : 'Password * (Min 8 chars)'}
            </label>
            <input
              type="password"
              className="form-input"
              placeholder={isEditing ? '••••••••' : 'Enter strong password'}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">System Role *</label>
              <select
                className="form-select"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <option value="CASHIER">Cashier (POS & Shift)</option>
                <option value="INVENTORY_MANAGER">Inventory Manager</option>
                <option value="ADMIN">Administrator</option>
                {isOwner && <option value="OWNER">Owner (Full Access)</option>}
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
                <option value="false">Deactivated (Blocked)</option>
              </select>
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone</label>
              <input
                type="text"
                className="form-input"
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
              {actionLoading ? 'Saving...' : isEditing ? 'Update User' : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
