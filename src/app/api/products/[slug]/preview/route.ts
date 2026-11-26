import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const MAX_PREVIEW_PAGES = 4;

async function buildFallbackPreviewPdf(title: string, siteName: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await doc.embedFont(StandardFonts.Helvetica);

  for (let i = 1; i <= MAX_PREVIEW_PAGES; i++) {
    const page = doc.addPage([595.28, 841.89]);
    page.drawText(siteName.toUpperCase(), {
      x: 50,
      y: 780,
      size: 11,
      font: fontBold,
      color: rgb(0.08, 0.14, 0.3),
    });
    page.drawText(title.slice(0, 70), {
      x: 50,
      y: 745,
      size: 18,
      font: fontBold,
      color: rgb(0.05, 0.08, 0.18),
    });
    page.drawText(`Aperçu — Page ${i} sur ${MAX_PREVIEW_PAGES}`, {
      x: 50,
      y: 715,
      size: 12,
      font: fontReg,
      color: rgb(0.35, 0.4, 0.5),
    });
    page.drawText(
      "Les 4 premières pages complètes de cet ouvrage s'afficheront automatiquement ici dès",
      { x: 50, y: 660, size: 11, font: fontReg, color: rgb(0.25, 0.3, 0.4) }
    );
    page.drawText(
      "que le fichier PDF complet sera téléversé dans l'espace administration.",
      { x: 50, y: 642, size: 11, font: fontReg, color: rgb(0.25, 0.3, 0.4) }
    );
  }
  return doc.save();
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const supabase = getSupabaseAdminClient();

  let title = slug;
  let siteName = "NEXUSARCANUM SHOP";
  let sourceBytes: Uint8Array | null = null;

  try {
    if (supabase) {
      const [{ data: product }, { data: brandSetting }] = await Promise.all([
        supabase
          .from("products")
          .select("id, title_fr, extract_url")
          .eq("slug", slug)
          .maybeSingle(),
        supabase
          .from("site_settings")
          .select("value")
          .eq("key", "site_name")
          .maybeSingle(),
      ]);

      if (brandSetting?.value) {
        siteName = brandSetting.value;
      }

      if (product) {
        title = product.title_fr || slug;

        // 1. Chercher le fichier PDF complet du livre dans product_assets
        const { data: assets } = await supabase
          .from("product_assets")
          .select("storage_path, file_name, mime_type")
          .eq("product_id", product.id)
          .order("created_at", { ascending: false });

        const pdfAsset = (assets || []).find(
          (a) =>
            a.mime_type?.includes("pdf") ||
            a.file_name?.toLowerCase().endsWith(".pdf") ||
            a.storage_path?.toLowerCase().endsWith(".pdf")
        );

        if (pdfAsset?.storage_path) {
          const { data: fileBlob } = await supabase.storage
            .from("private-assets")
            .download(pdfAsset.storage_path);
          if (fileBlob) {
            sourceBytes = new Uint8Array(await fileBlob.arrayBuffer());
          }
        }

        // 2. Sinon tenter l'URL d'extrait si c'est une URL HTTP valide
        if (!sourceBytes && product.extract_url && product.extract_url.startsWith("http")) {
          const res = await fetch(product.extract_url);
          if (res.ok) {
            sourceBytes = new Uint8Array(await res.arrayBuffer());
          }
        }
      }
    }

    let previewDoc: PDFDocument;
    if (sourceBytes) {
      try {
        const srcDoc = await PDFDocument.load(sourceBytes, { ignoreEncryption: true });
        previewDoc = await PDFDocument.create();
        const total = srcDoc.getPageCount();
        const count = Math.min(MAX_PREVIEW_PAGES, total);
        const indices = Array.from({ length: count }, (_, i) => i);
        const copiedPages = await previewDoc.copyPages(srcDoc, indices);
        for (const p of copiedPages) {
          previewDoc.addPage(p);
        }
      } catch {
        const fallback = await buildFallbackPreviewPdf(title, siteName);
        previewDoc = await PDFDocument.load(fallback);
      }
    } else {
      const fallback = await buildFallbackPreviewPdf(title, siteName);
      previewDoc = await PDFDocument.load(fallback);
    }

    // Filigrane diagonal + pied de page sur chacune des 4 pages d'aperçu
    const fontBold = await previewDoc.embedFont(StandardFonts.HelveticaBold);
    const fontReg = await previewDoc.embedFont(StandardFonts.Helvetica);
    const pages = previewDoc.getPages();
    const watermarkText = `APERÇU — ${siteName.toUpperCase()}`;

    pages.forEach((page, idx) => {
      const { width, height } = page.getSize();
      page.drawText(watermarkText, {
        x: width * 0.14,
        y: height * 0.38,
        size: Math.min(34, Math.max(20, width * 0.052)),
        font: fontBold,
        color: rgb(0.45, 0.5, 0.62),
        opacity: 0.22,
        rotate: degrees(38),
      });
      page.drawText(
        `Aperçu protégé (${idx + 1}/${pages.length}) • ${siteName} • Achetez l'ouvrage complet pour lire la suite`,
        {
          x: 24,
          y: 16,
          size: 8.5,
          font: fontReg,
          color: rgb(0.35, 0.4, 0.5),
          opacity: 0.85,
        }
      );
    });

    const outBytes = await previewDoc.save();
    return new NextResponse(Buffer.from(outBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="apercu-4-pages-${slug}.pdf"`,
        "Cache-Control": "public, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    const fallback = await buildFallbackPreviewPdf(title, siteName);
    return new NextResponse(Buffer.from(fallback), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="apercu-4-pages-${slug}.pdf"`,
      },
    });
  }
}
