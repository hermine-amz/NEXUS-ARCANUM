"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Heart, KeyRound, LogOut, Receipt, User as UserIcon } from "lucide-react";
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

interface FavoriteRow {
  id: string;
  slug: string;
  titleFr: string;
  coverUrl: string;
  priceFcfa: number;
  promoPriceFcfa: number | null;
  isFree: boolean;
  primaryFormat: string;
}

export default function ComptePage() {
  const { user, logout, showToast } = useApp();
  const router = useRouter();
  const isAdmin =
    user?.roles?.some((r) => r === "SUPER_ADMIN" || r === "ADMIN" || r === "EDITOR") ?? false;
  const [tab, setTab] = useState<"orders" | "favorites" | "security">("orders");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [favorites, setFavorites] = useState<FavoriteRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      router.replace("/admin");
      return;
    }
    if (!user) {
      setLoading(false);
      return;
    }
    Promise.all([
      fetch("/api/orders").then((r) => r.json()).catch(() => ({ orders: [] })),
      fetch("/api/favorites").then((r) => r.json()).catch(() => ({ favorites: [] })),
    ])
      .then(([oData, fData]) => {
        setOrders(oData.orders || []);
        setFavorites(fData.favorites || []);
      })
      .finally(() => setLoading(false));
  }, [user, isAdmin, router]);

  const handleRemoveFavorite = async (productId: string) => {
    const res = await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    if (res.ok) {
      setFavorites((prev) => prev.filter((f) => f.id !== productId));
      showToast("Retiré des favoris.");
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdSaving(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Erreur de modification.");
        return;
      }
      showToast("Mot de passe mis à jour !");
      setCurrentPassword("");
      setNewPassword("");
    } finally {
      setPwdSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <UserIcon className="w-12 h-12 text-gold-600 mx-auto" />
        <h1 className="font-serif text-3xl font-bold text-navy-950">Espace Client</h1>
        <p className="text-sm text-slate-600">
          Connectez-vous ou créez un compte pour suivre vos commandes, favoris et téléchargements.
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

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: "orders", label: `Commandes (${orders.length})`, icon: Receipt },
          { id: "favorites", label: `Mes Favoris (${favorites.length})`, icon: Heart },
          { id: "security", label: "Mot de passe", icon: KeyRound },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id as typeof tab)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                tab === item.id
                  ? "bg-navy-950 text-gold-500"
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {tab === "orders" && (
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
      )}

      {tab === "favorites" && (
        <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <h2 className="font-serif text-xl font-bold text-navy-950 flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-500" /> Mes ouvrages favoris
          </h2>
          {favorites.length === 0 ? (
            <p className="text-sm text-slate-500">
              Aucun favori enregistré. Cliquez sur le cœur sur n&apos;importe quelle fiche livre pour le retrouver ici.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {favorites.map((fav) => (
                <div
                  key={fav.id}
                  className="p-4 rounded-2xl border border-slate-200 flex items-center gap-4"
                >
                  <img
                    src={fav.coverUrl}
                    alt={fav.titleFr}
                    className="w-14 h-20 object-cover rounded-lg border border-slate-200 shrink-0"
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <Link
                      href={`/produit/${fav.slug}`}
                      className="font-serif font-bold text-sm text-navy-950 hover:text-gold-600 block truncate"
                    >
                      {fav.titleFr}
                    </Link>
                    <p className="text-xs font-bold text-navy-900">
                      {fav.isFree ? "Gratuit" : formatFcfa(fav.promoPriceFcfa ?? fav.priceFcfa)}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleRemoveFavorite(fav.id)}
                      className="text-[11px] text-rose-600 hover:underline cursor-pointer"
                    >
                      Retirer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === "security" && (
        <section className="bg-white rounded-2xl border border-slate-200 p-6 max-w-lg space-y-4">
          <h2 className="font-serif text-xl font-bold text-navy-950 flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-gold-600" /> Modifier mon mot de passe
          </h2>
          <form onSubmit={handlePasswordChange} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Mot de passe actuel</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">
                Nouveau mot de passe (8+ car., majuscule, minuscule, chiffre)
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={pwdSaving}
              className="px-5 py-2.5 rounded-xl bg-navy-950 text-gold-500 font-bold text-xs cursor-pointer"
            >
              {pwdSaving ? "Enregistrement..." : "Mettre à jour le mot de passe"}
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
