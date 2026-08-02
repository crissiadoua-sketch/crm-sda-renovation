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

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { backgroundImageUrl: true } });
  if (user?.backgroundImageUrl) {
    try { await del(user.backgroundImageUrl); } catch { /* déjà absent */ }
  }

  const ext = path.extname(file.name) || ".jpg";
  const nomFichier = `${randomBytes(8).toString("hex")}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const blob = await put(`backgrounds/${userId}/${nomFichier}`, buffer, {
    access: "public",
    contentType: file.type,
  });

  await prisma.user.update({ where: { id: userId }, data: { backgroundImageUrl: blob.url } });
  return NextResponse.json({ url: blob.url });
}

export async function DELETE() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { backgroundImageUrl: true } });
  if (user?.backgroundImageUrl) {
    try { await del(user.backgroundImageUrl); } catch { /* déjà absent */ }
    await prisma.user.update({ where: { id: userId }, data: { backgroundImageUrl: null } });
  }
  return NextResponse.json({ ok: true });
}
