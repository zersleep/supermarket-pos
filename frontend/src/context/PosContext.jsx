import React, { createContext, useContext, useState, useMemo } from 'react';

const PosContext = createContext(null);

export function PosProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [currency, setCurrency] = useState('USD');
  const [exchangeRate, setExchangeRate] = useState(4100);
  const [taxPercent, setTaxPercent] = useState(0);

  // Add product to cart or increment quantity if already present
  const addToCart = (product, quantity = 1) => {
    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex((item) => item.product.id === product.id);
      if (existingIndex > -1) {
        const updated = [...prevCart];
        const newQty = updated[existingIndex].quantity + quantity;
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
          lineTotal: Math.max(0, newQty * Number(product.sellingPrice) - updated[existingIndex].discount)
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

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.product.id === productId) {
          const lineTotal = Math.max(
            0,
            newQuantity * Number(item.product.sellingPrice) - item.discount
          );
          return { ...item, quantity: newQuantity, lineTotal };
        }
        return item;
      })
    );
  };

  const updateDiscount = (productId, discountAmount) => {
    const disc = Math.max(0, Number(discountAmount) || 0);
    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.product.id === productId) {
          const rawTotal = item.quantity * Number(item.product.sellingPrice);
          return {
            ...item,
            discount: disc,
            lineTotal: Math.max(0, rawTotal - disc)
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
        setTaxPercent
      }}
    >
      {children}
    </PosContext.Provider>
  );
}

export function usePos() {
  return useContext(PosContext);
}
