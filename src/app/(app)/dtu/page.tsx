export const dynamic = "force-dynamic";

import Link from "next/link";
import { Plus, BookOpen, FileText, ExternalLink, ShieldAlert } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { LinkButton } from "@/components/ui/button";
import { seedDTU } from "@/lib/actions/dtu";
import { SubmitButton } from "@/components/ui/submit-button";

// ─── Domain labels ────────────────────────────────────────────────────────────

const DOMAINE_LABELS: Record<string, string> = {
  TERRASSEMENT: "Terrassement & Fondations",
  MACONNERIE: "Maçonnerie générale",
  BETON: "Béton",
  DALLAGE: "Dallage & Sol industriel",
  CHAPE: "Chapes",
  COUVERTURE: "Couverture & Zinguerie",
  RAVALEMENT: "Ravalement & Façade",
  PLATRERIE: "Plâtrerie",
  MENUISERIE: "Menuiserie intérieure & extérieure",
  AGENCEMENT: "Agencement",
  REVETEMENT_SOL: "Revêtements de sol",
  REVETEMENT_MURAL: "Revêtements muraux",
  PEINTURE: "Peinture",
  PLOMBERIE: "Plomberie, Sanitaire & CVC",
  ELECTRICITE: "Électricité",
  RENFORCEMENT_STRUCTUREL: "Renforcement structurel",
  AUTRE: "Autres",
};

// Canonical order for domain grouping
const DOMAINE_ORDER = [
  "TERRASSEMENT",
  "MACONNERIE",
  "BETON",
  "DALLAGE",
  "CHAPE",
  "COUVERTURE",
  "RAVALEMENT",
  "PLATRERIE",
  "MENUISERIE",
  "AGENCEMENT",
  "REVETEMENT_SOL",
  "REVETEMENT_MURAL",
  "PEINTURE",
  "PLOMBERIE",
  "ELECTRICITE",
  "RENFORCEMENT_STRUCTUREL",
  "AUTRE",
];

