import React, { useState } from 'react';
import {
  Code,
  FileText,
  Copy,
  Check,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  ShoppingCart,
  Users,
  ShieldCheck,
  Settings,
  RotateCcw,
  Clock,
  Layers,
  AlertCircle,
  Tag,
  CheckCircle2,
  Boxes,
  HelpCircle
} from 'lucide-react';

/**
 * Metadata definition for each audit action
 */
export const ACTION_CONFIG = {
  // Authentication & Security
  AUTH_LOGIN: {
    label: 'User Sign In',
    category: 'auth',
    badgeClass: 'badge-success',
    icon: ShieldCheck,
    color: '#10b981',
    description: 'User successfully authenticated and opened a session.'
  },
  AUTH_LOGOUT: {
    label: 'User Sign Out',
    category: 'auth',
    badgeClass: 'badge-outline',
    icon: ShieldCheck,
    color: '#64748b',
    description: 'User logged out and destroyed active session.'
  },
  AUTH_PASSWORD_CHANGE: {
    label: 'Password Changed',
    category: 'auth',
    badgeClass: 'badge-warning',
    icon: ShieldCheck,
    color: '#f59e0b',
    description: 'User password was changed or reset.'
  },
  SYSTEM_SETUP: {
    label: 'System Initialized',
    category: 'auth',
    badgeClass: 'badge-primary',
    icon: ShieldCheck,
    color: '#2563eb',
    description: 'First-time setup completed and owner account initialized.'
  },

  // Products & Catalog
  PRODUCT_CREATE: {
    label: 'Product Created',
    category: 'inventory',
    badgeClass: 'badge-success',
    icon: Package,
    color: '#10b981',
    description: 'New product catalog entry added to the system.'
  },
  PRODUCT_UPDATE: {
    label: 'Product Updated',
    category: 'inventory',
    badgeClass: 'badge-primary',
    icon: Package,
    color: '#2563eb',
    description: 'Product details, pricing, or catalog attributes modified.'
  },
  CATEGORY_CREATE: {
    label: 'Category Created',
    category: 'inventory',
    badgeClass: 'badge-success',
    icon: Layers,
    color: '#10b981',
    description: 'New product category added.'
  },
  CATEGORY_UPDATE: {
    label: 'Category Updated',
    category: 'inventory',
    badgeClass: 'badge-primary',
    icon: Layers,
    color: '#2563eb',
    description: 'Product category attributes modified.'
  },

  // Inventory & Stock
  STOCK_ADJUSTMENT: {
    label: 'Stock Adjusted',
    category: 'inventory',
    badgeClass: 'badge-warning',
    icon: Boxes,
    color: '#f59e0b',
    description: 'Manual inventory count, damage, or discrepancy adjustment.'
  },
  BATCH_WRITE_OFF: {
    label: 'Batch Written Off',
    category: 'inventory',
    badgeClass: 'badge-danger',
    icon: Boxes,
    color: '#ef4444',
    description: 'Inventory batch marked as expired, damaged, or written off.'
  },

  // Purchasing & Suppliers
  PO_CREATE: {
    label: 'PO Created',
    category: 'purchasing',
    badgeClass: 'badge-primary',
    icon: FileText,
    color: '#2563eb',
    description: 'Purchase order created in Draft status.'
  },
  PO_STATUS_CHANGE: {
    label: 'PO Status Changed',
    category: 'purchasing',
    badgeClass: 'badge-warning',
    icon: FileText,
    color: '#f59e0b',
    description: 'Purchase order transitioned to a new approval/fulfillment state.'
  },
  GOODS_RECEIPT: {
    label: 'Goods Received',
    category: 'purchasing',
    badgeClass: 'badge-success',
    icon: Package,
    color: '#10b981',
    description: 'Stock inbound confirmed from purchase order.'
  },
  SUPPLIER_CREATE: {
    label: 'Supplier Added',
    category: 'purchasing',
    badgeClass: 'badge-success',
    icon: Users,
    color: '#10b981',
    description: 'New vendor/supplier profile created.'
  },
  SUPPLIER_UPDATE: {
    label: 'Supplier Updated',
    category: 'purchasing',
    badgeClass: 'badge-primary',
    icon: Users,
    color: '#2563eb',
    description: 'Supplier contact or terms updated.'
  },
  SUPPLIER_DEACTIVATE: {
    label: 'Supplier Deactivated',
    category: 'purchasing',
    badgeClass: 'badge-warning',
    icon: Users,
    color: '#f59e0b',
    description: 'Supplier profile disabled.'
  },
  SUPPLIER_DELETE: {
    label: 'Supplier Deleted',
    category: 'purchasing',
    badgeClass: 'badge-danger',
    icon: Users,
    color: '#ef4444',
    description: 'Supplier profile removed.'
  },

  // Sales & POS
  SALE_COMPLETED: {
    label: 'Sale Completed',
    category: 'sales',
    badgeClass: 'badge-success',
    icon: ShoppingCart,
    color: '#10b981',
    description: 'POS transaction finalized and payment settled.'
  },
  SALE_CREATED_PENDING: {
    label: 'Sale Pending',
    category: 'sales',
    badgeClass: 'badge-warning',
    icon: ShoppingCart,
    color: '#f59e0b',
    description: 'Sale created awaiting payment confirmation.'
  },
  SALE_REFUND: {
    label: 'Sale Refunded',
    category: 'sales',
    badgeClass: 'badge-danger',
    icon: RotateCcw,
    color: '#ef4444',
    description: 'Return or refund processed for completed sale.'
  },
  PAYMENT_CONFIRM: {
    label: 'Payment Verified',
    category: 'sales',
    badgeClass: 'badge-success',
    icon: DollarSign,
    color: '#10b981',
    description: 'Cashier/manager verified external or digital payment.'
  },
  PAYMENT_CANCEL: {
    label: 'Payment Cancelled',
    category: 'sales',
    badgeClass: 'badge-danger',
    icon: DollarSign,
    color: '#ef4444',
    description: 'Payment attempt was cancelled or rejected.'
  },

  // Cashier Shifts & Cash Drawers
  SHIFT_OPEN: {
    label: 'Shift Opened',
    category: 'shifts',
    badgeClass: 'badge-primary',
    icon: Clock,
    color: '#2563eb',
    description: 'Cash drawer float verified and register shift opened.'
  },
  SHIFT_CLOSE: {
    label: 'Shift Closed & Reconciled',
    category: 'shifts',
    badgeClass: 'badge-warning',
    icon: Clock,
    color: '#f59e0b',
    description: 'Cash counted, shift closed, and cash variance reconciled.'
  },
  SHIFT_CASH_IN: {
    label: 'Cash-In Float Addition',
    category: 'shifts',
    badgeClass: 'badge-primary',
    icon: DollarSign,
    color: '#2563eb',
    description: 'Additional cash float added to register drawer.'
  },
  SHIFT_CASH_OUT: {
    label: 'Cash-Out / Drawer Drop',
    category: 'shifts',
    badgeClass: 'badge-warning',
    icon: DollarSign,
    color: '#f59e0b',
    description: 'Cash removed from register drawer for safe deposit or expense.'
  },

  // Settings & System
  SETTINGS_UPDATE: {
    label: 'Settings Updated',
    category: 'settings',
    badgeClass: 'badge-primary',
    icon: Settings,
    color: '#2563eb',
    description: 'System-wide configuration, store settings, or rates modified.'
  },
  USER_CREATE: {
    label: 'User Created',
    category: 'auth',
    badgeClass: 'badge-success',
    icon: Users,
    color: '#10b981',
    description: 'New employee / system user account created.'
  },
  USER_UPDATE: {
    label: 'User Updated',
    category: 'auth',
    badgeClass: 'badge-primary',
    icon: Users,
    color: '#2563eb',
    description: 'User permissions, role, or contact details updated.'
  }
};

