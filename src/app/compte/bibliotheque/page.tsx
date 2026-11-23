"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Download, KeyRound, Lock, RefreshCw } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";

interface EntitlementRow {
  id: string;
  licenseKey: string;
  downloadCount: number;
  maxDownloads: number;
  grantedAt: string;
  product: {
    slug: string;
    titleFr: string;
    coverUrl: string;
    primaryFormat: string;
    author: { name: string };
    assets: Array<{ id: string; format: string; fileName: string }>;
  };
}

export default function BibliothequePage() {
  const { user, showToast } = useApp();
  const [items, setItems] = useState<EntitlementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const loadLibrary = useCallback(async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/library", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || "Impossible de charger la bibliothèque.");
      setItems(Array.isArray(data.entitlements) ? data.entitlements : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger la bibliothèque.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadLibrary();
  }, [loadLibrary]);

  const handleDownload = async (entitlementId: string, assetId: string) => {
    const key = assetId;
    if (downloading) return;
    setDownloading(key);
    try {
      const response = await fetch("/api/library/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entitlementId, assetId }),
      });
      const data = await response.json();
      if (!response.ok || typeof data.url !== "string") {
        showToast(data.error || "Téléchargement refusé.");
        return;
      }
      window.location.assign(data.url);
    } catch {
      showToast("Une erreur réseau a interrompu le téléchargement. Réessayez.");
    } finally {
      setDownloading(null);
    }
  };

  if (!user) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <Lock aria-hidden="true" className="w-12 h-12 text-gold-600 mx-auto" />
        <h1 className="font-serif text-3xl font-bold text-navy-950">Bibliothèque Numérique Personnelle</h1>
        <p className="text-sm text-slate-600">Connectez-vous pour accéder à vos ouvrages acquis et à vos liens de téléchargement sécurisés.</p>
        <Link href="/connexion" className="inline-block px-6 py-3 rounded-xl bg-gold-500 text-navy-950 font-bold text-sm">Se connecter</Link>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6 sm:space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-gold-600 font-bold mb-2">Votre espace de lecture</p>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-navy-950">Ma Bibliothèque Numérique</h1>
          <p className="text-sm text-slate-600 mt-1">Retrouvez vos ouvrages et gérez leurs téléchargements.</p>
        </div>
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => void loadLibrary()} disabled={loading} className="inline-flex items-center gap-2 text-xs font-semibold text-navy-900 hover:underline disabled:opacity-50">
            <RefreshCw aria-hidden="true" className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Actualiser
          </button>
          <Link href="/compte" className="text-sm font-semibold text-navy-900 hover:underline">← Mon compte</Link>
        </div>
      </header>

      {loading ? (
        <div role="status" className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Chargement de votre bibliothèque...</div>
      ) : error ? (
        <div role="alert" className="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-sm space-y-3">
          <p>{error}</p>
          <button type="button" onClick={() => void loadLibrary()} className="font-bold underline underline-offset-2">Réessayer</button>
        </div>
      ) : items.length === 0 ? (
        <section className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center space-y-4">
          <BookOpen aria-hidden="true" className="w-12 h-12 text-slate-300 mx-auto" />
          <p className="text-lg font-semibold text-navy-950">Votre bibliothèque est encore vide.</p>
          <p className="text-sm text-slate-500">Les ouvrages achetés apparaîtront ici après confirmation du paiement.</p>
          <Link href="/catalogue" className="inline-flex px-6 py-3 rounded-xl bg-navy-900 text-white font-semibold text-sm">Parcourir le catalogue</Link>
        </section>
      ) : (
        <section aria-label="Ouvrages acquis" className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {items.map((item) => {
            const remaining = Math.max(0, item.maxDownloads - item.downloadCount);
            const progress = item.maxDownloads > 0 ? Math.min(100, (item.downloadCount / item.maxDownloads) * 100) : 0;
            return (
              <article key={item.id} className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm flex flex-col min-[480px]:flex-row gap-4">
                <img
                  src={item.product.coverUrl}
                  alt={`Couverture de ${item.product.titleFr}`}
                  loading="lazy"
                  className="w-24 h-32 object-cover rounded-lg border border-slate-200 shrink-0 self-start"
                />
                <div className="flex-1 min-w-0 space-y-3">
                  <div>
                    <h2 className="font-serif text-base sm:text-lg font-bold text-navy-950 leading-snug">{item.product.titleFr}</h2>
                    <p className="text-xs text-slate-500 mt-1">{item.product.author.name}</p>
                    <p className="text-[11px] text-slate-500 mt-2 inline-flex items-center gap-1 break-all">
                      <KeyRound aria-hidden="true" className="w-3 h-3 text-gold-600 shrink-0" /> Licence : {item.licenseKey}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between gap-3 text-[11px] text-slate-500">
                      <span>Téléchargements utilisés</span>
                      <span className="font-semibold text-navy-900">{item.downloadCount} / {item.maxDownloads}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden" role="progressbar" aria-label="Téléchargements utilisés" aria-valuemin={0} aria-valuemax={item.maxDownloads} aria-valuenow={Math.min(item.downloadCount, item.maxDownloads)}>
                      <div className="h-full rounded-full bg-gold-500" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="text-[11px] text-slate-500">{remaining} téléchargement(s) restant(s)</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {item.product.assets.length > 0 ? item.product.assets.map((asset) => (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => void handleDownload(item.id, asset.id)}
                        disabled={downloading !== null || remaining <= 0}
                        className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-navy-900 text-white text-xs font-semibold hover:bg-navy-800 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Download aria-hidden="true" className="w-3.5 h-3.5 text-gold-500" />
                        {downloading === asset.id ? "Préparation..." : `Télécharger (${asset.format})`}
                      </button>
                    )) : <p className="text-xs text-slate-500">Aucun fichier disponible pour cet ouvrage.</p>}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
