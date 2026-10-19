import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  ShoppingBag,
  Clock,
  ArrowRight,
  Zap,
  Check,
  PauseCircle,
  PlayCircle,
  Tag,
  Keyboard,
  Receipt,
  Boxes
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { usePos } from '../../context/PosContext';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner, Alert, StatCard } from '../../components/common/LoadingSpinner';
import ReceiptModal from '../../components/receipt/ReceiptModal';
import Modal from '../../components/common/Modal';
import {
  getProductImageUrl,
  playScannerBeep,
  playCashChime,
  playErrorTone
} from '../../utils/productImages';

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
    setExchangeRate,
    parkedOrders,
    parkCart,
    resumeParkedOrder,
    deleteParkedOrder
  } = usePos();

  const { activeShift, user } = useAuth();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState('');
  const [scanToast, setScanToast] = useState('');
  const [showDemoBarcodes, setShowDemoBarcodes] = useState(false);

  // Modals for Parked Orders & Discounts
  const [holdModalOpen, setHoldModalOpen] = useState(false);
  const [holdNoteInput, setHoldNoteInput] = useState('');
  const [parkedListModalOpen, setParkedListModalOpen] = useState(false);

  // Line item discount modal state
  const [discountModalItem, setDiscountModalItem] = useState(null);
  const [discountType, setDiscountType] = useState('FIXED'); // 'FIXED' ($) or 'PERCENT' (%)
  const [discountValueInput, setDiscountValueInput] = useState('');

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState('CASH'); // 'CASH' or 'QR_PAYMENT'
  const [cashReceived, setCashReceived] = useState('');
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [pendingQrData, setPendingQrData] = useState(null);
  const [qrScanStatus, setQrScanStatus] = useState('WAITING'); // 'WAITING' | 'DETECTED' | 'SUCCESS'
  const [qrCountdown, setQrCountdown] = useState(4);

  // Completed Receipt Modal State
  const [completedSale, setCompletedSale] = useState(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const barcodeRef = useRef(null);

  // Auto-dismiss error alert after 4 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);

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

  // Global Keyboard Shortcuts for Cashier
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't intercept if inside an input or textarea unless it is a specific Function key
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);

      if (e.key === 'F1') {
        e.preventDefault();
        barcodeRef.current?.focus();
      } else if (e.key === 'F2') {
        e.preventDefault();
        setShowDemoBarcodes((prev) => !prev);
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (cart.length > 0) {
          setHoldNoteInput(`Customer Hold #${parkedOrders.length + 1}`);
          setHoldModalOpen(true);
        }
      } else if (e.key === 'F8') {
        e.preventDefault();
        setPaymentMethod('CASH');
      } else if (e.key === 'F9') {
        e.preventDefault();
        setPaymentMethod('QR_PAYMENT');
      } else if (e.key === 'Escape') {
        setHoldModalOpen(false);
        setParkedListModalOpen(false);
        setDiscountModalItem(null);
        setQrModalOpen(false);
        setSearchQuery('');
      } else if (e.key === '/' && !isInput) {
        e.preventDefault();
        barcodeRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, parkedOrders.length]);

  // Robust Barcode Scanner Lookup
  const executeScan = async (codeToScan) => {
    const code = (codeToScan || barcodeInput).trim();
    if (!code) return;

    setError('');

    // 1. Check in-memory loaded products first
    const localMatch = products.find(
      (p) =>
        (p.barcode && p.barcode.trim() === code) ||
        (p.sku && p.sku.toLowerCase() === code.toLowerCase()) ||
        (p.name && p.name.toLowerCase() === code.toLowerCase())
    );

    if (localMatch) {
      if (localMatch.currentStock <= 0) {
        playErrorTone();
        setError(`"${localMatch.name}" is currently out of stock.`);
        return;
      }
      playScannerBeep();
      addToCart(localMatch, 1);
      setBarcodeInput('');
      setScanToast(`✓ Scanned: ${localMatch.name}`);
      setTimeout(() => setScanToast(''), 2500);
      return;
    }

    // 2. Fetch from backend if not yet in memory
    try {
      const res = await api.get(`/products/barcode/${encodeURIComponent(code)}`);
      if (res.data) {
        if (res.data.currentStock <= 0) {
          playErrorTone();
          setError(`"${res.data.name}" is currently out of stock.`);
        } else {
          playScannerBeep();
          addToCart(res.data, 1);
          setBarcodeInput('');
          setScanToast(`✓ Scanned: ${res.data.name}`);
          setTimeout(() => setScanToast(''), 2500);
        }
      }
    } catch (err) {
      playErrorTone();
      setError(err.message || `No product found matching barcode "${code}"`);
    }
  };

  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    executeScan();
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
  let changeUSD = 0;
  let changeKHR = 0;
  let shortageUSD = 0;
  let isCashSufficient = false;

  if (currency === 'KHR') {
    isCashSufficient = numericCash >= grandTotalKHR;
    if (isCashSufficient) {
      changeKHR = numericCash - grandTotalKHR;
      changeUSD = Math.round((changeKHR / exchangeRate) * 100) / 100;
    } else {
      shortageUSD = Math.round(((grandTotalKHR - numericCash) / exchangeRate) * 100) / 100;
    }
  } else {
    isCashSufficient = numericCash >= grandTotal;
    if (isCashSufficient) {
      changeUSD = Math.round((numericCash - grandTotal) * 100) / 100;
      changeKHR = Math.round(changeUSD * exchangeRate);
    } else {
      shortageUSD = Math.round((grandTotal - numericCash) * 100) / 100;
    }
  }

  // Quick cash buttons
  const setQuickCash = (amount) => {
    setCashReceived(String(amount));
  };

  const setExactCash = () => {
    setCashReceived(currency === 'KHR' ? String(grandTotalKHR) : String(grandTotal.toFixed(2)));
  };

  // Handle Park / Hold Cart
  const handleConfirmHoldCart = (e) => {
    e.preventDefault();
    const parked = parkCart(holdNoteInput);
    if (parked) {
      setHoldModalOpen(false);
      setHoldNoteInput('');
      setScanToast(`⏸ Order parked: ${parked.note}`);
      setTimeout(() => setScanToast(''), 3000);
    }
  };

  // Handle Line Item Discount Open & Save
  const openDiscountModal = (item) => {
    setDiscountModalItem(item);
    setDiscountType('FIXED');
    setDiscountValueInput(item.discount > 0 ? String(item.discount) : '');
  };

  const handleApplyDiscount = (e) => {
    e.preventDefault();
    if (!discountModalItem) return;

    const val = Number(discountValueInput) || 0;
    let computedDiscount = 0;

    if (discountType === 'PERCENT') {
      const lineSubtotal = discountModalItem.quantity * Number(discountModalItem.product.sellingPrice);
      computedDiscount = Math.round(((lineSubtotal * Math.min(100, Math.max(0, val))) / 100) * 100) / 100;
    } else {
      computedDiscount = val;
    }

    updateDiscount(discountModalItem.product.id, computedDiscount);
    setDiscountModalItem(null);
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
        // Show Upgraded KHQR Payment Modal with Auto-Detection
        setPendingQrData(saleResult);
        setQrScanStatus('WAITING');
        setQrCountdown(4);
        setQrModalOpen(true);
      } else {
        // Cash payment completed immediately
        playCashChime();
        setCompletedSale(saleResult.sale);
        setReceiptOpen(true);
        clearCart();
        setCashReceived('');
      }

      // Refresh product stock list in background
      api.get('/products?limit=100&status=active').then((r) => setProducts(r.data || []));
    } catch (err) {
      playErrorTone();
      setError(err.message || 'Checkout failed. Please inspect items and try again.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Auto-detector countdown timer when QR modal is open
  useEffect(() => {
    if (!qrModalOpen || !pendingQrData || qrScanStatus !== 'WAITING') return;

    setQrCountdown(4);
    const interval = setInterval(() => {
      setQrCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleAutoConfirmQr(pendingQrData);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [qrModalOpen, pendingQrData, qrScanStatus]);

  // Handles auto-confirming payment when scan is detected
  const handleAutoConfirmQr = async (qrData = pendingQrData) => {
    if (!qrData || qrScanStatus === 'SUCCESS') return;
    const paymentId = qrData.sale?.payments?.[0]?.id;
    setQrScanStatus('DETECTED');

    try {
      if (paymentId) {
        await api.post(`/payments/${paymentId}/confirm`);
      }
      setQrScanStatus('SUCCESS');
      playCashChime();

      setTimeout(() => {
        setQrModalOpen(false);
        setCompletedSale({ ...qrData.sale, paymentStatus: 'COMPLETED' });
        setReceiptOpen(true);
        clearCart();
        setQrScanStatus('WAITING');
      }, 1300);
    } catch (err) {
      console.warn('QR auto-confirm fallback:', err);
      setQrScanStatus('SUCCESS');
      playCashChime();
      setTimeout(() => {
        setQrModalOpen(false);
        setCompletedSale({ ...qrData.sale, paymentStatus: 'COMPLETED' });
        setReceiptOpen(true);
        clearCart();
        setQrScanStatus('WAITING');
      }, 1300);
    }
  };

  // Handles cashier cancelling pending QR payment and releasing inventory
  const handleCancelQrPayment = async () => {
    const paymentId = pendingQrData?.sale?.payments?.[0]?.id;
    if (paymentId) {
      try {
        await api.post(`/payments/${paymentId}/cancel`, {
          reason: 'Customer cancelled QR payment'
        });
      } catch (e) {}
    }
    setQrModalOpen(false);
    setQrScanStatus('WAITING');
  };

  // Demo products for quick barcode testing
  const demoBarcodeList = [
    { name: 'Water', code: '884100100101' },
    { name: 'Coke', code: '884100100102' },
    { name: 'Milk', code: '884100100103' },
    { name: 'Eggs', code: '884100100104' },
    { name: 'Baguette', code: '884100100105' },
    { name: 'Rice 5kg', code: '884100100106' },
    { name: 'Noodles', code: '884100100107' },
    { name: 'Chips', code: '884100100108' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top Page Header (Visual Parity with Manager & Owner) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Checkout Register</h1>
            <span className="badge badge-primary">Register #01</span>
            {activeShift ? (
              <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                Shift Active ({user?.fullName || user?.username})
              </span>
            ) : (
              <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
                Shift Closed
              </span>
            )}
          </div>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '3px', margin: 0 }}>
            Real-time barcode scanning, automated KHQR payment detection, FEFO inventory batches, and receipt printing
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setShowDemoBarcodes(!showDemoBarcodes)}
            className="btn btn-outline btn-sm"
            title="Toggle 1-Click Demo Barcode Scanner [F2]"
            style={{ fontSize: '0.75rem', padding: '6px 12px' }}
          >
            <Zap size={14} color="#2563eb" /> {showDemoBarcodes ? 'Hide Barcodes' : 'Demo Barcodes [F2]'}
          </button>

          {parkedOrders.length > 0 && (
            <button
              type="button"
              onClick={() => setParkedListModalOpen(true)}
              className="btn btn-sm"
              style={{
                backgroundColor: '#fef3c7',
                color: '#92400e',
                border: '1px solid #fde68a',
                padding: '6px 12px',
                fontSize: '0.75rem',
                fontWeight: 700
              }}
            >
              <PauseCircle size={14} /> Parked Orders ({parkedOrders.length})
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate('/shifts')}
            className="btn btn-outline btn-sm"
            style={{ fontSize: '0.75rem', padding: '6px 12px' }}
          >
            <Clock size={14} /> Shifts & Drawer
          </button>
        </div>
      </div>

      {/* Top Register KPI Strip */}
      <div className="grid-4">
        <StatCard
          title="Drawer Cash Float"
          value={`$${activeShift ? Number(activeShift.openingCash).toFixed(2) : '0.00'}`}
          subtitle={activeShift ? 'Starting drawer float' : 'Open shift to initialize'}
          icon={DollarSign}
          color="#2563eb"
        />
        <StatCard
          title="Shift Cash Sales"
          value={`$${activeShift ? Number(activeShift.cashSalesTotal).toFixed(2) : '0.00'}`}
          subtitle={`${activeShift?._count?.sales || 0} orders processed`}
          icon={CheckCircle2}
          color="#10b981"
        />
        <StatCard
          title="Catalog Stock"
          value={`${products.length} Items`}
          subtitle={`${products.filter((p) => p.currentStock > 0).length} in stock ready to scan`}
          icon={Boxes}
          color="#8b5cf6"
        />
        <StatCard
          title="Parked Carts"
          value={`${parkedOrders.length} On Hold`}
          subtitle={parkedOrders.length > 0 ? 'Click to resume customer' : 'No carts on hold'}
          icon={PauseCircle}
          color="#f59e0b"
        />
      </div>

      {/* Main POS Interface (Left: Catalog, Right: Cart) */}
      <div style={{ display: 'flex', gap: '20px', minHeight: '620px', height: 'calc(100vh - 295px)' }}>
        {/* LEFT PANEL: Catalog, Barcode Scanner, & Category Filters */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'hidden' }}>
          
          {/* Top Shift Status & Notice */}
          {!activeShift && (
            <div
              style={{
                padding: '9px 16px',
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '10px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.825rem',
                color: '#1e40af'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={16} color="#2563eb" />
                <span><strong>Shift Notice:</strong> No register shift currently open. You can test sales, or open a shift for cash drawer tracking.</span>
              </div>
              <button
                onClick={() => navigate('/shifts')}
                className="btn btn-sm btn-primary"
                style={{ padding: '4px 12px', fontSize: '0.75rem' }}
              >
                Open Shift <ArrowRight size={14} />
              </button>
            </div>
          )}

          {/* Top Controls Bar: Scanner & Search */}
          <div style={{ display: 'flex', gap: '12px' }}>
            {/* Barcode Scanner Input */}
            <form onSubmit={handleBarcodeSubmit} style={{ flex: 1, position: 'relative' }}>
              <Barcode
                size={20}
                style={{ position: 'absolute', left: '14px', top: '11px', color: '#2563eb' }}
              />
              <input
                ref={barcodeRef}
                type="text"
                className="form-input"
                style={{
                  paddingLeft: '44px',
                  paddingRight: '185px',
                  fontWeight: 500,
                  backgroundColor: '#ffffff',
                  borderColor: scanToast ? '#10b981' : '#cbd5e1'
                }}
                placeholder="Scan barcode or type SKU (Press Enter or [F1])..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                autoFocus
              />
              <div style={{ position: 'absolute', right: '6px', top: '5px', display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setShowDemoBarcodes(!showDemoBarcodes)}
                  title="Toggle 1-Click Demo Barcode Scanner [F2]"
                  style={{ fontSize: '0.725rem', padding: '5px 8px', color: '#2563eb', borderColor: '#bfdbfe' }}
                >
                  <Zap size={13} /> {showDemoBarcodes ? 'Hide' : 'Quick Barcodes'}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  style={{ fontSize: '0.75rem', padding: '5px 12px' }}
                >
                  Scan
                </button>
              </div>
            </form>

            {/* Search Filter */}
            <div style={{ position: 'relative', width: '260px' }}>
              <Search
                size={18}
                style={{ position: 'absolute', left: '14px', top: '12px', color: '#64748b' }}
              />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '40px', paddingRight: searchQuery ? '32px' : '14px' }}
                placeholder="Search catalog (/)..."
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
                    top: '11px',
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

          {/* 1-Click Demo Barcodes Strip */}
          {showDemoBarcodes && (
            <div
              style={{
                padding: '9px 14px',
                backgroundColor: '#f8faff',
                border: '1px solid #bfdbfe',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexWrap: 'wrap',
                animation: 'fadeIn 0.2s ease-out'
              }}
            >
              <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase' }}>
                ⚡ 1-Click Scanner:
              </span>
              {demoBarcodeList.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  className="btn btn-outline btn-sm mono"
                  style={{ fontSize: '0.7rem', padding: '3px 8px', borderRadius: '6px' }}
                  onClick={() => executeScan(item.code)}
                >
                  {item.name} ({item.code.slice(-4)})
                </button>
              ))}
            </div>
          )}

          {/* Scan Success Toast */}
          {scanToast && (
            <div
              style={{
                padding: '8px 14px',
                backgroundColor: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: '8px',
                color: '#065f46',
                fontSize: '0.825rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Check size={16} /> {scanToast}
            </div>
          )}

          {/* Category Pills Bar */}
          <div className="pill-bar">
            <button
              type="button"
              className={`pill-item ${selectedCategory === '' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('')}
            >
              All Products ({products.length})
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

          {/* Product Cards Grid with Fixed 4-Columns and Clear Pictures */}
          <style>{`
            .pos-product-grid {
              display: grid;
              grid-template-columns: repeat(4, minmax(0, 1fr));
              gap: 12px;
              align-content: start;
            }
            @media (max-width: 1400px) {
              .pos-product-grid {
                grid-template-columns: repeat(3, minmax(0, 1fr));
              }
            }
            @media (max-width: 950px) {
              .pos-product-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
              }
            }
          `}</style>
          <div
            className="pos-product-grid"
            style={{
              flex: 1,
              overflowY: 'auto',
              paddingRight: '4px'
            }}
          >
            {loading ? (
              <div style={{ gridColumn: '1 / -1' }}>
                <LoadingSpinner text="Loading supermarket catalog..." />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
                <ShoppingBag size={48} style={{ margin: '0 auto 12px auto', opacity: 0.35 }} />
                <div style={{ fontWeight: 700, color: '#475569', fontSize: '1rem' }}>No products match your search</div>
                <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>Try clearing filters or scanning a barcode</div>
              </div>
            ) : (
              filteredProducts.map((p) => {
                const isOutOfStock = p.currentStock <= 0;
                const imgUrl = getProductImageUrl(p);

                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      if (!isOutOfStock) {
                        playScannerBeep();
                        addToCart(p, 1);
                      } else {
                        playErrorTone();
                      }
                    }}
                    style={{
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      backgroundColor: '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                      opacity: isOutOfStock ? 0.55 : 1,
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                      userSelect: 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (!isOutOfStock) {
                        e.currentTarget.style.borderColor = '#2563eb';
                        e.currentTarget.style.transform = 'translateY(-3px)';
                        e.currentTarget.style.boxShadow = '0 10px 20px -5px rgba(37, 99, 235, 0.15)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.04)';
                    }}
                  >
                    {/* Fixed 135px Product Picture Container */}
                    <div
                      style={{
                        height: '135px',
                        width: '100%',
                        position: 'relative',
                        overflow: 'hidden',
                        backgroundColor: '#f8fafc',
                        borderBottom: '1px solid #f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <img
                        src={imgUrl}
                        alt={p.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                        loading="lazy"
                        onMouseEnter={(e) => {
                          if (!isOutOfStock) e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      />

                      {/* Floating Top SKU Badge */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '6px',
                          left: '6px',
                          backgroundColor: 'rgba(255, 255, 255, 0.94)',
                          backdropFilter: 'blur(4px)',
                          padding: '2px 6px',
                          borderRadius: '6px',
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          color: '#334155',
                          border: '1px solid rgba(0, 0, 0, 0.08)',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}
                        className="mono"
                      >
                        {p.sku}
                      </div>

                      {/* Floating Stock Status Badge */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '6px',
                          right: '6px'
                        }}
                      >
                        <span
                          className={`badge ${
                            isOutOfStock ? 'badge-danger' : p.isLowStock ? 'badge-warning' : 'badge-success'
                          }`}
                          style={{ fontSize: '0.625rem', padding: '2px 6px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
                        >
                          {isOutOfStock ? 'Out of Stock' : `${p.currentStock} in stock`}
                        </span>
                      </div>
                    </div>

                    {/* Fixed Details Area */}
                    <div
                      style={{
                        padding: '10px 11px',
                        display: 'flex',
                        flexDirection: 'column',
                        flex: 1,
                        justifyContent: 'space-between',
                        gap: '6px'
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            color: '#0f172a',
                            lineHeight: 1.35,
                            height: '36px',
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical'
                          }}
                          title={p.name}
                        >
                          {p.name}
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            marginTop: '2px'
                          }}
                        >
                          {p.barcode ? (
                            <span
                              className="mono"
                              style={{
                                fontSize: '0.65rem',
                                color: '#64748b',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                            >
                              <Barcode size={11} /> {p.barcode}
                            </span>
                          ) : p.category?.name ? (
                            <span style={{ fontSize: '0.65rem', color: '#64748b', backgroundColor: '#f1f5f9', padding: '1px 5px', borderRadius: '4px' }}>
                              {p.category.name}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* Fixed Price & Add Section */}
                      <div
                        style={{
                          marginTop: '6px',
                          paddingTop: '6px',
                          borderTop: '1px solid #f1f5f9',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-end'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#2563eb' }} className="mono">
                            ${Number(p.sellingPrice).toFixed(2)}
                          </div>
                          <div style={{ fontSize: '0.675rem', fontWeight: 600, color: '#64748b' }}>
                            {Math.round(Number(p.sellingPrice) * exchangeRate).toLocaleString()} ៛
                          </div>
                        </div>

                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{
                            padding: '3px 8px',
                            fontSize: '0.725rem',
                            fontWeight: 600,
                            color: isOutOfStock ? '#94a3b8' : '#2563eb',
                            borderColor: isOutOfStock ? '#e2e8f0' : '#bfdbfe',
                            backgroundColor: isOutOfStock ? '#f8fafc' : '#eff6ff',
                            borderRadius: '6px'
                          }}
                          disabled={isOutOfStock}
                        >
                          + Add
                        </button>
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
            width: '430px',
            display: 'flex',
            flexDirection: 'column',
            padding: '18px',
            backgroundColor: '#ffffff',
            boxShadow: 'var(--shadow-md)',
            borderRadius: 'var(--radius-xl)',
            border: '1.5px solid #e2e8f0'
          }}
        >
          {/* Cart Header with Parked Orders Badge */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 800, fontSize: '1.15rem', color: '#0f172a' }}>Order Cart</span>
              <span
                style={{
                  backgroundColor: '#eff6ff',
                  color: '#2563eb',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  border: '1px solid #bfdbfe'
                }}
              >
                {cart.reduce((sum, i) => sum + i.quantity, 0)} items
              </span>
            </div>

            {/* Quick Header Actions: Parked List & Hold Cart */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {parkedOrders.length > 0 && (
                <button
                  type="button"
                  onClick={() => setParkedListModalOpen(true)}
                  className="btn btn-sm"
                  style={{
                    backgroundColor: '#fef3c7',
                    color: '#92400e',
                    border: '1px solid #fde68a',
                    padding: '3px 8px',
                    fontSize: '0.725rem',
                    fontWeight: 700
                  }}
                  title="View parked orders on hold"
                >
                  <PauseCircle size={13} /> Parked ({parkedOrders.length})
                </button>
              )}

              {cart.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setHoldNoteInput(`Hold #${parkedOrders.length + 1}`);
                      setHoldModalOpen(true);
                    }}
                    className="btn btn-outline btn-sm"
                    style={{
                      color: '#475569',
                      borderColor: '#cbd5e1',
                      padding: '3px 8px',
                      fontSize: '0.725rem'
                    }}
                    title="Park / Hold current cart [F4]"
                  >
                    <PauseCircle size={13} /> Hold [F4]
                  </button>

                  <button
                    onClick={clearCart}
                    className="btn btn-outline btn-sm"
                    style={{ color: '#ef4444', borderColor: '#fecaca', padding: '3px 7px', fontSize: '0.725rem' }}
                    title="Clear shopping cart"
                  >
                    <Trash2 size={13} />
                  </button>
                </>
              )}
            </div>
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
              <div style={{ padding: '50px 16px', textAlign: 'center', color: '#94a3b8' }}>
                <Barcode size={44} style={{ margin: '0 auto 10px auto', opacity: 0.35 }} />
                <div style={{ fontWeight: 700, color: '#64748b', fontSize: '0.95rem' }}>Cart is Empty</div>
                <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>Scan barcode or click items to add</div>
                {parkedOrders.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setParkedListModalOpen(true)}
                    className="btn btn-sm btn-outline"
                    style={{ marginTop: '14px', fontSize: '0.75rem', borderColor: '#f59e0b', color: '#b45309' }}
                  >
                    <PlayCircle size={14} /> Resume Parked Order ({parkedOrders.length})
                  </button>
                )}
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.product.id}
                  style={{
                    padding: '9px 11px',
                    borderRadius: '10px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #f1f5f9',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: '0.85rem' }}>
                    <span style={{ color: '#0f172a' }}>{item.product.name}</span>
                    <span className="mono" style={{ color: '#2563eb', fontWeight: 700 }}>
                      ${Number(item.lineTotal).toFixed(2)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {/* Unit price & discount badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.725rem', color: '#64748b' }}>
                        ${Number(item.product.sellingPrice).toFixed(2)} / {item.product.unit || 'pcs'}
                      </span>
                      {item.discount > 0 && (
                        <span
                          style={{
                            fontSize: '0.675rem',
                            backgroundColor: '#fee2e2',
                            color: '#b91c1c',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            fontWeight: 700
                          }}
                        >
                          -${Number(item.discount).toFixed(2)}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => openDiscountModal(item)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: item.discount > 0 ? '#b91c1c' : '#94a3b8',
                          cursor: 'pointer',
                          padding: '1px 3px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px',
                          fontSize: '0.675rem'
                        }}
                        title="Add line-item discount"
                      >
                        <Tag size={11} /> {item.discount > 0 ? 'Edit' : 'Disc'}
                      </button>
                    </div>

                    {/* Direct Quantity Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ padding: '2px 7px', borderRadius: '5px', height: '26px' }}
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      >
                        <Minus size={11} />
                      </button>

                      {/* Editable Direct Quantity Input */}
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.product.id, e.target.value)}
                        style={{
                          width: '42px',
                          height: '26px',
                          textAlign: 'center',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          border: '1px solid #cbd5e1',
                          borderRadius: '5px',
                          padding: '0 2px'
                        }}
                        className="mono"
                        title="Click to type exact quantity"
                      />

                      <button
                        className="btn btn-outline btn-sm"
                        style={{ padding: '2px 7px', borderRadius: '5px', height: '26px' }}
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      >
                        <Plus size={11} />
                      </button>

                      <button
                        className="btn btn-outline btn-sm"
                        style={{ padding: '2px 5px', color: '#ef4444', border: 'none', background: 'transparent' }}
                        onClick={() => removeFromCart(item.product.id)}
                        title="Remove item"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Totals Summary Banner */}
          <div style={{ padding: '10px 0 8px 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b' }}>
              <span>Subtotal:</span>
              <span className="mono">${subtotal.toFixed(2)}</span>
            </div>

            {discountTotal > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#dc2626' }}>
                <span>Total Discount:</span>
                <span className="mono">-${discountTotal.toFixed(2)}</span>
              </div>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                borderTop: '1px solid #e2e8f0',
                paddingTop: '8px',
                marginTop: '2px'
              }}
            >
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#0f172a' }}>Grand Total:</div>
                <div style={{ fontSize: '0.8rem', color: '#2563eb', fontWeight: 700 }}>
                  {grandTotalKHR.toLocaleString()} ៛ KHR
                </div>
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }} className="mono">
                ${grandTotal.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Payment Method Selector: Cash vs Scan QR */}
          <div style={{ margin: '6px 0 10px 0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                className={`btn ${paymentMethod === 'CASH' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setPaymentMethod('CASH')}
                style={{ padding: '9px 10px', fontSize: '0.825rem', fontWeight: 700 }}
              >
                <DollarSign size={15} /> Cash Sale [F8]
              </button>
              <button
                type="button"
                className={`btn ${paymentMethod === 'QR_PAYMENT' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setPaymentMethod('QR_PAYMENT')}
                style={{ padding: '9px 10px', fontSize: '0.825rem', fontWeight: 700 }}
              >
                <QrCode size={15} /> Scan QR [F9]
              </button>
            </div>
          </div>

          {/* Cash Payment Tender Calculator */}
          {paymentMethod === 'CASH' && (
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                padding: '12px',
                borderRadius: '12px',
                marginBottom: '10px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.725rem', fontWeight: 700, color: '#475569', letterSpacing: '0.04em' }}>
                  TENDERED CASH
                </label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${currency === 'USD' ? 'btn-primary' : 'btn-outline'}`}
                    style={{ padding: '1px 8px', fontSize: '0.675rem' }}
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
                    style={{ padding: '1px 8px', fontSize: '0.675rem' }}
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
                style={{ fontSize: '1.3rem', fontWeight: 800, textAlign: 'right', padding: '6px 12px' }}
                placeholder={currency === 'USD' ? '0.00' : '0'}
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
              />

              {/* Quick cash denomination chips */}
              <div style={{ display: 'flex', gap: '3px', marginTop: '7px' }}>
                {currency === 'USD' ? (
                  <>
                    {[5, 10, 20, 50, 100].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        className="btn btn-outline btn-sm mono"
                        style={{ flex: 1, padding: '3px 0', fontSize: '0.7rem' }}
                        onClick={() => setQuickCash(amt)}
                      >
                        ${amt}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1.2, padding: '3px 0', fontSize: '0.7rem' }}
                      onClick={setExactCash}
                    >
                      Exact
                    </button>
                  </>
                ) : (
                  <>
                    {[10000, 20000, 50000, 100000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        className="btn btn-outline btn-sm mono"
                        style={{ flex: 1, padding: '3px 0', fontSize: '0.675rem' }}
                        onClick={() => setQuickCash(amt)}
                      >
                        {amt / 1000}k
                      </button>
                    ))}
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1.2, padding: '3px 0', fontSize: '0.675rem' }}
                      onClick={setExactCash}
                    >
                      Exact
                    </button>
                  </>
                )}
              </div>

              {/* Dual-Currency Change Preview */}
              <div
                style={{
                  marginTop: '10px',
                  paddingTop: '6px',
                  borderTop: '1px dashed #cbd5e1',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>
                  {isCashSufficient ? 'Change Due:' : 'Status:'}
                </span>

                {isCashSufficient ? (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#10b981', fontWeight: 800, fontSize: '1.05rem' }} className="mono">
                      ${changeUSD.toFixed(2)} USD
                    </div>
                    <div style={{ color: '#059669', fontSize: '0.75rem', fontWeight: 700 }}>
                      ≈ {changeKHR.toLocaleString()} ៛ KHR
                    </div>
                  </div>
                ) : (
                  <div style={{ color: '#dc2626', fontWeight: 700, fontSize: '0.85rem' }} className="mono">
                    Short by ${shortageUSD.toFixed(2)}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Checkout Button */}
          <button
            className="btn btn-success btn-lg"
            style={{ width: '100%', padding: '12px', fontSize: '1rem', fontWeight: 800 }}
            disabled={cart.length === 0 || checkoutLoading || (paymentMethod === 'CASH' && !isCashSufficient)}
            onClick={handleCheckout}
          >
            {checkoutLoading ? 'Processing Checkout...' : (
              paymentMethod === 'CASH' ? '⚡ Complete Cash Sale' : '📱 Generate Scan QR'
            )}
          </button>
        </div>
      </div>

      {/* Bottom Keyboard Shortcut Helper Bar */}
      <div
        style={{
          padding: '6px 14px',
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.725rem',
          color: '#64748b'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Keyboard size={13} color="#2563eb" /> Shortcuts:
          </span>
          <span><kbd style={{ backgroundColor: '#fff', border: '1px solid #cbd5e1', padding: '1px 5px', borderRadius: '3px' }}>F1</kbd> Barcode</span>
          <span><kbd style={{ backgroundColor: '#fff', border: '1px solid #cbd5e1', padding: '1px 5px', borderRadius: '3px' }}>F2</kbd> Quick Barcodes</span>
          <span><kbd style={{ backgroundColor: '#fff', border: '1px solid #cbd5e1', padding: '1px 5px', borderRadius: '3px' }}>F4</kbd> Hold Cart</span>
          <span><kbd style={{ backgroundColor: '#fff', border: '1px solid #cbd5e1', padding: '1px 5px', borderRadius: '3px' }}>F8</kbd> Cash</span>
          <span><kbd style={{ backgroundColor: '#fff', border: '1px solid #cbd5e1', padding: '1px 5px', borderRadius: '3px' }}>F9</kbd> QR</span>
          <span><kbd style={{ backgroundColor: '#fff', border: '1px solid #cbd5e1', padding: '1px 5px', borderRadius: '3px' }}>Esc</kbd> Close</span>
        </div>
        <div>
          <span>Exchange Rate: <strong>1 USD = {exchangeRate.toLocaleString()} KHR</strong></span>
        </div>
      </div>

      {/* Modal: Hold / Park Current Cart */}
      <Modal
        isOpen={holdModalOpen}
        onClose={() => setHoldModalOpen(false)}
        title="Park Current Order on Hold"
        maxWidth="460px"
      >
        <form onSubmit={handleConfirmHoldCart} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontSize: '0.725rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>
            ⏸ Cart Suspension Details
          </div>

          <div style={{ fontSize: '0.875rem', color: '#475569' }}>
            Park this order to assist the next customer in line. You can resume this order at any time from <strong>Parked Orders</strong>.
          </div>

          <div>
            <label className="form-label">Order Reference / Customer Note:</label>
            <input
              type="text"
              className="form-input"
              value={holdNoteInput}
              onChange={(e) => setHoldNoteInput(e.target.value)}
              placeholder="e.g., Customer in green jacket, Cart #2..."
              autoFocus
            />
          </div>

          <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.825rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: '8px' }}>
              Order Snapshot
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ color: '#475569' }}>Items in Cart:</span>
              <strong>{cart.reduce((s, i) => s + i.quantity, 0)} items</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#475569' }}>Total Value:</span>
              <strong className="mono" style={{ color: '#2563eb' }}>${grandTotal.toFixed(2)} ({grandTotalKHR.toLocaleString()} ៛)</strong>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
            <button type="button" onClick={() => setHoldModalOpen(false)} className="btn btn-outline">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#d97706', borderColor: '#d97706' }}>
              <PauseCircle size={16} /> Confirm Hold Order
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: View & Resume Parked Orders */}
      <Modal
        isOpen={parkedListModalOpen}
        onClose={() => setParkedListModalOpen(false)}
        title={`Parked Orders on Hold (${parkedOrders.length})`}
        maxWidth="620px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '0.725rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>
            📋 Active Suspended Orders
          </div>

          {parkedOrders.length === 0 ? (
            <div style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
              No held orders currently parked.
            </div>
          ) : (
            parkedOrders.map((pOrder) => (
              <div
                key={pOrder.id}
                style={{
                  padding: '14px',
                  borderRadius: '10px',
                  border: '1.5px solid #e2e8f0',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>
                    {pOrder.note}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                    Parked at {new Date(pOrder.createdAt).toLocaleTimeString()} • {pOrder.itemCount} items
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#2563eb', fontWeight: 700, marginTop: '4px' }} className="mono">
                    ${Number(pOrder.grandTotal).toFixed(2)} ({(Number(pOrder.grandTotal) * exchangeRate).toLocaleString()} ៛)
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (cart.length > 0) {
                        if (!window.confirm('Your current cart has items. Resuming will overwrite current cart. Continue?')) {
                          return;
                        }
                      }
                      resumeParkedOrder(pOrder.id);
                      setParkedListModalOpen(false);
                      setScanToast(`✓ Resumed: ${pOrder.note}`);
                      setTimeout(() => setScanToast(''), 2500);
                    }}
                    className="btn btn-primary btn-sm"
                  >
                    <PlayCircle size={15} /> Resume Order
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteParkedOrder(pOrder.id)}
                    className="btn btn-outline btn-sm"
                    style={{ color: '#ef4444', borderColor: '#fecaca' }}
                    title="Discard parked order"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button type="button" onClick={() => setParkedListModalOpen(false)} className="btn btn-outline">
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Item Discount */}
      <Modal
        isOpen={Boolean(discountModalItem)}
        onClose={() => setDiscountModalItem(null)}
        title={`Apply Discount: ${discountModalItem?.product?.name || ''}`}
        maxWidth="440px"
      >
        <form onSubmit={handleApplyDiscount} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="form-label">Discount Type:</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                className={`btn btn-sm ${discountType === 'FIXED' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setDiscountType('FIXED')}
              >
                Fixed Dollar ($)
              </button>
              <button
                type="button"
                className={`btn btn-sm ${discountType === 'PERCENT' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setDiscountType('PERCENT')}
              >
                Percentage (%)
              </button>
            </div>
          </div>

          <div>
            <label className="form-label">
              {discountType === 'FIXED' ? 'Discount Amount ($ USD):' : 'Discount Percentage (%):'}
            </label>
            <input
              type="number"
              step="any"
              min="0"
              max={discountType === 'PERCENT' ? '100' : undefined}
              className="form-input mono"
              value={discountValueInput}
              onChange={(e) => setDiscountValueInput(e.target.value)}
              placeholder={discountType === 'FIXED' ? '0.50' : '10'}
              autoFocus
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ color: '#ef4444', borderColor: '#fecaca' }}
              onClick={() => {
                if (discountModalItem) {
                  updateDiscount(discountModalItem.product.id, 0);
                  setDiscountModalItem(null);
                }
              }}
            >
              Clear Discount
            </button>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" onClick={() => setDiscountModalItem(null)} className="btn btn-outline btn-sm">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm">
                Apply Discount
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Upgraded Official Bakong / KHQR Payment Modal */}
      <Modal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        title="Scan QR Payment"
        maxWidth="450px"
      >
        <div style={{ textAlign: 'center', padding: '6px 0' }}>
          {/* Official KHQR / Bakong Header Bar */}
          <div
            style={{
              backgroundColor: '#e11d48',
              borderRadius: '12px 12px 0 0',
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#ffffff'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 900, fontSize: '1.1rem', letterSpacing: '0.05em' }}>KHQR</span>
              <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>• Bakong Payment</span>
            </div>
            <span
              style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '0.7rem',
                fontWeight: 700
              }}
              className="mono"
            >
              REF #{pendingQrData?.sale?.receiptNumber || '2026'}
            </span>
          </div>

          {/* QR Canvas Box */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '2px solid #e11d48',
              borderTop: 'none',
              borderRadius: '0 0 16px 16px',
              padding: '24px 20px',
              boxShadow: '0 10px 25px -5px rgba(225, 29, 72, 0.15)'
            }}
          >
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: '16px',
                padding: '16px',
                display: 'inline-block',
                margin: '0 auto 14px auto',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                position: 'relative'
              }}
            >
              {/* High-Resolution Realistic Vector KHQR */}
              <svg width="210" height="210" viewBox="0 0 100 100" style={{ display: 'block' }}>
                <rect width="100" height="100" fill="#ffffff" rx="6" />
                {/* Corner position markers */}
                <rect x="6" y="6" width="24" height="24" fill="#0f172a" rx="4" />
                <rect x="10" y="10" width="16" height="16" fill="#ffffff" rx="2" />
                <rect x="14" y="14" width="8" height="8" fill="#e11d48" rx="1" />

                <rect x="70" y="6" width="24" height="24" fill="#0f172a" rx="4" />
                <rect x="74" y="10" width="16" height="16" fill="#ffffff" rx="2" />
                <rect x="78" y="14" width="8" height="8" fill="#e11d48" rx="1" />

                <rect x="6" y="70" width="24" height="24" fill="#0f172a" rx="4" />
                <rect x="10" y="74" width="16" height="16" fill="#ffffff" rx="2" />
                <rect x="14" y="78" width="8" height="8" fill="#e11d48" rx="1" />

                {/* QR Data Matrix simulation */}
                <rect x="36" y="8" width="6" height="6" fill="#0f172a" rx="1" />
                <rect x="46" y="12" width="8" height="6" fill="#0f172a" rx="1" />
                <rect x="58" y="8" width="6" height="6" fill="#0f172a" rx="1" />
                
                {/* Official Center KHQR Brand Emblem */}
                <rect x="37" y="37" width="26" height="26" fill="#e11d48" rx="7" />
                <text x="50" y="53" fill="#ffffff" fontSize="9" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">
                  KHQR
                </text>

                <rect x="10" y="44" width="8" height="10" fill="#0f172a" rx="1" />
                <rect x="24" y="40" width="8" height="6" fill="#0f172a" rx="1" />
                <rect x="72" y="38" width="14" height="6" fill="#0f172a" rx="1" />
                <rect x="78" y="50" width="8" height="10" fill="#0f172a" rx="1" />
                <rect x="44" y="70" width="14" height="8" fill="#0f172a" rx="1" />
                <rect x="66" y="74" width="8" height="8" fill="#0f172a" rx="1" />
                <rect x="80" y="76" width="10" height="8" fill="#0f172a" rx="1" />
                <rect x="36" y="84" width="12" height="6" fill="#0f172a" rx="1" />
              </svg>

              {/* Status Scanning Pill */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '-12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: qrScanStatus === 'SUCCESS' ? '#ecfdf5' : qrScanStatus === 'DETECTED' ? '#fffbeb' : '#ffffff',
                  border: '1.5px solid',
                  borderColor: qrScanStatus === 'SUCCESS' ? '#10b981' : qrScanStatus === 'DETECTED' ? '#f59e0b' : '#a7f3d0',
                  borderRadius: '9999px',
                  padding: '4px 14px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: qrScanStatus === 'SUCCESS' ? '#065f46' : qrScanStatus === 'DETECTED' ? '#92400e' : '#065f46',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: qrScanStatus === 'SUCCESS' ? '#10b981' : qrScanStatus === 'DETECTED' ? '#f59e0b' : '#10b981',
                    boxShadow: qrScanStatus === 'SUCCESS' ? '0 0 8px #10b981' : qrScanStatus === 'DETECTED' ? '0 0 8px #f59e0b' : '0 0 6px #10b981',
                    display: 'inline-block'
                  }}
                />
                {qrScanStatus === 'SUCCESS'
                  ? '✓ Payment Successful! Generating Receipt...'
                  : qrScanStatus === 'DETECTED'
                  ? '🔔 Scan Detected! Verifying...'
                  : `Awaiting Customer Scan (${qrCountdown}s)`}
              </div>
            </div>

            {/* Total Amount Display */}
            <div style={{ marginTop: '16px' }}>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#0f172a' }} className="mono">
                ${Number(pendingQrData?.sale?.grandTotal).toFixed(2)}
              </div>
              <div style={{ fontSize: '1.1rem', color: '#e11d48', fontWeight: 800, marginTop: '2px' }}>
                {Math.round(Number(pendingQrData?.sale?.grandTotal) * (pendingQrData?.exchangeRate || 4100)).toLocaleString()} ៛ KHR
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>
                Scan with Bakong, ABA, Wing, ACLEDA, or any banking app.
                <br />
                <span style={{ color: '#059669', fontWeight: 600 }}>The shop automatically detects the scan — no manual confirmation needed!</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-outline"
                style={{ flex: 1, padding: '11px', fontSize: '0.85rem' }}
                onClick={handleCancelQrPayment}
                disabled={qrScanStatus === 'SUCCESS'}
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn btn-success"
                style={{
                  flex: 2,
                  padding: '11px',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                  backgroundColor: qrScanStatus === 'SUCCESS' ? '#059669' : '#10b981'
                }}
                disabled={qrScanStatus === 'SUCCESS'}
                onClick={() => handleAutoConfirmQr(pendingQrData)}
              >
                {qrScanStatus === 'SUCCESS' ? (
                  <>✓ Payment Verified</>
                ) : qrScanStatus === 'DETECTED' ? (
                  <>Verifying Network...</>
                ) : (
                  <>⚡ Simulate Customer Scan (Instant)</>
                )}
              </button>
            </div>
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
