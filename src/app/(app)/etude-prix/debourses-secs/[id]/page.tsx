export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EdsEditor } from "./eds-editor";

export default async function EtudeDebourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [etude, chantiers, devis, ouvrages] = await Promise.all([
    prisma.etudeDebourse.findUnique({
      where: { id },
      include: {
        chantier: true,
        devis: true,
        postes: {
          include: { elements: { orderBy: { ordre: "asc" } } },
          orderBy: { ordre: "asc" },
        },
      },
    }),
    prisma.chantier.findMany({
      orderBy: { nom: "asc" },
      select: { id: true, nom: true, reference: true, clientId: true },
    }),
    prisma.devis.findMany({
      orderBy: { numero: "desc" },
      select: { id: true, numero: true, objet: true, chantierId: true },
    }),
    prisma.ouvrage.findMany({
      where: { actif: true },
      orderBy: { code: "asc" },
      select: {
        id: true,
        code: true,
        designation: true,
        unite: true,
        corpsEtat: true,
        sousDetailPrix: {
          include: { lignes: true },
        },
      },
    }),
  ]);

  if (!etude) notFound();

  return (
    <EdsEditor
      etude={{
        id: etude.id,
        numero: etude.numero,
        titre: etude.titre,
        chantierId: etude.chantierId,
        devisId: etude.devisId,
        responsable: etude.responsable,
        coeffK: etude.coeffK,
        notes: etude.notes,
        date: etude.date.toISOString().slice(0, 10),
        totalMateriauxHT: etude.totalMateriauxHT,
        totalMaterielHT: etude.totalMaterielHT,
        totalMOHT: etude.totalMOHT,
        totalDSHT: etude.totalDSHT,
        chantier: etude.chantier
          ? { id: etude.chantier.id, nom: etude.chantier.nom, reference: etude.chantier.reference, clientId: (etude.chantier as { clientId?: string | null }).clientId ?? null }
          : null,
        devis: etude.devis
          ? { id: etude.devis.id, numero: etude.devis.numero, objet: etude.devis.objet }
          : null,
        postes: etude.postes.map((p) => ({
          id: p.id,
          ordre: p.ordre,
          codeOuvrage: p.codeOuvrage,
          unite: p.unite,
          designation: p.designation,
          ouvrageId: p.ouvrageId,
          totalMateriauxHT: p.totalMateriauxHT,
          totalMaterielHT: p.totalMaterielHT,
          totalMOHT: p.totalMOHT,
          totalDSPoste: p.totalDSPoste,
          elements: p.elements.map((e) => ({
            id: e.id,
            ordre: e.ordre,
            designation: e.designation,
            unite: e.unite,
            quantite: e.quantite,
            prixUnitaire: e.prixUnitaire,
            montantMateriaux: e.montantMateriaux,
            montantMateriel: e.montantMateriel,
            montantMO: e.montantMO,
          })),
        })),
      }}
      chantiers={chantiers.map(c => ({ ...c, clientId: (c as { clientId?: string | null }).clientId ?? null }))}
      devisList={devis}
      ouvrages={ouvrages.map((o) => ({
        id: o.id,
        code: o.code,
        designation: o.designation,
        unite: o.unite,
        corpsEtat: o.corpsEtat,
        sousDetailPrix: o.sousDetailPrix
          ? {
              id: o.sousDetailPrix.id,
              lignes: o.sousDetailPrix.lignes.map((l) => ({
                id: l.id,
                ordre: l.ordre,
                nature: l.nature,
                designation: l.designation,
                unite: l.unite,
                quantite: l.quantite,
                prixUnitaireHT: l.prixUnitaireHT,
                totalHT: l.totalHT,
              })),
            }
          : null,
      }))}
    />
  );
}
