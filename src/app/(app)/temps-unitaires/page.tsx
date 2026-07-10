export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { CORPS_ETAT_CODES, CORPS_ETAT_LABELS, CORPS_ETAT_BADGE_TONES, type CorpsEtatCode } from "@/lib/corps-etat";

const DIFFICULTE_TONES: Record<string, "green" | "blue" | "orange" | "red"> = {
  FACILE: "green",
  MOYEN: "blue",
  DIFFICILE: "orange",
  TRES_DIFFICILE: "red",
};
const DIFFICULTE_LABELS: Record<string, string> = {
  FACILE: "Facile",
  MOYEN: "Moyen",
  DIFFICILE: "Difficile",
  TRES_DIFFICILE: "Très difficile",
};
const NATURE_LABELS: Record<string, string> = {
  PREPARATION: "Préparation",
  POSE: "Pose",
  FINITION: "Finition",
  DIVERS: "Divers",
};

export default async function TempsUnitairesPage({
  searchParams,
}: {
  searchParams: Promise<{ corps?: string; difficulte?: string }>;
}) {
  const { corps, difficulte } = await searchParams;

  const all = await prisma.tempsUnitaire.findMany({
    where: {
      ...(corps ? { corpsEtat: corps } : {}),
      ...(difficulte ? { difficulte } : {}),
    },
    include: { ouvrage: { select: { id: true, code: true, designation: true } } },
    orderBy: [{ corpsEtat: "asc" }, { designation: "asc" }],
  });

  const grouped = CORPS_ETAT_CODES.reduce<Record<string, typeof all>>((acc, code) => {
    acc[code] = all.filter((t) => t.corpsEtat === code);
    return acc;
  }, {} as Record<string, typeof all>);

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-brand-navy">Temps unitaires (UT)</h2>
          <p className="mt-1 text-sm text-slate-500">
            {all.length} temps unitaire{all.length !== 1 ? "s" : ""} · Référentiel des durées de pose par unité
          </p>
        </div>
        <LinkButton href="/temps-unitaires/nouveau">+ Ajouter un UT</LinkButton>
      </div>

      {/* Info card */}
      <div className="rounded-xl border border-brand-blue/20 bg-brand-blue/5 p-4 text-sm text-brand-blue-dark">
        <strong>Temps unitaires :</strong> durée exprimée en heures par unité (h/m², h/ml, h/u…) nécessaire
        pour réaliser une tâche. Ils servent à alimenter automatiquement les sous-détails de prix des ouvrages.
      </div>

      {/* Filtres */}
      <form method="get" className="flex flex-wrap gap-3">
        <select
          name="corps"
          defaultValue={corps ?? ""}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
        >
          <option value="">Tous les corps d'état</option>
          {CORPS_ETAT_CODES.map((code) => (
            <option key={code} value={code}>{code} — {CORPS_ETAT_LABELS[code]}</option>
          ))}
        </select>
        <select
          name="difficulte"
          defaultValue={difficulte ?? ""}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
        >
          <option value="">Toutes difficultés</option>
          {Object.entries(DIFFICULTE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue-dark transition"
        >
          Filtrer
        </button>
        {(corps || difficulte) && (
          <Link
            href="/temps-unitaires"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition"
          >
            Réinitialiser
          </Link>
        )}
      </form>

      {/* Contenu */}
      {all.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-slate-400">Aucun temps unitaire enregistré.</p>
          <LinkButton href="/temps-unitaires/nouveau" className="mt-4">
            Ajouter le premier UT
          </LinkButton>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {CORPS_ETAT_CODES.map((ce) => {
            const items = grouped[ce];
            if (!items || items.length === 0) return null;
            return (
              <div key={ce} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
                  <Badge tone={CORPS_ETAT_BADGE_TONES[ce as CorpsEtatCode]}>{ce}</Badge>
                  <h3 className="font-semibold text-brand-navy">{CORPS_ETAT_LABELS[ce as CorpsEtatCode]}</h3>
                  <span className="ml-auto text-xs text-slate-400">{items.length} UT</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                        <th className="px-4 py-2">Désignation</th>
                        <th className="px-4 py-2">Nature</th>
                        <th className="px-4 py-2 text-center">Unité</th>
                        <th className="px-4 py-2 text-right">Temps (h/u)</th>
                        <th className="px-4 py-2 text-center">Difficulté</th>
                        <th className="px-4 py-2">Ouvrage lié</th>
                        <th className="px-4 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {items.map((t) => (
                        <tr key={t.id} className={`hover:bg-slate-50 ${!t.actif ? "opacity-50" : ""}`}>
                          <td className="px-4 py-2 font-medium text-brand-navy">
                            {t.designation}
                            {!t.actif && <span className="ml-2 text-xs text-slate-400 italic">Inactif</span>}
                          </td>
                          <td className="px-4 py-2 text-slate-500">{NATURE_LABELS[t.nature] ?? t.nature}</td>
                          <td className="px-4 py-2 text-center text-slate-500">{t.unite}</td>
                          <td className="px-4 py-2 text-right font-semibold text-brand-navy">
                            {t.tempsUnitaire.toFixed(3)}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <Badge tone={DIFFICULTE_TONES[t.difficulte] ?? "gray"}>
                              {DIFFICULTE_LABELS[t.difficulte] ?? t.difficulte}
                            </Badge>
                          </td>
                          <td className="px-4 py-2">
                            {t.ouvrage ? (
                              <Link
                                href={`/ouvrages/${t.ouvrage.id}`}
                                className="text-xs text-brand-blue hover:underline"
                              >
                                {t.ouvrage.code}
                              </Link>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-right">
                            <Link href={`/temps-unitaires/${t.id}`} className="text-xs text-brand-blue hover:underline">
                              Modifier
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
