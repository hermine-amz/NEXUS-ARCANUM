"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Check,
  Copy,
  CreditCard,
  ExternalLink,
  Eye,
  FileText,
  Image as ImageIcon,
  Lock,
  Save,
  Settings,
  Shield,
  Sparkles,
  Star,
  Tag,
  Trash2,
  Upload,
} from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { formatFcfa } from "@/components/catalog/ProductCard";
import { RichTextEditor } from "@/components/ui/RichTextEditor";

interface ProductFull {
  id: string;
  slug: string;
  titleFr: string;
  titleEn: string;
  subtitleFr: string;
  subtitleEn: string;
  shortDescFr: string;
  shortDescEn: string;
  longDescFr: string;
  longDescEn: string;
  summaryFr: string;
  summaryEn: string;
  productType: string;
  primaryFormat: string;
  pageCount: number | null;
  language: string;
  isbn: string;
  coverUrl: string;
  priceFcfa: number;
  promoPriceFcfa: number | null;
  isFree: boolean;
  isDemo: boolean;
  demoNotice: string;
  isArchived: boolean;
  isHiddenFromPublic: boolean;
  isPublished: boolean;
  isNewArrival: boolean;
  isBestseller: boolean;
  isRecommended: boolean;
  collectionTag: string;
  maxDownloads: number;
  watermarkEnabled: boolean;
  categoryId: string;
  authorId: string;
  publisherId: string;
  viewCount: number;
  salesCount: number;
}

interface AssetRow {
  id: string;
  assetKind: "FREE_EXTRACT" | "FULL_PRODUCT";
  format: string;
  fileName: string;
  storagePath: string;
  fileSizeBytes: number;
  isPrivate: boolean;
}

interface OptionItem {
  id: string;
  name?: string;
  nameFr?: string;
}

type StudioTab = "infos" | "pricing" | "files" | "settings";

function ToggleSwitch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between gap-4 py-3 text-left cursor-pointer group"
    >
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-800 group-hover:text-slate-950">{label}</p>
        {description && <p className="text-[11px] text-slate-400 mt-0.5">{description}</p>}
      </div>
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
          checked ? "bg-navy-950" : "bg-slate-200"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 mt-0.5 ${
            checked ? "translate-x-5.5" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}

