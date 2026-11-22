import { NextResponse } from "next/server";
import { getCurrentSession, isAdminSession } from "@/lib/security/auth";
import { importProductsFromBuffer } from "@/lib/services/catalog/import-service";

export async function POST(req: Request) {
  const session = await getCurrentSession();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Fichier CSV ou Excel requis." }, { status: 400 });
    }

    const maxBytes = 10 * 1024 * 1024; // 10 Mo
    if (file.size > maxBytes) {
      return NextResponse.json(
        { error: "Fichier trop volumineux (10 Mo maximum)." },
        { status: 400 }
      );
    }

    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith(".csv") && !lowerName.endsWith(".xlsx") && !lowerName.endsWith(".xls")) {
      return NextResponse.json(
        { error: "Format non supporté. Utilisez .csv, .xlsx ou .xls." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const report = await importProductsFromBuffer(Buffer.from(arrayBuffer));
    return NextResponse.json({ report });
  } catch (err) {
    return NextResponse.json(
      { error: "Erreur lors de l'importation.", details: String(err) },
      { status: 500 }
    );
  }
}

