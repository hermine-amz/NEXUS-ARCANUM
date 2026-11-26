import { requireSupabaseAdmin, newId } from "../src/lib/supabase";
import { encryptSecrets } from "../src/lib/security/crypto";

async function main() {
  const supabase = requireSupabaseAdmin();
  const now = new Date().toISOString();

  const defaults = [
    {
      code: "maketou",
      name: "Maketou Pay",
      description: "Mobile Money & Cartes — Collez simplement votre Clé API Maketou (Boutique → Autres → Clés API).",
      is_active: true,
      is_default: true,
      environment: "TEST",
      api_base_url: "https://api.maketou.net/api/v1",
      webhook_url: "/api/payments/webhooks/maketou",
      supported_currencies: ["XOF", "EUR", "USD"],
      supported_countries: ["BJ", "CI", "SN", "TG", "BF", "ML", "CM"],
      supported_operators: ["MTN", "MOOV", "WAVE", "ORANGE", "CARD"],
      fee_percent: 2.5,
      priority: 1,
    },
    {
      code: "fedapay",
      name: "FedaPay",
      description: "MTN MoMo, Moov Money, Celtiis & Cartes — Collez votre Clé API secrète depuis FedaPay → Développeurs.",
      is_active: true,
      is_default: false,
      environment: "TEST",
      api_base_url: "https://sandbox-api.fedapay.com/v1",
      webhook_url: "/api/payments/webhooks/fedapay",
      supported_currencies: ["XOF"],
      supported_countries: ["BJ", "TG", "CI", "SN", "BF", "NE"],
      supported_operators: ["MTN", "MOOV", "CELTIIS", "CARD"],
      fee_percent: 2.0,
      priority: 2,
    },
    {
      code: "kkiapay",
      name: "KKiaPay",
      description: "Encaissement instantané Mobile Money & Cartes — Collez votre Clé Publique depuis KKiaPay → Développeurs.",
      is_active: true,
      is_default: false,
      environment: "TEST",
      api_base_url: "https://api-sandbox.kkiapay.me",
      webhook_url: "/api/payments/webhooks/kkiapay",
      supported_currencies: ["XOF"],
      supported_countries: ["BJ", "TG", "CI", "SN"],
      supported_operators: ["MTN", "MOOV", "CELTIIS", "CARD"],
      fee_percent: 1.9,
      priority: 3,
    },
    {
      code: "saaspay",
      name: "SasPay",
      description: "Agrégateur panafricain multi-opérateurs — Collez votre Clé API SasPay pour activer.",
      is_active: true,
      is_default: false,
      environment: "TEST",
      api_base_url: "https://api.saspay.me/v1",
      webhook_url: "/api/payments/webhooks/saaspay",
      supported_currencies: ["XOF", "XAF"],
      supported_countries: ["BJ", "CI", "SN", "CM", "TG"],
      supported_operators: ["MTN", "MOOV", "ORANGE", "CARD"],
      fee_percent: 2.5,
      priority: 4,
    },
  ];

  // Désactiver les anciens agrégateurs secondaires non listés comme principaux (sans supprimer d'historique)
  await supabase
    .from("payment_gateways")
    .update({ is_active: false, is_default: false, updated_at: now })
    .in("code", ["sebpay", "geneci"]);

  for (const gw of defaults) {
    const { data: existing } = await supabase
      .from("payment_gateways")
      .select("id")
      .eq("code", gw.code)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("payment_gateways")
        .update({
          name: gw.name,
          description: gw.description,
          is_active: gw.is_active,
          is_default: gw.is_default,
          api_base_url: gw.api_base_url,
          supported_currencies: gw.supported_currencies,
          supported_countries: gw.supported_countries,
          supported_operators: gw.supported_operators,
          fee_percent: gw.fee_percent,
          priority: gw.priority,
          updated_at: now,
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("payment_gateways").insert({
        id: newId(),
        ...gw,
        fee_fixed_fcfa: 0,
        encrypted_secrets: encryptSecrets({ apiKey: "", webhookSecret: "" }),
        created_at: now,
        updated_at: now,
      });
    }
  }

  console.log("Agrégateurs par défaut configurés : Maketou Pay, FedaPay, KKiaPay, SasPay.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
