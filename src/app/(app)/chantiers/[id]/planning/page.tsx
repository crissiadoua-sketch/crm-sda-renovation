export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateTachesGantt } from "@/lib/actions/gantt";
import { GanttClient } from "@/components/chantiers/gantt-client";
import { couleurParDefaut } from "@/lib/intervenant-couleur";
import { estDelaiLivraisonEleve } from "@/lib/delai-livraison";
import { EnvoyerEmailModal } from "@/components/ui/envoyer-email-modal";
import { envoyerPlanningGanttParEmail } from "@/lib/actions/email-documents";

export default async function ChantierPlanningPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [chantier, sousTraitants, salaries, interimaires, bonsCommande, bonsCommandeBeton, approvisionements, locations, mouvementsStock] = await Promise.all([
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
    prisma.bonCommande.findMany({
      where: { chantierId: id },
      select: { id: true, numero: true, statut: true, dateCreation: true, fournisseur: { select: { nom: true } } },
    }),
    prisma.bonCommandeBeton.findMany({
      where: { chantierId: id },
      select: { id: true, numero: true, dateLivraison: true, createdAt: true, qteTotale: true, fournisseur: { select: { nom: true } } },
    }),
    prisma.approvisionementChantier.findMany({
      where: { chantierId: id },
      select: { id: true, numero: true, titre: true, date: true },
    }),
    prisma.fraisChantierLigne.findMany({
      where: { categorie: "LOCATION", date: { not: null }, frais: { chantierId: id } },
      select: { id: true, designation: true, fournisseur: true, date: true, dateFin: true },
    }),
    prisma.mouvementStock.findMany({
      where: { chantierId: id, type: "SORTIE" },
      select: {
        id: true,
        date: true,
        quantite: true,
        article: { select: { designation: true, unite: true, emplacement: true, delaiLivraisonJours: true } },
      },
    }),
  ]);

  if (!chantier) notFound();

  const reperes = [
    ...chantier.bonsLivraison.map((b) => ({
      id: `LIV-${b.id}`,
      type: "LIVRAISON" as const,
      label: `BL ${b.numero} — ${b.fournisseur.nom} (${b.statut})`,
      date: b.dateLivraison!.toISOString(),
    })),
    ...bonsCommande.map((b) => ({
      id: `BC-${b.id}`,
      type: "BON_COMMANDE" as const,
      label: `BC ${b.numero} — ${b.fournisseur.nom} (${b.statut})`,
      date: b.dateCreation.toISOString(),
    })),
    ...bonsCommandeBeton.map((b) => ({
      id: `BCB-${b.id}`,
      type: "BON_COMMANDE_BETON" as const,
      label: `BCB ${b.numero} — ${b.fournisseur.nom} (${b.qteTotale} m³)`,
      date: (b.dateLivraison ?? b.createdAt).toISOString(),
    })),
    ...approvisionements.map((a) => ({
      id: `APP-${a.id}`,
      type: "APPROVISIONNEMENT" as const,
      label: `Appro ${a.numero}${a.titre ? ` — ${a.titre}` : ""}`,
      date: a.date.toISOString(),
    })),
    ...locations.map((l) => ({
      id: `LOC-${l.id}`,
      type: "LOCATION" as const,
      label: `${l.designation}${l.fournisseur ? ` — ${l.fournisseur}` : ""}`,
      date: l.date!.toISOString(),
      dateFin: l.dateFin?.toISOString() ?? null,
    })),
    ...mouvementsStock.map((m) => ({
      id: `STK-${m.id}`,
      type: "MOUVEMENT_STOCK" as const,
      label: `${m.article.designation} → chantier (${m.quantite} ${m.article.unite}, depuis ${m.article.emplacement})`,
      date: m.date.toISOString(),
      delaiEleve: estDelaiLivraisonEleve(m.article.delaiLivraisonJours),
    })),
  ];

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
    dateDebutReelle: t.dateDebutReelle?.toISOString() ?? null,
    dateFinReelle: t.dateFinReelle?.toISOString() ?? null,
    notes: t.notes,
    predecesseurIds: t.precedePar.map((p) => p.predecesseurId),
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
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <p className="text-sm text-slate-500">{chantier.reference}</p>
          <EnvoyerEmailModal
            action={envoyerPlanningGanttParEmail.bind(null, chantier.id)}
            defaultTo=""
            documentLabel={`Planning ${chantier.nom}`}
          />
        </div>
      </div>

      <GanttClient
        chantierId={chantier.id}
        chantierDateDebut={chantier.dateDebut?.toISOString() ?? null}
        tachesInitiales={taches}
        reperes={reperes}
        sousTraitants={intervenantsSousTraitant}
        salaries={intervenantsSalarie}
        interimaires={intervenantsInterimaire}
        action={updateTachesGantt.bind(null, chantier.id)}
      />
    </div>
  );
}