/**
 * Format raw keys into Title Case labels
 */
export function formatFieldLabel(key) {
  if (!key) return '';
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
}

/**
 * Format currency amounts nicely
 */
export function formatCurrencyValue(val) {
  if (val === null || val === undefined) return '—';
  const num = Number(val);
  if (isNaN(num)) return String(val);
  return `$${num.toFixed(2)}`;
}

/**
 * Generate a quick 1-line human summary for tables
 */
export function getAuditLogSummary(log) {
  if (!log) return '—';
  const d = log.details || {};
  const action = log.action || '';

  switch (action) {
    case 'PRODUCT_UPDATE':
      if (d.oldPrice !== undefined && d.newPrice !== undefined) {
        return `${d.name || 'Product'}: $${Number(d.oldPrice).toFixed(2)} → $${Number(d.newPrice).toFixed(2)}`;
      }
      return d.name ? `Updated "${d.name}"` : 'Product details modified';

    case 'PRODUCT_CREATE':
      return `Created "${d.name || 'Product'}" • Price: $${Number(d.sellingPrice || 0).toFixed(2)}`;

    case 'STOCK_ADJUSTMENT':
      const qtySign = Number(d.quantity) > 0 ? `+${d.quantity}` : `${d.quantity}`;
      return `${d.productName || 'Item'} (${qtySign} units) • ${d.reason || d.type || 'Adjustment'}`;

    case 'BATCH_WRITE_OFF':
      return `${d.productName || 'Batch'} (${d.quantity} units) • ${d.reason || 'Write-off'}`;

    case 'SALE_COMPLETED':
      return `Receipt #${d.receiptNumber || '—'} • Total: $${Number(d.grandTotal || 0).toFixed(2)}`;

    case 'SALE_CREATED_PENDING':
      return `Receipt #${d.receiptNumber || '—'} (Pending)`;

    case 'SALE_REFUND':
      return `Refund #${d.refundNumber || '—'} • Amount: -$${Number(d.refundAmount || 0).toFixed(2)}`;

    case 'PAYMENT_CONFIRM':
      return `Payment $${Number(d.amount || 0).toFixed(2)} • Receipt #${d.receiptNumber || '—'}`;

    case 'SHIFT_OPEN':
      return `Opening Float: $${Number(d.openingCash || 0).toFixed(2)}`;

    case 'SHIFT_CLOSE':
      const diff = Number(d.difference || 0);
      const diffText = diff === 0 ? 'Exact match' : diff > 0 ? `+$${diff.toFixed(2)}` : `-$${Math.abs(diff).toFixed(2)}`;
      return `Expected: $${Number(d.expectedCash || 0).toFixed(2)} • Cashier: ${d.cashierName || '—'} (${diffText})`;

    case 'SHIFT_CASH_IN':
      return `Cash In: +$${Number(d.amount || 0).toFixed(2)} (${d.reason || 'Float'})`;

    case 'SHIFT_CASH_OUT':
      return `Cash Out: -$${Number(d.amount || 0).toFixed(2)} (${d.reason || 'Drop'})`;

    case 'PO_CREATE':
      return `PO #${d.poNumber || '—'} • ${d.supplierName || 'Supplier'} ($${Number(d.totalCost || 0).toFixed(2)})`;

    case 'PO_STATUS_CHANGE':
      return `PO #${d.poNumber || '—'}: ${d.oldStatus || ''} → ${d.newStatus || ''}`;

    case 'GOODS_RECEIPT':
      return `PO #${d.poNumber || '—'} • Received ${d.itemsCount || 0} items`;

    case 'AUTH_LOGIN':
      return `User "${d.username || log.user?.username || '—'}" signed in (${d.role || log.user?.role || ''})`;

    case 'AUTH_LOGOUT':
      return `User signed out`;

    case 'USER_CREATE':
      return `Created user "${d.username || '—'}" (${d.role || 'CASHIER'})`;

    case 'USER_UPDATE':
      const changes = Array.isArray(d.changes) ? d.changes.join(', ') : '';
      return `Updated user "${d.targetUsername || '—'}" ${changes ? `(${changes})` : ''}`;

    case 'SETTINGS_UPDATE':
      const keys = Array.isArray(d.updatedKeys) ? d.updatedKeys.join(', ') : '';
      return `Updated settings: ${keys || 'Configuration'}`;

    default:
      if (Object.keys(d).length > 0) {
        const firstKey = Object.keys(d)[0];
        const firstVal = typeof d[firstKey] === 'object' ? '...' : String(d[firstKey]);
        return `${formatFieldLabel(firstKey)}: ${firstVal}`;
      }
      return log.action || 'Audit record';
  }
}

