"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Download, KeyRound, Lock } from "lucide-react";
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

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    fetch("/api/library")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setItems(d.entitlements || []);
      })
      .catch(() => setError("Impossible de charger la bibliothèque."))
      .finally(() => setLoading(false));
  }, [user]);

  const handleDownload = async (entitlementId: string, assetId: string) => {
    const res = await fetch("/api/library/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entitlementId, assetId }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || "Téléchargement refusé.");
      return;
    }
    window.location.href = data.url;
  };

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <Lock className="w-12 h-12 text-gold-600 mx-auto" />
        <h1 className="font-serif text-3xl font-bold text-navy-950">
          Bibliothèque Numérique Personnelle
        </h1>
        <p className="text-sm text-slate-600">
          Connectez-vous pour accéder à vos ouvrages acquis et à vos liens de téléchargement sécurisés.
        </p>
        <Link
          href="/connexion"
          className="inline-block px-6 py-3 rounded-xl bg-gold-500 text-navy-950 font-bold text-sm"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-navy-950">
            Ma Bibliothèque Numérique
          </h1>
          <p className="text-sm text-slate-600">
            Accès sécurisé via liens temporaires signés et suivi des licences.
          </p>
        </div>
        <Link href="/compte" className="text-sm font-semibold text-navy-900 hover:underline">
          ← Retour à mon compte
        </Link>
      </div>

      {loading ? (
        <div className="p-10 text-center text-sm text-slate-500">Chargement...</div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-sm">
          {error}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
          <p className="text-lg font-semibold text-navy-950">
            Aucun ouvrage acheté pour le moment.
          </p>
          <Link
            href="/catalogue"
            className="inline-block px-6 py-3 rounded-xl bg-navy-900 text-white font-semibold text-sm"
          >
            Parcourir le catalogue
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-200 p-4 flex gap-4 shadow-sm"
            >
              <img
                src={item.product.coverUrl}
                alt={item.product.titleFr}
                className="w-20 h-28 object-cover rounded-lg border border-slate-200 shrink-0"
              />
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <h2 className="font-serif font-bold text-navy-950 truncate">
                    {item.product.titleFr}
                  </h2>
                  <p className="text-xs text-slate-500">{item.product.author.name}</p>
                  <p className="text-[11px] text-slate-500 mt-1 inline-flex items-center gap-1">
                    <KeyRound className="w-3 h-3 text-gold-600" />
                    {item.licenseKey}
                  </p>
                </div>

                <div className="pt-3 space-y-2">
                  <p className="text-[11px] text-slate-500">
                    Téléchargements : {item.downloadCount} / {item.maxDownloads}
                  </p>
                  {item.product.assets.map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => handleDownload(item.id, asset.id)}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-navy-900 text-white text-xs font-semibold hover:bg-navy-800 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-gold-500" />
                      Télécharger ({asset.format})
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

