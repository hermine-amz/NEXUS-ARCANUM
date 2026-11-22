"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Locale, getDictionary } from "@/lib/i18n/dictionaries";

export interface CartItemClient {
  id: string;
  slug: string;
  titleFr: string;
  titleEn: string;
  coverUrl: string;
  primaryFormat: string;
  priceFcfa: number;
  promoPriceFcfa: number | null;
  isFree: boolean;
  isDemo: boolean;
  authorName: string;
}

export interface AuthUserClient {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

interface AppContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: ReturnType<typeof getDictionary>;
  cart: CartItemClient[];
  addToCart: (item: CartItemClient) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  subtotalFcfa: number;
  user: AuthUserClient | null;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
  toast: string | null;
  showToast: (msg: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const CART_STORAGE_KEY = "nxa_cart_v1";
const LOCALE_STORAGE_KEY = "nxa_locale_v1";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fr");
  const [cart, setCart] = useState<CartItemClient[]>([]);
  const [user, setUser] = useState<AuthUserClient | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user ?? null);
      }
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    try {
      const savedLocale = localStorage.getItem(LOCALE_STORAGE_KEY);
      if (savedLocale === "en" || savedLocale === "fr") {
        setLocaleState(savedLocale);
      }
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) {
        setCart(JSON.parse(savedCart));
      }
    } catch {
      // Ignore storage errors
    }
    refreshUser();
  }, [refreshUser]);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, l);
    } catch {
      // Ignore
    }
  };

  const persistCart = (next: CartItemClient[]) => {
    setCart(next);
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore
    }
  };

  const addToCart = (item: CartItemClient) => {
    if (cart.some((c) => c.id === item.id || c.slug === item.slug)) {
      showToast(
        locale === "fr"
          ? "Cet ouvrage numérique est déjà dans votre panier."
          : "This digital product is already in your cart."
      );
      return;
    }
    const next = [...cart, item];
    persistCart(next);
    showToast(
      locale === "fr"
        ? `« ${item.titleFr} » ajouté au panier.`
        : `"${item.titleEn}" added to cart.`
    );
  };

  const removeFromCart = (id: string) => {
    persistCart(cart.filter((c) => c.id !== id));
  };

  const clearCart = () => {
    persistCart([]);
  };

  const logout = async () => {
    await fetch("/api/auth/me", { method: "DELETE" });
    setUser(null);
    showToast(locale === "fr" ? "Déconnexion effectuée." : "Signed out.");
  };

  const subtotalFcfa = cart.reduce((sum, item) => {
    if (item.isFree) return sum;
    return sum + (item.promoPriceFcfa ?? item.priceFcfa);
  }, 0);

  return (
    <AppContext.Provider
      value={{
        locale,
        setLocale,
        t: getDictionary(locale),
        cart,
        addToCart,
        removeFromCart,
        clearCart,
        subtotalFcfa,
        user,
        refreshUser,
        logout,
        toast,
        showToast,
      }}
    >
      {children}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 md:bottom-6 right-4 z-50 rounded-xl bg-navy-950 text-white border border-gold-500/60 px-4 py-3 shadow-2xl text-sm font-medium flex items-center gap-2"
        >
          <span className="h-2 w-2 rounded-full bg-gold-500" />
          <span>{toast}</span>
        </div>
      )}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

