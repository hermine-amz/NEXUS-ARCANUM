import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const DEFAULT_LEGAL: Record<string, { title: string; content: string }> = {
  "conditions-generales": {
    title: "Conditions Générales d'Utilisation et de Vente",
    content:
      "NEXUSARCANUM SHOP est une librairie numérique généraliste commercialisant exclusivement des produits immatériels (livres PDF, EPUB, livres audio, manuels, guides et formations).\n\nAucun produit physique n'est vendu ni expédié. Aucun frais de livraison physique n'est appliqué.\n\nLes produits portant la mention « PRODUIT DE DÉMONSTRATION — CONTENU NON COMMERCIAL » ont des prix fictifs et ne déclenchent aucun paiement réel.\n\nL'accès aux fichiers complets payants est délivré immédiatement dans la bibliothèque numérique personnelle du client après confirmation serveur du paiement.",
  },
  confidentialite: {
    title: "Politique de Confidentialité",
    content:
      "Les données collectées (nom, prénom, email, téléphone) sont utilisées exclusivement pour la gestion des comptes clients, la facturation, la lutte contre la fraude et l'accès sécurisé à la bibliothèque numérique.\n\nLes clés secrètes des agrégateurs de paiement sont chiffrées côté serveur (AES-256-GCM) et ne sont jamais exposées au navigateur.",
  },
  "droits-auteur-licences": {
    title: "Droits d'Auteur & Licences Numériques",
    content:
      "Tous les ouvrages et ressources disponibles sur NEXUSARCANUM SHOP sont protégés par le droit d'auteur.\n\nChaque achat confère une licence personnelle, non exclusive et non transférable. Toute redistribution publique ou revente est strictement interdite.",
  },
  "politique-remboursement": {
    title: "Politique de Remboursement",
    content:
      "Conformément à la nature immatérielle des produits numériques livrés instantanément, un remboursement ne peut être accordé qu'en cas de défaut technique avéré empêchant l'accès au fichier ou en cas de double facturation vérifiée.",
  },
};

export default async function CmsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let title = DEFAULT_LEGAL[slug]?.title || "";
  let content = DEFAULT_LEGAL[slug]?.content || "";

  const supabase = getSupabaseAdminClient();
  if (supabase) {
    const { data } = await supabase
      .from("cms_pages")
      .select("title_fr, content_fr, is_published")
      .eq("slug", slug)
      .maybeSingle();

    if (data && data.is_published) {
      title = data.title_fr;
      content = data.content_fr;
    }
  }

  if (!title) notFound();

  const isHtml = /<[a-z][\s\S]*>/i.test(content);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-navy-950 transition"
      >
        ← Retour à la boutique
      </Link>
      <h1 className="font-serif text-3xl font-bold text-navy-950">{title}</h1>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-md shadow-slate-900/5 p-6 sm:p-8 text-sm text-slate-700 leading-relaxed">
        {isHtml ? (
          <div
            className="prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-4 [&_blockquote]:border-gold-500 [&_blockquote]:pl-3 [&_blockquote]:italic [&_a]:text-blue-700 [&_a]:underline [&_img]:max-w-full [&_img]:rounded-xl"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        ) : (
          <div className="space-y-4 whitespace-pre-line">{content}</div>
        )}
      </div>
    </div>
  );
}
