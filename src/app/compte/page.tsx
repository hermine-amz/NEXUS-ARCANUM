"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, LogOut, Receipt, User as UserIcon, RefreshCw } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { formatFcfa } from "@/components/catalog/ProductCard";

interface OrderRow {
  id: string;
  reference: string;
  totalFcfa: number;
  status: string;
  createdAt: string;
  items: Array<{ id: string; titleSnapshot: string; unitPriceFcfa: number }>;
  payments: Array<{ gatewayCode: string; status: string }>;
}

export default function ComptePage() {
  const { user, logout } = useApp();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/orders", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Impossible de récupérer vos commandes.");
      setOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  if (!user) {
    return (
      <main className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <UserIcon aria-hidden="true" className="w-12 h-12 text-gold-600 mx-auto" />
        <h1 className="font-serif text-3xl font-bold text-navy-950">Espace Client</h1>
        <p className="text-sm text-slate-600">
          Connectez-vous ou créez un compte pour suivre vos commandes et vos téléchargements.
        </p>
        <div className="flex flex-col min-[380px]:flex-row justify-center gap-3">
          <Link href="/connexion" className="px-6 py-3 rounded-xl bg-gold-500 text-navy-950 font-bold text-sm">
            Connexion
          </Link>
          <Link href="/inscription" className="px-6 py-3 rounded-xl bg-navy-900 text-white font-semibold text-sm">
            Inscription
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6 sm:space-y-8">
      <section className="bg-navy-950 text-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest text-gold-500 font-bold">Espace Client</p>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold mt-1 break-words">
            Bonjour, {user.firstName} {user.lastName}
          </h1>
          <p className="text-sm text-slate-300 break-all">{user.email}</p>
        </div>
        <div className="flex w-full sm:w-auto flex-col min-[420px]:flex-row flex-wrap gap-2">
          <Link href="/compte/bibliotheque" className="inline-flex justify-center items-center gap-2 px-4 py-3 rounded-xl bg-gold-500 text-navy-950 font-bold text-sm">
            <BookOpen className="w-4 h-4" /> Ma Bibliothèque
          </Link>
          <button type="button" onClick={logout} className="inline-flex justify-center items-center gap-2 px-4 py-3 rounded-xl bg-white/10 text-white text-sm hover:bg-white/20 cursor-pointer">
            <LogOut className="w-4 h-4" /> Déconnexion
          </button>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 space-y-4" aria-labelledby="orders-heading">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 id="orders-heading" className="font-serif text-xl font-bold text-navy-950 flex items-center gap-2">
            <Receipt aria-hidden="true" className="w-5 h-5 text-gold-600" /> Historique des commandes
          </h2>
          <button type="button" onClick={() => void loadOrders()} disabled={loading} className="inline-flex items-center justify-center gap-2 self-start px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-navy-900 hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw aria-hidden="true" className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Actualiser
          </button>
        </div>

        {loading ? (
          <p role="status" className="py-8 text-center text-sm text-slate-500">Chargement de vos commandes...</p>
        ) : error ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 space-y-3" role="alert">
            <p>{error}</p>
            <button type="button" onClick={() => void loadOrders()} className="font-bold underline underline-offset-2">Réessayer</button>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-8 text-center space-y-3">
            <Receipt aria-hidden="true" className="w-9 h-9 text-slate-300 mx-auto" />
            <p className="text-sm text-slate-600">Aucune commande enregistrée pour le moment.</p>
            <Link href="/catalogue" className="inline-flex px-4 py-2 rounded-lg bg-navy-900 text-white text-sm font-semibold">Découvrir le catalogue</Link>
          </div>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {orders.map((order) => (
                <article key={order.id} className="rounded-xl border border-slate-200 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-bold text-navy-950 break-all">{order.reference}</p>
                      <p className="text-xs text-slate-500 mt-1">{new Date(order.createdAt).toLocaleDateString("fr-FR")}</p>
                    </div>
                    <span className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-navy-950">{order.status}</span>
                  </div>
                  <p className="text-sm text-slate-700">{order.items.map((item) => item.titleSnapshot).join(", ") || "Article"}</p>
                  <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                    <span className="text-xs text-slate-500 uppercase">{order.payments[0]?.gatewayCode || "Paiement"}</span>
                    <strong className="text-sm text-navy-950">{formatFcfa(order.totalFcfa)}</strong>
                  </div>
                </article>
              ))}
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                    <th scope="col" className="py-3 pr-4">Référence</th>
                    <th scope="col" className="py-3 pr-4">Date</th>
                    <th scope="col" className="py-3 pr-4">Produits</th>
                    <th scope="col" className="py-3 pr-4">Paiement</th>
                    <th scope="col" className="py-3 pr-4">Statut</th>
                    <th scope="col" className="py-3 text-right">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td className="py-3 pr-4 font-mono font-bold text-navy-950">{order.reference}</td>
                      <td className="py-3 pr-4 text-slate-600 whitespace-nowrap">{new Date(order.createdAt).toLocaleDateString("fr-FR")}</td>
                      <td className="py-3 pr-4 text-slate-700">{order.items.map((item) => item.titleSnapshot).join(", ")}</td>
                      <td className="py-3 pr-4 text-slate-600 uppercase text-xs">{order.payments[0]?.gatewayCode || "—"}</td>
                      <td className="py-3 pr-4"><span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-navy-950">{order.status}</span></td>
                      <td className="py-3 text-right font-bold whitespace-nowrap">{formatFcfa(order.totalFcfa)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
