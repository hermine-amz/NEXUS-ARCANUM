/**
 * Traduction automatique FR -> EN côté serveur afin que l'administrateur
 * n'ait jamais à traduire manuellement ses fiches produits, catégories ou pages.
 */
export async function autoTranslateFrToEn(text: string | null | undefined): Promise<string> {
  const clean = (text || "").trim();
  if (!clean) return "";

  try {
    // API publique Google Translate (gtx) — rapide, sans clé, fallback silencieux sur le texte FR si indisponible
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=fr&tl=en&dt=t&q=${encodeURIComponent(
      clean.slice(0, 3500)
    )}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) return clean;
    const data = await res.json();
    if (Array.isArray(data) && Array.isArray(data[0])) {
      const translated = data[0]
        .map((chunk: unknown) => (Array.isArray(chunk) ? String(chunk[0] || "") : ""))
        .join("")
        .trim();
      return translated || clean;
    }
    return clean;
  } catch {
    return clean;
  }
}
