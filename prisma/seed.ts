import { PrismaClient, AssetKind, GatewayEnvironment } from "@prisma/client";
import fs from "fs";
import path from "path";
import { DEMO_CATEGORIES, DEMO_PRODUCTS } from "../src/lib/data/demo-catalog";
import { hashPassword, encryptSecrets } from "../src/lib/security/crypto";

const prisma = new PrismaClient();

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function main() {
  console.log("Seeding NEXUSARCANUM SHOP database...");

  // 1. Roles & Permissions
  const roleNames = [
    { name: "SUPER_ADMIN", description: "Accès complet plateforme et paiements" },
    { name: "ADMIN", description: "Gestion catalogue, commandes, clients" },
    { name: "EDITOR", description: "Gestion éditoriale du catalogue" },
    { name: "CUSTOMER", description: "Client lecteur" },
  ];

  const roles: Record<string, string> = {};
  for (const r of roleNames) {
    const upserted = await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description },
      create: r,
    });
    roles[r.name] = upserted.id;
  }

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
    const perm = await prisma.permission.upsert({
      where: { code },
      update: {},
      create: { code, description: code },
    });
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: roles.SUPER_ADMIN, permissionId: perm.id } },
      update: {},
      create: { roleId: roles.SUPER_ADMIN, permissionId: perm.id },
    });
  }

  // 2. Default Admin & Demo Reader accounts
  const adminPass = await hashPassword("NexusAdmin2026!");
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@nexusarcanum.shop" },
    update: {},
    create: {
      email: "admin@nexusarcanum.shop",
      passwordHash: adminPass,
      firstName: "Administrateur",
      lastName: "NexusArcanum",
      country: "BJ",
      preferredLang: "fr",
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: roles.SUPER_ADMIN } },
    update: {},
    create: { userId: adminUser.id, roleId: roles.SUPER_ADMIN },
  });

  const clientPass = await hashPassword("LecteurDemo2026!");
  const clientUser = await prisma.user.upsert({
    where: { email: "lecteur@nexusarcanum.shop" },
    update: {},
    create: {
      email: "lecteur@nexusarcanum.shop",
      passwordHash: clientPass,
      firstName: "Koffi",
      lastName: "Mensah",
      phone: "+2290100000000",
      country: "BJ",
      preferredLang: "fr",
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: clientUser.id, roleId: roles.CUSTOMER } },
    update: {},
    create: { userId: clientUser.id, roleId: roles.CUSTOMER },
  });

  // 3. 16 Categories
  const categoryMap = new Map<string, string>();
  for (const cat of DEMO_CATEGORIES) {
    const record = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {
        nameFr: cat.nameFr,
        nameEn: cat.nameEn,
        descriptionFr: cat.descriptionFr,
        descriptionEn: cat.descriptionEn,
        icon: cat.icon,
        sortOrder: cat.sortOrder,
      },
      create: cat,
    });
    categoryMap.set(cat.slug, record.id);
  }

  // 4. 32 Demo Products + Authors + Publishers + DigitalAssets
  for (const p of DEMO_PRODUCTS) {
    const authorSlug = slugify(p.authorName);
    const author = await prisma.author.upsert({
      where: { slug: authorSlug },
      update: { name: p.authorName },
      create: {
        slug: authorSlug,
        name: p.authorName,
        country: "BJ",
        bioFr: `${p.authorName} est auteur(e) partenaire du catalogue de démonstration NEXUSARCANUM SHOP.`,
        bioEn: `${p.authorName} is a partner author in the NEXUSARCANUM SHOP demo catalog.`,
      },
    });

    const pubSlug = slugify(p.publisherName);
    const publisher = await prisma.publisher.upsert({
      where: { slug: pubSlug },
      update: { name: p.publisherName },
      create: {
        slug: pubSlug,
        name: p.publisherName,
        country: "BJ",
      },
    });

    const categoryId = categoryMap.get(p.categorySlug)!;
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        titleFr: p.titleFr,
        titleEn: p.titleEn,
        subtitleFr: p.subtitleFr,
        subtitleEn: p.subtitleEn,
        priceFcfa: p.priceFcfa,
        promoPriceFcfa: p.promoPriceFcfa ?? null,
        isFree: Boolean(p.isFree),
        isNewArrival: Boolean(p.isNewArrival),
        isBestseller: Boolean(p.isBestseller),
        isRecommended: Boolean(p.isRecommended),
        collectionTag: p.collectionTag ?? null,
        coverUrl: `/covers/${p.slug}.svg`,
      },
      create: {
        slug: p.slug,
        titleFr: p.titleFr,
        titleEn: p.titleEn,
        subtitleFr: p.subtitleFr,
        subtitleEn: p.subtitleEn,
        shortDescFr: p.shortDescFr,
        shortDescEn: p.shortDescEn,
        longDescFr: p.longDescFr,
        longDescEn: p.longDescEn,
        summaryFr: p.summaryFr,
        summaryEn: p.summaryEn,
        productType: p.productType,
        primaryFormat: p.primaryFormat,
        pageCount: p.pageCount,
        language: p.language,
        coverUrl: `/covers/${p.slug}.svg`,
        priceFcfa: p.priceFcfa,
        promoPriceFcfa: p.promoPriceFcfa ?? null,
        isFree: Boolean(p.isFree),
        isDemo: true,
        demoNotice: "PRODUIT DE DÉMONSTRATION — CONTENU NON COMMERCIAL",
        isNewArrival: Boolean(p.isNewArrival),
        isBestseller: Boolean(p.isBestseller),
        isRecommended: Boolean(p.isRecommended),
        collectionTag: p.collectionTag ?? null,
        categoryId,
        authorId: author.id,
        publisherId: publisher.id,
      },
    });

    const existingAssets = await prisma.digitalAsset.count({ where: { productId: product.id } });
    if (existingAssets === 0) {
      const extractPath = `/demo-extracts/${p.slug}-extrait.pdf`;
      const extractDisk = path.join(process.cwd(), "public", "demo-extracts", `${p.slug}-extrait.pdf`);
      const extractSize = fs.existsSync(extractDisk) ? fs.statSync(extractDisk).size : 1024;

      const fullPath = `storage/private/${p.slug}-complet.pdf`;
      const fullDisk = path.join(process.cwd(), fullPath);
      const fullSize = fs.existsSync(fullDisk) ? fs.statSync(fullDisk).size : 2048;

      await prisma.digitalAsset.createMany({
        data: [
          {
            productId: product.id,
            assetKind: AssetKind.FREE_EXTRACT,
            format: "PDF",
            fileName: `${p.slug}-extrait.pdf`,
            storagePath: extractPath,
            mimeType: "application/pdf",
            fileSizeBytes: extractSize,
            isPrivate: false,
          },
          {
            productId: product.id,
            assetKind: AssetKind.FULL_PRODUCT,
            format: p.primaryFormat,
            fileName: `${p.slug}-complet.pdf`,
            storagePath: fullPath,
            mimeType: "application/pdf",
            fileSizeBytes: fullSize,
            isPrivate: true,
          },
        ],
      });
    }
  }

  // 5. Payment Gateways (Multi-Agrégateurs)
  const gateways = [
    {
      code: "maketou",
      name: "Maketou Pay",
      description: "Passerelle Maketou (Mobile Money & Cartes via Moneroo) — docs-api.maketou.com",
      isActive: true,
      isDefault: true,
      environment: GatewayEnvironment.TEST,
      apiBaseUrl: "https://api.maketou.net/api/v1",
      webhookUrl: "/api/payments/webhooks/maketou",
      supportedCurrencies: ["XOF", "EUR", "USD"],
      supportedCountries: ["BJ", "CI", "SN", "TG", "BF", "ML", "CM"],
      supportedOperators: ["MTN", "MOOV", "WAVE", "ORANGE", "CARD"],
      feePercent: 2.5,
      feeFixedFcfa: 0,
      priority: 1,
      encryptedSecrets: encryptSecrets({ apiKey: "", webhookSecret: "" }),
    },
    {
      code: "sebpay",
      name: "SebPay Africa",
      description: "Agrégateur béninois (MTN MoMo, Moov Money, Celtiis, Cartes)",
      isActive: true,
      isDefault: false,
      environment: GatewayEnvironment.TEST,
      apiBaseUrl: "https://api.sebpay.africa/v1",
      webhookUrl: "/api/payments/webhooks/sebpay",
      supportedCurrencies: ["XOF"],
      supportedCountries: ["BJ", "TG", "CI", "SN", "BF"],
      supportedOperators: ["MTN", "MOOV", "CELTIIS", "CARD"],
      feePercent: 2.7,
      feeFixedFcfa: 0,
      priority: 2,
      encryptedSecrets: encryptSecrets({ apiKey: "", secretKey: "", webhookSecret: "" }),
    },
    {
      code: "saaspay",
      name: "SaaSPay",
      description: "Agrégateur panafricain multi-opérateurs (à configurer avec vos clés API)",
      isActive: false,
      isDefault: false,
      environment: GatewayEnvironment.TEST,
      apiBaseUrl: "https://api.saspay.me/v1",
      webhookUrl: "/api/payments/webhooks/saaspay",
      supportedCurrencies: ["XOF", "XAF"],
      supportedCountries: ["BJ", "CI", "SN", "CM"],
      supportedOperators: ["MTN", "MOOV", "ORANGE"],
      feePercent: 2.8,
      feeFixedFcfa: 0,
      priority: 3,
      encryptedSecrets: encryptSecrets({ apiKey: "", webhookSecret: "" }),
    },
    {
      code: "geneci",
      name: "Geneci.ci",
      description: "Connecteur réservé — en attente de la documentation API officielle",
      isActive: false,
      isDefault: false,
      environment: GatewayEnvironment.TEST,
      apiBaseUrl: "",
      webhookUrl: "/api/payments/webhooks/geneci",
      supportedCurrencies: ["XOF"],
      supportedCountries: ["CI", "BJ"],
      supportedOperators: ["MTN", "ORANGE", "MOOV", "WAVE"],
      feePercent: 2.5,
      feeFixedFcfa: 0,
      priority: 4,
      encryptedSecrets: encryptSecrets({}),
    },
  ];

  for (const gw of gateways) {
    await prisma.paymentGateway.upsert({
      where: { code: gw.code },
      update: {
        name: gw.name,
        description: gw.description,
        apiBaseUrl: gw.apiBaseUrl,
      },
      create: gw,
    });
  }

  // 6. Site Settings & CMS Pages
  await prisma.siteSetting.upsert({
    where: { key: "payment_routing_mode" },
    update: {},
    create: { key: "payment_routing_mode", value: "MODE_B" },
  });

  const legalPages = [
    {
      slug: "conditions-generales",
      titleFr: "Conditions Générales d'Utilisation et de Vente",
      titleEn: "Terms of Use & Sale",
      contentFr:
        "NEXUSARCANUM SHOP commercialise exclusivement des produits numériques (livres PDF, EPUB, audio, formations et guides). Aucun produit physique n'est expédié. Les accès sont délivrés immédiatement dans votre bibliothèque personnelle après confirmation du paiement.",
      contentEn:
        "NEXUSARCANUM SHOP exclusively sells digital products. No physical goods are shipped. Digital access is granted immediately in your personal library upon payment confirmation.",
    },
    {
      slug: "confidentialite",
      titleFr: "Politique de Confidentialité",
      titleEn: "Privacy Policy",
      contentFr:
        "Vos données personnelles sont traitées uniquement pour la gestion de votre compte, la facturation et l'accès sécurisé à votre bibliothèque numérique.",
      contentEn:
        "Your personal data is processed solely for account management, billing, and secure access to your digital library.",
    },
    {
      slug: "droits-auteur-licences",
      titleFr: "Droits d'Auteur & Licences Numériques",
      titleEn: "Copyright & Digital Licenses",
      contentFr:
        "Chaque ouvrage acheté confère une licence d'utilisation personnelle, non transférable et non commerciale. Toute reproduction ou redistribution non autorisée est interdite.",
      contentEn:
        "Each purchased work grants a personal, non-transferable, non-commercial license. Unauthorized reproduction or redistribution is prohibited.",
    },
    {
      slug: "politique-remboursement",
      titleFr: "Politique de Remboursement",
      titleEn: "Refund Policy",
      contentFr:
        "S'agissant de contenus numériques immédiatement accessibles, les achats confirmés ne sont remboursables qu'en cas de défaut technique avéré ou de double facturation.",
      contentEn:
        "As digital content is delivered immediately, confirmed purchases are only refundable in case of verified technical defect or duplicate billing.",
    },
  ];

  for (const page of legalPages) {
    await prisma.cmsPage.upsert({
      where: { slug: page.slug },
      update: {},
      create: page,
    });
  }

  console.log("Seed completed: 16 categories, 32 demo products, 4 payment gateways, RBAC & CMS.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

