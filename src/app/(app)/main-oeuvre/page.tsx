import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { CORPS_ETAT_CODES, CORPS_ETAT_LABELS, CORPS_ETAT_BADGE_TONES, type CorpsEtatCode } from "@/lib/corps-etat";
import { formatEuros } from "@/lib/format";

const CATEGORIES = ["SALARIE", "SOUS_TRAITANT", "INTERIMAIRE"] as const;
const CATEGORIE_LABELS: Record<string, string> = {
  SALARIE: "Salarié",
  SOUS_TRAITANT: "Sous-traitant",
  INTERIMAIRE: "Intérimaire",
};
const CATEGORIE_TONES: Record<string, "blue" | "navy" | "orange" | "green" | "gray" | "red"> = {
  SALARIE: "navy",
  SOUS_TRAITANT: "orange",
  INTERIMAIRE: "blue",
};

const QUALIFICATION_LABELS: Record<string, string> = {
  MANOEUVRE: "Manœuvre",
  OUVRIER: "Ouvrier",
  COMPAGNON: "Compagnon",
  CHEF_EQUIPE: "Chef d'équipe",
  CHEF_CHANTIER: "Chef de chantier",
  MAITRISE: "Maîtrise",
};

export default async function MainOeuvrePage({
  searchParams,
}: {
  searchParams: Promise<{ categorie?: string; corps?: string }>;
}) {
  const { categorie, corps } = await searchParams;

  const all = await prisma.tauxMainOeuvre.findMany({
    where: {
      ...(categorie ? { categorie } : {}),
      ...(corps ? { corpsEtat: corps } : {}),
    },
    orderBy: [{ corpsEtat: "asc" }, { categorie: "asc" }, { designation: "asc" }],
  });

  // KPI par catégorie
  const kpis = {
    SALARIE: all.filter((t) => t.categorie === "SALARIE").length,
    SOUS_TRAITANT: all.filter((t) => t.categorie === "SOUS_TRAITANT").length,
    INTERIMAIRE: all.filter((t) => t.categorie === "INTERIMAIRE").length,
  };

  const grouped = CORPS_ETAT_CODES.reduce<Record<string, typeof all>>((acc, code) => {
    acc[code] = all.filter((t) => t.corpsEtat === code);
    return acc;
  }, {} as Record<string, typeof all>);

  const otherCorps = all.filter((t) => !CORPS_ETAT_CODES.includes(t.corpsEtat as CorpsEtatCode));

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-brand-navy">Taux de main d'œuvre</h2>
          <p className="mt-1 text-sm text-slate-500">
            Référentiel des coûts horaires HT par corps d'état et catégorie
          </p>
        </div>
        <LinkButton href="/main-oeuvre/nouveau">+ Ajouter un taux</LinkButton>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-3 gap-4">
        {CATEGORIES.map((cat) => (
          <div key={cat} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
              {CATEGORIE_LABELS[cat]}
            </p>
            <p className="mt-1 text-2xl font-bold text-brand-navy">{kpis[cat]}</p>
            <p className="text-xs text-slate-400">taux enregistrés</p>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <form method="get" className="flex flex-wrap gap-3">
        <select
          name="categorie"
          defaultValue={categorie ?? ""}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
        >
          <option value="">Toutes catégories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{CATEGORIE_LABELS[c]}</option>
          ))}
        </select>
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
        <button
          type="submit"
          className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue-dark transition"
        >
          Filtrer
        </button>
        {(categorie || corps) && (
          <Link
            href="/main-oeuvre"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition"
          >
            Réinitialiser
          </Link>
        )}
      </form>

      {/* Contenu */}
      {all.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-slate-400">Aucun taux de main d'œuvre enregistré.</p>
          <LinkButton href="/main-oeuvre/nouveau" className="mt-4">
            Ajouter le premier taux
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
                  <span className="ml-auto text-xs text-slate-400">{items.length} taux</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                        <th className="px-4 py-2">Désignation</th>
                        <th className="px-4 py-2">Qualification</th>
                        <th className="px-4 py-2">Catégorie</th>
                        <th className="px-4 py-2 text-right">Taux HT €/h</th>
                        <th className="px-4 py-2 text-right">Charges %</th>
                        <th className="px-4 py-2 text-right">Coût complet €/h</th>
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
                          <td className="px-4 py-2 text-slate-500">
                            {QUALIFICATION_LABELS[t.qualification] ?? t.qualification}
                          </td>
                          <td className="px-4 py-2">
                            <Badge tone={CATEGORIE_TONES[t.categorie] ?? "gray"}>
                              {CATEGORIE_LABELS[t.categorie] ?? t.categorie}
                            </Badge>
                          </td>
                          <td className="px-4 py-2 text-right text-slate-600">{formatEuros(t.tauxHoraireHT)}</td>
                          <td className="px-4 py-2 text-right text-slate-400">
                            {t.chargesPatronales != null ? `${t.chargesPatronales} %` : "—"}
                          </td>
                          <td className="px-4 py-2 text-right font-semibold text-brand-navy">
                            {t.coutCompletHT != null ? formatEuros(t.coutCompletHT) : "—"}
                          </td>
                          <td className="px-4 py-2 text-right">
                            <Link href={`/main-oeuvre/${t.id}`} className="text-xs text-brand-blue hover:underline">
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
          {otherCorps.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
                <Badge tone="gray">AUTRE</Badge>
                <h3 className="font-semibold text-brand-navy">Autres corps d'état</h3>
                <span className="ml-auto text-xs text-slate-400">{otherCorps.length} taux</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                      <th className="px-4 py-2">Corps</th>
                      <th className="px-4 py-2">Désignation</th>
                      <th className="px-4 py-2">Qualification</th>
                      <th className="px-4 py-2">Catégorie</th>
                      <th className="px-4 py-2 text-right">Taux HT €/h</th>
                      <th className="px-4 py-2 text-right">Coût complet €/h</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {otherCorps.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2 font-mono text-xs text-slate-500">{t.corpsEtat}</td>
                        <td className="px-4 py-2 font-medium text-brand-navy">{t.designation}</td>
                        <td className="px-4 py-2 text-slate-500">
                          {QUALIFICATION_LABELS[t.qualification] ?? t.qualification}
                        </td>
                        <td className="px-4 py-2">
                          <Badge tone={CATEGORIE_TONES[t.categorie] ?? "gray"}>
                            {CATEGORIE_LABELS[t.categorie] ?? t.categorie}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 text-right text-slate-600">{formatEuros(t.tauxHoraireHT)}</td>
                        <td className="px-4 py-2 text-right font-semibold text-brand-navy">
                          {t.coutCompletHT != null ? formatEuros(t.coutCompletHT) : "—"}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <Link href={`/main-oeuvre/${t.id}`} className="text-xs text-brand-blue hover:underline">
                            Modifier
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
