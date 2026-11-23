"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Lock,
  ShoppingCart,
  Trash2,
  CreditCard,
} from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { formatFcfa } from "@/components/catalog/ProductCard";

export default function PanierPage() {
  const { locale, t, cart, removeFromCart, clearCart, subtotalFcfa, user, showToast } = useApp();
  const [couponCode, setCouponCode] = useState("");
  const [gatewayCode, setGatewayCode] = useState("maketou");
  const [operator, setOperator] = useState("MTN");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();

  const hasDemoItems = cart.some((item) => item.isDemo);

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
        showToast("Commande gratuite validée ! Accès ajouté à votre bibliothèque.");
        router.push("/compte/bibliotheque");
        return;
      }

      const payRes = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: orderData.order.id,
          gatewayCode,
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
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
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
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs sm:text-sm flex items-start gap-3">
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
                  className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"
                >
                  <img
                    src={item.coverUrl}
                    alt={item.titleFr}
                    className="w-20 h-28 sm:w-16 sm:h-22 object-cover rounded-lg border border-slate-200 shrink-0"
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
                  <div className="w-full sm:w-auto flex sm:block items-center justify-between sm:text-right shrink-0 space-y-1">
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

          {/* Summary & Payment Gateway Selector */}
          <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-28 lg:self-start">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-5 shadow-sm">
              <h2 className="font-serif text-xl font-bold text-navy-950">Récapitulatif</h2>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder={t.cart.couponPlaceholder}
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => showToast("Le code promo sera vérifié lors de la validation.")}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-navy-950 text-xs font-bold hover:bg-slate-200 cursor-pointer"
                >
                  {t.cart.applyCoupon}
                </button>
              </div>

              <div className="space-y-2 text-sm border-t border-slate-100 pt-4">
                <div className="flex justify-between text-slate-600">
                  <span>{t.cart.subtotal}</span>
                  <span className="font-semibold">{formatFcfa(subtotalFcfa)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>{t.cart.shipping}</span>
                  <span className="font-semibold text-emerald-600">{t.cart.shippingFree}</span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-navy-950 pt-2 border-t border-slate-100">
                  <span>{t.cart.total}</span>
                  <span>{formatFcfa(subtotalFcfa)}</span>
                </div>
              </div>

              {/* Payment Gateway & Operator */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-navy-950 uppercase tracking-wider">
                  <CreditCard className="w-3.5 h-3.5 inline mr-1 text-gold-600" />
                  Agrégateur de paiement
                </label>
                <select
                  value={gatewayCode}
                  onChange={(e) => setGatewayCode(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-slate-50"
                >
                  <option value="maketou">Maketou Pay (Mobile Money / Carte)</option>
                  <option value="sebpay">SebPay Africa (MTN, Moov, Celtiis)</option>
                </select>

                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={operator}
                    onChange={(e) => setOperator(e.target.value)}
                    aria-label="Opérateur"
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs bg-slate-50"
                  >
                    <option value="MTN">MTN MoMo</option>
                    <option value="MOOV">Moov Money</option>
                    <option value="CELTIIS">Celtiis</option>
                    <option value="CARD">Carte Bancaire</option>
                  </select>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+229..."
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
              </div>

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

