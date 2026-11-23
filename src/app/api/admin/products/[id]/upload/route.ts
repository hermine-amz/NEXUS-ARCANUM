import { NextResponse } from "next/server";
import { requireSupabaseAdmin, newId } from "@/lib/supabase";
import { getCurrentSession, isAdminSession } from "@/lib/security/auth";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }

  const { id: productId } = await context.params;

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const kind = String(formData.get("kind") || "");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Fichier requis." }, { status: 400 });
    }

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "Fichier trop volumineux (50 Mo max)." }, { status: 400 });
    }

    const supabase = requireSupabaseAdmin();
    const { data: product } = await supabase
      .from("products")
      .select("id, slug")
      .eq("id", productId)
      .maybeSingle();

    if (!product) {
      return NextResponse.json({ error: "Produit introuvable." }, { status: 404 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
    const now = new Date().toISOString();

    if (kind === "COVER" || kind === "FREE_EXTRACT") {
      const publicBucket = "public-media";
      const { data: buckets } = await supabase.storage.listBuckets();
      if (!buckets?.some((b) => b.name === publicBucket)) {
        await supabase.storage.createBucket(publicBucket, { public: true });
      }

      const folder = kind === "COVER" ? "covers" : "extracts";
      const storageFileName = `${folder}/${product.slug}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(publicBucket)
        .upload(storageFileName, buffer, {
          contentType: file.type || "application/octet-stream",
          upsert: true,
        });

      if (upErr) {
        return NextResponse.json({ error: upErr.message }, { status: 500 });
      }

      const { data: urlData } = supabase.storage
        .from(publicBucket)
        .getPublicUrl(storageFileName);
      const publicUrl = urlData.publicUrl;

      if (kind === "COVER") {
        await supabase
          .from("products")
          .update({ cover_url: publicUrl, updated_at: now })
          .eq("id", productId);
        return NextResponse.json({ ok: true, coverUrl: publicUrl });
      }

      // FREE_EXTRACT
      await supabase
        .from("digital_assets")
        .delete()
        .eq("product_id", productId)
        .eq("asset_kind", "FREE_EXTRACT");

      await supabase.from("digital_assets").insert({
        id: newId(),
        product_id: productId,
        asset_kind: "FREE_EXTRACT",
        format: ext.toUpperCase(),
        file_name: file.name,
        storage_path: publicUrl,
        mime_type: file.type || "application/pdf",
        file_size_bytes: file.size,
        is_private: false,
        created_at: now,
      });

      return NextResponse.json({ ok: true, url: publicUrl });
    }

    if (kind === "FULL_PRODUCT") {
      const privateBucket = process.env.SUPABASE_PRIVATE_BUCKET || "private-assets";
      const storageFileName = `${product.slug}-complet-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(privateBucket)
        .upload(storageFileName, buffer, {
          contentType: file.type || "application/pdf",
          upsert: true,
        });

      if (upErr) {
        return NextResponse.json({ error: upErr.message }, { status: 500 });
      }

      await supabase.from("digital_assets").insert({
        id: newId(),
        product_id: productId,
        asset_kind: "FULL_PRODUCT",
        format: ext.toUpperCase(),
        file_name: file.name,
        storage_path: `storage/private/${storageFileName}`,
        mime_type: file.type || "application/pdf",
        file_size_bytes: file.size,
        is_private: true,
        created_at: now,
      });

      return NextResponse.json({ ok: true, fileName: storageFileName });
    }

    return NextResponse.json({ error: "Type d'upload invalide." }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
