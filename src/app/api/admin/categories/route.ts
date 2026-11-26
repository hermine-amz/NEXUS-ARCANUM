import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSupabaseAdmin, newId } from "@/lib/supabase";
import { getCurrentSession, isAdminSession } from "@/lib/security/auth";
import { autoTranslateFrToEn } from "@/lib/services/translate";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function GET() {
  const session = await getCurrentSession();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }

  try {
    const supabase = requireSupabaseAdmin();
    const [{ data: cats }, { data: prods }] = await Promise.all([
      supabase.from("categories").select("*").order("sort_order", { ascending: true }),
      supabase.from("products").select("category_id").eq("is_archived", false),
    ]);

    const countMap = new Map<string, number>();
    for (const p of prods || []) {
      countMap.set(p.category_id, (countMap.get(p.category_id) || 0) + 1);
    }

    return NextResponse.json({
      categories: (cats || []).map((c) => ({
        id: c.id,
        slug: c.slug,
        nameFr: c.name_fr,
        nameEn: c.name_en,
        descriptionFr: c.description_fr || "",
        sortOrder: c.sort_order,
        isActive: c.is_active,
        parentId: c.parent_id,
        productCount: countMap.get(c.id) || 0,
      })),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

const CreateCategorySchema = z.object({
  nameFr: z.string().min(2, "Nom requis"),
  nameEn: z.string().optional(),
  descriptionFr: z.string().optional(),
  parentId: z.string().nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).default(17),
});

export async function POST(req: Request) {
  const session = await getCurrentSession();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = CreateCategorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalide" }, { status: 400 });
    }

    const supabase = requireSupabaseAdmin();
    const now = new Date().toISOString();
    const slug = slugify(parsed.data.nameFr);
    const id = newId();
    const nameEn = await autoTranslateFrToEn(parsed.data.nameFr);

    const { error } = await supabase.from("categories").insert({
      id,
      slug,
      name_fr: parsed.data.nameFr.trim(),
      name_en: nameEn || parsed.data.nameFr.trim(),
      description_fr: parsed.data.descriptionFr?.trim() || null,
      description_en: parsed.data.descriptionFr?.trim() || null,
      parent_id: parsed.data.parentId || null,
      sort_order: parsed.data.sortOrder,
      is_active: true,
      created_at: now,
      updated_at: now,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await supabase.from("audit_logs").insert({
      id: newId(),
      user_id: session!.userId,
      action: "CATEGORY_CREATED",
      entity_type: "Category",
      entity_id: id,
      details: { nameFr: parsed.data.nameFr },
      created_at: now,
    });

    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

const PatchCategorySchema = z.object({
  id: z.string().min(1),
  nameFr: z.string().min(2).optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  const session = await getCurrentSession();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = PatchCategorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides." }, { status: 400 });
    }

    const supabase = requireSupabaseAdmin();
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (parsed.data.nameFr !== undefined) update.name_fr = parsed.data.nameFr.trim();
    if (parsed.data.sortOrder !== undefined) update.sort_order = parsed.data.sortOrder;
    if (parsed.data.isActive !== undefined) update.is_active = parsed.data.isActive;

    const { error } = await supabase
      .from("categories")
      .update(update)
      .eq("id", parsed.data.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getCurrentSession();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });

  const supabase = requireSupabaseAdmin();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) {
    return NextResponse.json(
      { error: "Impossible de supprimer une catégorie contenant encore des produits." },
      { status: 400 }
    );
  }
  return NextResponse.json({ ok: true });
}
