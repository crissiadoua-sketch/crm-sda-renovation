import { Logo } from "@/components/logo";
import { formatDate, clientDisplayName } from "@/lib/format";
import type { Client, Devis, Parametres } from "@/generated/prisma/client";

export function DevisEntete({
  devis,
  client,
  parametres,
}: {
  devis: Devis;
  client: Client;
  parametres: Parametres | null;
}) {
  const villeSociete = [parametres?.codePostal, parametres?.ville].filter(Boolean).join(" ");
  const villeClient = [client.codePostal, client.ville].filter(Boolean).join(" ");
  const contactClient =
    client.type === "ENTREPRISE" && client.raisonSociale
      ? `${client.civilite ? client.civilite + " " : ""}${client.prenom ? client.prenom + " " : ""}${client.nom}`.trim()
      : null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <Logo size="md" className="mb-2" />
          <p className="font-semibold text-brand-navy">{parametres?.nomEntreprise || "SDA Rénovation"}</p>
          {parametres?.adresse && <p className="text-sm text-slate-600">{parametres.adresse}</p>}
          {villeSociete && <p className="text-sm text-slate-600">{villeSociete}</p>}
          {parametres?.telephone && <p className="text-sm text-slate-600">Tél : {parametres.telephone}</p>}
          {parametres?.email && <p className="text-sm text-slate-600">Email : {parametres.email}</p>}
          {parametres?.siret && (
            <p className="mt-2 text-xs text-slate-400">SIRET/SIREN : {parametres.siret}</p>
          )}
          {parametres?.tvaIntracom && (
            <p className="text-xs text-slate-400">N° TVA intracommunautaire : {parametres.tvaIntracom}</p>
          )}
        </div>

        <div className="flex flex-col gap-1 sm:items-end sm:text-right">
          <h3 className="text-lg font-bold text-brand-navy">Devis n° {devis.numero}</h3>
          <p className="text-sm text-slate-500">Version {devis.version}</p>
          <p className="text-sm text-slate-500">Date d&apos;émission : {formatDate(devis.dateCreation)}</p>

          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Client</p>
            <p className="font-medium text-slate-700">{clientDisplayName(client)}</p>
            {contactClient && <p className="text-sm text-slate-500">{contactClient}</p>}
            {client.adresse && <p className="text-sm text-slate-500">{client.adresse}</p>}
            {villeClient && <p className="text-sm text-slate-500">{villeClient}</p>}
            {client.email && <p className="text-sm text-slate-500">{client.email}</p>}
            {client.telephone && <p className="text-sm text-slate-500">{client.telephone}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
