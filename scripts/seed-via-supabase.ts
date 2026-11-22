import crypto from "crypto";
import fs from "fs";
import path from "path";
import { getSupabaseAdminClient } from "../src/lib/supabase";
import { DEMO_CATEGORIES, DEMO_PRODUCTS } from "../src/lib/data/demo-catalog";
import { hashPassword, encryptSecrets } from "../src/lib/security/crypto";

function cuid(): string {
  return "c" + crypto.randomBytes(12).toString("hex");
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function main() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    console.error("SUPABASE_SERVICE_ROLE_KEY manquant dans .env");
    process.exit(1);
  }

  console.log("Initialisation des données NEXUSARCANUM SHOP via Supabase API...");
  const now = new Date().toISOString();

  // 1. Roles
  const roleDefs = [
    { name: "SUPER_ADMIN", description: "Accès complet plateforme et paiements" },
    { name: "ADMIN", description: "Gestion catalogue, commandes, clients" },
    { name: "EDITOR", description: "Gestion éditoriale du catalogue" },
    { name: "CUSTOMER", description: "Client lecteur" },
  ];

  const roleIds: Record<string, string> = {};
  for (const r of roleDefs) {
    const { data: existing } = await supabase
      .from("roles")
      .select("id")
      .eq("name", r.name)
      .maybeSingle();
    if (existing) {
      roleIds[r.name] = existing.id;
    } else {
      const id = cuid();
      const { error } = await supabase
        .from("roles")
        .insert({ id, name: r.name, description: r.description, created_at: now });
      if (error) throw new Error(`Role ${r.name}: ${error.message}`);
      roleIds[r.name] = id;
    }
  }

  // 2. Permissions
  const permCodes = [
    "catalog.read",
    "catalog.write",
    "orders.read",
    "orders.manage",
    "payments.manage",
    "users.manage",
    "import.execute",
  ];
  for (const code of permCodes) {
    const { data: existing } = await supabase
      .from("permissions")
      .select("id")
      .eq("code", code)
      .maybeSingle();
    let permId = existing?.id;
    if (!permId) {
      permId = cuid();
      const { error } = await supabase
        .from("permissions")
        .insert({ id: permId, code, description: code });
      if (error) throw new Error(`Permission ${code}: ${error.message}`);
    }
    await supabase
      .from("role_permissions")
      .upsert(
        { role_id: roleIds.SUPER_ADMIN, permission_id: permId },
        { onConflict: "role_id,permission_id" }
      );
  }

  // 3. Admin & Demo Reader users
  const upsertUser = async (u: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    roleName: string;
  }) => {
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", u.email)
      .maybeSingle();
    let userId = existing?.id;
    if (!userId) {
      userId = cuid();
      const passwordHash = await hashPassword(u.password);
      const { error } = await supabase.from("users").insert({
        id: userId,
        email: u.email,
        password_hash: passwordHash,
        first_name: u.firstName,
        last_name: u.lastName,
        phone: u.phone ?? null,
        country: "BJ",
        preferred_lang: "fr",
        is_active: true,
        created_at: now,
        updated_at: now,
      });
      if (error) throw new Error(`User ${u.email}: ${error.message}`);
    }
    await supabase
      .from("user_roles")
      .upsert(
        { user_id: userId, role_id: roleIds[u.roleName] },
        { onConflict: "user_id,role_id" }
      );
  };

  await upsertUser({
    email: "admin@nexusarcanum.shop",
    password: "NexusAdmin2026!",
    firstName: "Administrateur",
    lastName: "NexusArcanum",
    roleName: "SUPER_ADMIN",
  });

  await upsertUser({
    email: "lecteur@nexusarcanum.shop",
    password: "LecteurDemo2026!",
    firstName: "Koffi",
    lastName: "Mensah",
    phone: "+2290100000000",
    roleName: "CUSTOMER",
  });

  // 4. 16 Categories
  const categoryMap = new Map<string, string>();
  for (const cat of DEMO_CATEGORIES) {
    const { data: existing } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", cat.slug)
      .maybeSingle();
    if (existing) {
      categoryMap.set(cat.slug, existing.id);
    } else {
      const id = cuid();
      const { error } = await supabase.from("categories").insert({
        id,
        slug: cat.slug,
        name_fr: cat.nameFr,
        name_en: cat.nameEn,
        description_fr: cat.descriptionFr,
        description_en: cat.descriptionEn,
        icon: cat.icon,
        sort_order: cat.sortOrder,
        is_active: true,
        created_at: now,
        updated_at: now,
      });
      if (error) throw new Error(`Category ${cat.slug}: ${error.message}`);
      categoryMap.set(cat.slug, id);
    }
  }

  // 5. 32 Demo Products + Authors + Publishers + Digital Assets
  let productsSeeded = 0;
  for (const p of DEMO_PRODUCTS) {
    const authorSlug = slugify(p.authorName);
    let { data: author } = await supabase
      .from("authors")
      .select("id")
      .eq("slug", authorSlug)
      .maybeSingle();
    if (!author) {
      const id = cuid();
      const { error } = await supabase.from("authors").insert({
        id,
        slug: authorSlug,
        name: p.authorName,
        country: "BJ",
        bio_fr: `${p.authorName} est auteur(e) partenaire du catalogue de démonstration NEXUSARCANUM SHOP.`,
        bio_en: `${p.authorName} is a partner author in the NEXUSARCANUM SHOP demo catalog.`,
        created_at: now,
        updated_at: now,
      });
      if (error) throw new Error(`Author ${authorSlug}: ${error.message}`);
      author = { id };
    }

    const pubSlug = slugify(p.publisherName);
    let { data: pub } = await supabase
      .from("publishers")
      .select("id")
      .eq("slug", pubSlug)
      .maybeSingle();
    if (!pub) {
      const id = cuid();
      const { error } = await supabase.from("publishers").insert({
        id,
        slug: pubSlug,
        name: p.publisherName,
        country: "BJ",
        created_at: now,
        updated_at: now,
      });
      if (error) throw new Error(`Publisher ${pubSlug}: ${error.message}`);
      pub = { id };
    }

    let { data: prod } = await supabase
      .from("products")
      .select("id")
      .eq("slug", p.slug)
      .maybeSingle();

    if (!prod) {
      const id = cuid();
      const { error } = await supabase.from("products").insert({
        id,
        slug: p.slug,
        title_fr: p.titleFr,
        title_en: p.titleEn,
        subtitle_fr: p.subtitleFr,
        subtitle_en: p.subtitleEn,
        short_desc_fr: p.shortDescFr,
        short_desc_en: p.shortDescEn,
        long_desc_fr: p.longDescFr,
        long_desc_en: p.longDescEn,
        summary_fr: p.summaryFr,
        summary_en: p.summaryEn,
        product_type: p.productType,
        primary_format: p.primaryFormat,
        page_count: p.pageCount,
        language: p.language,
        cover_url: `/covers/${p.slug}.svg`,
        price_fcfa: p.priceFcfa,
        promo_price_fcfa: p.promoPriceFcfa ?? null,
        is_free: Boolean(p.isFree),
        is_demo: true,
        demo_notice: "PRODUIT DE DÉMONSTRATION — CONTENU NON COMMERCIAL",
        is_archived: false,
        is_hidden_from_public: false,
        is_published: true,
        is_new_arrival: Boolean(p.isNewArrival),
        is_bestseller: Boolean(p.isBestseller),
        is_recommended: Boolean(p.isRecommended),
        collection_tag: p.collectionTag ?? null,
        category_id: categoryMap.get(p.categorySlug)!,
        author_id: author.id,
        publisher_id: pub.id,
        created_at: now,
        updated_at: now,
      });
      if (error) throw new Error(`Product ${p.slug}: ${error.message}`);
      prod = { id };
    }

    const { count: assetCount } = await supabase
      .from("digital_assets")
      .select("id", { count: "exact", head: true })
      .eq("product_id", prod.id);

    if (!assetCount) {
      const extractDisk = path.join(process.cwd(), "public", "demo-extracts", `${p.slug}-extrait.pdf`);
      const extractSize = fs.existsSync(extractDisk) ? fs.statSync(extractDisk).size : 1024;
      const fullDisk = path.join(process.cwd(), "storage", "private", `${p.slug}-complet.pdf`);
      const fullSize = fs.existsSync(fullDisk) ? fs.statSync(fullDisk).size : 2048;

      const { error } = await supabase.from("digital_assets").insert([
        {
          id: cuid(),
          product_id: prod.id,
          asset_kind: "FREE_EXTRACT",
          format: "PDF",
          file_name: `${p.slug}-extrait.pdf`,
          storage_path: `/demo-extracts/${p.slug}-extrait.pdf`,
          mime_type: "application/pdf",
          file_size_bytes: extractSize,
          is_private: false,
          created_at: now,
        },
        {
          id: cuid(),
          product_id: prod.id,
          asset_kind: "FULL_PRODUCT",
          format: p.primaryFormat,
          file_name: `${p.slug}-complet.pdf`,
          storage_path: `storage/private/${p.slug}-complet.pdf`,
          mime_type: "application/pdf",
          file_size_bytes: fullSize,
          is_private: true,
          created_at: now,
        },
      ]);
      if (error) throw new Error(`Assets ${p.slug}: ${error.message}`);
    }
    productsSeeded++;
  }

  // 6. Payment Gateways
  const gateways = [
    {
      code: "maketou",
      name: "Maketou Pay",
      description: "Passerelle Maketou (Mobile Money & Cartes via Moneroo) — docs-api.maketou.com",
      is_active: true,
      is_default: true,
      environment: "TEST",
      api_base_url: "https://api.maketou.net/api/v1",
      webhook_url: "/api/payments/webhooks/maketou",
      supported_currencies: ["XOF", "EUR", "USD"],
      supported_countries: ["BJ", "CI", "SN", "TG", "BF", "ML", "CM"],
      supported_operators: ["MTN", "MOOV", "WAVE", "ORANGE", "CARD"],
      fee_percent: 2.5,
      fee_fixed_fcfa: 0,
      priority: 1,
      encrypted_secrets: encryptSecrets({ apiKey: "", webhookSecret: "" }),
    },
    {
      code: "sebpay",
      name: "SebPay Africa",
      description: "Agrégateur béninois (MTN MoMo, Moov Money, Celtiis, Cartes)",
      is_active: true,
      is_default: false,
      environment: "TEST",
      api_base_url: "https://api.sebpay.africa/v1",
      webhook_url: "/api/payments/webhooks/sebpay",
      supported_currencies: ["XOF"],
      supported_countries: ["BJ", "TG", "CI", "SN", "BF"],
      supported_operators: ["MTN", "MOOV", "CELTIIS", "CARD"],
      fee_percent: 2.7,
      fee_fixed_fcfa: 0,
      priority: 2,
      encrypted_secrets: encryptSecrets({ apiKey: "", secretKey: "", webhookSecret: "" }),
    },
    {
      code: "saaspay",
      name: "SaaSPay",
      description: "Agrégateur panafricain multi-opérateurs (à configurer avec vos clés API)",
      is_active: false,
      is_default: false,
      environment: "TEST",
      api_base_url: "https://api.saspay.me/v1",
      webhook_url: "/api/payments/webhooks/saaspay",
      supported_currencies: ["XOF", "XAF"],
      supported_countries: ["BJ", "CI", "SN", "CM"],
      supported_operators: ["MTN", "MOOV", "ORANGE"],
      fee_percent: 2.8,
      fee_fixed_fcfa: 0,
      priority: 3,
      encrypted_secrets: encryptSecrets({ apiKey: "", webhookSecret: "" }),
    },
    {
      code: "geneci",
      name: "Geneci.ci",
      description: "Connecteur réservé — en attente de la documentation API officielle",
      is_active: false,
      is_default: false,
      environment: "TEST",
      api_base_url: "",
      webhook_url: "/api/payments/webhooks/geneci",
      supported_currencies: ["XOF"],
      supported_countries: ["CI", "BJ"],
      supported_operators: ["MTN", "ORANGE", "MOOV", "WAVE"],
      fee_percent: 2.5,
      fee_fixed_fcfa: 0,
      priority: 4,
      encrypted_secrets: encryptSecrets({}),
    },
  ];

  for (const gw of gateways) {
    const { data: existing } = await supabase
      .from("payment_gateways")
      .select("id")
      .eq("code", gw.code)
      .maybeSingle();
    if (!existing) {
      const { error } = await supabase.from("payment_gateways").insert({
        id: cuid(),
        ...gw,
        created_at: now,
        updated_at: now,
      });
      if (error) throw new Error(`Gateway ${gw.code}: ${error.message}`);
    }
  }

  // 7. Site settings
  await supabase.from("site_settings").upsert(
    { key: "payment_routing_mode", value: "MODE_B", updated_at: now },
    { onConflict: "key" }
  );

  console.log(
    `SUCCÈS Supabase : 16 catégories, ${productsSeeded} produits de démo, 4 passerelles de paiement et comptes admin/client initialisés !`
  );
}

main().catch((err) => {
  console.error("Erreur seed Supabase :", err);
  process.exit(1);
});
