import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  // Vérification de session
  const cookie = (await cookies()).get("session")?.value;
  const session = await decrypt(cookie);
  if (!session?.userId) {
    return NextResponse.json({ results: [] }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  const [clients, fournisseurs, sousTraitants, chantiers, devis, factures, bonsCommande, ordresMission, ouvrages] = await Promise.all([
    prisma.client.findMany({
      where: {
        OR: [
          { reference: { contains: q } },
          { nom: { contains: q } },
          { prenom: { contains: q } },
          { raisonSociale: { contains: q } },
          { email: { contains: q } },
        ],
      },
      select: { id: true, reference: true, nom: true, prenom: true, raisonSociale: true, type: true },
      take: 4,
    }),
    prisma.fournisseur.findMany({
      where: {
        OR: [
          { reference: { contains: q } },
          { nom: { contains: q } },
          { email: { contains: q } },
        ],
      },
      select: { id: true, reference: true, nom: true, ville: true },
      take: 3,
    }),
    prisma.sousTraitant.findMany({
      where: {
        OR: [
          { reference: { contains: q } },
          { nom: { contains: q } },
          { specialite: { contains: q } },
        ],
      },
      select: { id: true, reference: true, nom: true, specialite: true },
      take: 3,
    }),
    prisma.chantier.findMany({
      where: {
        OR: [
          { reference: { contains: q } },
          { nom: { contains: q } },
          { adresse: { contains: q } },
          { description: { contains: q } },
        ],
      },
      select: { id: true, reference: true, nom: true, adresse: true, statut: true },
      take: 4,
    }),
    prisma.devis.findMany({
      where: {
        OR: [
          { numero: { contains: q } },
          { objet: { contains: q } },
          { client: { nom: { contains: q } } },
        ],
      },
      select: { id: true, numero: true, objet: true, statut: true, totalHT: true, type: true },
      take: 4,
    }),
    prisma.facture.findMany({
      where: {
        OR: [
          { numero: { contains: q } },
          { client: { nom: { contains: q } } },
        ],
      },
      select: { id: true, numero: true, statut: true, totalHT: true, type: true },
      take: 4,
    }),
    prisma.bonCommande.findMany({
      where: {
        OR: [
          { numero: { contains: q } },
          { fournisseur: { nom: { contains: q } } },
        ],
      },
      select: { id: true, numero: true, statut: true, totalHT: true },
      take: 3,
    }),
    prisma.ordreMission.findMany({
      where: {
        OR: [
          { numero: { contains: q } },
          { titre: { contains: q } },
        ],
      },
      select: { id: true, numero: true, titre: true, statut: true },
      take: 3,
    }),
    prisma.ouvrage.findMany({
      where: {
        actif: true,
        OR: [
          { code: { contains: q } },
          { designation: { contains: q } },
        ],
      },
      select: { id: true, code: true, designation: true, corpsEtat: true, prixUnitaire: true },
      take: 4,
    }),
  ]);

  const CLIENT_TYPE_LABEL: Record<string, string> = {
    PA: "Particulier", CO: "Copropriété", SY: "Syndic", AR: "Architecte",
    ARI: "Architecte d'intérieur", AS: "Assurance sinistre", PB: "Professionnel BTP",
    PHB: "Professionnel hors BTP", ET: "État", CT: "Collectivité territoriale",
    MA: "Mairie", AI: "Agence immobilière", P: "Promoteur", SCI: "SCI",
  };
  const DEVIS_TYPE_BADGE: Record<string, string> = {
    INITIAL: "Devis",
    VARIANTE: "Variante",
    AVENANT: "Avenant",
  };
  const FACTURE_TYPE_BADGE: Record<string, string> = {
    STANDARD: "Facture",
    ACOMPTE: "Acompte",
    SITUATION: "Situation",
    SOLDE: "Solde",
    AVOIR: "Avoir",
  };

  const results: {
    type: string;
    label: string;
    sublabel?: string;
    href: string;
    badge?: string;
  }[] = [
    ...clients.map((c) => ({
      type: "client",
      label: c.raisonSociale || `${c.prenom ?? ""} ${c.nom}`.trim(),
      sublabel: `${c.reference ?? "—"} · ${CLIENT_TYPE_LABEL[c.type] ?? c.type}`,
      href: `/clients/${c.id}`,
      badge: CLIENT_TYPE_LABEL[c.type] ?? "Client",
    })),
    ...fournisseurs.map((f) => ({
      type: "fournisseur",
      label: f.nom,
      sublabel: `${f.reference ?? "—"} · ${f.ville ?? ""}`.trim().replace(/·\s*$/, ""),
      href: `/fournisseurs/${f.id}`,
      badge: "Fournisseur",
    })),
    ...sousTraitants.map((s) => ({
      type: "sous-traitant",
      label: s.nom,
      sublabel: `${s.reference ?? "—"} · ${s.specialite ?? ""}`.trim().replace(/·\s*$/, ""),
      href: `/sous-traitants/${s.id}`,
      badge: "Sous-traitant",
    })),
    ...chantiers.map((c) => ({
      type: "chantier",
      label: c.nom,
      sublabel: `${c.reference} · ${c.adresse ?? ""}`.trim().replace(/·\s*$/, ""),
      href: `/chantiers/${c.id}`,
      badge: "Chantier",
    })),
    ...devis.map((d) => ({
      type: "devis",
      label: d.objet || d.numero,
      sublabel: `${d.numero} · ${d.totalHT.toFixed(2)} € HT`,
      href: `/devis/${d.id}`,
      badge: DEVIS_TYPE_BADGE[d.type] ?? "Devis",
    })),
    ...factures.map((f) => ({
      type: "facture",
      label: f.numero,
      sublabel: `${f.statut} · ${f.totalHT.toFixed(2)} € HT`,
      href: `/factures/${f.id}`,
      badge: FACTURE_TYPE_BADGE[f.type] ?? "Facture",
    })),
    ...bonsCommande.map((b) => ({
      type: "bon-commande",
      label: b.numero,
      sublabel: `${b.statut} · ${b.totalHT.toFixed(2)} € HT`,
      href: `/bons-commande/${b.id}`,
      badge: "Bon de commande",
    })),
    ...ordresMission.map((o) => ({
      type: "ordre-mission",
      label: o.titre,
      sublabel: o.numero,
      href: `/ordres-mission/${o.id}`,
      badge: "Ordre de mission",
    })),
    ...ouvrages.map((o) => ({
      type: "ouvrage",
      label: o.designation,
      sublabel: `${o.code} · ${o.prixUnitaire.toFixed(2)} € HT`,
      href: `/ouvrages/${o.id}`,
      badge: o.corpsEtat,
    })),
  ];

  return NextResponse.json({ results });
}
