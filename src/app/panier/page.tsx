"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Lock,
  ShoppingCart,
  Trash2,
  CreditCard,
  Sparkles,
} from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { formatFcfa } from "@/components/catalog/ProductCard";

interface PaymentGatewayOption {
  code: string;
  name: string;
  description: string;
  isDefault: boolean;
  supportedOperators: string[];
  feePercent: number;
}

export default function PanierPage() {
  const { locale, t, cart, removeFromCart, clearCart, subtotalFcfa, user, showToast } = useApp();
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountFcfa: number;
    label: string;
  } | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [routingMode, setRoutingMode] = useState<"MODE_A" | "MODE_C">("MODE_A");
  const [gateways, setGateways] = useState<PaymentGatewayOption[]>([]);
  const [gatewayCode, setGatewayCode] = useState("");
  const [operator, setOperator] = useState("MTN");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();

  const hasDemoItems = cart.some((item) => item.isDemo);

  useEffect(() => {
    fetch("/api/payments/options", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.routingMode) setRoutingMode(d.routingMode);
        const list: PaymentGatewayOption[] = d.gateways || [];
        setGateways(list);
        const def = list.find((g) => g.isDefault) || list[0];
        if (def) {
          setGatewayCode(def.code);
          if (def.supportedOperators?.length) {
            setOperator(def.supportedOperators[0]);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoadingOptions(false));
  }, []);

  const selectedGateway =
    gateways.find((g) => g.code === gatewayCode) ||
    gateways.find((g) => g.isDefault) ||
    gateways[0] ||
    null;

  const availableOperators =
    routingMode === "MODE_C"
      ? Array.from(new Set(gateways.flatMap((g) => g.supportedOperators)))
      : selectedGateway?.supportedOperators || ["MTN", "MOOV", "CELTIIS", "CARD"];

  const handleApplyCoupon = async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) {
      showToast("Veuillez saisir un code promo.", "warning");
      return;
    }
    setValidatingCoupon(true);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          subtotalFcfa,
          items: cart.map((c) => ({
            id: c.id,
            priceFcfa: c.isFree ? 0 : c.promoPriceFcfa ?? c.priceFcfa,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAppliedCoupon(null);
        showToast(data.error || "Code promo invalide.", "error");
        return;
      }
      setAppliedCoupon({
        code: data.code,
        discountFcfa: data.discountFcfa,
        label: data.label,
      });
      showToast(`Code promo ${data.code} appliqué (${data.label}) !`, "success");
    } catch {
      showToast("Impossible de vérifier le code promo.", "error");
    } finally {
      setValidatingCoupon(false);
    }
  };

  const finalTotalFcfa = Math.max(0, subtotalFcfa - (appliedCoupon?.discountFcfa || 0));

  const handleCheckout = async () => {
    setErrorMsg(null);
    if (!user) {
      showToast("Veuillez vous connecter pour finaliser votre commande.");
      router.push("/connexion?redirect=/panier");
      return;
    }

    if (hasDemoItems) {
      setErrorMsg(
        "Votre panier contient des produits de démonstration non commerciaux. Conformément au cahier des charges, aucun paiement réel ne peut être déclenché pour des produits de démonstration."
      );
      return;
    }

    if (subtotalFcfa > 0 && gateways.length === 0) {
      setErrorMsg("Aucun agrégateur de paiement actif pour le moment.");
      return;
    }

    setLoading(true);
    try {
      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productIds: cart.map((c) => c.id),
          couponCode: couponCode.trim() || undefined,
          customerPhone: phone.trim() || undefined,
        }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        setErrorMsg(orderData.error || "Erreur lors de la création de commande.");
        setLoading(false);
        return;
      }

      if (orderData.order.totalFcfa === 0) {
        clearCart();
        showToast("Commande gratuite validée !");
        router.push(`/commande/${orderData.order.reference}`);
        return;
      }

      const payRes = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: orderData.order.id,
          operator,
        }),
      });
      const payData = await payRes.json();
      if (!payRes.ok) {
        setErrorMsg(payData.error || "Erreur d'initialisation du paiement.");
        setLoading(false);
        return;
      }

      if (payData.redirectUrl) {
        clearCart();
        window.location.href = payData.redirectUrl;
      } else {
        clearCart();
        router.push(`/commande/${orderData.order.reference}`);
      }
    } catch {
      setErrorMsg("Erreur réseau lors de la validation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <h1 className="font-serif text-3xl sm:text-4xl font-bold text-navy-950">
        {t.cart.title}
      </h1>

      {cart.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md shadow-slate-900/5 p-12 text-center space-y-4">
          <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto" />
          <p className="text-lg font-semibold text-navy-950">{t.cart.empty}</p>
          <Link
            href="/catalogue"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gold-500 text-navy-950 font-bold text-sm hover:bg-gold-600 transition"
          >
            <span>Découvrir le catalogue</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-8 space-y-4">
            {hasDemoItems && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs sm:text-sm flex items-start gap-3 shadow-sm">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Produits de démonstration détectés</p>
                  <p className="mt-0.5">
                    Les produits de démonstration affichent un prix fictif et ne déclenchent jamais de paiement réel. Vous pouvez télécharger gratuitement leurs extraits PDF depuis chaque fiche.
                  </p>
                </div>
              </div>
            )}

            {cart.map((item) => {
              const effective = item.isFree ? 0 : item.promoPriceFcfa ?? item.priceFcfa;
              return (
                <div
                  key={item.id}
                  className="bg-white p-4 rounded-2xl border border-slate-200 shadow-md shadow-slate-900/5 flex items-center gap-4"
                >
                  <img
                    src={item.coverUrl}
                    alt={item.titleFr}
                    className="w-16 h-22 object-cover rounded-lg border border-slate-200 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/produit/${item.slug}`}
                      className="font-serif font-bold text-navy-950 hover:text-gold-600 block truncate"
                    >
                      {locale === "en" ? item.titleEn : item.titleFr}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {item.authorName} • {item.primaryFormat}
                    </p>
                    {item.isDemo && (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                        DÉMO — NON COMMERCIAL
                      </span>
                    )}
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    <p className="font-extrabold text-navy-950">
                      {item.isFree ? "Gratuit" : formatFcfa(effective)}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.id)}
                      className="inline-flex items-center gap-1 text-xs text-rose-600 hover:underline cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Retirer
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary & Dynamic Payment Gateway Selector */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md shadow-slate-900/5 space-y-5">
              <h2 className="font-serif text-xl font-bold text-navy-950">Récapitulatif</h2>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder={t.cart.couponPlaceholder}
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm uppercase"
                />
                <button
                  type="button"
                  disabled={validatingCoupon}
                  onClick={handleApplyCoupon}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-navy-950 text-xs font-bold hover:bg-slate-200 cursor-pointer disabled:opacity-50"
                >
                  {validatingCoupon ? "..." : t.cart.applyCoupon}
                </button>
              </div>

              <div className="space-y-2 text-sm border-t border-slate-100 pt-4">
                <div className="flex justify-between text-slate-600">
                  <span>{t.cart.subtotal}</span>
                  <span className="font-semibold">{formatFcfa(subtotalFcfa)}</span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>
                      Remise {appliedCoupon.code} ({appliedCoupon.label})
                    </span>
                    <span>-{formatFcfa(appliedCoupon.discountFcfa)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>{t.cart.shipping}</span>
                  <span className="font-semibold text-emerald-600">{t.cart.shippingFree}</span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-navy-950 pt-2 border-t border-slate-100">
                  <span>{t.cart.total}</span>
                  <span>{formatFcfa(finalTotalFcfa)}</span>
                </div>
              </div>

              {/* Dynamic Payment Gateway & Operator Section */}
              {subtotalFcfa > 0 && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <label className="block text-xs font-bold text-navy-950 uppercase tracking-wider">
                    <CreditCard className="w-3.5 h-3.5 inline mr-1 text-gold-600" />
                    Paiement sécurisé
                  </label>

                  {loadingOptions ? (
                    <p className="text-xs text-slate-400">
                      {locale === "en" ? "Loading payment options..." : "Chargement des moyens de paiement..."}
                    </p>
                  ) : gateways.length === 0 ? (
                    <p className="text-xs text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200">
                      {locale === "en"
                        ? "No active payment gateway configured."
                        : "Aucun agrégateur actif configuré dans l'administration."}
                    </p>
                  ) : (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <p className="font-bold text-navy-950">
                        {locale === "en" ? "Mobile Money & Bank Cards" : "Mobile Money & Cartes bancaires"}
                      </p>
                      <p className="text-slate-500 mt-0.5">
                        {locale === "en"
                          ? "Encrypted payment processed securely."
                          : "Paiement chiffré traité en toute sécurité."}
                      </p>
                    </div>
                  )}

                  {gateways.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={operator}
                        onChange={(e) => setOperator(e.target.value)}
                        aria-label="Opérateur"
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs bg-slate-50"
                      >
                        {availableOperators.map((op) => (
                          <option key={op} value={op}>
                            {op}
                          </option>
                        ))}
                      </select>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+229..."
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
                      />
                    </div>
                  )}
                </div>
              )}

              {errorMsg && (
                <div
                  role="alert"
                  className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium"
                >
                  {errorMsg}
                </div>
              )}

              <button
                type="button"
                disabled={loading}
                onClick={handleCheckout}
                className="w-full py-3.5 rounded-xl bg-gold-500 text-navy-950 font-extrabold text-sm hover:bg-gold-600 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>{loading ? "Traitement..." : t.cart.checkout}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
