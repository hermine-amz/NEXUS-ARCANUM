"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  CreditCard,
  FileSpreadsheet,
  Lock,
  Settings,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { formatFcfa } from "@/components/catalog/ProductCard";

interface GatewayAdminRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  isDefault: boolean;
  environment: "TEST" | "PRODUCTION";
  apiBaseUrl: string | null;
  webhookUrl: string | null;
  supportedCurrencies: string[];
  supportedCountries: string[];
  supportedOperators: string[];
  feePercent: number;
  feeFixedFcfa: number;
  hasApiKey: boolean;
  hasWebhookSecret: boolean;
  gatewayProductDocumentId: string;
  lastTestStatus: string | null;
}

interface AdminProductRow {
  id: string;
  slug: string;
  titleFr: string;
  priceFcfa: number;
  isDemo: boolean;
  isArchived: boolean;
  isHiddenFromPublic: boolean;
  salesCount: number;
  viewCount: number;
  category: { nameFr: string };
}

export function AdminClient({
  stats,
}: {
  stats: {
    dbConnected: boolean;
    totalRevenueFcfa: number;
    totalOrders: number;
    totalUsers: number;
    totalProducts: number;
    succeededPayments: number;
    failedPayments: number;
    pendingPayments: number;
  };
}) {
  const { user, showToast } = useApp();
  const [tab, setTab] = useState<"stats" | "products" | "payments" | "import">("payments");
  const [gateways, setGateways] = useState<GatewayAdminRow[]>([]);
  const [routingMode, setRoutingMode] = useState<"MODE_A" | "MODE_B" | "MODE_C">("MODE_B");
  const [products, setProducts] = useState<AdminProductRow[]>([]);
  const [editingGw, setEditingGw] = useState<GatewayAdminRow | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [webhookSecretInput, setWebhookSecretInput] = useState("");
  const [maketouDocIdInput, setMaketouDocIdInput] = useState("");
  const [importReport, setImportReport] = useState<{
    totalRows: number;
    createdCount: number;
    skippedDuplicates: number;
    errors: Array<{ row: number; reason: string }>;
  } | null>(null);

  const isAdmin =
    user?.roles?.some((r) => r === "SUPER_ADMIN" || r === "ADMIN" || r === "EDITOR") ?? false;

  const loadGateways = async () => {
    const res = await fetch("/api/admin/gateways");
    if (res.ok) {
      const data = await res.json();
      setGateways(data.gateways || []);
      if (data.routingMode) setRoutingMode(data.routingMode);
    }
  };

  const loadProducts = async () => {
    const res = await fetch("/api/admin/products");
    if (res.ok) {
      const data = await res.json();
      setProducts(data.products || []);
    }
  };

  useEffect(() => {
    if (isAdmin && stats.dbConnected) {
      loadGateways();
      loadProducts();
    }
  }, [isAdmin, stats.dbConnected]);

  const handleRoutingModeChange = async (mode: "MODE_A" | "MODE_B" | "MODE_C") => {
    setRoutingMode(mode);
    const res = await fetch("/api/admin/gateways", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "SET_ROUTING_MODE", routingMode: mode }),
    });
    if (res.ok) showToast(`Mode de routage basculé vers ${mode}`);
  };

  const handleGatewayAction = async (
    gatewayId: string,
    action: "SET_DEFAULT" | "TEST_CONNECTION"
  ) => {
    const res = await fetch("/api/admin/gateways", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, gatewayId }),
    });
    const data = await res.json();
    if (action === "TEST_CONNECTION") {
      showToast(data.message || (data.ok ? "Connexion OK" : "Erreur connexion"));
    } else if (res.ok) {
      showToast("Agrégateur défini par défaut.");
    }
    loadGateways();
  };

  const handleSaveGateway = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGw) return;
    const res = await fetch("/api/admin/gateways", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "UPDATE_CONFIG",
        gatewayId: editingGw.id,
        isActive: editingGw.isActive,
        environment: editingGw.environment,
        apiBaseUrl: editingGw.apiBaseUrl || "",
        feePercent: editingGw.feePercent,
        secrets: {
          ...(apiKeyInput ? { apiKey: apiKeyInput } : {}),
          ...(webhookSecretInput ? { webhookSecret: webhookSecretInput } : {}),
          ...(maketouDocIdInput ? { gatewayProductDocumentId: maketouDocIdInput } : {}),
        },
      }),
    });
    if (res.ok) {
      showToast("Configuration enregistrée et secrets chiffrés (AES-256-GCM).");
      setEditingGw(null);
      setApiKeyInput("");
      setWebhookSecretInput("");
      setMaketouDocIdInput("");
      loadGateways();
    }
  };

  const handleProductAction = async (
    productId: string,
    action: "ARCHIVE" | "UNARCHIVE" | "TOGGLE_HIDE" | "DUPLICATE" | "CONVERT_TO_COMMERCIAL"
  ) => {
    const res = await fetch("/api/admin/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, action }),
    });
    if (res.ok) {
      showToast(`Action ${action} appliquée.`);
      loadProducts();
    }
  };

  const handleImportUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/import", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (res.ok && data.report) {
      setImportReport(data.report);
      showToast(`Import terminé : ${data.report.createdCount} créés.`);
      loadProducts();
    } else {
      showToast(data.error || "Erreur d'importation.");
    }
  };

  if (!user || !isAdmin) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <Lock className="w-12 h-12 text-gold-600 mx-auto" />
        <h1 className="font-serif text-3xl font-bold text-navy-950">
          Administration NEXUSARCANUM SHOP
        </h1>
        <p className="text-sm text-slate-600">
          Cette interface privée est réservée aux administrateurs autorisés.
        </p>
        <Link
          href="/connexion"
          className="inline-block px-6 py-3 rounded-xl bg-navy-900 text-white font-semibold text-sm"
        >
          Connexion Administrateur
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gold-600">
            Back-office Privé
          </p>
          <h1 className="font-serif text-3xl font-bold text-navy-950">
            Tableau de bord & Paramètres
          </h1>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { id: "stats", label: "Statistiques", icon: BarChart3 },
            { id: "products", label: "Catalogue & Démos", icon: BookOpen },
            { id: "payments", label: "Gestion des Paiements", icon: CreditCard },
            { id: "import", label: "Import CSV / Excel", icon: FileSpreadsheet },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id as typeof tab)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  tab === item.id
                    ? "bg-navy-950 text-gold-500 shadow"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {!stats.dbConnected && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-sm">
          Base PostgreSQL non connectée. Connectez <code>DATABASE_URL</code> et lancez{" "}
          <code>npx prisma migrate deploy</code> + <code>npx prisma db seed</code> pour administrer les données en direct.
        </div>
      )}

      {/* TAB 1: STATISTIQUES */}
      {tab === "stats" && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Chiffre d'affaires", val: formatFcfa(stats.totalRevenueFcfa) },
            { label: "Commandes", val: String(stats.totalOrders) },
            { label: "Clients inscrits", val: String(stats.totalUsers) },
            { label: "Produits actifs", val: String(stats.totalProducts) },
            { label: "Paiements réussis", val: String(stats.succeededPayments) },
            { label: "Paiements en attente", val: String(stats.pendingPayments) },
            { label: "Paiements échoués", val: String(stats.failedPayments) },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-white p-5 rounded-2xl border border-slate-200">
              <p className="text-xs text-slate-500 font-medium">{kpi.label}</p>
              <p className="text-2xl font-extrabold text-navy-950 mt-1">{kpi.val}</p>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: GESTION DES PRODUITS & DÉMONSTRATIONS */}
      {tab === "products" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 overflow-x-auto">
          <h2 className="font-serif text-xl font-bold text-navy-950">
            Catalogue & Gestion des Démonstrations ({products.length})
          </h2>
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase">
                <th className="py-3 pr-4">Titre</th>
                <th className="py-3 pr-4">Catégorie</th>
                <th className="py-3 pr-4">Prix</th>
                <th className="py-3 pr-4">Statut</th>
                <th className="py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="py-3 pr-4 font-bold text-navy-950">{p.titleFr}</td>
                  <td className="py-3 pr-4 text-slate-600">{p.category.nameFr}</td>
                  <td className="py-3 pr-4 font-semibold">{formatFcfa(p.priceFcfa)}</td>
                  <td className="py-3 pr-4 space-x-1">
                    {p.isDemo && (
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                        DÉMO
                      </span>
                    )}
                    {p.isHiddenFromPublic && (
                      <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-bold">
                        MASQUÉ
                      </span>
                    )}
                    {p.isArchived && (
                      <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-bold">
                        ARCHIVÉ
                      </span>
                    )}
                  </td>
                  <td className="py-3 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleProductAction(p.id, "TOGGLE_HIDE")}
                      className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 font-semibold cursor-pointer"
                    >
                      {p.isHiddenFromPublic ? "Afficher" : "Masquer"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleProductAction(p.id, "DUPLICATE")}
                      className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 font-semibold cursor-pointer"
                    >
                      Dupliquer
                    </button>
                    {p.isDemo && (
                      <button
                        type="button"
                        onClick={() => handleProductAction(p.id, "CONVERT_TO_COMMERCIAL")}
                        className="px-2 py-1 rounded bg-emerald-100 text-emerald-800 hover:bg-emerald-200 font-semibold cursor-pointer"
                      >
                        Commercialiser
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        handleProductAction(p.id, p.isArchived ? "UNARCHIVE" : "ARCHIVE")
                      }
                      className="px-2 py-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold cursor-pointer"
                    >
                      {p.isArchived ? "Restaurer" : "Archiver"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: ADMINISTRATION > PARAMÈTRES > GESTION DES PAIEMENTS */}
      {tab === "payments" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gold-600">
              <Settings className="w-4 h-4" />
              ADMINISTRATION &gt; PARAMÈTRES &gt; GESTION DES PAIEMENTS
            </div>
            <h2 className="font-serif text-xl font-bold text-navy-950">
              Mode de fonctionnement du Payment Gateway Manager
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  id: "MODE_A",
                  title: "MODE A — Agrégateur unique",
                  desc: "Toutes les transactions passent par l'agrégateur par défaut.",
                },
                {
                  id: "MODE_B",
                  title: "MODE B — Choix client",
                  desc: "Plusieurs agrégateurs actifs sont proposés au client au checkout.",
                },
                {
                  id: "MODE_C",
                  title: "MODE C — Routage intelligent",
                  desc: "Sélection automatique selon le pays, la devise, l'opérateur et les frais.",
                },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() =>
                    handleRoutingModeChange(m.id as "MODE_A" | "MODE_B" | "MODE_C")
                  }
                  className={`p-4 rounded-xl border text-left transition cursor-pointer ${
                    routingMode === m.id
                      ? "border-gold-500 bg-gold-50/50 ring-2 ring-gold-500/30"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <p className="font-bold text-sm text-navy-950">{m.title}</p>
                  <p className="text-xs text-slate-600 mt-1">{m.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {gateways.map((gw) => (
              <div
                key={gw.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-serif text-lg font-bold text-navy-950">{gw.name}</h3>
                      {gw.isDefault && (
                        <span className="px-2 py-0.5 rounded bg-gold-500 text-navy-950 text-[10px] font-extrabold">
                          DÉFAUT
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{gw.description}</p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      gw.isActive
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {gw.isActive ? "Actif" : "Inactif"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl">
                  <div>Environnement : <strong>{gw.environment}</strong></div>
                  <div>Frais : <strong>{gw.feePercent}%</strong></div>
                  <div>Devises : <strong>{gw.supportedCurrencies.join(", ")}</strong></div>
                  <div>
                    Clé API :{" "}
                    <strong className={gw.hasApiKey ? "text-emerald-700" : "text-amber-700"}>
                      {gw.hasApiKey ? "Chiffrée ✓" : "Non définie"}
                    </strong>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingGw(gw);
                      setMaketouDocIdInput(gw.gatewayProductDocumentId || "");
                    }}
                    className="px-3.5 py-2 rounded-lg bg-navy-900 text-white text-xs font-semibold hover:bg-navy-800 cursor-pointer"
                  >
                    Configurer
                  </button>
                  {!gw.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleGatewayAction(gw.id, "SET_DEFAULT")}
                      className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                    >
                      Définir par défaut
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleGatewayAction(gw.id, "TEST_CONNECTION")}
                    className="px-3.5 py-2 rounded-lg border border-gold-500 text-navy-950 text-xs font-semibold hover:bg-gold-50 cursor-pointer"
                  >
                    Tester connexion
                  </button>
                </div>
              </div>
            ))}
          </div>

          {editingGw && (
            <form
              onSubmit={handleSaveGateway}
              className="bg-white rounded-2xl border-2 border-navy-950 p-6 space-y-4 shadow-xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-xl font-bold text-navy-950">
                  Configurer {editingGw.name}
                </h3>
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <label className="flex items-center gap-2 font-semibold">
                  <input
                    type="checkbox"
                    checked={editingGw.isActive}
                    onChange={(e) =>
                      setEditingGw({ ...editingGw, isActive: e.target.checked })
                    }
                  />
                  Agrégateur actif
                </label>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Environnement
                  </label>
                  <select
                    value={editingGw.environment}
                    onChange={(e) =>
                      setEditingGw({
                        ...editingGw,
                        environment: e.target.value as "TEST" | "PRODUCTION",
                      })
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="TEST">TEST (Sandbox)</option>
                    <option value="PRODUCTION">PRODUCTION</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">URL API</label>
                  <input
                    type="text"
                    value={editingGw.apiBaseUrl || ""}
                    onChange={(e) =>
                      setEditingGw({ ...editingGw, apiBaseUrl: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Frais (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingGw.feePercent}
                    onChange={(e) =>
                      setEditingGw({ ...editingGw, feePercent: Number(e.target.value) })
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Nouvelle Clé API (chiffrée AES-256-GCM)
                  </label>
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="Laisser vide pour conserver l'actuelle"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Secret Webhook
                  </label>
                  <input
                    type="password"
                    value={webhookSecretInput}
                    onChange={(e) => setWebhookSecretInput(e.target.value)}
                    placeholder="Laisser vide pour conserver l'actuel"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>

                {editingGw.code === "maketou" && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      Maketou gatewayProductDocumentId (pour checkout customerPrice)
                    </label>
                    <input
                      type="text"
                      value={maketouDocIdInput}
                      onChange={(e) => setMaketouDocIdInput(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gold-500 text-navy-950 font-bold text-sm cursor-pointer"
                >
                  Enregistrer
                </button>
                <button
                  type="button"
                  onClick={() => setEditingGw(null)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold cursor-pointer"
                >
                  Annuler
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* TAB 4: IMPORTATION MASSIVE CSV / EXCEL */}
      {tab === "import" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <h2 className="font-serif text-xl font-bold text-navy-950">
            Importation massive de produits (CSV / Excel .xlsx)
          </h2>
          <p className="text-sm text-slate-600">
            Colonnes supportées : <code>title</code>, <code>subtitle</code>,{" "}
            <code>description</code>, <code>categorySlug</code>, <code>author</code>,{" "}
            <code>publisher</code>, <code>priceFcfa</code>, <code>format</code>,{" "}
            <code>language</code>, <code>pageCount</code>, <code>coverUrl</code>.
          </p>
          <form onSubmit={handleImportUpload} className="flex flex-col sm:flex-row gap-3 items-start">
            <input
              type="file"
              name="file"
              accept=".csv,.xlsx,.xls"
              required
              className="text-sm border border-slate-200 rounded-xl p-2 bg-slate-50"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-navy-900 text-white font-bold text-sm hover:bg-navy-800 cursor-pointer"
            >
              <Upload className="w-4 h-4 text-gold-500" />
              Importer le catalogue
            </button>
          </form>

          {importReport && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <p className="font-bold text-navy-950">
                Rapport : {importReport.createdCount} créés • {importReport.skippedDuplicates}{" "}
                doublons ignorés • {importReport.errors.length} erreurs (sur{" "}
                {importReport.totalRows} lignes)
              </p>
              {importReport.errors.length > 0 && (
                <ul className="text-rose-700 list-disc pl-5">
                  {importReport.errors.slice(0, 10).map((err, i) => (
                    <li key={i}>
                      Ligne {err.row} : {err.reason}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

