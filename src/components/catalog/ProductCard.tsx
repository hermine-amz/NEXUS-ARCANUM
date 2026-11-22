"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, ShoppingCart, Star, Zap } from "lucide-react";
import { StorefrontProduct } from "@/lib/data/storefront";
import { useApp } from "@/components/providers/AppProvider";

export function formatFcfa(amount: number): string {
  return `${amount.toLocaleString("fr-FR")} FCFA`;
}

export function ProductCard({ product }: { product: StorefrontProduct }) {
  const { locale, t, addToCart } = useApp();
  const router = useRouter();

  const title = locale === "en" ? product.titleEn : product.titleFr;
  const categoryName = locale === "en" ? product.categoryNameEn : product.categoryNameFr;
  const effectivePrice = product.isFree
    ? 0
    : product.promoPriceFcfa ?? product.priceFcfa;

  const handleAdd = () => {
    addToCart({
      id: product.id,
      slug: product.slug,
      titleFr: product.titleFr,
      titleEn: product.titleEn,
      coverUrl: product.coverUrl,
      primaryFormat: product.primaryFormat,
      priceFcfa: product.priceFcfa,
      promoPriceFcfa: product.promoPriceFcfa,
      isFree: product.isFree,
      isDemo: product.isDemo,
      authorName: product.authorName,
    });
  };

  const handleBuyNow = () => {
    handleAdd();
    router.push("/panier");
  };

  return (
    <article className="group bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl hover:border-gold-500/60 transition-all duration-300 flex flex-col">
      {/* Cover */}
      <Link
        href={`/produit/${product.slug}`}
        className="relative aspect-[3/4] bg-navy-950 overflow-hidden block"
      >
        <img
          src={product.coverUrl}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
          <span className="px-2 py-0.5 rounded-md bg-navy-950/90 text-gold-500 text-[10px] font-bold tracking-wider border border-gold-500/40">
            {product.primaryFormat}
          </span>
          {product.isDemo && (
            <span className="px-2 py-0.5 rounded-md bg-amber-500 text-navy-950 text-[10px] font-extrabold tracking-wide">
              DÉMO
            </span>
          )}
        </div>
        {product.promoPriceFcfa !== null && !product.isFree && (
          <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-bold">
            PROMO
          </span>
        )}
      </Link>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
          <span className="truncate font-medium text-navy-800">{categoryName}</span>
          <span className="inline-flex items-center gap-1 text-amber-500 font-semibold shrink-0">
            <Star className="w-3.5 h-3.5 fill-amber-400" />
            {product.avgRating}
          </span>
        </div>

        <Link
          href={`/produit/${product.slug}`}
          className="font-serif font-bold text-navy-950 text-base leading-snug line-clamp-2 hover:text-gold-600 transition"
        >
          {title}
        </Link>

        <p className="text-xs text-slate-500 truncate">{product.authorName}</p>

        {product.isDemo && (
          <p className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
            {t.product.demoBadge}
          </p>
        )}

        {/* Price */}
        <div className="mt-auto pt-2 flex items-baseline gap-2">
          {product.isFree ? (
            <span className="text-lg font-extrabold text-emerald-600">
              {t.product.freeLabel}
            </span>
          ) : (
            <>
              <span className="text-lg font-extrabold text-navy-950">
                {formatFcfa(effectivePrice)}
              </span>
              {product.promoPriceFcfa !== null && (
                <span className="text-xs text-slate-400 line-through">
                  {formatFcfa(product.priceFcfa)}
                </span>
              )}
            </>
          )}
        </div>

        {/* 4 mandatory action buttons from Section 5 */}
        <div className="pt-2 space-y-2">
          <div className="grid grid-cols-2 gap-1.5">
            <a
              href={product.extractUrl}
              download
              className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg border border-slate-200 text-slate-700 hover:border-navy-900 hover:bg-slate-50 text-[11px] font-semibold transition"
              title={t.product.downloadExtract}
            >
              <Download className="w-3.5 h-3.5 text-gold-600 shrink-0" />
              <span className="truncate">Extrait PDF</span>
            </a>
            <Link
              href={`/produit/${product.slug}`}
              className="inline-flex items-center justify-center px-2.5 py-2 rounded-lg border border-slate-200 text-navy-900 hover:bg-slate-50 text-[11px] font-semibold transition"
            >
              Découvrir
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={handleAdd}
              className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg bg-navy-900 text-white hover:bg-navy-800 text-[11px] font-semibold transition cursor-pointer"
            >
              <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Panier</span>
            </button>
            <button
              type="button"
              onClick={handleBuyNow}
              className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg bg-gold-500 text-navy-950 hover:bg-gold-600 text-[11px] font-bold transition cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Acheter</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

