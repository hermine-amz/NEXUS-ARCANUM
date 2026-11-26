"use client";

import React, { useEffect, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  FolderTree,
  Image as ImageIcon,
  KeyRound,
  Mail,
  MessageSquare,
  Plus,
  Save,
  Search,
  ShieldAlert,
  Star,
  Tag,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { formatFcfa } from "@/components/catalog/ProductCard";
import { RichTextEditor } from "@/components/ui/RichTextEditor";

interface CategoryRow {
  id: string;
  slug: string;
  nameFr: string;
  sortOrder: number;
  isActive: boolean;
  parentId: string | null;
  productCount: number;
}

interface CouponRow {
  id: string;
  code: string;
  discountType: string;
  discountValue: number;
  minOrderFcfa: number;
  usedCount: number;
  isActive: boolean;
}

interface AuditRow {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  actor: string;
  createdAt: string;
}

export function CategoriesCouponsPanel() {
  const { showToast, confirmAction } = useApp();
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [coupons, setCoupons] = useState<CouponRow[]>([]);

  const [catName, setCatName] = useState("");
  const [catQuery, setCatQuery] = useState("");
  const [openCatIds, setOpenCatIds] = useState<Record<string, boolean>>({});
  const [subCatDrafts, setSubCatDrafts] = useState<Record<string, string>>({});

  const [couponCode, setCouponCode] = useState("");
  const [couponType, setCouponType] = useState<"PERCENTAGE" | "FIXED_FCFA">("PERCENTAGE");
  const [couponValue, setCouponValue] = useState("15");

  const loadAll = async () => {
    const [cRes, pRes] = await Promise.all([
      fetch("/api/admin/categories"),
      fetch("/api/admin/coupons"),
    ]);
    if (cRes.ok) setCategories((await cRes.json()).categories || []);
    if (pRes.ok) setCoupons((await pRes.json()).coupons || []);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const parentCategories = categories.filter((c) => !c.parentId);
  const childrenByParent = new Map<string, CategoryRow[]>();
  for (const c of categories) {
    if (c.parentId) {
      const list = childrenByParent.get(c.parentId) || [];
      list.push(c);
      childrenByParent.set(c.parentId, list);
    }
  }
  const filteredParents = catQuery.trim()
    ? parentCategories.filter((c) => {
        const q = catQuery.trim().toLowerCase();
        const subs = childrenByParent.get(c.id) || [];
        return (
          c.nameFr.toLowerCase().includes(q) ||
          subs.some((s) => s.nameFr.toLowerCase().includes(q))
        );
      })
    : parentCategories;

  const toggleCategoryOpen = (id: string) => {
    setOpenCatIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddCategory = async (e: React.FormEvent, parentId: string | null = null) => {
    e.preventDefault();
    const name = parentId ? (subCatDrafts[parentId] || "").trim() : catName.trim();
    if (!name) return;

    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nameFr: name,
        parentId,
        sortOrder: categories.length + 1,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || "Erreur.");
      return;
    }
    showToast(parentId ? "Sous-catégorie ajoutée !" : "Catégorie créée !");
    if (parentId) {
      setSubCatDrafts((prev) => ({ ...prev, [parentId]: "" }));
    } else {
      setCatName("");
    }
    loadAll();
  };

  const handleDeleteCategory = async (id: string) => {
    const ok = await confirmAction({
      title: "Supprimer cette catégorie ?",
      message: "Cette catégorie sera définitivement retirée de votre boutique.",
      confirmLabel: "Supprimer",
      variant: "danger",
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/categories?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || "Impossible de supprimer.", "error");
      return;
    }
    showToast("Catégorie supprimée.", "success");
    loadAll();
  };

  const handleAddCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    const res = await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: couponCode.trim().toUpperCase(),
        discountType: couponType,
        discountValue: Number(couponValue) || 10,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || "Erreur.");
      return;
    }
    showToast("Code promo créé !");
    setCouponCode("");
    loadAll();
  };

  const handleToggleCoupon = async (id: string, isActive: boolean) => {
    await fetch("/api/admin/coupons", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isActive: !isActive }),
    });
    loadAll();
  };

  const handleDeleteCoupon = async (id: string) => {
    const ok = await confirmAction({
      title: "Supprimer ce code promo ?",
      message: "Les clients ne pourront plus utiliser ce code promotionnel au panier.",
      confirmLabel: "Supprimer",
      variant: "danger",
    });
    if (!ok) return;
    await fetch(`/api/admin/coupons?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    showToast("Code promo supprimé.", "success");
    loadAll();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Catégories & Sous-catégories dépliables */}
      <section className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-md shadow-slate-900/5 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#FEFCE8] border border-amber-200 flex items-center justify-center text-amber-700">
            <FolderTree className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-slate-900">
              Catégories & Sous-catégories ({parentCategories.length})
            </h2>
            <p className="text-[11px] text-slate-400">
              Cliquez sur une catégorie pour ouvrir ou fermer ses sous-catégories
            </p>
          </div>
        </div>

        <form onSubmit={(e) => handleAddCategory(e, null)} className="flex gap-2">
          <input
            type="text"
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            placeholder="Nouvelle catégorie principale (ex: Droit & Fiscalité)..."
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs bg-slate-50/50 focus:bg-white"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-navy-950 text-gold-500 text-xs font-bold cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> Ajouter
          </button>
        </form>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={catQuery}
            onChange={(e) => setCatQuery(e.target.value)}
            placeholder="Filtrer les catégories et sous-catégories..."
            className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:bg-white"
          />
        </div>

        <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto text-xs pr-1">
          {filteredParents.map((c) => {
            const subs = childrenByParent.get(c.id) || [];
            const isOpen = Boolean(openCatIds[c.id]);
            return (
              <div key={c.id} className="py-2">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => toggleCategoryOpen(c.id)}
                    className="flex items-center gap-2 text-left flex-1 py-1 hover:text-navy-950 cursor-pointer"
                  >
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4 text-amber-700 shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <span className="font-semibold text-slate-800">{c.nameFr}</span>
                    <span className="text-[10px] text-slate-400">
                      ({c.productCount} {c.productCount > 1 ? "livres" : "livre"}
                      {subs.length > 0 ? ` • ${subs.length} sous-cat.` : ""})
                    </span>
                  </button>
                  {c.productCount === 0 && subs.length === 0 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(c.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {isOpen && (
                  <div className="mt-2 ml-6 pl-3 border-l-2 border-amber-200 space-y-2 pb-2">
                    {subs.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic">
                        Aucune sous-catégorie pour le moment.
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {subs.map((sub) => (
                          <div
                            key={sub.id}
                            className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-100"
                          >
                            <span className="font-medium text-slate-700">{sub.nameFr}</span>
                            {sub.productCount === 0 && (
                              <button
                                type="button"
                                onClick={() => handleDeleteCategory(sub.id)}
                                className="text-slate-400 hover:text-rose-600 cursor-pointer"
                                title="Supprimer la sous-catégorie"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <form
                      onSubmit={(e) => handleAddCategory(e, c.id)}
                      className="flex gap-1.5 pt-1"
                    >
                      <input
                        type="text"
                        value={subCatDrafts[c.id] || ""}
                        onChange={(e) =>
                          setSubCatDrafts((prev) => ({ ...prev, [c.id]: e.target.value }))
                        }
                        placeholder="Ajouter une sous-catégorie..."
                        className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] bg-white"
                      />
                      <button
                        type="submit"
                        className="px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-[11px] font-bold hover:bg-slate-800 cursor-pointer"
                      >
                        + Ajouter
                      </button>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Codes Promo / Coupons */}
      <section className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-md shadow-slate-900/5 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#FEFCE8] border border-amber-200 flex items-center justify-center text-amber-700">
            <Tag className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-slate-900">
              Codes Promo ({coupons.length})
            </h2>
            <p className="text-[11px] text-slate-400">
              Remises en pourcentage ou montant fixe FCFA
            </p>
          </div>
        </div>

        <form onSubmit={handleAddCoupon} className="space-y-2.5 text-xs">
          <input
            type="text"
            required
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            placeholder="Code (ex: BIENVENUE15)"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs uppercase font-bold"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={couponType}
              onChange={(e) => setCouponType(e.target.value as typeof couponType)}
              className="rounded-xl border border-slate-200 px-2.5 py-2 text-xs bg-white"
            >
              <option value="PERCENTAGE">Pourcentage (%)</option>
              <option value="FIXED_FCFA">Montant (FCFA)</option>
            </select>
            <input
              type="number"
              min={1}
              required
              value={couponValue}
              onChange={(e) => setCouponValue(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-navy-950 text-gold-500 text-xs font-bold cursor-pointer"
          >
            Créer le code promo
          </button>
        </form>

        <div className="divide-y divide-slate-100 max-h-[340px] overflow-y-auto text-xs pr-1">
          {coupons.length === 0 ? (
            <p className="py-4 text-center text-slate-400">Aucun code promo actif.</p>
          ) : (
            coupons.map((cp) => (
              <div key={cp.id} className="py-2.5 flex items-center justify-between gap-2">
                <div>
                  <span className="font-mono font-bold text-slate-900">{cp.code}</span>
                  <span className="ml-2 text-emerald-700 font-semibold">
                    {cp.discountType === "PERCENTAGE"
                      ? `-${cp.discountValue}%`
                      : `-${formatFcfa(cp.discountValue)}`}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleToggleCoupon(cp.id, cp.isActive)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                      cp.isActive
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {cp.isActive ? "Actif" : "Inactif"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCoupon(cp.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

const LEGAL_SLUGS = [
  { slug: "conditions-generales", label: "Conditions Générales (CGU / CGV)" },
  { slug: "confidentialite", label: "Politique de Confidentialité" },
  { slug: "droits-auteur-licences", label: "Droits d'Auteur & Licences" },
  { slug: "politique-remboursement", label: "Politique de Remboursement" },
];

export function CmsBannersPanel() {
  const { showToast, branding, refreshBranding } = useApp();
  const [siteName, setSiteName] = useState(branding.siteName);
  const [siteTagline, setSiteTagline] = useState(branding.siteTagline);
  const [siteLogoUrl, setSiteLogoUrl] = useState(branding.siteLogoUrl);
  const [savingBrand, setSavingBrand] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    setSiteName(branding.siteName);
    setSiteTagline(branding.siteTagline);
    setSiteLogoUrl(branding.siteLogoUrl);
  }, [branding]);

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBrand(true);
    try {
      const res = await fetch("/api/admin/branding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteName, siteTagline, siteLogoUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Erreur lors de la sauvegarde.", "error");
        return;
      }
      await refreshBranding();
      showToast("Nom et logo de la boutique mis à jour !", "success");
    } finally {
      setSavingBrand(false);
    }
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/branding", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Échec de l'envoi du logo.", "error");
        return;
      }
      setSiteLogoUrl(data.siteLogoUrl || "");
      await refreshBranding();
      showToast("Nouveau logo téléversé et appliqué !", "success");
    } finally {
      setUploadingLogo(false);
      e.target.value = "";
    }
  };

  const [bannerId, setBannerId] = useState<string | undefined>(undefined);
  const [bannerTitle, setBannerTitle] = useState(
    "Découvrez le savoir sans frontières, accessible en un clic."
  );
  const [bannerSubtitle, setBannerSubtitle] = useState(
    "Des milliers d'ouvrages numériques, guides pratiques, formations et ressources d'excellence pour le Bénin, l'Afrique et le monde entier."
  );
  const [bannerCta, setBannerCta] = useState("Explorer le catalogue");
  const [bannerUrl, setBannerUrl] = useState("/catalogue");
  const [savingBanner, setSavingBanner] = useState(false);

  const [pagesMap, setPagesMap] = useState<Record<string, { titleFr: string; contentFr: string }>>(
    {}
  );
  const [selectedSlug, setSelectedSlug] = useState(LEGAL_SLUGS[0].slug);
  const [pageTitle, setPageTitle] = useState(LEGAL_SLUGS[0].label);
  const [pageContent, setPageContent] = useState("");
  const [savingPage, setSavingPage] = useState(false);

  useEffect(() => {
    fetch("/api/admin/cms")
      .then((r) => r.json())
      .then((d) => {
        if (d.banners?.length > 0) {
          const b = d.banners[0];
          setBannerId(b.id);
          setBannerTitle(b.titleFr);
          setBannerSubtitle(b.subtitleFr || "");
          setBannerCta(b.ctaLabelFr || "Explorer le catalogue");
          setBannerUrl(b.ctaUrl || "/catalogue");
        }
        const map: Record<string, { titleFr: string; contentFr: string }> = {};
        for (const p of d.pages || []) {
          map[p.slug] = { titleFr: p.titleFr, contentFr: p.contentFr };
        }
        setPagesMap(map);
        if (map[LEGAL_SLUGS[0].slug]) {
          setPageTitle(map[LEGAL_SLUGS[0].slug].titleFr);
          setPageContent(map[LEGAL_SLUGS[0].slug].contentFr);
        }
      })
      .catch(() => {});
  }, []);

  const handleSelectSlug = (slug: string) => {
    setSelectedSlug(slug);
    const found = pagesMap[slug];
    const def = LEGAL_SLUGS.find((s) => s.slug === slug);
    setPageTitle(found?.titleFr || def?.label || slug);
    setPageContent(found?.contentFr || "");
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBanner(true);
    try {
      const res = await fetch("/api/admin/cms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "BANNER",
          id: bannerId,
          titleFr: bannerTitle,
          subtitleFr: bannerSubtitle,
          ctaLabelFr: bannerCta,
          ctaUrl: bannerUrl,
          isActive: true,
        }),
      });
      if (res.ok) showToast("Bannière d'accueil mise à jour !");
      else showToast("Erreur lors de l'enregistrement.");
    } finally {
      setSavingBanner(false);
    }
  };

  const handleSavePage = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPage(true);
    try {
      const res = await fetch("/api/admin/cms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "PAGE",
          slug: selectedSlug,
          titleFr: pageTitle,
          contentFr: pageContent,
        }),
      });
      if (res.ok) {
        setPagesMap((prev) => ({
          ...prev,
          [selectedSlug]: { titleFr: pageTitle, contentFr: pageContent },
        }));
        showToast("Page légale enregistrée et publiée !");
      } else {
        showToast("Erreur lors de l'enregistrement.");
      }
    } finally {
      setSavingPage(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Identité & Logo de la boutique */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-md shadow-slate-900/5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FEFCE8] border border-amber-200 flex items-center justify-center text-amber-700">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-900">
                Identité de l&apos;en-tête & Logo
              </h2>
              <p className="text-[11px] text-slate-400">
                Modifiez le nom affiché dans l&apos;en-tête du site et du dashboard ainsi que votre logo
              </p>
            </div>
          </div>
          {siteLogoUrl && (
            <button
              type="button"
              onClick={() => setSiteLogoUrl("")}
              className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer"
            >
              Revenir au logo par défaut
            </button>
          )}
        </div>

        <form onSubmit={handleSaveBranding} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end text-xs">
          <div className="md:col-span-3 flex items-center gap-3">
            {siteLogoUrl ? (
              <img
                src={siteLogoUrl}
                alt={siteName}
                className="w-12 h-12 rounded-xl object-cover border border-slate-200 bg-navy-950 shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-navy-950 border border-gold-500/40 text-gold-500 font-serif font-bold text-xl flex items-center justify-center shrink-0">
                {siteName.charAt(0).toUpperCase() || "N"}
              </div>
            )}
            <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-amber-700" />
              <span>{uploadingLogo ? "Envoi..." : "Changer le logo"}</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleUploadLogo}
                className="hidden"
              />
            </label>
          </div>

          <div className="md:col-span-3">
            <label className="block font-semibold text-slate-600 mb-1">Nom de la boutique *</label>
            <input
              type="text"
              required
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="Ex: NEXUSARCANUM"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold"
            />
          </div>

          <div className="md:col-span-4">
            <label className="block font-semibold text-slate-600 mb-1">Sous-titre d&apos;en-tête</label>
            <input
              type="text"
              value={siteTagline}
              onChange={(e) => setSiteTagline(e.target.value)}
              placeholder="SHOP • LIBRAIRIE NUMÉRIQUE"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={savingBrand}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-navy-950 text-gold-500 text-xs font-bold hover:bg-navy-900 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingBrand ? "..." : "Enregistrer"}</span>
            </button>
          </div>
        </form>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Bannière d'accueil */}
      <section className="lg:col-span-5 lg:sticky lg:top-24 self-start bg-white rounded-2xl border border-slate-200 p-5 shadow-md shadow-slate-900/5 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#FEFCE8] border border-amber-200 flex items-center justify-center text-amber-700">
            <ImageIcon className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-slate-900">Bannière principale (Accueil)</h2>
            <p className="text-[11px] text-slate-400">
              Modifiez le titre, l&apos;accroche et le bouton principal de la boutique
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveBanner} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Titre principal *</label>
            <input
              type="text"
              required
              value={bannerTitle}
              onChange={(e) => setBannerTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Sous-titre</label>
            <textarea
              rows={3}
              value={bannerSubtitle}
              onChange={(e) => setBannerSubtitle(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Texte bouton</label>
              <input
                type="text"
                value={bannerCta}
                onChange={(e) => setBannerCta(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Lien bouton</label>
              <input
                type="text"
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={savingBanner}
            className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-navy-950 text-gold-500 text-xs font-bold cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{savingBanner ? "Enregistrement..." : "Publier la bannière"}</span>
          </button>
        </form>
      </section>

      {/* Pages légales */}
      <section className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-md shadow-slate-900/5 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#FEFCE8] border border-amber-200 flex items-center justify-center text-amber-700">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-slate-900">Pages légales & CMS</h2>
            <p className="text-[11px] text-slate-400">
              Éditez vos CGU/CGV, confidentialité, droits d&apos;auteur et remboursements
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {LEGAL_SLUGS.map((item) => (
            <button
              key={item.slug}
              type="button"
              onClick={() => handleSelectSlug(item.slug)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
                selectedSlug === item.slug
                  ? "bg-[#FEFCE8] text-amber-900 border border-amber-300"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSavePage} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Titre de la page *</label>
            <input
              type="text"
              required
              value={pageTitle}
              onChange={(e) => setPageTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Contenu *</label>
            <RichTextEditor
              value={pageContent}
              onChange={setPageContent}
              placeholder="Rédigez ou modifiez le texte légal avec mise en forme complète..."
              minHeight="240px"
            />
          </div>
          <button
            type="submit"
            disabled={savingPage}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-navy-950 text-gold-500 text-xs font-bold cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{savingPage ? "Enregistrement..." : "Enregistrer la page"}</span>
          </button>
        </form>
      </section>
      </div>
    </div>
  );
}

const LITERARY_AUDIT_LABELS: Record<string, string> = {
  PAYMENT_ROUTING_MODE_CHANGED: "Le mode de répartition des paiements a été modifié",
  GATEWAY_SET_DEFAULT: "L'agrégateur de paiement par défaut a été changé",
  GATEWAY_CONFIG_UPDATED: "Les paramètres d'un agrégateur de paiement ont été mis à jour",
  GATEWAY_ACTIVATED: "Un agrégateur de paiement a été activé",
  GATEWAY_DEACTIVATED: "Un agrégateur de paiement a été désactivé",
  GATEWAY_CREATED: "Un nouvel agrégateur de paiement a été ajouté",
  GATEWAY_DELETED: "Un agrégateur de paiement a été supprimé",
  PRODUCT_CREATED: "Un nouvel ouvrage a été publié dans le catalogue",
  PRODUCT_FULL_UPDATE: "La fiche d'un ouvrage a été mise à jour",
  PRODUCT_UPDATE: "Un ouvrage du catalogue a été modifié",
  PRODUCT_TOGGLE_HIDE: "La visibilité d'un ouvrage sur la boutique a été modifiée",
  PRODUCT_ARCHIVE: "Un ouvrage a été archivé",
  PRODUCT_UNARCHIVE: "Un ouvrage archivé a été restauré",
  PRODUCT_DUPLICATE: "Un ouvrage a été dupliqué",
  PRODUCT_CONVERT_TO_COMMERCIAL: "Un produit de démonstration a été passé en vente réelle",
  PRODUCT_DELETED: "Un ouvrage a été supprimé définitivement",
  CATEGORY_CREATED: "Une nouvelle catégorie a été créée",
  COUPON_CREATED: "Un nouveau code promotionnel a été créé",
  BANNER_UPDATED: "La bannière de la page d'accueil a été mise à jour",
  BRANDING_UPDATED: "Le nom ou le logo de la boutique a été modifié",
  CMS_PAGE_UPDATED: "Une page légale de la boutique a été modifiée",
  PASSWORD_CHANGED: "Le mot de passe du compte a été modifié",
  REVIEW_APPROVED: "Un avis client a été approuvé",
  REVIEW_HIDDEN: "Un avis client a été masqué",
  REVIEW_DELETED: "Un avis client a été supprimé",
};

function formatAuditLiterary(action: string): string {
  return LITERARY_AUDIT_LABELS[action] || "Action administrative enregistrée";
}

export function CommunityPanel() {
  const { showToast, confirmAction } = useApp();
  const [reviewFilter, setReviewFilter] = useState<"all" | "pending" | "approved">("all");
  const [reviews, setReviews] = useState<
    Array<{
      id: string;
      rating: number;
      comment: string;
      isApproved: boolean;
      author: string;
      productTitle: string;
      createdAt: string;
    }>
  >([]);
  const [subscribers, setSubscribers] = useState<
    Array<{ id: string; email: string; lang: string; createdAt: string }>
  >([]);

  const loadData = async () => {
    const res = await fetch("/api/admin/community");
    if (res.ok) {
      const data = await res.json();
      setReviews(data.reviews || []);
      setSubscribers(data.subscribers || []);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleReview = async (id: string, isApproved: boolean) => {
    const res = await fetch("/api/admin/community", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isApproved: !isApproved }),
    });
    if (res.ok) {
      showToast(!isApproved ? "Avis approuvé et visible." : "Avis masqué de la boutique.", "success");
      loadData();
    }
  };

  const handleDeleteReview = async (id: string) => {
    const ok = await confirmAction({
      title: "Supprimer cet avis client ?",
      message: "Cet avis sera définitivement effacé de la fiche du livre.",
      confirmLabel: "Supprimer l'avis",
      variant: "danger",
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/community?type=review&id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      showToast("Avis supprimé.", "success");
      loadData();
    }
  };

  const handleDeleteSubscriber = async (id: string, email: string) => {
    const ok = await confirmAction({
      title: "Retirer cet abonné ?",
      message: `L'adresse ${email} sera retirée de votre liste Newsletter.`,
      confirmLabel: "Retirer",
      variant: "danger",
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/community?type=subscriber&id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      showToast("Abonné retiré.", "success");
      loadData();
    }
  };

  const handleExportNewsletterCsv = () => {
    if (subscribers.length === 0) {
      showToast("Aucun abonné à exporter pour le moment.", "warning");
      return;
    }
    const header = "Email,Langue,Date inscription\n";
    const rows = subscribers
      .map(
        (s) =>
          `"${s.email}","${s.lang}","${new Date(s.createdAt).toLocaleDateString("fr-FR")}"`
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `newsletter-nexusarcanum-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`${subscribers.length} abonnés exportés en CSV.`, "success");
  };

  const filteredReviews = reviews.filter((r) => {
    if (reviewFilter === "pending") return !r.isApproved;
    if (reviewFilter === "approved") return r.isApproved;
    return true;
  });
  const pendingCount = reviews.filter((r) => !r.isApproved).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Modération des avis */}
      <section className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-md shadow-slate-900/5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FEFCE8] border border-amber-200 flex items-center justify-center text-amber-700">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-900">
                Avis clients ({reviews.length})
                {pendingCount > 0 && (
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
                    {pendingCount} en attente
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-slate-400">
                Validez ou rejetez les avis avant leur publication sur la boutique
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[11px]">
            {[
              { id: "all", label: "Tous" },
              { id: "pending", label: `En attente (${pendingCount})` },
              { id: "approved", label: "Validés" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setReviewFilter(f.id as typeof reviewFilter)}
                className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer transition ${
                  reviewFilter === f.id
                    ? "bg-[#FEFCE8] text-amber-900 border border-amber-200"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto text-xs">
          {filteredReviews.length === 0 ? (
            <p className="py-8 text-center text-slate-400">
              Aucun avis client dans cette catégorie.
            </p>
          ) : (
            filteredReviews.map((r) => (
              <div key={r.id} className="py-3 space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0 flex items-center flex-wrap gap-2">
                    <span className="font-bold text-slate-900">{r.productTitle}</span>
                    <span className="text-amber-500 font-bold inline-flex items-center gap-0.5">
                      <Star className="w-3 h-3 fill-amber-400" /> {r.rating}/5
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        r.isApproved
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-amber-50 text-amber-800 border border-amber-200"
                      }`}
                    >
                      {r.isApproved ? "Validé" : "En attente"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!r.isApproved ? (
                      <button
                        type="button"
                        onClick={() => handleToggleReview(r.id, r.isApproved)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold hover:bg-emerald-700 cursor-pointer"
                      >
                        <Check className="w-3 h-3" /> Valider
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleToggleReview(r.id, r.isApproved)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-bold hover:bg-slate-200 cursor-pointer"
                      >
                        Masquer
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteReview(r.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold hover:bg-rose-100 cursor-pointer"
                      title="Rejeter et supprimer"
                    >
                      <XCircle className="w-3 h-3" /> Rejeter
                    </button>
                  </div>
                </div>
                <p className="text-slate-600 leading-relaxed">{r.comment}</p>
                <p className="text-[10px] text-slate-400">
                  Par {r.author} • {new Date(r.createdAt).toLocaleDateString("fr-FR")}
                </p>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Abonnés Newsletter */}
      <section className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-md shadow-slate-900/5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FEFCE8] border border-amber-200 flex items-center justify-center text-amber-700">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-900">
                Newsletter ({subscribers.length})
              </h2>
              <p className="text-[11px] text-slate-400">Liste de vos lecteurs abonnés</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleExportNewsletterCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-navy-950 text-gold-500 text-xs font-bold hover:bg-navy-900 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>

        <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto text-xs">
          {subscribers.length === 0 ? (
            <p className="py-8 text-center text-slate-400">
              Aucun abonné inscrit à la newsletter.
            </p>
          ) : (
            subscribers.map((s) => (
              <div key={s.id} className="py-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{s.email}</p>
                  <p className="text-[10px] text-slate-400">
                    Inscrit le {new Date(s.createdAt).toLocaleDateString("fr-FR")} ({s.lang.toUpperCase()})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteSubscriber(s.id, s.email)}
                  className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                  title="Retirer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

export function SecurityAuditPanel() {
  const { showToast } = useApp();
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const loadLogs = async () => {
    const res = await fetch("/api/admin/audit");
    if (res.ok) setLogs((await res.json()).logs || []);
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleChangePwd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Erreur.");
        return;
      }
      showToast("Mot de passe administrateur mis à jour !");
      setCurrentPassword("");
      setNewPassword("");
      loadLogs();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Mot de passe admin */}
      <section className="lg:col-span-5 lg:sticky lg:top-24 self-start bg-white rounded-2xl border border-slate-200 p-5 shadow-md shadow-slate-900/5 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#FEFCE8] border border-amber-200 flex items-center justify-center text-amber-700">
            <KeyRound className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-slate-900">Mot de passe Administrateur</h2>
            <p className="text-[11px] text-slate-400">
              Changez le mot de passe initial pour sécuriser votre accès
            </p>
          </div>
        </div>

        <form onSubmit={handleChangePwd} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Mot de passe actuel</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-600 mb-1">
              Nouveau mot de passe (8+ car., Maj, min, chiffre)
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 rounded-xl bg-navy-950 text-gold-500 text-xs font-bold cursor-pointer"
          >
            {saving ? "Mise à jour..." : "Changer le mot de passe"}
          </button>
        </form>
      </section>

      {/* Journal des opérations */}
      <section className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-md shadow-slate-900/5 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#FEFCE8] border border-amber-200 flex items-center justify-center text-amber-700">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-slate-900">
              Journal des opérations ({logs.length})
            </h2>
            <p className="text-[11px] text-slate-400">
              Traçabilité des actions sensibles et modifications
            </p>
          </div>
        </div>

        <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto text-xs">
          {logs.length === 0 ? (
            <p className="py-6 text-center text-slate-400">Aucune opération enregistrée.</p>
          ) : (
            logs.map((l) => (
              <div key={l.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{formatAuditLiterary(l.action)}</p>
                  <p className="text-[11px] text-slate-400 truncate">Par {l.actor}</p>
                </div>
                <span className="text-[10px] text-slate-400 shrink-0">
                  {new Date(l.createdAt).toLocaleString("fr-FR")}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
