import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import api from '../api/client';

const PosContext = createContext(null);

export function PosProvider({ children }) {
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('pos_active_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [parkedOrders, setParkedOrders] = useState(() => {
    try {
      const saved = localStorage.getItem('pos_parked_orders');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Primary Currency of the store (USD or KHR)
  const [primaryCurrency, setPrimaryCurrency] = useState(() => {
    try {
      return localStorage.getItem('pos_primary_currency') || 'USD';
    } catch {
      return 'USD';
    }
  });

  // Active payment currency chosen for the current transaction
  const [currency, setCurrency] = useState(() => {
    try {
      return localStorage.getItem('pos_primary_currency') || 'USD';
    } catch {
      return 'USD';
    }
  });

  const [exchangeRate, setExchangeRate] = useState(() => {
    try {
      const saved = localStorage.getItem('pos_exchange_rate');
      return saved ? Number(saved) : 4100;
    } catch {
      return 4100;
    }
  });

  const [taxPercent, setTaxPercent] = useState(0);

  // Whole cart order-level discount: { type: 'none' | 'percent' | 'fixed', value: number }
  const [cartDiscount, setCartDiscount] = useState(() => {
    try {
      const saved = localStorage.getItem('pos_active_cart_discount');
      return saved ? JSON.parse(saved) : { type: 'none', value: 0 };
    } catch {
      return { type: 'none', value: 0 };
    }
  });

  // Load store settings (CURRENCY_CODE, EXCHANGE_RATE_KHR, TAX_PERCENT) into POS Context
  const loadStoreSettings = useCallback(async () => {
    try {
      const token = localStorage.getItem('pos_token');
      if (!token) return;
      const res = await api.get('/settings');
      if (res.data?.map) {
        const map = res.data.map;
        if (map.CURRENCY_CODE) {
          setPrimaryCurrency(map.CURRENCY_CODE);
          setCurrency(map.CURRENCY_CODE);
          try {
            localStorage.setItem('pos_primary_currency', map.CURRENCY_CODE);
          } catch {}
        }
        if (map.EXCHANGE_RATE_KHR) {
          const rate = Number(map.EXCHANGE_RATE_KHR);
          if (!isNaN(rate) && rate > 0) {
            setExchangeRate(rate);
            try {
              localStorage.setItem('pos_exchange_rate', rate.toString());
            } catch {}
          }
        }
        if (map.TAX_PERCENT) {
          const tax = Number(map.TAX_PERCENT);
          if (!isNaN(tax)) {
            setTaxPercent(tax);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to load store settings into POS context:', err.message);
    }
  }, []);

  useEffect(() => {
    loadStoreSettings();
    const handleSettingsUpdated = () => {
      loadStoreSettings();
    };
    window.addEventListener('pos_settings_updated', handleSettingsUpdated);
    window.addEventListener('storage', handleSettingsUpdated);
    return () => {
      window.removeEventListener('pos_settings_updated', handleSettingsUpdated);
      window.removeEventListener('storage', handleSettingsUpdated);
    };
  }, [loadStoreSettings]);

  const updatePrimaryCurrency = async (newCurrency) => {
    if (newCurrency !== 'USD' && newCurrency !== 'KHR') return;
    setPrimaryCurrency(newCurrency);
    setCurrency(newCurrency);
    try {
      localStorage.setItem('pos_primary_currency', newCurrency);
    } catch {}

    // Persist to backend settings if user has permission
    try {
      await api.put('/settings', { settings: { CURRENCY_CODE: newCurrency } });
    } catch (err) {
      // Non-owner or offline mode will keep local setting intact
    }
    window.dispatchEvent(new Event('pos_settings_updated'));
  };

  const togglePrimaryCurrency = () => {
    const next = primaryCurrency === 'USD' ? 'KHR' : 'USD';
    updatePrimaryCurrency(next);
  };

  /**
   * Helper: Format any USD amount according to active primary currency or explicit target
   */
  const formatAmount = useCallback(
    (amountUSD, targetCurrency = null) => {
      const curr = targetCurrency || primaryCurrency;
      const num = Number(amountUSD) || 0;
      if (curr === 'KHR') {
        const khr = Math.round(num * exchangeRate);
        return `${khr.toLocaleString()} ៛`;
      }
      return `$${num.toFixed(2)}`;
    },
    [primaryCurrency, exchangeRate]
  );

  /**
   * Helper: Return dual prices { primary, secondary, isKhr }
   */
  const formatDualPrice = useCallback(
    (amountUSD) => {
      const num = Number(amountUSD) || 0;
      const usdStr = `$${num.toFixed(2)}`;
      const khrStr = `${Math.round(num * exchangeRate).toLocaleString()} ៛`;
      if (primaryCurrency === 'KHR') {
        return { primary: khrStr, secondary: `${usdStr} USD`, isKhr: true };
      }
      return { primary: usdStr, secondary: `${khrStr} KHR`, isKhr: false };
    },
    [primaryCurrency, exchangeRate]
  );

  // Sync active cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('pos_active_cart', JSON.stringify(cart));
    } catch (e) {
      console.warn('Failed to save cart to localStorage', e);
    }
  }, [cart]);

  // Sync cart discount to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('pos_active_cart_discount', JSON.stringify(cartDiscount));
    } catch (e) {
      console.warn('Failed to save cart discount to localStorage', e);
    }
  }, [cartDiscount]);

  // Sync exchange rate to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('pos_exchange_rate', exchangeRate.toString());
    } catch (e) {}
  }, [exchangeRate]);

  // Apply or reset whole-order cart discount
  const applyCartDiscount = (type, value) => {
    if (type === 'none' || !value || Number(value) <= 0) {
      setCartDiscount({ type: 'none', value: 0 });
    } else {
      setCartDiscount({ type, value: Number(value) });
    }
  };

  // Sync parked orders to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('pos_parked_orders', JSON.stringify(parkedOrders));
    } catch (e) {
      console.warn('Failed to save parked orders', e);
    }
  }, [parkedOrders]);

  // Add product to cart or increment quantity if already present
  const addToCart = (product, quantity = 1) => {
    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex((item) => item.product.id === product.id);
      if (existingIndex > -1) {
        const updated = [...prevCart];
        const newQty = updated[existingIndex].quantity + quantity;
        const rawTotal = newQty * Number(product.sellingPrice);
        let discount = updated[existingIndex].discount || 0;
        if (updated[existingIndex].discountPercent > 0) {
          discount = Math.round(((rawTotal * updated[existingIndex].discountPercent) / 100) * 100) / 100;
        } else {
          discount = Math.min(rawTotal, discount);
        }
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
          discount,
          lineTotal: Math.max(0, Math.round((rawTotal - discount) * 100) / 100)
        };
        return updated;
      } else {
        const lineTotal = Math.max(0, quantity * Number(product.sellingPrice));
        return [
          ...prevCart,
          {
            product,
            quantity,
            discount: 0,
            lineTotal
          }
        ];
      }
    });
  };

  // Update quantity via step or direct input with proportional discount adjustment
  const updateQuantity = (productId, newQuantity) => {
    const qty = Math.max(0, parseInt(newQuantity, 10) || 0);
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.product.id === productId) {
          const rawTotal = qty * Number(item.product.sellingPrice);
          let disc = item.discount || 0;
          if (item.discountPercent > 0) {
            disc = Math.round(((rawTotal * item.discountPercent) / 100) * 100) / 100;
          } else {
            disc = Math.min(rawTotal, disc);
          }
          const lineTotal = Math.max(0, Math.round((rawTotal - disc) * 100) / 100);
          return { ...item, quantity: qty, discount: disc, lineTotal };
        }
        return item;
      })
    );
  };

  // Update item discount (either fixed USD or percentage)
  const updateDiscount = (productId, discountAmount, discountPercent = null) => {
    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.product.id === productId) {
          const rawTotal = item.quantity * Number(item.product.sellingPrice);
          let disc = 0;
          let pct = discountPercent;
          if (pct !== null && pct !== undefined && pct > 0) {
            disc = (rawTotal * Number(pct)) / 100;
          } else {
            disc = Math.max(0, Number(discountAmount) || 0);
            pct = rawTotal > 0 ? Math.round((disc / rawTotal) * 100) : 0;
          }
          const validDiscount = Math.min(rawTotal, disc);
          return {
            ...item,
            discount: Math.round(validDiscount * 100) / 100,
            discountPercent: validDiscount > 0 ? pct : 0,
            lineTotal: Math.max(0, Math.round((rawTotal - validDiscount) * 100) / 100)
          };
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId) => {
    setCart((prevCart) => prevCart.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setCartDiscount({ type: 'none', value: 0 });
    try {
      localStorage.removeItem('pos_active_cart');
      localStorage.removeItem('pos_active_cart_discount');
    } catch {}
  };

  // Hold / Park Cart Order
  const parkCart = (customNote = '') => {
    if (cart.length === 0) return null;

    const itemCount = cart.reduce((sum, i) => sum + i.quantity, 0);
    const orderNote = customNote.trim() || `Customer Hold #${parkedOrders.length + 1} (${itemCount} items)`;

    const newParkedOrder = {
      id: `park-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      note: orderNote,
      createdAt: new Date().toISOString(),
      cart: [...cart],
      cartDiscount: { ...cartDiscount },
      itemCount,
      subtotal,
      itemDiscountTotal,
      cartDiscountAmount,
      discountTotal,
      grandTotal,
      currency
    };

    setParkedOrders((prev) => [newParkedOrder, ...prev]);
    clearCart();
    return newParkedOrder;
  };

  // Resume Parked Order into Active Cart
  const resumeParkedOrder = (parkedId) => {
    const order = parkedOrders.find((p) => p.id === parkedId);
    if (!order) return false;

    setCart(order.cart);
    if (order.cartDiscount) {
      setCartDiscount(order.cartDiscount);
    } else {
      setCartDiscount({ type: 'none', value: 0 });
    }
    setParkedOrders((prev) => prev.filter((p) => p.id !== parkedId));
    return true;
  };

  // Delete a Parked Order
  const deleteParkedOrder = (parkedId) => {
    setParkedOrders((prev) => prev.filter((p) => p.id !== parkedId));
  };

  // Memoized Totals with Both Item-Level & Whole-Cart Discounts
  const { subtotal, itemDiscountTotal, cartDiscountAmount, discountTotal, taxTotal, grandTotal } = useMemo(() => {
    let sub = 0;
    let itemDisc = 0;

    cart.forEach((item) => {
      sub += item.quantity * Number(item.product.sellingPrice);
      itemDisc += Number(item.discount || 0);
    });

    // Whole-cart discount calculation
    let cDisc = 0;
    const remainingAfterItemDiscounts = Math.max(0, sub - itemDisc);
    if (cartDiscount.type === 'percent') {
      cDisc = (remainingAfterItemDiscounts * (Number(cartDiscount.value) || 0)) / 100;
    } else if (cartDiscount.type === 'fixed') {
      cDisc = Math.min(remainingAfterItemDiscounts, Number(cartDiscount.value) || 0);
    }
    cDisc = Math.round(cDisc * 100) / 100;

    const totalDisc = Math.round((itemDisc + cDisc) * 100) / 100;
    const tax = Math.round((Math.max(0, sub - totalDisc) * (taxPercent / 100)) * 100) / 100;
    const grand = Math.max(0, Math.round((sub - totalDisc + tax) * 100) / 100);

    return {
      subtotal: Math.round(sub * 100) / 100,
      itemDiscountTotal: Math.round(itemDisc * 100) / 100,
      cartDiscountAmount: cDisc,
      discountTotal: totalDisc,
      taxTotal: tax,
      grandTotal: grand
    };
  }, [cart, taxPercent, cartDiscount]);

  return (
    <PosContext.Provider
      value={{
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
        primaryCurrency,
        setPrimaryCurrency: updatePrimaryCurrency,
        togglePrimaryCurrency,
        formatAmount,
        formatDualPrice,
        currency,
        setCurrency,
        exchangeRate,
        setExchangeRate,
        cartDiscount,
        setCartDiscount,
        applyCartDiscount,
        taxPercent,
        setTaxPercent,
        parkedOrders,
        parkCart,
        resumeParkedOrder,
        deleteParkedOrder,
        loadStoreSettings
      }}
    >
      {children}
    </PosContext.Provider>
  );
}

export function usePos() {
  return useContext(PosContext);
}
