"use client";

import { Bot, Download, Maximize2, Minimize2, Printer } from "lucide-react";
import { useRef, useState } from "react";

/* ─── Markdown parser ────────────────────────────────────────────────────── */

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inline(text: string): string {
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, '<code class="rv-code">$1</code>')
    .replace(/\[([^\]]+)\]/g, '<span class="rv-tag">$1</span>');
}

function parseMarkdown(raw: string): string {
  if (!raw) return "";
  const lines = raw.split("\n");
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();

    if (t === "") { i++; continue; }

    // HR
    if (/^-{3,}$/.test(t)) { out.push('<hr class="rv-hr">'); i++; continue; }

    // Headers
    const hm = t.match(/^(#{1,4})\s+(.*)/);
    if (hm) {
      const n = hm[1].length;
      out.push(`<h${n} class="rv-h${n}">${inline(hm[2])}</h${n}>`);
      i++; continue;
    }

    // Table block
    if (t.startsWith("|")) {
      const rows: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(lines[i].trim());
        i++;
      }
      let headerDone = false;
      out.push('<div class="rv-table-wrap"><table class="rv-table">');
      for (const row of rows) {
        const cells = row.split("|").slice(1, -1).map((c) => c.trim());
        if (cells.every((c) => /^[-:]+$/.test(c))) {
          if (!headerDone) { out.push("</thead><tbody>"); headerDone = true; }
          continue;
        }
        if (!headerDone) {
          out.push("<thead><tr>" + cells.map((c) => `<th class="rv-th">${inline(c)}</th>`).join("") + "</tr>");
        } else {
          out.push("<tr>" + cells.map((c) => `<td class="rv-td">${inline(c)}</td>`).join("") + "</tr>");
        }
      }
      if (!headerDone) out.push("</thead><tbody>");
      out.push("</tbody></table></div>");
      continue;
    }

    // Alert lines (emoji prefix)
    const am = t.match(/^(🔴|🟠|🟡|🟢|✅|⚠️|❌)\s*(.*)/);
    if (am) {
      const cls = am[1] === "🔴" ? "rv-alert-critique"
        : am[1] === "🟠" ? "rv-alert-majeur"
        : am[1] === "🟡" ? "rv-alert-moyen"
        : "rv-alert-ok";
      out.push(`<div class="${cls}"><span>${am[1]}</span><span>${inline(am[2])}</span></div>`);
      i++; continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(t)) {
      out.push('<ol class="rv-ol">');
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        const item = lines[i].trim().replace(/^\d+\.\s/, "");
        i++;
        const extra: string[] = [];
        while (i < lines.length && lines[i].startsWith("  ") && lines[i].trim()) {
          extra.push(lines[i].trim());
          i++;
        }
        out.push(`<li class="rv-li">${inline([item, ...extra].join(" "))}</li>`);
      }
      out.push("</ol>");
      continue;
    }

    // Unordered list
    if (/^[-*•]\s.+/.test(t)) {
      out.push('<ul class="rv-ul">');
      while (i < lines.length && /^[-*•]\s.+/.test(lines[i].trim())) {
        out.push(`<li class="rv-li">${inline(lines[i].trim().replace(/^[-*•]\s/, ""))}</li>`);
        i++;
      }
      out.push("</ul>");
      continue;
    }

    // Paragraph: collect consecutive "plain" lines
    const para: string[] = [];
    while (i < lines.length) {
      const l = lines[i].trim();
      if (!l) break;
      if (/^#{1,4}\s/.test(l) || l.startsWith("|") || /^-{3,}$/.test(l)
        || /^[-*•]\s.+/.test(l) || /^\d+\.\s/.test(l)
        || /^(🔴|🟠|🟡|🟢|✅|⚠️|❌)\s/.test(l)) break;
      para.push(lines[i]);
      i++;
    }
    if (para.length) out.push(`<p class="rv-p">${inline(para.join(" "))}</p>`);
    else i++;
  }
  return out.join("\n");
}

/* ─── Print helper ───────────────────────────────────────────────────────── */