export function ProductManageClient({ productId }: { productId: string }) {
  const { user, authLoaded, showToast, confirmAction } = useApp();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [bookCoupons, setBookCoupons] = useState<
    Array<{ id: string; code: string; discountType: string; discountValue: number; isActive: boolean }>
  >([]);
  const [bookCouponCode, setBookCouponCode] = useState("");
  const [bookCouponType, setBookCouponType] = useState<"PERCENTAGE" | "FIXED_FCFA">("PERCENTAGE");
  const [bookCouponVal, setBookCouponVal] = useState("15");

  const loadBookCoupons = useCallback(async () => {
    const res = await fetch(`/api/admin/coupons?productId=${encodeURIComponent(productId)}`);
    if (res.ok) {
      const data = await res.json();
      setBookCoupons(data.coupons || []);
    }
  }, [productId]);

  useEffect(() => {
    loadBookCoupons();
  }, [loadBookCoupons]);

  const handleCreateBookCoupon = async () => {
    if (!bookCouponCode.trim()) {
      showToast("Veuillez saisir un code promo.", "warning");
      return;
    }
    const res = await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: bookCouponCode.trim().toUpperCase(),
        discountType: bookCouponType,
        discountValue: Number(bookCouponVal) || 10,
        productId,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || "Impossible de créer ce code promo.", "error");
      return;
    }
    showToast(`Code promo ${bookCouponCode.trim().toUpperCase()} créé pour ce livre !`, "success");
    setBookCouponCode("");
    loadBookCoupons();
  };

  const handleDeleteBookCoupon = async (id: string, code: string) => {
    const ok = await confirmAction({
      title: `Supprimer le code « ${code} » ?`,
      message: "Ce code promo ne sera plus utilisable pour ce livre.",
      confirmLabel: "Supprimer",
      variant: "danger",
    });
    if (!ok) return;
    await fetch(`/api/admin/coupons?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    showToast("Code promo supprimé.", "success");
    loadBookCoupons();
  };
  const [activeTab, setActiveTab] = useState<StudioTab>("infos");

  const [form, setForm] = useState<ProductFull | null>(null);
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [categories, setCategories] = useState<OptionItem[]>([]);
  const [authors, setAuthors] = useState<OptionItem[]>([]);
  const [publishers, setPublishers] = useState<OptionItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const isAdmin =
    user?.roles?.some((r) => r === "SUPER_ADMIN" || r === "ADMIN" || r === "EDITOR") ?? false;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/products/${productId}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Produit introuvable.");
        return;
      }
      setForm(data.product);
      setAssets(data.assets || []);
      setCategories(data.categories || []);
      setAuthors(data.authors || []);
      setPublishers(data.publishers || []);
    } catch {
      setError("Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    if (isAdmin) loadData();
    else setLoading(false);
  }, [isAdmin, loadData]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Erreur d'enregistrement.");
        return;
      }
      showToast("Modifications enregistrées !");
      loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (
    kind: "COVER" | "FREE_EXTRACT" | "FULL_PRODUCT",
    file: File | undefined
  ) => {
    if (!file) return;
    setUploading(kind);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", kind);
      const res = await fetch(`/api/admin/products/${productId}/upload`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Échec de l'envoi.");
        return;
      }
      showToast(
        kind === "COVER"
          ? "Couverture mise à jour !"
          : kind === "FREE_EXTRACT"
          ? "Extrait gratuit mis à jour !"
          : "Fichier complet sécurisé envoyé !"
      );
      loadData();
    } finally {
      setUploading(null);
    }
  };

  const handleDuplicate = async () => {
    const res = await fetch("/api/admin/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, action: "DUPLICATE" }),
    });
    if (res.ok) {
      showToast("Produit dupliqué.");
      router.push("/admin");
    }
  };

  const handleDelete = async () => {
    const ok = await confirmAction({
      title: "Supprimer cet ouvrage définitivement ?",
      message:
        "Cette action est irréversible. Le livre et ses fichiers numériques associés seront retirés du catalogue.",
      confirmLabel: "Supprimer définitivement",
      variant: "danger",
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/products/${productId}`, { method: "DELETE" });
    if (res.ok) {
      showToast("Produit supprimé définitivement.", "success");
      router.push("/admin?tab=products");
    } else {
      showToast("Impossible de supprimer ce produit.", "error");
    }
  };

  if (!authLoaded) {
    return (
      <div className="min-h-screen bg-[#E9EEF5] flex items-center justify-center p-4">
        <div className="bg-white/90 backdrop-blur rounded-2xl border border-slate-200 px-6 py-4 shadow-md flex items-center gap-3 text-sm font-medium text-slate-600">
          <span className="w-2.5 h-2.5 rounded-full bg-gold-500 animate-pulse" />
          <span>Chargement de la fiche produit...</span>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#E9EEF5] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4 max-w-md w-full">
          <Lock className="w-10 h-10 text-amber-600 mx-auto" />
          <p className="font-bold text-slate-900">Accès administrateur requis</p>
          <Link
            href="/connexion"
            className="inline-block px-5 py-2.5 rounded-xl bg-navy-950 text-gold-500 text-xs font-bold"
          >
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  if (loading || !form) {
    return (
      <div className="min-h-screen bg-[#E9EEF5] flex flex-col items-center justify-center gap-3 text-sm text-slate-500">
        {error ? (
          <>
            <p className="text-rose-600 font-semibold">{error}</p>
            <Link
              href="/admin"
              className="px-4 py-2 rounded-xl bg-navy-950 text-gold-500 text-xs font-bold"
            >
              ← Retour au Cockpit
            </Link>
          </>
        ) : (
          <span>Chargement du studio produit...</span>
        )}
      </div>
    );
  }

  const currentAuthorName =
    authors.find((a) => a.id === form.authorId)?.name || "Auteur";
  const currentCategoryName =
    categories.find((c) => c.id === form.categoryId)?.nameFr || "Catégorie";
  const effectivePrice = form.isFree ? 0 : form.promoPriceFcfa ?? form.priceFcfa;
  const discountPct =
    !form.isFree && form.promoPriceFcfa !== null && form.priceFcfa > 0
      ? Math.round(((form.priceFcfa - form.promoPriceFcfa) / form.priceFcfa) * 100)
      : 0;

  const tabs: Array<{ id: StudioTab; step: string; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: "infos", step: "1", label: "Informations", icon: BookOpen },
    { id: "pricing", step: "2", label: "Tarification", icon: CreditCard },
    { id: "files", step: "3", label: "Fichiers & Média", icon: FileText },
    { id: "settings", step: "4", label: "Visibilité & Options", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#E9EEF5] text-slate-900 pb-16">
      {/* Top sticky Studio Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200/80 px-4 sm:px-8 py-3.5">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/admin?tab=products"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Catalogue</span>
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                  {form.titleFr}
                </h1>
                <span
                  className={`hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    form.isDemo
                      ? "bg-amber-50 text-amber-800 border border-amber-200"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {form.isDemo ? "Démo" : "Commercial"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/produit/${form.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Aperçu public</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </Link>
            <button
              type="button"
              onClick={() => handleSave()}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-navy-950 text-gold-500 text-xs font-bold hover:bg-navy-900 shadow-xs cursor-pointer disabled:opacity-60"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? "Enregistrement..." : "Enregistrer"}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-6 space-y-6">
        {/* Horizontal Chariow-style Stepped Pill Navigation (fixe sous le header) */}
        <nav
          aria-label="Sections produit"
          className="sticky top-[65px] z-20 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 p-1.5 shadow-sm grid grid-cols-2 sm:grid-cols-4 gap-1.5"
        >
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  active
                    ? "bg-[#FEFCE8] text-slate-900 border border-amber-200/90 shadow-2xs"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800 border border-transparent"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full text-[10px] font-extrabold flex items-center justify-center ${
                    active ? "bg-navy-950 text-gold-500" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {t.step}
                </span>
                <Icon className="w-3.5 h-3.5 hidden md:block" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Main 2-Column Studio Layout: Left Focused Editor + Right Live Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: Focused Step Content (8 cols) */}
          <form onSubmit={handleSave} className="lg:col-span-8 space-y-5">
            {/* TAB 1: INFORMATIONS */}
            {activeTab === "infos" && (
              <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-md shadow-slate-900/5 space-y-5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="font-bold text-base text-slate-900">
                      Identité & Contenu du livre
                    </h2>
                    <p className="text-xs text-slate-400">
                      Soignez le titre et la présentation pour convaincre vos lecteurs.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
                    <Sparkles className="w-3.5 h-3.5" />
                    Traduction EN automatique ✓
                  </span>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">
                      Titre de l&apos;ouvrage *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.titleFr}
                      onChange={(e) => setForm({ ...form, titleFr: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-semibold focus:border-navy-900"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Sous-titre</label>
                    <input
                      type="text"
                      value={form.subtitleFr}
                      onChange={(e) => setForm({ ...form, subtitleFr: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">
                      Accroche commerciale courte *
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={form.shortDescFr}
                      onChange={(e) => setForm({ ...form, shortDescFr: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">
                      Présentation détaillée * (Éditeur enrichi)
                    </label>
                    <RichTextEditor
                      value={form.longDescFr}
                      onChange={(html) => setForm({ ...form, longDescFr: html })}
                      placeholder="Rédigez une présentation complète (gras, couleurs, listes, liens, images...)"
                      minHeight="200px"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">
                      Sommaire (1 chapitre par ligne)
                    </label>
                    <textarea
                      rows={4}
                      value={form.summaryFr}
                      onChange={(e) => setForm({ ...form, summaryFr: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-mono"
                    />
                  </div>
                </div>

                <hr className="border-slate-100" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Catégorie</label>
                    <select
                      value={form.categoryId}
                      onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nameFr}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Auteur</label>
                    <select
                      value={form.authorId}
                      onChange={(e) => setForm({ ...form, authorId: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white"
                    >
                      {authors.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Éditeur</label>
                    <select
                      value={form.publisherId}
                      onChange={(e) => setForm({ ...form, publisherId: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white"
                    >
                      <option value="">— Aucun —</option>
                      {publishers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Format</label>
                      <select
                        value={form.primaryFormat}
                        onChange={(e) => setForm({ ...form, primaryFormat: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white"
                      >
                        <option value="PDF">PDF</option>
                        <option value="EPUB">EPUB</option>
                        <option value="AUDIO">AUDIO</option>
                        <option value="ZIP">PACK</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Pages</label>
                      <input
                        type="number"
                        min={1}
                        value={form.pageCount ?? ""}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            pageCount: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* TAB 2: TARIFICATION */}
            {activeTab === "pricing" && (
              <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-md shadow-slate-900/5 space-y-6">
                <div>
                  <h2 className="font-bold text-base text-slate-900">
                    Tarification & Mode commercial
                  </h2>
                  <p className="text-xs text-slate-400">
                    Définissez le prix en FCFA, une éventuelle promotion ou activez la vente réelle.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
                    <label className="block text-xs font-bold text-slate-700">
                      Prix normal (FCFA)
                    </label>
                    <input
                      type="number"
                      min={0}
                      disabled={form.isFree}
                      value={form.priceFcfa}
                      onChange={(e) => setForm({ ...form, priceFcfa: Number(e.target.value) })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-lg font-extrabold text-slate-900 disabled:opacity-50"
                    />
                  </div>
                  <div className="p-4 rounded-2xl bg-[#FEFCE8]/70 border border-amber-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-700">
                        Prix promotionnel (FCFA)
                      </label>
                      {discountPct > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold">
                          -{discountPct}%
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      min={0}
                      disabled={form.isFree}
                      value={form.promoPriceFcfa ?? ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          promoPriceFcfa: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      placeholder="Optionnel"
                      className="w-full rounded-xl border border-amber-200 bg-white px-3.5 py-2.5 text-lg font-extrabold text-slate-900 disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Codes promo spécifiques à ce livre */}
                <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-amber-700" />
                    <div>
                      <h3 className="text-xs font-bold text-slate-900">
                        Codes promo dédiés à ce livre ({bookCoupons.length})
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Créez un code promotionnel valable uniquement sur cet ouvrage.
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
                    <input
                      type="text"
                      value={bookCouponCode}
                      onChange={(e) => setBookCouponCode(e.target.value)}
                      placeholder="EX: LIVRE20"
                      className="sm:col-span-5 rounded-xl border border-slate-200 bg-white px-3 py-2 uppercase font-bold"
                    />
                    <select
                      value={bookCouponType}
                      onChange={(e) => setBookCouponType(e.target.value as typeof bookCouponType)}
                      className="sm:col-span-3 rounded-xl border border-slate-200 bg-white px-2.5 py-2"
                    >
                      <option value="PERCENTAGE">%</option>
                      <option value="FIXED_FCFA">FCFA</option>
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={bookCouponVal}
                      onChange={(e) => setBookCouponVal(e.target.value)}
                      className="sm:col-span-2 rounded-xl border border-slate-200 bg-white px-3 py-2 font-bold"
                    />
                    <button
                      type="button"
                      onClick={handleCreateBookCoupon}
                      className="sm:col-span-2 rounded-xl bg-navy-950 text-gold-500 font-bold px-3 py-2 hover:bg-navy-900 cursor-pointer"
                    >
                      Ajouter
                    </button>
                  </div>
                  {bookCoupons.length > 0 && (
                    <div className="divide-y divide-slate-200/70 pt-1 text-xs">
                      {bookCoupons.map((cp) => (
                        <div key={cp.id} className="py-2 flex items-center justify-between gap-2">
                          <div>
                            <span className="font-mono font-bold text-slate-900">{cp.code}</span>
                            <span className="ml-2 text-emerald-700 font-semibold">
                              {cp.discountType === "PERCENTAGE"
                                ? `-${cp.discountValue}%`
                                : `-${formatFcfa(cp.discountValue)}`}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteBookCoupon(cp.id, cp.code)}
                            className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                            title="Supprimer ce code promo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="divide-y divide-slate-100 border-t border-slate-100">
                  <ToggleSwitch
                    checked={form.isFree}
                    onChange={(v) => setForm({ ...form, isFree: v })}
                    label="Proposer cet ouvrage gratuitement (0 FCFA)"
                    description="Les lecteurs pourront l'ajouter à leur bibliothèque sans payer."
                  />
                  <ToggleSwitch
                    checked={!form.isDemo}
                    onChange={(commercial) => setForm({ ...form, isDemo: !commercial })}
                    label="Activer la vente réelle (Produit commercial)"
                    description={
                      form.isDemo
                        ? "Actuellement en mode DÉMONSTRATION (aucun paiement réel déclenché)."
                        : "Produit commercial actif : payable via vos agrégateurs (Maketou, SebPay...)."
                    }
                  />
                </div>
              </section>
            )}

            {/* TAB 3: FICHIERS & MÉDIA */}
            {activeTab === "files" && (
              <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-md shadow-slate-900/5 space-y-6">
                <div>
                  <h2 className="font-bold text-base text-slate-900">
                    Couverture & Fichiers à livrer
                  </h2>
                  <p className="text-xs text-slate-400">
                    Glissez ou sélectionnez vos fichiers : stockage automatique sur Supabase Storage.
                  </p>
                </div>

                {/* Dropzone 1: Couverture */}
                <label className="rounded-2xl border-2 border-dashed border-slate-200 hover:border-amber-300 bg-slate-50/50 p-5 flex items-center gap-4 cursor-pointer transition">
                  <div className="w-12 h-12 rounded-xl bg-[#FEFCE8] border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900">
                      {uploading === "COVER"
                        ? "Téléversement de la couverture..."
                        : "Remplacer l'image de couverture"}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      JPG, PNG, WEBP ou SVG • Format portrait 3:4 recommandé
                    </p>
                  </div>
                  <span className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 shrink-0">
                    Choisir
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleUpload("COVER", e.target.files?.[0])}
                  />
                </label>

                {/* Dropzone 2: Fichier complet (aperçu 4 pages filigrané généré automatiquement) */}
                <div className="space-y-3">
                  <div className="rounded-xl bg-[#FEFCE8] border border-amber-200 px-4 py-3 text-xs text-amber-950">
                    <strong>Aperçu automatique des 4 premières pages :</strong> plus besoin de préparer un extrait séparé. Les visiteurs peuvent feuilleter les 4 premières pages du PDF complet avec un filigrane de protection automatique.
                  </div>
                  <label className="rounded-2xl border-2 border-dashed border-slate-200 hover:border-navy-900 bg-slate-50/50 p-6 flex flex-col items-center text-center gap-2 cursor-pointer transition">
                    <Lock className="w-6 h-6 text-navy-950" />
                    <span className="text-xs font-bold text-slate-900">
                      {uploading === "FULL_PRODUCT"
                        ? "Envoi sécurisé..."
                        : "Téléverser le fichier complet du livre (PDF, EPUB, MP3, ZIP)"}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Stocké dans votre coffre privé • Aperçu 4 pages filigrané généré automatiquement
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.epub,.mp3,.zip"
                      className="hidden"
                      onChange={(e) => handleUpload("FULL_PRODUCT", e.target.files?.[0])}
                    />
                  </label>
                </div>

                {/* Fichiers actuels */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-700">Fichiers actuellement attachés</p>
                  {assets.length === 0 ? (
                    <p className="text-xs text-slate-400">Aucun fichier attaché.</p>
                  ) : (
                    assets.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                      >
                        <div className="min-w-0 flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                              a.assetKind === "FREE_EXTRACT"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-navy-950 text-gold-500"
                            }`}
                          >
                            {a.assetKind === "FREE_EXTRACT" ? "EXTRAIT" : "PRIVÉ"}
                          </span>
                          <span className="font-semibold text-slate-800 truncate">
                            {a.fileName}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 shrink-0">
                          {(a.fileSizeBytes / 1024).toFixed(1)} Ko
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* Sécurité de livraison */}
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <Shield className="w-4 h-4 text-navy-950" />
                    <span>Protection anti-partage</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 text-xs">
                    <span className="text-slate-600">Limite de téléchargements par client</span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={form.maxDownloads}
                      onChange={(e) => setForm({ ...form, maxDownloads: Number(e.target.value) })}
                      className="w-24 rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-bold text-center"
                    />
                  </div>
                  <ToggleSwitch
                    checked={form.watermarkEnabled}
                    onChange={(v) => setForm({ ...form, watermarkEnabled: v })}
                    label="Filigrane PDF automatique"
                    description="Inscrit l'email du client et sa date d'achat sur chaque page du PDF."
                  />
                </div>
              </section>
            )}

            {/* TAB 4: VISIBILITÉ & OPTIONS */}
            {activeTab === "settings" && (
              <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-md shadow-slate-900/5 space-y-5">
                <div>
                  <h2 className="font-bold text-base text-slate-900">
                    Visibilité, Mise en avant & Actions
                  </h2>
                  <p className="text-xs text-slate-400">
                    Contrôlez l&apos;affichage de l&apos;ouvrage sur la page d&apos;accueil et le catalogue.
                  </p>
                </div>

                <div className="divide-y divide-slate-100">
                  <ToggleSwitch
                    checked={form.isPublished && !form.isHiddenFromPublic}
                    onChange={(visible) =>
                      setForm({ ...form, isPublished: visible, isHiddenFromPublic: !visible })
                    }
                    label="Visible sur la boutique publique"
                    description="Désactivez pour masquer temporairement cet ouvrage sans le supprimer."
                  />
                  <ToggleSwitch
                    checked={form.isNewArrival}
                    onChange={(v) => setForm({ ...form, isNewArrival: v })}
                    label="Mettre en avant dans « Nouveautés »"
                  />
                  <ToggleSwitch
                    checked={form.isBestseller}
                    onChange={(v) => setForm({ ...form, isBestseller: v })}
                    label="Mettre en avant dans « Meilleures ventes »"
                  />
                  <ToggleSwitch
                    checked={form.isRecommended}
                    onChange={(v) => setForm({ ...form, isRecommended: v })}
                    label="Mettre en avant dans « Livres recommandés »"
                  />
                  <ToggleSwitch
                    checked={form.isArchived}
                    onChange={(v) => setForm({ ...form, isArchived: v })}
                    label="Archiver cet ouvrage"
                    description="Le retire du catalogue actif tout en conservant son historique."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleDuplicate}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Dupliquer ce produit</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Supprimer définitivement</span>
                  </button>
                </div>
              </section>
            )}

            {/* Smooth Step Footer */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex gap-2">
                {activeTab !== "infos" && (
                  <button
                    type="button"
                    onClick={() => {
                      const idx = tabs.findIndex((t) => t.id === activeTab);
                      if (idx > 0) setActiveTab(tabs[idx - 1].id);
                    }}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    ← Étape précédente
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                {activeTab !== "settings" ? (
                  <button
                    type="button"
                    onClick={() => {
                      const idx = tabs.findIndex((t) => t.id === activeTab);
                      if (idx < tabs.length - 1) setActiveTab(tabs[idx + 1].id);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 cursor-pointer"
                  >
                    Étape suivante →
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-navy-950 text-gold-500 text-xs font-bold hover:bg-navy-900 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>{saving ? "Enregistrement..." : "Terminer & Enregistrer"}</span>
                  </button>
                )}
              </div>
            </div>
          </form>

          {/* RIGHT: Live Chariow-style Storefront Card Preview (4 cols) */}
          <aside className="lg:col-span-4 lg:sticky lg:top-[136px] space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-md shadow-slate-900/5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  Aperçu en direct
                </span>
                <span className="text-[10px] font-semibold text-slate-400">
                  Tel que vu par vos clients
                </span>
              </div>

              {/* Mini Storefront Card */}
              <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm">
                <div className="relative aspect-[3/4] bg-navy-950 overflow-hidden">
                  <img
                    src={form.coverUrl}
                    alt={form.titleFr}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2.5 left-2.5 flex gap-1.5">
                    <span className="px-2 py-0.5 rounded bg-navy-950/90 text-gold-500 text-[10px] font-bold border border-gold-500/40">
                      {form.primaryFormat}
                    </span>
                    {form.isDemo && (
                      <span className="px-2 py-0.5 rounded bg-amber-500 text-navy-950 text-[10px] font-extrabold">
                        DÉMO
                      </span>
                    )}
                  </div>
                  {discountPct > 0 && (
                    <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold">
                      -{discountPct}%
                    </span>
                  )}
                </div>

                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="truncate font-medium">{currentCategoryName}</span>
                    <span className="inline-flex items-center gap-0.5 text-amber-500 font-bold">
                      <Star className="w-3 h-3 fill-amber-400" /> 4.8
                    </span>
                  </div>
                  <p className="font-serif font-bold text-navy-950 text-sm line-clamp-2">
                    {form.titleFr || "Titre de l'ouvrage"}
                  </p>
                  <p className="text-[11px] text-slate-400">{currentAuthorName}</p>
                  <div className="pt-1 flex items-baseline gap-2">
                    {form.isFree ? (
                      <span className="text-base font-extrabold text-emerald-600">Gratuit</span>
                    ) : (
                      <>
                        <span className="text-base font-extrabold text-navy-950">
                          {formatFcfa(effectivePrice)}
                        </span>
                        {form.promoPriceFcfa !== null && (
                          <span className="text-xs text-slate-400 line-through">
                            {formatFcfa(form.priceFcfa)}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
