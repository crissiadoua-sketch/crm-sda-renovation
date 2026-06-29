import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/session";
import { stockerFichier } from "@/lib/blob-storage";

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const session = await decrypt(cookieStore.get("session")?.value);
  if (!session?.userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
  }

  if (file.type && !ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Format non supporté (PDF, JPEG, PNG ou WEBP attendu)" }, { status: 415 });
  }

  const maxSize = 15 * 1024 * 1024; // 15 Mo
  if (file.size > maxSize) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 15 Mo)" }, { status: 413 });
  }

  const { url } = await stockerFichier(file, "depenses-factures");

  return NextResponse.json({ url, nom: file.name });
}
