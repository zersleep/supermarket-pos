import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Barcode,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  DollarSign,
  QrCode,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import api from '../../api/client';
import { usePos } from '../../context/PosContext';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner, Alert } from '../../components/common/LoadingSpinner';
import ReceiptModal from '../../components/receipt/ReceiptModal';
import Modal from '../../components/common/Modal';

export default function PosCheckout() {
  const {
    cart,
    addToCart,
    updateQuantity,
    updateDiscount,
    removeFromCart,
    clearCart,
    subtotal,
    discountTotal,
    taxTotal,
    grandTotal,
    currency,
    setCurrency,
    exchangeRate,
    setExchangeRate
  } = usePos();

  const { activeShift } = useAuth();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState('');

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState('CASH'); // 'CASH' or 'QR_PAYMENT'
  const [cashReceived, setCashReceived] = useState('');
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [pendingQrData, setPendingQrData] = useState(null);

  // Completed Receipt Modal State
  const [completedSale, setCompletedSale] = useState(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const barcodeRef = useRef(null);

  // Fetch products and categories on mount
  useEffect(() => {
    async function loadPosData() {
      try {
        setLoading(true);
        const [prodRes, catRes, setRes] = await Promise.all([
          api.get('/products?limit=100&status=active'),
          api.get('/categories'),
          api.get('/settings')
        ]);
        setProducts(prodRes.data || []);
        setCategories(catRes.data || []);

        if (setRes.data?.map?.EXCHANGE_RATE_KHR) {
          setExchangeRate(Number(setRes.data.map.EXCHANGE_RATE_KHR));
        }
      } catch (err) {
        setError(err.message || 'Failed to load products.');
      } finally {
        setLoading(false);
      }
    }
    loadPosData();
  }, [setExchangeRate]);

  // Fast Barcode Scanner lookup on Enter
  const handleBarcodeSubmit = async (e) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    setError('');
    try {
      const res = await api.get(`/products/barcode/${encodeURIComponent(barcodeInput.trim())}`);
      if (res.data) {
        if (res.data.currentStock <= 0) {
          setError(`"${res.data.name}" is currently out of stock.`);
        } else {
          addToCart(res.data, 1);
          setBarcodeInput('');
        }
      }
    } catch (err) {
      setError(err.message || `No product found matching barcode "${barcodeInput}"`);
    }
  };

  // Filter products by category and search term
  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory ? p.categoryId === selectedCategory : true;
    const matchesSearch = searchQuery
      ? p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.barcode && p.barcode.includes(searchQuery))
      : true;
    return matchesCat && matchesSearch;
  });

  // Dual Currency Grand Totals
  const grandTotalKHR = Math.round(grandTotal * exchangeRate);

  // Calculate Change Preview for Cash Payment
  const numericCash = Number(cashReceived) || 0;
  let changeAmount = 0;
  let isCashSufficient = false;

  if (currency === 'KHR') {
    changeAmount = Math.max(0, numericCash - grandTotalKHR);
    isCashSufficient = numericCash >= grandTotalKHR;
  } else {
    changeAmount = Math.max(0, Math.round((numericCash - grandTotal) * 100) / 100);
    isCashSufficient = numericCash >= grandTotal;
  }

  // Quick cash buttons
  const setQuickCash = (amount) => {
    setCashReceived(String(amount));
  };

  // Perform Checkout
  const handleCheckout = async () => {
    if (cart.length === 0) {
      setError('Please add items to cart before checkout.');
      return;
    }

    if (paymentMethod === 'CASH' && !isCashSufficient) {
      setError(
        `Insufficient cash entered. Total is ${
          currency === 'KHR' ? `${grandTotalKHR.toLocaleString()} ៛` : `$${grandTotal.toFixed(2)}`
        }.`
      );
      return;
    }

    setCheckoutLoading(true);
    setError('');

    // Unique Idempotency Key generated per checkout attempt to prevent duplicate processing
    const idempotencyKey = `pos-tx-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    try {
      const payload = {
        items: cart.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
          discount: i.discount || 0
        })),
        paymentMethod,
        currency,
        cashReceived: paymentMethod === 'CASH' ? numericCash : undefined,
        shiftId: activeShift?.id || null,
        idempotencyKey
      };

      const res = await api.post('/pos/checkout', payload);
      const saleResult = res.data;

      if (paymentMethod === 'QR_PAYMENT') {
        // Show Demonstration QR Payment Modal
        setPendingQrData(saleResult);
        setQrModalOpen(true);
        clearCart();
      } else {
        // Cash payment completed immediately
        setCompletedSale(saleResult.sale);
        setReceiptOpen(true);
        clearCart();
        setCashReceived('');
      }

      // Refresh product stock list in background
      api.get('/products?limit=100&status=active').then((r) => setProducts(r.data || []));
    } catch (err) {
      setError(err.message || 'Checkout failed. Please inspect items and try again.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '20px', height: 'calc(100vh - 108px)' }}>
      {/* LEFT: Product Catalog & Barcode Scanner */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px', overflow: 'hidden' }}>
        {/* Barcode Scanner Bar */}
        <div className="card" style={{ padding: '12px 16px' }}>
          <form onSubmit={handleBarcodeSubmit} style={{ display: 'flex', gap: '10px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Barcode
                size={20}
                style={{ position: 'absolute', left: '12px', top: '10px', color: '#64748b' }}
              />
              <input
                ref={barcodeRef}
                type="text"
                className="form-input"
                style={{ paddingLeft: '40px', fontWeight: 500 }}
                placeholder="Scan or enter barcode here (Press Enter)..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                autoFocus
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Scan Item
            </button>
          </form>
        </div>

        {/* Search & Category Filter */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search
              size={18}
              style={{ position: 'absolute', left: '12px', top: '9px', color: '#64748b' }}
            />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '38px' }}
              placeholder="Search product by name or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className="form-select"
            style={{ width: '200px' }}
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
        </div>

        <Alert type="danger" message={error} onClose={() => setError('')} />

        {/* Products Grid */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '12px',
            alignContent: 'start',
            paddingRight: '4px'
          }}
        >
          {loading ? (
            <div style={{ gridColumn: '1 / -1' }}>
              <LoadingSpinner text="Loading catalog..." />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
              No products found matching filters.
            </div>
          ) : (
            filteredProducts.map((p) => {
              const isOutOfStock = p.currentStock <= 0;
              return (
                <div
                  key={p.id}
                  className="card"
                  onClick={() => !isOutOfStock && addToCart(p, 1)}
                  style={{
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                    opacity: isOutOfStock ? 0.6 : 1,
                    transition: 'transform 0.1s ease, border-color 0.1s ease',
                    border: '1px solid #e2e8f0',
                    userSelect: 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!isOutOfStock) e.currentTarget.style.borderColor = '#3b82f6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span className="badge badge-neutral mono" style={{ fontSize: '0.7rem' }}>
                        {p.sku}
                      </span>
                      <span
                        className={`badge ${
                          isOutOfStock ? 'badge-danger' : p.isLowStock ? 'badge-warning' : 'badge-success'
                        }`}
                        style={{ fontSize: '0.65rem' }}
                      >
                        {isOutOfStock ? 'OUT' : `${p.currentStock} ${p.unit}s`}
                      </span>
                    </div>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        marginTop: '8px',
                        lineHeight: 1.3,
                        color: '#0f172a'
                      }}
                    >
                      {p.name}
                    </div>
                  </div>

                  <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2563eb' }} className="mono">
                      ${Number(p.sellingPrice).toFixed(2)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {Math.round(Number(p.sellingPrice) * exchangeRate).toLocaleString()} ៛
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT: Cart & Checkout Panel */}
      <div
        className="card"
        style={{
          width: '380px',
          display: 'flex',
          flexDirection: 'column',
          padding: '16px',
          backgroundColor: '#ffffff'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>Shopping Cart ({cart.length})</div>
          {cart.length > 0 && (
            <button onClick={clearCart} className="btn btn-outline btn-sm" style={{ color: '#ef4444' }}>
              <Trash2 size={14} /> Clear
            </button>
          )}
        </div>

        {/* Cart Item List */}
        <div style={{ flex: 1, overflowY: 'auto', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', padding: '8px 0' }}>
          {cart.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
              <Barcode size={40} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
              <div>Cart is empty</div>
              <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>Scan barcode or click products</div>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.product.id}
                style={{
                  padding: '8px 4px',
                  borderBottom: '1px dashed #f1f5f9',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: '0.85rem' }}>
                  <span>{item.product.name}</span>
                  <span className="mono">${Number(item.lineTotal).toFixed(2)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    ${Number(item.product.sellingPrice).toFixed(2)} / {item.product.unit}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      className="btn btn-outline btn-sm"
                      style={{ padding: '2px 6px' }}
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                    >
                      <Minus size={12} />
                    </button>
                    <span style={{ fontWeight: 600, minWidth: '24px', textAlign: 'center', fontSize: '0.85rem' }}>
                      {item.quantity}
                    </span>
                    <button
                      className="btn btn-outline btn-sm"
                      style={{ padding: '2px 6px' }}
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                    >
                      <Plus size={12} />
                    </button>
                    <button
                      className="btn btn-outline btn-sm"
                      style={{ padding: '2px 6px', color: '#ef4444', borderColor: 'transparent' }}
                      onClick={() => removeFromCart(item.product.id)}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals Summary */}
        <div style={{ padding: '12px 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b' }}>
            <span>Subtotal:</span>
            <span className="mono">${subtotal.toFixed(2)}</span>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              borderTop: '1px solid #e2e8f0',
              paddingTop: '8px',
              marginTop: '4px'
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.25rem' }}>Total:</div>
              <div style={{ fontSize: '0.85rem', color: '#2563eb', fontWeight: 600 }}>
                {grandTotalKHR.toLocaleString()} ៛
              </div>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }} className="mono">
              ${grandTotal.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Payment Method Selector */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>
            PAYMENT METHOD
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              className={`btn ${paymentMethod === 'CASH' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setPaymentMethod('CASH')}
              style={{ padding: '8px' }}
            >
              <DollarSign size={16} /> Cash
            </button>
            <button
              className={`btn ${paymentMethod === 'QR_PAYMENT' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setPaymentMethod('QR_PAYMENT')}
              style={{ padding: '8px' }}
            >
              <QrCode size={16} /> QR / E-Wallet
            </button>
          </div>
        </div>

        {/* Cash payment details */}
        {paymentMethod === 'CASH' && (
          <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>CASH RECEIVED</label>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  className={`btn btn-sm ${currency === 'USD' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                  onClick={() => {
                    setCurrency('USD');
                    setCashReceived('');
                  }}
                >
                  USD ($)
                </button>
                <button
                  className={`btn btn-sm ${currency === 'KHR' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                  onClick={() => {
                    setCurrency('KHR');
                    setCashReceived('');
                  }}
                >
                  KHR (៛)
                </button>
              </div>
            </div>

            <input
              type="number"
              step="any"
              className="form-input mono"
              style={{ fontSize: '1.1rem', fontWeight: 600 }}
              placeholder={currency === 'USD' ? '0.00' : '0'}
              value={cashReceived}
              onChange={(e) => setCashReceived(e.target.value)}
            />

            {/* Quick cash denomination buttons */}
            <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
              {currency === 'USD' ? (
                [5, 10, 20, 50, 100].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    className="btn btn-outline btn-sm mono"
                    style={{ flex: 1, padding: '2px 0', fontSize: '0.7rem' }}
                    onClick={() => setQuickCash(amt)}
                  >
                    ${amt}
                  </button>
                ))
              ) : (
                [10000, 20000, 50000, 100000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    className="btn btn-outline btn-sm mono"
                    style={{ flex: 1, padding: '2px 0', fontSize: '0.65rem' }}
                    onClick={() => setQuickCash(amt)}
                  >
                    {amt / 1000}k
                  </button>
                ))
              )}
            </div>

            {/* Change Preview */}
            <div
              style={{
                marginTop: '8px',
                paddingTop: '6px',
                borderTop: '1px dashed #cbd5e1',
                display: 'flex',
                justifyContent: 'space-between',
                fontWeight: 600,
                fontSize: '0.85rem'
              }}
            >
              <span>Change:</span>
              <span style={{ color: isCashSufficient ? '#10b981' : '#dc2626' }} className="mono">
                {currency === 'KHR'
                  ? `${changeAmount.toLocaleString()} ៛`
                  : `$${changeAmount.toFixed(2)}`}
              </span>
            </div>
          </div>
        )}

        {/* Checkout Button */}
        <button
          className="btn btn-success btn-lg"
          style={{ width: '100%', padding: '14px', fontSize: '1.05rem', fontWeight: 700 }}
          disabled={cart.length === 0 || checkoutLoading || (paymentMethod === 'CASH' && !isCashSufficient)}
          onClick={handleCheckout}
        >
          {checkoutLoading ? 'Processing Checkout...' : (
            paymentMethod === 'CASH' ? 'Complete Cash Sale' : 'Generate Demo QR Payment'
          )}
        </button>
      </div>

      {/* Demonstration QR Payment Modal (Phase 9) */}
      <Modal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        title="Demonstration QR / E-Wallet Payment"
        maxWidth="460px"
      >
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <div
            style={{
              backgroundColor: '#eff6ff',
              border: '2px dashed #3b82f6',
              borderRadius: '12px',
              padding: '24px',
              display: 'inline-block',
              margin: '0 auto 16px auto'
            }}
          >
            {/* SVG Sample QR representation */}
            <svg width="180" height="180" viewBox="0 0 100 100" style={{ display: 'block' }}>
              <rect width="100" height="100" fill="#ffffff" />
              {/* Corner position markers */}
              <rect x="5" y="5" width="25" height="25" fill="#0f172a" />
              <rect x="9" y="9" width="17" height="17" fill="#ffffff" />
              <rect x="13" y="13" width="9" height="9" fill="#0f172a" />

              <rect x="70" y="5" width="25" height="25" fill="#0f172a" />
              <rect x="74" y="9" width="17" height="17" fill="#ffffff" />
              <rect x="78" y="13" width="9" height="9" fill="#0f172a" />

              <rect x="5" y="70" width="25" height="25" fill="#0f172a" />
              <rect x="9" y="74" width="17" height="17" fill="#ffffff" />
              <rect x="13" y="78" width="9" height="9" fill="#0f172a" />

              {/* Data blocks */}
              <rect x="35" y="10" width="6" height="6" fill="#0f172a" />
              <rect x="45" y="15" width="8" height="6" fill="#0f172a" />
              <rect x="40" y="30" width="20" height="20" fill="#2563eb" rx="2" />
              <rect x="10" y="45" width="6" height="12" fill="#0f172a" />
              <rect x="75" y="40" width="15" height="6" fill="#0f172a" />
              <rect x="50" y="65" width="10" height="10" fill="#0f172a" />
              <rect x="70" y="70" width="8" height="8" fill="#0f172a" />
              <rect x="85" y="75" width="8" height="8" fill="#0f172a" />
              <rect x="35" y="80" width="10" height="6" fill="#0f172a" />
            </svg>
            <div style={{ marginTop: '8px', fontSize: '0.75rem', fontWeight: 600, color: '#2563eb' }}>
              KHQR / DEMO E-WALLET
            </div>
          </div>

          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }} className="mono">
            ${Number(pendingQrData?.sale?.grandTotal).toFixed(2)}
          </div>
          <div style={{ fontSize: '0.9rem', color: '#2563eb', fontWeight: 600, marginBottom: '12px' }}>
            {Math.round(Number(pendingQrData?.sale?.grandTotal) * (pendingQrData?.exchangeRate || 4100)).toLocaleString()} ៛
          </div>

          <div
            style={{
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '8px',
              padding: '12px',
              fontSize: '0.8rem',
              color: '#92400e',
              textAlign: 'left',
              lineHeight: 1.4
            }}
          >
            <strong>Note:</strong> This is a sample QR payment demonstration. Payment status is set to{' '}
            <span className="badge badge-warning">PENDING</span> and stock is reserved. Please verify payment in
            your merchant bank app, then confirm it in <strong>Pending Payments</strong>.
          </div>

          <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
            <button
              className="btn btn-primary"
              style={{ flex: 1 }}
              onClick={() => {
                setQrModalOpen(false);
                setCompletedSale(pendingQrData.sale);
                setReceiptOpen(true);
              }}
            >
              <CheckCircle2 size={16} /> View Order Receipt
            </button>
          </div>
        </div>
      </Modal>

      {/* Completed Sale Printable Receipt Modal */}
      <ReceiptModal
        isOpen={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        saleData={completedSale}
      />
    </div>
  );
}
