"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Star,
  Zap,
  Mail,
} from "lucide-react";
import { StorefrontCategory, StorefrontProduct } from "@/lib/data/storefront";
import { ProductCard } from "@/components/catalog/ProductCard";
import { useApp } from "@/components/providers/AppProvider";

export function HomeClient({
  categories,
  products,
  dbConnected,
}: {
  categories: StorefrontCategory[];
  products: StorefrontProduct[];
  dbConnected: boolean;
}) {
  const { locale, t } = useApp();
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState<string | null>(null);

  const newArrivals = products.filter((p) => p.isNewArrival).slice(0, 4);
  const bestsellers = products.filter((p) => p.isBestseller).slice(0, 4);
  const recommended = products.filter((p) => p.isRecommended).slice(0, 4);
  const promotions = products.filter((p) => p.promoPriceFcfa !== null).slice(0, 4);
  const freeBooks = products.filter((p) => p.isFree).slice(0, 4);

  const collections = Array.from(
    new Set(products.map((p) => p.collectionTag).filter(Boolean) as string[])
  );
  const featuredAuthors = Array.from(new Set(products.map((p) => p.authorName))).slice(0, 6);

  const handleNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewsletterStatus(null);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newsletterEmail, lang: locale }),
      });
      const data = await res.json();
      setNewsletterStatus(
        res.ok
          ? locale === "en"
            ? "Subscribed successfully!"
            : "Inscription confirmée !"
          : data.error || "Erreur"
      );
      if (res.ok) setNewsletterEmail("");
    } catch {
      setNewsletterStatus("Erreur réseau.");
    }
  };

  return (
    <div className="space-y-16 pb-16">
      {!dbConnected && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 text-xs py-2 px-4 text-center">
          Mode aperçu catalogue : vérifiez les droits Supabase (<code>GRANT</code>) pour activer les comptes, commandes et paiements en direct.
        </div>
      )}

      {/* 4. Bannière principale & 5. Présentation de la librairie */}
      <section className="relative bg-navy-950 text-white overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.18),transparent_55%)]"
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 relative grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-6">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gold-500/15 border border-gold-500/40 text-gold-500 text-xs font-semibold tracking-wide">
              <Sparkles className="w-3.5 h-3.5" />
              {t.hero.badge}
            </span>
            <h1 className="font-serif text-3xl sm:text-5xl font-bold leading-tight text-white">
              {t.hero.title}
            </h1>
            <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
              {t.hero.subtitle}
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href="/catalogue"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gold-500 text-navy-950 font-bold text-sm hover:bg-gold-600 transition shadow-lg shadow-gold-500/20"
              >
                <span>{t.hero.exploreCta}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/catalogue?filter=free"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white/10 text-white border border-white/20 font-semibold text-sm hover:bg-white/15 transition"
              >
                <BookOpen className="w-4 h-4 text-gold-500" />
                <span>{t.hero.freeCta}</span>
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/10 text-xs sm:text-sm">
              <div className="flex items-center gap-2 text-slate-300">
                <Zap className="w-4 h-4 text-gold-500 shrink-0" />
                <span>Livraison instantanée</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <ShieldCheck className="w-4 h-4 text-gold-500 shrink-0" />
                <span>Paiement sécurisé</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-gold-500 shrink-0" />
                <span>16 catégories riches</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 hidden sm:grid grid-cols-2 gap-4">
            {products.slice(0, 2).map((p) => (
              <Link
                key={p.slug}
                href={`/produit/${p.slug}`}
                className="group rounded-2xl overflow-hidden border border-gold-500/30 bg-navy-900 shadow-2xl hover:-translate-y-1 transition"
              >
                <img
                  src={p.coverUrl}
                  alt={p.titleFr}
                  className="w-full aspect-[3/4] object-cover"
                />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Accès aux 16 catégories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-navy-950">
              {t.sections.categoriesTitle}
            </h2>
            <p className="text-sm text-slate-600 mt-1">{t.sections.categoriesSubtitle}</p>
          </div>
          <Link
            href="/catalogue"
            className="text-sm font-semibold text-navy-900 hover:text-gold-600 inline-flex items-center gap-1"
          >
            Tout voir <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/categories/${cat.slug}`}
              className="group p-4 rounded-2xl bg-white border border-slate-200 hover:border-gold-500 hover:shadow-md transition flex flex-col justify-between gap-2"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-bold text-gold-600">
                  {String(cat.sortOrder).padStart(2, "0")}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                  {cat.productCount} {cat.productCount > 1 ? "titres" : "titre"}
                </span>
              </div>
              <h3 className="font-semibold text-sm sm:text-base text-navy-950 group-hover:text-gold-600 transition">
                {locale === "en" ? cat.nameEn : cat.nameFr}
              </h3>
              <p className="text-xs text-slate-500 line-clamp-2">
                {locale === "en" ? cat.descriptionEn : cat.descriptionFr}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* 7. Nouveautés */}
      <ProductSection title={t.sections.newArrivals} href="/catalogue?filter=new" items={newArrivals} />

      {/* 8. Meilleures ventes */}
      <ProductSection
        title={t.sections.bestsellers}
        href="/catalogue?filter=bestsellers"
        items={bestsellers}
      />

      {/* 9. Collections thématiques */}
      <section className="bg-navy-950 text-white py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
          <div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold">
              {t.sections.collections}
            </h2>
            <p className="text-sm text-slate-300 mt-1">
              Des sélections éditoriales conçues pour approfondir un domaine clé.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {collections.map((col) => (
              <Link
                key={col}
                href={`/catalogue?q=${encodeURIComponent(col)}`}
                className="p-6 rounded-2xl bg-navy-900 border border-gold-500/30 hover:border-gold-500 transition flex flex-col justify-between gap-4"
              >
                <span className="text-xs uppercase tracking-widest text-gold-500 font-bold">
                  Collection
                </span>
                <h3 className="font-serif text-xl font-bold">{col}</h3>
                <span className="text-xs text-slate-300 inline-flex items-center gap-1">
                  Découvrir la sélection <ArrowRight className="w-3.5 h-3.5 text-gold-500" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 10. Livres recommandés */}
      <ProductSection
        title={t.sections.recommended}
        href="/catalogue"
        items={recommended}
      />

      {/* 11. Promotions */}
      <ProductSection
        title={t.sections.promotions}
        href="/catalogue?filter=promo"
        items={promotions}
      />

      {/* 12. Livres gratuits */}
      <ProductSection
        title={t.sections.freeBooks}
        href="/catalogue?filter=free"
        items={freeBooks}
      />

      {/* 13. Auteurs à découvrir */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-navy-950 mb-6">
          {t.sections.authors}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {featuredAuthors.map((author) => (
            <Link
              key={author}
              href={`/catalogue?q=${encodeURIComponent(author)}`}
              className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-gold-500 text-center space-y-2 transition"
            >
              <div className="w-12 h-12 rounded-full bg-navy-900 text-gold-500 font-serif font-bold text-lg flex items-center justify-center mx-auto">
                {author.charAt(0)}
              </div>
              <p className="font-semibold text-sm text-navy-950 truncate">{author}</p>
              <p className="text-[11px] text-slate-500">Auteur partenaire</p>
            </Link>
          ))}
        </div>
      </section>

      {/* 14. Avis clients */}
      <section className="bg-slate-100 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-navy-950 mb-8">
            {t.sections.reviews}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: "Amina S. — Cotonou",
                text: "L'extrait PDF gratuit permet de vérifier la qualité du contenu avant d'acheter. Téléchargement fluide sur téléphone.",
              },
              {
                name: "Marc K. — Abidjan",
                text: "Une vraie librairie généraliste africaine avec des titres en entrepreneuriat, IA et histoire difficiles à trouver ailleurs.",
              },
              {
                name: "Clarisse D. — Dakar",
                text: "Interface claire, prix affichés en FCFA sans surprise et bibliothèque personnelle très pratique.",
              },
            ].map((rev) => (
              <div
                key={rev.name}
                className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3"
              >
                <div className="flex gap-1 text-amber-400">
                  {[...Array(5)].map((_, idx) => (
                    <Star key={idx} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">&ldquo;{rev.text}&rdquo;</p>
                <p className="text-xs font-bold text-navy-950">{rev.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 15. Newsletter */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="rounded-3xl bg-navy-950 text-white p-8 sm:p-12 border border-gold-500/40 text-center space-y-4 shadow-xl">
          <Mail className="w-8 h-8 text-gold-500 mx-auto" />
          <h2 className="font-serif text-2xl sm:text-3xl font-bold">
            {t.sections.newsletterTitle}
          </h2>
          <p className="text-sm text-slate-300 max-w-xl mx-auto">
            {t.sections.newsletterSubtitle}
          </p>
          <form
            onSubmit={handleNewsletter}
            className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto pt-2"
          >
            <input
              type="email"
              required
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              placeholder="votre@email.com"
              className="flex-1 rounded-xl bg-white text-slate-900 px-4 py-3 text-sm"
            />
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-gold-500 text-navy-950 font-bold text-sm hover:bg-gold-600 transition cursor-pointer"
            >
              {t.sections.newsletterButton}
            </button>
          </form>
          {newsletterStatus && (
            <p className="text-xs text-gold-500 font-medium pt-1">{newsletterStatus}</p>
          )}
        </div>
      </section>
    </div>
  );
}

function ProductSection({
  title,
  href,
  items,
}: {
  title: string;
  href: string;
  items: StorefrontProduct[];
}) {
  if (items.length === 0) return null;
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6">
      <div className="flex items-end justify-between gap-4 mb-6">
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-navy-950">{title}</h2>
        <Link
          href={href}
          className="text-sm font-semibold text-navy-900 hover:text-gold-600 inline-flex items-center gap-1 shrink-0"
        >
          Voir plus <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {items.map((product) => (
          <ProductCard key={product.slug} product={product} />
        ))}
      </div>
    </section>
  );
}

