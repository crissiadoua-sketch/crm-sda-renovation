import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/session";
import { stockerFichier } from "@/lib/blob-storage";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const session = await decrypt(cookieStore.get("session")?.value);
  if (!session?.userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "Aucun fichier" }, { status: 400 });

  const maxSize = 20 * 1024 * 1024; // 20 MB
  if (file.size > maxSize) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 20 Mo)" }, { status: 413 });
  }

  const { url } = await stockerFichier(file, "messagerie");

  return NextResponse.json({
    nom: file.name,
    url,
    type: file.type || "application/octet-stream",
    taille: file.size,
  });
}
