"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Search,
  ShoppingCart,
  BookOpen,
  User,
  Menu,
  X,
  Globe,
  Shield,
  Home,
  LayoutGrid,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { useApp } from "@/components/providers/AppProvider";
import { DEMO_CATEGORIES } from "@/lib/data/demo-catalog";

export function Header() {
  const pathname = usePathname();
  const { locale, setLocale, t, cart, user } = useApp();
  const [query, setQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [navCategories, setNavCategories] = useState(
    DEMO_CATEGORIES.map((c) => ({ slug: c.slug, nameFr: c.nameFr, nameEn: c.nameEn }))
  );
  const router = useRouter();

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.categories) && d.categories.length > 0) {
          setNavCategories(d.categories);
        }
      })
      .catch(() => {});
  }, []);

  const hideChrome =
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/connexion") ||
    pathname?.startsWith("/inscription") ||
    pathname?.startsWith("/pages/");

  if (hideChrome) {
    return null;
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/catalogue?q=${encodeURIComponent(q)}` : "/catalogue");
    setMobileMenuOpen(false);
  };

  const isAdmin =
    user?.roles?.some((r) => r === "SUPER_ADMIN" || r === "ADMIN" || r === "EDITOR") ?? false;

  return (
    <>
      <header className="sticky top-0 z-40 bg-navy-950 text-white border-b border-white/10 shadow-lg">
        {/* Top bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <Link href="/" className="shrink-0">
              <Logo light />
            </Link>
          </div>

          {/* Search bar desktop */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl relative">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.nav.searchPlaceholder}
              aria-label={t.nav.searchPlaceholder}
              className="w-full rounded-full bg-white/10 border border-white/15 pl-4 pr-12 py-2.5 text-sm text-white placeholder:text-slate-300 focus:bg-white focus:text-slate-900 focus:placeholder:text-slate-400 transition"
            />
            <button
              type="submit"
              aria-label="Rechercher"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-gold-500 text-navy-950 flex items-center justify-center hover:bg-gold-600 transition"
            >
              <Search className="w-4 h-4" />
            </button>
          </form>

          {/* Right actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setLocale(locale === "fr" ? "en" : "fr")}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/15 text-xs font-semibold hover:border-gold-500 transition"
              aria-label="Changer de langue"
            >
              <Globe className="w-3.5 h-3.5 text-gold-500" />
              <span>{locale.toUpperCase()}</span>
            </button>

            <Link
              href="/compte/bibliotheque"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium hover:bg-white/10 transition"
            >
              <BookOpen className="w-4 h-4 text-gold-500" />
              <span className="hidden xl:inline">{t.nav.library}</span>
            </Link>

            {isAdmin && (
              <Link
                href="/admin"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-gold-500/15 text-gold-500 border border-gold-500/30 hover:bg-gold-500/25 transition"
              >
                <Shield className="w-4 h-4" />
                <span className="hidden xl:inline">{t.nav.admin}</span>
              </Link>
            )}

            <Link
              href={user ? "/compte" : "/connexion"}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium hover:bg-white/10 transition"
            >
              <User className="w-4 h-4 text-gold-500" />
              <span className="hidden lg:inline">
                {user ? user.firstName : t.nav.account}
              </span>
            </Link>

            <Link
              href="/panier"
              className="relative inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gold-500 text-navy-950 font-semibold text-sm hover:bg-gold-600 transition"
              aria-label={t.nav.cart}
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden sm:inline">{t.nav.cart}</span>
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full bg-navy-950 text-gold-500 text-xs font-bold">
                {cart.length}
              </span>
            </Link>
          </div>
        </div>

        {/* Secondary navigation bar desktop */}
        <nav
          aria-label="Navigation principale"
          className="hidden lg:block bg-navy-900/90 border-t border-white/10"
        >
          <div className="max-w-7xl mx-auto px-6 h-11 flex items-center gap-6 text-sm">
            <Link href="/" className="hover:text-gold-500 transition font-medium">
              {t.nav.home}
            </Link>
            <div
              className="relative"
              onMouseEnter={() => setCategoriesOpen(true)}
              onMouseLeave={() => setCategoriesOpen(false)}
            >
              <button
                type="button"
                onClick={() => setCategoriesOpen(!categoriesOpen)}
                className="inline-flex items-center gap-1.5 hover:text-gold-500 transition font-medium py-2"
              >
                <LayoutGrid className="w-4 h-4 text-gold-500" />
                <span>
                  {t.nav.categories} ({navCategories.length})
                </span>
              </button>
              {categoriesOpen && (
                <div className="absolute left-0 top-full w-[680px] bg-white text-slate-900 rounded-b-2xl shadow-2xl border border-slate-200 p-5 grid grid-cols-2 gap-2 z-50 max-h-[70vh] overflow-y-auto">
                  {navCategories.map((cat) => (
                    <Link
                      key={cat.slug}
                      href={`/categories/${cat.slug}`}
                      onClick={() => setCategoriesOpen(false)}
                      className="px-3 py-2 rounded-lg hover:bg-slate-100 text-sm font-medium flex items-center justify-between transition"
                    >
                      <span>{locale === "en" ? cat.nameEn : cat.nameFr}</span>
                      <span className="text-xs text-slate-400">→</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <Link href="/catalogue?filter=new" className="hover:text-gold-500 transition">
              {t.nav.newArrivals}
            </Link>
            <Link href="/catalogue?filter=bestsellers" className="hover:text-gold-500 transition">
              {t.nav.bestsellers}
            </Link>
            <Link href="/catalogue?filter=promo" className="hover:text-gold-500 transition">
              {t.nav.promotions}
            </Link>
            <Link href="/admin" className="ml-auto text-xs text-gold-500/90 hover:text-gold-500 transition">
              {t.nav.admin}
            </Link>
          </div>
        </nav>

        {/* Mobile search & drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-navy-900 border-t border-white/10 px-4 py-4 space-y-4">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.nav.searchPlaceholder}
                className="w-full rounded-xl bg-white text-slate-900 pl-4 pr-11 py-2.5 text-sm"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-navy-950 p-1"
                aria-label="Rechercher"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Link
                href="/catalogue"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10"
              >
                Catalogue complet
              </Link>
              <Link
                href="/catalogue?filter=promo"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10"
              >
                {t.nav.promotions}
              </Link>
              <Link
                href="/compte/bibliotheque"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10"
              >
                {t.nav.library}
              </Link>
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg bg-gold-500/20 text-gold-500"
              >
                {t.nav.admin}
              </Link>
            </div>
            <div className="pt-2 border-t border-white/10">
              <p className="text-xs uppercase tracking-wider text-gold-500 mb-2">
                Catégories ({navCategories.length})
              </p>
              <div className="grid grid-cols-1 gap-1 max-h-56 overflow-y-auto text-sm">
                {navCategories.map((cat) => (
                  <Link
                    key={cat.slug}
                    href={`/categories/${cat.slug}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-1.5 text-slate-200 hover:text-gold-500"
                  >
                    {locale === "en" ? cat.nameEn : cat.nameFr}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Mobile bottom quick navigation */}
      <nav
        aria-label="Navigation mobile rapide"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-navy-950 text-white border-t border-white/15 grid grid-cols-4 h-16 text-[11px]"
      >
        <Link href="/" className="flex flex-col items-center justify-center gap-1 hover:text-gold-500">
          <Home className="w-5 h-5" />
          <span>{t.nav.home}</span>
        </Link>
        <Link
          href="/catalogue"
          className="flex flex-col items-center justify-center gap-1 hover:text-gold-500"
        >
          <LayoutGrid className="w-5 h-5" />
          <span>Catalogue</span>
        </Link>
        <Link
          href="/compte/bibliotheque"
          className="flex flex-col items-center justify-center gap-1 hover:text-gold-500"
        >
          <BookOpen className="w-5 h-5" />
          <span>Bibliothèque</span>
        </Link>
        <Link
          href="/panier"
          className="flex flex-col items-center justify-center gap-1 hover:text-gold-500 relative"
        >
          <ShoppingCart className="w-5 h-5" />
          <span>
            {t.nav.cart} ({cart.length})
          </span>
        </Link>
      </nav>
    </>
  );
}

