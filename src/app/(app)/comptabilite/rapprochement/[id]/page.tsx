export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DeleteButton } from "@/components/ui/delete-button";
import { formatDate, formatEuros, clientDisplayName } from "@/lib/format";
import { proposerCorrespondance, type CibleRapprochement } from "@/lib/rapprochement";
import {
  validerCorrespondance,
  annulerCorrespondance,
  ignorerLigne,
  supprimerReleve,
  rapprochementerFacture,
} from "@/lib/actions/rapprochement";
import { rapprochementerFactureFournisseur } from "@/lib/actions/factures-fournisseur";
import { LigneActions } from "./ligne-actions";
import { FullscreenToggle } from "@/components/ui/fullscreen-toggle";

export default async function RapprochementDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ auto?: string; total?: string }>;
}) {
  const { id } = await params;
  const { auto: autoParam, total: totalParam } = await searchParams;
  const autoRapproches = autoParam !== undefined ? parseInt(autoParam) : null;

  const releve = await prisma.releveBancaire.findUnique({
    where: { id },
    include: {
      lignes: {
        orderBy: { date: "asc" },
        include: {
          paiement: { include: { facture: { include: { client: true } } } },
          depense: { include: { fournisseur: true } },
          factureFournisseur: { include: { fournisseur: { select: { nom: true } } } },
        },
      },
    },
  });
  if (!releve) notFound();

  // Bornes larges autour des dates du relevé pour proposer des candidats pertinents
  const dates = releve.lignes.map((l) => l.date.getTime());
  const debut = dates.length > 0 ? new Date(Math.min(...dates) - 30 * 86400000) : new Date(0);
  const fin = dates.length > 0 ? new Date(Math.max(...dates) + 30 * 86400000) : new Date();

  const [paiementsDisponibles, depensesDisponibles, facturesDisponibles, facturesFournisseurDisponibles] = await Promise.all([
    prisma.paiement.findMany({
      where: { date: { gte: debut, lte: fin }, ligneReleve: null },
      include: { facture: { include: { client: true } } },
      orderBy: { date: "desc" },
    }),
    prisma.depense.findMany({
      where: { date: { gte: debut, lte: fin }, ligneReleve: null },
      include: { fournisseur: true },
      orderBy: { date: "desc" },
    }),
    prisma.facture.findMany({
      where: {
        statut: { notIn: ["BROUILLON", "ANNULEE", "PAYEE"] },
      },
      include: { client: true },
      orderBy: { dateEmission: "desc" },
    }),
    prisma.factureFournisseur.findMany({
      where: { statut: { in: ["A_PAYER", "PAYEE_PARTIELLE", "EN_RETARD"] }, ligneReleve: null },
      include: { fournisseur: { select: { nom: true } } },
      orderBy: { dateEcheance: "asc" },
    }),
  ]);

  const cibleSPaiements: CibleRapprochement[] = paiementsDisponibles.map((p) => ({
    id: p.id,
    montant: p.montant,
    date: p.date,
    label: `${formatEuros(p.montant)} — Facture ${p.facture.numero} (${clientDisplayName(p.facture.client)})`,
  }));
  const ciblesDepenses: CibleRapprochement[] = depensesDisponibles.map((d) => ({
    id: d.id,
    montant: -d.montant,
    date: d.date,
    label: `${formatEuros(d.montant)} — ${d.libelle}${d.fournisseur ? ` (${d.fournisseur.nom})` : ""}`,
  }));

  const facturesCandidats = facturesDisponibles.map((f) => ({
    id: f.id,
    label: `${f.numero} — ${clientDisplayName(f.client)} — ${formatEuros(f.totalTTC - f.montantPaye)} restant`,
  }));

  const facturesFournisseurCandidats = facturesFournisseurDisponibles.map((f) => ({
    id: f.id,
    label: `${f.numero} — ${f.fournisseur.nom} — ${formatEuros(f.montantTTC - f.montantPaye)} restant`,
  }));

  const nbRapprochees = releve.lignes.filter((l) => l.statut === "RAPPROCHE").length;
  const nbIgnorees = releve.lignes.filter((l) => l.statut === "IGNORE").length;

  const totalParam2 = totalParam !== undefined ? parseInt(totalParam) : null;

  const totalDebits = releve.lignes
    .filter((l) => l.montant < 0)
    .reduce((s, l) => s + Math.abs(l.montant), 0);
  const totalCredits = releve.lignes
    .filter((l) => l.montant > 0)
    .reduce((s, l) => s + l.montant, 0);

  return (
    <div className="flex flex-col gap-6">

      {autoRapproches !== null && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${
          autoRapproches > 0
            ? "border-green-200 bg-green-50 text-green-800"
            : "border-blue-200 bg-blue-50 text-blue-800"
        }`}>
          {autoRapproches > 0 ? (
            <>
              <span className="font-semibold">Auto-rapprochement terminé :</span>{" "}
              {autoRapproches} transaction{autoRapproches > 1 ? "s ont été rapprochées" : " a été rapprochée"} automatiquement
              {totalParam2 !== null && autoRapproches < totalParam2 && (
                <> · <span className="font-semibold">{totalParam2 - autoRapproches} en attente</span> de traitement manuel ci-dessous</>
              )}.
            </>
          ) : (
            <>
              <span className="font-semibold">Import terminé :</span>{" "}
              {totalParam2 ?? releve.lignes.length} transaction{(totalParam2 ?? releve.lignes.length) > 1 ? "s importées" : " importée"} — aucune correspondance exacte trouvée automatiquement.
              Traitez les lignes ci-dessous manuellement.
            </>
          )}
        </div>
      )}

      <div className="flex items-start justify-between">
        <div>
          <Link href="/comptabilite/rapprochement" className="text-sm text-brand-blue hover:underline">
            ← Retour aux relevés
          </Link>
          <h2 className="mt-1 text-xl font-bold text-brand-navy">{releve.nom}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {releve.banque ? `${releve.banque} · ` : ""}Importé le {formatDate(releve.dateImport)} ·{" "}
            {nbRapprochees} / {releve.lignes.length} rapprochée(s){nbIgnorees > 0 ? ` · ${nbIgnorees} ignorée(s)` : ""}
          </p>
        </div>
        <DeleteButton action={supprimerReleve.bind(null, releve.id)} confirmMessage={`Supprimer le relevé "${releve.nom}" et toutes ses lignes ?`}>
          Supprimer le relevé
        </DeleteButton>
      </div>

      {/* ── Relevé bancaire : vue identique au document original ── */}
      <FullscreenToggle>
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-slate-700">Relevé bancaire — détail ligne par ligne</h3>
          {(releve.soldeDebut != null || releve.soldeFin != null) && (
            <div className="flex gap-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm">
              {releve.soldeDebut != null && (
                <span className="text-slate-600">
                  Solde début : <strong className="text-brand-navy">{formatEuros(releve.soldeDebut)}</strong>
                </span>
              )}
              {releve.soldeFin != null && (
                <span className="text-slate-600">
                  Solde fin : <strong className="text-brand-navy">{formatEuros(releve.soldeFin)}</strong>
                </span>
              )}
            </div>
          )}
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 whitespace-nowrap">Date opé</th>
                  <th className="px-4 py-3">Libellé</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Débit (−)</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Crédit (+)</th>
                  <th className="px-4 py-3 text-center">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {releve.lignes.map((ligne) => (
                  <tr key={ligne.id} className={ligne.statut === "IGNORE" ? "opacity-40" : "hover:bg-slate-50/60"}>
                    <td className="px-4 py-2.5 whitespace-nowrap text-xs text-slate-500">{formatDate(ligne.date)}</td>
                    <td className="px-4 py-2.5 text-slate-700 max-w-xs">{ligne.libelle || "—"}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-red-600 whitespace-nowrap">
                      {ligne.montant < 0 ? formatEuros(Math.abs(ligne.montant)) : ""}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-green-600 whitespace-nowrap">
                      {ligne.montant > 0 ? formatEuros(ligne.montant) : ""}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {ligne.statut === "RAPPROCHE" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                          ✓ Rapprochée
                        </span>
                      ) : ligne.statut === "IGNORE" ? (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                          Ignorée
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                          En attente
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {releve.lignes.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      Aucune ligne dans ce relevé.
                    </td>
                  </tr>
                )}
              </tbody>
              {releve.lignes.length > 0 && (
                <tfoot className="border-t-2 border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700">
                  <tr>
                    <td className="px-4 py-2.5" colSpan={2}>Total</td>
                    <td className="px-4 py-2.5 text-right text-red-700">{formatEuros(totalDebits)}</td>
                    <td className="px-4 py-2.5 text-right text-green-700">{formatEuros(totalCredits)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </FullscreenToggle>

      {/* ── Rapprochement interactif ── */}
      <FullscreenToggle>
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-slate-700">Rapprochement</h3>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Libellé</th>
                  <th className="px-4 py-3 text-right">Montant</th>
                  <th className="px-4 py-3">Correspondance</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {releve.lignes.map((ligne) => {
                  const estCredit = ligne.montant > 0;
                  const type = estCredit ? "PAIEMENT" : "DEPENSE";
                  const candidats = estCredit ? cibleSPaiements : ciblesDepenses;
                  const suggestion =
                    ligne.statut === "NON_RAPPROCHE"
                      ? proposerCorrespondance({ montant: ligne.montant, date: ligne.date }, candidats)
                      : null;

                  return (
                    <tr key={ligne.id} className={ligne.statut === "IGNORE" ? "opacity-50" : ""}>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500">{formatDate(ligne.date)}</td>
                      <td className="px-4 py-3 text-slate-700">{ligne.libelle || "—"}</td>
                      <td className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${estCredit ? "text-green-600" : "text-red-600"}`}>
                        {estCredit ? "+" : ""}{formatEuros(ligne.montant)}
                      </td>
                      <td className="px-4 py-3">
                        {ligne.statut === "RAPPROCHE" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                            ✓ {ligne.paiement
                              ? `Facture ${ligne.paiement.facture.numero} (${clientDisplayName(ligne.paiement.facture.client)})`
                              : ligne.depense
                                ? ligne.depense.libelle
                                : ligne.factureFournisseur
                                  ? `Fact. fourn. ${ligne.factureFournisseur.numero} — ${ligne.factureFournisseur.fournisseur.nom}`
                                  : "Rapprochée"}
                          </span>
                        ) : ligne.statut === "IGNORE" ? (
                          <span className="text-xs text-slate-400">Ignorée</span>
                        ) : (
                          <LigneActions
                            ligneId={ligne.id}
                            type={type}
                            candidats={candidats.map((c) => ({ id: c.id, label: c.label }))}
                            suggestionId={suggestion?.cible.id}
                            confiance={suggestion?.confiance}
                            validerAction={validerCorrespondance.bind(null, ligne.id, type)}
                            factures={estCredit ? facturesCandidats : undefined}
                            rapprochementerFactureAction={estCredit ? rapprochementerFacture.bind(null, ligne.id) : undefined}
                            facturesFournisseur={!estCredit ? facturesFournisseurCandidats : undefined}
                            rapprochementerFactureFournisseurAction={!estCredit ? rapprochementerFactureFournisseur.bind(null, ligne.id) : undefined}
                          />
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {ligne.statut === "RAPPROCHE" ? (
                          <form action={annulerCorrespondance.bind(null, ligne.id)}>
                            <button type="submit" className="text-xs text-slate-400 hover:text-slate-600">Annuler</button>
                          </form>
                        ) : ligne.statut === "IGNORE" ? (
                          <form action={annulerCorrespondance.bind(null, ligne.id)}>
                            <button type="submit" className="text-xs text-brand-blue hover:underline">Réactiver</button>
                          </form>
                        ) : (
                          <form action={ignorerLigne.bind(null, ligne.id)}>
                            <button type="submit" className="text-xs text-slate-400 hover:text-slate-600">Ignorer</button>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {releve.lignes.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">Aucune ligne dans ce relevé.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </FullscreenToggle>
    </div>
  );
}
