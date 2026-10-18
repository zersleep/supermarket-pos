import React, { useState, useEffect } from 'react';
import { Settings, Save, Store, Receipt, DollarSign, Clock } from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner, Alert } from '../../components/common/LoadingSpinner';

export default function StoreSettings() {
  const [settings, setSettings] = useState({
    STORE_NAME: 'Metro Supermarket',
    STORE_ADDRESS: '123 Monivong Blvd, Phnom Penh, Cambodia',
    STORE_PHONE: '+855 23 888 999',
    RECEIPT_HEADER: 'Thank you for shopping at Metro Supermarket!',
    RECEIPT_FOOTER: 'Goods sold are returnable within 7 days with valid receipt.',
    CURRENCY_CODE: 'USD',
    EXCHANGE_RATE_KHR: '4100',
    TAX_PERCENT: '0',
    EXPIRY_WARNING_DAYS: '30',
    LOW_STOCK_THRESHOLD: '10'
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { isOwner } = useAuth();

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        setError('');
        const res = await api.get('/settings');
        if (res.data?.map) {
          setSettings((prev) => ({ ...prev, ...res.data.map }));
        }
      } catch (err) {
        setError(err.message || 'Failed to load settings.');
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!isOwner) {
      alert('Only the System Owner can modify business settings.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await api.put('/settings', { settings });
      setSuccess('Business settings saved successfully.');
    } catch (err) {
      setError(err.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading settings..." />;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Store & POS Settings</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            Receipt information, currency exchange rates, tax parameters, and inventory thresholds
          </p>
        </div>
      </div>

      <Alert type="danger" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      <form onSubmit={handleSave}>
        {/* Store Profile */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Store size={20} color="#2563eb" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Business Profile</h3>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Supermarket Display Name *</label>
              <input
                type="text"
                required
                className="form-input"
                value={settings.STORE_NAME}
                onChange={(e) => handleChange('STORE_NAME', e.target.value)}
                disabled={!isOwner}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Contact Phone Number</label>
              <input
                type="text"
                className="form-input"
                value={settings.STORE_PHONE}
                onChange={(e) => handleChange('STORE_PHONE', e.target.value)}
                disabled={!isOwner}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Store Location Address</label>
            <input
              type="text"
              className="form-input"
              value={settings.STORE_ADDRESS}
              onChange={(e) => handleChange('STORE_ADDRESS', e.target.value)}
              disabled={!isOwner}
            />
          </div>
        </div>

        {/* Currency & Tax */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <DollarSign size={20} color="#10b981" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Currency & Tax Rates</h3>
          </div>

          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">Primary Currency</label>
              <select
                className="form-select"
                value={settings.CURRENCY_CODE}
                onChange={(e) => handleChange('CURRENCY_CODE', e.target.value)}
                disabled={!isOwner}
              >
                <option value="USD">USD ($)</option>
                <option value="KHR">KHR (៛)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Exchange Rate: 1 USD to KHR (៛) *</label>
              <input
                type="number"
                required
                className="form-input mono"
                value={settings.EXCHANGE_RATE_KHR}
                onChange={(e) => handleChange('EXCHANGE_RATE_KHR', e.target.value)}
                disabled={!isOwner}
              />
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Standard Cambodia rate: 4,100 KHR / USD
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Default Tax Rate (%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                className="form-input mono"
                value={settings.TAX_PERCENT}
                onChange={(e) => handleChange('TAX_PERCENT', e.target.value)}
                disabled={!isOwner}
              />
            </div>
          </div>
        </div>

        {/* Receipt Layout */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Receipt size={20} color="#f59e0b" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Receipt Header & Footer</h3>
          </div>

          <div className="form-group">
            <label className="form-label">Receipt Header Message</label>
            <input
              type="text"
              className="form-input"
              value={settings.RECEIPT_HEADER}
              onChange={(e) => handleChange('RECEIPT_HEADER', e.target.value)}
              disabled={!isOwner}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Receipt Footer Return Policy</label>
            <input
              type="text"
              className="form-input"
              value={settings.RECEIPT_FOOTER}
              onChange={(e) => handleChange('RECEIPT_FOOTER', e.target.value)}
              disabled={!isOwner}
            />
          </div>
        </div>

        {/* Inventory Warning Thresholds */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Clock size={20} color="#8b5cf6" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Inventory Warning Thresholds</h3>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Expiry Warning Alert Days *</label>
              <input
                type="number"
                min="1"
                required
                className="form-input mono"
                value={settings.EXPIRY_WARNING_DAYS}
                onChange={(e) => handleChange('EXPIRY_WARNING_DAYS', e.target.value)}
                disabled={!isOwner}
              />
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Batches expiring within this number of days will show in dashboard alerts.
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Default Low Stock Reorder Threshold</label>
              <input
                type="number"
                min="1"
                required
                className="form-input mono"
                value={settings.LOW_STOCK_THRESHOLD}
                onChange={(e) => handleChange('LOW_STOCK_THRESHOLD', e.target.value)}
                disabled={!isOwner}
              />
            </div>
          </div>
        </div>

        {isOwner && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
              <Save size={18} /> {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
