"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Download,
  Eye,
  FileText,
  Globe,
  Heart,
  Share2,
  ShoppingCart,
  Star,
  X,
  Zap,
  AlertTriangle,
} from "lucide-react";
import { StorefrontProduct } from "@/lib/data/storefront";
import { ProductCard, formatFcfa } from "./ProductCard";
import { useApp } from "@/components/providers/AppProvider";

export function ProductDetailClient({
  product,
  similar,
}: {
  product: StorefrontProduct;
  similar: StorefrontProduct[];
}) {
  const { locale, t, addToCart, user, showToast } = useApp();
  const router = useRouter();
  const [tab, setTab] = useState<"desc" | "summary" | "reviews">("desc");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [reviews, setReviews] = useState<
    Array<{ id: string; rating: number; comment: string; authorName: string; createdAt: string }>
  >([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    fetch(`/api/reviews?productId=${encodeURIComponent(product.id)}`)
      .then((r) => r.json())
      .then((d) => setReviews(d.reviews || []))
      .catch(() => {});
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("preview") === "1") {
        setPreviewOpen(true);
      }
    }
  }, [product.id]);

  const handleToggleFavorite = async () => {
    if (!user) {
      showToast("Connectez-vous pour ajouter aux favoris.");
      router.push("/connexion");
      return;
    }
    const res = await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product.id }),
    });
    const data = await res.json();
    if (res.ok) {
      setFavorited(Boolean(data.favorited));
      showToast(data.favorited ? "Ajouté à vos favoris !" : "Retiré de vos favoris.");
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast("Connectez-vous pour publier un avis.");
      router.push("/connexion");
      return;
    }
    setSubmittingReview(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, rating, comment }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Erreur.");
        return;
      }
      showToast(
        locale === "en"
          ? "Thank you! Your review is pending admin approval."
          : "Merci ! Votre avis est en attente de validation par l'équipe.",
        "info"
      );
      setComment("");
    } finally {
      setSubmittingReview(false);
    }
  };

  const title = locale === "en" ? product.titleEn : product.titleFr;
  const subtitle = locale === "en" ? product.subtitleEn : product.subtitleFr;
  const longDesc = locale === "en" ? product.longDescEn : product.longDescFr;
  const summary = locale === "en" ? product.summaryEn : product.summaryFr;
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

  const shareUrl =
    typeof window !== "undefined" ? window.location.href : `https://nexusarcanum.shop/produit/${product.slug}`;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${title} — ${shareUrl}`)}`;
  const facebookHref = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-14">
      {/* Breadcrumb */}
      <nav aria-label="Fil d'Ariane" className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
        <Link href="/" className="hover:text-navy-950">
          {t.nav.home}
        </Link>
        <span>/</span>
        <Link href={`/categories/${product.categorySlug}`} className="hover:text-navy-950">
          {categoryName}
        </Link>
        <span>/</span>
        <span className="text-navy-950 font-semibold">{title}</span>
      </nav>

      {/* Main Product Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Cover */}
        <div className="lg:col-span-4">
          <div className="rounded-2xl overflow-hidden border border-slate-200 bg-navy-950 shadow-xl sticky top-28">
            <img
              src={product.coverUrl}
              alt={title}
              className="w-full aspect-[3/4] object-cover"
            />
          </div>
        </div>

        {/* Details */}
        <div className="lg:col-span-8 space-y-6">
          {product.isDemo && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{t.product.demoBadge} — Prix fictif, aucun paiement réel déclenché.</span>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Link
                href={`/categories/${product.categorySlug}`}
                className="px-2.5 py-1 rounded-full bg-navy-950 text-gold-500 font-semibold"
              >
                {categoryName}
              </Link>
              <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold">
                {product.primaryFormat}
              </span>
              <span className="inline-flex items-center gap-1 text-amber-500 font-bold ml-auto">
                <Star className="w-4 h-4 fill-amber-400" />
                {product.avgRating} ({product.reviewCount} avis)
              </span>
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-navy-950">
              {title}
            </h1>
            {subtitle && <p className="text-base sm:text-lg text-slate-600">{subtitle}</p>}
          </div>

          {/* Metadata grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-400 block">{t.product.author}</span>
              <span className="font-bold text-navy-950">{product.authorName}</span>
            </div>
            <div>
              <span className="text-slate-400 block">{t.product.publisher}</span>
              <span className="font-bold text-navy-950">{product.publisherName}</span>
            </div>
            <div>
              <span className="text-slate-400 block">{t.product.language}</span>
              <span className="font-bold text-navy-950 inline-flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-gold-600" /> {product.language}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Volume</span>
              <span className="font-bold text-navy-950 inline-flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-gold-600" />{" "}
                {product.pageCount ? `${product.pageCount} ${t.product.pages}` : product.primaryFormat}
              </span>
            </div>
          </div>

          {/* Price & CTA */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-5 shadow-sm">
            <div className="flex items-baseline gap-3">
              {product.isFree ? (
                <span className="text-3xl font-extrabold text-emerald-600">
                  {t.product.freeLabel}
                </span>
              ) : (
                <>
                  <span className="text-3xl font-extrabold text-navy-950">
                    {formatFcfa(effectivePrice)}
                  </span>
                  {product.promoPriceFcfa !== null && (
                    <span className="text-base text-slate-400 line-through">
                      {formatFcfa(product.priceFcfa)}
                    </span>
                  )}
                </>
              )}
              <span className="text-xs text-slate-500 ml-auto">
                Livraison numérique instantanée • 0 FCFA de port
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl border-2 border-navy-900 bg-slate-50 text-navy-950 font-bold text-xs sm:text-sm hover:bg-slate-100 transition cursor-pointer"
              >
                <Eye className="w-4 h-4 text-gold-600" />
                <span>
                  {locale === "en" ? "Preview (First 4 pages)" : "Feuilleter (4 premières pages)"}
                </span>
              </button>
              <button
                type="button"
                onClick={handleAdd}
                className="inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-navy-900 text-white font-bold text-xs sm:text-sm hover:bg-navy-800 transition cursor-pointer"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>{t.product.addToCart}</span>
              </button>
              <button
                type="button"
                onClick={handleBuyNow}
                className="inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-gold-500 text-navy-950 font-extrabold text-xs sm:text-sm hover:bg-gold-600 transition shadow-md cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                <span>{t.product.buyNow}</span>
              </button>
            </div>

            {/* Social Share (WhatsApp & Facebook) + Favori */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs">
              <button
                type="button"
                onClick={handleToggleFavorite}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold transition cursor-pointer ${
                  favorited
                    ? "bg-rose-50 border-rose-200 text-rose-600"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${favorited ? "fill-rose-500" : ""}`} />
                <span>{favorited ? "Dans mes favoris" : "Ajouter aux favoris"}</span>
              </button>
              <span className="inline-flex items-center gap-1 text-slate-500 font-medium ml-auto">
                <Share2 className="w-3.5 h-3.5" /> Partager :
              </span>
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 font-semibold hover:bg-emerald-100 transition"
              >
                WhatsApp
              </a>
              <a
                href={facebookHref}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100 transition"
              >
                Facebook
              </a>
            </div>
          </div>

          {/* Tabs: Description / Sommaire / Avis */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="flex border-b border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={() => setTab("desc")}
                className={`px-5 py-3.5 text-sm font-bold border-b-2 transition cursor-pointer ${
                  tab === "desc"
                    ? "border-gold-500 text-navy-950 bg-white"
                    : "border-transparent text-slate-500 hover:text-navy-900"
                }`}
              >
                {t.product.description}
              </button>
              <button
                type="button"
                onClick={() => setTab("summary")}
                className={`px-5 py-3.5 text-sm font-bold border-b-2 transition cursor-pointer ${
                  tab === "summary"
                    ? "border-gold-500 text-navy-950 bg-white"
                    : "border-transparent text-slate-500 hover:text-navy-900"
                }`}
              >
                {t.product.summary}
              </button>
              <button
                type="button"
                onClick={() => setTab("reviews")}
                className={`px-5 py-3.5 text-sm font-bold border-b-2 transition cursor-pointer ${
                  tab === "reviews"
                    ? "border-gold-500 text-navy-950 bg-white"
                    : "border-transparent text-slate-500 hover:text-navy-900"
                }`}
              >
                {t.product.reviews} ({product.reviewCount})
              </button>
            </div>

            <div className="p-6 text-sm text-slate-700 leading-relaxed">
              {tab === "desc" &&
                (/<[a-z][\s\S]*>/i.test(longDesc) ? (
                  <div
                    className="prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-4 [&_blockquote]:border-gold-500 [&_blockquote]:pl-3 [&_blockquote]:italic [&_a]:text-blue-700 [&_a]:underline [&_img]:max-w-full [&_img]:rounded-xl"
                    dangerouslySetInnerHTML={{ __html: longDesc }}
                  />
                ) : (
                  <p className="whitespace-pre-line">{longDesc}</p>
                ))}
              {tab === "summary" && (
                <ul className="space-y-2">
                  {summary.split("\n").map((line, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <BookOpen className="w-4 h-4 text-gold-600 shrink-0 mt-0.5" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              )}
              {tab === "reviews" && (
                <div className="space-y-5">
                  <form
                    onSubmit={handleSubmitReview}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3"
                  >
                    <p className="font-bold text-navy-950 text-xs">Laisser un avis</p>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className="p-0.5 cursor-pointer"
                          aria-label={`${star} étoiles`}
                        >
                          <Star
                            className={`w-5 h-5 ${
                              star <= rating
                                ? "fill-amber-400 text-amber-400"
                                : "text-slate-300"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    <textarea
                      required
                      rows={2}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Partagez votre avis sur cet ouvrage..."
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
                    />
                    <button
                      type="submit"
                      disabled={submittingReview}
                      className="px-4 py-2 rounded-lg bg-navy-950 text-gold-500 text-xs font-bold cursor-pointer"
                    >
                      {submittingReview ? "Publication..." : "Publier mon avis"}
                    </button>
                  </form>

                  {reviews.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      Soyez le premier lecteur à publier un avis sur cet ouvrage.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {reviews.map((rev) => (
                        <div
                          key={rev.id}
                          className="p-4 rounded-xl bg-white border border-slate-200 space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-navy-950">{rev.authorName}</span>
                            <span className="inline-flex items-center gap-0.5 text-amber-500 font-bold">
                              <Star className="w-3.5 h-3.5 fill-amber-400" /> {rev.rating}/5
                            </span>
                          </div>
                          <p className="text-xs text-slate-600">{rev.comment}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Similar Products */}
      {similar.length > 0 && (
        <section className="space-y-6 pt-6 border-t border-slate-200">
          <h2 className="font-serif text-2xl font-bold text-navy-950">
            {t.product.similar}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {similar.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Modale Glassmorphism — Aperçu des 4 premières pages avec filigrane */}
      {previewOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setPreviewOpen(false)}
          className="fixed inset-0 z-[70] bg-navy-950/55 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl h-[86vh] rounded-3xl bg-white/95 backdrop-blur-2xl border border-white/70 shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gold-600">
                  {locale === "en"
                    ? "Protected Preview — First 4 Pages (Watermarked)"
                    : "Aperçu protégé — 4 premières pages avec filigrane"}
                </p>
                <h3 className="font-serif font-bold text-navy-950 text-sm sm:text-base truncate">
                  {title}
                </h3>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setPreviewOpen(false);
                    handleBuyNow();
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gold-500 text-navy-950 text-xs font-extrabold hover:bg-gold-600 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{t.product.buyNow}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewOpen(false)}
                  className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 cursor-pointer"
                  aria-label="Fermer l'aperçu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <iframe
              src={`/api/products/${encodeURIComponent(product.slug)}/preview#toolbar=0&navpanes=0`}
              title={`Aperçu 4 pages — ${title}`}
              className="flex-1 w-full bg-slate-100"
            />
          </div>
        </div>
      )}
    </div>
  );
}

