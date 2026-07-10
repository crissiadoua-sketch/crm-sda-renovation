export const dynamic = "force-dynamic";

import Link from "next/link";
import { CheckCircle2, FileText, Upload } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { uploadPdfFicheTechnique } from "@/lib/actions/fiches-techniques";
import { SubmitButton } from "@/components/ui/submit-button";
import { Badge, type BadgeTone } from "@/components/ui/badge";

const categorieTones: Record<string, BadgeTone> = {
  PRODUIT: "blue",
  MATERIAU: "orange",
  CONSOMMABLE: "green",
  EQUIPEMENT: "navy",
};

const categorieLabels: Record<string, string> = {
  PRODUIT: "Produit",
  MATERIAU: "Matériau",
  CONSOMMABLE: "Consommable",
  EQUIPEMENT: "Équipement",
};

export default async function ImportPdfPage() {
  const fiches = await prisma.ficheTechnique.findMany({
    where: { actif: true },
    orderBy: [{ corpsEtat: "asc" }, { designation: "asc" }],
    select: {
      id: true,
      designation: true,
      marque: true,
      corpsEtat: true,
      categorie: true,
      fichierPdf: true,
    },
  });

  const sansPdf = fiches.filter((f) => !f.fichierPdf);
  const avecPdf = fiches.filter((f) => f.fichierPdf);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/fiches-techniques" className="text-sm text-brand-blue hover:underline">
            ← Retour aux fiches techniques
          </Link>
          <h2 className="mt-2 text-xl font-bold text-brand-navy">Import PDF en lot</h2>
          <p className="mt-1 text-sm text-slate-500">
            Associez un fichier PDF à chaque fiche. Cliquez sur «&nbsp;Envoyer&nbsp;» fiche par fiche.
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <span className="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-700">
            {sansPdf.length} sans PDF
          </span>
          <span className="rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-700">
            {avecPdf.length} avec PDF
          </span>
        </div>
      </div>

      {/* Fiches sans PDF */}
      {sansPdf.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Fiches sans PDF — {sansPdf.length} à compléter
          </h3>
          <div className="flex flex-col gap-3">
            {sansPdf.map((fiche) => (
              <div
                key={fiche.id}
                className="flex flex-col gap-4 rounded-xl border border-dashed border-amber-300 bg-amber-50/50 p-4 sm:flex-row sm:items-center"
              >
                {/* Infos fiche */}
                <div className="flex-1 min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <Badge tone={categorieTones[fiche.categorie] ?? "gray"}>
                      {categorieLabels[fiche.categorie] ?? fiche.categorie}
                    </Badge>
                    <Badge tone="gray">{fiche.corpsEtat}</Badge>
                  </div>
                  <p className="font-semibold text-brand-navy leading-snug">{fiche.designation}</p>
                  {fiche.marque && (
                    <p className="text-xs text-slate-500">{fiche.marque}</p>
                  )}
                </div>

                {/* Formulaire upload */}
                <form
                  action={uploadPdfFicheTechnique.bind(null, fiche.id)}
                  encType="multipart/form-data"
                  className="flex flex-wrap items-center gap-3"
                >
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:border-brand-blue/40 hover:bg-slate-50 transition">
                    <Upload className="h-4 w-4 text-slate-400" />
                    <span className="truncate max-w-48">Choisir un PDF…</span>
                    <input
                      type="file"
                      name="fichierPdf"
                      accept=".pdf"
                      required
                      className="sr-only"
                    />
                  </label>
                  <SubmitButton pendingLabel="Envoi…">
                    <FileText className="h-4 w-4" />
                    Envoyer
                  </SubmitButton>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}

      {sansPdf.length === 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
          <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-500" />
          <div>
            <p className="font-semibold text-emerald-700">Toutes les fiches ont un PDF !</p>
            <p className="text-sm text-emerald-600">Les {fiches.length} fiches techniques sont complètes.</p>
          </div>
        </div>
      )}

      {/* Fiches déjà avec PDF */}
      {avecPdf.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Fiches avec PDF — {avecPdf.length} complètes
          </h3>
          <div className="flex flex-col gap-2">
            {avecPdf.map((fiche) => (
              <div
                key={fiche.id}
                className="flex items-center gap-4 rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-3"
              >
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-700 leading-snug truncate">{fiche.designation}</p>
                  {fiche.marque && <p className="text-xs text-slate-500">{fiche.marque}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone="gray">{fiche.corpsEtat}</Badge>
                  {/* Remplacement du PDF */}
                  <form
                    action={uploadPdfFicheTechnique.bind(null, fiche.id)}
                    encType="multipart/form-data"
                    className="flex items-center gap-2"
                  >
                    <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-500 hover:border-slate-300 hover:bg-slate-50 transition">
                      <Upload className="h-3.5 w-3.5" />
                      Remplacer
                      <input type="file" name="fichierPdf" accept=".pdf" required className="sr-only" />
                    </label>
                    <SubmitButton pendingLabel="…" className="text-xs px-2 py-1">
                      OK
                    </SubmitButton>
                  </form>
                  <Link
                    href={`/fiches-techniques/${fiche.id}`}
                    className="text-xs text-brand-blue hover:underline"
                  >
                    Voir →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
