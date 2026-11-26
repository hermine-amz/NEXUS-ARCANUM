"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { useApp } from "@/components/providers/AppProvider";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

function setBrowserCookie(name: string, value: string, maxAgeSec = 60 * 60 * 24 * 365) {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSec}; SameSite=Lax${secure}`;
}

export function Footer() {
  const pathname = usePathname();
  const { locale, branding } = useApp();
  const isEn = locale === "en";
  const [consentVisible, setConsentVisible] = useState(false);
  const [footerCats, setFooterCats] = useState<
    Array<{ slug: string; nameFr: string; nameEn: string }>
  >([]);

  useEffect(() => {
    try {
      const savedCookie = getCookie("nxa_cookie_consent");
      const savedLs = localStorage.getItem("nxa_cookie_consent");
      if (!savedCookie && !savedLs) {
        setConsentVisible(true);
      }
    } catch {
      // ignore
    }
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.categories)) {
          setFooterCats(d.categories.slice(0, 6));
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

  const handleConsent = (choice: "accepted" | "essential") => {
    try {
      localStorage.setItem("nxa_cookie_consent", choice);
      setBrowserCookie("nxa_cookie_consent", choice);
    } catch {
      // ignore
    }
    setConsentVisible(false);
  };

  return (
    <>
      <footer className="bg-navy-950 text-slate-300 border-t border-white/10 pb-20 md:pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-4">
            <Logo light />
            <p className="text-sm text-slate-400 leading-relaxed">
              {isEn
                ? `${branding.siteName} is a generalist digital bookstore built for Benin, Africa and international readers. 100% digital, instant access.`
                : `${branding.siteName} est une grande librairie numérique généraliste destinée au Bénin, à l'Afrique et à l'international. 100 % numérique, accès instantané.`}
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-2.5 py-1 rounded bg-white/5 border border-white/10 text-gold-500">
                FCFA (XOF)
              </span>
              <span className="px-2.5 py-1 rounded bg-white/5 border border-white/10">
                Mobile Money
              </span>
              <span className="px-2.5 py-1 rounded bg-white/5 border border-white/10">
                Visa / Mastercard
              </span>
            </div>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">
              {isEn ? "Explore" : "Découvrir"}
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/catalogue" className="hover:text-gold-500 transition">
                  {isEn ? "Full catalog" : "Catalogue complet"}
                </Link>
              </li>
              <li>
                <Link href="/catalogue?filter=new" className="hover:text-gold-500 transition">
                  {isEn ? "New arrivals" : "Nouveautés"}
                </Link>
              </li>
              <li>
                <Link href="/catalogue?filter=bestsellers" className="hover:text-gold-500 transition">
                  {isEn ? "Bestsellers" : "Meilleures ventes"}
                </Link>
              </li>
              <li>
                <Link href="/catalogue?filter=promo" className="hover:text-gold-500 transition">
                  {isEn ? "Current deals" : "Promotions"}
                </Link>
              </li>
              <li>
                <Link href="/compte/bibliotheque" className="hover:text-gold-500 transition">
                  {isEn ? "My Digital Library" : "Ma Bibliothèque numérique"}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">
              {isEn ? "Featured Categories" : "Catégories phares"}
            </h3>
            <ul className="space-y-2 text-sm">
              {footerCats.map((cat) => (
                <li key={cat.slug}>
                  <Link
                    href={`/categories/${cat.slug}`}
                    className="hover:text-gold-500 transition"
                  >
                    {isEn ? cat.nameEn : cat.nameFr}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">
              {isEn ? "Legal & Support" : "Informations légales"}
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/pages/conditions-generales"
                  className="hover:text-gold-500 transition"
                >
                  {isEn ? "Terms of Service (ToS)" : "Conditions générales (CGU/CGV)"}
                </Link>
              </li>
              <li>
                <Link href="/pages/confidentialite" className="hover:text-gold-500 transition">
                  {isEn ? "Privacy Policy" : "Politique de confidentialité"}
                </Link>
              </li>
              <li>
                <Link
                  href="/pages/droits-auteur-licences"
                  className="hover:text-gold-500 transition"
                >
                  {isEn ? "Copyright & Digital Licenses" : "Droits d'auteur & licences numériques"}
                </Link>
              </li>
              <li>
                <Link
                  href="/pages/politique-remboursement"
                  className="hover:text-gold-500 transition"
                >
                  {isEn ? "Refund Policy" : "Politique de remboursement"}
                </Link>
              </li>
              <li>
                <Link href="/admin" className="text-gold-500 hover:underline">
                  {isEn ? "Admin Dashboard" : "Espace Administration"}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>
            © {new Date().getFullYear()} {branding.siteName} —{" "}
            {isEn
              ? "Independent 100% digital platform."
              : "Plateforme indépendante 100 % numérique."}
          </p>
          <p>{isEn ? "Market: Benin • Africa • Worldwide" : "Marché : Bénin • Afrique • International"}</p>
        </div>
      </footer>

      {consentVisible && (
        <div className="fixed bottom-16 md:bottom-4 left-4 right-4 md:left-auto md:max-w-lg z-50 bg-navy-900/95 backdrop-blur-xl text-white border border-gold-500/40 rounded-2xl p-4 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center gap-3 text-xs">
          <p className="text-slate-200 leading-relaxed flex-1">
            {isEn
              ? "This website uses essential cookies for your cart, session security and language preference."
              : "Ce site utilise des cookies essentiels pour votre panier, votre session sécurisée et la langue sélectionnée."}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleConsent("essential")}
              className="px-3 py-2 rounded-lg border border-white/20 text-slate-200 hover:bg-white/10 font-semibold transition cursor-pointer"
            >
              {isEn ? "Essential only" : "Essentiels"}
            </button>
            <button
              type="button"
              onClick={() => handleConsent("accepted")}
              className="px-4 py-2 rounded-lg bg-gold-500 text-navy-950 font-bold hover:bg-gold-600 transition cursor-pointer"
            >
              {isEn ? "Accept" : "Accepter"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
