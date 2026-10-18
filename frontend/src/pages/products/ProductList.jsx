import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Edit, Barcode, CheckCircle, XCircle, X, Upload, Trash2 } from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner, Alert } from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import { getProductImageUrl } from '../../utils/productImages';

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
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef(null);
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
    imageUrl: '',
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

  const handleClearSearch = async () => {
    setSearch('');
    try {
      setLoading(true);
      setError('');
      const [prodRes, catRes] = await Promise.all([
        api.get(`/products?search=&categoryId=${selectedCategory}&status=${statusFilter}&limit=50`),
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

  const handleImageFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please choose an image file (PNG, JPG, JPEG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        // Resize proportionally if larger than 800px max dimension
        const maxDim = 800;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);

        setFormData((prev) => ({ ...prev, imageUrl: dataUrl }));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
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
      imageUrl: '',
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
      imageUrl: product.imageUrl || '',
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
        imageUrl: formData.imageUrl || undefined,
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
              style={{ paddingLeft: '38px', paddingRight: search ? '36px' : '14px' }}
              placeholder="Search by name, SKU, or barcode..."
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
                    <td style={{ fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img
                          src={getProductImageUrl(p)}
                          alt={p.name}
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '8px',
                            objectFit: 'cover',
                            border: '1px solid #e2e8f0',
                            backgroundColor: '#f8fafc',
                            flexShrink: 0
                          }}
                        />
                        <span>{p.name}</span>
                      </div>
                    </td>
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

          {/* Product Picture Upload & Live Preview */}
          <div className="form-group" style={{ marginBottom: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="form-label" style={{ marginBottom: 0, fontWeight: 600 }}>Product Picture</label>
              <button
                type="button"
                onClick={() => setShowUrlInput(!showUrlInput)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563eb',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                {showUrlInput ? 'Hide image link' : 'Or enter image link'}
              </button>
            </div>

            {/* Hidden Native File Input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleImageFileSelect}
            />

            {/* Image Upload Area / Preview Card */}
            {formData.imageUrl ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '12px 16px',
                  backgroundColor: '#f8fafc',
                  border: '1.5px solid #bfdbfe',
                  borderRadius: '12px'
                }}
              >
                <img
                  src={formData.imageUrl}
                  alt="Product preview"
                  style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '10px',
                    objectFit: 'cover',
                    border: '1.5px solid #2563eb',
                    backgroundColor: '#ffffff',
                    flexShrink: 0
                  }}
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=500&auto=format&fit=crop&q=80';
                  }}
                />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>
                    Picture ready
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => fileInputRef.current?.click()}
                      style={{ fontSize: '0.75rem', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '5px' }}
                    >
                      <Upload size={14} /> Change Picture
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => setFormData({ ...formData, imageUrl: '' })}
                      style={{
                        fontSize: '0.75rem',
                        padding: '5px 10px',
                        color: '#dc2626',
                        borderColor: '#fca5a5',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <Trash2 size={14} /> Remove
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed #93c5fd',
                  borderRadius: '12px',
                  padding: '20px',
                  textAlign: 'center',
                  backgroundColor: '#eff6ff',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease'
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    backgroundColor: '#dbeafe',
                    color: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 10px auto'
                  }}
                >
                  <Upload size={22} />
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e40af' }}>
                  Click to choose a picture from your device
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                  Supports PNG, JPG, or WebP files
                </div>
              </div>
            )}

            {/* Optional URL input if toggled */}
            {showUrlInput && (
              <div style={{ marginTop: '10px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="https://... (or paste direct image URL)"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                />
              </div>
            )}

            {/* Demo Sample Pictures Presets */}
            <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Presets:</span>
              {[
                { label: 'Water', url: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=500&auto=format&fit=crop&q=80' },
                { label: 'Coke', url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&auto=format&fit=crop&q=80' },
                { label: 'Milk', url: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=500&auto=format&fit=crop&q=80' },
                { label: 'Bread', url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=80' },
                { label: 'Rice', url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=80' },
                { label: 'Chips', url: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500&auto=format&fit=crop&q=80' }
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: '0.675rem', padding: '3px 8px' }}
                  onClick={() => setFormData({ ...formData, imageUrl: preset.url })}
                >
                  {preset.label}
                </button>
              ))}
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
