"use client";

import { useState } from "react";
import Link from "next/link";
import { Trash2, Users, Lock, Clock } from "lucide-react";
import { deleteConversation } from "@/lib/actions/messagerie";

const SUPPRESSION_LABELS: Record<string, string> = {
  JAMAIS: "∞",
  "7_JOURS": "7j",
  "30_JOURS": "30j",
  "90_JOURS": "90j",
};

interface Props {
  conv: {
    id: string;
    type: string;
    nom: string | null;
    suppressionAuto: string;
    lastMsg: { texte: string | null; senderName: string; createdAt: string; pjNom: string | null } | null;
    otherName: string | null;
    otherInitial: string;
    unread: boolean;
  };
}

function formatRelative(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `il y a ${diffMins} min`;
  const diffH = Math.floor(diffMins / 60);
  if (diffH < 24) return `il y a ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "Hier";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function ConversationCard({ conv }: Props) {
  const [confirming, setConfirming] = useState(false);

  const nom = conv.nom ?? conv.otherName ?? "Conversation";

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirming) { setConfirming(true); return; }
    await deleteConversation(conv.id);
  };

  return (
    <div className="group relative">
      <Link
        href={`/messagerie/${conv.id}`}
        className={`flex items-center gap-4 rounded-xl border bg-white p-4 shadow-sm transition-all hover:shadow-md ${
          conv.unread
            ? "border-brand-blue/40 ring-1 ring-brand-blue/20"
            : "border-slate-200 hover:border-brand-blue/40"
        }`}
      >
        {/* Badge non-lu */}
        {conv.unread && (
          <span className="absolute left-2 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-brand-blue" />
        )}

        {/* Avatar */}
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${conv.type === "DIRECT" ? "bg-brand-blue" : "bg-brand-orange"}`}>
          {conv.type === "DIRECT"
            ? conv.otherInitial
            : <Users className="h-5 w-5" />
          }
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`truncate ${conv.unread ? "font-bold text-slate-800" : "font-semibold text-slate-700"}`}>
              {nom}
            </p>
            {conv.type === "DIRECT" && <Lock className="h-3 w-3 text-slate-300 shrink-0" />}
            {conv.suppressionAuto !== "JAMAIS" && (
              <span className="ml-auto shrink-0 flex items-center gap-0.5 text-[10px] text-slate-400">
                <Clock className="h-2.5 w-2.5" />
                {SUPPRESSION_LABELS[conv.suppressionAuto]}
              </span>
            )}
          </div>
          {conv.lastMsg ? (
            <p className={`text-xs truncate ${conv.unread ? "text-slate-600 font-medium" : "text-slate-400"}`}>
              <span className="font-medium">{conv.lastMsg.senderName} : </span>
              {conv.lastMsg.texte ?? (conv.lastMsg.pjNom ? `📎 ${conv.lastMsg.pjNom}` : "…")}
            </p>
          ) : (
            <p className="text-xs text-slate-400 italic">Conversation vide</p>
          )}
        </div>

        {conv.lastMsg && (
          <p className="shrink-0 text-[11px] text-slate-400">
            {formatRelative(conv.lastMsg.createdAt)}
          </p>
        )}
      </Link>

      {/* Bouton suppression — visible au survol */}
      <button
        onClick={handleDelete}
        title={confirming ? "Cliquer pour confirmer" : "Supprimer la conversation"}
        className={`absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-all
          ${confirming
            ? "opacity-100 bg-red-600 text-white"
            : "opacity-0 group-hover:opacity-100 bg-red-50 text-red-500 hover:bg-red-100 border border-red-200"
          }`}
      >
        <Trash2 className="h-3.5 w-3.5" />
        {confirming ? "Confirmer ?" : ""}
      </button>
      {confirming && (
        <button
          onClick={(e) => { e.stopPropagation(); setConfirming(false); }}
          className="absolute right-28 top-1/2 -translate-y-1/2 rounded-lg bg-slate-100 px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-200"
        >
          Annuler
        </button>
      )}
    </div>
  );
}
