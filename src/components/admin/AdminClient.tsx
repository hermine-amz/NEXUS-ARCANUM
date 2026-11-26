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
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  FolderTree,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Power,
  Receipt,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  TrendingUp,
  Upload,
  Users,
  X,
} from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { formatFcfa } from "@/components/catalog/ProductCard";
import {
  CategoriesCouponsPanel,
  CmsBannersPanel,
  CommunityPanel,
  SecurityAuditPanel,
} from "./AdminExtrasPanels";

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
  customerPhone?: string;
  subtotalFcfa?: number;
  discountFcfa?: number;
  totalFcfa: number;
  status: string;
  isDemoOrder: boolean;
  gatewayCode?: string | null;
  paymentStatus?: string | null;
  items?: Array<{ id: string; titleSnapshot: string; unitPriceFcfa: number }>;
  createdAt: string;
}

interface AdminClientRow {
  id: string;
  name: string;
  email: string;
  country: string;
  createdAt: string;
}

type AdminTab =
  | "cockpit"
  | "products"
  | "orders"
  | "payments"
  | "import"
  | "categories"
  | "cms"
  | "community"
  | "security";

const VALID_ADMIN_TABS: AdminTab[] = [
  "cockpit",
  "products",
  "orders",
  "payments",
  "import",
  "categories",
  "cms",
  "community",
  "security",
];

