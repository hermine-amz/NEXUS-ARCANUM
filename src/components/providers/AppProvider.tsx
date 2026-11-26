"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
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

export type ToastVariant = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "primary";
}

export interface SiteBranding {
  siteName: string;
  siteTagline: string;
  siteLogoUrl: string;
}

interface AppContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: ReturnType<typeof getDictionary>;
  branding: SiteBranding;
  refreshBranding: () => Promise<void>;
  cart: CartItemClient[];
  addToCart: (item: CartItemClient) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  subtotalFcfa: number;
  user: AuthUserClient | null;
  authLoaded: boolean;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
  toast: string | null;
  showToast: (msg: string, variant?: ToastVariant) => void;
  confirmAction: (opts: ConfirmOptions) => Promise<boolean>;
}

const AppContext = createContext<AppContextValue | null>(null);

const CART_STORAGE_KEY = "nxa_cart_v1";
const LOCALE_STORAGE_KEY = "nxa_locale_v1";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fr");
  const [branding, setBranding] = useState<SiteBranding>({
    siteName: "NEXUSARCANUM",
    siteTagline: "SHOP • LIBRAIRIE NUMÉRIQUE",
    siteLogoUrl: "",
  });
  const [cart, setCart] = useState<CartItemClient[]>([]);
  const [user, setUser] = useState<AuthUserClient | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmOptions | null>(null);
  const confirmResolverRef = useRef<((value: boolean) => void) | null>(null);

  const showToast = useCallback((msg: string, variant?: ToastVariant) => {
    const inferred: ToastVariant =
      variant ||
      (/erreur|échec|impossible|refusé|invalide|expiré|manquant/i.test(msg)
        ? "error"
        : /attention|déjà|bloqué|démonstration/i.test(msg)
        ? "warning"
        : "success");

    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-3), { id, message: msg, variant: inferred }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 4200);
  }, []);

  const confirmAction = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      confirmResolverRef.current = resolve;
      setConfirmState(opts);
    });
  }, []);

  const handleConfirmChoice = (accepted: boolean) => {
    setConfirmState(null);
    if (confirmResolverRef.current) {
      confirmResolverRef.current(accepted);
      confirmResolverRef.current = null;
    }
  };

  const refreshBranding = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/branding", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setBranding({
          siteName: data.siteName || "NEXUSARCANUM",
          siteTagline: data.siteTagline || "SHOP • LIBRAIRIE NUMÉRIQUE",
          siteLogoUrl: data.siteLogoUrl || "",
        });
      }
    } catch {
      // ignore
    }
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
    } finally {
      setAuthLoaded(true);
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
      // ignore
    }
    refreshUser();
    refreshBranding();
  }, [refreshUser, refreshBranding]);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, l);
    } catch {
      // ignore
    }
  };

  const persistCart = (next: CartItemClient[]) => {
    setCart(next);
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const addToCart = (item: CartItemClient) => {
    if (cart.some((c) => c.id === item.id || c.slug === item.slug)) {
      showToast(
        locale === "fr"
          ? "Cet ouvrage numérique est déjà dans votre panier."
          : "This digital product is already in your cart.",
        "info"
      );
      return;
    }
    const next = [...cart, item];
    persistCart(next);
    showToast(
      locale === "fr"
        ? `« ${item.titleFr} » ajouté au panier.`
        : `"${item.titleEn}" added to cart.`,
      "success"
    );
  };

  const removeFromCart = (id: string) => {
    persistCart(cart.filter((c) => c.id !== id));
    showToast(locale === "fr" ? "Ouvrage retiré du panier." : "Removed from cart.", "info");
  };

  const clearCart = () => {
    persistCart([]);
  };

  const logout = async () => {
    await fetch("/api/auth/me", { method: "DELETE" });
    setUser(null);
    showToast(locale === "fr" ? "Session verrouillée avec succès." : "Signed out.", "info");
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
        branding,
        refreshBranding,
        cart,
        addToCart,
        removeFromCart,
        clearCart,
        subtotalFcfa,
        user,
        authLoaded,
        refreshUser,
        logout,
        toast: toasts[toasts.length - 1]?.message ?? null,
        showToast,
        confirmAction,
      }}
    >
      {children}

      {/* Stack de Notifications Glassmorphism (Succès / Erreur / Alerte / Info) */}
      {toasts.length > 0 && (
        <div
          aria-live="polite"
          className="fixed bottom-20 md:bottom-6 right-4 z-[60] flex flex-col gap-2.5 max-w-sm w-[calc(100vw-2rem)]"
        >
          {toasts.map((item) => {
            const styles =
              item.variant === "success"
                ? "bg-emerald-950/90 border-emerald-400/50 text-emerald-50"
                : item.variant === "error"
                ? "bg-rose-950/92 border-rose-400/50 text-rose-50"
                : item.variant === "warning"
                ? "bg-amber-950/92 border-amber-400/50 text-amber-50"
                : "bg-navy-950/92 border-gold-500/50 text-white";

            const Icon =
              item.variant === "success"
                ? CheckCircle2
                : item.variant === "error"
                ? XCircle
                : item.variant === "warning"
                ? AlertTriangle
                : Info;

            const iconColor =
              item.variant === "success"
                ? "text-emerald-400"
                : item.variant === "error"
                ? "text-rose-400"
                : item.variant === "warning"
                ? "text-amber-400"
                : "text-gold-500";

            return (
              <div
                key={item.id}
                role="status"
                className={`backdrop-blur-xl border rounded-2xl px-4 py-3.5 shadow-2xl flex items-start gap-3 text-xs sm:text-sm font-medium ${styles}`}
              >
                <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} />
                <span className="flex-1 leading-snug">{item.message}</span>
                <button
                  type="button"
                  onClick={() => setToasts((prev) => prev.filter((t) => t.id !== item.id))}
                  className="opacity-70 hover:opacity-100 cursor-pointer shrink-0"
                  aria-label="Fermer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Modale de Confirmation / Suppression Glassmorphism */}
      {confirmState && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-navy-950/45 backdrop-blur-md"
        >
          <div className="w-full max-w-md rounded-3xl bg-white/88 backdrop-blur-2xl border border-white/70 shadow-2xl shadow-navy-950/25 p-6 space-y-5">
            <div className="flex items-start gap-3.5">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                  confirmState.variant === "danger"
                    ? "bg-rose-100 text-rose-600"
                    : confirmState.variant === "warning"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-[#FEFCE8] text-navy-950 border border-amber-200"
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base text-slate-900">{confirmState.title}</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {confirmState.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => handleConfirmChoice(false)}
                className="px-4 py-2.5 rounded-xl bg-white/80 border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                {confirmState.cancelLabel || "Annuler"}
              </button>
              <button
                type="button"
                onClick={() => handleConfirmChoice(true)}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-md cursor-pointer ${
                  confirmState.variant === "danger"
                    ? "bg-rose-600 text-white hover:bg-rose-700"
                    : confirmState.variant === "warning"
                    ? "bg-amber-500 text-navy-950 hover:bg-amber-600"
                    : "bg-navy-950 text-gold-500 hover:bg-navy-900"
                }`}
              >
                {confirmState.confirmLabel || "Confirmer"}
              </button>
            </div>
          </div>
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
