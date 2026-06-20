import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/session";
import { stockerFichier } from "@/lib/blob-storage";

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-project",
  "text/csv",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/octet-stream", // fallback pour .mpp
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

  const maxSize = 30 * 1024 * 1024; // 30 Mo
  if (file.size > maxSize) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 30 Mo)" }, { status: 413 });
  }

  const { url } = await stockerFichier(file, "annexes");

  return NextResponse.json({
    fichier: url,
    taille: file.size,
    type: file.type || "application/octet-stream",
  });
}
