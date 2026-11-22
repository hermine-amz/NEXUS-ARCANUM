import * as XLSX from "xlsx";
import { z } from "zod";
import { requireSupabaseAdmin, newId, ProductType } from "@/lib/supabase";

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
  const supabase = requireSupabaseAdmin();
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return {
      totalRows: 0,
      createdCount: 0,
      skippedDuplicates: 0,
      errors: [{ row: 0, reason: "Fichier vide." }],
    };
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName]);
  const report: ImportReport = {
    totalRows: rows.length,
    createdCount: 0,
    skippedDuplicates: 0,
    errors: [],
  };

  const now = new Date().toISOString();

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2;
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

    const { data: existing } = await supabase
      .from("products")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (existing) {
      report.skippedDuplicates++;
      continue;
    }

    const { data: category } = await supabase
      .from("categories")
      .select("id")
      .or(`slug.eq.${data.categorySlug},name_fr.ilike.${data.categorySlug}`)
      .limit(1)
      .maybeSingle();

    if (!category) {
      report.errors.push({ row: rowNum, reason: `Catégorie introuvable : ${data.categorySlug}` });
      continue;
    }

    const authorSlug = slugify(data.author);
    let { data: author } = await supabase
      .from("authors")
      .select("id")
      .eq("slug", authorSlug)
      .maybeSingle();
    if (!author) {
      const id = newId();
      await supabase.from("authors").insert({
        id,
        slug: authorSlug,
        name: data.author,
        created_at: now,
        updated_at: now,
      });
      author = { id };
    }

    const pubName = data.publisher || "Éditions NexusArcanum";
    const pubSlug = slugify(pubName);
    let { data: publisher } = await supabase
      .from("publishers")
      .select("id")
      .eq("slug", pubSlug)
      .maybeSingle();
    if (!publisher) {
      const id = newId();
      await supabase.from("publishers").insert({
        id,
        slug: pubSlug,
        name: pubName,
        created_at: now,
        updated_at: now,
      });
      publisher = { id };
    }

    const formatUpper = data.format.toUpperCase();
    const productType: ProductType =
      formatUpper === "EPUB"
        ? "EBOOK_EPUB"
        : formatUpper === "MP3" || formatUpper === "AUDIO"
        ? "AUDIOBOOK"
        : "EBOOK_PDF";

    const { error } = await supabase.from("products").insert({
      id: newId(),
      slug,
      title_fr: data.title,
      title_en: data.title,
      subtitle_fr: data.subtitle ?? null,
      subtitle_en: data.subtitle ?? null,
      short_desc_fr: data.description.slice(0, 160),
      short_desc_en: data.description.slice(0, 160),
      long_desc_fr: data.description,
      long_desc_en: data.description,
      summary_fr: "Sommaire importé via fichier.",
      summary_en: "Table of contents imported.",
      product_type: productType,
      primary_format: formatUpper,
      page_count: data.pageCount ?? null,
      language: data.language,
      cover_url: data.coverUrl || "/covers/fondements-des-sciences-occultes.svg",
      price_fcfa: data.priceFcfa,
      is_free: data.priceFcfa === 0,
      is_demo: false,
      is_archived: false,
      is_hidden_from_public: false,
      is_published: true,
      category_id: category.id,
      author_id: author.id,
      publisher_id: publisher.id,
      created_at: now,
      updated_at: now,
    });

    if (error) {
      report.errors.push({ row: rowNum, reason: error.message });
      continue;
    }

    report.createdCount++;
  }

  return report;
}
