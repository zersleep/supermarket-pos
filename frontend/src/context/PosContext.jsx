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
  const [exchangeRate, setExchangeRate] = useState(4100);
  const [taxPercent, setTaxPercent] = useState(0);

  // Sync active cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('pos_active_cart', JSON.stringify(cart));
    } catch (e) {
      console.warn('Failed to save cart to localStorage', e);
    }
  }, [cart]);

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
    try {
      localStorage.removeItem('pos_active_cart');
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
      itemCount,
      subtotal,
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
    setParkedOrders((prev) => prev.filter((p) => p.id !== parkedId));
    return true;
  };

  // Delete a Parked Order
  const deleteParkedOrder = (parkedId) => {
    setParkedOrders((prev) => prev.filter((p) => p.id !== parkedId));
  };

  // Memoized Totals
  const { subtotal, discountTotal, taxTotal, grandTotal } = useMemo(() => {
    let sub = 0;
    let disc = 0;

    cart.forEach((item) => {
      sub += item.quantity * Number(item.product.sellingPrice);
      disc += Number(item.discount || 0);
    });

    const tax = sub * (taxPercent / 100);
    const grand = Math.max(0, sub - disc + tax);

    return {
      subtotal: Math.round(sub * 100) / 100,
      discountTotal: Math.round(disc * 100) / 100,
      taxTotal: Math.round(tax * 100) / 100,
      grandTotal: Math.round(grand * 100) / 100
    };
  }, [cart, taxPercent]);

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
        discountTotal,
        taxTotal,
        grandTotal,
        currency,
        setCurrency,
        exchangeRate,
        setExchangeRate,
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
