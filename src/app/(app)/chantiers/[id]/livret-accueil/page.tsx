import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { clientDisplayName } from "@/lib/format";
import { LivretAccueilForm } from "./livret-form";

export default async function LivretAccueilEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const chantier = await prisma.chantier.findUnique({
    where: { id },
    include: {
      client: true,
      livretAccueil: true,
      ordresMission: {
        where: { statut: { not: "ANNULE" } },
        include: { sousTraitant: true },
        orderBy: { createdAt: "asc" },
      },
      sousTraitants: { include: { sousTraitant: true } },
    },
  });

  if (!chantier) notFound();

  // Lots pré-remplis depuis les ordres de mission
  type Lot = { lot: string; nom: string; description: string; dtu: string };
  let lotsInitiaux: Lot[] = [];

  if (chantier.livretAccueil?.lotsJson) {
    try { lotsInitiaux = JSON.parse(chantier.livretAccueil.lotsJson) as Lot[]; } catch { /* noop */ }
  }

  if (lotsInitiaux.length === 0) {
    const seen = new Set<string>();
    let i = 1;
    for (const om of chantier.ordresMission) {
      if (!seen.has(om.sousTraitant.nom)) {
        seen.add(om.sousTraitant.nom);
        lotsInitiaux.push({
          lot: `Lot ${i++}`,
          nom: om.sousTraitant.specialite || om.sousTraitant.nom,
          description: om.titre,
          dtu: "",
        });
      }
    }
    if (lotsInitiaux.length === 0 && chantier.sousTraitants.length > 0) {
      chantier.sousTraitants.forEach((cs, idx) => {
        lotsInitiaux.push({
          lot: `Lot ${idx + 1}`,
          nom: cs.sousTraitant.specialite || cs.sousTraitant.nom,
          description: "",
          dtu: "",
        });
      });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link href={`/chantiers/${id}`} className="text-sm text-brand-blue hover:underline">
            ← {chantier.nom}
          </Link>
          <h2 className="mt-1 text-xl font-bold text-brand-navy">
            Livret d&apos;accueil — compléter les champs
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">{clientDisplayName(chantier.client)}</p>
        </div>
        <a
          href={`/apercu/livret-accueil/${id}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-[#1E2F6E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#29ABE2] transition"
        >
          👁 Aperçu / Imprimer
        </a>
      </div>

      <LivretAccueilForm
        chantierId={id}
        defaultValues={{
          chefChantierNom:     chantier.livretAccueil?.chefChantierNom ?? "",
          chefChantierContact: chantier.livretAccueil?.chefChantierContact ?? "",
          natureOuvrage:       chantier.livretAccueil?.natureOuvrage ?? chantier.description?.split("\n")[0] ?? "",
          descriptionChantier: chantier.livretAccueil?.descriptionChantier ?? chantier.description ?? "",
          horairesChantier:    chantier.livretAccueil?.horairesChantier ?? "",
          stationnementAcces:  chantier.livretAccueil?.stationnementAcces ?? "",
          remarqueVoisinage:   chantier.livretAccueil?.remarqueVoisinage ?? "",
          lotsJson:            JSON.stringify(lotsInitiaux),
        }}
        autoData={{
          natureOuvrage:       chantier.description?.split("\n")[0] ?? "",
          descriptionChantier: chantier.description ?? "",
          lotsFromOM:          chantier.ordresMission.map((om, i) => ({
            lot: `Lot ${i + 1}`,
            nom: om.sousTraitant.specialite || om.sousTraitant.nom,
            description: om.titre + (om.description ? ` — ${om.description}` : ""),
            dtu: "",
          })).filter((l, i, arr) => arr.findIndex((x) => x.nom === l.nom) === i),
        }}
      />
    </div>
  );
}
