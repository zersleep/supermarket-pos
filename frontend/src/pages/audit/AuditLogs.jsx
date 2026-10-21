import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  Search,
  RefreshCw,
  Eye,
  Filter,
  X,
  FileSpreadsheet,
  CheckCircle2
} from 'lucide-react';
import api from '../../api/client';
import { LoadingSpinner, Alert } from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import AuditPayloadViewer, { ACTION_CONFIG, getAuditLogSummary } from './AuditPayloadViewer';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Selected Log Details Modal
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError('');
      let url = '/audit?limit=100';
      if (actionFilter) url += `&action=${actionFilter}`;
      if (entityFilter) url += `&entityType=${entityFilter}`;

      const res = await api.get(url);
      setLogs(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, entityFilter]);

  // Client-side quick filter for search term
  const filteredLogs = useMemo(() => {
    if (!searchTerm.trim()) return logs;
    const term = searchTerm.toLowerCase();
    return logs.filter((log) => {
      const actor = (log.user?.fullName || log.user?.username || '').toLowerCase();
      const entity = (log.entityType || '').toLowerCase();
      const entityId = (log.entityId || '').toLowerCase();
      const ip = (log.ipAddress || '').toLowerCase();
      const action = (log.action || '').toLowerCase();
      const summary = getAuditLogSummary(log).toLowerCase();
      return (
        actor.includes(term) ||
        entity.includes(term) ||
        entityId.includes(term) ||
        ip.includes(term) ||
        action.includes(term) ||
        summary.includes(term)
      );
    });
  }, [logs, searchTerm]);

  const viewDetails = (log) => {
    setSelectedLog(log);
    setDetailsModalOpen(true);
  };

  const getActionBadgeClass = (action) => {
    const conf = ACTION_CONFIG[action];
    return conf?.badgeClass || 'badge-primary';
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Security & System Audit Logs</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            Immutable, read-only audit records of critical security, financial, and inventory actions
          </p>
        </div>
        <button onClick={fetchLogs} className="btn btn-outline btn-sm">
          <RefreshCw size={14} /> Refresh Logs
        </button>
      </div>

      <Alert type="danger" message={error} onClose={() => setError('')} />

      {/* Filter Bar */}
      <div className="card" style={{ padding: '14px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Keyword Search */}
          <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '200px' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8'
              }}
            />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '36px', height: '38px', fontSize: '0.875rem' }}
              placeholder="Search by actor, entity, receipt #, item..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8'
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Action Filter */}
          <select
            className="form-select"
            style={{ width: '220px', height: '38px', fontSize: '0.875rem' }}
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="">All Actions</option>
            <optgroup label="Authentication & Access">
              <option value="AUTH_LOGIN">Login</option>
              <option value="AUTH_LOGOUT">Logout</option>
              <option value="AUTH_PASSWORD_CHANGE">Password Changed</option>
              <option value="SYSTEM_SETUP">System Initialized</option>
            </optgroup>
            <optgroup label="Products & Inventory">
              <option value="PRODUCT_CREATE">Product Created</option>
              <option value="PRODUCT_UPDATE">Product Updated</option>
              <option value="CATEGORY_CREATE">Category Created</option>
              <option value="CATEGORY_UPDATE">Category Updated</option>
              <option value="STOCK_ADJUSTMENT">Stock Adjustment</option>
              <option value="BATCH_WRITE_OFF">Batch Write-Off</option>
            </optgroup>
            <optgroup label="Purchasing & Vendors">
              <option value="PO_CREATE">PO Created</option>
              <option value="PO_STATUS_CHANGE">PO Status Changed</option>
              <option value="GOODS_RECEIPT">Goods Received</option>
              <option value="SUPPLIER_CREATE">Supplier Added</option>
              <option value="SUPPLIER_UPDATE">Supplier Updated</option>
              <option value="SUPPLIER_DEACTIVATE">Supplier Deactivated</option>
              <option value="SUPPLIER_DELETE">Supplier Deleted</option>
            </optgroup>
            <optgroup label="Sales & Payments">
              <option value="SALE_COMPLETED">Sale Completed</option>
              <option value="SALE_CREATED_PENDING">Sale Pending</option>
              <option value="SALE_REFUND">Sale Refund</option>
              <option value="PAYMENT_CONFIRM">Payment Confirmed</option>
              <option value="PAYMENT_CANCEL">Payment Cancelled</option>
            </optgroup>
            <optgroup label="Cashier Shifts">
              <option value="SHIFT_OPEN">Shift Opened</option>
              <option value="SHIFT_CLOSE">Shift Closed</option>
              <option value="SHIFT_CASH_IN">Cash-In Float</option>
              <option value="SHIFT_CASH_OUT">Cash-Out Drop</option>
            </optgroup>
            <optgroup label="System & Users">
              <option value="USER_CREATE">User Created</option>
              <option value="USER_UPDATE">User Updated</option>
              <option value="SETTINGS_UPDATE">Settings Changed</option>
            </optgroup>
          </select>

          {/* Entity Filter */}
          <select
            className="form-select"
            style={{ width: '180px', height: '38px', fontSize: '0.875rem' }}
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
          >
            <option value="">All Entities</option>
            <option value="User">User</option>
            <option value="Product">Product</option>
            <option value="Category">Category</option>
            <option value="Sale">Sale</option>
            <option value="Refund">Refund</option>
            <option value="Payment">Payment</option>
            <option value="CashierShift">Shift</option>
            <option value="CashMovement">Cash Movement</option>
            <option value="PurchaseOrder">Purchase Order</option>
            <option value="GoodsReceipt">Goods Receipt</option>
            <option value="Supplier">Supplier</option>
            <option value="Setting">Setting</option>
          </select>

          {(actionFilter || entityFilter || searchTerm) && (
            <button
              onClick={() => {
                setActionFilter('');
                setEntityFilter('');
                setSearchTerm('');
              }}
              className="btn btn-outline btn-sm"
              style={{ height: '38px' }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="card">
        {loading ? (
          <LoadingSpinner text="Loading audit records..." />
        ) : filteredLogs.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
            <ShieldAlert size={32} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
            <div style={{ fontWeight: 600, color: '#64748b' }}>No audit log records match your filter.</div>
            <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>Try clearing filters or search keywords.</div>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '170px' }}>Timestamp</th>
                  <th style={{ width: '150px' }}>Action</th>
                  <th style={{ width: '120px' }}>Entity</th>
                  <th>Event Summary / Details Preview</th>
                  <th style={{ width: '140px' }}>Actor</th>
                  <th style={{ width: '110px' }}>IP Address</th>
                  <th style={{ width: '100px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                  const summary = getAuditLogSummary(log);
                  const badgeClass = getActionBadgeClass(log.action);

                  return (
                    <tr key={log.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ fontSize: '0.825rem', fontWeight: 600 }}>
                          {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div style={{ fontSize: '0.725rem', color: '#64748b' }}>
                          {new Date(log.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${badgeClass} mono`} style={{ fontSize: '0.72rem' }}>
                          {log.action}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 500, fontSize: '0.825rem' }}>{log.entityType}</span>
                      </td>
                      <td>
                        <div
                          style={{
                            fontSize: '0.825rem',
                            color: '#334155',
                            maxWidth: '380px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                          title={summary}
                        >
                          {summary}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.825rem' }}>
                          {log.user?.fullName || log.user?.username || 'System'}
                        </div>
                        {log.user?.role && (
                          <div style={{ fontSize: '0.7rem', color: '#2563eb' }}>{log.user.role}</div>
                        )}
                      </td>
                      <td className="mono" style={{ fontSize: '0.775rem', color: '#64748b' }}>
                        {log.ipAddress || '—'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => viewDetails(log)}
                          title="View formatted event payload"
                        >
                          <Eye size={13} /> Details
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

      {/* Log Details Modal */}
      <Modal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        title={
          selectedLog
            ? `Audit Event: ${ACTION_CONFIG[selectedLog.action]?.label || selectedLog.action}`
            : 'Audit Event Details'
        }
        maxWidth="680px"
      >
        <AuditPayloadViewer log={selectedLog} />
      </Modal>
    </div>
  );
}
