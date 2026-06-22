import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/session";
import { recupererFluxFichier } from "@/lib/blob-storage";

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const session = await decrypt(cookieStore.get("session")?.value);
  if (!session?.userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Paramètre url manquant" }, { status: 400 });
  }

  let result;
  try {
    result = await recupererFluxFichier(url);
  } catch {
    return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 });
  }
  if (!result || result.statusCode !== 200) {
    return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 });
  }

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType || "application/octet-stream",
      "Cache-Control": "private, no-cache",
    },
  });
}
