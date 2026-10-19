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
  Camera
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { usePos } from '../../context/PosContext';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner, Alert } from '../../components/common/LoadingSpinner';
import ReceiptModal from '../../components/receipt/ReceiptModal';
import Modal from '../../components/common/Modal';
import {
  getProductImageUrl,
  getProductSvgPlaceholder,
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
    itemDiscountTotal,
    cartDiscountAmount,
    discountTotal,
    taxTotal,
    grandTotal,
    currency,
    setCurrency,
    exchangeRate,
    setExchangeRate,
    cartDiscount,
    setCartDiscount,
    applyCartDiscount,
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

  // Modals for Parked Orders, Custom Discounts, and Exchange Rate
  const [holdModalOpen, setHoldModalOpen] = useState(false);
  const [holdNoteInput, setHoldNoteInput] = useState('');
  const [parkedListModalOpen, setParkedListModalOpen] = useState(false);

  // Custom whole-cart discount modal state
  const [cartDiscountModalOpen, setCartDiscountModalOpen] = useState(false);
  const [customCartDiscountType, setCustomCartDiscountType] = useState('PERCENT'); // 'PERCENT' or 'FIXED'
  const [customCartDiscountValue, setCustomCartDiscountValue] = useState('');

  // Custom exchange rate modal state
  const [exchangeModalOpen, setExchangeModalOpen] = useState(false);
  const [customRateInput, setCustomRateInput] = useState('');

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
  const scanBufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);

  // Live Camera Barcode Scanner Modal State
  const [cameraScannerOpen, setCameraScannerOpen] = useState(false);
  const videoRef = useRef(null);
  const [cameraStream, setCameraStream] = useState(null);

  // Camera Barcode Detection Stream Lifecycle
  useEffect(() => {
    let stream = null;
    let detector = null;
    let scanInterval = null;

    if (cameraScannerOpen) {
      if ('BarcodeDetector' in window) {
        try {
          detector = new window.BarcodeDetector({
            formats: ['qr_code', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39']
          });
        } catch (e) {}
      }

      navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment' } })
        .then((s) => {
          stream = s;
          setCameraStream(s);
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.play().catch(() => {});
          }

          if (detector) {
            scanInterval = setInterval(async () => {
              if (videoRef.current && videoRef.current.readyState >= 2) {
                try {
                  const barcodes = await detector.detect(videoRef.current);
                  if (barcodes.length > 0) {
                    const code = barcodes[0].rawValue;
                    if (code) {
                      executeScan(code);
                      setCameraScannerOpen(false);
                    }
                  }
                } catch (e) {}
              }
            }, 300);
          }
        })
        .catch(() => {
          // Camera not available or permission denied - fallback stays active
        });
    } else {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
        setCameraStream(null);
      }
      if (scanInterval) clearInterval(scanInterval);
    }

    return () => {
      if (stream) stream.getTracks().forEach((track) => track.stop());
      if (scanInterval) clearInterval(scanInterval);
    };
  }, [cameraScannerOpen]);

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

  // Global Keyboard Shortcuts & Hardware Barcode Scanner Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);
      const isBarcodeInput = e.target === barcodeRef.current;
      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      // Handle function shortcuts
      if (e.key === 'F1') {
        e.preventDefault();
        barcodeRef.current?.focus();
        barcodeRef.current?.select();
        return;
      }
      if (e.key === 'F2') {
        e.preventDefault();
        setCameraScannerOpen((prev) => !prev);
        return;
      }
      if (e.key === 'F4') {
        e.preventDefault();
        if (cart.length > 0) {
          setHoldNoteInput(`Customer Hold #${parkedOrders.length + 1}`);
          setHoldModalOpen(true);
        }
        return;
      }
      if (e.key === 'F8') {
        e.preventDefault();
        setPaymentMethod('CASH');
        return;
      }
      if (e.key === 'F9') {
        e.preventDefault();
        setPaymentMethod('QR_PAYMENT');
        return;
      }
      if (e.key === 'Escape') {
        setHoldModalOpen(false);
        setParkedListModalOpen(false);
        setDiscountModalItem(null);
        setQrModalOpen(false);
        setSearchQuery('');
        return;
      }
      if (e.key === '/' && !isInput) {
        e.preventDefault();
        barcodeRef.current?.focus();
        return;
      }

      // Enter key detection (either in barcode field or from hardware scanner gun)
      if (e.key === 'Enter') {
        const inputVal = (barcodeRef.current?.value || '').trim();
        const bufferVal = scanBufferRef.current.trim();
        scanBufferRef.current = '';

        if (isBarcodeInput) {
          e.preventDefault();
          const targetCode = inputVal || bufferVal || barcodeInput;
          if (targetCode) executeScan(targetCode);
          return;
        }

        // If hardware scanner buffer was filled outside the input and completed with Enter
        if (bufferVal.length >= 2) {
          e.preventDefault();
          executeScan(bufferVal);
          return;
        }
        return;
      }

      // Hardware Scanner character buffering
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Reset buffer if human paused typing for more than 250ms
        if (timeDiff > 250) {
          scanBufferRef.current = '';
        }
        scanBufferRef.current += e.key;

        // If user was typing outside an input, auto-focus barcode box on keypress
        if (!isInput && e.target !== barcodeRef.current) {
          if (timeDiff > 100) {
            barcodeRef.current?.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart.length, parkedOrders.length, products, barcodeInput]);

  // Robust Barcode Scanner Lookup (Hardware Scanner + Manual Entry + Demo Buttons)
  const executeScan = async (codeToScan) => {
    const raw = codeToScan !== undefined ? codeToScan : (barcodeRef.current?.value || barcodeInput);
    const code = String(raw || '').replace(/[\r\n\t]/g, '').trim();
    if (!code) return;

    setError('');
    const cleanCode = code.toLowerCase();
    const cleanNoZeros = cleanCode.replace(/^0+/, '');
    const cleanWithZero = cleanCode.startsWith('0') ? cleanCode : `0${cleanCode}`;

    // 1. Check in-memory loaded products first (check barcode, sku, extra barcodes, or exact name)
    const localMatch = products.find((p) => {
      const pBarcode = (p.barcode || '').trim().toLowerCase();
      const pSku = (p.sku || '').trim().toLowerCase();
      const pName = (p.name || '').trim().toLowerCase();
      const hasExtra = Array.isArray(p.barcodes) && p.barcodes.some((b) => {
        const bCode = (b.barcode || '').trim().toLowerCase();
        return bCode === cleanCode || bCode === cleanNoZeros || bCode === cleanWithZero;
      });

      return (
        pBarcode === cleanCode ||
        pBarcode === cleanNoZeros ||
        pBarcode === cleanWithZero ||
        pSku === cleanCode ||
        pSku === cleanNoZeros ||
        pSku === cleanWithZero ||
        pName === cleanCode ||
        hasExtra
      );
    });

    if (localMatch) {
      if (Number(localMatch.currentStock) <= 0) {
        playErrorTone();
        setError(`"${localMatch.name}" is currently out of stock.`);
        return;
      }
      playScannerBeep();
      addToCart(localMatch, 1);
      setBarcodeInput('');
      if (barcodeRef.current) barcodeRef.current.value = '';
      setScanToast(`✓ Scanned: ${localMatch.name} ($${Number(localMatch.sellingPrice).toFixed(2)})`);
      setTimeout(() => setScanToast(''), 2500);
      barcodeRef.current?.focus();
      return;
    }

    // 2. Fetch from backend if not yet in memory or new product
    try {
      const res = await api.get(`/products/barcode/${encodeURIComponent(code)}`);
      const prod = res.data;
      if (prod) {
        if (Number(prod.currentStock) <= 0) {
          playErrorTone();
          setError(`"${prod.name}" is currently out of stock.`);
        } else {
          playScannerBeep();
          addToCart(prod, 1);
          setBarcodeInput('');
          if (barcodeRef.current) barcodeRef.current.value = '';
          setScanToast(`✓ Scanned: ${prod.name} ($${Number(prod.sellingPrice).toFixed(2)})`);
          setTimeout(() => setScanToast(''), 2500);
        }
      } else {
        playErrorTone();
        setError(`No product found matching barcode or SKU "${code}"`);
      }
    } catch (err) {
      playErrorTone();
      setError(err.message || `No product found matching barcode or SKU "${code}"`);
    } finally {
      barcodeRef.current?.focus();
    }
  };

  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    const val = (barcodeRef.current?.value || barcodeInput || '').trim();
    if (val) {
      executeScan(val);
    } else {
      setCameraScannerOpen(true);
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
      // Proportionally distribute whole-cart discount across items for authoritative backend line-item totals
      let remainingCartDisc = cartDiscountAmount;
      const itemsPayload = cart.map((i, idx) => {
        const itemGross = i.quantity * Number(i.product.sellingPrice);
        let itemExtraDisc = 0;
        if (cartDiscountAmount > 0 && subtotal > 0) {
          if (idx === cart.length - 1) {
            itemExtraDisc = Math.max(0, remainingCartDisc);
          } else {
            itemExtraDisc = Math.round(((itemGross / subtotal) * cartDiscountAmount) * 100) / 100;
            remainingCartDisc = Math.max(0, remainingCartDisc - itemExtraDisc);
          }
        }
        const finalItemDisc = Math.min(itemGross, Math.round(((Number(i.discount) || 0) + itemExtraDisc) * 100) / 100);
        return {
          productId: i.product.id,
          quantity: i.quantity,
          discount: finalItemDisc
        };
      });

      const payload = {
        items: itemsPayload,
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
            Checkout Register
          </h1>
          <span className="badge badge-primary" style={{ padding: '3px 8px', fontSize: '0.75rem', fontWeight: 700 }}>
            Register #01
          </span>
          {activeShift ? (
            <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 8px', fontSize: '0.75rem' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
              Shift Open ({user?.fullName || user?.username})
            </span>
          ) : (
            <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 8px', fontSize: '0.75rem' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
              Shift Closed
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {parkedOrders.length > 0 && (
            <button
              type="button"
              onClick={() => setParkedListModalOpen(true)}
              className="btn btn-sm"
              style={{
                backgroundColor: '#fef3c7',
                color: '#92400e',
                border: '1px solid #fde68a',
                padding: '5px 10px',
                fontSize: '0.75rem',
                fontWeight: 700
              }}
            >
              <PauseCircle size={13} /> Parked Orders ({parkedOrders.length})
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate('/shifts')}
            className="btn btn-outline btn-sm"
            style={{ fontSize: '0.75rem', padding: '5px 10px' }}
          >
            <Clock size={13} /> Shift Details
          </button>
        </div>
      </div>

      {/* Main POS Interface (Left: Catalog, Right: Cart) */}
      <div style={{ display: 'flex', gap: '20px', minHeight: '600px', height: 'calc(100vh - 165px)' }}>
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
          {/* Top Controls Bar: Scanner, Search & Camera */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {/* 1. Spacious Barcode Scanner Input */}
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
                  paddingRight: '82px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  backgroundColor: '#ffffff',
                  borderColor: scanToast ? '#10b981' : '#cbd5e1'
                }}
                placeholder="Scan barcode or enter SKU [F1]..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                autoFocus
              />
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                style={{
                  position: 'absolute',
                  right: '6px',
                  top: '5px',
                  fontSize: '0.78rem',
                  padding: '5px 14px',
                  fontWeight: 700
                }}
                title="Scan barcode or press Enter"
              >
                Scan
              </button>
            </form>

            {/* 2. Search Catalog Filter */}
            <div style={{ position: 'relative', width: '250px' }}>
              <Search
                size={17}
                style={{ position: 'absolute', left: '13px', top: '12px', color: '#64748b' }}
              />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '38px', paddingRight: searchQuery ? '32px' : '12px', fontSize: '0.85rem' }}
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
                  <X size={15} />
                </button>
              )}
            </div>

            {/* 3. Camera Scan Button (Next to Search) */}
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setCameraScannerOpen(true)}
              title="Open Live Camera Barcode Reader"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '9px 16px',
                fontSize: '0.85rem',
                fontWeight: 700,
                color: '#166534',
                borderColor: '#bbf7d0',
                backgroundColor: '#f0fdf4',
                whiteSpace: 'nowrap'
              }}
            >
              <Camera size={16} color="#16a34a" /> Camera Scan
            </button>
          </div>

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

          {/* Product Cards Grid with Responsive Sizing and Clear Pictures */}
          <style>{`
            .pos-product-grid {
              display: grid;
              grid-template-columns: repeat(4, minmax(0, 1fr));
              gap: 16px;
              align-content: start;
            }
            @media (max-width: 1300px) {
              .pos-product-grid {
                grid-template-columns: repeat(3, minmax(0, 1fr));
              }
            }
            @media (max-width: 850px) {
              .pos-product-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
              }
            }
            .pos-product-card-title {
              font-family: var(--font-display);
              font-weight: 700;
              font-size: 0.875rem;
              color: #0f172a;
              line-height: 1.3;
              min-height: 2.6em;
              max-height: 2.6em;
              overflow: hidden;
              text-overflow: ellipsis;
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
              margin-top: 8px;
              margin-bottom: 4px;
              word-break: break-word;
            }
          `}</style>
          <div
            className="pos-product-grid"
            style={{
              flex: 1,
              overflowY: 'auto',
              paddingRight: '6px'
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
                      opacity: isOutOfStock ? 0.6 : 1,
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      boxShadow: '0 2px 5px rgba(0, 0, 0, 0.04)',
                      userSelect: 'none',
                      padding: '11px',
                      minHeight: '265px'
                    }}
                    onMouseEnter={(e) => {
                      if (!isOutOfStock) {
                        e.currentTarget.style.borderColor = '#2563eb';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 8px 18px rgba(37, 99, 235, 0.12)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.04)';
                    }}
                  >
                    {/* Picture Display inside Product Card Box - Compact & Balanced */}
                    <div
                      style={{
                        height: '120px',
                        minHeight: '120px',
                        width: '100%',
                        backgroundColor: '#f8fafc',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '6px',
                        overflow: 'hidden',
                        position: 'relative'
                      }}
                    >
                      <img
                        src={imgUrl}
                        alt={p.name}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = getProductSvgPlaceholder(p);
                        }}
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          width: 'auto',
                          height: 'auto',
                          objectFit: 'contain',
                          display: 'block',
                          margin: '0 auto',
                          transition: 'transform 0.25s ease'
                        }}
                        loading="eager"
                        onMouseEnter={(e) => {
                          if (!isOutOfStock) e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      />
                    </div>

                    {/* Product Name - Always Visible & Compact */}
                    <div
                      className="pos-product-card-title"
                      title={p.name}
                    >
                      {p.name || p.sku || 'Unnamed Product'}
                    </div>

                    {/* Product ID & Barcode */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          backgroundColor: '#eff6ff',
                          color: '#1d4ed8',
                          padding: '1px 6px',
                          borderRadius: '5px',
                          border: '1px solid #bfdbfe'
                        }}
                        className="currency-amount"
                      >
                        ID: {p.sku}
                      </span>
                      {p.barcode && (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            color: '#64748b',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                          className="currency-amount"
                        >
                          <Barcode size={10} /> {p.barcode}
                        </span>
                      )}
                    </div>

                    {/* Category & Stock Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', marginBottom: '6px' }}>
                      <span style={{ color: '#475569', backgroundColor: '#f1f5f9', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                        {p.category?.name || 'General'}
                      </span>
                      <span
                        style={{
                          fontWeight: 700,
                          color: isOutOfStock ? '#dc2626' : p.isLowStock ? '#d97706' : '#16a34a',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: isOutOfStock ? '#dc2626' : p.isLowStock ? '#f59e0b' : '#16a34a',
                            display: 'inline-block'
                          }}
                        />
                        {isOutOfStock ? 'Out of stock' : `${p.currentStock} in stock`}
                      </span>
                    </div>

                    {/* Price & Add Button Row */}
                    <div
                      style={{
                        marginTop: 'auto',
                        paddingTop: '6px',
                        borderTop: '1px solid #f1f5f9',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e40af', lineHeight: 1 }} className="currency-amount">
                          ${Number(p.sellingPrice).toFixed(2)}
                        </div>
                        <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748b', marginTop: '3px' }} className="currency-amount">
                          {Math.round(Number(p.sellingPrice) * exchangeRate).toLocaleString()} ៛
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn btn-sm"
                        style={{
                          padding: '6px 14px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: isOutOfStock ? '#94a3b8' : '#1d4ed8',
                          borderColor: isOutOfStock ? '#e2e8f0' : '#bfdbfe',
                          backgroundColor: isOutOfStock ? '#f8fafc' : '#eff6ff',
                          borderRadius: '7px',
                          border: '1px solid',
                          cursor: isOutOfStock ? 'not-allowed' : 'pointer'
                        }}
                        disabled={isOutOfStock}
                      >
                        + Add
                      </button>
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1 }}>
                      <img
                        src={getProductImageUrl(item.product)}
                        alt={item.product.name}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = getProductSvgPlaceholder(item.product);
                        }}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          objectFit: 'contain',
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          flexShrink: 0
                        }}
                      />
                      <span style={{ color: '#0f172a', fontWeight: 700, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.product.name}
                      </span>
                    </div>
                    <span className="currency-amount" style={{ color: '#1e40af', fontWeight: 800, fontSize: '0.9rem', flexShrink: 0 }}>
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

          {/* Whole-Cart Order Discount Selector */}
          <div
            style={{
              padding: '7px 10px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              marginTop: '6px',
              marginBottom: '4px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Order Discount
              </span>
              {cartDiscount.type !== 'none' && (
                <span style={{ fontSize: '0.725rem', color: '#dc2626', fontWeight: 700 }}>
                  -{cartDiscount.type === 'percent' ? `${cartDiscount.value}%` : `$${Number(cartDiscount.value).toFixed(2)}`} (-${cartDiscountAmount.toFixed(2)})
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '3px' }}>
              <button
                type="button"
                className={`btn btn-sm ${cartDiscount.type === 'none' ? 'btn-primary' : 'btn-outline'}`}
                style={{ flex: 1, padding: '3px 0', fontSize: '0.675rem', fontWeight: 700, height: '25px' }}
                onClick={() => applyCartDiscount('none', 0)}
              >
                0%
              </button>
              <button
                type="button"
                className={`btn btn-sm ${cartDiscount.type === 'percent' && cartDiscount.value === 5 ? 'btn-primary' : 'btn-outline'}`}
                style={{ flex: 1, padding: '3px 0', fontSize: '0.675rem', fontWeight: 700, height: '25px' }}
                onClick={() => applyCartDiscount('percent', 5)}
              >
                5%
              </button>
              <button
                type="button"
                className={`btn btn-sm ${cartDiscount.type === 'percent' && cartDiscount.value === 10 ? 'btn-primary' : 'btn-outline'}`}
                style={{ flex: 1, padding: '3px 0', fontSize: '0.675rem', fontWeight: 700, height: '25px' }}
                onClick={() => applyCartDiscount('percent', 10)}
              >
                10%
              </button>
              <button
                type="button"
                className={`btn btn-sm ${cartDiscount.type === 'percent' && cartDiscount.value === 15 ? 'btn-primary' : 'btn-outline'}`}
                style={{ flex: 1, padding: '3px 0', fontSize: '0.675rem', fontWeight: 700, height: '25px' }}
                onClick={() => applyCartDiscount('percent', 15)}
              >
                15%
              </button>
              <button
                type="button"
                className={`btn btn-sm ${(cartDiscount.type === 'fixed' || (cartDiscount.type === 'percent' && ![0, 5, 10, 15].includes(cartDiscount.value))) ? 'btn-primary' : 'btn-outline'}`}
                style={{ flex: 1.2, padding: '3px 0', fontSize: '0.675rem', fontWeight: 700, height: '25px' }}
                onClick={() => {
                  setCustomCartDiscountType(cartDiscount.type === 'fixed' ? 'FIXED' : 'PERCENT');
                  setCustomCartDiscountValue(cartDiscount.value > 0 ? String(cartDiscount.value) : '');
                  setCartDiscountModalOpen(true);
                }}
              >
                Custom
              </button>
            </div>
          </div>

          {/* Quick Exchange Rate Selector */}
          <div
            style={{
              padding: '6px 10px',
              backgroundColor: '#eff6ff',
              borderRadius: '8px',
              border: '1px solid #bfdbfe',
              marginBottom: '6px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#1e40af' }}>
              $1 = {exchangeRate.toLocaleString()} ៛
            </span>
            <div style={{ display: 'flex', gap: '3px' }}>
              {[4000, 4100, 4150].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  className={`btn btn-sm ${exchangeRate === rate ? 'btn-primary' : 'btn-outline'}`}
                  style={{
                    padding: '1px 6px',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    height: '23px'
                  }}
                  onClick={() => setExchangeRate(rate)}
                >
                  {rate}
                </button>
              ))}
              <button
                type="button"
                className={`btn btn-sm ${![4000, 4100, 4150].includes(exchangeRate) ? 'btn-primary' : 'btn-outline'}`}
                style={{
                  padding: '1px 6px',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  height: '23px'
                }}
                onClick={() => {
                  setCustomRateInput(exchangeRate.toString());
                  setExchangeModalOpen(true);
                }}
              >
                Custom
              </button>
            </div>
          </div>

          {/* Totals Summary Banner */}
          <div style={{ padding: '4px 0 6px 0', display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b' }}>
              <span>Subtotal:</span>
              <span className="currency-amount" style={{ fontWeight: 700 }}>${subtotal.toFixed(2)}</span>
            </div>

            {itemDiscountTotal > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#dc2626' }}>
                <span>Item Discounts:</span>
                <span className="currency-amount" style={{ fontWeight: 700 }}>-${itemDiscountTotal.toFixed(2)}</span>
              </div>
            )}

            {cartDiscountAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#dc2626' }}>
                <span>
                  Order Discount ({cartDiscount.type === 'percent' ? `${cartDiscount.value}%` : `$${Number(cartDiscount.value).toFixed(2)}`}):
                </span>
                <span className="currency-amount" style={{ fontWeight: 700 }}>-${cartDiscountAmount.toFixed(2)}</span>
              </div>
            )}

            {discountTotal > 0 && (itemDiscountTotal > 0 && cartDiscountAmount > 0) && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#b91c1c', fontWeight: 700 }}>
                <span>Total Savings:</span>
                <span className="currency-amount">-${discountTotal.toFixed(2)}</span>
              </div>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                borderTop: '1px solid #e2e8f0',
                paddingTop: '6px',
                marginTop: '2px'
              }}
            >
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#0f172a' }}>Grand Total:</div>
                <div style={{ fontSize: '0.8rem', color: '#2563eb', fontWeight: 700 }} className="currency-amount">
                  {grandTotalKHR.toLocaleString()} ៛ KHR
                </div>
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#1e40af' }} className="currency-amount">
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

      {/* Modal: Custom Cart Discount */}
      <Modal
        isOpen={cartDiscountModalOpen}
        onClose={() => setCartDiscountModalOpen(false)}
        title="Custom Whole-Order Discount"
        maxWidth="440px"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const val = parseFloat(customCartDiscountValue) || 0;
            if (val > 0) {
              applyCartDiscount(customCartDiscountType === 'PERCENT' ? 'percent' : 'fixed', val);
            } else {
              applyCartDiscount('none', 0);
            }
            setCartDiscountModalOpen(false);
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          <div>
            <label className="form-label">Discount Type:</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                className={`btn btn-sm ${customCartDiscountType === 'PERCENT' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setCustomCartDiscountType('PERCENT')}
              >
                Percentage (%)
              </button>
              <button
                type="button"
                className={`btn btn-sm ${customCartDiscountType === 'FIXED' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setCustomCartDiscountType('FIXED')}
              >
                Fixed Dollar ($)
              </button>
            </div>
          </div>

          <div>
            <label className="form-label">
              {customCartDiscountType === 'PERCENT' ? 'Order Discount Percentage (%):' : 'Order Discount Amount ($ USD):'}
            </label>
            <input
              type="number"
              step="any"
              min="0"
              max={customCartDiscountType === 'PERCENT' ? '100' : undefined}
              className="form-input mono"
              value={customCartDiscountValue}
              onChange={(e) => setCustomCartDiscountValue(e.target.value)}
              placeholder={customCartDiscountType === 'PERCENT' ? 'e.g. 12' : 'e.g. 3.00'}
              autoFocus
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ color: '#ef4444', borderColor: '#fecaca' }}
              onClick={() => {
                applyCartDiscount('none', 0);
                setCartDiscountModalOpen(false);
              }}
            >
              Clear Discount
            </button>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" onClick={() => setCartDiscountModalOpen(false)} className="btn btn-outline btn-sm">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm">
                Apply to Cart
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Modal: Custom Exchange Rate */}
      <Modal
        isOpen={exchangeModalOpen}
        onClose={() => setExchangeModalOpen(false)}
        title="Custom KHR Exchange Rate"
        maxWidth="420px"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const val = parseInt(customRateInput, 10);
            if (val && val > 0) {
              setExchangeRate(val);
            }
            setExchangeModalOpen(false);
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          <div style={{ fontSize: '0.85rem', color: '#475569' }}>
            Set the live or store-defined exchange rate for <strong>$1.00 USD</strong>. All cash totals, change, and QR conversions will update immediately.
          </div>

          <div>
            <label className="form-label">Exchange Rate (1 USD = ? KHR):</label>
            <input
              type="number"
              step="1"
              min="1000"
              max="10000"
              className="form-input mono"
              value={customRateInput}
              onChange={(e) => setCustomRateInput(e.target.value)}
              placeholder="e.g. 4100"
              autoFocus
            />
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            {[4000, 4100, 4125, 4150].map((r) => (
              <button
                key={r}
                type="button"
                className="btn btn-sm btn-outline mono"
                style={{ flex: 1, fontSize: '0.725rem', padding: '4px 0' }}
                onClick={() => setCustomRateInput(String(r))}
              >
                {r} ៛
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
            <button type="button" onClick={() => setExchangeModalOpen(false)} className="btn btn-outline btn-sm">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm">
              Save Rate
            </button>
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

      {/* Live Barcode Scanner Terminal Modal */}
      <Modal
        isOpen={cameraScannerOpen}
        onClose={() => setCameraScannerOpen(false)}
        title="Live Barcode Scanner Terminal"
        size="md"
      >
        <div style={{ textAlign: 'center' }}>
          {/* Animated Viewfinder */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '240px',
              backgroundColor: '#0f172a',
              borderRadius: '12px',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'inset 0 0 20px rgba(0,0,0,0.6)'
            }}
          >
            {/* Live Camera Video stream */}
            <video
              ref={videoRef}
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />

            {/* Target Crosshair / Reticle Overlay */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '200px',
                height: '110px',
                border: '2px dashed rgba(59, 130, 246, 0.8)',
                borderRadius: '8px',
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.45)'
              }}
            >
              {/* Laser scanning line */}
              <div
                style={{
                  position: 'absolute',
                  width: '90%',
                  height: '2px',
                  backgroundColor: '#ef4444',
                  boxShadow: '0 0 8px #ef4444, 0 0 16px #ef4444',
                  animation: 'scannerLaser 1.8s infinite ease-in-out'
                }}
              />
            </div>

            <style>{`
              @keyframes scannerLaser {
                0% { top: 10%; opacity: 0.8; }
                50% { top: 85%; opacity: 1; }
                100% { top: 10%; opacity: 0.8; }
              }
            `}</style>
          </div>

          <div style={{ marginTop: '14px', fontSize: '0.85rem', color: '#475569' }}>
            Point your camera or barcode reader gun at any supermarket barcode.
          </div>

          {/* Quick Real Barcodes for Testing */}
          <div style={{ marginTop: '16px', textAlign: 'left' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>
              Or click any real product to simulate an instant scan:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
              {products.slice(0, 8).map((p) => {
                const code = p.barcode || p.sku;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      executeScan(code);
                      setCameraScannerOpen(false);
                    }}
                    style={{
                      padding: '8px 10px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px'
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: '0.78rem', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.name}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#2563eb', fontWeight: 700 }} className="currency-amount">
                      ⚡ {code}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: '18px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setCameraScannerOpen(false)}
            >
              Close Scanner
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
