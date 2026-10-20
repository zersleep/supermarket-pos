import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  Store,
  Receipt,
  DollarSign,
  Clock,
  Download,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Sparkles,
  Info
} from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner, Alert } from '../../components/common/LoadingSpinner';

const EXCHANGE_RATE_PRESETS = [
  { label: '4,000 ៛', value: '4000' },
  { label: '4,100 ៛ (Standard)', value: '4100' },
  { label: '4,125 ៛', value: '4125' },
  { label: '4,150 ៛', value: '4150' },
  { label: '4,200 ៛', value: '4200' }
];

export default function StoreSettings() {
  const [settings, setSettings] = useState({
    STORE_NAME: 'Supermarket POS',
    STORE_ADDRESS: '123 Monivong Blvd, Phnom Penh, Cambodia',
    STORE_PHONE: '+855 23 888 999',
    TAX_IDENTIFIER_NUMBER: 'K002-901827462',
    RECEIPT_HEADER: 'Thank you for shopping at Supermarket POS!',
    RECEIPT_FOOTER: 'Goods sold are returnable within 7 days with valid receipt.',
    CURRENCY_CODE: 'USD',
    EXCHANGE_RATE_KHR: '4100',
    TAX_PERCENT: '0',
    EXPIRY_WARNING_DAYS: '30',
    LOW_STOCK_THRESHOLD: '10'
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exportingBackup, setExportingBackup] = useState(false);
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

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [success]);

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
      setSuccess('Store configuration & receipt settings updated successfully.');
    } catch (err) {
      setError(err.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      setExportingBackup(true);
      setError('');

      // Fetch products, categories, and current settings
      const [productsRes, categoriesRes] = await Promise.all([
        api.get('/products?limit=1000').catch(() => ({ data: [] })),
        api.get('/categories').catch(() => ({ data: [] }))
      ]);

      const backupData = {
        system: 'Supermarket POS Enterprise',
        exportDate: new Date().toISOString(),
        exportedByRole: 'OWNER',
        settings,
        categories: categoriesRes.data || [],
        productsCount: productsRes.data?.length || 0,
        products: productsRes.data || []
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `supermarket-store-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setSuccess('Full store configuration & catalog backup exported successfully!');
    } catch (err) {
      setError('Backup export failed: ' + (err.message || 'Unknown error'));
    } finally {
      setExportingBackup(false);
    }
  };

  // Preview calculations
  const parsedRate = parseFloat(settings.EXCHANGE_RATE_KHR) || 4100;
  const parsedTax = parseFloat(settings.TAX_PERCENT) || 0;
  const sampleSubtotal = 14.50;
  const sampleDiscount = 1.50;
  const sampleTax = ((sampleSubtotal - sampleDiscount) * (parsedTax / 100));
  const sampleTotalUSD = (sampleSubtotal - sampleDiscount + sampleTax);
  const sampleTotalKHR = Math.round(sampleTotalUSD * parsedRate);

  if (loading) {
    return <LoadingSpinner text="Loading business settings..." />;
  }

  return (
    <div style={{ paddingBottom: '40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
              Store & POS Settings
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
              Owner Executive Console
            </span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>
            Receipt branding, dual-currency exchange rate, VAT compliance, and inventory thresholds
          </p>
        </div>

        {isOwner && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={handleExportBackup}
              disabled={exportingBackup}
              className="btn btn-outline"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', borderColor: '#cbd5e1' }}
              title="Download store catalog, settings, and metadata as a JSON file"
            >
              <Download size={16} color="#2563eb" />
              {exportingBackup ? 'Exporting...' : 'Export Backup (JSON)'}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Save size={16} />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        )}
      </div>

      <Alert type="danger" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      {/* Main 2-Column Layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.45fr) minmax(320px, 1fr)',
          gap: '24px',
          alignItems: 'start'
        }}
      >
        {/* Left Side: Form Controls */}
        <form onSubmit={handleSave}>
          {/* Store Profile */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Store size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                  Business Profile & Branding
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Supermarket legal entity and contact information
                </span>
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Supermarket Display Name *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={settings.STORE_NAME || ''}
                  onChange={(e) => handleChange('STORE_NAME', e.target.value)}
                  disabled={!isOwner}
                  placeholder="e.g. Supermarket POS"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Contact Phone Number *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={settings.STORE_PHONE || ''}
                  onChange={(e) => handleChange('STORE_PHONE', e.target.value)}
                  disabled={!isOwner}
                  placeholder="+855 23 888 999"
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Store Location Address *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={settings.STORE_ADDRESS || ''}
                  onChange={(e) => handleChange('STORE_ADDRESS', e.target.value)}
                  disabled={!isOwner}
                  placeholder="123 Monivong Blvd, Phnom Penh, Cambodia"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tax / TIN Identification Number</label>
                <input
                  type="text"
                  className="form-input"
                  value={settings.TAX_IDENTIFIER_NUMBER || ''}
                  onChange={(e) => handleChange('TAX_IDENTIFIER_NUMBER', e.target.value)}
                  disabled={!isOwner}
                  placeholder="e.g. K002-901827462 (Optional)"
                />
              </div>
            </div>
          </div>

          {/* Currency & Tax Rates */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: '#ecfdf5',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <DollarSign size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                  Dual-Currency & Exchange Rate
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Manage USD & Cambodian Riel conversion at POS checkout
                </span>
              </div>
            </div>

            <div className="grid-3">
              <div className="form-group">
                <label className="form-label">Primary Store Currency</label>
                <select
                  className="form-select"
                  value={settings.CURRENCY_CODE || 'USD'}
                  onChange={(e) => handleChange('CURRENCY_CODE', e.target.value)}
                  disabled={!isOwner}
                >
                  <option value="USD">USD ($) - United States Dollar</option>
                  <option value="KHR">KHR (៛) - Cambodian Riel</option>
                </select>
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">
                  Exchange Rate: 1 USD to KHR (៛) *
                </label>
                <input
                  type="number"
                  required
                  min="1000"
                  max="10000"
                  className="form-input"
                  value={settings.EXCHANGE_RATE_KHR || '4100'}
                  onChange={(e) => handleChange('EXCHANGE_RATE_KHR', e.target.value)}
                  disabled={!isOwner}
                />
              </div>
            </div>

            {/* Quick Presets */}
            {isOwner && (
              <div style={{ marginTop: '8px', marginBottom: '16px' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '6px', fontWeight: 600 }}>
                  Quick Exchange Rate Presets:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {EXCHANGE_RATE_PRESETS.map((p) => {
                    const isSelected = settings.EXCHANGE_RATE_KHR === p.value;
                    return (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => handleChange('EXCHANGE_RATE_KHR', p.value)}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          border: isSelected ? '1px solid #2563eb' : '1px solid #e2e8f0',
                          backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                          color: isSelected ? '#2563eb' : '#475569'
                        }}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Default Tax / VAT Percentage (%)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    className="form-input"
                    value={settings.TAX_PERCENT || '0'}
                    onChange={(e) => handleChange('TAX_PERCENT', e.target.value)}
                    disabled={!isOwner}
                  />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>%</span>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  Set to 0% if tax-inclusive or tax-exempt.
                </span>
              </div>
            </div>
          </div>

          {/* Receipt Customization */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: '#fffbeb',
                  color: '#f59e0b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Receipt size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                  Thermal Receipt Layout & Policies
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Customer receipt greeting and store refund policies
                </span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Receipt Header Welcome Greeting</label>
              <input
                type="text"
                className="form-input"
                value={settings.RECEIPT_HEADER || ''}
                onChange={(e) => handleChange('RECEIPT_HEADER', e.target.value)}
                disabled={!isOwner}
                placeholder="Thank you for shopping at Supermarket POS!"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Receipt Footer Return & Exchange Policy</label>
              <textarea
                rows={2}
                className="form-input"
                style={{ resize: 'vertical' }}
                value={settings.RECEIPT_FOOTER || ''}
                onChange={(e) => handleChange('RECEIPT_FOOTER', e.target.value)}
                disabled={!isOwner}
                placeholder="Goods sold are returnable within 7 days with valid receipt."
              />
            </div>
          </div>

          {/* Inventory Warning Thresholds */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: '#f5f3ff',
                  color: '#8b5cf6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Clock size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                  Inventory Warning Thresholds
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Automated notifications for batch expiry and stock depletion
                </span>
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Shelf Expiry Alert Warning (Days) *</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  required
                  className="form-input"
                  value={settings.EXPIRY_WARNING_DAYS || '30'}
                  onChange={(e) => handleChange('EXPIRY_WARNING_DAYS', e.target.value)}
                  disabled={!isOwner}
                />
                <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  Items expiring within this window appear on the manager dashboard.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Default Low Stock Reorder Threshold *</label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  required
                  className="form-input"
                  value={settings.LOW_STOCK_THRESHOLD || '10'}
                  onChange={(e) => handleChange('LOW_STOCK_THRESHOLD', e.target.value)}
                  disabled={!isOwner}
                />
                <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  Triggers purchase order reorder recommendation when total units drop.
                </span>
              </div>
            </div>
          </div>

          {/* Mobile Save Button */}
          {isOwner && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', fontSize: '1rem' }}
                disabled={saving}
              >
                <Save size={18} />
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          )}
        </form>

        {/* Right Side: Live Thermal Receipt Preview */}
        <div style={{ position: 'sticky', top: '20px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={16} color="#2563eb" />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                Live Receipt Preview
              </span>
            </div>
            <span
              style={{
                fontSize: '0.72rem',
                backgroundColor: '#dcfce7',
                color: '#15803d',
                padding: '2px 8px',
                borderRadius: '6px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
              Real-time 80mm
            </span>
          </div>

          {/* Thermal Receipt Paper Card */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
              padding: '26px 22px',
              fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
              color: '#0f172a',
              position: 'relative'
            }}
          >
            {/* Store Header */}
            <div style={{ textAlign: 'center', borderBottom: '1px dashed #cbd5e1', paddingBottom: '14px', marginBottom: '14px' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
                {settings.STORE_NAME || 'SUPERMARKET POS'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '3px' }}>
                {settings.STORE_ADDRESS || 'Store Address Here'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Tel: {settings.STORE_PHONE || 'Phone Number'}
              </div>
              {settings.TAX_IDENTIFIER_NUMBER && (
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                  VAT TIN: {settings.TAX_IDENTIFIER_NUMBER}
                </div>
              )}
              {settings.RECEIPT_HEADER && (
                <div style={{ fontSize: '0.75rem', fontStyle: 'italic', color: '#2563eb', marginTop: '6px', fontWeight: 500 }}>
                  "{settings.RECEIPT_HEADER}"
                </div>
              )}
            </div>

            {/* Receipt Meta */}
            <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <div>RCP: #REC-2026-0892</div>
                <div>Cashier: Sokha (Reg 01)</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div>Date: {new Date().toLocaleDateString()}</div>
                <div>Time: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>

            {/* Sample Items Table */}
            <div style={{ borderTop: '1px dashed #cbd5e1', borderBottom: '1px dashed #cbd5e1', padding: '10px 0', marginBottom: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                <span>ITEM</span>
                <span style={{ textAlign: 'center' }}>QTY</span>
                <span style={{ textAlign: 'right' }}>AMOUNT</span>
              </div>

              {/* Sample Item 1 */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', fontSize: '0.78rem', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600 }}>Vital Mineral Water 500ml</span>
                <span style={{ textAlign: 'center' }}>2</span>
                <span style={{ textAlign: 'right' }}>$1.00</span>
              </div>

              {/* Sample Item 2 with Discount */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', fontSize: '0.78rem', marginBottom: '4px' }}>
                <div>
                  <span style={{ fontWeight: 600 }}>Angkor Premium Beer 330ml</span>
                  <div style={{ fontSize: '0.68rem', color: '#16a34a' }}>Promo -$1.50 off</div>
                </div>
                <span style={{ textAlign: 'center' }}>6</span>
                <span style={{ textAlign: 'right' }}>$7.50</span>
              </div>

              {/* Sample Item 3 */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', fontSize: '0.78rem' }}>
                <span style={{ fontWeight: 600 }}>Farm Fresh Organic Eggs 10s</span>
                <span style={{ textAlign: 'center' }}>1</span>
                <span style={{ textAlign: 'right' }}>$6.00</span>
              </div>
            </div>

            {/* Totals */}
            <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                <span>Subtotal (3 items):</span>
                <span>${sampleSubtotal.toFixed(2)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', fontWeight: 600 }}>
                <span>Discount / Promo:</span>
                <span>-${sampleDiscount.toFixed(2)}</span>
              </div>

              {parsedTax > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                  <span>VAT / Tax ({parsedTax}%):</span>
                  <span>${sampleTax.toFixed(2)}</span>
                </div>
              )}

              {/* Grand Total USD */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  color: '#0f172a',
                  borderTop: '1px solid #e2e8f0',
                  paddingTop: '6px',
                  marginTop: '4px'
                }}
              >
                <span>TOTAL USD:</span>
                <span style={{ color: '#2563eb' }}>${sampleTotalUSD.toFixed(2)}</span>
              </div>

              {/* Grand Total KHR */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  color: '#059669'
                }}
              >
                <span>TOTAL KHR:</span>
                <span>៛{sampleTotalKHR.toLocaleString()}</span>
              </div>

              <div style={{ fontSize: '0.7rem', color: '#64748b', textAlign: 'right' }}>
                Rate: $1.00 = ៛{parsedRate.toLocaleString()} KHR
              </div>
            </div>

            {/* Simulated Barcode */}
            <div style={{ textAlign: 'center', padding: '10px 0', borderTop: '1px dashed #cbd5e1' }}>
              <div
                style={{
                  height: '32px',
                  margin: '0 auto 6px auto',
                  maxWidth: '220px',
                  background: 'repeating-linear-gradient(90deg, #0f172a 0px, #0f172a 2px, transparent 2px, transparent 4px, #0f172a 4px, #0f172a 7px, transparent 7px, transparent 9px)'
                }}
              />
              <div style={{ fontSize: '0.68rem', letterSpacing: '0.2em', color: '#64748b' }}>
                *REC-2026-0892*
              </div>
            </div>

            {/* Footer Notice */}
            {settings.RECEIPT_FOOTER && (
              <div
                style={{
                  textAlign: 'center',
                  fontSize: '0.72rem',
                  color: '#64748b',
                  marginTop: '10px',
                  lineHeight: 1.4,
                  borderTop: '1px dashed #cbd5e1',
                  paddingTop: '10px'
                }}
              >
                {settings.RECEIPT_FOOTER}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
