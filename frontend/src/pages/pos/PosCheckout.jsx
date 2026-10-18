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
  AlertCircle,
  X,
  Sparkles,
  ShoppingBag
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
    <div style={{ display: 'flex', gap: '20px', height: 'calc(100vh - 112px)' }}>
      {/* LEFT PANEL: Product Catalog & Barcode Scanner */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px', overflow: 'hidden' }}>
        
        {/* Top Controls Bar: Scanner & Search */}
        <div style={{ display: 'flex', gap: '12px' }}>
          {/* Barcode Scanner Input */}
          <form onSubmit={handleBarcodeSubmit} style={{ flex: 1, position: 'relative' }}>
            <Barcode
              size={20}
              style={{ position: 'absolute', left: '12px', top: '10px', color: '#3b82f6' }}
            />
            <input
              ref={barcodeRef}
              type="text"
              className="form-input"
              style={{
                paddingLeft: '40px',
                paddingRight: '90px',
                fontWeight: 500,
                backgroundColor: '#ffffff'
              }}
              placeholder="Scan or type barcode (Enter)..."
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              autoFocus
            />
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              style={{ position: 'absolute', right: '6px', top: '5px' }}
            >
              Scan
            </button>
          </form>

          {/* Search Filter */}
          <div style={{ position: 'relative', width: '280px' }}>
            <Search
              size={18}
              style={{ position: 'absolute', left: '12px', top: '10px', color: '#64748b' }}
            />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '38px', paddingRight: searchQuery ? '32px' : '12px' }}
              placeholder="Search product or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '10px',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer'
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Category Pills Bar */}
        <div className="pill-bar">
          <button
            type="button"
            className={`pill-item ${selectedCategory === '' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('')}
          >
            All Items ({products.length})
          </button>
          {categories.map((c) => {
            const count = products.filter((p) => p.categoryId === c.id).length;
            return (
              <button
                key={c.id}
                type="button"
                className={`pill-item ${selectedCategory === c.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(c.id)}
              >
                {c.name} ({count})
              </button>
            );
          })}
        </div>

        <Alert type="danger" message={error} onClose={() => setError('')} />

        {/* Product Cards Grid */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(185px, 1fr))',
            gap: '14px',
            alignContent: 'start',
            paddingRight: '4px'
          }}
        >
          {loading ? (
            <div style={{ gridColumn: '1 / -1' }}>
              <LoadingSpinner text="Loading supermarket catalog..." />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '50px', textAlign: 'center', color: '#94a3b8' }}>
              <ShoppingBag size={48} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
              <div style={{ fontWeight: 600, color: '#475569' }}>No products match your search</div>
              <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>Try clearing filters or search query</div>
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
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                    opacity: isOutOfStock ? 0.6 : 1,
                    transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    userSelect: 'none',
                    backgroundColor: '#ffffff'
                  }}
                  onMouseEnter={(e) => {
                    if (!isOutOfStock) {
                      e.currentTarget.style.borderColor = '#3b82f6';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 16px -2px rgba(37, 99, 235, 0.15)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="badge badge-neutral mono" style={{ fontSize: '0.675rem' }}>
                        {p.sku}
                      </span>
                      <span
                        className={`badge ${
                          isOutOfStock ? 'badge-danger' : p.isLowStock ? 'badge-warning' : 'badge-success'
                        }`}
                        style={{ fontSize: '0.675rem' }}
                      >
                        {isOutOfStock ? 'Out of Stock' : `${p.currentStock} ${p.unit}s`}
                      </span>
                    </div>

                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        marginTop: '10px',
                        lineHeight: 1.35,
                        color: '#0f172a'
                      }}
                    >
                      {p.name}
                    </div>

                    {p.barcode && (
                      <div className="mono" style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '4px' }}>
                        #{p.barcode}
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      marginTop: '14px',
                      paddingTop: '8px',
                      borderTop: '1px solid #f1f5f9',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline'
                    }}
                  >
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#2563eb' }} className="mono">
                      ${Number(p.sellingPrice).toFixed(2)}
                    </div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b' }}>
                      {Math.round(Number(p.sellingPrice) * exchangeRate).toLocaleString()} ៛
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT PANEL: Shopping Cart & Checkout */}
      <div
        className="card"
        style={{
          width: '400px',
          display: 'flex',
          flexDirection: 'column',
          padding: '18px',
          backgroundColor: '#ffffff',
          boxShadow: 'var(--shadow-md)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 700, fontSize: '1.15rem', color: '#0f172a' }}>Cart</span>
            <span
              style={{
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                fontSize: '0.8rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '9999px',
                border: '1px solid #bfdbfe'
              }}
            >
              {cart.reduce((sum, i) => sum + i.quantity, 0)} items
            </span>
          </div>

          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="btn btn-outline btn-sm"
              style={{ color: '#ef4444', borderColor: '#fecaca', padding: '4px 8px' }}
              title="Clear shopping cart"
            >
              <Trash2 size={13} /> Clear
            </button>
          )}
        </div>

        {/* Cart Item List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            borderTop: '1px solid #f1f5f9',
            borderBottom: '1px solid #f1f5f9',
            padding: '10px 0',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          {cart.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
              <Barcode size={44} style={{ margin: '0 auto 12px auto', opacity: 0.35 }} />
              <div style={{ fontWeight: 600, color: '#64748b' }}>Cart is Empty</div>
              <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>Scan barcode or select products</div>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.product.id}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #f1f5f9',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: '0.85rem' }}>
                  <span style={{ color: '#0f172a' }}>{item.product.name}</span>
                  <span className="mono" style={{ color: '#2563eb', fontWeight: 700 }}>
                    ${Number(item.lineTotal).toFixed(2)}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    ${Number(item.product.sellingPrice).toFixed(2)} / {item.product.unit}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      className="btn btn-outline btn-sm"
                      style={{ padding: '2px 8px', borderRadius: '4px' }}
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                    >
                      <Minus size={11} />
                    </button>
                    <span style={{ fontWeight: 700, minWidth: '24px', textAlign: 'center', fontSize: '0.85rem' }}>
                      {item.quantity}
                    </span>
                    <button
                      className="btn btn-outline btn-sm"
                      style={{ padding: '2px 8px', borderRadius: '4px' }}
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                    >
                      <Plus size={11} />
                    </button>
                    <button
                      className="btn btn-outline btn-sm"
                      style={{ padding: '2px 6px', color: '#ef4444', border: 'none', background: 'transparent' }}
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
        <div style={{ padding: '12px 0 8px 0', display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', color: '#64748b' }}>
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
              <div style={{ fontWeight: 700, fontSize: '1.25rem', color: '#0f172a' }}>Grand Total:</div>
              <div style={{ fontSize: '0.85rem', color: '#2563eb', fontWeight: 600 }}>
                {grandTotalKHR.toLocaleString()} ៛
              </div>
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a' }} className="mono">
              ${grandTotal.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Payment Method Selector */}
        <div style={{ margin: '10px 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              className={`btn ${paymentMethod === 'CASH' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setPaymentMethod('CASH')}
              style={{ padding: '9px 12px', fontSize: '0.85rem' }}
            >
              <DollarSign size={16} /> Cash Sale
            </button>
            <button
              type="button"
              className={`btn ${paymentMethod === 'QR_PAYMENT' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setPaymentMethod('QR_PAYMENT')}
              style={{ padding: '9px 12px', fontSize: '0.85rem' }}
            >
              <QrCode size={16} /> QR / E-Wallet
            </button>
          </div>
        </div>

        {/* Cash payment details */}
        {paymentMethod === 'CASH' && (
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              padding: '12px',
              borderRadius: '10px',
              marginBottom: '12px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', letterSpacing: '0.04em' }}>
                CASH RECEIVED
              </label>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  className={`btn btn-sm ${currency === 'USD' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                  onClick={() => {
                    setCurrency('USD');
                    setCashReceived('');
                  }}
                >
                  USD ($)
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${currency === 'KHR' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ padding: '2px 8px', fontSize: '0.7rem' }}
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
              style={{ fontSize: '1.25rem', fontWeight: 700 }}
              placeholder={currency === 'USD' ? '0.00' : '0'}
              value={cashReceived}
              onChange={(e) => setCashReceived(e.target.value)}
            />

            {/* Quick cash denomination chips */}
            <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
              {currency === 'USD' ? (
                [5, 10, 20, 50, 100].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    className="btn btn-outline btn-sm mono"
                    style={{ flex: 1, padding: '3px 0', fontSize: '0.725rem' }}
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
                    style={{ flex: 1, padding: '3px 0', fontSize: '0.675rem' }}
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
                marginTop: '10px',
                paddingTop: '8px',
                borderTop: '1px dashed #cbd5e1',
                display: 'flex',
                justifyContent: 'space-between',
                fontWeight: 700,
                fontSize: '0.9rem'
              }}
            >
              <span>Change Due:</span>
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
              borderRadius: '16px',
              padding: '24px',
              display: 'inline-block',
              margin: '0 auto 16px auto',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.12)'
            }}
          >
            {/* Realistic KHQR Vector Representation */}
            <svg width="190" height="190" viewBox="0 0 100 100" style={{ display: 'block' }}>
              <rect width="100" height="100" fill="#ffffff" rx="6" />
              {/* Corner position markers */}
              <rect x="6" y="6" width="24" height="24" fill="#0f172a" rx="4" />
              <rect x="10" y="10" width="16" height="16" fill="#ffffff" rx="2" />
              <rect x="14" y="14" width="8" height="8" fill="#0f172a" rx="1" />

              <rect x="70" y="6" width="24" height="24" fill="#0f172a" rx="4" />
              <rect x="74" y="10" width="16" height="16" fill="#ffffff" rx="2" />
              <rect x="78" y="14" width="8" height="8" fill="#0f172a" rx="1" />

              <rect x="6" y="70" width="24" height="24" fill="#0f172a" rx="4" />
              <rect x="10" y="74" width="16" height="16" fill="#ffffff" rx="2" />
              <rect x="14" y="78" width="8" height="8" fill="#0f172a" rx="1" />

              {/* Data blocks */}
              <rect x="36" y="10" width="6" height="6" fill="#0f172a" rx="1" />
              <rect x="46" y="14" width="8" height="6" fill="#0f172a" rx="1" />
              <rect x="38" y="30" width="24" height="24" fill="#2563eb" rx="6" />
              <text x="50" y="46" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">KHQR</text>
              <rect x="10" y="44" width="6" height="12" fill="#0f172a" rx="1" />
              <rect x="75" y="40" width="14" height="6" fill="#0f172a" rx="1" />
              <rect x="50" y="64" width="10" height="10" fill="#0f172a" rx="1" />
              <rect x="70" y="70" width="8" height="8" fill="#0f172a" rx="1" />
              <rect x="84" y="74" width="8" height="8" fill="#0f172a" rx="1" />
              <rect x="36" y="80" width="10" height="6" fill="#0f172a" rx="1" />
            </svg>
            <div style={{ marginTop: '10px', fontSize: '0.8rem', fontWeight: 700, color: '#2563eb', letterSpacing: '0.05em' }}>
              KHQR • SAMPLE PAYMENT
            </div>
          </div>

          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }} className="mono">
            ${Number(pendingQrData?.sale?.grandTotal).toFixed(2)}
          </div>
          <div style={{ fontSize: '0.95rem', color: '#2563eb', fontWeight: 700, marginBottom: '14px' }}>
            {Math.round(Number(pendingQrData?.sale?.grandTotal) * (pendingQrData?.exchangeRate || 4100)).toLocaleString()} ៛
          </div>

          <div
            style={{
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '10px',
              padding: '14px',
              fontSize: '0.8rem',
              color: '#92400e',
              textAlign: 'left',
              lineHeight: 1.45
            }}
          >
            <strong>School Project Note:</strong> This is a sample QR payment demonstration. Order is marked{' '}
            <span className="badge badge-warning">PENDING</span> and stock is reserved. Cashier or Manager verifies incoming payment in merchant app and confirms in <strong>Pending Payments</strong>.
          </div>

          <div style={{ marginTop: '18px', display: 'flex', gap: '10px' }}>
            <button
              className="btn btn-primary"
              style={{ flex: 1, padding: '10px' }}
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
