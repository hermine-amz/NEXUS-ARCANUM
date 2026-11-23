"use client";

import React, { useMemo, useState } from "react";
import { Filter, Search, X } from "lucide-react";
import { StorefrontCategory, StorefrontProduct } from "@/lib/data/storefront";
import { ProductCard } from "./ProductCard";
import { useApp } from "@/components/providers/AppProvider";

export function CatalogView({
  categories,
  products,
  initialCategorySlug = "",
  initialQuery = "",
  initialFilter = "",
}: {
  categories: StorefrontCategory[];
  products: StorefrontProduct[];
  initialCategorySlug?: string;
  initialQuery?: string;
  initialFilter?: string;
}) {
  const { locale } = useApp();
  const [query, setQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategorySlug);
  const [selectedFormat, setSelectedFormat] = useState("");
  const [selectedFilter, setSelectedFilter] = useState(initialFilter);
  const [sortBy, setSortBy] = useState<"default" | "price_asc" | "price_desc">("default");

  const formats = useMemo(
    () => Array.from(new Set(products.map((p) => p.primaryFormat))),
    [products]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = products.filter((p) => {
      if (selectedCategory && p.categorySlug !== selectedCategory) return false;
      if (selectedFormat && p.primaryFormat !== selectedFormat) return false;
      if (selectedFilter === "free" && !p.isFree) return false;
      if (selectedFilter === "promo" && p.promoPriceFcfa === null) return false;
      if (selectedFilter === "new" && !p.isNewArrival) return false;
      if (selectedFilter === "bestsellers" && !p.isBestseller) return false;
      if (q) {
        const hay = `${p.titleFr} ${p.titleEn} ${p.subtitleFr ?? ""} ${p.authorName} ${
          p.categoryNameFr
        } ${p.collectionTag ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (sortBy === "price_asc") {
      list = [...list].sort(
        (a, b) =>
          (a.isFree ? 0 : a.promoPriceFcfa ?? a.priceFcfa) -
          (b.isFree ? 0 : b.promoPriceFcfa ?? b.priceFcfa)
      );
    } else if (sortBy === "price_desc") {
      list = [...list].sort(
        (a, b) =>
          (b.isFree ? 0 : b.promoPriceFcfa ?? b.priceFcfa) -
          (a.isFree ? 0 : a.promoPriceFcfa ?? a.priceFcfa)
      );
    }
    return list;
  }, [products, query, selectedCategory, selectedFormat, selectedFilter, sortBy]);

  const resetAll = () => {
    setQuery("");
    setSelectedCategory("");
    setSelectedFormat("");
    setSelectedFilter("");
    setSortBy("default");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-navy-950">
            {selectedCategory
              ? categories.find((c) => c.slug === selectedCategory)?.[locale === "en" ? "nameEn" : "nameFr"] || "Catalogue"
              : "Catalogue Numérique"}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            {filtered.length} {filtered.length > 1 ? "ouvrages disponibles" : "ouvrage disponible"}
          </p>
        </div>

        {/* Search & Sort */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={locale === "en" ? "Search by title or author..." : "Filtrer par titre, auteur..."}
              aria-label={locale === "en" ? "Search by title or author" : "Filtrer par titre ou auteur"}
              className="pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm w-full sm:w-64"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            aria-label="Trier par"
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium"
          >
            <option value="default">Pertinence</option>
            <option value="price_asc">Prix croissant</option>
            <option value="price_desc">Prix décroissant</option>
          </select>
        </div>
      </div>

      {/* Filters bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-navy-900 mr-2">
          <Filter className="w-3.5 h-3.5 text-gold-600" />
          Filtres :
        </span>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          aria-label="Catégorie"
          className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium bg-slate-50"
        >
          <option value="">Toutes les {categories.length} catégories</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {locale === "en" ? c.nameEn : c.nameFr}
            </option>
          ))}
        </select>

        <select
          value={selectedFormat}
          onChange={(e) => setSelectedFormat(e.target.value)}
          aria-label="Format"
          className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium bg-slate-50"
        >
          <option value="">Tous formats</option>
          {formats.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>

        <select
          value={selectedFilter}
          onChange={(e) => setSelectedFilter(e.target.value)}
          aria-label="Sélection"
          className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium bg-slate-50"
        >
          <option value="">Toutes sélections</option>
          <option value="new">Nouveautés</option>
          <option value="bestsellers">Meilleures ventes</option>
          <option value="promo">Promotions</option>
          <option value="free">Gratuits</option>
        </select>

        {(query || selectedCategory || selectedFormat || selectedFilter) && (
          <button
            type="button"
            onClick={resetAll}
            className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:underline cursor-pointer"
          >
            <X className="w-3.5 h-3.5" /> Réinitialiser
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
          <p className="font-serif text-xl font-bold text-navy-950">
            Aucun produit ne correspond à votre recherche.
          </p>
          <p className="text-sm text-slate-500">
            Essayez d&apos;élargir vos critères ou réinitialisez les filtres.
          </p>
          <button
            type="button"
            onClick={resetAll}
            className="px-5 py-2.5 rounded-xl bg-navy-900 text-white text-sm font-semibold hover:bg-navy-800 transition cursor-pointer"
          >
            Voir tout le catalogue
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          {filtered.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

