import React from "react";
import { notFound } from "next/navigation";

const LEGAL_CONTENT: Record<string, { title: string; body: string[] }> = {
  "conditions-generales": {
    title: "Conditions Générales d'Utilisation et de Vente",
    body: [
      "NEXUSARCANUM SHOP est une librairie numérique généraliste commercialisant exclusivement des produits immatériels (livres PDF, EPUB, livres audio, manuels, guides et formations).",
      "Aucun produit physique n'est vendu ni expédié. Aucun frais de livraison physique n'est appliqué.",
      "Les produits portant la mention « PRODUIT DE DÉMONSTRATION — CONTENU NON COMMERCIAL » ont des prix fictifs et ne déclenchent aucun paiement réel.",
      "L'accès aux fichiers complets payants est délivré immédiatement dans la bibliothèque numérique personnelle du client après confirmation serveur du paiement.",
    ],
  },
  confidentialite: {
    title: "Politique de Confidentialité",
    body: [
      "Les données collectées (nom, prénom, email, téléphone) sont utilisées exclusivement pour la gestion des comptes clients, la facturation, la lutte contre la fraude et l'accès sécurisé à la bibliothèque numérique.",
      "Les clés secrètes des agrégateurs de paiement sont chiffrées côté serveur (AES-256-GCM) et ne sont jamais exposées au navigateur.",
    ],
  },
  "droits-auteur-licences": {
    title: "Droits d'Auteur & Licences Numériques",
    body: [
      "Tous les ouvrages et ressources disponibles sur NEXUSARCANUM SHOP sont protégés par le droit d'auteur.",
      "Chaque achat confère une licence personnelle, non exclusive et non transférable. Toute redistribution publique ou revente est strictement interdite.",
    ],
  },
  "politique-remboursement": {
    title: "Politique de Remboursement",
    body: [
      "Conformément à la nature immatérielle des produits numériques livrés instantanément, un remboursement ne peut être accordé qu'en cas de défaut technique avéré empêchant l'accès au fichier ou en cas de double facturation vérifiée.",
    ],
  },
};

export default async function CmsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = LEGAL_CONTENT[slug];
  if (!page) notFound();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-6">
      <h1 className="font-serif text-3xl font-bold text-navy-950">{page.title}</h1>
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-4 text-sm text-slate-700 leading-relaxed">
        {page.body.map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
    </div>
  );
}

