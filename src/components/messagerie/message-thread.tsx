"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Send, Paperclip, X, Image as ImageIcon, FileText,
  Download, Trash2, RefreshCw, Settings, Check,
} from "lucide-react";
import { sendMessage, updateSuppressionAuto, deleteConversation } from "@/lib/actions/messagerie";
import { urlFichier } from "@/lib/format";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface PJ {
  id: string;
  nom: string;
  url: string;
  type: string;
  taille: number | null;
}

interface Msg {
  id: string;
  texte: string | null;
  senderId: string;
  createdAt: string;
  sender: { id: string; name: string };
  piecesJointes: PJ[];
}

type Freq = "JAMAIS" | "7_JOURS" | "30_JOURS" | "90_JOURS";

const FREQ_LABELS: Record<Freq, string> = {
  JAMAIS:    "Jamais (conservation permanente)",
  "7_JOURS": "7 jours",
  "30_JOURS":"30 jours",
  "90_JOURS":"90 jours",
};

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return `Hier ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function fileSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

/* ------------------------------------------------------------------ */
/*  Aperçu pièce jointe                                                 */
/* ------------------------------------------------------------------ */

function PieceJointeView({ pj }: { pj: PJ }) {
  const isImage = pj.type.startsWith("image/");
  const isPdf   = pj.type === "application/pdf";

  if (isImage) {
    return (
      <a href={urlFichier(pj.url)} target="_blank" rel="noopener noreferrer" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={urlFichier(pj.url)}
          alt={pj.nom}
          className="max-h-56 max-w-xs rounded-lg border border-slate-200 object-cover shadow-sm"
        />
      </a>
    );
  }

  return (
    <a
      href={urlFichier(pj.url)}
      download={pj.nom}
      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm hover:border-brand-blue/40 hover:bg-brand-blue/5 max-w-xs"
    >
      {isPdf
        ? <FileText className="h-4 w-4 shrink-0 text-red-500" />
        : <Download className="h-4 w-4 shrink-0 text-brand-blue" />
      }
      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-700 truncate">{pj.nom}</p>
        {pj.taille && <p className="text-xs text-slate-400">{fileSize(pj.taille)}</p>}
      </div>
    </a>
  );
}

/* ------------------------------------------------------------------ */
/*  Bulle message                                                        */
/* ------------------------------------------------------------------ */

function MessageBubble({ msg, isMine }: { msg: Msg; isMine: boolean }) {
  return (
    <div className={`flex gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${isMine ? "bg-brand-blue" : "bg-slate-400"}`}>
        {msg.sender.name.charAt(0).toUpperCase()}
      </div>

      <div className={`flex max-w-[70%] flex-col gap-1 ${isMine ? "items-end" : "items-start"}`}>
        {!isMine && (
          <p className="text-xs font-semibold text-slate-500">{msg.sender.name}</p>
        )}

        {msg.texte && (
          <div className={`rounded-2xl px-4 py-2 text-sm ${
            isMine
              ? "rounded-tr-sm bg-brand-blue text-white"
              : "rounded-tl-sm bg-slate-100 text-slate-800"
          }`}>
            {msg.texte}
          </div>
        )}

        {msg.piecesJointes.map(pj => (
          <PieceJointeView key={pj.id} pj={pj} />
        ))}

        <p className={`text-[10px] text-slate-400 ${isMine ? "mr-1" : "ml-1"}`}>
          {formatTime(msg.createdAt)}
          {isMine && <Check className="ml-1 inline h-3 w-3" />}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Composant principal                                                  */
/* ------------------------------------------------------------------ */

interface MessageThreadProps {
  conversationId: string;
  currentUserId: string;
  initialMessages: Msg[];
  suppressionAuto: Freq;
  convNom: string | null;
  convType: string;
}

export function MessageThread({
  conversationId,
  currentUserId,
  initialMessages,
  suppressionAuto: initialFreq,
  convNom,
  convType,
}: MessageThreadProps) {
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [lastFetch, setLastFetch] = useState<string | null>(
    initialMessages.at(-1)?.createdAt ?? null
  );
  const [texte, setTexte] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PJ[]>([]);
  const [sending, setSending] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [freq, setFreq] = useState<Freq>(initialFreq);
  const [savingFreq, setSavingFreq] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Polling toutes les 3 secondes
  const poll = useCallback(async () => {
    try {
      const url = `/api/messagerie/${conversationId}${lastFetch ? `?since=${encodeURIComponent(lastFetch)}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const newMsgs: Msg[] = await res.json();
      if (newMsgs.length > 0) {
        setMessages(prev => [...prev, ...newMsgs]);
        setLastFetch(newMsgs.at(-1)!.createdAt);
      }
    } catch { /* ignore */ }
  }, [conversationId, lastFetch]);

  useEffect(() => {
    const timer = setInterval(poll, 3000);
    return () => clearInterval(timer);
  }, [poll]);

  // Upload fichier
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);

    const uploaded: PJ[] = [];
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await fetch("/api/messagerie/upload", { method: "POST", body: fd });
        if (res.ok) {
          const data = await res.json();
          uploaded.push({ id: crypto.randomUUID(), ...data });
        }
      } catch { /* ignore */ }
    }

    setPendingFiles(prev => [...prev, ...uploaded]);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Envoyer
  const handleSend = async () => {
    if (!texte.trim() && pendingFiles.length === 0) return;
    setSending(true);

    const fd = new FormData();
    fd.append("conversationId", conversationId);
    if (texte.trim()) fd.append("texte", texte.trim());
    if (pendingFiles.length) fd.append("piecesJointes", JSON.stringify(pendingFiles));

    await sendMessage(fd);

    // Optimistic: add immediately
    const now = new Date().toISOString();
    const newMsg: Msg = {
      id: crypto.randomUUID(),
      texte: texte.trim() || null,
      senderId: currentUserId,
      createdAt: now,
      sender: { id: currentUserId, name: "Moi" },
      piecesJointes: pendingFiles,
    };
    setMessages(prev => [...prev, newMsg]);
    setLastFetch(now);
    setTexte("");
    setPendingFiles([]);
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFreqChange = async (f: Freq) => {
    setFreq(f);
    setSavingFreq(true);
    await updateSuppressionAuto(conversationId, f);
    setSavingFreq(false);
  };

  const handleDelete = async () => {
    if (!confirm("Supprimer définitivement cette conversation et tous ses messages ?")) return;
    await deleteConversation(conversationId);
  };

  /* ---------------------------------------------------------------- */

  return (
    <div className="flex flex-col h-full">

      {/* Barre paramètres */}
      {showSettings && (
        <div className="border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex flex-wrap items-start gap-6">
            {/* Suppression auto */}
            <div>
              <p className="mb-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Suppression automatique des messages
              </p>
              <div className="flex flex-wrap gap-2">
                {(Object.entries(FREQ_LABELS) as [Freq, string][]).map(([f, label]) => (
                  <button
                    key={f}
                    onClick={() => handleFreqChange(f)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                      freq === f
                        ? "border-brand-blue bg-brand-blue text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-brand-blue/40"
                    }`}
                  >
                    {savingFreq && freq === f ? <RefreshCw className="inline h-3 w-3 animate-spin mr-1" /> : null}
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                {freq !== "JAMAIS"
                  ? `Les messages de plus de ${FREQ_LABELS[freq]} seront automatiquement supprimés à la prochaine ouverture.`
                  : "Les messages sont conservés indéfiniment."}
              </p>
            </div>

            {/* Zone danger */}
            <div className="ml-auto">
              <button
                onClick={handleDelete}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Supprimer la conversation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thread de messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 text-5xl">💬</div>
            <p className="text-sm text-slate-500">Aucun message. Commencez la conversation !</p>
          </div>
        ) : messages.map(msg => (
          <MessageBubble key={msg.id} msg={msg} isMine={msg.senderId === currentUserId} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Fichiers en attente */}
      {pendingFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-slate-100 bg-slate-50 px-4 py-2">
          {pendingFiles.map(f => (
            <div key={f.id} className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
              {f.type.startsWith("image/")
                ? <ImageIcon className="h-3 w-3 text-brand-blue" />
                : <FileText className="h-3 w-3 text-red-500" />
              }
              <span className="max-w-32 truncate">{f.nom}</span>
              <button onClick={() => setPendingFiles(p => p.filter(x => x.id !== f.id))}>
                <X className="h-3 w-3 text-slate-400 hover:text-red-500" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Zone de saisie */}
      <div className="border-t border-slate-200 bg-white px-3 py-3 flex items-end gap-2">
        {/* Paramètres */}
        <button
          onClick={() => setShowSettings(s => !s)}
          title="Paramètres"
          className={`shrink-0 rounded-lg p-2 transition-colors ${showSettings ? "bg-brand-blue text-white" : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"}`}
        >
          <Settings className="h-5 w-5" />
        </button>

        {/* Upload fichier */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          title="Joindre un fichier ou une photo"
          className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
        >
          {uploading
            ? <RefreshCw className="h-5 w-5 animate-spin" />
            : <Paperclip className="h-5 w-5" />
          }
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Textarea */}
        <textarea
          value={texte}
          onChange={e => setTexte(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Votre message… (Entrée pour envoyer, Maj+Entrée pour sauter une ligne)"
          rows={1}
          spellCheck
          lang="fr"
          className="flex-1 max-h-32 resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-brand-blue focus:bg-white focus:ring-2 focus:ring-brand-blue/20"
          style={{ minHeight: "42px" }}
          onInput={e => {
            const t = e.target as HTMLTextAreaElement;
            t.style.height = "auto";
            t.style.height = Math.min(t.scrollHeight, 128) + "px";
          }}
        />

        {/* Bouton envoyer */}
        <button
          onClick={handleSend}
          disabled={sending || (!texte.trim() && pendingFiles.length === 0)}
          className="shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-blue text-white shadow-sm hover:bg-brand-blue-dark disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending
            ? <RefreshCw className="h-4 w-4 animate-spin" />
            : <Send className="h-4 w-4" />
          }
        </button>
      </div>
    </div>
  );
}
