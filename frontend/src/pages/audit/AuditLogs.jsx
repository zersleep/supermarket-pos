import React, { useState, useEffect } from 'react';
import { ShieldAlert, Search, RefreshCw, Eye } from 'lucide-react';
import api from '../../api/client';
import { LoadingSpinner, Alert } from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  // Selected Log Details Modal
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError('');
      let url = '/audit?limit=50';
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

  const viewDetails = (log) => {
    setSelectedLog(log);
    setDetailsModalOpen(true);
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
      <div className="card" style={{ padding: '12px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <select
            className="form-select"
            style={{ width: '220px' }}
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="">All Actions</option>
            <option value="AUTH_LOGIN">Login</option>
            <option value="AUTH_LOGOUT">Logout</option>
            <option value="PRODUCT_CREATE">Product Created</option>
            <option value="PRODUCT_UPDATE">Product Updated</option>
            <option value="STOCK_ADJUSTMENT">Stock Adjustment</option>
            <option value="GOODS_RECEIPT">Goods Receipt</option>
            <option value="SALE_COMPLETED">Sale Completed</option>
            <option value="PAYMENT_CONFIRM">Payment Confirmed</option>
            <option value="SALE_REFUND">Sale Refund</option>
            <option value="SHIFT_OPEN">Shift Opened</option>
            <option value="SHIFT_CLOSE">Shift Closed</option>
            <option value="SETTINGS_UPDATE">Settings Changed</option>
          </select>

          <select
            className="form-select"
            style={{ width: '180px' }}
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
          >
            <option value="">All Entities</option>
            <option value="User">User</option>
            <option value="Product">Product</option>
            <option value="Sale">Sale</option>
            <option value="Payment">Payment</option>
            <option value="CashierShift">Shift</option>
            <option value="GoodsReceipt">Goods Receipt</option>
            <option value="Setting">Setting</option>
          </select>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <LoadingSpinner text="Loading audit records..." />
        ) : logs.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
            No audit log records found.
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Actor</th>
                  <th>IP Address</th>
                  <th style={{ textAlign: 'right' }}>Payload</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>{new Date(log.createdAt).toLocaleString()}</td>
                    <td>
                      <span className="badge badge-primary mono" style={{ fontSize: '0.75rem' }}>
                        {log.action}
                      </span>
                    </td>
                    <td>{log.entityType}</td>
                    <td style={{ fontWeight: 600 }}>{log.user?.fullName || log.user?.username || 'System'}</td>
                    <td className="mono" style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      {log.ipAddress || '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-outline btn-sm" onClick={() => viewDetails(log)}>
                        <Eye size={14} /> Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Details Modal */}
      <Modal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        title={`Audit Event Details (${selectedLog?.action})`}
        maxWidth="550px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <strong>Time:</strong> {selectedLog && new Date(selectedLog.createdAt).toLocaleString()}
          </div>
          <div>
            <strong>Actor:</strong> {selectedLog?.user?.fullName} ({selectedLog?.user?.role})
          </div>
          <div>
            <strong>Target Entity:</strong> {selectedLog?.entityType} (ID: {selectedLog?.entityId || 'N/A'})
          </div>
          <div>
            <strong>IP Address:</strong> {selectedLog?.ipAddress || 'N/A'}
          </div>

          <div style={{ marginTop: '10px' }}>
            <strong>Event Payload / Changes:</strong>
            <pre
              style={{
                backgroundColor: '#0f172a',
                color: '#38bdf8',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                overflowX: 'auto',
                marginTop: '6px'
              }}
            >
              {JSON.stringify(selectedLog?.details, null, 2)}
            </pre>
          </div>
        </div>
      </Modal>
    </div>
  );
}
