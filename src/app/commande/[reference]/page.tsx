"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Printer,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { formatFcfa } from "@/components/catalog/ProductCard";

interface OrderDetail {
  id: string;
  reference: string;
  status: string;
  subtotalFcfa: number;
  discountFcfa: number;
  totalFcfa: number;
  currency: string;
  customerName: string;
  customerEmail: string;
  paidAt: string | null;
  createdAt: string;
  gatewayCode: string | null;
  items: Array<{
    id: string;
    titleSnapshot: string;
    unitPriceFcfa: number;
    quantity: number;
  }>;
}

export default function CommandeConfirmationPage() {
  const params = useParams<{ reference: string }>();
  const reference = params?.reference || "";
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrder = useCallback(async () => {
    if (!reference) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(reference)}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Commande introuvable.");
        return;
      }
      setOrder(data.order);
    } catch {
      setError("Impossible de vérifier la commande.");
    } finally {
      setLoading(false);
    }
  }, [reference]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center text-sm text-slate-500">
        Vérification du statut de votre commande {reference}...
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <XCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h1 className="font-serif text-2xl font-bold text-navy-950">
          {error || "Commande introuvable"}
        </h1>
        <Link
          href="/compte"
          className="inline-block px-5 py-2.5 rounded-xl bg-navy-950 text-gold-500 text-xs font-bold"
        >
          Voir mes commandes
        </Link>
      </div>
    );
  }

  const isPaid = order.status === "PAID";
  const isPending = order.status === "PENDING" || order.status === "AWAITING_PAYMENT";

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-6">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-md shadow-slate-900/5 p-6 sm:p-8 space-y-6">
        {/* Status Banner */}
        <div className="text-center space-y-3 pb-6 border-b border-slate-100">
          {isPaid ? (
            <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto" />
          ) : isPending ? (
            <Clock className="w-14 h-14 text-amber-500 mx-auto" />
          ) : (
            <XCircle className="w-14 h-14 text-rose-500 mx-auto" />
          )}

          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-navy-950">
            {isPaid
              ? "Paiement confirmé !"
              : isPending
              ? "Paiement en attente de confirmation"
              : "Paiement non abouti"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Référence de commande :{" "}
            <strong className="font-mono text-navy-950">{order.reference}</strong>
          </p>
        </div>

        {/* Receipt Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200/70">
          <div>
            <p className="text-slate-400">Client</p>
            <p className="font-bold text-slate-900">{order.customerName}</p>
            <p className="text-slate-600">{order.customerEmail}</p>
          </div>
          <div className="sm:text-right">
            <p className="text-slate-400">Date & Prestataire</p>
            <p className="font-bold text-slate-900">
              {new Date(order.paidAt || order.createdAt).toLocaleString("fr-FR")}
            </p>
            <p className="text-slate-600 uppercase">
              {order.gatewayCode || "Livraison directe"}
            </p>
          </div>
        </div>

        {/* Line Items */}
        <div className="space-y-2 text-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Détail de la commande
          </p>
          <div className="divide-y divide-slate-100 border-t border-b border-slate-100">
            {order.items.map((item) => (
              <div key={item.id} className="py-3 flex justify-between gap-4">
                <span className="font-medium text-slate-800">{item.titleSnapshot}</span>
                <span className="font-bold text-slate-900 shrink-0">
                  {formatFcfa(item.unitPriceFcfa)}
                </span>
              </div>
            ))}
          </div>
          <div className="pt-2 space-y-1 text-sm">
            {order.discountFcfa > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Remise code promo</span>
                <span>-{formatFcfa(order.discountFcfa)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-extrabold text-navy-950">
              <span>Total réglé</span>
              <span>{formatFcfa(order.totalFcfa)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer / PDF Reçu</span>
          </button>

          <div className="flex flex-wrap gap-2">
            {isPending && (
              <button
                type="button"
                onClick={loadOrder}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-xs font-bold cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Actualiser le statut</span>
              </button>
            )}
            {isPaid && (
              <Link
                href="/compte/bibliotheque"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gold-500 text-navy-950 text-xs font-extrabold hover:bg-gold-600 transition"
              >
                <BookOpen className="w-4 h-4" />
                <span>Accéder à ma bibliothèque →</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
