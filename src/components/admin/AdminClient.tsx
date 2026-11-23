"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowUpDown,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  ExternalLink,
  FileSpreadsheet,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  Users,
  X,
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
  promoPriceFcfa?: number | null;
  primaryFormat?: string;
  coverUrl?: string;
  isDemo: boolean;
  isArchived: boolean;
  isHiddenFromPublic: boolean;
  salesCount: number;
  viewCount: number;
  category: { nameFr: string };
}

interface AdminCategoryOption {
  id: string;
  slug: string;
  nameFr: string;
}

interface AdminOrderRow {
  id: string;
  reference: string;
  customerName: string;
  customerEmail: string;
  totalFcfa: number;
  status: string;
  isDemoOrder: boolean;
  createdAt: string;
}

interface AdminClientRow {
  id: string;
  name: string;
  email: string;
  country: string;
  createdAt: string;
}

interface AdminTask {
  id: string;
  text: string;
  priority: "Critique" | "Important" | "Normal";
  done: boolean;
}

type AdminTab = "cockpit" | "products" | "orders" | "payments" | "import";

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
  const { user, logout, showToast } = useApp();
  const router = useRouter();

  const [tab, setTab] = useState<AdminTab>("cockpit");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Tâches quotidiennes (localStorage)
  const [tasks, setTasks] = useState<AdminTask[]>([]);
  const [taskText, setTaskText] = useState("");
  const [taskPriority, setTaskPriority] = useState<AdminTask["priority"]>("Critique");

  // Données métier
  const [gateways, setGateways] = useState<GatewayAdminRow[]>([]);
  const [routingMode, setRoutingMode] = useState<"MODE_A" | "MODE_B" | "MODE_C">("MODE_B");
  const [products, setProducts] = useState<AdminProductRow[]>([]);
  const [categories, setCategories] = useState<AdminCategoryOption[]>([]);
  const [orders, setOrders] = useState<AdminOrderRow[]>([]);
  const [clients, setClients] = useState<AdminClientRow[]>([]);

  // Filtres & Data Table catalogue
  const [prodQuery, setProdQuery] = useState("");
  const [prodFilter, setProdFilter] = useState<"all" | "demo" | "commercial" | "archived">("all");
  const [prodSort, setProdSort] = useState<{
    field: "title" | "category" | "price";
    dir: "asc" | "desc";
  }>({ field: "title", dir: "asc" });
  const [prodPage, setProdPage] = useState(1);
  const [prodPageSize, setProdPageSize] = useState(10);

  // Modale nouveau produit
  const [newProdOpen, setNewProdOpen] = useState(false);
  const [newProdSaving, setNewProdSaving] = useState(false);
  const [newProdForm, setNewProdForm] = useState({
    titleFr: "",
    subtitleFr: "",
    shortDescFr: "",
    categoryId: "",
    authorName: "",
    priceFcfa: "5000",
    primaryFormat: "PDF",
    isDemo: false,
  });

  // Config passerelle
  const [editingGw, setEditingGw] = useState<GatewayAdminRow | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [webhookSecretInput, setWebhookSecretInput] = useState("");
  const [maketouDocIdInput, setMaketouDocIdInput] = useState("");

  // Import CSV/Excel
  const [importReport, setImportReport] = useState<{
    totalRows: number;
    createdCount: number;
    skippedDuplicates: number;
    errors: Array<{ row: number; reason: string }>;
  } | null>(null);

  const isAdmin =
    user?.roles?.some((r) => r === "SUPER_ADMIN" || r === "ADMIN" || r === "EDITOR") ?? false;

  useEffect(() => {
    try {
      const savedTasks = localStorage.getItem("nxa_admin_tasks");
      if (savedTasks) {
        setTasks(JSON.parse(savedTasks));
      }
    } catch {
      // ignore
    }
  }, []);

  const persistTasks = (next: AdminTask[]) => {
    setTasks(next);
    try {
      localStorage.setItem("nxa_admin_tasks", JSON.stringify(next));
    } catch {
      // ignore
    }
  };

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
      if (data.categories) {
        setCategories(data.categories);
        if (data.categories.length > 0 && !newProdForm.categoryId) {
          setNewProdForm((prev) => ({ ...prev, categoryId: data.categories[0].id }));
        }
      }
    }
  };

  const loadOrdersAndClients = async () => {
    const res = await fetch("/api/admin/orders");
    if (res.ok) {
      const data = await res.json();
      setOrders(data.orders || []);
      setClients(data.clients || []);
    }
  };

  useEffect(() => {
    if (isAdmin && stats.dbConnected) {
      loadGateways();
      loadProducts();
      loadOrdersAndClients();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, stats.dbConnected]);

  const filteredProducts = useMemo(() => {
    const q = prodQuery.trim().toLowerCase();
    const list = products.filter((p) => {
      if (prodFilter === "demo" && !p.isDemo) return false;
      if (prodFilter === "commercial" && (p.isDemo || p.isArchived)) return false;
      if (prodFilter === "archived" && !p.isArchived) return false;
      if (q && !`${p.titleFr} ${p.category.nameFr}`.toLowerCase().includes(q)) return false;
      return true;
    });

    return [...list].sort((a, b) => {
      let cmp = 0;
      if (prodSort.field === "title") cmp = a.titleFr.localeCompare(b.titleFr, "fr");
      else if (prodSort.field === "category")
        cmp = a.category.nameFr.localeCompare(b.category.nameFr, "fr");
      else cmp = a.priceFcfa - b.priceFcfa;
      return prodSort.dir === "asc" ? cmp : -cmp;
    });
  }, [products, prodQuery, prodFilter, prodSort]);

  const totalProdPages = Math.max(1, Math.ceil(filteredProducts.length / prodPageSize));
  const safeProdPage = Math.min(prodPage, totalProdPages);
  const paginatedProducts = useMemo(() => {
    const start = (safeProdPage - 1) * prodPageSize;
    return filteredProducts.slice(start, start + prodPageSize);
  }, [filteredProducts, safeProdPage, prodPageSize]);

  const toggleSort = (field: "title" | "category" | "price") => {
    setProdSort((prev) =>
      prev.field === field
        ? { field, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { field, dir: "asc" }
    );
    setProdPage(1);
  };

  const unconfiguredActiveGateways = gateways.filter((g) => g.isActive && !g.hasApiKey);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskText.trim() || tasks.length >= 10) return;
    const next: AdminTask[] = [
      { id: String(Date.now()), text: taskText.trim(), priority: taskPriority, done: false },
      ...tasks,
    ];
    persistTasks(next);
    setTaskText("");
  };

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
      showToast("Produit mis à jour.");
      loadProducts();
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewProdSaving(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newProdForm,
          priceFcfa: Number(newProdForm.priceFcfa) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Erreur lors de la création.");
        return;
      }
      showToast("Nouveau produit ajouté au catalogue !");
      setNewProdOpen(false);
      setNewProdForm((prev) => ({
        ...prev,
        titleFr: "",
        subtitleFr: "",
        shortDescFr: "",
        authorName: "",
        priceFcfa: "5000",
      }));
      loadProducts();
    } finally {
      setNewProdSaving(false);
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
      showToast(`Import terminé : ${data.report.createdCount} produits ajoutés.`);
      loadProducts();
    } else {
      showToast(data.error || "Erreur d'importation.");
    }
  };

  const handleLockSession = async () => {
    await logout();
    router.push("/connexion");
  };

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-5 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-[#FEFCE8] border border-amber-200 text-amber-700 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h1 className="font-serif text-2xl font-bold text-slate-900">
              Cockpit Administration
            </h1>
            <p className="text-sm text-slate-500">
              Connectez-vous avec un compte administrateur autorisé pour accéder au pilotage de NEXUSARCANUM SHOP.
            </p>
          </div>
          <Link
            href="/connexion"
            className="inline-flex items-center justify-center w-full px-6 py-3 rounded-xl bg-navy-950 text-white font-semibold text-sm hover:bg-navy-900 transition"
          >
            Connexion Administrateur
          </Link>
        </div>
      </div>
    );
  }

  const navItems: Array<{
    id: AdminTab;
    vue: string;
    label: string;
    sub: string;
    title: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      id: "cockpit",
      vue: "VUE 01 — PILOTAGE QUOTIDIEN",
      label: "Cockpit",
      sub: "Vue d'ensemble",
      title: "Cockpit de Gestion",
      icon: LayoutDashboard,
    },
    {
      id: "products",
      vue: "VUE 02 — CATALOGUE & DÉMOS",
      label: "Catalogue",
      sub: "Livres, Prix & Démos",
      title: "Gestion du Catalogue",
      icon: BookOpen,
    },
    {
      id: "orders",
      vue: "VUE 03 — VENTES & LECTEURS",
      label: "Commandes & Clients",
      sub: "Suivi & Reçus",
      title: "Commandes & Clients",
      icon: Users,
    },
    {
      id: "payments",
      vue: "VUE 04 — PAIEMENTS MULTI-AGRÉGATEURS",
      label: "Paiements",
      sub: "Maketou, SebPay & Modes",
      title: "Gestion des Paiements",
      icon: CreditCard,
    },
    {
      id: "import",
      vue: "VUE 05 — IMPORTATION MASSIVE",
      label: "Import Massif",
      sub: "CSV & Excel",
      title: "Importation CSV / Excel",
      icon: FileSpreadsheet,
    },
  ];

  const activeNav = navItems.find((n) => n.id === tab)!;

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-slate-900 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/30 z-40 lg:hidden"
        />
      )}

      {/* Left Sidebar (style épuré inspiré Cockpit) */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-5 space-y-6">
          {/* Brand header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#FEFCE8] border border-amber-200 flex items-center justify-center font-serif font-bold text-navy-950 text-base shadow-xs">
                N
              </div>
              <div className="leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs tracking-wider text-slate-900 uppercase">
                    NEXUSARCANUM
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </div>
                <span className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">
                  ADMIN • LIBRAIRIE
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 text-slate-400 hover:text-slate-700"
              aria-label="Fermer le menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <div className="space-y-1.5">
            <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
              Navigation
            </p>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setTab(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition cursor-pointer relative ${
                    isActive
                      ? "bg-[#FEFCE8] text-slate-900 border border-amber-200/80 shadow-xs"
                      : "text-slate-600 hover:bg-slate-50 border border-transparent"
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-gold-500" />
                  )}
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? "text-amber-700" : "text-slate-400"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className={`text-xs font-semibold truncate ${isActive ? "text-slate-900" : ""}`}>
                      {item.label}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">{item.sub}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom status & lock session */}
        <div className="p-4 space-y-2.5 border-t border-slate-100">
          <div className="rounded-xl bg-slate-50 border border-slate-200/70 p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <span
                  className={`w-2 h-2 rounded-full ${
                    stats.dbConnected ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                />
                {stats.dbConnected ? "Supabase Actif" : "Supabase Dégradé"}
              </span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <p className="text-[10px] text-slate-400 font-medium">
              Taux EUR/XOF <span className="text-slate-600 font-semibold">1 € ≈ 655,957</span>
            </p>
          </div>

          <button
            type="button"
            onClick={handleLockSession}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Verrouiller la session</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-[#F7F8FA]/90 backdrop-blur-md border-b border-slate-200/60 px-4 sm:px-8 py-4">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-xl bg-white border border-slate-200 text-slate-700"
                aria-label="Ouvrir la navigation"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {activeNav.vue}
                </p>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  {activeNav.title}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
              >
                <span>Voir la boutique</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>
              <button
                type="button"
                onClick={() => {
                  setTab("products");
                  setNewProdOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-navy-950 text-gold-500 font-bold text-xs hover:bg-navy-900 transition shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nouveau livre</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Workspace */}
        <div className="flex-1 px-4 sm:px-8 py-6">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* ========================================== */}
            {/* VUE 01 : COCKPIT                           */}
            {/* ========================================== */}
            {tab === "cockpit" && (
              <>
                {/* Bento Grid Row 1 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Card 1: Tâches du jour */}
                  <section className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#FEFCE8] border border-amber-200/70 flex items-center justify-center text-amber-700 shrink-0">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <h2 className="font-bold text-sm text-slate-900">
                            Tâches du Jour & Priorités
                          </h2>
                          <p className="text-xs text-slate-400">
                            Jusqu&apos;à 10 actions rapides pour piloter la librairie
                          </p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-bold">
                        {tasks.length} / 10
                      </span>
                    </div>

                    <form onSubmit={handleAddTask} className="flex gap-2">
                      <input
                        type="text"
                        value={taskText}
                        onChange={(e) => setTaskText(e.target.value)}
                        placeholder="Ex: Ajouter la clé API Maketou..."
                        className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs bg-slate-50/50 focus:bg-white"
                      />
                      <select
                        value={taskPriority}
                        onChange={(e) =>
                          setTaskPriority(e.target.value as AdminTask["priority"])
                        }
                        aria-label="Priorité"
                        className="rounded-xl border border-slate-200 px-2.5 py-2 text-xs bg-white font-medium"
                      >
                        <option value="Critique">Critique</option>
                        <option value="Important">Important</option>
                        <option value="Normal">Normal</option>
                      </select>
                      <button
                        type="submit"
                        className="px-3.5 py-2 rounded-xl bg-navy-950 text-gold-500 text-xs font-bold hover:bg-navy-900 transition cursor-pointer shrink-0"
                      >
                        + Ajouter
                      </button>
                    </form>

                    {tasks.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                        Aucune tâche définie pour aujourd&apos;hui. Notez vos actions prioritaires ci-dessus.
                      </div>
                    ) : (
                      <ul className="space-y-2 max-h-52 overflow-y-auto">
                        {tasks.map((task) => (
                          <li
                            key={task.id}
                            className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                persistTasks(
                                  tasks.map((t) =>
                                    t.id === task.id ? { ...t, done: !t.done } : t
                                  )
                                )
                              }
                              className="flex items-center gap-2 text-left flex-1 cursor-pointer"
                            >
                              <span
                                className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                                  task.done
                                    ? "bg-emerald-500 border-emerald-500 text-white"
                                    : "border-slate-300 bg-white"
                                }`}
                              >
                                {task.done && <Check className="w-3 h-3" />}
                              </span>
                              <span
                                className={
                                  task.done ? "line-through text-slate-400" : "text-slate-700 font-medium"
                                }
                              >
                                {task.text}
                              </span>
                            </button>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                task.priority === "Critique"
                                  ? "bg-rose-50 text-rose-700"
                                  : task.priority === "Important"
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-slate-200 text-slate-600"
                              }`}
                            >
                              {task.priority}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                persistTasks(tasks.filter((t) => t.id !== task.id))
                              }
                              className="text-slate-400 hover:text-rose-600 cursor-pointer"
                              aria-label="Supprimer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  {/* Card 2: Indicateurs clés */}
                  <section className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#FEFCE8] border border-amber-200/70 flex items-center justify-center text-amber-700 shrink-0">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <div>
                          <h2 className="font-bold text-sm text-slate-900">
                            Santé de la Librairie
                          </h2>
                          <p className="text-xs text-slate-400">
                            Vue temps réel depuis Supabase
                          </p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-bold">
                        En ligne
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "Livres publiés", val: stats.totalProducts, target: "products" as AdminTab },
                        { label: "Clients inscrits", val: stats.totalUsers, target: "orders" as AdminTab },
                        { label: "Paiements réussis", val: stats.succeededPayments, target: "payments" as AdminTab },
                        { label: "En attente / Échecs", val: `${stats.pendingPayments} / ${stats.failedPayments}`, target: "payments" as AdminTab },
                      ].map((kpi) => (
                        <button
                          key={kpi.label}
                          type="button"
                          onClick={() => setTab(kpi.target)}
                          className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100 hover:border-amber-300 text-left transition cursor-pointer"
                        >
                          <p className="text-[11px] text-slate-500 font-medium">{kpi.label}</p>
                          <p className="text-xl font-extrabold text-slate-900 mt-1">{kpi.val}</p>
                        </button>
                      ))}
                    </div>
                  </section>
                </div>

                {/* Bento Grid Row 2 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Alertes Paiements */}
                  <section className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#FEFCE8] border border-amber-200/70 flex items-center justify-center text-amber-700 shrink-0">
                          <AlertCircle className="w-4 h-4" />
                        </div>
                        <div>
                          <h2 className="font-bold text-sm text-slate-900">
                            Alertes Paiements & Agrégateurs
                          </h2>
                          <p className="text-xs text-slate-400">
                            Mode actif : {routingMode} • {gateways.filter((g) => g.isActive).length} passerelles actives
                          </p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-bold">
                        {unconfiguredActiveGateways.length}
                      </span>
                    </div>

                    {unconfiguredActiveGateways.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-xs text-slate-500">
                        Tous vos agrégateurs actifs sont configurés.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {unconfiguredActiveGateways.map((gw) => (
                          <div
                            key={gw.id}
                            className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-amber-50/70 border border-amber-200/70 text-xs"
                          >
                            <span className="text-amber-950 font-medium">
                              <strong>{gw.name}</strong> : clé API non renseignée
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setTab("payments");
                                setEditingGw(gw);
                              }}
                              className="text-xs font-bold text-navy-950 hover:underline cursor-pointer"
                            >
                              Configurer →
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* Commandes récentes */}
                  <section className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#FEFCE8] border border-amber-200/70 flex items-center justify-center text-amber-700 shrink-0">
                          <Users className="w-4 h-4" />
                        </div>
                        <div>
                          <h2 className="font-bold text-sm text-slate-900">
                            Dernières Commandes
                          </h2>
                          <p className="text-xs text-slate-400">
                            Suivi en direct des ventes numériques
                          </p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-bold">
                        {orders.length}
                      </span>
                    </div>

                    {orders.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-xs text-slate-400">
                        Aucune commande enregistrée pour le moment.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {orders.slice(0, 4).map((o) => (
                          <div
                            key={o.id}
                            className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                          >
                            <div>
                              <p className="font-bold text-slate-900">{o.reference}</p>
                              <p className="text-[11px] text-slate-500">{o.customerName}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-slate-900">{formatFcfa(o.totalFcfa)}</p>
                              <span className="text-[10px] font-semibold text-slate-500">
                                {o.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              </>
            )}

            {/* ========================================== */}
            {/* VUE 02 : CATALOGUE & DÉMOS                 */}
            {/* ========================================== */}
            {tab === "products" && (
              <div className="space-y-5">
                {newProdOpen && (
                  <form
                    onSubmit={handleCreateProduct}
                    className="bg-white rounded-2xl border border-amber-300 p-6 shadow-sm space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h2 className="font-bold text-base text-slate-900">
                        Ajouter un nouveau livre numérique
                      </h2>
                      <button
                        type="button"
                        onClick={() => setNewProdOpen(false)}
                        className="text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">Titre *</label>
                        <input
                          type="text"
                          required
                          value={newProdForm.titleFr}
                          onChange={(e) =>
                            setNewProdForm({ ...newProdForm, titleFr: e.target.value })
                          }
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">Auteur *</label>
                        <input
                          type="text"
                          required
                          value={newProdForm.authorName}
                          onChange={(e) =>
                            setNewProdForm({ ...newProdForm, authorName: e.target.value })
                          }
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">Catégorie *</label>
                        <select
                          required
                          value={newProdForm.categoryId}
                          onChange={(e) =>
                            setNewProdForm({ ...newProdForm, categoryId: e.target.value })
                          }
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
                        >
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nameFr}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block font-semibold text-slate-600 mb-1">
                            Prix (FCFA)
                          </label>
                          <input
                            type="number"
                            min={0}
                            required
                            value={newProdForm.priceFcfa}
                            onChange={(e) =>
                              setNewProdForm({ ...newProdForm, priceFcfa: e.target.value })
                            }
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-600 mb-1">Format</label>
                          <select
                            value={newProdForm.primaryFormat}
                            onChange={(e) =>
                              setNewProdForm({ ...newProdForm, primaryFormat: e.target.value })
                            }
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
                          >
                            <option value="PDF">PDF</option>
                            <option value="EPUB">EPUB</option>
                            <option value="AUDIO">AUDIO</option>
                          </select>
                        </div>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block font-semibold text-slate-600 mb-1">
                          Description commerciale *
                        </label>
                        <textarea
                          required
                          rows={2}
                          value={newProdForm.shortDescFr}
                          onChange={(e) =>
                            setNewProdForm({ ...newProdForm, shortDescFr: e.target.value })
                          }
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600">
                        <input
                          type="checkbox"
                          checked={newProdForm.isDemo}
                          onChange={(e) =>
                            setNewProdForm({ ...newProdForm, isDemo: e.target.checked })
                          }
                        />
                        Marquer comme produit de démonstration (non commercial)
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setNewProdOpen(false)}
                          className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold cursor-pointer"
                        >
                          Annuler
                        </button>
                        <button
                          type="submit"
                          disabled={newProdSaving}
                          className="px-5 py-2 rounded-xl bg-navy-950 text-gold-500 text-xs font-bold cursor-pointer"
                        >
                          {newProdSaving ? "Création..." : "Publier le livre"}
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="search"
                        value={prodQuery}
                        onChange={(e) => {
                          setProdQuery(e.target.value);
                          setProdPage(1);
                        }}
                        placeholder="Rechercher un titre ou une catégorie..."
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:bg-white"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      {[
                        { id: "all", label: `Tous (${products.length})` },
                        { id: "demo", label: "Démonstrations" },
                        { id: "commercial", label: "Commerciaux" },
                        { id: "archived", label: "Archivés" },
                      ].map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => {
                            setProdFilter(f.id as typeof prodFilter);
                            setProdPage(1);
                          }}
                          className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                            prodFilter === f.id
                              ? "bg-[#FEFCE8] text-amber-900 border border-amber-200"
                              : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px]">
                          <th className="py-3 pr-4">
                            <button
                              type="button"
                              onClick={() => toggleSort("title")}
                              className="inline-flex items-center gap-1 hover:text-slate-700 cursor-pointer uppercase"
                            >
                              <span>Ouvrage</span>
                              <ArrowUpDown className="w-3 h-3" />
                            </button>
                          </th>
                          <th className="py-3 pr-4">
                            <button
                              type="button"
                              onClick={() => toggleSort("category")}
                              className="inline-flex items-center gap-1 hover:text-slate-700 cursor-pointer uppercase"
                            >
                              <span>Catégorie</span>
                              <ArrowUpDown className="w-3 h-3" />
                            </button>
                          </th>
                          <th className="py-3 pr-4">
                            <button
                              type="button"
                              onClick={() => toggleSort("price")}
                              className="inline-flex items-center gap-1 hover:text-slate-700 cursor-pointer uppercase"
                            >
                              <span>Prix</span>
                              <ArrowUpDown className="w-3 h-3" />
                            </button>
                          </th>
                          <th className="py-3 pr-4">Statut</th>
                          <th className="py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paginatedProducts.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50/70">
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-3">
                                {p.coverUrl && (
                                  <img
                                    src={p.coverUrl}
                                    alt=""
                                    className="w-8 h-10 rounded object-cover border border-slate-200 shrink-0"
                                  />
                                )}
                                <div className="min-w-0">
                                  <Link
                                    href={`/admin/produits/${p.id}`}
                                    className="font-semibold text-slate-900 hover:text-amber-700 truncate max-w-xs block"
                                  >
                                    {p.titleFr}
                                  </Link>
                                  <Link
                                    href={`/produit/${p.slug}`}
                                    target="_blank"
                                    className="text-[10px] text-slate-400 hover:text-navy-900 inline-flex items-center gap-0.5"
                                  >
                                    Voir la fiche publique <ExternalLink className="w-2.5 h-2.5" />
                                  </Link>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 pr-4 text-slate-600 whitespace-nowrap">
                              {p.category.nameFr}
                            </td>
                            <td className="py-3 pr-4 font-bold text-slate-900 whitespace-nowrap">
                              {formatFcfa(p.priceFcfa)}
                            </td>
                            <td className="py-3 pr-4 whitespace-nowrap space-x-1">
                              {p.isDemo ? (
                                <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/80 font-semibold text-[10px]">
                                  Démo
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold text-[10px]">
                                  Commercial
                                </span>
                              )}
                              {p.isHiddenFromPublic && (
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold text-[10px]">
                                  Masqué
                                </span>
                              )}
                              {p.isArchived && (
                                <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-semibold text-[10px]">
                                  Archivé
                                </span>
                              )}
                            </td>
                            <td className="py-3 text-right whitespace-nowrap">
                              <Link
                                href={`/admin/produits/${p.id}`}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-navy-950 text-gold-500 hover:bg-navy-900 font-bold transition"
                              >
                                <span>Gérer</span>
                                <span>→</span>
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Data Table */}
                  <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                    <div className="flex items-center gap-3">
                      <span>
                        Affichage{" "}
                        <strong className="text-slate-800">
                          {filteredProducts.length === 0
                            ? 0
                            : (safeProdPage - 1) * prodPageSize + 1}
                          –
                          {Math.min(safeProdPage * prodPageSize, filteredProducts.length)}
                        </strong>{" "}
                        sur <strong className="text-slate-800">{filteredProducts.length}</strong>{" "}
                        ouvrages
                      </span>
                      <select
                        value={prodPageSize}
                        onChange={(e) => {
                          setProdPageSize(Number(e.target.value));
                          setProdPage(1);
                        }}
                        aria-label="Lignes par page"
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700"
                      >
                        <option value={8}>8 / page</option>
                        <option value={10}>10 / page</option>
                        <option value={20}>20 / page</option>
                        <option value={50}>50 / page</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={safeProdPage <= 1}
                        onClick={() => setProdPage((p) => Math.max(1, p - 1))}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>Préc.</span>
                      </button>

                      {Array.from({ length: totalProdPages }, (_, i) => i + 1).map((pageNum) => (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => setProdPage(pageNum)}
                          className={`min-w-[30px] h-8 rounded-lg font-bold transition cursor-pointer ${
                            pageNum === safeProdPage
                              ? "bg-navy-950 text-gold-500"
                              : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {pageNum}
                        </button>
                      ))}

                      <button
                        type="button"
                        disabled={safeProdPage >= totalProdPages}
                        onClick={() => setProdPage((p) => Math.min(totalProdPages, p + 1))}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                      >
                        <span>Suiv.</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================== */}
            {/* VUE 03 : COMMANDES & CLIENTS               */}
            {/* ========================================== */}
            {tab === "orders" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
                  <h2 className="font-bold text-sm text-slate-900">
                    Commandes ({orders.length})
                  </h2>
                  {orders.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
                      Aucune commande pour le moment.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 text-xs">
                      {orders.map((o) => (
                        <div key={o.id} className="py-3 flex items-center justify-between gap-3">
                          <div>
                            <p className="font-bold text-slate-900">{o.reference}</p>
                            <p className="text-slate-500">
                              {o.customerName} • {o.customerEmail}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-slate-900">{formatFcfa(o.totalFcfa)}</p>
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-semibold">
                              {o.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
                  <h2 className="font-bold text-sm text-slate-900">
                    Clients inscrits ({clients.length})
                  </h2>
                  <div className="divide-y divide-slate-100 text-xs">
                    {clients.map((c) => (
                      <div key={c.id} className="py-3 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate">{c.name}</p>
                          <p className="text-slate-500 truncate">{c.email}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold shrink-0">
                          {c.country}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ========================================== */}
            {/* VUE 04 : PAIEMENTS MULTI-AGRÉGATEURS       */}
            {/* ========================================== */}
            {tab === "payments" && (
              <div className="space-y-6">
                <section className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
                  <div>
                    <h2 className="font-bold text-sm text-slate-900">
                      Mode de routage des paiements
                    </h2>
                    <p className="text-xs text-slate-400">
                      Choisissez comment NEXUSARCANUM SHOP sélectionne l&apos;agrégateur au checkout.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      {
                        id: "MODE_A",
                        title: "Mode A — Unique",
                        desc: "Tout passe par l'agrégateur défini par défaut.",
                      },
                      {
                        id: "MODE_B",
                        title: "Mode B — Choix client",
                        desc: "Le client choisit parmi vos agrégateurs actifs.",
                      },
                      {
                        id: "MODE_C",
                        title: "Mode C — Routage intelligent",
                        desc: "Choix automatique selon pays, devise, opérateur et frais.",
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
                            ? "border-amber-300 bg-[#FEFCE8] shadow-2xs"
                            : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <p className="font-bold text-xs text-slate-900">{m.title}</p>
                        <p className="text-[11px] text-slate-500 mt-1">{m.desc}</p>
                      </button>
                    ))}
                  </div>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {gateways.map((gw) => (
                    <div
                      key={gw.id}
                      className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-base text-slate-900">{gw.name}</h3>
                            {gw.isDefault && (
                              <span className="px-2 py-0.5 rounded-md bg-[#FEFCE8] border border-amber-300 text-amber-900 text-[10px] font-bold">
                                Défaut
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{gw.description}</p>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            gw.isActive
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {gw.isActive ? "Actif" : "Inactif"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                        <div>
                          Mode : <strong className="text-slate-900">{gw.environment}</strong>
                        </div>
                        <div>
                          Frais : <strong className="text-slate-900">{gw.feePercent}%</strong>
                        </div>
                        <div>
                          Devises :{" "}
                          <strong className="text-slate-900">
                            {gw.supportedCurrencies.join(", ")}
                          </strong>
                        </div>
                        <div>
                          Clé API :{" "}
                          <strong
                            className={gw.hasApiKey ? "text-emerald-700" : "text-amber-700"}
                          >
                            {gw.hasApiKey ? "Chiffrée ✓" : "À renseigner"}
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
                          className="px-3.5 py-2 rounded-xl bg-navy-950 text-gold-500 text-xs font-bold hover:bg-navy-900 cursor-pointer"
                        >
                          Configurer
                        </button>
                        {!gw.isDefault && (
                          <button
                            type="button"
                            onClick={() => handleGatewayAction(gw.id, "SET_DEFAULT")}
                            className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                          >
                            Définir par défaut
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleGatewayAction(gw.id, "TEST_CONNECTION")}
                          className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          Tester
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {editingGw && (
                  <form
                    onSubmit={handleSaveGateway}
                    className="bg-white rounded-2xl border-2 border-navy-950 p-6 space-y-4 shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-base text-slate-900">
                        Configurer {editingGw.name}
                      </h3>
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-semibold">
                        <ShieldCheck className="w-4 h-4" /> Chiffrement AES-256-GCM
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <label className="flex items-center gap-2 font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={editingGw.isActive}
                          onChange={(e) =>
                            setEditingGw({ ...editingGw, isActive: e.target.checked })
                          }
                        />
                        Activer cet agrégateur
                      </label>

                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">
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
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
                        >
                          <option value="TEST">TEST (Sandbox)</option>
                          <option value="PRODUCTION">PRODUCTION</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">URL API</label>
                        <input
                          type="text"
                          value={editingGw.apiBaseUrl || ""}
                          onChange={(e) =>
                            setEditingGw({ ...editingGw, apiBaseUrl: e.target.value })
                          }
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">
                          Frais (%)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={editingGw.feePercent}
                          onChange={(e) =>
                            setEditingGw({ ...editingGw, feePercent: Number(e.target.value) })
                          }
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">
                          Clé API (laisser vide pour conserver l&apos;actuelle)
                        </label>
                        <input
                          type="password"
                          value={apiKeyInput}
                          onChange={(e) => setApiKeyInput(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">
                          Secret Webhook
                        </label>
                        <input
                          type="password"
                          value={webhookSecretInput}
                          onChange={(e) => setWebhookSecretInput(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        />
                      </div>

                      {editingGw.code === "maketou" && (
                        <div className="sm:col-span-2">
                          <label className="block font-semibold text-slate-600 mb-1">
                            Maketou productDocumentId (passerelle customerPrice)
                          </label>
                          <input
                            type="text"
                            value={maketouDocIdInput}
                            onChange={(e) => setMaketouDocIdInput(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="submit"
                        className="px-5 py-2.5 rounded-xl bg-navy-950 text-gold-500 font-bold text-xs cursor-pointer"
                      >
                        Enregistrer
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingGw(null)}
                        className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold cursor-pointer"
                      >
                        Annuler
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* ========================================== */}
            {/* VUE 05 : IMPORT MASSIF                     */}
            {/* ========================================== */}
            {tab === "import" && (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-5">
                <div>
                  <h2 className="font-bold text-base text-slate-900">
                    Importer des centaines ou milliers de livres (CSV / Excel)
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Colonnes reconnues : <code>title</code>, <code>subtitle</code>,{" "}
                    <code>description</code>, <code>categorySlug</code>, <code>author</code>,{" "}
                    <code>publisher</code>, <code>priceFcfa</code>, <code>format</code>,{" "}
                    <code>language</code>, <code>pageCount</code>. Les doublons sont ignorés automatiquement.
                  </p>
                </div>

                <form
                  onSubmit={handleImportUpload}
                  className="rounded-2xl border-2 border-dashed border-slate-200 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50"
                >
                  <input
                    type="file"
                    name="file"
                    accept=".csv,.xlsx,.xls"
                    required
                    className="text-xs text-slate-600"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-navy-950 text-gold-500 font-bold text-xs hover:bg-navy-900 cursor-pointer shrink-0"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Lancer l&apos;importation</span>
                  </button>
                </form>

                {importReport && (
                  <div className="p-4 rounded-xl bg-[#FEFCE8] border border-amber-200 text-xs space-y-2">
                    <p className="font-bold text-slate-900">
                      Résultat : {importReport.createdCount} créés •{" "}
                      {importReport.skippedDuplicates} doublons ignorés •{" "}
                      {importReport.errors.length} erreurs (sur {importReport.totalRows} lignes)
                    </p>
                    {importReport.errors.length > 0 && (
                      <ul className="text-rose-700 list-disc pl-5 space-y-0.5">
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
        </div>
      </div>
    </div>
  );
}
