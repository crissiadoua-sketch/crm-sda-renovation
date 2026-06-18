import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/dal";
import { createConversation } from "@/lib/actions/messagerie";
import { MessageSquare, Plus, Users, Lock, Clock } from "lucide-react";

function formatRelative(date: Date) {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `il y a ${diffMins} min`;
  const diffH = Math.floor(diffMins / 60);
  if (diffH < 24) return `il y a ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "Hier";
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

const SUPPRESSION_LABELS: Record<string, string> = {
  JAMAIS: "∞",
  "7_JOURS": "7j",
  "30_JOURS": "30j",
  "90_JOURS": "90j",
};

export default async function MessagerieListPage() {
  const user = await getUser();

  const conversations = await prisma.conversation.findMany({
    where: {
      participants: { some: { userId: user.id } },
    },
    include: {
      participants: { include: { user: { select: { id: true, name: true } } } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { texte: true, createdAt: true, sender: { select: { name: true } }, piecesJointes: { select: { nom: true } } },
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
            const others = conv.participants.filter(p => p.userId !== user.id).map(p => p.user);
            const lastMsg = conv.messages[0];
            const nom = conv.nom || (conv.type === "DIRECT" && others[0]?.name) || others.map(u => u.name).join(", ");

            return (
              <Link
                key={conv.id}
                href={`/messagerie/${conv.id}`}
                className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-brand-blue/40 hover:shadow-md transition-all"
              >
                {/* Avatar */}
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${conv.type === "DIRECT" ? "bg-brand-blue" : "bg-brand-orange"}`}>
                  {conv.type === "DIRECT"
                    ? others[0]?.name?.charAt(0)?.toUpperCase() ?? "?"
                    : <Users className="h-5 w-5" />
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-700 truncate">{nom}</p>
                    {conv.type === "DIRECT" && <Lock className="h-3 w-3 text-slate-300 shrink-0" />}
                    {conv.suppressionAuto !== "JAMAIS" && (
                      <span className="ml-auto shrink-0 flex items-center gap-0.5 text-[10px] text-slate-400">
                        <Clock className="h-2.5 w-2.5" />
                        {SUPPRESSION_LABELS[conv.suppressionAuto]}
                      </span>
                    )}
                  </div>
                  {lastMsg ? (
                    <p className="text-xs text-slate-400 truncate">
                      <span className="font-medium">{lastMsg.sender.name} : </span>
                      {lastMsg.texte ?? (lastMsg.piecesJointes[0]?.nom ? `📎 ${lastMsg.piecesJointes[0].nom}` : "…")}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Conversation vide</p>
                  )}
                </div>

                {lastMsg && (
                  <p className="shrink-0 text-[11px] text-slate-400">
                    {formatRelative(new Date(lastMsg.createdAt))}
                  </p>
                )}
              </Link>
            );
          })}
        </div>

        {/* Panneau création */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm h-fit">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-brand-navy">
            <Plus className="h-4 w-4 text-brand-blue" />
            Nouvelle conversation
          </h3>
          <form action={createConversation} className="flex flex-col gap-4">
            {/* Type */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</label>
              <div className="flex gap-2">
                {["DIRECT", "GROUPE"].map(t => (
                  <label key={t} className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="type" value={t} defaultChecked={t === "DIRECT"} className="accent-brand-blue" />
                    <span className="text-sm text-slate-700">{t === "DIRECT" ? "Message direct" : "Groupe"}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Nom du groupe (optionnel) */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Nom du groupe <span className="font-normal text-slate-400">(optionnel)</span>
              </label>
              <input
                type="text"
                name="nom"
                placeholder="ex. Chantier Toulouse, Équipe commerciale…"
                spellCheck
                lang="fr"
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
              />
            </div>

            {/* Participants */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Participants
              </label>
              <div className="flex flex-col gap-1 max-h-48 overflow-y-auto rounded-lg border border-slate-200 p-2">
                {allUsers.map(u => (
                  <label key={u.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50">
                    <input type="checkbox" name="participantIds" value={u.id} className="accent-brand-blue" />
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-blue/10 text-xs font-bold text-brand-blue">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">{u.name}</p>
                      <p className="text-[10px] text-slate-400">{u.role}</p>
                    </div>
                  </label>
                ))}
                {allUsers.length === 0 && (
                  <p className="py-3 text-center text-xs text-slate-400">Aucun autre utilisateur</p>
                )}
              </div>
            </div>

            {/* Suppression auto */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Suppression automatique
              </label>
              <select
                name="suppressionAuto"
                defaultValue="JAMAIS"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none"
              >
                <option value="JAMAIS">Jamais (conservation permanente)</option>
                <option value="7_JOURS">Après 7 jours</option>
                <option value="30_JOURS">Après 30 jours</option>
                <option value="90_JOURS">Après 90 jours</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-brand-blue py-2 text-sm font-semibold text-white hover:bg-brand-blue-dark"
            >
              Démarrer la conversation →
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
