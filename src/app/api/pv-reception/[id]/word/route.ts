import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { COMPANY } from "@/lib/company";
import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, HeadingLevel, AlignmentType, WidthType, BorderStyle,
  ShadingType, PageOrientation, convertInchesToTwip,
} from "docx";

function fmt(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("fr-FR").format(new Date(d));
}

function cell(text: string, bold = false, shading = false): TableCell {
  return new TableCell({
    shading: shading ? { type: ShadingType.SOLID, color: "1E2F6E", fill: "1E2F6E" } : undefined,
    children: [new Paragraph({
      children: [new TextRun({
        text,
        bold,
        color: shading ? "FFFFFF" : "000000",
        size: 18,
      })],
    })],
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
  });
}

function hr(): Paragraph {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: "1E2F6E" } },
    spacing: { after: 200 },
    children: [],
  });
}

function heading(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 120 },
    children: [new TextRun({ text, bold: true, color: "1E2F6E", size: 22 })],
  });
}

function info(label: string, value: string): Paragraph {
  return new Paragraph({
    spacing: { after: 60 },
    children: [
      new TextRun({ text: `${label} : `, bold: true, size: 18, color: "444444" }),
      new TextRun({ text: value, size: 18 }),
    ],
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const pvr = await prisma.pvReception.findUnique({
    where: { id },
    include: {
      fournisseur: true,
      chantier:    { select: { nom: true, adresse: true } },
      client:      { select: { nom: true, prenom: true, raisonSociale: true, siret: true } },
      lignes:      { orderBy: { ordre: "asc" } },
      reserves:    { orderBy: { ordre: "asc" } },
    },
  });

  if (!pvr) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const TYPE_LABELS: Record<string, string> = {
    PRESTATION: "Prestation de service", MAINTENANCE: "Maintenance",
    FORMATION: "Formation / Transfert de compétences", LIVRAISON: "Livraison de fournitures",
    ETUDE: "Étude / Prestation intellectuelle", AUTRE: "Autre",
  };

  const RESULTAT_LABELS: Record<string, string> = {
    ACCEPTE: "RÉCEPTION PRONONCÉE SANS RÉSERVE",
    ACCEPTE_RESERVES: "RÉCEPTION PRONONCÉE AVEC RÉSERVES",
    REFUSE: "RÉCEPTION REFUSÉE",
  };

  const clientLabel = pvr.client?.raisonSociale ?? (pvr.client ? `${pvr.client.prenom ?? ""} ${pvr.client.nom}`.trim() : "—");

  const children: (Paragraph | Table)[] = [
    // ── Titre principal ──────────────────────────────────────────────────
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({ text: "PROCÈS-VERBAL DE RÉCEPTION", bold: true, size: 36, color: "1E2F6E" }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: TYPE_LABELS[pvr.typeSupport] ?? pvr.typeSupport,
          bold: true, size: 24, color: "F7941E",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [new TextRun({ text: `Référence : ${pvr.numero}`, size: 22, color: "444444" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [
        new TextRun({ text: `Établi le : ${fmt(pvr.createdAt)}`, size: 18, color: "888888" }),
        pvr.dateReception
          ? new TextRun({ text: `    |    Date de réception : ${fmt(pvr.dateReception)}`, bold: true, size: 18 })
          : new TextRun({ text: "" }),
      ],
    }),

    // ── Résultat ──────────────────────────────────────────────────────────
    ...(pvr.resultat ? [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 400 },
        shading: {
          type: ShadingType.SOLID,
          fill: pvr.resultat === "ACCEPTE" ? "166534" : pvr.resultat === "ACCEPTE_RESERVES" ? "92400E" : "991B1B",
        },
        children: [
          new TextRun({
            text: `  ${RESULTAT_LABELS[pvr.resultat]}  `,
            bold: true, size: 24, color: "FFFFFF",
          }),
        ],
      }),
    ] : []),

    // ── Objet ─────────────────────────────────────────────────────────────
    ...(pvr.objet ? [
      new Paragraph({
        spacing: { after: 300 },
        shading: { type: ShadingType.SOLID, fill: "EEF2FF" },
        children: [
          new TextRun({ text: "Objet : ", bold: true, size: 20, color: "1E2F6E" }),
          new TextRun({ text: pvr.objet, size: 20, color: "1E2F6E" }),
        ],
      }),
    ] : []),

    // ── Parties ───────────────────────────────────────────────────────────
    heading("1. PARTIES"),
    info("Maître d'ouvrage", COMPANY.nom),
    info("Adresse MO", `${COMPANY.adresse}, ${COMPANY.codePostal} ${COMPANY.ville}`),
    info("SIREN", COMPANY.siren),
    ...(clientLabel !== "—" ? [info("Client final", clientLabel)] : []),
    ...(pvr.repMO ? [info("Représentant MO", `${pvr.repMO}${pvr.fonctionRepMO ? ` — ${pvr.fonctionRepMO}` : ""}`)] : []),
    new Paragraph({ spacing: { after: 120 }, children: [] }),
    info("Prestataire", pvr.fournisseur?.nom ?? "—"),
    ...(pvr.fournisseur?.adresse ? [info("Adresse prestataire", pvr.fournisseur.adresse)] : []),
    ...(pvr.fournisseur?.siret   ? [info("SIRET prestataire", pvr.fournisseur.siret)] : []),
    ...(pvr.repPrestataire ? [info("Représentant prestataire", `${pvr.repPrestataire}${pvr.fonctionPrestataire ? ` — ${pvr.fonctionPrestataire}` : ""}`)] : []),
    hr(),

    // ── Contexte ──────────────────────────────────────────────────────────
    heading("2. CONTEXTE ET RÉFÉRENCES"),
    ...(pvr.chantier ? [info("Chantier", pvr.chantier.nom)] : []),
    ...(pvr.lieuReception ? [info("Lieu de réception", pvr.lieuReception)] : []),
    ...(pvr.periodeDebut ? [info("Période d'exécution", `${fmt(pvr.periodeDebut)} → ${fmt(pvr.periodeFin)}`)] : []),
    ...(pvr.refContrat   ? [info("N° Contrat", pvr.refContrat)] : []),
    ...(pvr.refDevis     ? [info("N° Devis", pvr.refDevis)] : []),
    ...(pvr.refCommande  ? [info("N° Bon de commande", pvr.refCommande)] : []),
    ...(pvr.refBonLivraison ? [info("N° Bon de livraison", pvr.refBonLivraison)] : []),
    hr(),

    // ── Description ───────────────────────────────────────────────────────
    heading("3. DESCRIPTION DE LA PRESTATION RÉCEPTIONNÉE"),
    new Paragraph({
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: pvr.descriptionPrestations ?? "Voir tableau de vérification ci-dessous.",
          size: 18,
        }),
      ],
    }),
    hr(),

    // ── Tableau de vérification ───────────────────────────────────────────
    ...(pvr.lignes.length > 0 ? [
      heading("4. TABLEAU DE VÉRIFICATION DES LIVRABLES"),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              cell("#", true, true),
              cell("Désignation / Livrable", true, true),
              cell("Référence", true, true),
              cell("Qté", true, true),
              cell("Unité", true, true),
              cell("Conformité", true, true),
              cell("Observations", true, true),
            ],
          }),
          ...pvr.lignes.map((l, i) =>
            new TableRow({
              children: [
                cell(String(i + 1)),
                cell(l.designation, true),
                cell(l.reference ?? "—"),
                cell(l.quantite?.toString() ?? "—"),
                cell(l.unite ?? "—"),
                cell(l.conformite === "CONFORME" ? "Conforme ✓" : l.conformite === "NON_CONFORME" ? "Non conforme ✗" : "Sans objet",
                  true),
                cell(l.observations ?? ""),
              ],
            })
          ),
        ],
      }),
      new Paragraph({ spacing: { after: 300 }, children: [] }),
      hr(),
    ] : []),

    // ── Réserves ──────────────────────────────────────────────────────────
    ...(pvr.reserves.length > 0 ? [
      heading("5. RÉSERVES ÉMISES"),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              cell("N°", true, true),
              cell("Description", true, true),
              cell("Délai de levée", true, true),
              cell("Responsable", true, true),
              cell("Statut", true, true),
            ],
          }),
          ...pvr.reserves.map((r, i) =>
            new TableRow({
              children: [
                cell(`R${i + 1}`),
                cell(r.description),
                cell(r.delaiLevee ? fmt(r.delaiLevee) : "—"),
                cell(r.responsable ?? "—"),
                cell(r.statut === "LEVEE" ? "Levée ✓" : "Ouverte"),
              ],
            })
          ),
        ],
      }),
      new Paragraph({ spacing: { after: 300 }, children: [] }),
      hr(),
    ] : []),

    // ── Décision ──────────────────────────────────────────────────────────
    heading(`${pvr.lignes.length > 0 ? "6" : "5"}. DÉCISION DE RÉCEPTION`),
    ...(pvr.resultat ? [
      info("Décision", RESULTAT_LABELS[pvr.resultat] ?? pvr.resultat),
    ] : [
      info("Décision", "À compléter"),
    ]),
    ...(pvr.dateEffet ? [info("Date d'effet", fmt(pvr.dateEffet))] : []),
    ...(pvr.garantieConformite && pvr.dureeGarantie ? [info("Garantie", pvr.dureeGarantie)] : []),
    ...(pvr.motifRefus ? [
      new Paragraph({
        spacing: { before: 200, after: 200 },
        children: [
          new TextRun({ text: "Motif de refus : ", bold: true, size: 18, color: "991B1B" }),
          new TextRun({ text: pvr.motifRefus, size: 18, color: "444444" }),
        ],
      }),
    ] : []),
    hr(),

    // ── Mentions légales ──────────────────────────────────────────────────
    heading("Mentions légales et dispositions contractuelles"),
    new Paragraph({
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: "Le présent Procès-Verbal de Réception constitue l'acte constatant l'achèvement de la prestation "
            + "et son acceptation par le maître d'ouvrage, sous réserve des réserves éventuellement émises "
            + "ci-dessus. Il emporte transfert de la garde et déclenche les délais de garantie contractuels. "
            + "En application des principes généraux du droit des obligations (C. civ. art. 1103 et s.), le "
            + "prestataire s'engage à lever les réserves dans les délais indiqués. "
            + "Document établi en 2 exemplaires originaux.",
          size: 16, color: "666666", italics: true,
        }),
      ],
    }),

    // ── Signatures ────────────────────────────────────────────────────────
    heading("SIGNATURES"),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            cell("Pour le Maître d'ouvrage\n" + COMPANY.nom + (pvr.repMO ? `\n${pvr.repMO}` : "") + (pvr.fonctionRepMO ? `\n${pvr.fonctionRepMO}` : "") + "\n\n\n\n_________________________\nSignature", true),
            cell("Pour le Prestataire\n" + (pvr.fournisseur?.nom ?? "_______________") + (pvr.repPrestataire ? `\n${pvr.repPrestataire}` : "") + (pvr.fonctionPrestataire ? `\n${pvr.fonctionPrestataire}` : "") + "\n\n\n\n_________________________\nSignature", true),
          ],
        }),
        new TableRow({
          children: [
            cell(`À ${COMPANY.ville}, le ___ / ___ / ______`),
            cell("À _______________, le ___ / ___ / ______"),
          ],
        }),
      ],
    }),
  ];

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: { width: convertInchesToTwip(8.27), height: convertInchesToTwip(11.69) },
          margin: { top: convertInchesToTwip(0.9), bottom: convertInchesToTwip(0.9), left: convertInchesToTwip(1), right: convertInchesToTwip(1) },
        },
      },
      children,
    }],
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 18 },
        },
      },
    },
  });

  const buffer = await Packer.toBuffer(doc);
  const uint8 = new Uint8Array(buffer);

  return new NextResponse(uint8, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="PVR-${pvr.numero}.docx"`,
    },
  });
}
