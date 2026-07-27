'use client';

/**
 * Cart state, persisted to localStorage.
 *
 * The cart stores a price only so the UI can render a subtotal without a round
 * trip. It is never authoritative — every price shown at checkout and every
 * amount charged is recomputed server-side by shop_quote / priceCart. If a
 * price changes while an item sits in someone's cart, the server wins.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { CartItem } from '@cch/shared';

const STORAGE_KEY = 'cch_cart_v1';

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  subtotalCents: number;
  /** False until localStorage has been read, to avoid hydration mismatch. */
  ready: boolean;
  add: (item: CartItem) => void;
  setQty: (variantId: string, qty: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  // Load once on mount. Rendering the persisted cart during SSR would produce
  // a hydration mismatch, so the badge stays empty until this runs.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setItems(parsed);
      }
    } catch {
      // Corrupt cart is not worth crashing the store over.
      localStorage.removeItem(STORAGE_KEY);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Quota or private mode — the cart just will not persist.
    }
  }, [items, ready]);

  const add = useCallback((item: CartItem) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.variantId === item.variantId);
      if (existing) {
        return prev.map((i) =>
          i.variantId === item.variantId ? { ...i, qty: i.qty + item.qty } : i
        );
      }
      return [...prev, item];
    });
  }, []);

  const setQty = useCallback((variantId: string, qty: number) => {
    setItems((prev) =>
      qty <= 0
        ? prev.filter((i) => i.variantId !== variantId)
        : prev.map((i) => (i.variantId === variantId ? { ...i, qty } : i))
    );
  }, []);

  const remove = useCallback((variantId: string) => {
    setItems((prev) => prev.filter((i) => i.variantId !== variantId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      itemCount: items.reduce((n, i) => n + i.qty, 0),
      subtotalCents: items.reduce((n, i) => n + i.unitPriceCents * i.qty, 0),
      ready,
      add,
      setQty,
      remove,
      clear,
    }),
    [items, ready, add, setQty, remove, clear]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
