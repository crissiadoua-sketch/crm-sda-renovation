import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateTachesGantt } from "@/lib/actions/gantt";
import { GanttClient } from "@/components/chantiers/gantt-client";
import { couleurParDefaut } from "@/lib/intervenant-couleur";

export default async function ChantierPlanningPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [chantier, sousTraitants, salaries, interimaires] = await Promise.all([
    prisma.chantier.findUnique({
      where: { id },
      select: {
        id: true,
        nom: true,
        reference: true,
        dateDebut: true,
        tachesGantt: {
          orderBy: { ordre: "asc" },
          include: {
            precedePar: { select: { predecesseurId: true } },
          },
        },
        bonsLivraison: {
          where: { dateLivraison: { not: null } },
          select: {
            id: true,
            numero: true,
            statut: true,
            dateLivraison: true,
            fournisseur: { select: { nom: true } },
          },
          orderBy: { dateLivraison: "asc" },
        },
      },
    }),
    prisma.sousTraitant.findMany({ select: { id: true, nom: true, couleur: true }, orderBy: { nom: "asc" } }),
    prisma.salarie.findMany({
      where: { statutRH: "ACTIF" },
      select: { id: true, nom: true, prenom: true, couleur: true },
      orderBy: { nom: "asc" },
    }),
    prisma.interimaire.findMany({
      where: { actif: true },
      select: { id: true, nom: true, prenom: true, couleur: true },
      orderBy: { nom: "asc" },
    }),
  ]);

  if (!chantier) notFound();

  const intervenantsSousTraitant = sousTraitants.map((s) => ({ id: s.id, nom: s.nom, couleur: s.couleur ?? couleurParDefaut(s.id) }));
  const intervenantsSalarie = salaries.map((s) => ({ id: s.id, nom: `${s.prenom} ${s.nom}`, couleur: s.couleur ?? couleurParDefaut(s.id) }));
  const intervenantsInterimaire = interimaires.map((i) => ({ id: i.id, nom: `${i.prenom} ${i.nom}`, couleur: i.couleur ?? couleurParDefaut(i.id) }));

  const taches = chantier.tachesGantt.map((t) => ({
    id: t.id,
    nom: t.nom,
    duree: t.duree,
    dateDebut: t.dateDebut.toISOString(),
    avancement: t.avancement,
    statut: t.statut,
    priorite: t.priorite,
    corpsEtat: t.corpsEtat,
    ressource: t.ressource,
    intervenantType: t.intervenantType,
    intervenantId: t.intervenantId,
    notes: t.notes,
    predecesseurIds: t.precedePar.map((p) => p.predecesseurId),
  }));

  const livraisons = chantier.bonsLivraison.map((b) => ({
    id: b.id,
    numero: b.numero,
    statut: b.statut,
    dateLivraison: b.dateLivraison!.toISOString(),
    fournisseur: b.fournisseur.nom,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/chantiers/${chantier.id}`} className="text-sm text-brand-blue hover:underline">
          ← Retour au chantier
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-bold text-brand-navy">Planning prévisionnel — {chantier.nom}</h2>
          <Link
            href={`/apercu/planning-gantt/${chantier.id}`}
            target="_blank"
            className="text-sm text-brand-blue hover:underline"
          >
            Aperçu PDF →
          </Link>
        </div>
        <p className="mt-1 text-sm text-slate-500">{chantier.reference}</p>
      </div>

      <GanttClient
        chantierId={chantier.id}
        chantierDateDebut={chantier.dateDebut?.toISOString() ?? null}
        tachesInitiales={taches}
        livraisons={livraisons}
        sousTraitants={intervenantsSousTraitant}
        salaries={intervenantsSalarie}
        interimaires={intervenantsInterimaire}
        action={updateTachesGantt.bind(null, chantier.id)}
      />
    </div>
  );
}
