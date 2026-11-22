"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, LogOut, Receipt, User as UserIcon } from "lucide-react";
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

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    fetch("/api/orders")
      .then((r) => r.json())
      .then((d) => setOrders(d.orders || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <UserIcon className="w-12 h-12 text-gold-600 mx-auto" />
        <h1 className="font-serif text-3xl font-bold text-navy-950">Espace Client</h1>
        <p className="text-sm text-slate-600">
          Connectez-vous ou créez un compte pour suivre vos commandes et vos téléchargements.
        </p>
        <div className="flex justify-center gap-3">
          <Link
            href="/connexion"
            className="px-6 py-3 rounded-xl bg-gold-500 text-navy-950 font-bold text-sm"
          >
            Connexion
          </Link>
          <Link
            href="/inscription"
            className="px-6 py-3 rounded-xl bg-navy-900 text-white font-semibold text-sm"
          >
            Inscription
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="bg-navy-950 text-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-gold-500 font-bold">Espace Client</p>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold mt-1">
            Bonjour, {user.firstName} {user.lastName}
          </h1>
          <p className="text-sm text-slate-300">{user.email}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/compte/bibliotheque"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gold-500 text-navy-950 font-bold text-sm"
          >
            <BookOpen className="w-4 h-4" /> Ma Bibliothèque
          </Link>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 text-white text-sm hover:bg-white/20 cursor-pointer"
          >
            <LogOut className="w-4 h-4" /> Déconnexion
          </button>
        </div>
      </div>

      <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-serif text-xl font-bold text-navy-950 flex items-center gap-2">
          <Receipt className="w-5 h-5 text-gold-600" /> Historique des commandes & Reçus
        </h2>
        {loading ? (
          <p className="text-sm text-slate-500">Chargement...</p>
        ) : orders.length === 0 ? (
          <p className="text-sm text-slate-500">Aucune commande enregistrée.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                  <th className="py-3 pr-4">Référence</th>
                  <th className="py-3 pr-4">Date</th>
                  <th className="py-3 pr-4">Produits</th>
                  <th className="py-3 pr-4">Agrégateur</th>
                  <th className="py-3 pr-4">Statut</th>
                  <th className="py-3 text-right">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="py-3 pr-4 font-mono font-bold text-navy-950">{o.reference}</td>
                    <td className="py-3 pr-4 text-slate-600">
                      {new Date(o.createdAt).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="py-3 pr-4 text-slate-700">
                      {o.items.map((i) => i.titleSnapshot).join(", ")}
                    </td>
                    <td className="py-3 pr-4 text-slate-600 uppercase text-xs">
                      {o.payments[0]?.gatewayCode || "—"}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-navy-950">
                        {o.status}
                      </span>
                    </td>
                    <td className="py-3 text-right font-bold">{formatFcfa(o.totalFcfa)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

