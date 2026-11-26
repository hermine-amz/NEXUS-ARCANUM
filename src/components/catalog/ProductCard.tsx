"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, ShoppingCart, Star, Zap } from "lucide-react";
import { StorefrontProduct } from "@/lib/data/storefront";
import { useApp } from "@/components/providers/AppProvider";

export function formatFcfa(amount: number): string {
  return `${amount.toLocaleString("fr-FR")} FCFA`;
}

export function ProductCard({ product }: { product: StorefrontProduct }) {
  const { locale, t, addToCart } = useApp();
  const router = useRouter();
  const isEn = locale === "en";

  const title = isEn ? product.titleEn : product.titleFr;
  const categoryName = isEn ? product.categoryNameEn : product.categoryNameFr;
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
    <article className="group bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 hover:border-gold-500/70 transition-all duration-300 flex flex-col">
      {/* Compact professional cover */}
      <Link
        href={`/produit/${product.slug}`}
        className="relative aspect-[4/4.2] bg-navy-950 overflow-hidden block"
      >
        <img
          src={product.coverUrl}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-navy-950/75 via-navy-950/20 to-transparent pointer-events-none" />
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          <span className="px-2 py-0.5 rounded-md bg-navy-950/90 text-gold-500 text-[10px] font-bold tracking-wider border border-gold-500/40 backdrop-blur-xs">
            {product.primaryFormat}
          </span>
          {product.isDemo && (
            <span className="px-2 py-0.5 rounded-md bg-amber-500 text-navy-950 text-[10px] font-extrabold tracking-wide">
              {isEn ? "DEMO" : "DÉMO"}
            </span>
          )}
        </div>
        {product.promoPriceFcfa !== null && !product.isFree && (
          <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-bold shadow-xs">
            {isEn ? "DEAL" : "PROMO"}
          </span>
        )}
        <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-navy-950/85 text-amber-400 text-[10px] font-bold backdrop-blur-xs">
          <Star className="w-3 h-3 fill-amber-400" />
          {product.avgRating}
        </span>
      </Link>

      {/* Compact Content */}
      <div className="p-3.5 flex-1 flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold text-navy-800/80 truncate uppercase tracking-wide">
          {categoryName}
        </span>

        <Link
          href={`/produit/${product.slug}`}
          className="font-serif font-bold text-navy-950 text-[15px] leading-snug line-clamp-2 hover:text-gold-600 transition min-h-[2.4rem]"
        >
          {title}
        </Link>

        <p className="text-[11px] text-slate-500 truncate">{product.authorName}</p>

        {/* Price */}
        <div className="mt-auto pt-1.5 flex items-baseline gap-2 border-t border-slate-100">
          {product.isFree ? (
            <span className="text-base font-extrabold text-emerald-600">
              {t.product.freeLabel}
            </span>
          ) : (
            <>
              <span className="text-base font-extrabold text-navy-950">
                {formatFcfa(effectivePrice)}
              </span>
              {product.promoPriceFcfa !== null && (
                <span className="text-[11px] text-slate-400 line-through">
                  {formatFcfa(product.priceFcfa)}
                </span>
              )}
            </>
          )}
        </div>

        {/* Clean Action Buttons */}
        <div className="pt-1.5 space-y-1.5">
          <div className="grid grid-cols-2 gap-1.5">
            <Link
              href={`/produit/${product.slug}?preview=1`}
              className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:border-navy-900 hover:bg-slate-50 text-[11px] font-semibold transition"
              title={isEn ? "Preview first 4 pages" : "Feuilleter les 4 premières pages"}
            >
              <Eye className="w-3.5 h-3.5 text-gold-600 shrink-0" />
              <span className="truncate">{isEn ? "4p Preview" : "Aperçu 4p"}</span>
            </Link>
            <Link
              href={`/produit/${product.slug}`}
              className="inline-flex items-center justify-center px-2 py-1.5 rounded-lg border border-slate-200 text-navy-900 hover:bg-slate-50 text-[11px] font-semibold transition"
            >
              {isEn ? "Details" : "Découvrir"}
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={handleAdd}
              className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-navy-900 text-white hover:bg-navy-800 text-[11px] font-semibold transition cursor-pointer"
            >
              <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{isEn ? "Cart" : "Panier"}</span>
            </button>
            <button
              type="button"
              onClick={handleBuyNow}
              className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-gold-500 text-navy-950 hover:bg-gold-600 text-[11px] font-bold transition cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{isEn ? "Buy" : "Acheter"}</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
