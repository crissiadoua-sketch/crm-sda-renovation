export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createPPSPS } from "@/lib/actions/ppsps";
import { SubmitButton } from "@/components/ui/submit-button";
import { Field, inputClasses } from "@/components/ui/fields";
import { buttonClasses } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

export default async function NouveauPPSPSPage() {
  const [chantiers, devis] = await Promise.all([
    prisma.chantier.findMany({
      where: { statut: { not: "ANNULE" } },
      select: { id: true, nom: true, reference: true },
      orderBy: { nom: "asc" },
    }),
    prisma.devis.findMany({
      where: { statut: "ACCEPTE" },
      select: { id: true, numero: true, objet: true, chantierId: true },
      orderBy: { numero: "asc" },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/ppsps" className="text-sm text-brand-blue hover:underline">
          ← Retour aux PPSPS
        </Link>
        <h2 className="mt-2 text-xl font-bold text-brand-navy">Créer un PPSPS</h2>
        <p className="mt-1 text-sm text-slate-500">
          Plan Particulier de Sécurité et de Protection de la Santé
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <form action={createPPSPS} className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* ── Colonne 1 — Identification ── */}
            <div className="flex flex-col gap-4">
              <h3 className="text-base font-semibold text-brand-navy border-b border-slate-100 pb-2">
                Identification
              </h3>

              <Field label="Modèle" htmlFor="modele">
                <select id="modele" name="modele" defaultValue="PERSONNALISE" className={inputClasses}>
                  <option value="PERSONNALISE">Personnalisé (clients particuliers)</option>
                  <option value="APPEL_OFFRE">Appel d&apos;offres (marchés publics/privés)</option>
                </select>
              </Field>

              <Field label="Titre *" htmlFor="titre">
                <input
                  id="titre"
                  name="titre"
                  type="text"
                  required
                  placeholder="Ex. : PPSPS Rénovation bâtiment A"
                  className={inputClasses}
                />
              </Field>

              <Field label="Référence du marché / opération" htmlFor="reference">
                <input
                  id="reference"
                  name="reference"
                  type="text"
                  placeholder="Ex. : 2026-AO-0142"
                  className={inputClasses}
                />
              </Field>

              <Field label="Nom de l'opération" htmlFor="nomOperation">
                <input
                  id="nomOperation"
                  name="nomOperation"
                  type="text"
                  placeholder="Nom ou intitulé de l'opération de travaux"
                  className={inputClasses}
                />
              </Field>

              <Field label="Chantier *" htmlFor="chantierId">
                <select
                  id="chantierId"
                  name="chantierId"
                  required
                  defaultValue=""
                  className={inputClasses}
                >
                  <option value="" disabled>
                    Sélectionner un chantier…
                  </option>
                  {chantiers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.reference} — {c.nom}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Devis associé (optionnel)" htmlFor="devisId">
                <select id="devisId" name="devisId" defaultValue="" className={inputClasses}>
                  <option value="">— Aucun —</option>
                  {devis.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.numero}
                      {d.objet ? ` — ${d.objet}` : ""}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {/* ── Colonne 2 — Chantier & parties ── */}
            <div className="flex flex-col gap-4">
              <h3 className="text-base font-semibold text-brand-navy border-b border-slate-100 pb-2">
                Chantier &amp; parties prenantes
              </h3>

              <Field label="Adresse du chantier" htmlFor="adresseChantier">
                <textarea
                  id="adresseChantier"
                  name="adresseChantier"
                  rows={2}
                  placeholder="Adresse complète du chantier"
                  className={inputClasses}
                />
              </Field>

              <Field label="Maître d'ouvrage" htmlFor="maitreOuvrage">
                <input
                  id="maitreOuvrage"
                  name="maitreOuvrage"
                  type="text"
                  placeholder="Nom du maître d'ouvrage"
                  className={inputClasses}
                />
              </Field>

              <Field label="Maître d'œuvre" htmlFor="maitreOeuvre">
                <input
                  id="maitreOeuvre"
                  name="maitreOeuvre"
                  type="text"
                  placeholder="Nom du maître d'œuvre / bureau d'études"
                  className={inputClasses}
                />
              </Field>

              <Field label="Coordonnateur SPS" htmlFor="coordonateurSPS">
                <input
                  id="coordonateurSPS"
                  name="coordonateurSPS"
                  type="text"
                  placeholder="Nom du coordonnateur SPS"
                  className={inputClasses}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Date de début" htmlFor="dateDebutChantier">
                  <input
                    id="dateDebutChantier"
                    name="dateDebutChantier"
                    type="date"
                    className={inputClasses}
                  />
                </Field>
                <Field label="Date de fin" htmlFor="dateFinChantier">
                  <input
                    id="dateFinChantier"
                    name="dateFinChantier"
                    type="date"
                    className={inputClasses}
                  />
                </Field>
              </div>

              <Field label="Effectif prévu (personnes)" htmlFor="effectifPrevu">
                <input
                  id="effectifPrevu"
                  name="effectifPrevu"
                  type="number"
                  min="1"
                  placeholder="Ex. : 12"
                  className={inputClasses}
                />
              </Field>

              <Field label="N° police assurance décennale SDA" htmlFor="assuranceDecennale">
                <input
                  id="assuranceDecennale"
                  name="assuranceDecennale"
                  type="text"
                  placeholder="Numéro de police décennale"
                  className={inputClasses}
                />
              </Field>

              <Field label="N° RC pro SDA" htmlFor="assuranceRC">
                <input
                  id="assuranceRC"
                  name="assuranceRC"
                  type="text"
                  placeholder="Numéro de RC professionnelle"
                  className={inputClasses}
                />
              </Field>
            </div>
          </div>

          {/* APPEL_OFFRE info box */}
          <div className="flex items-start gap-3 rounded-lg border border-brand-blue/20 bg-brand-blue/5 px-4 py-3 text-sm text-brand-blue-dark">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-brand-blue" />
            <p>
              Le modèle <strong>Appel d&apos;offres</strong> génère automatiquement l&apos;analyse
              de risques standard et les contacts de secours conformément au décret n°94-1159.
              Vous pourrez personnaliser chaque section après la création.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <Link href="/ppsps" className={buttonClasses("secondary")}>
              Annuler
            </Link>
            <SubmitButton pendingLabel="Création…">Créer le PPSPS</SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}
