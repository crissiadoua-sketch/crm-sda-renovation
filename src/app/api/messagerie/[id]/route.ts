import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/session";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const session = await decrypt(cookieStore.get("session")?.value);
  if (!session?.userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id: conversationId } = await params;
  const since = req.nextUrl.searchParams.get("since");

  const where = {
    conversationId,
    ...(since ? { createdAt: { gt: new Date(since) } } : {}),
  };

  const messages = await prisma.message.findMany({
    where,
    orderBy: { createdAt: "asc" },
    include: {
      sender: { select: { id: true, name: true } },
      piecesJointes: true,
    },
  });

  return NextResponse.json(messages);
}
