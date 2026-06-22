import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LinkButton } from "@/components/ui/button";
import { DeleteButton } from "@/components/ui/delete-button";
import { Field, inputClasses, selectClasses } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDate, formatDateTime, urlFichier } from "@/lib/format";
import {
  supprimerPreDimensionnement,
  ajouterDocumentPreDimensionnement,
  supprimerDocumentPreDimensionnement,
  analyserPlanIA,
} from "@/lib/actions/pre-dimensionnement";
import {
  TYPE_ELEMENT_LABELS,
  MATERIAU_LABELS,
  DOCUMENT_TYPE_LABELS,
  USAGE_DALLAGE_LABELS,
  PORTANCE_SOL_LABELS,
} from "@/lib/calcul-structurel/pre-dimensionnement";

export default async function PreDimensionnementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const pdim = await prisma.preDimensionnement.findUnique({
    where: { id },
    include: { chantier: { select: { reference: true, nom: true } }, documents: { orderBy: { createdAt: "desc" } } },
  });
  if (!pdim) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/etude-prix/pre-dimensionnement" className="text-sm text-brand-blue hover:underline">
            ← Retour à la liste
          </Link>
          <h2 className="mt-1 text-xl font-bold text-brand-navy">{pdim.numero}</h2>
          {pdim.titre && <p className="text-sm text-slate-500">{pdim.titre}</p>}
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/apercu/pre-dimensionnement/${pdim.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            🖨 Aperçu / PDF
          </a>
          <LinkButton href={`/etude-prix/pre-dimensionnement/${pdim.id}/modifier`} variant="secondary">
            Modifier
          </LinkButton>
          <DeleteButton
            action={supprimerPreDimensionnement.bind(null, pdim.id)}
            confirmMessage={`Supprimer le calcul "${pdim.numero}" et ses documents joints ?`}
          >
            Supprimer
          </DeleteButton>
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
        ⚠️ Brouillon — résultat indicatif de pré-dimensionnement. À contre-vérifier et faire contre-signer par un
        ingénieur structure indépendant avant tout usage réel (permis de construire, exécution).
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Résultat</p>
          <p className="mt-1 text-2xl font-bold text-brand-navy">{pdim.resultatLabel}</p>
          <p className="mt-2 text-xs text-slate-500">{pdim.formule}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Paramètres</p>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-slate-400">Élément</dt>
              <dd className="font-medium text-slate-700">{TYPE_ELEMENT_LABELS[pdim.typeElement as keyof typeof TYPE_ELEMENT_LABELS] ?? pdim.typeElement}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Matériau</dt>
              <dd className="font-medium text-slate-700">{MATERIAU_LABELS[pdim.materiau as keyof typeof MATERIAU_LABELS] ?? pdim.materiau}</dd>
            </div>
            {pdim.portee != null && (
              <div>
                <dt className="text-slate-400">Portée</dt>
                <dd className="font-medium text-slate-700">{pdim.portee} m</dd>
              </div>
            )}
            {pdim.usageDallage && (
              <div>
                <dt className="text-slate-400">Usage</dt>
                <dd className="font-medium text-slate-700">{USAGE_DALLAGE_LABELS[pdim.usageDallage as keyof typeof USAGE_DALLAGE_LABELS] ?? pdim.usageDallage}</dd>
              </div>
            )}
            {pdim.portanceSol && (
              <div>
                <dt className="text-slate-400">Sol support</dt>
                <dd className="font-medium text-slate-700">{PORTANCE_SOL_LABELS[pdim.portanceSol as keyof typeof PORTANCE_SOL_LABELS] ?? pdim.portanceSol}</dd>
              </div>
            )}
            {pdim.surface != null && (
              <div>
                <dt className="text-slate-400">Surface</dt>
                <dd className="font-medium text-slate-700">{pdim.surface} m²</dd>
              </div>
            )}
            {pdim.effortNormal != null && (
              <div>
                <dt className="text-slate-400">Effort normal Nu</dt>
                <dd className="font-medium text-slate-700">{pdim.effortNormal} kN</dd>
              </div>
            )}
            {pdim.chantier && (
              <div>
                <dt className="text-slate-400">Chantier</dt>
                <dd className="font-medium text-slate-700">{pdim.chantier.reference} — {pdim.chantier.nom}</dd>
              </div>
            )}
            {pdim.responsable && (
              <div>
                <dt className="text-slate-400">Responsable</dt>
                <dd className="font-medium text-slate-700">{pdim.responsable}</dd>
              </div>
            )}
            <div>
              <dt className="text-slate-400">Date</dt>
              <dd className="font-medium text-slate-700">{formatDate(pdim.createdAt)}</dd>
            </div>
          </dl>

          {pdim.hypotheses && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Hypothèses</p>
              <ul className="list-inside list-disc text-sm text-slate-600">
                {pdim.hypotheses.split("\n").map((h, i) => <li key={i}>{h}</li>)}
              </ul>
            </div>
          )}

          {pdim.notes && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Notes</p>
              <p className="text-sm text-slate-600">{pdim.notes}</p>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Documents joints (étude géotechnique G2 PRO, plans de niveau, plans de coupe…)
        </p>

        <form action={ajouterDocumentPreDimensionnement.bind(null, pdim.id)} encType="multipart/form-data" className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Field label="Type de document" htmlFor="type" className="sm:col-span-2">
            <select id="type" name="type" defaultValue="GEOTECHNIQUE_G2PRO" className={selectClasses}>
              {Object.entries(DOCUMENT_TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </Field>
          <Field label="Fichier" htmlFor="fichier" className="sm:col-span-1">
            <input id="fichier" name="fichier" type="file" required className={inputClasses} />
          </Field>
          <div className="flex items-end sm:col-span-1">
            <SubmitButton pendingLabel="Envoi…" className="w-full">Ajouter</SubmitButton>
          </div>
        </form>

        {pdim.documents.length === 0 ? (
          <p className="text-sm text-slate-400">Aucun document joint.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {pdim.documents.map((doc) => (
              <li key={doc.id} className="py-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {DOCUMENT_TYPE_LABELS[doc.type] ?? doc.type}
                    </span>
                    <a href={urlFichier(doc.url)} target="_blank" rel="noopener noreferrer" download={doc.nom} className="ml-2 text-brand-blue hover:underline">
                      {doc.nom}
                    </a>
                    <span className="ml-2 text-xs text-slate-400">{Math.round(doc.taille / 1024)} Ko</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <form action={analyserPlanIA.bind(null, doc.id)}>
                      <SubmitButton variant="secondary" pendingLabel="Analyse…" className="!px-3 !py-1 !text-xs">
                        {doc.analyseIA ? "Ré-analyser avec l'IA" : "Analyser avec l'IA"}
                      </SubmitButton>
                    </form>
                    <DeleteButton
                      action={supprimerDocumentPreDimensionnement.bind(null, doc.id)}
                      confirmMessage={`Supprimer le document "${doc.nom}" ?`}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Supprimer
                    </DeleteButton>
                  </div>
                </div>
                {doc.analyseIA && (
                  <div className="mt-2 rounded-lg border border-brand-blue/20 bg-brand-blue/5 px-3 py-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-blue">
                      Lecture automatique par IA{doc.analyseIADate ? ` — ${formatDateTime(doc.analyseIADate)}` : ""}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-xs text-slate-600">{doc.analyseIA}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