const PRINT_CSS = `
  body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 24px; color: #1e293b; }
  .rv-h1 { font-size: 18px; color: #1E2F6E; border-bottom: 2px solid #1E2F6E; padding-bottom: 8px; margin: 0 0 16px; }
  .rv-h2 { font-size: 14px; font-weight: 700; color: #fff; background: #1E2F6E; padding: 6px 12px; margin: 20px 0 10px; border-radius: 4px; }
  .rv-h3 { font-size: 13px; font-weight: 600; color: #1E2F6E; margin: 14px 0 6px; }
  .rv-h4 { font-size: 12px; font-weight: 600; color: #475569; margin: 10px 0 4px; }
  .rv-hr { border: none; border-top: 1px solid #e2e8f0; margin: 16px 0; }
  .rv-p { font-size: 12.5px; line-height: 1.7; margin: 6px 0; }
  .rv-ul, .rv-ol { padding-left: 20px; margin: 6px 0; }
  .rv-li { font-size: 12.5px; line-height: 1.6; margin: 3px 0; }
  .rv-table-wrap { overflow: auto; margin: 10px 0; }
  .rv-table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
  .rv-th { background: #1E2F6E; color: #fff; padding: 6px 10px; text-align: left; font-weight: 600; }
  .rv-td { border: 1px solid #e2e8f0; padding: 5px 10px; }
  tr:nth-child(even) .rv-td { background: #f8fafc; }
  .rv-alert-critique { display: flex; gap: 8px; background: #fef2f2; border-left: 4px solid #dc2626; padding: 8px 12px; margin: 6px 0; border-radius: 4px; font-size: 12.5px; }
  .rv-alert-majeur { display: flex; gap: 8px; background: #fff7ed; border-left: 4px solid #ea580c; padding: 8px 12px; margin: 6px 0; border-radius: 4px; font-size: 12.5px; }
  .rv-alert-moyen { display: flex; gap: 8px; background: #fefce8; border-left: 4px solid #ca8a04; padding: 8px 12px; margin: 6px 0; border-radius: 4px; font-size: 12.5px; }
  .rv-alert-ok { display: flex; gap: 8px; background: #f0fdf4; border-left: 4px solid #16a34a; padding: 8px 12px; margin: 6px 0; border-radius: 4px; font-size: 12.5px; }
  .rv-tag { background: #e0e7ff; color: #4338ca; padding: 1px 5px; border-radius: 3px; font-weight: 700; font-size: 11px; }
  .rv-code { background: #f1f5f9; padding: 1px 4px; border-radius: 2px; font-size: 11px; font-family: monospace; }
`;

/* ─── Component ──────────────────────────────────────────────────────────── */

type Rapport = {
  analyseIA: string | null;
  contenu: string;
  periode: string;
  createdAt: string;
  generateurNom: string;
};

