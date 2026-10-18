import React from 'react';
import Modal from '../common/Modal';
import { Printer } from 'lucide-react';

export default function ReceiptModal({ isOpen, onClose, saleData, storeInfo }) {
  if (!saleData) return null;

  const sale = saleData.sale || saleData;
  const store = storeInfo || saleData.storeInfo || {
    storeName: 'Supermarket POS',
    storeAddress: '123 Monivong Blvd, Phnom Penh',
    storePhone: '+855 23 888 999',
    receiptHeader: 'Thank you for shopping with us!',
    receiptFooter: 'Goods returnable within 7 days with valid receipt.',
    exchangeRateKHR: '4100'
  };

  const exchangeRate = Number(store.exchangeRateKHR) || 4100;
  const grandTotalUSD = Number(sale.grandTotal);
  const grandTotalKHR = Math.round(grandTotalUSD * exchangeRate);

  const payment = sale.payments?.[0] || {};
  const isCash = payment.method === 'CASH';

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Receipt Preview" maxWidth="450px">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
        <button onClick={handlePrint} className="btn btn-primary btn-sm">
          <Printer size={16} /> Print Receipt
        </button>
      </div>

      <div
        className="printable-receipt"
        style={{
          backgroundColor: '#fff',
          border: '1px dashed #cbd5e1',
          padding: '20px',
          borderRadius: '4px',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.825rem',
          color: '#1e293b'
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '14px' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{store.storeName}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{store.storeAddress}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Tel: {store.storePhone}</div>
          <div style={{ margin: '8px 0', borderBottom: '1px dashed #94a3b8' }} />
          <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>TAX INVOICE / RECEIPT</div>
          <div style={{ fontSize: '0.75rem' }}>Receipt #: {sale.receiptNumber}</div>
          <div style={{ fontSize: '0.75rem' }}>Date: {new Date(sale.createdAt).toLocaleString()}</div>
          <div style={{ fontSize: '0.75rem' }}>Cashier: {sale.cashier?.fullName || 'Cashier'}</div>
        </div>

        <div style={{ borderBottom: '1px solid #1e293b', margin: '8px 0' }} />

        {/* Item list */}
        <div style={{ marginBottom: '12px' }}>
          {sale.items?.map((item, idx) => (
            <div key={idx} style={{ marginBottom: '6px' }}>
              <div style={{ fontWeight: 600 }}>{item.productNameSnapshot || item.product?.name}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#475569' }}>
                <span>
                  {Number(item.quantity)} x ${Number(item.unitPriceSnapshot || item.product?.sellingPrice).toFixed(2)}
                  {Number(item.discountAmount) > 0 && ` (Disc: -$${Number(item.discountAmount).toFixed(2)})`}
                </span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>
                  ${Number(item.lineTotal).toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ borderBottom: '1px dashed #94a3b8', margin: '8px 0' }} />

        {/* Totals */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Subtotal:</span>
            <span>${Number(sale.subtotal).toFixed(2)}</span>
          </div>
          {Number(sale.discountTotal) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
              <span>Total Discount:</span>
              <span>-${Number(sale.discountTotal).toFixed(2)}</span>
            </div>
          )}
          {Number(sale.taxTotal) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Tax (VAT):</span>
              <span>${Number(sale.taxTotal).toFixed(2)}</span>
            </div>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontWeight: 'bold',
              fontSize: '1rem',
              borderTop: '1px solid #0f172a',
              paddingTop: '6px',
              marginTop: '4px'
            }}
          >
            <span>TOTAL (USD):</span>
            <span>${grandTotalUSD.toFixed(2)}</span>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontWeight: 'bold',
              color: '#1e40af',
              fontSize: '0.9rem'
            }}
          >
            <span>TOTAL (KHR):</span>
            <span>{grandTotalKHR.toLocaleString()} ៛</span>
          </div>
        </div>

        <div style={{ borderBottom: '1px dashed #94a3b8', margin: '10px 0' }} />

        {/* Payment info */}
        <div style={{ fontSize: '0.775rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Payment Method:</span>
            <span style={{ fontWeight: 600 }}>{payment.method === 'QR_PAYMENT' ? 'Scan QR' : (payment.method || 'CASH')}</span>
          </div>
          {isCash ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Cash Received:</span>
                <span>
                  {payment.currency === 'KHR'
                    ? `${Number(payment.cashReceived).toLocaleString()} ៛`
                    : `$${Number(payment.cashReceived).toFixed(2)}`}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                <span>Change Given:</span>
                <span>
                  {payment.currency === 'KHR'
                    ? `${Number(payment.changeGiven).toLocaleString()} ៛`
                    : `$${Number(payment.changeGiven).toFixed(2)}`}
                </span>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Ref / Trans ID:</span>
              <span>{payment.transactionRef || 'DEMO-QR'}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.7rem', color: '#64748b' }}>
          <div>{store.receiptHeader}</div>
          <div style={{ marginTop: '4px' }}>{store.receiptFooter}</div>
          <div style={{ marginTop: '6px', fontStyle: 'italic' }}>*** Have a Great Day! ***</div>
        </div>
      </div>
    </Modal>
  );
}
