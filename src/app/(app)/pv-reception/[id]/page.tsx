import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/dal";
import { PvReceptionEditor } from "./pv-editor";

export default async function PvReceptionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [user, pvr, fournisseurs, chantiers, clients] = await Promise.all([
    getUser(),
    prisma.pvReception.findUnique({
      where: { id },
      include: {
        fournisseur: { select: { id: true, nom: true, siret: true, adresse: true, codePostal: true, ville: true, telephone: true, email: true } },
        chantier:    { select: { id: true, nom: true, adresse: true, reference: true } },
        client:      { select: { id: true, nom: true, prenom: true, raisonSociale: true, adresse: true, codePostal: true, ville: true, telephone: true, email: true, siret: true } },
        lignes:      { orderBy: { ordre: "asc" } },
        reserves:    { orderBy: { ordre: "asc" } },
      },
    }),
    prisma.fournisseur.findMany({
      orderBy: { nom: "asc" },
      select: { id: true, nom: true, email: true, telephone: true, contact: true },
    }),
    prisma.chantier.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, nom: true, adresse: true } }),
    prisma.client.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true, raisonSociale: true } }),
  ]);

  if (!pvr) notFound();

  const toDateStr = (d: Date | null) => d?.toISOString().slice(0, 10) ?? null;

  const ROLE_LABELS: Record<string, string> = {
    DIRIGEANT: "Dirigeant",
    CONDUCTEUR_TRAVAUX: "Conducteur de travaux",
    RESPONSABLE_COMMERCIAL: "Responsable commercial",
    ASSISTANT_DIRECTION: "Assistante de Direction",
    ADMIN: "Administrateur",
  };

  return (
    <PvReceptionEditor
      pvr={{
        ...pvr,
        dateReception: toDateStr(pvr.dateReception),
        periodeDebut:  toDateStr(pvr.periodeDebut),
        periodeFin:    toDateStr(pvr.periodeFin),
        dateEffet:     toDateStr(pvr.dateEffet),
        reserves: pvr.reserves.map(r => ({
          ...r,
          delaiLevee: toDateStr(r.delaiLevee),
          dateLevee:  toDateStr(r.dateLevee),
        })),
      }}
      fournisseurs={fournisseurs}
      chantiers={chantiers}
      clients={clients}
      currentUser={{
        name: user.name,
        role: ROLE_LABELS[user.role] ?? user.role,
        email: user.email,
      }}
    />
  );
}
