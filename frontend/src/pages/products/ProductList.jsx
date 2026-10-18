import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, Barcode, CheckCircle, XCircle } from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner, Alert } from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';

export default function ProductList() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    description: '',
    categoryId: '',
    costPrice: '',
    sellingPrice: '',
    unit: 'piece',
    reorderLevel: 10,
    trackExpiry: true,
    isActive: true,
    initialStock: '',
    expiryDate: ''
  });
  const [formLoading, setFormLoading] = useState(false);

  const { canManageProducts } = useAuth();

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError('');
      const [prodRes, catRes] = await Promise.all([
        api.get(`/products?search=${encodeURIComponent(search)}&categoryId=${selectedCategory}&status=${statusFilter}&limit=50`),
        api.get('/categories')
      ]);
      setProducts(prodRes.data || []);
      setCategories(catRes.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load products.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchProducts();
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setEditId(null);
    setFormData({
      name: '',
      sku: '',
      barcode: '',
      description: '',
      categoryId: categories[0]?.id || '',
      costPrice: '',
      sellingPrice: '',
      unit: 'piece',
      reorderLevel: 10,
      trackExpiry: true,
      isActive: true,
      initialStock: '',
      expiryDate: ''
    });
    setModalOpen(true);
  };

  const openEditModal = (product) => {
    setIsEditing(true);
    setEditId(product.id);
    setFormData({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode || '',
      description: product.description || '',
      categoryId: product.categoryId || '',
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      unit: product.unit,
      reorderLevel: product.reorderLevel,
      trackExpiry: product.trackExpiry,
      isActive: product.isActive,
      initialStock: '',
      expiryDate: ''
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        name: formData.name,
        sku: formData.sku,
        barcode: formData.barcode || undefined,
        description: formData.description || undefined,
        categoryId: formData.categoryId || undefined,
        costPrice: Number(formData.costPrice),
        sellingPrice: Number(formData.sellingPrice),
        unit: formData.unit,
        reorderLevel: Number(formData.reorderLevel),
        trackExpiry: formData.trackExpiry,
        isActive: formData.isActive
      };

      if (!isEditing && formData.initialStock && Number(formData.initialStock) > 0) {
        payload.initialStock = Number(formData.initialStock);
        payload.expiryDate = formData.expiryDate || undefined;
      }

      if (isEditing) {
        await api.put(`/products/${editId}`, payload);
        setSuccess('Product updated successfully.');
      } else {
        await api.post('/products', payload);
        setSuccess('Product created successfully with opening inventory batch.');
      }

      setModalOpen(false);
      fetchProducts();
    } catch (err) {
      alert(err.message || 'Operation failed.');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Products Catalog</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            Manage master product information, barcodes, pricing, and stock units
          </p>
        </div>
        {canManageProducts && (
          <button onClick={openCreateModal} className="btn btn-primary">
            <Plus size={16} /> Add Product
          </button>
        )}
      </div>

      <Alert type="danger" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      {/* Filter Bar */}
      <div className="card" style={{ padding: '14px 20px', marginBottom: '20px' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search
              size={18}
              style={{ position: 'absolute', left: '12px', top: '10px', color: '#64748b' }}
            />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '38px' }}
              placeholder="Search by name, SKU, or barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="form-select"
            style={{ width: '180px' }}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            className="form-select"
            style={{ width: '140px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All</option>
          </select>

          <button type="submit" className="btn btn-primary">
            Search
          </button>
        </form>
      </div>

      {/* Product Table */}
      <div className="card">
        {loading ? (
          <LoadingSpinner text="Loading products..." />
        ) : products.length === 0 ? (
          <div style={{ padding: '50px 20px', textAlign: 'center', color: '#94a3b8' }}>
            No products found matching filters.
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Barcode</th>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th>Cost ($)</th>
                  <th>Price ($)</th>
                  <th>Stock Available</th>
                  <th>Status</th>
                  {canManageProducts && <th style={{ textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td className="mono" style={{ fontWeight: 600 }}>
                      {p.sku}
                    </td>
                    <td className="mono" style={{ color: '#475569', fontSize: '0.8rem' }}>
                      {p.barcode || '—'}
                    </td>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td>{p.category?.name || 'Uncategorized'}</td>
                    <td className="mono">${Number(p.costPrice).toFixed(2)}</td>
                    <td className="mono" style={{ fontWeight: 700, color: '#2563eb' }}>
                      ${Number(p.sellingPrice).toFixed(2)}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          p.currentStock <= 0
                            ? 'badge-danger'
                            : p.isLowStock
                            ? 'badge-warning'
                            : 'badge-success'
                        }`}
                      >
                        {p.currentStock} {p.unit}s
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${p.isActive ? 'badge-success' : 'badge-neutral'}`}>
                        {p.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {canManageProducts && (
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => openEditModal(p)}
                        >
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

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={isEditing ? 'Edit Product' : 'Add New Product'}
        maxWidth="600px"
      >
        <form onSubmit={handleSubmit}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Product Name *</label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="e.g. Coca-Cola Can 330ml"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">SKU (Stock Keeping Unit) *</label>
              <input
                type="text"
                required
                className="form-input mono"
                placeholder="e.g. BEV-COKE-330"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Barcode (Scan or Type)</label>
              <input
                type="text"
                className="form-input mono"
                placeholder="e.g. 884100100102"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                className="form-select"
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              >
                <option value="">None / Uncategorized</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Cost Price ($) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                className="form-input mono"
                placeholder="0.00"
                value={formData.costPrice}
                onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Selling Price ($) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                className="form-input mono"
                placeholder="0.00"
                value={formData.sellingPrice}
                onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Unit of Measurement</label>
              <input
                type="text"
                className="form-input"
                placeholder="piece, can, bottle, kg, box"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Low Stock Reorder Alert Level</label>
              <input
                type="number"
                min="0"
                className="form-input mono"
                value={formData.reorderLevel}
                onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
              />
            </div>
          </div>

          {!isEditing && (
            <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '8px' }}>
                Initial Opening Stock (Optional)
              </div>
              <div className="grid-2">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Initial Quantity</label>
                  <input
                    type="number"
                    min="0"
                    className="form-input mono"
                    placeholder="0"
                    value={formData.initialStock}
                    onChange={(e) => setFormData({ ...formData, initialStock: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Batch Expiry Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem' }}>
              <input
                type="checkbox"
                checked={formData.trackExpiry}
                onChange={(e) => setFormData({ ...formData, trackExpiry: e.target.checked })}
              />
              Track Expiry Dates (FEFO)
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem' }}>
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              />
              Active in POS
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={formLoading}>
              {formLoading ? 'Saving...' : isEditing ? 'Update Product' : 'Create Product'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
