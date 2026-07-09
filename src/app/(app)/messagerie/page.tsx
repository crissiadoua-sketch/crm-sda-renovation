import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/dal";
import { NouvelleConversationForm } from "@/components/messagerie/nouvelle-conversation-form";
import { ConversationCard } from "@/components/messagerie/conversation-card";
import { MessageSquare, Plus } from "lucide-react";

export default async function MessagerieListPage() {
  const user = await getUser();

  const conversations = await prisma.conversation.findMany({
    where: {
      participants: { some: { userId: user.id } },
    },
    include: {
      participants: {
        include: { user: { select: { id: true, name: true } } },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          texte: true,
          createdAt: true,
          senderId: true,
          sender: { select: { name: true } },
          piecesJointes: { select: { nom: true }, take: 1 },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const allUsers = await prisma.user.findMany({
    where: { id: { not: user.id } },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex flex-col gap-5">
      {/* En-tête */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-brand-blue" />
            <h2 className="text-xl font-bold text-brand-navy">Messagerie interne</h2>
          </div>
          <p className="mt-0.5 text-sm text-slate-500">
            Échangez, partagez des fichiers et photos avec vos collègues
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Liste des conversations */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          {conversations.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center">
              <MessageSquare className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="text-sm text-slate-500">Aucune conversation — créez-en une à droite</p>
            </div>
          ) : conversations.map(conv => {
            const meParticipant = conv.participants.find(p => p.userId === user.id);
            const others = conv.participants.filter(p => p.userId !== user.id).map(p => p.user);
            const lastMsg = conv.messages[0];

            // Badge non-lu : dernier message d'un autre utilisateur après ma dernière lecture
            const luAt = meParticipant?.luAt;
            const unread = !!(
              lastMsg &&
              lastMsg.senderId !== user.id &&
              (!luAt || new Date(lastMsg.createdAt) > luAt)
            );

            return (
              <ConversationCard
                key={conv.id}
                conv={{
                  id: conv.id,
                  type: conv.type,
                  nom: conv.nom,
                  suppressionAuto: conv.suppressionAuto,
                  otherName: conv.type === "DIRECT" ? (others[0]?.name ?? null) : others.map(u => u.name).join(", "),
                  otherInitial: (conv.type === "DIRECT" ? others[0]?.name : null)?.charAt(0)?.toUpperCase() ?? "?",
                  lastMsg: lastMsg
                    ? {
                        texte: lastMsg.texte,
                        senderName: lastMsg.sender.name,
                        createdAt: lastMsg.createdAt.toISOString(),
                        pjNom: lastMsg.piecesJointes[0]?.nom ?? null,
                      }
                    : null,
                  unread,
                }}
              />
            );
          })}
        </div>

        {/* Panneau création */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm h-fit">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-brand-navy">
            <Plus className="h-4 w-4 text-brand-blue" />
            Nouvelle conversation
          </h3>
          <NouvelleConversationForm allUsers={allUsers} />
        </div>
      </div>
    </div>
  );
}
