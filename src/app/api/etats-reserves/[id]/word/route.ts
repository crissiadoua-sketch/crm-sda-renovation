import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { COMPANY } from "@/lib/company";
import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, AlignmentType, WidthType, BorderStyle,
  ShadingType, convertInchesToTwip,
} from "docx";

function fmt(d: Date | string | null | undefined): string {
  if (!d) return "——";
  return new Intl.DateTimeFormat("fr-FR").format(new Date(d));
}

function titre(text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [new TextRun({ text, bold: true, size: 32, color: "1E2F6E" })],
  });
}

function section(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 300, after: 100 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "1E2F6E" } },
    children: [new TextRun({ text, bold: true, size: 22, color: "1E2F6E" })],
  });
}

function body(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 80 },
    children: [new TextRun({ text, size: 18 })],
  });
}

function sigCell(label: string): TableCell {
  return new TableCell({
    width: { size: 33, type: WidthType.PERCENTAGE },
    children: [
      new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 18 })] }),
      new Paragraph({ spacing: { after: 800 }, children: [new TextRun("")] }),
      new Paragraph({
        border: { top: { style: BorderStyle.SINGLE, size: 6, color: "888888" } },
        children: [new TextRun({ text: "Signature", size: 16, color: "888888" })],
      }),
    ],
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const [etat, parametres] = await Promise.all([
    prisma.etatReserves.findUnique({
      where: { id },
      include: {
        chantier: { select: { nom: true, reference: true } },
        client: true,
      },
    }),
    prisma.parametres.findUnique({ where: { id: "default" } }),
  ]);

  if (!etat) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const nomSociete = parametres?.nomEntreprise ?? COMPANY.nom;
  const adresse = parametres?.adresse ?? COMPANY.adresse;
  const ville = [parametres?.codePostal, parametres?.ville].filter(Boolean).join(" ") || `${COMPANY.codePostal} ${COMPANY.ville}`;
  const telephone = parametres?.telephone ?? COMPANY.telephone;
  const email = parametres?.emailPersonnalise || parametres?.email || COMPANY.email;
  const siren = parametres?.siret ?? COMPANY.siren;
  const tva = parametres?.tvaIntracom ?? COMPANY.tvaIntracommunautaire;

  const clientNom = etat.client
    ? etat.client.type === "ENTREPRISE"
      ? (etat.client.raisonSociale ?? etat.client.nom)
      : `${etat.client.prenom ?? ""} ${etat.client.nom}`.trim()
    : null;

  const STATUT: Record<string, string> = { EN_COURS: "En cours", SIGNE: "Signé", LEVE: "Réserves levées" };

  const children: (Paragraph | Table)[] = [
    // ── En-tête ──
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 40 },
      children: [new TextRun({ text: nomSociete, bold: true, size: 26, color: "1E2F6E" })],
    }),
    new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: adresse, size: 16, color: "666666" })] }),
    new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: `${ville} · ${telephone} · ${email}`, size: 16, color: "666666" })] }),
    new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: `Siren : ${siren} · TVA : ${tva}`, size: 16, color: "666666" })] }),

    titre("ÉTAT DES RÉSERVES"),

    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [new TextRun({ text: etat.numero, bold: true, size: 24, color: "444444" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [new TextRun({ text: STATUT[etat.statut] ?? etat.statut, size: 18, color: "888888" })],
    }),
    ...(etat.chantier ? [new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: `Chantier : ${etat.chantier.reference} — ${etat.chantier.nom}`, size: 18, color: "888888" })],
    })] : [new Paragraph({ spacing: { after: 200 }, children: [] })]),

    section("Nature des réserves"),
    body(etat.natureReserves || "—"),

    section("Travaux à exécuter"),
    body(etat.travauxAExecuter || "—"),

    ...(etat.delaiExecution ? [
      section("Délai d'exécution"),
      body(`L'entreprise et le maître d'ouvrage conviennent que les travaux nécessités par les réserves ci-dessus seront exécutés dans un délai global de ${etat.delaiExecution} à compter de ce jour.`),
    ] : []),

    section("Fait à / Exemplaires"),
    body(`Fait à ${etat.lieuSignature || "……………………"} le ${fmt(etat.dateDocument)}`),
    body(`En ${etat.nombreExemplaires} exemplaires, dont un est remis à chacune des parties.`),

    section("Signatures"),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            sigCell("Signature de l'entreprise"),
            sigCell("Signature du maître d'ouvrage"),
            sigCell("Signature Locataire"),
          ],
        }),
      ],
    }),

    // ── Constat de levée (si statut SIGNE ou LEVE) ──
    ...((etat.statut === "SIGNE" || etat.statut === "LEVE") ? [
      new Paragraph({ spacing: { before: 600, after: 200 }, border: { top: { style: BorderStyle.SINGLE, size: 8, color: "1E2F6E" } }, children: [] }),
      titre("CONSTAT DE LEVÉE DE RÉSERVES"),
      body(`Le maître d'ouvrage${clientNom ? ` ${clientNom}` : ""} lève les réserves, après avoir constaté que l'entreprise exécutante a valablement remédié aux malfaçons, omissions et imperfections ci-dessus énoncées.`),
      ...(etat.dateLevee ? [
        body(`Fait à ${etat.lieuLevee || "……………………"} le ${fmt(etat.dateLevee)}`),
        body(`En ${etat.nombreExemplaires} exemplaires, dont un est remis à chacune des parties.`),
      ] : []),
      section("Signatures"),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              sigCell("Signature de l'entreprise"),
              sigCell("Signature du maître d'ouvrage"),
              sigCell("Signature Locataire"),
            ],
          }),
        ],
      }),
    ] : []),
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
    styles: { default: { document: { run: { font: "Calibri", size: 18 } } } },
  });

  const buffer = await Packer.toBuffer(doc);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${etat.numero}.docx"`,
    },
  });
}
