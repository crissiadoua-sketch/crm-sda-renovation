import Link from "next/link";
import { notFound } from "next/navigation";
import { BulletinEditor } from "@/components/rh/bulletin-editor";
import { updateBulletin, deleteBulletin } from "@/lib/actions/rh";
import { DeleteButton } from "@/components/ui/delete-button";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Logo } from "@/components/logo";
import { prisma } from "@/lib/prisma";
import { formatDate, formatEuros } from "@/lib/format";
import { CCN_LABELS, type TypeCcn, type LigneBulletin } from "@/lib/ccn-batiment";

const bulletinStatutTones: Record<string, BadgeTone> = {
  BROUILLON: "gray",
  VALIDE: "blue",
  PAYE: "green",
};

const bulletinStatutLabels: Record<string, string> = {
  BROUILLON: "Brouillon",
  VALIDE: "Validé",
  PAYE: "Payé",
};

const MOIS_FR = [
  "Janvier","Février","Mars","Avril","Mai","Juin",
  "Juillet","Août","Septembre","Octobre","Novembre","Décembre",
];
function periodLabel(p: string) {
  const [y, m] = p.split("-");
  return `${MOIS_FR[Number(m) - 1] ?? m} ${y}`;
}

export default async function BulletinDetailPage({
  params,
}: {
  params: Promise<{ salarieId: string; bulletinId: string }>;
}) {
  const { salarieId, bulletinId } = await params;

  const [salarie, bulletin, parametres] = await Promise.all([
    prisma.salarie.findUnique({
      where: { id: salarieId },
      include: {
        adhesionMutuelle: {
          include: { formuleMutuelle: true, contratMutuelle: true },
        },
      },
    }),
    prisma.bulletinDePaie.findUnique({ where: { id: bulletinId } }),
    prisma.parametres.findUnique({ where: { id: "default" } }),
  ]);

  if (!salarie || !bulletin) notFound();

  const lignes: LigneBulletin[] = JSON.parse(bulletin.lignes || "[]");
  const villeSociete = [parametres?.codePostal, parametres?.ville].filter(Boolean).join(" ");
  const action = updateBulletin.bind(null, salarieId, bulletinId);
  const mutuelle = salarie.adhesionMutuelle?.actif ? salarie.adhesionMutuelle : null;
  const cotisationMutuelleSalarie = mutuelle?.formuleMutuelle.cotisationSalarie ?? 0;
  const cotisationMutuellePatronale = mutuelle?.formuleMutuelle.cotisationPatronale ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href={`/rh/${salarieId}`} className="text-sm text-brand-blue hover:underline">
            ← Retour à {salarie.prenom} {salarie.nom}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold text-brand-navy">
              Bulletin {periodLabel(bulletin.periode)}
            </h2>
            <Badge tone={bulletinStatutTones[bulletin.statut] ?? "gray"}>
              {bulletinStatutLabels[bulletin.statut] ?? bulletin.statut}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {salarie.prenom} {salarie.nom} · Net à payer :{" "}
            <strong className="text-brand-navy">{formatEuros(bulletin.netAPayer)}</strong>
          </p>
        </div>
        <DeleteButton
          action={deleteBulletin.bind(null, salarieId, bulletinId)}
          confirmMessage={`Supprimer le bulletin ${periodLabel(bulletin.periode)} de ${salarie.prenom} ${salarie.nom} ?`}
        />
      </div>

      {/* Document bulletin imprimable */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm text-sm print:shadow-none">
        {/* En-tête */}
        <div className="mb-6 grid grid-cols-2 gap-6">
          <div>
            <Logo size="md" className="mb-2" />
            <p className="font-semibold text-brand-navy">{parametres?.nomEntreprise || "SDA Rénovation"}</p>
            <p className="text-slate-500">{parametres?.adresse || "23 bis rue Aristide Berges"}</p>
            <p className="text-slate-500">{villeSociete || "31270 Cugnaux"}</p>
            <p className="text-slate-500">{parametres?.telephone || "06.25.43.64.54"}</p>
            <p className="mt-1 text-xs text-slate-400">SIRET : {parametres?.siret || "988 681 672"}</p>
            <p className="text-xs text-slate-400">
              Convention collective : {CCN_LABELS[salarie.typeCcn as TypeCcn]}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-brand-navy">BULLETIN DE PAIE</p>
            <p className="font-semibold text-slate-700">{periodLabel(bulletin.periode)}</p>
            {bulletin.datePaiement && (
              <p className="text-slate-500">Paiement le {formatDate(bulletin.datePaiement)}</p>
            )}
            <div className="mt-3 rounded-lg bg-slate-50 p-3 text-left">
              <p className="font-medium text-slate-700">{salarie.prenom} {salarie.nom}</p>
              {salarie.numeroSS && <p className="text-xs text-slate-500">N° SS : {salarie.numeroSS}</p>}
              {salarie.adresse && <p className="text-xs text-slate-500">{salarie.adresse}</p>}
              {(salarie.codePostal || salarie.ville) && (
                <p className="text-xs text-slate-500">
                  {[salarie.codePostal, salarie.ville].filter(Boolean).join(" ")}
                </p>
              )}
              <p className="mt-1 text-xs text-slate-500">Matricule : {salarie.matricule}</p>
              <p className="text-xs text-slate-500">
                Qualification : {salarie.qualification || "—"}
                {salarie.coefficient && ` · Coeff. ${salarie.coefficient}`}
                {salarie.position && ` · Pos. ${salarie.position}`}
              </p>
              <p className="text-xs text-slate-500">Embauche : {formatDate(salarie.dateEmbauche)}</p>
              {salarie.numeroCIBTP && (
                <p className="text-xs text-slate-500">N° CIBTP : {salarie.numeroCIBTP}</p>
              )}
            </div>
          </div>
        </div>

        {/* Rémunération */}
        <table className="mb-4 w-full border border-slate-200 text-xs">
          <thead className="bg-brand-navy text-white">
            <tr>
              <th className="px-3 py-2 text-left">Désignation</th>
              <th className="px-3 py-2 text-right">Heures / Base</th>
              <th className="px-3 py-2 text-right">Taux</th>
              <th className="px-3 py-2 text-right">Montant brut</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="px-3 py-1.5">Salaire de base</td>
              <td className="px-3 py-1.5 text-right">{bulletin.heuresTravaillees.toFixed(2)} h</td>
              <td className="px-3 py-1.5 text-right">
                {bulletin.heuresTravaillees > 0
                  ? formatEuros(bulletin.salaireBase / bulletin.heuresTravaillees) + "/h"
                  : "—"}
              </td>
              <td className="px-3 py-1.5 text-right font-medium">{formatEuros(bulletin.salaireBase)}</td>
            </tr>
            {bulletin.heuresSupp25 > 0 && (
              <tr className="border-b border-slate-100">
                <td className="px-3 py-1.5">Heures supplémentaires 25%</td>
                <td className="px-3 py-1.5 text-right">{bulletin.heuresSupp25.toFixed(2)} h</td>
                <td className="px-3 py-1.5 text-right">125%</td>
                <td className="px-3 py-1.5 text-right font-medium">
                  {formatEuros(
                    bulletin.heuresTravaillees > 0
                      ? bulletin.heuresSupp25 * (bulletin.salaireBase / bulletin.heuresTravaillees) * 1.25
                      : 0,
                  )}
                </td>
              </tr>
            )}
            {bulletin.heuresSupp50 > 0 && (
              <tr className="border-b border-slate-100">
                <td className="px-3 py-1.5">Heures supplémentaires 50%</td>
                <td className="px-3 py-1.5 text-right">{bulletin.heuresSupp50.toFixed(2)} h</td>
                <td className="px-3 py-1.5 text-right">150%</td>
                <td className="px-3 py-1.5 text-right font-medium">
                  {formatEuros(
                    bulletin.heuresTravaillees > 0
                      ? bulletin.heuresSupp50 * (bulletin.salaireBase / bulletin.heuresTravaillees) * 1.50
                      : 0,
                  )}
                </td>
              </tr>
            )}
            {bulletin.autresElements > 0 && (
              <tr className="border-b border-slate-100">
                <td className="px-3 py-1.5">Primes / Indemnités / Avantages</td>
                <td className="px-3 py-1.5 text-right">—</td>
                <td className="px-3 py-1.5 text-right">—</td>
                <td className="px-3 py-1.5 text-right font-medium">{formatEuros(bulletin.autresElements)}</td>
              </tr>
            )}
            <tr className="bg-slate-50 font-semibold">
              <td className="px-3 py-2" colSpan={3}>SALAIRE BRUT</td>
              <td className="px-3 py-2 text-right">{formatEuros(bulletin.totalBrut)}</td>
            </tr>
          </tbody>
        </table>

        {/* Cotisations */}
        {lignes.length > 0 && (
          <table className="mb-4 w-full border border-slate-200 text-xs">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-3 py-2 text-left text-slate-600">Cotisations sociales</th>
                <th className="px-3 py-2 text-right text-slate-600">Assiette</th>
                <th className="px-3 py-2 text-right text-slate-600">Taux salarié</th>
                <th className="px-3 py-2 text-right text-slate-600">Montant salarié</th>
                <th className="px-3 py-2 text-right text-slate-600">Taux patronal</th>
                <th className="px-3 py-2 text-right text-slate-600">Montant patronal</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((l) => (
                <tr key={l.id} className={`border-b border-slate-50 ${l.nonDeductible ? "bg-orange-50/30" : ""}`}>
                  <td className="px-3 py-1.5 text-slate-700">
                    {l.libelle}
                    {l.nonDeductible && <span className="ml-1 text-[10px] text-orange-500">(non déd.)</span>}
                  </td>
                  <td className="px-3 py-1.5 text-right text-slate-500">{formatEuros(l.base)}</td>
                  <td className="px-3 py-1.5 text-right">{l.tauxSalarie > 0 ? `${l.tauxSalarie} %` : "—"}</td>
                  <td className="px-3 py-1.5 text-right font-medium text-red-600">
                    {l.montantSalarie > 0 ? `-${formatEuros(l.montantSalarie)}` : "—"}
                  </td>
                  <td className="px-3 py-1.5 text-right">{l.tauxPatronal > 0 ? `${l.tauxPatronal} %` : "—"}</td>
                  <td className="px-3 py-1.5 text-right text-slate-500">
                    {l.montantPatronal > 0 ? formatEuros(l.montantPatronal) : "—"}
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-100 font-semibold">
                <td className="px-3 py-2 text-slate-700" colSpan={3}>TOTAL COTISATIONS SALARIALES</td>
                <td className="px-3 py-2 text-right text-red-600">
                  -{formatEuros(bulletin.cotisationsSalarie + bulletin.csgNonDeductible)}
                </td>
                <td className="px-3 py-2"></td>
                <td className="px-3 py-2 text-right text-slate-600">
                  {formatEuros(bulletin.cotisationsPatronales)}
                </td>
              </tr>
            </tbody>
          </table>
        )}

        {/* Mutuelle */}
        {mutuelle && (
          <table className="mb-4 w-full border border-slate-200 text-xs">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-slate-600">Prévoyance / Mutuelle</th>
                <th className="px-3 py-2 text-right text-slate-600">Part salarié</th>
                <th className="px-3 py-2 text-right text-slate-600">Part patronale</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="px-3 py-1.5 text-slate-700">
                  Complémentaire santé — {mutuelle.contratMutuelle.organisme} ({mutuelle.formuleMutuelle.label})
                </td>
                <td className="px-3 py-1.5 text-right font-medium text-red-600">
                  -{formatEuros(cotisationMutuelleSalarie)}
                </td>
                <td className="px-3 py-1.5 text-right text-slate-500">
                  {formatEuros(cotisationMutuellePatronale)}
                </td>
              </tr>
            </tbody>
          </table>
        )}

        {/* Net */}
        <div className="mb-4 rounded-lg border-2 border-brand-navy bg-brand-navy p-4 text-white">
          <div className="grid grid-cols-2 gap-y-1 text-sm">
            <span>Salaire brut</span>
            <span className="text-right">{formatEuros(bulletin.totalBrut)}</span>
            <span>Cotisations déductibles</span>
            <span className="text-right">-{formatEuros(bulletin.cotisationsSalarie)}</span>
            <span className="font-medium">Net imposable</span>
            <span className="text-right font-medium">{formatEuros(bulletin.netImposable)}</span>
            <span>CSG non déductible + CRDS</span>
            <span className="text-right">-{formatEuros(bulletin.csgNonDeductible)}</span>
            {mutuelle && cotisationMutuelleSalarie > 0 && (
              <>
                <span>Mutuelle ({mutuelle.formuleMutuelle.label})</span>
                <span className="text-right">-{formatEuros(cotisationMutuelleSalarie)}</span>
              </>
            )}
          </div>
          <div className="mt-3 flex items-baseline justify-between border-t border-white/30 pt-3">
            <span className="text-lg font-bold">NET À PAYER</span>
            <span className="text-2xl font-bold">
              {formatEuros(bulletin.netAPayer - cotisationMutuelleSalarie)}
            </span>
          </div>
          <p className="mt-2 text-xs opacity-70">
            Coût total employeur : {formatEuros(bulletin.totalBrut + bulletin.cotisationsPatronales + cotisationMutuellePatronale)}
          </p>
        </div>

        {bulletin.commentaires && (
          <p className="mb-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">{bulletin.commentaires}</p>
        )}

        <div className="border-t border-slate-100 pt-3 text-center text-[10px] text-slate-400">
          <p>
            {parametres?.nomEntreprise || "SDA Rénovation"} · {parametres?.adresse || "23 bis rue Aristide Berges"},{" "}
            {villeSociete || "31270 Cugnaux"} · SIRET {parametres?.siret || "988 681 672"}
          </p>
          <p>
            {CCN_LABELS[salarie.typeCcn as TypeCcn]} · Ce bulletin doit être conservé sans limitation de durée (art. D. 3243-3 du Code du travail).
          </p>
        </div>
      </div>

      {/* Formulaire d'édition */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 font-semibold text-brand-navy">Modifier le bulletin</h3>
        <BulletinEditor salarie={salarie} bulletin={bulletin} action={action} />
      </div>
    </div>
  );
}
