export const dynamic = "force-dynamic";

import Link from "next/link";
import { Bot, Calendar, FileText, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { genererRapportMensuel } from "@/lib/actions/maintenance";

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

  const rapportActif = id
    ? rapports.find((r) => r.id === id)
    : rapports[0];

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
            Rapport d'analyse mensuel généré par l'IA de contrôle qualité
          </p>
        </div>
        <form
          action={async () => {
            "use server";
            await genererRapportMensuel();
          }}
        >
          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-brand-orange px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-orange-dark"
          >
            <Sparkles className="h-4 w-4" />
            Générer rapport {new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
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
                La clé API Anthropic n'est pas configurée. Le rapport sera généré sans analyse IA (données brutes uniquement).
                Pour activer l'analyse IA, ajoutez <code className="bg-amber-100 px-1 rounded">ANTHROPIC_API_KEY=votre_clé</code> dans le fichier <code className="bg-amber-100 px-1 rounded">.env</code>.
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
                  Cliquez sur "Générer rapport" pour créer votre premier rapport mensuel.
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
                          ? "bg-brand-blue/10 text-brand-blue-dark font-medium"
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
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              {/* Header du rapport */}
              <div className="border-b border-slate-200 bg-gradient-to-r from-brand-navy to-brand-blue-dark px-6 py-5 text-white">
                <div className="flex items-center gap-3">
                  <Bot className="h-6 w-6" />
                  <div>
                    <h3 className="font-semibold">
                      Rapport mensuel —{" "}
                      {new Date(rapportActif.periode + "-01").toLocaleDateString("fr-FR", {
                        month: "long",
                        year: "numeric",
                      })}
                    </h3>
                    <p className="text-xs text-white/60">
                      Généré le{" "}
                      {new Date(rapportActif.createdAt).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      par {rapportActif.generePar?.name ?? "Système"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {rapportActif.analyseIA ? (
                  // Rapport avec analyse IA
                  <div className="prose prose-sm max-w-none text-slate-700">
                    <div className="whitespace-pre-wrap leading-relaxed">
                      {rapportActif.analyseIA}
                    </div>
                  </div>
                ) : (
                  // Rapport données brutes
                  <div>
                    <div className="mb-4 flex items-center gap-2 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      <Bot className="h-4 w-4" />
                      <span>Rapport sans analyse IA — configurez la clé Anthropic pour activer la rédaction automatique.</span>
                    </div>
                    <RapportDonneesBrutes contenu={rapportActif.contenu} />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RapportDonneesBrutes({ contenu }: { contenu: string }) {
  let data: ReturnType<typeof JSON.parse> | null = null;
  try {
    data = JSON.parse(contenu);
  } catch {
    return <p className="text-sm text-slate-400">Données du rapport non disponibles.</p>;
  }

  if (!data) return null;

  const { stats, conformite, activiteParUser } = data;

  return (
    <div className="flex flex-col gap-6">
      {/* Stats clés */}
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

      {/* Non-conformités */}
      {conformite?.chantiersNonConformes?.length > 0 && (
        <section>
          <h4 className="mb-3 font-semibold text-brand-navy">
            Non-conformités détectées ({conformite.chantiersNonConformes.length})
          </h4>
          <div className="flex flex-col gap-2">
            {conformite.chantiersNonConformes.map(
              (c: { nom: string; problemes: string[] }, i: number) => (
                <div key={i} className="rounded-lg border border-red-100 bg-red-50 px-4 py-3">
                  <p className="font-medium text-red-800">{c.nom}</p>
                  <ul className="mt-1 text-sm text-red-700">
                    {c.problemes.map((p: string, j: number) => (
                      <li key={j}>• {p}</li>
                    ))}
                  </ul>
                </div>
              )
            )}
          </div>
        </section>
      )}

      {/* Activité utilisateurs */}
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
