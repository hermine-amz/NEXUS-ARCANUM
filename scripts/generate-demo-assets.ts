import fs from "fs";
import path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { DEMO_PRODUCTS, DEMO_CATEGORIES } from "../src/lib/data/demo-catalog";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    if ((current + " " + w).trim().length > maxChars) {
      if (current) lines.push(current.trim());
      current = w;
    } else {
      current = (current + " " + w).trim();
    }
  }
  if (current) lines.push(current.trim());
  return lines;
}

function buildCoverSvg(product: (typeof DEMO_PRODUCTS)[number], categoryName: string): string {
  const titleLines = wrapText(product.titleFr, 20).slice(0, 4);
  const subtitleLines = wrapText(product.subtitleFr, 32).slice(0, 2);

  const titleSvg = titleLines
    .map(
      (line, idx) =>
        `<text x="48" y="${210 + idx * 38}" fill="#FFFFFF" font-family="Georgia, serif" font-size="28" font-weight="bold">${escapeXml(
          line
        )}</text>`
    )
    .join("\n");

  const subSvg = subtitleLines
    .map(
      (line, idx) =>
        `<text x="48" y="${385 + idx * 22}" fill="#CBD5E1" font-family="Arial, sans-serif" font-size="14">${escapeXml(
          line
        )}</text>`
    )
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="450" height="600" viewBox="0 0 450 600">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#070C1B"/>
      <stop offset="65%" stop-color="#0B132B"/>
      <stop offset="100%" stop-color="${product.accentHex}"/>
    </linearGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#D4AF37"/>
      <stop offset="100%" stop-color="#F3E5AB"/>
    </linearGradient>
  </defs>
  <rect width="450" height="600" fill="url(#bg)"/>
  <rect x="20" y="20" width="410" height="560" fill="none" stroke="url(#gold)" stroke-width="1.5" stroke-opacity="0.7"/>
  <rect x="28" y="28" width="394" height="544" fill="none" stroke="#FFFFFF" stroke-width="0.5" stroke-opacity="0.2"/>
  
  <!-- Top Brand & Format -->
  <text x="48" y="64" fill="#D4AF37" font-family="Arial, sans-serif" font-size="11" font-weight="bold" letter-spacing="3">NEXUSARCANUM SHOP</text>
  <rect x="330" y="46" width="72" height="24" rx="4" fill="#D4AF37"/>
  <text x="366" y="62" text-anchor="middle" fill="#070C1B" font-family="Arial, sans-serif" font-size="11" font-weight="bold">${escapeXml(
    product.primaryFormat
  )}</text>

  <!-- Category -->
  <text x="48" y="130" fill="#D4AF37" font-family="Arial, sans-serif" font-size="12" font-weight="600">${escapeXml(
    categoryName.toUpperCase()
  )}</text>
  <line x1="48" y1="145" x2="120" y2="145" stroke="#D4AF37" stroke-width="2"/>

  <!-- Title & Subtitle -->
  ${titleSvg}
  ${subSvg}

  <!-- Decorative Geometric Emblem -->
  <circle cx="370" cy="480" r="36" fill="none" stroke="#D4AF37" stroke-width="1" stroke-opacity="0.4"/>
  <circle cx="370" cy="480" r="22" fill="none" stroke="#D4AF37" stroke-width="1" stroke-opacity="0.6"/>

  <!-- Author & Demo Notice -->
  <text x="48" y="495" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="15" font-weight="bold">${escapeXml(
    product.authorName
  )}</text>
  <text x="48" y="516" fill="#94A3B8" font-family="Arial, sans-serif" font-size="12">${escapeXml(
    product.publisherName
  )}</text>
  <rect x="48" y="534" width="354" height="22" rx="3" fill="#070C1B" fill-opacity="0.75" stroke="#D4AF37" stroke-opacity="0.5"/>
  <text x="225" y="549" text-anchor="middle" fill="#F3E5AB" font-family="Arial, sans-serif" font-size="9" font-weight="bold">PRODUIT DE DÉMONSTRATION — CONTENU NON COMMERCIAL</text>
</svg>`;
}

// pdf-lib WinAnsi safe helper (strip or replace unsupported unicode if any)
function safePdfText(input: string): string {
  return input
    .replace(/œ/g, "oe")
    .replace(/Œ/g, "OE")
    .replace(/’/g, "'")
    .replace(/–|—/g, "-")
    .replace(/•/g, "*");
}

async function generatePdf(
  product: (typeof DEMO_PRODUCTS)[number],
  categoryName: string,
  pagesCount: number,
  isExtract: boolean
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const navy = rgb(0.043, 0.075, 0.169);
  const gold = rgb(0.831, 0.686, 0.216);
  const slate = rgb(0.28, 0.33, 0.41);
  const white = rgb(1, 1, 1);

  // Page 1: Cover Page
  const p1 = pdfDoc.addPage([595, 842]);
  p1.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: navy });
  p1.drawRectangle({
    x: 36,
    y: 36,
    width: 523,
    height: 770,
    borderColor: gold,
    borderWidth: 2,
  });
  p1.drawText("NEXUSARCANUM SHOP", {
    x: 60,
    y: 760,
    size: 13,
    font: fontBold,
    color: gold,
  });
  p1.drawText(safePdfText(categoryName.toUpperCase()), {
    x: 60,
    y: 690,
    size: 12,
    font: fontBold,
    color: gold,
  });

  const titleLines = wrapText(safePdfText(product.titleFr), 30);
  titleLines.forEach((line, i) => {
    p1.drawText(line, {
      x: 60,
      y: 620 - i * 36,
      size: 26,
      font: fontBold,
      color: white,
    });
  });

  const subLines = wrapText(safePdfText(product.subtitleFr), 55);
  subLines.forEach((line, i) => {
    p1.drawText(line, {
      x: 60,
      y: 480 - i * 20,
      size: 13,
      font: fontRegular,
      color: rgb(0.8, 0.85, 0.92),
    });
  });

  p1.drawText(safePdfText(`Auteur : ${product.authorName}`), {
    x: 60,
    y: 190,
    size: 14,
    font: fontBold,
    color: white,
  });
  p1.drawText(safePdfText(`Editeur : ${product.publisherName}  |  Format : ${product.primaryFormat}`), {
    x: 60,
    y: 165,
    size: 11,
    font: fontRegular,
    color: rgb(0.7, 0.76, 0.84),
  });
  p1.drawText(
    safePdfText(
      isExtract
        ? "EXTRAIT GRATUIT - PRODUIT DE DEMONSTRATION (CONTENU NON COMMERCIAL)"
        : "EDITION COMPLETE DE DEMONSTRATION - CONTENU NON COMMERCIAL"
    ),
    {
      x: 60,
      y: 75,
      size: 10,
      font: fontBold,
      color: gold,
    }
  );

  // Page 2: Sommaire & Présentation
  const p2 = pdfDoc.addPage([595, 842]);
  p2.drawText("SOMMAIRE ET PRESENTATION", {
    x: 60,
    y: 770,
    size: 18,
    font: fontBold,
    color: navy,
  });
  p2.drawLine({
    start: { x: 60, y: 758 },
    end: { x: 535, y: 758 },
    thickness: 1.5,
    color: gold,
  });

  const descLines = wrapText(safePdfText(product.longDescFr), 78);
  descLines.forEach((line, i) => {
    p2.drawText(line, {
      x: 60,
      y: 720 - i * 18,
      size: 11,
      font: fontRegular,
      color: slate,
    });
  });

  p2.drawText("Table des matieres :", {
    x: 60,
    y: 610,
    size: 14,
    font: fontBold,
    color: navy,
  });
  const summaryLines = safePdfText(product.summaryFr).split("\n");
  summaryLines.forEach((line, i) => {
    p2.drawText(line, {
      x: 72,
      y: 580 - i * 24,
      size: 12,
      font: fontRegular,
      color: slate,
    });
  });

  p2.drawText(
    "PRODUIT DE DEMONSTRATION - CONTENU NON COMMERCIAL - NEXUSARCANUM SHOP",
    { x: 60, y: 40, size: 9, font: fontBold, color: slate }
  );

  // Pages 3..N: Chapitres de démonstration
  for (let p = 3; p <= pagesCount; p++) {
    const page = pdfDoc.addPage([595, 842]);
    page.drawText(safePdfText(`${product.titleFr} - Chapitre ${p - 2}`), {
      x: 60,
      y: 770,
      size: 15,
      font: fontBold,
      color: navy,
    });
    page.drawLine({
      start: { x: 60, y: 756 },
      end: { x: 535, y: 756 },
      thickness: 1,
      color: gold,
    });

    const paragraphs = [
      `Ce document fait partie du catalogue initial de demonstration de la grande librairie numerique NEXUSARCANUM SHOP. Il illustre la mise en page, la lisibilite et la qualite editoriale attendues sur la plateforme.`,
      `${product.shortDescFr} ${product.longDescFr}`,
      `Dans cette section (Page ${p} sur ${pagesCount}), le lecteur decouvre les concepts cles, les methodes structurees et les applications pratiques adaptees au contexte africain et international.`,
      `Point cle ${p - 2}.1 : Structuration rigoureuse de l'information, clarte pedagogique et accessibilite immediate sur ordinateur, tablette et smartphone.`,
      `Point cle ${p - 2}.2 : Distribution 100% numerique, livraison instantanee dans la bibliotheque personnelle apres validation du paiement.`,
    ];

    let cursorY = 710;
    for (const para of paragraphs) {
      const lines = wrapText(safePdfText(para), 76);
      for (const l of lines) {
        page.drawText(l, {
          x: 60,
          y: cursorY,
          size: 11,
          font: fontRegular,
          color: slate,
        });
        cursorY -= 17;
      }
      cursorY -= 14;
    }

    page.drawText(
      `Page ${p} - PRODUIT DE DEMONSTRATION - CONTENU NON COMMERCIAL`,
      { x: 60, y: 40, size: 9, font: fontBold, color: slate }
    );
  }

  return pdfDoc.save();
}