export function RapportViewer({ rapport }: { rapport: Rapport }) {
  const [fullscreen, setFullscreen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const periodeLabel = new Date(rapport.periode + "-01").toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

  const handlePrint = () => {
    const html = contentRef.current?.innerHTML ?? "";
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html lang="fr"><head>
      <meta charset="utf-8">
      <title>Rapport mensuel CRM — ${periodeLabel}</title>
      <style>${PRINT_CSS}</style>
    </head><body>${html}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 300);
  };

  const handleSavePDF = () => {
    const html = contentRef.current?.innerHTML ?? "";
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html lang="fr"><head>
      <meta charset="utf-8">
      <title>Rapport mensuel CRM — ${periodeLabel}</title>
      <style>${PRINT_CSS}
      @media print { @page { margin: 15mm; } }
      </style>
      <script>window.onload = () => { window.print(); };<\/script>
    </head><body>${html}</body></html>`);
    win.document.close();
  };

  const html = rapport.analyseIA ? parseMarkdown(rapport.analyseIA) : null;

  return (
    <div className={fullscreen
      ? "fixed inset-0 z-50 flex flex-col bg-slate-100 overflow-auto"
      : "flex flex-col"
    }>
      <div className={`rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden ${fullscreen ? "m-4 flex-1 flex flex-col" : ""}`}>

        {/* Header */}
        <div className="border-b border-slate-200 bg-gradient-to-r from-brand-navy to-brand-blue-dark px-6 py-5 text-white">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Bot className="h-6 w-6 shrink-0" />
              <div>
                <h3 className="font-semibold">Rapport mensuel — {periodeLabel}</h3>
                <p className="text-xs text-white/60">
                  Généré le {new Date(rapport.createdAt).toLocaleDateString("fr-FR", {
                    day: "numeric", month: "long", year: "numeric",
                  })} à {new Date(rapport.createdAt).toLocaleTimeString("fr-FR", {
                    hour: "2-digit", minute: "2-digit",
                  })} · {rapport.generateurNom}
                </p>
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handlePrint}
                title="Imprimer"
                className="flex items-center gap-1.5 rounded-lg border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 transition"
              >
                <Printer className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Imprimer</span>
              </button>
              <button
                onClick={handleSavePDF}
                title="Enregistrer en PDF"
                className="flex items-center gap-1.5 rounded-lg border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 transition"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Enregistrer PDF</span>
              </button>
              <button
                onClick={() => setFullscreen((v) => !v)}
                title={fullscreen ? "Réduire" : "Plein écran"}
                className="flex items-center gap-1.5 rounded-lg border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 transition"
              >
                {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{fullscreen ? "Réduire" : "Plein écran"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className={`p-6 overflow-auto ${fullscreen ? "flex-1" : ""}`}>
          {html ? (
            <div
              ref={contentRef}
              className="rapport-content max-w-none"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : (
            <RapportBrut contenu={rapport.contenu} />
          )}
        </div>
      </div>

      {/* Scoped styles */}
      <style>{`
        .rapport-content .rv-h1 { font-size: 1.25rem; font-weight: 800; color: #1E2F6E; border-bottom: 2px solid #1E2F6E; padding-bottom: 0.5rem; margin: 0 0 1.25rem; }
        .rapport-content .rv-h2 { font-size: 0.875rem; font-weight: 700; color: #fff; background: #1E2F6E; padding: 0.4rem 0.75rem; margin: 1.5rem 0 0.75rem; border-radius: 0.375rem; letter-spacing: 0.03em; }
        .rapport-content .rv-h3 { font-size: 0.875rem; font-weight: 600; color: #1E2F6E; margin: 1rem 0 0.4rem; border-left: 3px solid #29ABE2; padding-left: 0.6rem; }
        .rapport-content .rv-h4 { font-size: 0.8rem; font-weight: 600; color: #475569; margin: 0.75rem 0 0.3rem; }
        .rapport-content .rv-hr { border: none; border-top: 1px solid #e2e8f0; margin: 1rem 0; }
        .rapport-content .rv-p { font-size: 0.875rem; line-height: 1.75; margin: 0.5rem 0; color: #334155; }
        .rapport-content .rv-ul { padding-left: 1.25rem; margin: 0.5rem 0; list-style: disc; }
        .rapport-content .rv-ol { padding-left: 1.25rem; margin: 0.5rem 0; list-style: decimal; }
        .rapport-content .rv-li { font-size: 0.875rem; line-height: 1.7; margin: 0.25rem 0; color: #334155; }
        .rapport-content .rv-table-wrap { overflow-x: auto; margin: 0.75rem 0; border-radius: 0.5rem; border: 1px solid #e2e8f0; }
        .rapport-content .rv-table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
        .rapport-content .rv-th { background: #1E2F6E; color: #fff; padding: 0.5rem 0.75rem; text-align: left; font-weight: 600; font-size: 0.75rem; letter-spacing: 0.03em; }
        .rapport-content .rv-td { border-bottom: 1px solid #f1f5f9; padding: 0.45rem 0.75rem; color: #334155; }
        .rapport-content tr:nth-child(even) .rv-td { background: #f8fafc; }
        .rapport-content .rv-alert-critique { display: flex; gap: 0.625rem; align-items: flex-start; background: #fef2f2; border-left: 4px solid #dc2626; padding: 0.625rem 0.875rem; margin: 0.4rem 0; border-radius: 0.375rem; font-size: 0.875rem; color: #7f1d1d; }
        .rapport-content .rv-alert-majeur { display: flex; gap: 0.625rem; align-items: flex-start; background: #fff7ed; border-left: 4px solid #ea580c; padding: 0.625rem 0.875rem; margin: 0.4rem 0; border-radius: 0.375rem; font-size: 0.875rem; color: #7c2d12; }
        .rapport-content .rv-alert-moyen { display: flex; gap: 0.625rem; align-items: flex-start; background: #fefce8; border-left: 4px solid #ca8a04; padding: 0.625rem 0.875rem; margin: 0.4rem 0; border-radius: 0.375rem; font-size: 0.875rem; color: #713f12; }
        .rapport-content .rv-alert-ok { display: flex; gap: 0.625rem; align-items: flex-start; background: #f0fdf4; border-left: 4px solid #16a34a; padding: 0.625rem 0.875rem; margin: 0.4rem 0; border-radius: 0.375rem; font-size: 0.875rem; color: #14532d; }
        .rapport-content .rv-tag { background: #e0e7ff; color: #4338ca; padding: 1px 6px; border-radius: 4px; font-weight: 700; font-size: 0.75rem; }
        .rapport-content .rv-code { background: #f1f5f9; color: #0f172a; padding: 1px 5px; border-radius: 3px; font-size: 0.75rem; font-family: monospace; }
      `}</style>
    </div>
  );
}

/* ─── Fallback données brutes ────────────────────────────────────────────── */

function RapportBrut({ contenu }: { contenu: string }) {
  let data: ReturnType<typeof JSON.parse> | null = null;
  try { data = JSON.parse(contenu); } catch { /* ignore */ }
  if (!data) return <p className="text-sm text-slate-400">Données du rapport non disponibles.</p>;

  const { stats, conformite, activiteParUser } = data;

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h4 className="mb-3 font-semibold text-brand-navy">Indicateurs clés</h4>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Chantiers en cours", val: stats?.chantiers?.enCours },
            { label: "Devis du mois", val: stats?.devis?.mois },
            { label: "Factures du mois", val: stats?.factures?.mois },
            { label: "Factures en retard", val: stats?.factures?.enRetard },
            { label: "Tâches en retard", val: stats?.taches?.enRetard },
            { label: "Doublons fichiers", val: stats?.documents?.doublons },
            { label: "Clients actifs", val: stats?.clients?.actifs },
            { label: "Chantiers terminés ce mois", val: stats?.chantiers?.terminesMois },
          ].map((item, i) => (
            <div key={i} className="rounded-lg bg-slate-50 p-3 text-center">
              <p className="text-xl font-bold text-brand-navy">{item.val ?? "—"}</p>
              <p className="text-xs text-slate-500">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      {conformite?.chantiersNonConformes?.length > 0 && (
        <section>
          <h4 className="mb-3 font-semibold text-brand-navy">
            Non-conformités ({conformite.chantiersNonConformes.length})
          </h4>
          <div className="flex flex-col gap-2">
            {conformite.chantiersNonConformes.map(
              (c: { nom: string; problemes: string[] }, i: number) => (
                <div key={i} className="rounded-lg border border-red-100 bg-red-50 px-4 py-3">
                  <p className="font-medium text-red-800">{c.nom}</p>
                  <ul className="mt-1 text-sm text-red-700">{c.problemes.map((p, j) => <li key={j}>• {p}</li>)}</ul>
                </div>
              )
            )}
          </div>
        </section>
      )}

      {activiteParUser?.length > 0 && (
        <section>
          <h4 className="mb-3 font-semibold text-brand-navy">Activité par profil</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold uppercase text-slate-400">
                  <th className="pb-2 text-left">Utilisateur</th>
                  <th className="pb-2 text-right">Tâches créées</th>
                  <th className="pb-2 text-right">Terminées</th>
                  <th className="pb-2 text-right">En retard</th>
                </tr>
              </thead>
              <tbody>
                {activiteParUser.map(
                  (u: { name: string; tachesCrees: number; tachesTerminees: number; tachesEnRetard: number }, i: number) => (
                    <tr key={i} className="border-t border-slate-50">
                      <td className="py-2 font-medium">{u.name}</td>
                      <td className="py-2 text-right">{u.tachesCrees}</td>
                      <td className="py-2 text-right text-emerald-600">{u.tachesTerminees}</td>
                      <td className="py-2 text-right text-red-600">{u.tachesEnRetard}</td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
