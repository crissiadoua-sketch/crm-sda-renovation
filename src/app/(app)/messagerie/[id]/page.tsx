import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/dal";
import { cleanupExpiredMessages } from "@/lib/actions/messagerie";
import { MessageThread } from "@/components/messagerie/message-thread";
import { MessageSquare, ChevronLeft, Users, Lock, Clock } from "lucide-react";

const SUPPRESSION_LABELS: Record<string, string> = {
  JAMAIS: "Conservation permanente",
  "7_JOURS": "Auto-suppression après 7 jours",
  "30_JOURS": "Auto-suppression après 30 jours",
  "90_JOURS": "Auto-suppression après 90 jours",
};

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getUser();

  // Déclencher le nettoyage automatique
  await cleanupExpiredMessages(id);

  const conv = await prisma.conversation.findUnique({
    where: { id },
    include: {
      participants: {
        include: { user: { select: { id: true, name: true, role: true } } },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          sender: { select: { id: true, name: true } },
          piecesJointes: true,
        },
      },
    },
  });

  if (!conv) notFound();

  // Vérifier que l'utilisateur est participant
  const isParticipant = conv.participants.some(p => p.userId === user.id);
  if (!isParticipant) notFound();

  const others = conv.participants.filter(p => p.userId !== user.id).map(p => p.user);
  const nom = conv.nom || (conv.type === "DIRECT" && others[0]?.name) || others.map(u => u.name).join(", ");

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 120px)" }}>
      {/* En-tête conversation */}
      <div className="shrink-0 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <Link href="/messagerie" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
          <ChevronLeft className="h-5 w-5" />
        </Link>

        {/* Avatar */}
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${conv.type === "DIRECT" ? "bg-brand-blue" : "bg-brand-orange"}`}>
          {conv.type === "DIRECT"
            ? others[0]?.name?.charAt(0)?.toUpperCase() ?? "?"
            : <Users className="h-4 w-4" />
          }
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-slate-800 truncate">{nom}</p>
            {conv.type === "DIRECT" && <Lock className="h-3 w-3 text-slate-300" />}
          </div>
          <p className="text-xs text-slate-400">
            {conv.participants.length} participant{conv.participants.length > 1 ? "s" : ""}
            {" · "}
            {others.map(u => u.name).join(", ")}
          </p>
        </div>

        <div className="flex items-center gap-1 text-xs text-slate-400">
          <Clock className="h-3 w-3" />
          {SUPPRESSION_LABELS[conv.suppressionAuto]}
        </div>
      </div>

      {/* Thread (client component) */}
      <div className="flex-1 overflow-hidden">
        <MessageThread
          conversationId={id}
          currentUserId={user.id}
          initialMessages={conv.messages.map(m => ({
            id: m.id,
            texte: m.texte,
            senderId: m.senderId,
            createdAt: m.createdAt.toISOString(),
            sender: m.sender,
            piecesJointes: m.piecesJointes.map(pj => ({
              id: pj.id,
              nom: pj.nom,
              url: pj.url,
              type: pj.type,
              taille: pj.taille,
            })),
          }))}
          suppressionAuto={conv.suppressionAuto as "JAMAIS" | "7_JOURS" | "30_JOURS" | "90_JOURS"}
          convNom={conv.nom}
          convType={conv.type}
        />
      </div>
    </div>
  );
}
