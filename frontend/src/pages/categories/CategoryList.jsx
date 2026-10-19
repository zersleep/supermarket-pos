import React, { useState, useEffect } from 'react';
import { Plus, Edit, Folder } from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner, Alert } from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';

export default function CategoryList() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', isActive: true });
  const [actionLoading, setActionLoading] = useState(false);

  const { canManageProducts } = useAuth();

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/categories?includeInactive=true');
      setCategories(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load categories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 3500);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const openCreateModal = () => {
    setIsEditing(false);
    setEditId(null);
    setFormData({ name: '', description: '', isActive: true });
    setModalOpen(true);
  };

  const openEditModal = (cat) => {
    setIsEditing(true);
    setEditId(cat.id);
    setFormData({ name: cat.name, description: cat.description || '', isActive: cat.isActive });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      if (isEditing) {
        await api.put(`/categories/${editId}`, formData);
        setSuccess('Category updated.');
      } else {
        await api.post('/categories', formData);
        setSuccess('Category created.');
      }
      setModalOpen(false);
      fetchCategories();
    } catch (err) {
      alert(err.message || 'Failed to save category.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Product Categories</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            Organize products by departments and aisle categories
          </p>
        </div>
        {canManageProducts && (
          <button onClick={openCreateModal} className="btn btn-primary">
            <Plus size={16} /> Add Category
          </button>
        )}
      </div>

      <Alert type="danger" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      <div className="card">
        {loading ? (
          <LoadingSpinner text="Loading categories..." />
        ) : categories.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
            No categories created yet.
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Category Name</th>
                  <th>Description</th>
                  <th>Product Count</th>
                  <th>Status</th>
                  {canManageProducts && <th style={{ textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td style={{ color: '#475569' }}>{c.description || '—'}</td>
                    <td className="mono">{c._count?.products || 0}</td>
                    <td>
                      <span className={`badge ${c.isActive ? 'badge-success' : 'badge-neutral'}`}>
                        {c.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {canManageProducts && (
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-outline btn-sm" onClick={() => openEditModal(c)}>
                          <Edit size={14} /> Edit
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

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={isEditing ? 'Edit Category' : 'Add Category'}
        maxWidth="450px"
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Category Name *</label>
            <input
              type="text"
              required
              className="form-input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              rows="2"
              className="form-textarea"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={actionLoading}>
              {actionLoading ? 'Saving...' : 'Save Category'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