const ADMIN_TAB_STORAGE_KEY = "nxa_admin_tab";
const ADMIN_SIDEBAR_STORAGE_KEY = "nxa_admin_sidebar_collapsed";

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
  const { user, authLoaded, branding, logout, showToast, confirmAction } = useApp();
  const router = useRouter();

  const [tab, setTabState] = useState<AdminTab>("cockpit");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrderRow | null>(null);

  const setTab = (next: AdminTab) => {
    setTabState(next);
    try {
      sessionStorage.setItem(ADMIN_TAB_STORAGE_KEY, next);
      const url = new URL(window.location.href);
      url.searchParams.set("tab", next);
      window.history.replaceState(null, "", url.pathname + url.search);
    } catch {
      // ignore
    }
  };

  const setSidebarCollapsed = (next: boolean | ((prev: boolean) => boolean)) => {
    setSidebarCollapsedState((prev) => {
      const resolved = typeof next === "function" ? next(prev) : next;
      try {
        localStorage.setItem(ADMIN_SIDEBAR_STORAGE_KEY, resolved ? "1" : "0");
      } catch {
        // ignore
      }
      return resolved;
    });
  };

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlTab = params.get("tab") as AdminTab | null;
      const savedTab = sessionStorage.getItem(ADMIN_TAB_STORAGE_KEY) as AdminTab | null;
      const initial =
        urlTab && VALID_ADMIN_TABS.includes(urlTab)
          ? urlTab
          : savedTab && VALID_ADMIN_TABS.includes(savedTab)
          ? savedTab
          : "cockpit";
      setTabState(initial);
      if (params.get("tab") !== initial) {
        const url = new URL(window.location.href);
        url.searchParams.set("tab", initial);
        window.history.replaceState(null, "", url.pathname + url.search);
      }
      if (localStorage.getItem(ADMIN_SIDEBAR_STORAGE_KEY) === "1") {
        setSidebarCollapsedState(true);
      }
    } catch {
      // ignore
    }
  }, []);

  // Données métier
  const [gateways, setGateways] = useState<GatewayAdminRow[]>([]);
  const [routingMode, setRoutingMode] = useState<"MODE_A" | "MODE_B" | "MODE_C">("MODE_B");
  const [products, setProducts] = useState<AdminProductRow[]>([]);
  const [categories, setCategories] = useState<AdminCategoryOption[]>([]);
  const [orders, setOrders] = useState<AdminOrderRow[]>([]);
  const [clients, setClients] = useState<AdminClientRow[]>([]);

  // Filtres & Data Table catalogue / commandes / clients
  const [prodQuery, setProdQuery] = useState("");
  const [orderQuery, setOrderQuery] = useState("");
  const [clientQuery, setClientQuery] = useState("");
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

  // Config & ajout passerelle
  const [editingGw, setEditingGw] = useState<GatewayAdminRow | null>(null);
  const [newGwOpen, setNewGwOpen] = useState(false);
  const [newGwSaving, setNewGwSaving] = useState(false);
  const [newGwForm, setNewGwForm] = useState({
    name: "",
    code: "",
    description: "",
    apiBaseUrl: "",
    feePercent: "2.5",
    environment: "TEST" as "TEST" | "PRODUCTION",
    apiKey: "",
    webhookSecret: "",
  });
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

  const filteredOrders = useMemo(() => {
    const q = orderQuery.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) =>
      `${o.reference} ${o.customerName} ${o.customerEmail} ${o.gatewayCode || ""} ${o.status}`
        .toLowerCase()
        .includes(q)
    );
  }, [orders, orderQuery]);

  const filteredClients = useMemo(() => {
    const q = clientQuery.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      `${c.name} ${c.email} ${c.country}`.toLowerCase().includes(q)
    );
  }, [clients, clientQuery]);

  const toggleSort = (field: "title" | "category" | "price") => {
    setProdSort((prev) =>
      prev.field === field
        ? { field, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { field, dir: "asc" }
    );
    setProdPage(1);
  };

  const unconfiguredActiveGateways = gateways.filter((g) => g.isActive && !g.hasApiKey);

  const handleRoutingModeChange = async (mode: "MODE_A" | "MODE_B" | "MODE_C") => {
    setRoutingMode(mode);
    const res = await fetch("/api/admin/gateways", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "SET_ROUTING_MODE", routingMode: mode }),
    });
    if (res.ok) {
      showToast(`Mode de routage basculé vers ${mode}.`, "success");
    } else {
      showToast("Impossible de modifier le mode de routage.", "error");
    }
  };

  const handleGatewayAction = async (
    gatewayId: string,
    action: "SET_DEFAULT" | "TEST_CONNECTION" | "TOGGLE_ACTIVE"
  ) => {
    if (action === "TOGGLE_ACTIVE") {
      const target = gateways.find((g) => g.id === gatewayId);
      if (target?.isActive) {
        const ok = await confirmAction({
          title: `Désactiver ${target.name} ?`,
          message: `Les clients ne pourront plus régler leurs achats via ${target.name} tant qu'il reste désactivé.`,
          confirmLabel: "Désactiver",
          variant: "warning",
        });
        if (!ok) return;
      }
    }

    const res = await fetch("/api/admin/gateways", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, gatewayId }),
    });
    const data = await res.json();
    if (action === "TEST_CONNECTION") {
      showToast(
        data.message || (data.ok ? "Connexion réussie." : "Échec de la connexion."),
        data.ok ? "success" : "error"
      );
    } else if (action === "TOGGLE_ACTIVE" && res.ok) {
      showToast(
        data.isActive ? "Agrégateur activé sur la boutique." : "Agrégateur désactivé.",
        data.isActive ? "success" : "info"
      );
    } else if (res.ok) {
      showToast("Agrégateur défini par défaut.", "success");
    } else {
      showToast(data.error || "Action impossible sur cet agrégateur.", "error");
    }
    loadGateways();
  };

  const handleCreateGateway = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewGwSaving(true);
    try {
      const res = await fetch("/api/admin/gateways", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newGwForm,
          feePercent: Number(newGwForm.feePercent) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Erreur lors de la création de l'agrégateur.", "error");
        return;
      }
      showToast("Nouvel agrégateur ajouté avec succès !", "success");
      setNewGwOpen(false);
      setNewGwForm({
        name: "",
        code: "",
        description: "",
        apiBaseUrl: "",
        feePercent: "2.5",
        environment: "TEST",
        apiKey: "",
        webhookSecret: "",
      });
      loadGateways();
    } finally {
      setNewGwSaving(false);
    }
  };

  const handleDeleteGateway = async (gw: GatewayAdminRow) => {
    const ok = await confirmAction({
      title: `Supprimer « ${gw.name} » ?`,
      message:
        "Cet agrégateur de paiement et ses clés chiffrées seront définitivement retirés de la boutique.",
      confirmLabel: "Supprimer",
      variant: "danger",
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/gateways?id=${encodeURIComponent(gw.id)}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || "Suppression impossible.", "error");
      return;
    }
    showToast(`Agrégateur « ${gw.name} » supprimé.`, "success");
    if (editingGw?.id === gw.id) setEditingGw(null);
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
      showToast("Configuration enregistrée et clés chiffrées en sécurité.", "success");
      setEditingGw(null);
      setApiKeyInput("");
      setWebhookSecretInput("");
      setMaketouDocIdInput("");
      loadGateways();
    } else {
      showToast("Erreur lors de l'enregistrement de la configuration.", "error");
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
        showToast(data.error || "Erreur lors de la création.", "error");
        return;
      }
      showToast("Nouveau livre ajouté au catalogue !", "success");
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
      showToast(
        `Import terminé : ${data.report.createdCount} livres ajoutés.`,
        "success"
      );
      loadProducts();
    } else {
      showToast(data.error || "Erreur d'importation.", "error");
    }
  };

  const handleLockSession = async () => {
    const ok = await confirmAction({
      title: "Verrouiller votre session ?",
      message: "Vous serez déconnecté de l'espace administration et redirigé vers la page de connexion.",
      confirmLabel: "Verrouiller",
      variant: "warning",
    });
    if (!ok) return;
    await logout();
    showToast("Session administrateur verrouillée.", "info");
    router.push("/connexion");
  };

  const handleExportOrdersCsv = () => {
    if (orders.length === 0) {
      showToast("Aucune commande à exporter.", "warning");
      return;
    }
    const headers = [
      "Référence",
      "Date",
      "Client",
      "Email",
      "Téléphone",
      "Sous-total (FCFA)",
      "Remise (FCFA)",
      "Total (FCFA)",
      "Statut",
      "Agrégateur",
      "Ouvrages",
    ];
    const rows = orders.map((o) => [
      o.reference,
      new Date(o.createdAt).toLocaleString("fr-FR"),
      o.customerName,
      o.customerEmail,
      o.customerPhone || "",
      String(o.subtotalFcfa ?? o.totalFcfa),
      String(o.discountFcfa ?? 0),
      String(o.totalFcfa),
      o.status,
      o.gatewayCode || "",
      (o.items || []).map((it) => it.titleSnapshot).join(" | "),
    ]);
    const csv = [headers, ...rows]
      .map((line) => line.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `commandes-nexusarcanum-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Export CSV téléchargé (${orders.length} commandes).`, "success");
  };

  if (!authLoaded) {
    return (
      <div className="min-h-screen bg-[#E9EEF5] flex items-center justify-center p-4">
        <div className="bg-white/90 backdrop-blur rounded-2xl border border-slate-200 px-6 py-4 shadow-md flex items-center gap-3 text-sm font-medium text-slate-600">
          <span className="w-2.5 h-2.5 rounded-full bg-gold-500 animate-pulse" />
          <span>Chargement de votre espace administration...</span>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#E9EEF5] flex items-center justify-center p-4">
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
      vue: "VUE 01 — FINANCES & ACTIVITÉ",
      label: "Tableau de bord",
      sub: "Chiffres & Revenus",
      title: "Tableau de bord Financier",
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
      sub: "Maketou, FedaPay, KKiaPay...",
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
    {
      id: "categories",
      vue: "VUE 06 — CATÉGORIES & PROMOTIONS",
      label: "Catégories & Promos",
      sub: "Univers & Coupons",
      title: "Catégories & Codes Promo",
      icon: FolderTree,
    },
    {
      id: "cms",
      vue: "VUE 07 — BANNIÈRES & PAGES LÉGALES",
      label: "Bannières & Pages",
      sub: "Accueil & Textes légaux",
      title: "Bannières & Pages Légales",
      icon: FileText,
    },
    {
      id: "community",
      vue: "VUE 08 — AVIS & NEWSLETTER",
      label: "Avis & Newsletter",
      sub: "Modération & Abonnés",
      title: "Avis Clients & Newsletter",
      icon: MessageSquare,
    },
    {
      id: "security",
      vue: "VUE 09 — SÉCURITÉ & JOURNAL",
      label: "Sécurité & Journal",
      sub: "Mot de passe & Activité",
      title: "Sécurité & Journal d'Activité",
      icon: ShieldAlert,
    },
  ];

  const activeNav = navItems.find((n) => n.id === tab)!;

  return (
    <div className="min-h-screen bg-[#E9EEF5] text-slate-900 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/30 z-40 lg:hidden"
        />
      )}

      {/* Left Sidebar — fixe, ombre portée nette, scroll indépendant et rétractable */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen bg-white border-r border-slate-200 shadow-xl shadow-slate-900/10 flex flex-col overflow-hidden transition-all duration-200 shrink-0 ${
          sidebarOpen ? "translate-x-0 w-64" : "-translate-x-full w-64 lg:translate-x-0"
        } ${
          sidebarCollapsed
            ? "lg:w-0 lg:border-r-0 lg:shadow-none lg:opacity-0 lg:pointer-events-none"
            : "lg:w-64 lg:opacity-100"
        }`}
      >
        {/* Brand header (fixe en haut) */}
        <div className="p-5 pb-4 border-b border-slate-100 flex items-center justify-between shrink-0 min-w-[16rem]">
          <div className="flex items-center gap-3 min-w-0">
            {branding.siteLogoUrl ? (
              <img
                src={branding.siteLogoUrl}
                alt={branding.siteName}
                className="w-9 h-9 rounded-xl object-cover border border-amber-200 shadow-xs shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-[#FEFCE8] border border-amber-200 flex items-center justify-center font-serif font-bold text-navy-950 text-base shadow-xs shrink-0">
                {branding.siteName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="leading-tight min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs tracking-wider text-slate-900 uppercase truncate">
                  {branding.siteName}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              </div>
              <span className="text-[10px] text-slate-400 font-medium tracking-wide uppercase block truncate">
                ADMIN • LIBRAIRIE
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            aria-label="Fermer le menu"
          >
            <X className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => setSidebarCollapsed(true)}
            className="hidden lg:inline-flex p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
            title="Fermer la barre latérale"
            aria-label="Fermer la barre latérale"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation (scroll indépendant) */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1.5 min-w-[16rem]">
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

        {/* Bottom lock session (fixe en bas) */}
        <div className="p-4 border-t border-slate-100 bg-white shrink-0 min-w-[16rem]">
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
        <header className="sticky top-0 z-30 bg-[#E9EEF5]/90 backdrop-blur-md border-b border-slate-200/60 px-4 sm:px-8 py-4">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-xl bg-white border border-slate-200 text-slate-700 shadow-2xs cursor-pointer"
                aria-label="Ouvrir la navigation"
              >
                <Menu className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setSidebarCollapsed((v) => !v)}
                className="hidden lg:inline-flex items-center justify-center p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs transition cursor-pointer"
                title={sidebarCollapsed ? "Ouvrir le menu latéral" : "Fermer le menu latéral"}
                aria-label={sidebarCollapsed ? "Ouvrir le menu latéral" : "Fermer le menu latéral"}
              >
                {sidebarCollapsed ? (
                  <PanelLeftOpen className="w-4 h-4" />
                ) : (
                  <PanelLeftClose className="w-4 h-4" />
                )}
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
                  {/* Card 1: Chiffres Financiers */}
                  <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-md shadow-slate-900/5 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#FEFCE8] border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
                          <TrendingUp className="w-4 h-4" />
                        </div>
                        <div>
                          <h2 className="font-bold text-sm text-slate-900">
                            Chiffres Financiers & Revenus
                          </h2>
                          <p className="text-xs text-slate-400">
                            Synthèse des encaissements et transactions
                          </p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-[#FEFCE8] border border-amber-200 text-amber-900 text-[11px] font-bold">
                        FCFA (XOF)
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-[#FEFCE8]/70 border border-amber-200/80 flex items-baseline justify-between gap-2">
                      <div>
                        <p className="text-[11px] font-semibold text-amber-900/80">
                          Chiffre d&apos;affaires encaissé
                        </p>
                        <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5">
                          {formatFcfa(stats.totalRevenueFcfa)}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-slate-500">
                        ≈ {Math.round(stats.totalRevenueFcfa / 655.957).toLocaleString("fr-FR")} €
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                        <p className="text-[10px] text-slate-500 font-medium">Commandes</p>
                        <p className="text-lg font-extrabold text-slate-900 mt-0.5">
                          {stats.totalOrders}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                        <p className="text-[10px] text-slate-500 font-medium">Panier moyen</p>
                        <p className="text-sm font-extrabold text-slate-900 mt-1">
                          {stats.succeededPayments > 0
                            ? formatFcfa(
                                Math.round(stats.totalRevenueFcfa / stats.succeededPayments)
                              )
                            : "0 FCFA"}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                        <p className="text-[10px] text-slate-500 font-medium">Taux succès</p>
                        <p className="text-lg font-extrabold text-emerald-700 mt-0.5">
                          {stats.succeededPayments + stats.failedPayments > 0
                            ? `${Math.round(
                                (stats.succeededPayments /
                                  (stats.succeededPayments + stats.failedPayments)) *
                                  100
                              )}%`
                            : "—"}
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* Card 2: Indicateurs clés */}
                  <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-md shadow-slate-900/5 space-y-4">
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
                  <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-md shadow-slate-900/5 space-y-4">
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
                            {gateways.filter((g) => g.isActive).length} passerelles actives
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
                  <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-md shadow-slate-900/5 space-y-4">
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
                          <button
                            key={o.id}
                            type="button"
                            onClick={() => setSelectedOrder(o)}
                            className="w-full text-left flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-amber-300 hover:bg-amber-50/40 transition text-xs cursor-pointer"
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
                          </button>
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

                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-md shadow-slate-900/5 flex flex-col max-h-[calc(100vh-140px)]">
                  {/* Barre de recherche & filtres fixes (ne scrolle jamais) */}
                  <div className="shrink-0 pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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

                  {/* Tableau avec en-tête fixe et défilement indépendant */}
                  <div className="flex-1 min-h-0 overflow-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_#f1f5f9]">
                        <tr className="text-slate-400 uppercase text-[10px]">
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

                  {/* Pagination Data Table (fixe en bas) */}
                  <div className="shrink-0 pt-3 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
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
                <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-md shadow-slate-900/5 flex flex-col max-h-[calc(100vh-140px)]">
                  <div className="shrink-0 space-y-3 pb-3 border-b border-slate-100">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h2 className="font-bold text-sm text-slate-900">
                          Commandes ({filteredOrders.length})
                        </h2>
                        <p className="text-[11px] text-slate-400">
                          Cliquez sur une commande pour afficher son reçu détaillé
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleExportOrdersCsv}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-navy-950 text-gold-500 font-bold text-xs hover:bg-navy-900 transition cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Exporter CSV</span>
                      </button>
                    </div>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="search"
                        value={orderQuery}
                        onChange={(e) => setOrderQuery(e.target.value)}
                        placeholder="Rechercher par référence, client, email ou statut..."
                        className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:bg-white"
                      />
                    </div>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto pt-1">
                    {filteredOrders.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 p-8 mt-3 text-center text-xs text-slate-400">
                        Aucune commande correspondante.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 text-xs">
                        {filteredOrders.map((o) => (
                          <button
                            key={o.id}
                            type="button"
                            onClick={() => setSelectedOrder(o)}
                            className="w-full text-left py-3 px-2 rounded-xl hover:bg-slate-50 transition flex items-center justify-between gap-3 cursor-pointer"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-slate-900">{o.reference}</p>
                                {o.gatewayCode && (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-semibold uppercase">
                                    {o.gatewayCode}
                                  </span>
                                )}
                              </div>
                              <p className="text-slate-500 mt-0.5">
                                {o.customerName} • {o.customerEmail}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-bold text-slate-900">{formatFcfa(o.totalFcfa)}</p>
                              <span
                                className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-semibold ${
                                  o.status === "PAID" || o.status === "COMPLETED"
                                    ? "bg-emerald-50 text-emerald-700"
                                    : o.status === "FAILED" || o.status === "CANCELLED"
                                    ? "bg-rose-50 text-rose-700"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {o.status}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-md shadow-slate-900/5 flex flex-col max-h-[calc(100vh-140px)]">
                  <div className="shrink-0 space-y-3 pb-3 border-b border-slate-100">
                    <h2 className="font-bold text-sm text-slate-900">
                      Clients inscrits ({filteredClients.length})
                    </h2>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="search"
                        value={clientQuery}
                        onChange={(e) => setClientQuery(e.target.value)}
                        placeholder="Rechercher un client par nom, email ou pays..."
                        className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:bg-white"
                      />
                    </div>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100 text-xs pt-1">
                    {filteredClients.length === 0 ? (
                      <p className="py-8 text-center text-slate-400">Aucun client correspondant.</p>
                    ) : (
                      filteredClients.map((c) => (
                        <div key={c.id} className="py-3 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 truncate">{c.name}</p>
                            <p className="text-slate-500 truncate">{c.email}</p>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold shrink-0">
                            {c.country}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ========================================== */}
            {/* VUE 04 : PAIEMENTS MULTI-AGRÉGATEURS       */}
            {/* ========================================== */}
            {tab === "payments" && (
              <div className="space-y-6">
                <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-md shadow-slate-900/5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="font-bold text-sm text-slate-900">
                        Agrégateurs de paiement ({gateways.length})
                      </h2>
                      <p className="text-xs text-slate-400">
                        Activez vos prestataires et choisissez celui défini par défaut pour encaisser les commandes.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNewGwOpen(!newGwOpen)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-navy-950 text-gold-500 font-bold text-xs hover:bg-navy-900 shadow-sm cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Ajouter un agrégateur</span>
                    </button>
                  </div>
                </section>

                {newGwOpen && (
                  <form
                    onSubmit={handleCreateGateway}
                    className="bg-white rounded-2xl border-2 border-amber-300 p-6 shadow-md space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-base text-slate-900">
                        Ajouter un nouvel agrégateur de paiement
                      </h3>
                      <button
                        type="button"
                        onClick={() => setNewGwOpen(false)}
                        className="text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">Nom *</label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: CinetPay, FedaPay, Moneroo..."
                          value={newGwForm.name}
                          onChange={(e) => setNewGwForm({ ...newGwForm, name: e.target.value })}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">
                          Identifiant technique (code) *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: cinetpay, fedapay..."
                          value={newGwForm.code}
                          onChange={(e) => setNewGwForm({ ...newGwForm, code: e.target.value })}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">URL API</label>
                        <input
                          type="text"
                          placeholder="https://api.prestataire.com/v1"
                          value={newGwForm.apiBaseUrl}
                          onChange={(e) =>
                            setNewGwForm({ ...newGwForm, apiBaseUrl: e.target.value })
                          }
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block font-semibold text-slate-600 mb-1">
                            Frais (%)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={newGwForm.feePercent}
                            onChange={(e) =>
                              setNewGwForm({ ...newGwForm, feePercent: e.target.value })
                            }
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-600 mb-1">Mode</label>
                          <select
                            value={newGwForm.environment}
                            onChange={(e) =>
                              setNewGwForm({
                                ...newGwForm,
                                environment: e.target.value as "TEST" | "PRODUCTION",
                              })
                            }
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
                          >
                            <option value="TEST">TEST</option>
                            <option value="PRODUCTION">PRODUCTION</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">
                          Clé API (chiffrée AES-256-GCM)
                        </label>
                        <input
                          type="password"
                          value={newGwForm.apiKey}
                          onChange={(e) => setNewGwForm({ ...newGwForm, apiKey: e.target.value })}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">
                          Secret Webhook
                        </label>
                        <input
                          type="password"
                          value={newGwForm.webhookSecret}
                          onChange={(e) =>
                            setNewGwForm({ ...newGwForm, webhookSecret: e.target.value })
                          }
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block font-semibold text-slate-600 mb-1">
                          Description
                        </label>
                        <input
                          type="text"
                          value={newGwForm.description}
                          onChange={(e) =>
                            setNewGwForm({ ...newGwForm, description: e.target.value })
                          }
                          placeholder="Mobile Money Bénin / Côte d'Ivoire / Cartes..."
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setNewGwOpen(false)}
                        className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold cursor-pointer"
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        disabled={newGwSaving}
                        className="px-5 py-2 rounded-xl bg-navy-950 text-gold-500 text-xs font-bold cursor-pointer"
                      >
                        {newGwSaving ? "Ajout..." : "Enregistrer l'agrégateur"}
                      </button>
                    </div>
                  </form>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {gateways.map((gw) => (
                    <div
                      key={gw.id}
                      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-md shadow-slate-900/5 space-y-4"
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
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-500 border border-slate-200"
                          }`}
                        >
                          {gw.isActive ? "Actif" : "Inactif"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200/70">
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

                      <div className="flex flex-wrap items-center gap-2">
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
                        <button
                          type="button"
                          onClick={() => handleGatewayAction(gw.id, "TOGGLE_ACTIVE")}
                          className={`inline-flex items-center gap-1 px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer ${
                            gw.isActive
                              ? "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100"
                              : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                          <span>{gw.isActive ? "Désactiver" : "Activer"}</span>
                        </button>
                        {!gw.isDefault && (
                          <button
                            type="button"
                            onClick={() => handleGatewayAction(gw.id, "SET_DEFAULT")}
                            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                          >
                            Par défaut
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleGatewayAction(gw.id, "TEST_CONNECTION")}
                          className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          Tester
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteGateway(gw)}
                          title="Supprimer cet agrégateur"
                          aria-label="Supprimer"
                          className="ml-auto p-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
                        Activer {editingGw.name} sur la boutique
                      </label>

                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">
                          Mode d&apos;utilisation
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
                          <option value="TEST">Mode Test (pour essayer sans argent réel)</option>
                          <option value="PRODUCTION">Mode Réel (encaissements clients)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">
                          Clé API {editingGw.name} (chiffrée automatiquement)
                        </label>
                        <input
                          type="password"
                          value={apiKeyInput}
                          onChange={(e) => setApiKeyInput(e.target.value)}
                          placeholder="Collez votre clé ici (laisser vide pour garder l'actuelle)"
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">
                          Clé secrète Webhook (optionnel)
                        </label>
                        <input
                          type="password"
                          value={webhookSecretInput}
                          onChange={(e) => setWebhookSecretInput(e.target.value)}
                          placeholder="Optionnel — fourni par votre prestataire"
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        />
                      </div>

                      {editingGw.code === "maketou" && (
                        <div className="sm:col-span-2">
                          <label className="block font-semibold text-slate-600 mb-1">
                            Identifiant Produit Maketou (productDocumentId)
                          </label>
                          <input
                            type="text"
                            value={maketouDocIdInput}
                            onChange={(e) => setMaketouDocIdInput(e.target.value)}
                            placeholder="Visible dans votre boutique Maketou"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                          />
                        </div>
                      )}

                      <details className="sm:col-span-2 rounded-xl bg-slate-50 border border-slate-200/70 p-3">
                        <summary className="font-semibold text-slate-600 cursor-pointer">
                          Options techniques avancées (pré-remplies automatiquement)
                        </summary>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                          <div>
                            <label className="block font-semibold text-slate-600 mb-1">
                              URL API
                            </label>
                            <input
                              type="text"
                              value={editingGw.apiBaseUrl || ""}
                              onChange={(e) =>
                                setEditingGw({ ...editingGw, apiBaseUrl: e.target.value })
                              }
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
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
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
                            />
                          </div>
                        </div>
                      </details>
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
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-md shadow-slate-900/5 space-y-5">
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

            {/* VUE 06 : CATÉGORIES & COUPONS */}
            {tab === "categories" && <CategoriesCouponsPanel />}

            {/* VUE 07 : BANNIÈRES & PAGES LÉGALES */}
            {tab === "cms" && <CmsBannersPanel />}

            {/* VUE 08 : AVIS CLIENTS & NEWSLETTER */}
            {tab === "community" && <CommunityPanel />}

            {/* VUE 09 : SÉCURITÉ & JOURNAL */}
            {tab === "security" && <SecurityAuditPanel />}
          </div>
        </div>
      </div>

      {/* Modale Glassmorphism — Détail d'une commande */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-navy-950/50 backdrop-blur-md"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-3xl bg-white/90 backdrop-blur-xl border border-white/60 shadow-2xl p-6 space-y-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#FEFCE8] border border-amber-200 flex items-center justify-center text-amber-700">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Reçu de commande
                  </p>
                  <h3 className="font-serif text-lg font-bold text-navy-950">
                    {selectedOrder.reference}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="p-2 rounded-xl bg-white/80 border border-slate-200 text-slate-500 hover:text-slate-900 cursor-pointer"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50/90 border border-slate-200/70 rounded-2xl p-4">
              <div>
                <p className="text-[10px] text-slate-400 font-semibold uppercase">Client</p>
                <p className="font-bold text-slate-900 mt-0.5">{selectedOrder.customerName}</p>
                <p className="text-slate-500 break-all">{selectedOrder.customerEmail}</p>
                {selectedOrder.customerPhone && (
                  <p className="text-slate-500 mt-0.5">{selectedOrder.customerPhone}</p>
                )}
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-semibold uppercase">Paiement</p>
                <p className="font-bold text-slate-900 mt-0.5 uppercase">
                  {selectedOrder.gatewayCode || "Non renseigné"}
                </p>
                <p className="text-slate-500 mt-0.5">
                  Statut : <strong>{selectedOrder.status}</strong>
                </p>
                <p className="text-slate-400 mt-0.5">
                  {new Date(selectedOrder.createdAt).toLocaleString("fr-FR")}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Ouvrages inclus ({selectedOrder.items?.length || 0})
              </p>
              {selectedOrder.items && selectedOrder.items.length > 0 ? (
                <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200/80 bg-white/80 px-4">
                  {selectedOrder.items.map((it) => (
                    <div
                      key={it.id}
                      className="py-2.5 flex items-center justify-between gap-2 text-xs"
                    >
                      <span className="font-medium text-slate-800">{it.titleSnapshot}</span>
                      <span className="font-bold text-slate-900 shrink-0">
                        {formatFcfa(it.unitPriceFcfa)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  Aucun détail d&apos;article enregistré pour cette commande.
                </p>
              )}
            </div>

            <div className="rounded-2xl bg-[#FEFCE8]/80 border border-amber-200 p-4 space-y-1.5 text-xs">
              {selectedOrder.subtotalFcfa !== undefined && (
                <div className="flex justify-between text-slate-600">
                  <span>Sous-total</span>
                  <span>{formatFcfa(selectedOrder.subtotalFcfa)}</span>
                </div>
              )}
              {selectedOrder.discountFcfa ? (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Remise code promo</span>
                  <span>- {formatFcfa(selectedOrder.discountFcfa)}</span>
                </div>
              ) : null}
              <div className="flex justify-between items-center pt-1.5 border-t border-amber-200/80 text-sm font-extrabold text-navy-950">
                <span>Total payé</span>
                <span>{formatFcfa(selectedOrder.totalFcfa)}</span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2.5 rounded-xl bg-navy-950 text-gold-500 font-bold text-xs hover:bg-navy-900 transition cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
