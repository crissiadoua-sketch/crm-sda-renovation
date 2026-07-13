import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { COMPANY } from "@/lib/company";
import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, AlignmentType, WidthType, BorderStyle, ShadingType, convertInchesToTwip,
} from "docx";

function fmt(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("fr-FR").format(new Date(d));
}

function section(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 280, after: 80 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "1E2F6E" } },
    children: [new TextRun({ text, bold: true, size: 22, color: "1E2F6E" })],
  });
}

function infoRow(label: string, value: string): Paragraph {
  return new Paragraph({
    spacing: { after: 60 },
    children: [
      new TextRun({ text: `${label} : `, bold: true, size: 18, color: "444444" }),
      new TextRun({ text: value || "—", size: 18 }),
    ],
  });
}

function sigCell(label: string, nom: string): TableCell {
  return new TableCell({
    width: { size: 50, type: WidthType.PERCENTAGE },
    children: [
      new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 18, color: "1E2F6E" })] }),
      new Paragraph({ children: [new TextRun({ text: nom, size: 18 })] }),
      new Paragraph({ spacing: { after: 700 }, children: [new TextRun("")] }),
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

  const [om, parametres] = await Promise.all([
    prisma.ordreMission.findUnique({
      where: { id },
      include: {
        sousTraitant: { select: { nom: true, email: true, telephone: true, specialite: true, adresse: true } },
        interimaire:  { select: { nom: true, prenom: true, telephone: true, corpsEtat: true, agence: true, qualification: true } },
        chantier:     { select: { nom: true, reference: true, adresse: true } },
      },
    }),
    prisma.parametres.findUnique({ where: { id: "default" } }),
  ]);

  if (!om) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const nomSociete = parametres?.nomEntreprise ?? COMPANY.nom;
  const adresse    = parametres?.adresse ?? COMPANY.adresse;
  const ville      = [parametres?.codePostal, parametres?.ville].filter(Boolean).join(" ") || `${COMPANY.codePostal} ${COMPANY.ville}`;
  const telephone  = parametres?.telephone ?? COMPANY.telephone;
  const emailBase  = parametres?.email ?? COMPANY.email;
  const email      = parametres?.emailPersonnalise ? `${emailBase} · ${parametres.emailPersonnalise}` : emailBase;
  const siren      = parametres?.siret ?? COMPANY.siren;

  const STATUT_LABELS: Record<string, string> = {
    BROUILLON: "Brouillon", ENVOYE: "Envoyé", EN_COURS: "En cours", TERMINE: "Terminé", ANNULE: "Annulé",
  };

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: { width: convertInchesToTwip(8.27), height: convertInchesToTwip(11.69) },
          margin: { top: convertInchesToTwip(0.9), bottom: convertInchesToTwip(0.9), left: convertInchesToTwip(1), right: convertInchesToTwip(1) },
        },
      },
      children: [
        // Titre
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
          children: [new TextRun({ text: "ORDRE DE MISSION", bold: true, size: 36, color: "1E2F6E" })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          children: [new TextRun({ text: om.numero, bold: true, size: 24, color: "444444" })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 },
          shading: { type: ShadingType.SOLID, fill: "EEF2FF" },
          children: [new TextRun({ text: `  ${STATUT_LABELS[om.statut] ?? om.statut}  `, size: 18, color: "1E2F6E" })],
        }),

        // Parties — tableau 2 colonnes
        section("Parties"),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  children: [
                    new Paragraph({ children: [new TextRun({ text: "Donneur d'ordre", bold: true, size: 18, color: "1E2F6E" })] }),
                    new Paragraph({ children: [new TextRun({ text: nomSociete, bold: true, size: 18 })] }),
                    new Paragraph({ children: [new TextRun({ text: adresse, size: 16, color: "666666" })] }),
                    new Paragraph({ children: [new TextRun({ text: ville, size: 16, color: "666666" })] }),
                    new Paragraph({ children: [new TextRun({ text: telephone, size: 16, color: "666666" })] }),
                    new Paragraph({ children: [new TextRun({ text: email, size: 16, color: "666666" })] }),
                    new Paragraph({ children: [new TextRun({ text: `Siren : ${siren}`, size: 16, color: "666666" })] }),
                  ],
                  margins: { top: 80, bottom: 80, left: 120, right: 120 },
                }),
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  children: om.interimaire ? [
                    new Paragraph({ children: [new TextRun({ text: "Intérimaire", bold: true, size: 18, color: "1E2F6E" })] }),
                    new Paragraph({ children: [new TextRun({ text: `${om.interimaire.prenom} ${om.interimaire.nom}`, bold: true, size: 18 })] }),
                    ...(om.interimaire.corpsEtat ? [new Paragraph({ children: [new TextRun({ text: `${om.interimaire.corpsEtat} — ${om.interimaire.qualification}`, size: 16, color: "F7941E" })] })] : []),
                    ...(om.interimaire.agence ? [new Paragraph({ children: [new TextRun({ text: `Agence : ${om.interimaire.agence}`, size: 16, color: "444444" })] })] : []),
                    ...(om.interimaire.telephone ? [new Paragraph({ children: [new TextRun({ text: om.interimaire.telephone, size: 16, color: "666666" })] })] : []),
                    ...(om.interimaire.telephone ? [new Paragraph({ children: [new TextRun({ text: om.interimaire.telephone, size: 16, color: "666666" })] })] : []),
                  ] : [
                    new Paragraph({ children: [new TextRun({ text: om.sousTraitant?.nom ?? "—", bold: true, size: 18 })] }),
                  ],
                  margins: { top: 80, bottom: 80, left: 120, right: 120 },
                }),
              ],
            }),
          ],
        }),

        // Mission
        section("Détails de la mission"),
        infoRow("Titre", om.titre),
        infoRow("Lieu", om.lieu ?? ""),
        infoRow("Date de début", fmt(om.dateDebut)),
        infoRow("Date de fin", om.dateFin ? fmt(om.dateFin) : ""),
        ...(om.chantier ? [infoRow("Chantier", `${om.chantier.reference} — ${om.chantier.nom}${om.chantier.adresse ? ` · ${om.chantier.adresse}` : ""}`)] : []),

        // Description
        ...(om.description ? [
          section("Description de la mission"),
          new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: om.description, size: 18 })],
          }),
        ] : []),

        // Signatures
        section("Signatures"),
        new Paragraph({
          spacing: { after: 160 },
          children: [new TextRun({ text: `Fait à ……………………… le ${fmt(om.dateDebut)}`, size: 18, color: "444444" })],
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                sigCell("Le donneur d'ordre", nomSociete),
                sigCell(
                  om.interimaire ? "L'intérimaire" : "L'intervenant",
                  om.interimaire ? `${om.interimaire.prenom} ${om.interimaire.nom}` : (om.sousTraitant?.nom ?? "—")
                ),
              ],
            }),
          ],
        }),
      ],
    }],
    styles: { default: { document: { run: { font: "Calibri", size: 18 } } } },
  });

  const buffer = await Packer.toBuffer(doc);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${om.numero}.docx"`,
    },
  });
}
