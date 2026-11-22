import fs from "fs";
import path from "path";
import { getSupabaseAdminClient } from "../src/lib/supabase";

async function main() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    console.error("SUPABASE_SERVICE_ROLE_KEY manquant dans .env");
    process.exit(1);
  }

  const bucket = process.env.SUPABASE_PRIVATE_BUCKET || "private-assets";
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some((b) => b.name === bucket)) {
    const { error } = await supabase.storage.createBucket(bucket, { public: false });
    if (error) {
      console.error("Erreur création bucket privé :", error.message);
      process.exit(1);
    }
    console.log(`Bucket privé "${bucket}" créé.`);
  }

  const privateDir = path.join(process.cwd(), "storage", "private");
  const files = fs.readdirSync(privateDir);
  let uploaded = 0;

  for (const file of files) {
    const buf = fs.readFileSync(path.join(privateDir, file));
    const { error } = await supabase.storage.from(bucket).upload(file, buf, {
      contentType: "application/pdf",
      upsert: true,
    });
    if (error) {
      console.error(`Échec upload ${file}:`, error.message);
    } else {
      uploaded++;
    }
  }

  console.log(`${uploaded}/${files.length} fichiers privés envoyés vers Supabase Storage (${bucket}).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
