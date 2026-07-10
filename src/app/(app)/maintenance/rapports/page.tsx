export const dynamic = "force-dynamic";

import Link from "next/link";
import { Bot, Calendar, FileText, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { genererRapportMensuel } from "@/lib/actions/maintenance";
import { RapportViewer } from "@/components/maintenance/rapport-viewer";

async function GenererAction() {
  "use server";
  await genererRapportMensuel();
}

export default async function RapportsMensuelsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  const rapports = await prisma.rapportMensuel.findMany({
    orderBy: { createdAt: "desc" },
    include: { generePar: { select: { name: true } } },
  });

  const rapportActif = id ? rapports.find((r) => r.id === id) : rapports[0];
  const hasApiKey = !!process.env.ANTHROPIC_API_KEY;

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/maintenance" className="text-sm text-brand-blue hover:underline">
            ← Retour à la maintenance
          </Link>
          <h2 className="mt-1 text-xl font-bold text-brand-navy">
            Rapports mensuels CRM — Alba-Ayla
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Rapport d&apos;analyse mensuel généré par l&apos;IA de contrôle qualité
          </p>
        </div>
        <form action={GenererAction}>
          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-brand-orange px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-orange-dark"
          >
            <Sparkles className="h-4 w-4" />
            Générer rapport{" "}
            {new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
          </button>
        </form>
      </div>

      {!hasApiKey && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <div className="flex items-start gap-3">
            <Bot className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-semibold text-amber-800">Alba-Ayla non configurée</p>
              <p className="mt-1 text-sm text-amber-700">
                La clé API Anthropic n&apos;est pas configurée. Le rapport sera généré sans analyse IA.
                Ajoutez <code className="rounded bg-amber-100 px-1">ANTHROPIC_API_KEY</code> dans{" "}
                <code className="rounded bg-amber-100 px-1">.env</code> pour l&apos;activer.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Liste des rapports */}
        <aside className="lg:col-span-1">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-brand-navy">
              Rapports disponibles ({rapports.length})
            </h3>
            {rapports.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <FileText className="h-8 w-8 text-slate-300" />
                <p className="text-sm text-slate-400">Aucun rapport généré.</p>
                <p className="text-xs text-slate-400">
                  Cliquez sur &quot;Générer rapport&quot; pour créer votre premier rapport mensuel.
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-1">
                {rapports.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/maintenance/rapports?id=${r.id}`}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                        rapportActif?.id === r.id
                          ? "bg-brand-blue/10 font-medium text-brand-blue-dark"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">
                          {new Date(r.periode + "-01").toLocaleDateString("fr-FR", {
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                        <p className="text-xs text-slate-400">
                          {r.analyseIA ? "✦ Avec analyse IA" : "Données brutes"} ·{" "}
                          {r.generePar?.name ?? "Système"}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* Rapport actif */}
        <div className="lg:col-span-2">
          {!rapportActif ? (
            <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-slate-200 text-center">
              <Bot className="h-10 w-10 text-slate-300" />
              <div>
                <p className="font-medium text-slate-500">Aucun rapport sélectionné</p>
                <p className="text-sm text-slate-400">
                  Générez votre premier rapport mensuel pour commencer le suivi qualité.
                </p>
              </div>
            </div>
          ) : (
            <RapportViewer
              rapport={{
                analyseIA: rapportActif.analyseIA,
                contenu: rapportActif.contenu,
                periode: rapportActif.periode,
                createdAt: rapportActif.createdAt.toISOString(),
                generateurNom: rapportActif.generePar?.name ?? "Système",
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
