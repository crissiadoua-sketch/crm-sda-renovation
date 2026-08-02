import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { put, del } from "@vercel/blob";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { decrypt } from "@/lib/session";
import { prisma } from "@/lib/prisma";

async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const session = await decrypt(cookieStore.get("session")?.value);
  return session?.userId ?? null;
}

function parseWallpapers(raw: string | null | undefined): Record<string, string> {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file || !file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Fichier image requis" }, { status: 400 });
  }
  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "Image trop volumineuse (max 8 Mo)" }, { status: 400 });
  }

  const page = (formData.get("page") as string) || "all";

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { wallpapers: true } });
  const wallpapersObj = parseWallpapers(user?.wallpapers);

  if (wallpapersObj[page]) {
    try { await del(wallpapersObj[page]); } catch { /* déjà absent */ }
  }

  const ext = path.extname(file.name) || ".jpg";
  const nomFichier = `${randomBytes(8).toString("hex")}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const blob = await put(`backgrounds/${userId}/${nomFichier}`, buffer, {
    access: "public",
    contentType: file.type,
  });

  wallpapersObj[page] = blob.url;
  await prisma.user.update({ where: { id: userId }, data: { wallpapers: JSON.stringify(wallpapersObj) } });
  return NextResponse.json({ wallpapers: wallpapersObj });
}

export async function DELETE(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const page = req.nextUrl.searchParams.get("page") || "all";

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { wallpapers: true } });
  const wallpapersObj = parseWallpapers(user?.wallpapers);

  if (wallpapersObj[page]) {
    try { await del(wallpapersObj[page]); } catch { /* déjà absent */ }
    delete wallpapersObj[page];
    await prisma.user.update({ where: { id: userId }, data: { wallpapers: JSON.stringify(wallpapersObj) } });
  }
  return NextResponse.json({ wallpapers: wallpapersObj });
}
