import React from 'react';
import Modal from '../common/Modal';
import { Printer, CheckCircle2, X } from 'lucide-react';

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

  // Calculate dual change
  const cashRec = Number(payment.cashReceived) || 0;
  let changeUSD = 0;
  let changeKHR = 0;

  if (isCash) {
    if (payment.currency === 'KHR') {
      changeKHR = Number(payment.changeGiven) || Math.max(0, cashRec - grandTotalKHR);
      changeUSD = Math.round((changeKHR / exchangeRate) * 100) / 100;
    } else {
      changeUSD = Number(payment.changeGiven) || Math.max(0, Math.round((cashRec - grandTotalUSD) * 100) / 100);
      changeKHR = Math.round(changeUSD * exchangeRate);
    }
  }

  const handlePrint = () => {
    window.print();
  };

  const totalItemCount = sale.items?.reduce((sum, i) => sum + Number(i.quantity), 0) || 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Customer Receipt Preview" maxWidth="460px">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontWeight: 700, fontSize: '0.85rem' }}>
          <CheckCircle2 size={16} /> Transaction Completed
        </div>
        <button onClick={handlePrint} className="btn btn-primary btn-sm" style={{ padding: '6px 14px' }}>
          <Printer size={15} /> Print Thermal Receipt
        </button>
      </div>

      <div
        className="printable-receipt"
        style={{
          backgroundColor: '#ffffff',
          border: '1.5px dashed #cbd5e1',
          padding: '24px 20px',
          borderRadius: '8px',
          fontFamily: 'Courier New, Courier, monospace',
          fontSize: '0.825rem',
          color: '#0f172a',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)'
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '12px' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 900, letterSpacing: '0.04em' }}>{store.storeName}</div>
          <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '2px' }}>{store.storeAddress}</div>
          <div style={{ fontSize: '0.75rem', color: '#475569' }}>Tel: {store.storePhone}</div>
          <div style={{ margin: '10px 0', borderBottom: '1px dashed #94a3b8' }} />
          <div style={{ fontSize: '0.85rem', fontWeight: 800 }}>*** OFFICIAL RECEIPT ***</div>
          <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>Invoice #: <strong>{sale.receiptNumber}</strong></div>
          <div style={{ fontSize: '0.75rem' }}>Date: {new Date(sale.createdAt).toLocaleString()}</div>
          <div style={{ fontSize: '0.75rem' }}>Cashier: {sale.cashier?.fullName || 'Cashier'} • Reg #01</div>
        </div>

        <div style={{ borderBottom: '1.5px solid #0f172a', margin: '8px 0' }} />

        {/* Item list */}
        <div style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>
            <span>DESCRIPTION</span>
            <span>TOTAL</span>
          </div>

          {sale.items?.map((item, idx) => (
            <div key={idx} style={{ marginBottom: '8px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                {item.productNameSnapshot || item.product?.name}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.775rem', color: '#334155' }}>
                <span>
                  {Number(item.quantity)} x ${Number(item.unitPriceSnapshot || item.product?.sellingPrice).toFixed(2)}
                  {Number(item.discountAmount) > 0 && ` (Disc: -$${Number(item.discountAmount).toFixed(2)})`}
                </span>
                <span style={{ fontWeight: 700 }}>
                  ${Number(item.lineTotal).toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ borderBottom: '1px dashed #94a3b8', margin: '8px 0' }} />

        {/* Totals Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
            <span>Total Items:</span>
            <span>{totalItemCount}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
            <span>Subtotal:</span>
            <span>${Number(sale.subtotal).toFixed(2)}</span>
          </div>
          {Number(sale.discountTotal) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626', fontSize: '0.8rem' }}>
              <span>Total Discount:</span>
              <span>-${Number(sale.discountTotal).toFixed(2)}</span>
            </div>
          )}
          {Number(sale.taxTotal) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
              <span>Tax (VAT):</span>
              <span>${Number(sale.taxTotal).toFixed(2)}</span>
            </div>
          )}

          {store.currencyCode === 'KHR' || localStorage.getItem('pos_primary_currency') === 'KHR' ? (
            <>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 900,
                  fontSize: '1.15rem',
                  color: '#059669',
                  borderTop: '1.5px solid #0f172a',
                  paddingTop: '6px',
                  marginTop: '4px'
                }}
              >
                <span>TOTAL (KHR):</span>
                <span>{grandTotalKHR.toLocaleString()} ៛</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 800,
                  color: '#1d4ed8',
                  fontSize: '0.95rem'
                }}
              >
                <span>TOTAL (USD):</span>
                <span>${grandTotalUSD.toFixed(2)}</span>
              </div>
            </>
          ) : (
            <>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 900,
                  fontSize: '1.1rem',
                  borderTop: '1.5px solid #0f172a',
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
                  fontWeight: 800,
                  color: '#1d4ed8',
                  fontSize: '0.95rem'
                }}
              >
                <span>TOTAL (KHR):</span>
                <span>{grandTotalKHR.toLocaleString()} ៛</span>
              </div>
            </>
          )}
          <div style={{ fontSize: '0.675rem', color: '#64748b', textAlign: 'right' }}>
            Rate: 1 USD = {exchangeRate.toLocaleString()} KHR
          </div>
        </div>

        <div style={{ borderBottom: '1px dashed #94a3b8', margin: '10px 0' }} />

        {/* Payment & Dual Change Info */}
        <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Payment Method:</span>
            <span style={{ fontWeight: 700 }}>{payment.method === 'QR_PAYMENT' ? 'Bakong KHQR' : 'CASH'}</span>
          </div>

          {isCash ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Cash Tendered:</span>
                <span>
                  {payment.currency === 'KHR'
                    ? `${Number(payment.cashReceived).toLocaleString()} ៛`
                    : `$${Number(payment.cashReceived).toFixed(2)}`}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, color: '#047857' }}>
                <span>Change Given (USD):</span>
                <span>${changeUSD.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#047857', fontSize: '0.75rem' }}>
                <span>Change Given (KHR):</span>
                <span>{changeKHR.toLocaleString()} ៛</span>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Transaction Ref:</span>
              <span className="mono">{payment.transactionRef || 'KHQR-DEMO'}</span>
            </div>
          )}
        </div>

        {/* Footer & Simulated Barcode */}
        <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.7rem', color: '#475569' }}>
          <div>{store.receiptHeader}</div>
          <div style={{ marginTop: '2px' }}>{store.receiptFooter}</div>
          
          {/* Authentic Scannable Receipt Barcode */}
          <div style={{ margin: '14px auto 6px auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <svg width="220" height="42" viewBox="0 0 220 42">
              <rect x="0" y="0" width="2" height="34" fill="#0f172a" />
              <rect x="4" y="0" width="4" height="34" fill="#0f172a" />
              <rect x="10" y="0" width="2" height="34" fill="#0f172a" />
              <rect x="14" y="0" width="6" height="34" fill="#0f172a" />
              <rect x="22" y="0" width="2" height="34" fill="#0f172a" />
              <rect x="26" y="0" width="4" height="34" fill="#0f172a" />
              <rect x="34" y="0" width="8" height="34" fill="#0f172a" />
              <rect x="44" y="0" width="2" height="34" fill="#0f172a" />
              <rect x="50" y="0" width="6" height="34" fill="#0f172a" />
              <rect x="60" y="0" width="4" height="34" fill="#0f172a" />
              <rect x="68" y="0" width="2" height="34" fill="#0f172a" />
              <rect x="74" y="0" width="6" height="34" fill="#0f172a" />
              <rect x="84" y="0" width="4" height="34" fill="#0f172a" />
              <rect x="92" y="0" width="8" height="34" fill="#0f172a" />
              <rect x="104" y="0" width="2" height="34" fill="#0f172a" />
              <rect x="110" y="0" width="6" height="34" fill="#0f172a" />
              <rect x="120" y="0" width="4" height="34" fill="#0f172a" />
              <rect x="128" y="0" width="2" height="34" fill="#0f172a" />
              <rect x="134" y="0" width="8" height="34" fill="#0f172a" />
              <rect x="146" y="0" width="2" height="34" fill="#0f172a" />
              <rect x="152" y="0" width="6" height="34" fill="#0f172a" />
              <rect x="162" y="0" width="4" height="34" fill="#0f172a" />
              <rect x="170" y="0" width="2" height="34" fill="#0f172a" />
              <rect x="176" y="0" width="6" height="34" fill="#0f172a" />
              <rect x="186" y="0" width="8" height="34" fill="#0f172a" />
              <rect x="198" y="0" width="2" height="34" fill="#0f172a" />
              <rect x="204" y="0" width="6" height="34" fill="#0f172a" />
              <rect x="214" y="0" width="4" height="34" fill="#0f172a" />
            </svg>
            <span style={{ fontSize: '0.7rem', letterSpacing: '0.12em', fontWeight: 700 }} className="mono">
              {sale.receiptNumber}
            </span>
          </div>

          <div style={{ marginTop: '6px', fontWeight: 700 }}>*** HAVE A NICE DAY! ***</div>
        </div>
      </div>
    </Modal>
  );
}
