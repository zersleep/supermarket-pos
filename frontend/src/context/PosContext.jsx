import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';

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

  const [currency, setCurrency] = useState('USD');
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
        const discount = updated[existingIndex].discount || 0;
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
          lineTotal: Math.max(0, newQty * Number(product.sellingPrice) - discount)
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

  // Update quantity via step or direct input
  const updateQuantity = (productId, newQuantity) => {
    const qty = Math.max(0, parseInt(newQuantity, 10) || 0);
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.product.id === productId) {
          const discount = item.discount || 0;
          const lineTotal = Math.max(0, qty * Number(item.product.sellingPrice) - discount);
          return { ...item, quantity: qty, lineTotal };
        }
        return item;
      })
    );
  };

  // Update item discount (either fixed USD or percentage)
  const updateDiscount = (productId, discountAmount) => {
    const disc = Math.max(0, Number(discountAmount) || 0);
    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.product.id === productId) {
          const rawTotal = item.quantity * Number(item.product.sellingPrice);
          const validDiscount = Math.min(rawTotal, disc);
          return {
            ...item,
            discount: Math.round(validDiscount * 100) / 100,
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
        deleteParkedOrder
      }}
    >
      {children}
    </PosContext.Provider>
  );
}

export function usePos() {
  return useContext(PosContext);
}
