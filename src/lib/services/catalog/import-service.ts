import * as XLSX from "xlsx";
import { z } from "zod";
import { ProductType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const ImportRowSchema = z.object({
  title: z.string().min(2, "Titre requis"),
  subtitle: z.string().optional(),
  description: z.string().min(10, "Description trop courte"),
  categorySlug: z.string().min(1, "Catégorie requise"),
  author: z.string().min(2, "Auteur requis"),
  publisher: z.string().optional(),
  priceFcfa: z.coerce.number().int().min(0, "Prix invalide"),
  format: z.string().default("PDF"),
  language: z.string().default("Français"),
  pageCount: z.coerce.number().int().positive().optional(),
  coverUrl: z.string().optional(),
  filePath: z.string().optional(),
});

export interface ImportReport {
  totalRows: number;
  createdCount: number;
  skippedDuplicates: number;
  errors: Array<{ row: number; reason: string }>;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function importProductsFromBuffer(buffer: Buffer): Promise<ImportReport> {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { totalRows: 0, createdCount: 0, skippedDuplicates: 0, errors: [{ row: 0, reason: "Fichier vide." }] };
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName]);
  const report: ImportReport = {
    totalRows: rows.length,
    createdCount: 0,
    skippedDuplicates: 0,
    errors: [],
  };

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2; // ligne Excel/CSV (en-tête = 1)
    const raw = rows[i];

    const normalized = {
      title: raw.title ?? raw.titre ?? raw.Titre,
      subtitle: raw.subtitle ?? raw.sous_titre,
      description: raw.description ?? raw.Description,
      categorySlug: raw.categorySlug ?? raw.categorie ?? raw.category,
      author: raw.author ?? raw.auteur ?? raw.Auteur,
      publisher: raw.publisher ?? raw.editeur ?? "Éditions NexusArcanum",
      priceFcfa: raw.priceFcfa ?? raw.prix ?? raw.price ?? 0,
      format: raw.format ?? raw.Format ?? "PDF",
      language: raw.language ?? raw.langue ?? "Français",
      pageCount: raw.pageCount ?? raw.pages,
      coverUrl: raw.coverUrl ?? raw.image ?? "/covers/fondements-des-sciences-occultes.svg",
      filePath: raw.filePath ?? raw.fichier,
    };

    const parsed = ImportRowSchema.safeParse(normalized);
    if (!parsed.success) {
      report.errors.push({
        row: rowNum,
        reason: parsed.error.issues.map((iss) => iss.message).join("; "),
      });
      continue;
    }

    const data = parsed.data;
    const slug = slugify(data.title);

    // Contrôle des doublons
    const existing = await prisma.product.findUnique({ where: { slug } });
    if (existing) {
      report.skippedDuplicates++;
      continue;
    }

    const category = await prisma.category.findFirst({
      where: {
        OR: [{ slug: data.categorySlug }, { nameFr: { equals: data.categorySlug, mode: "insensitive" } }],
      },
    });
    if (!category) {
      report.errors.push({ row: rowNum, reason: `Catégorie introuvable : ${data.categorySlug}` });
      continue;
    }

    const authorSlug = slugify(data.author);
    const author = await prisma.author.upsert({
      where: { slug: authorSlug },
      update: {},
      create: { slug: authorSlug, name: data.author },
    });

    const pubSlug = slugify(data.publisher || "Éditions NexusArcanum");
    const publisher = await prisma.publisher.upsert({
      where: { slug: pubSlug },
      update: {},
      create: { slug: pubSlug, name: data.publisher || "Éditions NexusArcanum" },
    });

    const formatUpper = data.format.toUpperCase();
    const productType: ProductType =
      formatUpper === "EPUB"
        ? "EBOOK_EPUB"
        : formatUpper === "MP3" || formatUpper === "AUDIO"
        ? "AUDIOBOOK"
        : "EBOOK_PDF";

    await prisma.product.create({
      data: {
        slug,
        titleFr: data.title,
        titleEn: data.title,
        subtitleFr: data.subtitle ?? null,
        subtitleEn: data.subtitle ?? null,
        shortDescFr: data.description.slice(0, 160),
        shortDescEn: data.description.slice(0, 160),
        longDescFr: data.description,
        longDescEn: data.description,
        summaryFr: "Sommaire importé via fichier.",
        summaryEn: "Table of contents imported.",
        productType,
        primaryFormat: formatUpper,
        pageCount: data.pageCount ?? null,
        language: data.language,
        coverUrl: data.coverUrl || "/covers/fondements-des-sciences-occultes.svg",
        priceFcfa: data.priceFcfa,
        isFree: data.priceFcfa === 0,
        isDemo: false,
        categoryId: category.id,
        authorId: author.id,
        publisherId: publisher.id,
      },
    });

    report.createdCount++;
  }

  return report;
}

