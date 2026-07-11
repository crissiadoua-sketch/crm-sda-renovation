import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { COMPANY, COMPANY_LEGAL } from "@/lib/company";
import { formatDate, urlFichier } from "@/lib/format";
import { PrintToolbar } from "./print-toolbar";
import { TYPE_LABELS, MODELE_LABELS } from "@/lib/memoire-technique";
import type { TypeMemoire, ModeleMemoire } from "@/lib/memoire-technique";

// ---------------------------------------------------------------------------
// Utilitaires markdown simple → HTML
// ---------------------------------------------------------------------------

function markdownToHtml(text: string): string {
  if (!text) return "";
  return text
    // Lignes vides → paragraphes
    .split("\n\n")
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";

      // Tableaux markdown
      if (trimmed.includes("|") && trimmed.split("\n").some((l) => l.includes("|"))) {
        const lines = trimmed.split("\n").filter((l) => l.trim() && !l.match(/^\|[-|:\s]+\|$/));
        const rows = lines.map((l) =>
          l.split("|").filter((_, i, a) => i > 0 && i < a.length - 1).map((c) => c.trim())
        );
        if (rows.length > 0) {
          const header = rows[0];
          const body = rows.slice(1);
          return `<table class="mt-table"><thead><tr>${header.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${renderInline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
        }
      }

      // Listes à puces
      if (trimmed.split("\n").some((l) => l.match(/^[•\-\*]\s/))) {
        const items = trimmed.split("\n").filter((l) => l.match(/^[•\-\*]\s/));
        return `<ul class="mt-list">${items.map((l) => `<li>${renderInline(l.replace(/^[•\-\*]\s/, ""))}</li>`).join("")}</ul>`;
      }

      // Lignes individuelles (paragraphe)
      const lines = trimmed.split("\n");
      return lines.map((line) => {
        const t = line.trim();
        if (!t) return "";
        return `<p class="mt-p">${renderInline(t)}</p>`;
      }).join("");
    })
    .join("");
}

function renderInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ApercuMemoireTechniquePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const mt = await prisma.memoireTechnique.findUnique({
    where: { id },
    include: {
      chantier: {
        include: {
          client: { select: { nom: true, prenom: true, raisonSociale: true, adresse: true, codePostal: true, ville: true } },
        },
      },
      devis: { select: { numero: true, objet: true, totalHT: true, totalTTC: true } },
    },
  });

  if (!mt) notFound();

  const sections = JSON.parse(mt.sections as string) as Record<string, {
    titre: string; contenu: string; visible: boolean; ordre: number; nbPages: number; custom?: boolean;
  }>;
  const annexes = JSON.parse(mt.annexes as string) as Array<{
    id: string; titre: string; fichier: string; type: string; taille?: number;
  }>;

  const sectionKeys = Object.keys(sections)
    .filter((k) => sections[k].visible && (sections[k].ordre ?? 0) < 99)
    .sort((a, b) => (sections[a].ordre ?? 0) - (sections[b].ordre ?? 0));

  const clientNom = mt.chantier.client?.raisonSociale
    || `${mt.chantier.client?.prenom ?? ""} ${mt.chantier.client?.nom ?? ""}`.trim()
    || "—";

  const totalPages = sectionKeys.reduce((sum, k) => sum + (sections[k].nbPages || 1), 0) + (annexes.length > 0 ? 1 : 0);

  return (
    <>
      <PrintToolbar label={`Mémoire technique — ${mt.reference} · ${mt.titre}`} />

      <style>{`
        @media print {
          @page { size: A4; margin: 20mm 18mm; }
          .print-break { page-break-after: always; }
          .print-no-break { page-break-inside: avoid; }
        }

        /* Styles typographiques du document */
        .mt-section-title {
          font-size: 14px;
          font-weight: 700;
          color: #1E2F6E;
          border-bottom: 2px solid #1E2F6E;
          padding-bottom: 6px;
          margin-bottom: 16px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .mt-p {
          font-size: 11px;
          line-height: 1.7;
          color: #374151;
          margin: 0 0 6px;
        }
        .mt-list {
          margin: 8px 0 8px 16px;
          padding: 0;
          list-style: disc;
        }
        .mt-list li {
          font-size: 11px;
          line-height: 1.7;
          color: #374151;
          margin: 2px 0;
        }
        .mt-table {
          width: 100%;
          border-collapse: collapse;
          margin: 12px 0;
          font-size: 10px;
        }
        .mt-table th {
          background: #1E2F6E;
          color: white;
          padding: 6px 8px;
          text-align: left;
          font-weight: 600;
          border: 1px solid #1E2F6E;
        }
        .mt-table td {
          padding: 5px 8px;
          border: 1px solid #e2e8f0;
          color: #374151;
        }
        .mt-table tr:nth-child(even) td {
          background: #f8fafc;
        }
        strong { font-weight: 700; color: #1E2F6E; }
        em { font-style: italic; }
        code { font-family: monospace; background: #f1f5f9; padding: 1px 4px; border-radius: 3px; font-size: 10px; }
      `}</style>

      {/* ═══════════════════════════════════════════════════════════════════
          PAGE DE COUVERTURE
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="mx-auto my-8 w-full max-w-[210mm] bg-white shadow-xl print:my-0 print:shadow-none">
        <div className="relative min-h-[297mm] flex flex-col print:min-h-0">

          {/* Bandeau haut couleur SDA */}
          <div style={{ background: "linear-gradient(135deg, #1E2F6E 0%, #1B3F94 60%, #29ABE2 100%)" }}
            className="h-2 w-full"
          />

          <div className="flex-1 flex flex-col px-14 py-10">
            {/* Logo zone */}
            <div className="flex items-start justify-between mb-12">
              <div>
                <img src="/logo.png" alt="SDA Rénovation" className="h-12 w-auto object-contain mb-1" />
                <p className="text-[9px] text-slate-500 mt-1">{COMPANY.adresse} · {COMPANY.codePostal} {COMPANY.ville}</p>
              </div>

              <div className="text-right">
                <p className="text-[10px] text-slate-500">Réf. document</p>
                <p className="font-mono text-lg font-bold text-[#1E2F6E]">{mt.reference}</p>
                <p className="text-[10px] text-slate-500 mt-1">
                  {new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
            </div>

            {/* Titre principal */}
            <div className="flex-1 flex flex-col justify-center">
              <div style={{ borderLeft: "4px solid #F7941E" }} className="pl-6 mb-10">
                <p className="text-[11px] font-semibold text-[#29ABE2] uppercase tracking-widest mb-3">
                  Mémoire technique
                </p>
                <h1 className="text-3xl font-black text-[#1E2F6E] leading-tight mb-2">
                  {mt.titre}
                </h1>
                {mt.objetMarche && mt.objetMarche !== mt.titre && (
                  <p className="text-base text-slate-600 mt-2">{mt.objetMarche}</p>
                )}
              </div>

              {/* Infos marché */}
              <div className="grid grid-cols-2 gap-5 mb-10">
                {[
                  { label: "Maître d'ouvrage", value: mt.maitreOuvrage },
                  { label: "Affaire / Chantier", value: mt.chantier.nom },
                  mt.lotNumero ? { label: "Lot", value: `N°${mt.lotNumero} — ${mt.lotDesignation ?? ""}` } : null,
                  mt.montantEstime ? { label: "Montant estimé HT", value: `${mt.montantEstime.toLocaleString("fr-FR")} €` } : null,
                  mt.dateRemise ? { label: "Date de remise", value: formatDate(mt.dateRemise) } : null,
                  mt.devis ? { label: "Devis de référence", value: mt.devis.numero } : null,
                ].filter(Boolean).map((item, i) => (
                  <div key={i} className="flex flex-col gap-0.5">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">{item!.label}</p>
                    <p className="text-[11px] font-semibold text-[#1E2F6E]">{item!.value ?? "—"}</p>
                  </div>
                ))}
              </div>

              {/* Badges type + modèle */}
              <div className="flex gap-3">
                <span style={{ background: "#1E2F6E" }} className="rounded-full px-4 py-1.5 text-[10px] font-bold text-white">
                  {TYPE_LABELS[mt.type as TypeMemoire]}
                </span>
                <span style={{ border: "1px solid #29ABE2", color: "#29ABE2" }} className="rounded-full px-4 py-1.5 text-[10px] font-semibold bg-white">
                  {MODELE_LABELS[mt.modele as ModeleMemoire]}
                </span>
                <span className="rounded-full px-4 py-1.5 text-[10px] font-semibold bg-slate-100 text-slate-600">
                  {totalPages} pages + {annexes.length} annexe{annexes.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {/* Candidat */}
            <div style={{ background: "#1E2F6E", borderRadius: "12px" }}
              className="mt-10 px-6 py-4 flex items-center justify-between"
            >
              <div>
                <p className="text-[9px] text-white/60 uppercase tracking-wider font-semibold mb-0.5">Candidat</p>
                <p className="text-base font-bold text-white">{COMPANY.nom}</p>
                <p className="text-[10px] text-white/70">{COMPANY.adresse} · {COMPANY.codePostal} {COMPANY.ville}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-white/60 uppercase tracking-wider font-semibold mb-0.5">SIREN</p>
                <p className="font-mono text-white font-bold">{COMPANY.siren}</p>
                <p className="text-[10px] text-white/70">{COMPANY.email}</p>
              </div>
            </div>
          </div>

          {/* Pied de page couverture */}
          <div className="border-t border-slate-200 px-14 py-3 flex items-center justify-between">
            <p className="text-[9px] text-slate-400">{COMPANY_LEGAL}</p>
            <p className="text-[9px] text-slate-400">Document confidentiel</p>
          </div>
        </div>

        {/* ─── SAUT DE PAGE ─── */}
        <div className="print-break" />

        {/* ═══════════════════════════════════════════════════════════════════
            SOMMAIRE
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="px-14 py-10">
          {/* En-tête de page courante */}
          <PageHeader reference={mt.reference} titre={mt.titre} />

          <h2 className="text-base font-black text-[#1E2F6E] uppercase tracking-wide mb-6 pb-2 border-b-2 border-[#F7941E]">
            Sommaire
          </h2>

          <div className="flex flex-col gap-2">
            {sectionKeys.map((key, idx) => {
              const s = sections[key];
              const page = sectionKeys.slice(0, idx).reduce((sum, k) => sum + (sections[k].nbPages || 1), 2);
              return (
                <div key={key} className="flex items-baseline gap-2">
                  <span className="text-[11px] font-medium text-[#1E2F6E]">{s.titre}</span>
                  <span className="flex-1 border-b border-dotted border-slate-300" />
                  <span className="text-[11px] text-slate-500 font-mono shrink-0">{page}</span>
                </div>
              );
            })}
            {annexes.length > 0 && (
              <div className="flex items-baseline gap-2">
                <span className="text-[11px] font-medium text-[#1E2F6E]">Annexes ({annexes.length} fichier{annexes.length > 1 ? "s" : ""})</span>
                <span className="flex-1 border-b border-dotted border-slate-300" />
                <span className="text-[11px] text-slate-500 font-mono shrink-0">—</span>
              </div>
            )}
          </div>

          <PageFooter company={COMPANY.nom} />
        </div>

        <div className="print-break" />

        {/* ═══════════════════════════════════════════════════════════════════
            SECTIONS DU DOCUMENT
        ═══════════════════════════════════════════════════════════════════ */}
        {sectionKeys.map((key, idx) => {
          const s = sections[key];
          const isLast = idx === sectionKeys.length - 1;
          return (
            <div key={key}>
              <div className="px-14 py-10 min-h-[200mm] flex flex-col">
                <PageHeader reference={mt.reference} titre={mt.titre} />

                {/* Bannière section */}
                <div style={{ background: "linear-gradient(90deg,#1E2F6E,#29ABE2)" }}
                  className="rounded-xl px-6 py-3 mb-6 flex items-center gap-3"
                >
                  <span className="text-white/60 text-xs font-mono">§{String(idx + 1).padStart(2, "0")}</span>
                  <h2 className="text-sm font-black text-white uppercase tracking-wide">{s.titre}</h2>
                </div>

                {/* Contenu rendu */}
                <div
                  className="flex-1"
                  dangerouslySetInnerHTML={{ __html: markdownToHtml(s.contenu) }}
                />

                <PageFooter company={COMPANY.nom} page={idx + 3} />
              </div>
              {!isLast && <div className="print-break" />}
            </div>
          );
        })}

        {/* ═══════════════════════════════════════════════════════════════════
            PAGE ANNEXES (si applicable)
        ═══════════════════════════════════════════════════════════════════ */}
        {annexes.length > 0 && (
          <>
            <div className="print-break" />
            <div className="px-14 py-10">
              <PageHeader reference={mt.reference} titre={mt.titre} />

              <div style={{ background: "linear-gradient(90deg,#F7941E,#E6471D)" }}
                className="rounded-xl px-6 py-3 mb-6"
              >
                <h2 className="text-sm font-black text-white uppercase tracking-wide">
                  Annexes ({annexes.length} document{annexes.length > 1 ? "s" : ""})
                </h2>
              </div>

              <div className="flex flex-col gap-3">
                {annexes.map((a, i) => (
                  <div key={a.id} className="flex items-center gap-4 rounded-xl border border-slate-200 p-4">
                    <div style={{ background: "#1E2F6E" }} className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0">
                      <span className="text-white font-bold text-lg">{String(i + 1).padStart(2, "0")}</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-[#1E2F6E] text-[12px]">{a.titre}</p>
                      {a.taille && (
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {Math.round(a.taille / 1024)} Ko — {a.type.split("/")[1]?.toUpperCase() ?? a.type}
                        </p>
                      )}
                    </div>
                    <a
                      href={urlFichier(a.fichier)}
                      target="_blank"
                      className="text-[10px] text-[#29ABE2] font-semibold print:hidden"
                    >
                      Ouvrir ↗
                    </a>
                  </div>
                ))}
              </div>

              <div className="mt-8 rounded-xl bg-slate-50 border border-slate-200 p-4 text-center">
                <p className="text-[10px] text-slate-500 italic">
                  Les annexes listées ci-dessus sont jointes au présent mémoire et en font partie intégrante.
                </p>
              </div>

              <PageFooter company={COMPANY.nom} />
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            PAGE DE GARDE FINALE — Signature
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="print-break" />
        <div className="px-14 py-10 min-h-[120mm] flex flex-col">
          <PageHeader reference={mt.reference} titre={mt.titre} />

          <div className="flex-1 flex flex-col items-center justify-center gap-8">
            <div style={{ borderTop: "2px solid #1E2F6E" }} className="w-full pt-6 text-center">
              <p className="text-[11px] text-slate-600 mb-6">
                Le présent mémoire technique a été établi par :
              </p>

              <div className="inline-flex flex-col items-center gap-1">
                <div style={{ background: "linear-gradient(135deg,#1E2F6E,#29ABE2)", borderRadius: "8px" }}
                  className="px-8 py-3 mb-4"
                >
                  <p className="text-base font-black text-white">{COMPANY.nom}</p>
                  <p className="text-[10px] text-white/70">{COMPANY.adresse} · {COMPANY.codePostal} {COMPANY.ville}</p>
                </div>

                <div className="grid grid-cols-3 gap-8 mt-4">
                  <div className="flex flex-col items-center gap-1">
                    <div className="h-16 w-48 border-b-2 border-slate-300" />
                    <p className="text-[9px] text-slate-400 uppercase tracking-wide">Signature</p>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="h-16 w-48 border-b-2 border-slate-300" />
                    <p className="text-[9px] text-slate-400 uppercase tracking-wide">Nom et qualité</p>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="h-16 w-48 border-b-2 border-slate-300 flex items-end justify-center pb-1">
                      <p className="text-[10px] text-slate-400">{new Date().toLocaleDateString("fr-FR")}</p>
                    </div>
                    <p className="text-[9px] text-slate-400 uppercase tracking-wide">Date</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pied de page final */}
          <div style={{ borderTop: "1px solid #e2e8f0" }} className="pt-4 flex items-center justify-between">
            <p className="text-[9px] text-slate-400">{COMPANY_LEGAL}</p>
            <p className="text-[9px] text-slate-400">Réf. {mt.reference} · Document confidentiel</p>
          </div>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Composants de page réutilisables
// ---------------------------------------------------------------------------

function PageHeader({ reference, titre }: { reference: string; titre: string }) {
  return (
    <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-200">
      <div className="flex items-center gap-2">
        <img src="/logo.png" alt="SDA Rénovation" className="h-5 w-auto object-contain" />
      </div>
      <div className="text-right">
        <p className="font-mono text-[10px] font-bold text-[#1E2F6E]">{reference}</p>
        <p className="text-[9px] text-slate-400 truncate max-w-[200px]">{titre}</p>
      </div>
    </div>
  );
}

function PageFooter({ company, page }: { company: string; page?: number }) {
  return (
    <div className="flex items-center justify-between mt-6 pt-3 border-t border-slate-200">
      <p className="text-[9px] text-slate-400">{company} · Mémoire technique</p>
      {page && <p className="text-[9px] text-slate-400 font-mono">Page {page}</p>}
      <p className="text-[9px] text-slate-400">{new Date().toLocaleDateString("fr-FR")}</p>
    </div>
  );
}
