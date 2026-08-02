import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { recupererBufferFichier } from "@/lib/blob-storage";

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const session = await decrypt(cookieStore.get("session")?.value);
  if (!session?.userId) return new NextResponse("Non autorisé", { status: 401 });

  const page = req.nextUrl.searchParams.get("page") || "all";

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { wallpapers: true },
  });

  const wallpapersObj: Record<string, string> = (() => {
    try { return JSON.parse(user?.wallpapers ?? "{}"); } catch { return {}; }
  })();

  const blobUrl = wallpapersObj[page];
  if (!blobUrl) return new NextResponse("Not found", { status: 404 });

  const result = await recupererBufferFichier(blobUrl);
  if (!result) return new NextResponse("Image unavailable", { status: 404 });

  return new NextResponse(new Uint8Array(result.buffer), {
    headers: {
      "Content-Type": result.contentType,
      "Cache-Control": "private, max-age=3600, must-revalidate",
    },
  });
}
