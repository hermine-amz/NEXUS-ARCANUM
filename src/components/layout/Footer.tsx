"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { DEMO_CATEGORIES } from "@/lib/data/demo-catalog";
import { useApp } from "@/components/providers/AppProvider";

export function Footer() {
  const { locale } = useApp();
  const [consentVisible, setConsentVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem("nxa_cookie_consent")) {
        setConsentVisible(true);
      }
    } catch {
      // ignore
    }
  }, []);

  const acceptConsent = () => {
    try {
      localStorage.setItem("nxa_cookie_consent", "accepted");
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
              {locale === "en"
                ? "NEXUSARCANUM SHOP is a generalist digital bookstore built for Benin, Africa and international readers. 100% digital, instant access."
                : "NEXUSARCANUM SHOP est une grande librairie numérique généraliste destinée au Bénin, à l'Afrique et à l'international. 100 % numérique, accès instantané."}
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
              {locale === "en" ? "Explore" : "Découvrir"}
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/catalogue" className="hover:text-gold-500 transition">
                  Catalogue complet
                </Link>
              </li>
              <li>
                <Link href="/catalogue?filter=new" className="hover:text-gold-500 transition">
                  Nouveautés
                </Link>
              </li>
              <li>
                <Link href="/catalogue?filter=bestsellers" className="hover:text-gold-500 transition">
                  Meilleures ventes
                </Link>
              </li>
              <li>
                <Link href="/catalogue?filter=free" className="hover:text-gold-500 transition">
                  Livres & extraits gratuits
                </Link>
              </li>
              <li>
                <Link href="/compte/bibliotheque" className="hover:text-gold-500 transition">
                  Ma Bibliothèque numérique
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">
              {locale === "en" ? "Categories" : "Catégories phares"}
            </h3>
            <ul className="space-y-2 text-sm">
              {DEMO_CATEGORIES.slice(0, 6).map((cat) => (
                <li key={cat.slug}>
                  <Link
                    href={`/categories/${cat.slug}`}
                    className="hover:text-gold-500 transition"
                  >
                    {locale === "en" ? cat.nameEn : cat.nameFr}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">
              {locale === "en" ? "Legal & Support" : "Informations légales"}
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/pages/conditions-generales"
                  className="hover:text-gold-500 transition"
                >
                  Conditions générales (CGU/CGV)
                </Link>
              </li>
              <li>
                <Link href="/pages/confidentialite" className="hover:text-gold-500 transition">
                  Politique de confidentialité
                </Link>
              </li>
              <li>
                <Link
                  href="/pages/droits-auteur-licences"
                  className="hover:text-gold-500 transition"
                >
                  Droits d&apos;auteur & licences numériques
                </Link>
              </li>
              <li>
                <Link
                  href="/pages/politique-remboursement"
                  className="hover:text-gold-500 transition"
                >
                  Politique de remboursement
                </Link>
              </li>
              <li>
                <Link href="/admin" className="text-gold-500 hover:underline">
                  Espace Administration
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} NEXUSARCANUM SHOP — Plateforme indépendante 100 % numérique.</p>
          <p>Marché : Bénin • Afrique • International</p>
        </div>
      </footer>

      {consentVisible && (
        <div className="fixed bottom-16 md:bottom-4 left-4 right-4 md:left-auto md:max-w-md z-50 bg-navy-900 text-white border border-gold-500/40 rounded-2xl p-4 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center gap-3 text-xs">
          <p className="text-slate-200 leading-relaxed">
            Ce site utilise des cookies essentiels pour votre panier, votre session et la langue sélectionnée.
          </p>
          <button
            type="button"
            onClick={acceptConsent}
            className="shrink-0 px-4 py-2 rounded-lg bg-gold-500 text-navy-950 font-semibold hover:bg-gold-600 transition"
          >
            Accepter
          </button>
        </div>
      )}
    </>
  );
}