async function main() {
  const coversDir = path.join(process.cwd(), "public", "covers");
  const extractsDir = path.join(process.cwd(), "public", "demo-extracts");
  const privateDir = path.join(process.cwd(), "storage", "private");

  fs.mkdirSync(coversDir, { recursive: true });
  fs.mkdirSync(extractsDir, { recursive: true });
  fs.mkdirSync(privateDir, { recursive: true });

  const catMap = new Map(DEMO_CATEGORIES.map((c) => [c.slug, c.nameFr]));

  for (const product of DEMO_PRODUCTS) {
    const categoryName = catMap.get(product.categorySlug) ?? product.categorySlug;

    // 1. Cover SVG
    const svg = buildCoverSvg(product, categoryName);
    fs.writeFileSync(path.join(coversDir, `${product.slug}.svg`), svg, "utf8");

    // 2. Free Extract PDF (4 pages)
    const extractBytes = await generatePdf(product, categoryName, 4, true);
    fs.writeFileSync(path.join(extractsDir, `${product.slug}-extrait.pdf`), extractBytes);

    // 3. Full Private Demo File (6 pages PDF)
    const fullBytes = await generatePdf(product, categoryName, 6, false);
    fs.writeFileSync(path.join(privateDir, `${product.slug}-complet.pdf`), fullBytes);
  }

  console.log(`Generated ${DEMO_PRODUCTS.length} covers, extracts, and private full files.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

