export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, FileDown } from "lucide-react";
import { EtatReservesForm } from "@/components/etats-reserves/etat-form";
import { updateEtatReserves, deleteEtatReserves } from "@/lib/actions/etats-reserves";
import { DeleteButton } from "@/components/ui/delete-button";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Logo } from "@/components/logo";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { EnvoyerEmailModal } from "@/components/ui/envoyer-email-modal";
import { envoyerEtatReservesParEmail } from "@/lib/actions/email-documents";

const statutTones: Record<string, BadgeTone> = {
  EN_COURS: "gray",
  SIGNE: "blue",
  LEVE: "green",
};

const statutLabels: Record<string, string> = {
  EN_COURS: "En cours",
  SIGNE: "Signé",
  LEVE: "Réserves levées",
};

export default async function EtatReservesDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [etat, chantiers, clients, parametres] = await Promise.all([
    prisma.etatReserves.findUnique({ where: { id }, include: { chantier: true, client: true } }),
    prisma.chantier.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.client.findMany({ orderBy: { nom: "asc" } }),
    prisma.parametres.findUnique({ where: { id: "default" } }),
  ]);

  if (!etat) notFound();

  const villeSociete = [parametres?.codePostal, parametres?.ville].filter(Boolean).join(" ");
  const clientNom = etat.client
    ? etat.client.type === "ENTREPRISE"
      ? etat.client.raisonSociale ?? etat.client.nom
      : `${etat.client.prenom ?? ""} ${etat.client.nom}`.trim()
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/etats-reserves" className="text-sm text-brand-blue hover:underline">
            ← Retour aux états des réserves
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h2 className="font-mono text-xl font-bold text-brand-navy">{etat.numero}</h2>
            <Badge tone={statutTones[etat.statut] ?? "gray"}>
              {statutLabels[etat.statut] ?? etat.statut}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {formatDate(etat.dateDocument)}
            {etat.chantier && (
              <>
                {" · "}
                <Link href={`/chantiers/${etat.chantier.id}`} className="text-brand-blue hover:underline">
                  {etat.chantier.reference} — {etat.chantier.nom}
                </Link>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <EnvoyerEmailModal
            action={envoyerEtatReservesParEmail.bind(null, etat.id)}
            defaultTo={etat.client?.email ?? ""}
            documentLabel={`État des réserves ${etat.numero}`}
          defaultSubject={`État des réserves ${etat.numero} — SDA Rénovation`}
          />
          <a
            href={`/apercu/etat-reserves/${etat.id}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <FileText className="h-4 w-4 text-red-500" />
            PDF
          </a>
          <a
            href={`/api/etats-reserves/${etat.id}/word`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <FileDown className="h-4 w-4 text-blue-600" />
            Word
          </a>
          <DeleteButton
            action={deleteEtatReserves.bind(null, etat.id)}
            confirmMessage={`Supprimer l'état des réserves ${etat.numero} ? Cette action est irréversible.`}
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm print:shadow-none">
        <div className="mb-6 flex items-start justify-between">
          <Logo size="md" />
          <div className="text-right text-sm text-slate-500">
            <p>{parametres?.adresse || "23 bis rue Aristide Berges"}</p>
            <p>{villeSociete || "31270 Cugnaux"}</p>
            <p>{parametres?.telephone || "06.25.43.64.54"}</p>
            <p>{parametres?.email || "contact@sda-renovation.com"}{parametres?.emailPersonnalise ? <><br />{parametres.emailPersonnalise}</> : ""}</p>
            {parametres?.siret && <p>Siren : {parametres.siret}</p>}
            {parametres?.tvaIntracom && <p>TVA : {parametres.tvaIntracom}</p>}
          </div>
        </div>

        <h3 className="mb-6 text-center text-xl font-bold uppercase tracking-wider text-brand-navy">
          État des réserves
        </h3>

        <div className="mb-6">
          <p className="mb-2 font-semibold text-slate-700">Nature des réserves :</p>
          <div className="min-h-32 whitespace-pre-wrap rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            {etat.natureReserves || <span className="text-slate-300 italic">Non renseigné</span>}
          </div>
        </div>

        <div className="mb-6">
          <p className="mb-2 font-semibold text-slate-700">Travaux à exécuter :</p>
          <div className="min-h-32 whitespace-pre-wrap rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            {etat.travauxAExecuter || <span className="text-slate-300 italic">Non renseigné</span>}
          </div>
        </div>

        {etat.delaiExecution && (
          <p className="mb-4 text-sm text-slate-600">
            L&apos;entreprise et le maître d&apos;ouvrage conviennent que les travaux nécessités par les réserves
            ci-dessus seront exécutés dans un délai global de{" "}
            <strong>{etat.delaiExecution}</strong> à compter de ce jour.
          </p>
        )}

        <div className="mb-8 text-sm text-slate-600">
          <p>
            Fait à <strong>{etat.lieuSignature || "……………………"}</strong> le{" "}
            <strong>{formatDate(etat.dateDocument)}</strong>
          </p>
          <p>En {etat.nombreExemplaires} exemplaires, dont un est remis à chacune des parties.</p>
        </div>

        <div className="mb-10 grid grid-cols-3 gap-6 text-sm">
          {["Signature de l'entreprise", "Signature du maître d'ouvrage", "Signature Locataire"].map((label) => (
            <div key={label}>
              <p className="mb-10 font-medium text-slate-600">{label} :</p>
              <div className="border-b border-slate-300" />
            </div>
          ))}
        </div>

        {(etat.statut === "SIGNE" || etat.statut === "LEVE") && (
          <>
            <hr className="my-8 border-slate-200" />
            <h3 className="mb-4 text-center text-xl font-bold uppercase tracking-wider text-brand-navy">
              Constat de levée de réserves
            </h3>
            <p className="mb-4 text-sm text-slate-600">
              Le maître d&apos;ouvrage{clientNom ? ` ${clientNom}` : ""} lève les réserves, après avoir constaté que
              l&apos;entreprise exécutante a valablement remédié aux malfaçons, omissions et imperfections
              ci-dessus énoncées.
            </p>
            {etat.dateLevee && (
              <div className="mb-8 text-sm text-slate-600">
                <p>
                  Fait à <strong>{etat.lieuLevee || "……………………"}</strong> le{" "}
                  <strong>{formatDate(etat.dateLevee)}</strong>
                </p>
                <p>En {etat.nombreExemplaires} exemplaires, dont un est remis à chacune des parties.</p>
              </div>
            )}
            <div className="grid grid-cols-3 gap-6 text-sm">
              {["Signature de l'entreprise", "Signature du maître d'ouvrage", "Signature Locataire"].map((label) => (
                <div key={label}>
                  <p className="mb-10 font-medium text-slate-600">{label} :</p>
                  <div className="border-b border-slate-300" />
                </div>
              ))}
            </div>
          </>
        )}

        <div className="mt-8 border-t border-slate-100 pt-4 text-center text-xs text-slate-400">
          <p>
            {parametres?.adresse || "23 bis rue Aristide Berges"} · {villeSociete || "31270 Cugnaux"} ·{" "}
            {parametres?.telephone || "06.25.43.64.54"} · {parametres?.email || "contact@sda-renovation.com"}{parametres?.emailPersonnalise ? ` · ${parametres.emailPersonnalise}` : ""}
          </p>
          {parametres?.siret && <p>Siren : {parametres.siret} · TVA : {parametres?.tvaIntracom}</p>}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 font-semibold text-brand-navy">Modifier le document</h3>
        <EtatReservesForm
          etat={etat}
          chantiers={chantiers}
          clients={clients}
          action={updateEtatReserves.bind(null, etat.id)}
        />
      </div>
    </div>
  );
}