export default async function DTUPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; domaine?: string }>;
}) {
  const { q, domaine } = await searchParams;

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const allDtus = await prisma.dTU.findMany({
    where: { actif: true },
    orderBy: [{ domaine: "asc" }, { reference: "asc" }],
  });

  // ── Filter ───────────────────────────────────────────────────────────────────
  const searchLower = q?.toLowerCase().trim() ?? "";
  const filtered = allDtus.filter((dtu) => {
    const matchesDomaine = !domaine || dtu.domaine === domaine;
    const matchesQ =
      !searchLower ||
      dtu.reference.toLowerCase().includes(searchLower) ||
      dtu.titre.toLowerCase().includes(searchLower) ||
      (dtu.description?.toLowerCase().includes(searchLower) ?? false);
    return matchesDomaine && matchesQ;
  });

  // ── KPIs ─────────────────────────────────────────────────────────────────────
  const total = allDtus.length;
  const avecPdf = allDtus.filter((d) => d.fichierPdf).length;
  const sansPdf = total - avecPdf;

  // Domain pill counts (from full set, not filtered)
  const domaineCounts = allDtus.reduce<Record<string, number>>((acc, d) => {
    acc[d.domaine] = (acc[d.domaine] ?? 0) + 1;
    return acc;
  }, {});

  // ── Group by domaine ─────────────────────────────────────────────────────────
  const grouped = filtered.reduce<Record<string, typeof filtered>>((acc, dtu) => {
    acc[dtu.domaine] = acc[dtu.domaine] ?? [];
    acc[dtu.domaine].push(dtu);
    return acc;
  }, {});

  const sortedDomaines = DOMAINE_ORDER.filter((d) => grouped[d]?.length);
  // Add any domaine not in canonical order at the end
  Object.keys(grouped).forEach((d) => {
    if (!sortedDomaines.includes(d)) sortedDomaines.push(d);
  });

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (total === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-brand-navy">Bibliothèque DTU &amp; Normes BTP</h2>
            <p className="mt-1 text-sm text-slate-500">Aucun DTU enregistré</p>
          </div>
          <LinkButton href="/dtu/nouveau">
            <Plus className="h-4 w-4" />
            Ajouter un DTU
          </LinkButton>
        </div>

        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-16 text-center shadow-sm">
          <BookOpen className="mx-auto mb-4 h-12 w-12 text-slate-300" />
          <h3 className="mb-2 text-lg font-semibold text-brand-navy">Aucun DTU dans la bibliothèque</h3>
          <p className="mb-6 max-w-md mx-auto text-sm text-slate-500">
            Chargez le catalogue officiel pour démarrer avec les DTU et normes BTP les plus courants,
            ou ajoutez manuellement vos propres références.
          </p>
          <form action={seedDTU}>
            <SubmitButton pendingLabel="Chargement du catalogue…">
              <BookOpen className="h-4 w-4" />
              Charger le catalogue officiel
            </SubmitButton>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-brand-navy">Bibliothèque DTU &amp; Normes BTP</h2>
          <p className="mt-1 text-sm text-slate-500">
            {total} référence{total !== 1 ? "s" : ""} — {avecPdf} avec PDF
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LinkButton href="/fiches-techniques" variant="secondary">
            <FileText className="h-4 w-4" />
            Fiches techniques
          </LinkButton>
          <LinkButton href="/ppsps" variant="secondary">
            <ShieldAlert className="h-4 w-4" />
            PPSPS
          </LinkButton>
          <form action={seedDTU}>
            <SubmitButton variant="secondary" pendingLabel="Chargement…">
              <BookOpen className="h-4 w-4" />
              Charger le catalogue officiel
            </SubmitButton>
          </form>
          <LinkButton href="/dtu/nouveau">
            <Plus className="h-4 w-4" />
            Ajouter un DTU
          </LinkButton>
        </div>
      </div>

      {/* ── Info banner ── */}
      <div className="rounded-xl border border-brand-blue/20 bg-brand-blue/5 p-4 text-sm text-brand-navy">
        <p>
          <span className="font-semibold">Droits d&apos;auteur :</span> Les DTU (Documents Techniques
          Unifiés) et normes AFNOR sont des documents protégés par le droit d&apos;auteur. Cette
          bibliothèque vous permet de gérer vos références et d&apos;uploader vos propres exemplaires
          obtenus légalement via la boutique AFNOR (
          <a
            href="https://boutique.afnor.org"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-brand-blue"
          >
            boutique.afnor.org
          </a>
          ) ou votre abonnement CSTB Solutions.
        </p>
      </div>

      {/* ── KPI bar ── */}
      <div className="flex flex-wrap items-stretch gap-3">
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Total</p>
          <p className="mt-1 text-2xl font-bold text-brand-navy">{total}</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-white px-5 py-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Avec PDF</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">{avecPdf}</p>
        </div>
        <div className="rounded-xl border border-amber-100 bg-white px-5 py-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Sans PDF</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{sansPdf}</p>
        </div>
        {/* Domain pills */}
        <div className="flex flex-1 flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          {DOMAINE_ORDER.filter((d) => domaineCounts[d]).map((d) => (
            <Link
              key={d}
              href={`/dtu?domaine=${domaine === d ? "" : d}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium transition ${
                domaine === d
                  ? "bg-brand-navy text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {DOMAINE_LABELS[d] ?? d}
              <span className="ml-1.5 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold">
                {domaineCounts[d]}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Filter bar ── */}
      <form method="GET" className="flex flex-wrap gap-3">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Rechercher par référence, titre, description…"
          className="flex-1 min-w-48 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/30"
        />
        <select
          name="domaine"
          defaultValue={domaine ?? ""}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/30"
        >
          <option value="">Tous les domaines</option>
          {DOMAINE_ORDER.map((d) => (
            <option key={d} value={d}>
              {DOMAINE_LABELS[d] ?? d}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-brand-navy/90 transition"
        >
          Filtrer
        </button>
        {(q || domaine) && (
          <Link
            href="/dtu"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-500 hover:bg-slate-50 transition"
          >
            Réinitialiser
          </Link>
        )}
      </form>

      {/* ── Results ── */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-slate-400">Aucun DTU ne correspond à votre recherche.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {sortedDomaines.map((dom) => {
            const dtus = grouped[dom];
            if (!dtus?.length) return null;
            return (
              <section key={dom}>
                <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-brand-navy">
                  <span className="inline-block h-1 w-5 rounded-full bg-brand-orange" />
                  {DOMAINE_LABELS[dom] ?? dom}
                  <span className="ml-1 text-sm font-normal text-slate-400">({dtus.length})</span>
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {dtus.map((dtu) => (
                    <div
                      key={dtu.id}
                      className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition"
                    >
                      {/* Reference badge */}
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <span className="inline-flex items-center rounded-md bg-brand-navy px-2.5 py-1 font-mono text-xs font-bold text-white">
                          {dtu.reference}
                        </span>
                        {dtu.fichierPdf ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
                            <FileText className="h-3 w-3" />
                            PDF disponible
                          </span>
                        ) : (
                          <a
                            href={dtu.lienAchat ?? "https://www.boutique.afnor.org"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 border border-amber-200 hover:bg-amber-100 transition"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Obtenir le PDF
                          </a>
                        )}
                      </div>

                      {/* Title */}
                      <h4 className="mb-1 text-sm font-semibold text-brand-navy leading-snug">
                        {dtu.titre}
                      </h4>

                      {/* Norme & version */}
                      <div className="mb-2 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-400">
                        {dtu.normeNF && <span className="font-mono">{dtu.normeNF}</span>}
                        {dtu.version && <span>{dtu.version}</span>}
                      </div>

                      {/* Description */}
                      {dtu.description && (
                        <p className="mb-3 line-clamp-2 text-xs text-slate-500 leading-relaxed flex-1">
                          {dtu.description}
                        </p>
                      )}

                      {/* Edit link */}
                      <div className="mt-auto pt-2 border-t border-slate-100">
                        <Link
                          href={`/dtu/${dtu.id}`}
                          className="text-xs font-medium text-brand-blue hover:underline"
                        >
                          Détail / Modifier
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
