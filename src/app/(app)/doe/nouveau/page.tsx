export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createDOE } from "@/lib/actions/doe";
import { SubmitButton } from "@/components/ui/submit-button";
import { Field, inputClasses } from "@/components/ui/fields";
import { buttonClasses } from "@/components/ui/button";

const INTRO_MARCHE_PUBLIC =
  "Le présent Dossier des Ouvrages Exécutés a été établi conformément aux prescriptions du marché. Il regroupe l'ensemble des documents permettant la maintenance et l'exploitation des ouvrages.";

const INTRO_PERSONNALISE =
  "Ce dossier récapitule l'ensemble des ouvrages réalisés dans le cadre des travaux effectués à votre domicile.";

export default async function NouveauDOEPage() {
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
        <Link href="/doe" className="text-sm text-brand-blue hover:underline">
          ← Retour aux DOE
        </Link>
        <h2 className="mt-2 text-xl font-bold text-brand-navy">Créer un DOE</h2>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <form action={createDOE} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Modèle" htmlFor="modele">
              <select
                id="modele"
                name="modele"
                defaultValue="PERSONNALISE"
                className={inputClasses}
              >
                <option value="PERSONNALISE">Personnalisé</option>
                <option value="MARCHE_PUBLIC">Marché public</option>
              </select>
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
          </div>

          <Field label="Titre *" htmlFor="titre">
            <input
              id="titre"
              name="titre"
              type="text"
              required
              placeholder="Ex. : DOE Rénovation complète villa"
              className={inputClasses}
            />
          </Field>

          <Field label="Référence du marché" htmlFor="reference">
            <input
              id="reference"
              name="reference"
              type="text"
              placeholder="Numéro ou référence du marché (pour marchés publics)"
              className={inputClasses}
            />
          </Field>

          <Field label="Devis signé (source)" htmlFor="devisId">
            <select
              id="devisId"
              name="devisId"
              defaultValue=""
              className={inputClasses}
            >
              <option value="">— Aucun —</option>
              {devis.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.numero}{d.objet ? ` — ${d.objet}` : ""}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-400">
              Sélectionner le devis signé pour remplir automatiquement les sections DOE à partir des chapitres.
            </p>
          </Field>

          <Field label="Introduction" htmlFor="intro">
            <textarea
              id="intro"
              name="intro"
              rows={4}
              defaultValue={INTRO_PERSONNALISE}
              className={inputClasses}
            />
            <p className="mt-1 text-xs text-slate-400">
              Texte d&apos;introduction du DOE. Modifié automatiquement selon le modèle choisi lors de la création.
            </p>
          </Field>

          <Field label="Conclusion" htmlFor="conclusion">
            <textarea
              id="conclusion"
              name="conclusion"
              rows={3}
              placeholder="Texte de conclusion du DOE (optionnel)…"
              className={inputClasses}
            />
          </Field>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <Link href="/doe" className={buttonClasses("secondary")}>
              Annuler
            </Link>
            <SubmitButton pendingLabel="Création…">Créer le DOE</SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}
