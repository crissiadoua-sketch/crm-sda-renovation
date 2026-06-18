"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Loader2, Bot, User, Sparkles, RotateCcw } from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
};

const WELCOME: Message = {
  role: "assistant",
  content:
    "Bonjour ! Je suis **Alba-Ayla**, votre assistante IA. Je suis là pour vous guider dans l'utilisation du CRM SDA Rénovation.\n\nPosez-moi vos questions sur les modules, les fonctionnalités ou les raccourcis — je suis là pour vous aider ! 😊",
};

export function AlbaAylaChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiMissing, setApiMissing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, messages]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setLoading(true);
    setApiMissing(false);

    // placeholder de réponse streaming
    setMessages((prev) => [...prev, { role: "assistant", content: "", streaming: true }]);

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch("/api/alba-ayla", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        }),
        signal: ctrl.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 503) setApiMissing(true);
        throw new Error(err.error ?? "Erreur serveur");
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6);
          if (raw === "[DONE]") break;
          try {
            const parsed = JSON.parse(raw);
            if (parsed.text) {
              accumulated += parsed.text;
              setMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = { role: "assistant", content: accumulated, streaming: true };
                return next;
              });
            }
            if (parsed.error) throw new Error(parsed.error);
          } catch {
            // ignore parse errors on partial chunks
          }
        }
      }

      // Finalise le message
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", content: accumulated, streaming: false };
        return next;
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      const errMsg = err instanceof Error ? err.message : "Erreur inconnue";
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: "assistant",
          content: `⚠️ Désolée, une erreur est survenue : ${errMsg}`,
          streaming: false,
        };
        return next;
      });
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function reset() {
    abortRef.current?.abort();
    setMessages([WELCOME]);
    setLoading(false);
    setApiMissing(false);
  }

  // Rendu markdown minimaliste (bold, listes, sauts de ligne)
  function renderContent(text: string) {
    const lines = text.split("\n");
    return lines.map((line, i) => {
      // Puce
      if (line.startsWith("- ") || line.startsWith("• ")) {
        return (
          <li key={i} className="ml-3 list-disc">
            {renderInline(line.slice(2))}
          </li>
        );
      }
      if (line.trim() === "") return <br key={i} />;
      return <p key={i}>{renderInline(line)}</p>;
    });
  }

  function renderInline(text: string) {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, i) =>
      i % 2 === 1 ? <strong key={i}>{part}</strong> : part,
    );
  }

  return (
    <>
      {/* Bouton flottant */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Alba-Ayla — Assistante IA"
        className={`fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg shadow-brand-navy/30 transition-all duration-200 ${
          open
            ? "bg-slate-700 hover:bg-slate-600"
            : "bg-gradient-to-br from-brand-blue to-brand-navy hover:scale-105"
        }`}
      >
        {open ? (
          <X className="h-5 w-5 text-white" />
        ) : (
          <Sparkles className="h-6 w-6 text-white" />
        )}
      </button>

      {/* Fenêtre de chat */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex w-[370px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-300/50 max-h-[600px]">
          {/* Header */}
          <div className="flex items-center gap-3 bg-gradient-to-r from-brand-blue-dark to-brand-navy px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
              <Sparkles className="h-4.5 w-4.5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">Alba-Ayla</p>
              <p className="text-[10px] text-white/60">Assistante IA · CRM SDA Rénovation</p>
            </div>
            <button
              type="button"
              onClick={reset}
              title="Réinitialiser la conversation"
              className="text-white/50 transition hover:text-white"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-white/50 transition hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto bg-slate-50 p-4 space-y-3 min-h-0" style={{ maxHeight: "420px" }}>
            {apiMissing && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                <strong>Clé API manquante.</strong> Ajoutez votre clé Anthropic dans le fichier{" "}
                <code className="font-mono">.env</code> :{" "}
                <code className="font-mono">ANTHROPIC_API_KEY="sk-ant-..."</code>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* Avatar */}
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white ${
                    msg.role === "assistant"
                      ? "bg-gradient-to-br from-brand-blue to-brand-navy"
                      : "bg-slate-400"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <Bot className="h-3.5 w-3.5" />
                  ) : (
                    <User className="h-3.5 w-3.5" />
                  )}
                </div>

                {/* Bulle */}
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-brand-navy text-white rounded-tr-sm"
                      : "bg-white border border-slate-100 text-slate-800 rounded-tl-sm shadow-sm"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="space-y-0.5">{renderContent(msg.content)}</div>
                  ) : (
                    msg.content
                  )}
                  {msg.streaming && (
                    <span className="inline-block h-3.5 w-0.5 animate-pulse bg-brand-blue ml-0.5 align-middle" />
                  )}
                </div>
              </div>
            ))}

            {loading && messages[messages.length - 1]?.content === "" && (
              <div className="flex gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-blue to-brand-navy text-white">
                  <Bot className="h-3.5 w-3.5" />
                </div>
                <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm border border-slate-100 bg-white px-3 py-2 shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Zone de saisie */}
          <div className="border-t border-slate-100 bg-white p-3">
            <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-brand-blue focus-within:ring-2 focus-within:ring-brand-blue/10">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Posez votre question… (Entrée pour envoyer)"
                className="flex-1 resize-none bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400 max-h-24"
                style={{ fieldSizing: "content" } as React.CSSProperties}
                disabled={loading}
              />
              <button
                type="button"
                onClick={send}
                disabled={!input.trim() || loading}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-navy text-white transition disabled:opacity-40 enabled:hover:bg-brand-blue-dark"
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
            <p className="mt-1 text-center text-[10px] text-slate-400">
              Shift+Entrée pour un saut de ligne
            </p>
          </div>
        </div>
      )}
    </>
  );
}