/**
 * Main Audit Payload Viewer Component
 */
export default function AuditPayloadViewer({ log }) {
  const [viewMode, setViewMode] = useState('visual'); // 'visual' | 'json'
  const [copied, setCopied] = useState(false);

  if (!log) return null;

  const details = log.details || {};
  const hasDetails = Object.keys(details).length > 0;
  const config = ACTION_CONFIG[log.action] || {
    label: formatFieldLabel(log.action),
    category: 'general',
    badgeClass: 'badge-outline',
    icon: HelpCircle,
    color: '#64748b',
    description: 'System event logged for auditing and accountability.'
  };

  const IconComponent = config.icon;

  const handleCopyJson = () => {
    try {
      navigator.clipboard.writeText(JSON.stringify(details, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  // 1. Detect Price Diff
  const hasPriceDiff = details.oldPrice !== undefined && details.newPrice !== undefined;
  const oldPrice = Number(details.oldPrice);
  const newPrice = Number(details.newPrice);
  const priceDiff = !isNaN(oldPrice) && !isNaN(newPrice) ? newPrice - oldPrice : null;
  const pricePercent = !isNaN(oldPrice) && oldPrice > 0 ? ((priceDiff / oldPrice) * 100).toFixed(1) : null;

  // 2. Detect Status Diff
  const hasStatusDiff = details.oldStatus && details.newStatus;

  // 3. Detect Stock Diff
  const hasStockDiff = details.previousStock !== undefined && details.newStock !== undefined;

  // 4. Detect Cash Reconciliation Diff
  const hasCashReconciliation = details.expectedCash !== undefined && details.actualCash !== undefined;
  const cashDiff = details.difference !== undefined ? Number(details.difference) : 
                   (hasCashReconciliation ? Number(details.actualCash) - Number(details.expectedCash) : null);

  // Check which keys are already displayed in specialized diff/banner cards
  const consumedKeys = new Set();
  if (hasPriceDiff) { consumedKeys.add('oldPrice'); consumedKeys.add('newPrice'); }
  if (hasStatusDiff) { consumedKeys.add('oldStatus'); consumedKeys.add('newStatus'); }
  if (hasStockDiff) { consumedKeys.add('previousStock'); consumedKeys.add('newStock'); }
  if (hasCashReconciliation) {
    consumedKeys.add('expectedCash');
    consumedKeys.add('actualCash');
    consumedKeys.add('difference');
  }

  // Filter remaining keys for the general attributes table
  const remainingKeys = Object.keys(details).filter((k) => !consumedKeys.has(k));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Action Header Card */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          padding: '16px',
          backgroundColor: '#f8fafc',
          borderRadius: '12px',
          border: '1px solid #e2e8f0'
        }}
      >
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            backgroundColor: `${config.color}15`,
            color: config.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <IconComponent size={24} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
              {config.label}
            </h4>
            <span className={`badge ${config.badgeClass} mono`} style={{ fontSize: '0.7rem' }}>
              {log.action}
            </span>
          </div>
          <p style={{ margin: '3px 0 0', fontSize: '0.825rem', color: '#64748b' }}>
            {config.description}
          </p>
        </div>
      </div>

      {/* Meta Grid (4-box info) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '10px'
        }}
      >
        <div style={{ padding: '10px 12px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
            Timestamp
          </div>
          <div style={{ fontSize: '0.825rem', fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>
            {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div style={{ fontSize: '0.725rem', color: '#94a3b8' }}>
            {new Date(log.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>

        <div style={{ padding: '10px 12px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
            Actor
          </div>
          <div style={{ fontSize: '0.825rem', fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>
            {log.user?.fullName || log.user?.username || 'System Automation'}
          </div>
          <div style={{ fontSize: '0.725rem', color: '#2563eb', fontWeight: 500 }}>
            {log.user?.role || 'SYSTEM'}
          </div>
        </div>

        <div style={{ padding: '10px 12px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
            Target Entity
          </div>
          <div style={{ fontSize: '0.825rem', fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>
            {log.entityType}
          </div>
          <div
            className="mono"
            style={{ fontSize: '0.725rem', color: '#94a3b8', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}
            title={log.entityId || 'N/A'}
          >
            ID: {log.entityId ? (log.entityId.length > 10 ? `${log.entityId.substring(0, 10)}...` : log.entityId) : 'N/A'}
          </div>
        </div>

        <div style={{ padding: '10px 12px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
            Client IP
          </div>
          <div className="mono" style={{ fontSize: '0.825rem', fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>
            {log.ipAddress || 'Internal'}
          </div>
          <div
            style={{ fontSize: '0.725rem', color: '#94a3b8', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}
            title={log.userAgent || 'Direct Server'}
          >
            {log.userAgent ? (log.userAgent.includes('Mozilla') ? 'Web Browser' : 'API Client') : 'Local'}
          </div>
        </div>
      </div>

      {/* Segmented View Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
          <button
            type="button"
            onClick={() => setViewMode('visual')}
            style={{
              padding: '5px 12px',
              fontSize: '0.8rem',
              fontWeight: 600,
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: viewMode === 'visual' ? '#ffffff' : 'transparent',
              color: viewMode === 'visual' ? '#2563eb' : '#64748b',
              boxShadow: viewMode === 'visual' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <FileText size={14} /> Formatted View
          </button>
          <button
            type="button"
            onClick={() => setViewMode('json')}
            style={{
              padding: '5px 12px',
              fontSize: '0.8rem',
              fontWeight: 600,
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: viewMode === 'json' ? '#ffffff' : 'transparent',
              color: viewMode === 'json' ? '#2563eb' : '#64748b',
              boxShadow: viewMode === 'json' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Code size={14} /> Raw JSON
          </button>
        </div>

        {viewMode === 'json' && (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={handleCopyJson}
            style={{ fontSize: '0.75rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {copied ? (
              <>
                <Check size={14} color="#10b981" /> Copied!
              </>
            ) : (
              <>
                <Copy size={14} /> Copy JSON
              </>
            )}
          </button>
        )}
      </div>

      {/* VIEW MODE 1: VISUAL FORMATTED VIEW */}
      {viewMode === 'visual' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {!hasDetails ? (
            <div
              style={{
                padding: '24px',
                textAlign: 'center',
                backgroundColor: '#f8fafc',
                borderRadius: '10px',
                border: '1px dashed #cbd5e1',
                color: '#64748b',
                fontSize: '0.875rem'
              }}
            >
              <CheckCircle2 size={24} color="#94a3b8" style={{ margin: '0 auto 8px' }} />
              No additional payload parameters were recorded for this action.
            </div>
          ) : (
            <>
              {/* 1. Price Change Diff Card */}
              {hasPriceDiff && (
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '10px',
                    padding: '14px 16px',
                    boxShadow: '0 2px 4px rgba(37,99,235,0.04)'
                  }}
                >
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Selling Price Adjustment
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ padding: '8px 14px', backgroundColor: '#f1f5f9', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Original Price</div>
                      <div className="currency-amount" style={{ fontSize: '1.1rem', fontWeight: 700, color: '#475569' }}>
                        ${oldPrice.toFixed(2)}
                      </div>
                    </div>
                    <ArrowRight size={20} color="#2563eb" />
                    <div style={{ padding: '8px 14px', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                      <div style={{ fontSize: '0.7rem', color: '#1d4ed8' }}>New Price</div>
                      <div className="currency-amount" style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1d4ed8' }}>
                        ${newPrice.toFixed(2)}
                      </div>
                    </div>
                    {priceDiff !== null && (
                      <div
                        style={{
                          marginLeft: 'auto',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          backgroundColor: priceDiff >= 0 ? '#ecfdf5' : '#fef2f2',
                          color: priceDiff >= 0 ? '#059669' : '#dc2626',
                          fontSize: '0.8rem',
                          fontWeight: 600
                        }}
                      >
                        {priceDiff >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                        {priceDiff >= 0 ? `+$${priceDiff.toFixed(2)}` : `-$${Math.abs(priceDiff).toFixed(2)}`}
                        {pricePercent && ` (${priceDiff >= 0 ? '+' : ''}${pricePercent}%)`}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 2. Status Transition Diff Card */}
              {hasStatusDiff && (
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '14px 16px'
                  }}
                >
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Status Transition
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                    <span className="badge badge-outline mono" style={{ fontSize: '0.825rem', padding: '6px 12px' }}>
                      {details.oldStatus}
                    </span>
                    <ArrowRight size={18} color="#64748b" />
                    <span className="badge badge-primary mono" style={{ fontSize: '0.825rem', padding: '6px 12px' }}>
                      {details.newStatus}
                    </span>
                  </div>
                </div>
              )}

              {/* 3. Cash Reconciliation Diff Card */}
              {hasCashReconciliation && (
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '14px 16px'
                  }}
                >
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Cash Reconciliation Summary
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                    <div style={{ padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Expected Cash</div>
                      <div className="currency-amount" style={{ fontSize: '1rem', fontWeight: 700 }}>
                        ${Number(details.expectedCash).toFixed(2)}
                      </div>
                    </div>
                    <div style={{ padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Actual Cash</div>
                      <div className="currency-amount" style={{ fontSize: '1rem', fontWeight: 700 }}>
                        ${Number(details.actualCash).toFixed(2)}
                      </div>
                    </div>
                    <div
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        backgroundColor: cashDiff === 0 ? '#ecfdf5' : cashDiff > 0 ? '#fffbeb' : '#fef2f2',
                        border: `1px solid ${cashDiff === 0 ? '#a7f3d0' : cashDiff > 0 ? '#fde68a' : '#fecaca'}`
                      }}
                    >
                      <div style={{ fontSize: '0.7rem', color: cashDiff === 0 ? '#059669' : cashDiff > 0 ? '#b45309' : '#dc2626' }}>
                        Variance / Discrepancy
                      </div>
                      <div
                        className="currency-amount"
                        style={{
                          fontSize: '1rem',
                          fontWeight: 700,
                          color: cashDiff === 0 ? '#059669' : cashDiff > 0 ? '#b45309' : '#dc2626'
                        }}
                      >
                        {cashDiff === 0 ? '$0.00 (Balanced)' : cashDiff > 0 ? `+$${cashDiff.toFixed(2)} (Surplus)` : `-$${Math.abs(cashDiff).toFixed(2)} (Short)`}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. Reason or Notes Callout */}
              {details.reason && (
                <div
                  style={{
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px'
                  }}
                >
                  <AlertCircle size={18} color="#d97706" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#92400e', textTransform: 'uppercase' }}>
                      Reason / Justification
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#78350f', marginTop: '2px' }}>
                      "{details.reason}"
                    </div>
                  </div>
                </div>
              )}

              {/* 5. Remaining Detailed Fields Grid */}
              {remainingKeys.length > 0 && (
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    overflow: 'hidden'
                  }}
                >
                  <div
                    style={{
                      padding: '10px 16px',
                      backgroundColor: '#f8fafc',
                      borderBottom: '1px solid #e2e8f0',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#475569',
                      textTransform: 'uppercase'
                    }}
                  >
                    Event Details & Attributes
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {remainingKeys.map((key, idx) => {
                      const val = details[key];
                      const isEven = idx % 2 === 0;

                      // Format specific types
                      const isMoney =
                        typeof val === 'number' &&
                        (key.toLowerCase().includes('price') ||
                         key.toLowerCase().includes('total') ||
                         key.toLowerCase().includes('amount') ||
                         key.toLowerCase().includes('cost') ||
                         key.toLowerCase().includes('cash'));

                      return (
                        <div
                          key={key}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '10px 16px',
                            backgroundColor: isEven ? '#ffffff' : '#fcfcfd',
                            borderBottom: idx === remainingKeys.length - 1 ? 'none' : '1px solid #f1f5f9',
                            fontSize: '0.85rem'
                          }}
                        >
                          <span style={{ color: '#64748b', fontWeight: 500 }}>
                            {formatFieldLabel(key)}
                          </span>

                          <span style={{ fontWeight: 600, color: '#0f172a', textAlign: 'right' }}>
                            {Array.isArray(val) ? (
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                {val.map((item, itemIdx) => (
                                  <span key={itemIdx} className="badge badge-outline" style={{ fontSize: '0.75rem' }}>
                                    {String(item)}
                                  </span>
                                ))}
                              </div>
                            ) : typeof val === 'boolean' ? (
                              <span className={`badge ${val ? 'badge-success' : 'badge-outline'}`} style={{ fontSize: '0.75rem' }}>
                                {val ? 'Yes / Enabled' : 'No / Disabled'}
                              </span>
                            ) : isMoney ? (
                              <span className="currency-amount" style={{ color: '#2563eb' }}>
                                {formatCurrencyValue(val)}
                              </span>
                            ) : typeof val === 'object' && val !== null ? (
                              <span className="mono" style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                {JSON.stringify(val)}
                              </span>
                            ) : (
                              String(val ?? '—')
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* VIEW MODE 2: RAW JSON CODE VIEW */}
      {viewMode === 'json' && (
        <div style={{ position: 'relative' }}>
          <pre
            style={{
              backgroundColor: '#0f172a',
              color: '#38bdf8',
              padding: '16px',
              borderRadius: '10px',
              fontSize: '0.825rem',
              lineHeight: 1.6,
              overflowX: 'auto',
              maxHeight: '360px',
              fontFamily: 'Consolas, Monaco, "Courier New", monospace',
              margin: 0
            }}
          >
            {JSON.stringify(details, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
