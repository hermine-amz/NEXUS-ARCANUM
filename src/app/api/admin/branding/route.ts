import { NextResponse } from "next/server";
import { requireSupabaseAdmin, newId } from "@/lib/supabase";
import { getCurrentSession, isAdminSession } from "@/lib/security/auth";

export async function POST(req: Request) {
  const session = await getCurrentSession();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }

  try {
    const supabase = requireSupabaseAdmin();
    const contentType = req.headers.get("content-type") || "";
    const now = new Date().toISOString();

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file");
      if (!(file instanceof File) || file.size === 0) {
        return NextResponse.json({ error: "Aucun fichier image reçu." }, { status: 400 });
      }
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: "Image trop volumineuse (max 5 Mo)." }, { status: 400 });
      }

      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const safeExt = ["png", "jpg", "jpeg", "webp", "svg"].includes(ext) ? ext : "png";
      const path = `branding/logo-${Date.now()}.${safeExt}`;
      const arrayBuffer = await file.arrayBuffer();

      // S'assurer que le bucket public-media existe
      await supabase.storage
        .createBucket("public-media", { public: true })
        .catch(() => {});

      const { error: upErr } = await supabase.storage
        .from("public-media")
        .upload(path, Buffer.from(arrayBuffer), {
          contentType: file.type || `image/${safeExt}`,
          upsert: true,
        });

      if (upErr) {
        return NextResponse.json(
          { error: `Échec upload logo : ${upErr.message}` },
          { status: 500 }
        );
      }

      const { data: pub } = supabase.storage.from("public-media").getPublicUrl(path);
      const logoUrl = pub.publicUrl;

      await supabase.from("site_settings").upsert(
        { key: "site_logo_url", value: logoUrl, updated_at: now },
        { onConflict: "key" }
      );

      await supabase.from("audit_logs").insert({
        id: newId(),
        user_id: session!.userId,
        action: "BRANDING_UPDATED",
        entity_type: "SiteSetting",
        entity_id: "site_logo_url",
        details: { logoUrl },
        created_at: now,
      });

      return NextResponse.json({ ok: true, siteLogoUrl: logoUrl });
    }

    const body = await req.json();
    const siteName = typeof body.siteName === "string" ? body.siteName.trim() : "";
    const siteTagline = typeof body.siteTagline === "string" ? body.siteTagline.trim() : "";
    const siteLogoUrl = typeof body.siteLogoUrl === "string" ? body.siteLogoUrl.trim() : undefined;

    if (siteName.length < 2) {
      return NextResponse.json(
        { error: "Le nom de la boutique doit contenir au moins 2 caractères." },
        { status: 400 }
      );
    }

    const upserts = [
      { key: "site_name", value: siteName, updated_at: now },
      { key: "site_tagline", value: siteTagline || "SHOP • LIBRAIRIE NUMÉRIQUE", updated_at: now },
    ];
    if (siteLogoUrl !== undefined) {
      upserts.push({ key: "site_logo_url", value: siteLogoUrl, updated_at: now });
    }

    await supabase.from("site_settings").upsert(upserts, { onConflict: "key" });

    await supabase.from("audit_logs").insert({
      id: newId(),
      user_id: session!.userId,
      action: "BRANDING_UPDATED",
      entity_type: "SiteSetting",
      entity_id: "branding",
      details: { siteName },
      created_at: now,
    });

    return NextResponse.json({
      ok: true,
      siteName,
      siteTagline: siteTagline || "SHOP • LIBRAIRIE NUMÉRIQUE",
      siteLogoUrl,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
