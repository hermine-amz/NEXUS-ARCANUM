import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSupabaseAdmin, newId } from "@/lib/supabase";
import { getCurrentSession, isAdminSession } from "@/lib/security/auth";
import { autoTranslateFrToEn } from "@/lib/services/translate";

export async function GET() {
  const session = await getCurrentSession();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }

  try {
    const supabase = requireSupabaseAdmin();
    const [{ data: banners }, { data: pages }] = await Promise.all([
      supabase.from("banners").select("*").order("sort_order", { ascending: true }),
      supabase.from("cms_pages").select("*").order("slug", { ascending: true }),
    ]);

    return NextResponse.json({
      banners: (banners || []).map((b) => ({
        id: b.id,
        titleFr: b.title_fr,
        titleEn: b.title_en,
        subtitleFr: b.subtitle_fr || "",
        subtitleEn: b.subtitle_en || "",
        ctaLabelFr: b.cta_label_fr || "",
        ctaLabelEn: b.cta_label_en || "",
        ctaUrl: b.cta_url || "/catalogue",
        isActive: b.is_active,
      })),
      pages: (pages || []).map((p) => ({
        id: p.id,
        slug: p.slug,
        titleFr: p.title_fr,
        titleEn: p.title_en,
        contentFr: p.content_fr,
        contentEn: p.content_en,
        isPublished: p.is_published,
      })),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

const SaveBannerSchema = z.object({
  type: z.literal("BANNER"),
  id: z.string().optional(),
  titleFr: z.string().min(3),
  titleEn: z.string().optional(),
  subtitleFr: z.string().optional(),
  subtitleEn: z.string().optional(),
  ctaLabelFr: z.string().optional(),
  ctaUrl: z.string().default("/catalogue"),
  isActive: z.boolean().default(true),
});

const SavePageSchema = z.object({
  type: z.literal("PAGE"),
  slug: z.string().min(2),
  titleFr: z.string().min(2),
  titleEn: z.string().optional(),
  contentFr: z.string().min(5),
  contentEn: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await getCurrentSession();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const supabase = requireSupabaseAdmin();
    const now = new Date().toISOString();

    if (body.type === "BANNER") {
      const parsed = SaveBannerSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Données bannière invalides." }, { status: 400 });
      }
      const d = parsed.data;
      const [titleEn, subtitleEn] = await Promise.all([
        autoTranslateFrToEn(d.titleFr),
        d.subtitleFr ? autoTranslateFrToEn(d.subtitleFr) : Promise.resolve(""),
      ]);
      if (d.id) {
        await supabase
          .from("banners")
          .update({
            title_fr: d.titleFr.trim(),
            title_en: titleEn || d.titleFr.trim(),
            subtitle_fr: d.subtitleFr?.trim() || null,
            subtitle_en: subtitleEn || null,
            cta_label_fr: d.ctaLabelFr?.trim() || "Explorer le catalogue",
            cta_label_en: d.ctaLabelFr?.trim() || "Explore Catalog",
            cta_url: d.ctaUrl.trim() || "/catalogue",
            is_active: d.isActive,
          })
          .eq("id", d.id);
      } else {
        await supabase.from("banners").insert({
          id: newId(),
          title_fr: d.titleFr.trim(),
          title_en: (d.titleEn || d.titleFr).trim(),
          subtitle_fr: d.subtitleFr?.trim() || null,
          subtitle_en: (d.subtitleEn || d.subtitleFr)?.trim() || null,
          cta_label_fr: d.ctaLabelFr?.trim() || "Explorer le catalogue",
          cta_label_en: d.ctaLabelFr?.trim() || "Explore Catalog",
          cta_url: d.ctaUrl.trim() || "/catalogue",
          is_active: d.isActive,
          sort_order: 1,
          created_at: now,
        });
      }
      await supabase.from("audit_logs").insert({
        id: newId(),
        user_id: session!.userId,
        action: "BANNER_UPDATED",
        entity_type: "Banner",
        created_at: now,
      });
      return NextResponse.json({ ok: true });
    }

    if (body.type === "PAGE") {
      const parsed = SavePageSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Données page légale invalides." }, { status: 400 });
      }
      const d = parsed.data;
      const { data: existing } = await supabase
        .from("cms_pages")
        .select("id")
        .eq("slug", d.slug)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("cms_pages")
          .update({
            title_fr: d.titleFr.trim(),
            title_en: (d.titleEn || d.titleFr).trim(),
            content_fr: d.contentFr.trim(),
            content_en: (d.contentEn || d.contentFr).trim(),
            updated_at: now,
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("cms_pages").insert({
          id: newId(),
          slug: d.slug,
          title_fr: d.titleFr.trim(),
          title_en: (d.titleEn || d.titleFr).trim(),
          content_fr: d.contentFr.trim(),
          content_en: (d.contentEn || d.contentFr).trim(),
          is_published: true,
          updated_at: now,
        });
      }

      await supabase.from("audit_logs").insert({
        id: newId(),
        user_id: session!.userId,
        action: "CMS_PAGE_UPDATED",
        entity_type: "CmsPage",
        entity_id: d.slug,
        created_at: now,
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Type inconnu." }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
